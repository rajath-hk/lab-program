import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"
import * as XLSX from "xlsx"

const VALID_DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXTREME"]

async function getTeacherSession() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "TEACHER") return null

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!teacher) return null

  return { session, teacher }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getTeacherSession()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const program = await prisma.program.findFirst({
      where: { id, teacherId: auth.teacher.id },
      select: { id: true, title: true },
    })
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Excel file is required" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Only .xlsx and .xls files are accepted" },
        { status: 400 }
      )
    }

    // Read the file
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: "Excel file is empty" }, { status: 400 })
    }

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Excel file has no data rows" },
        { status: 400 }
      )
    }

    // Normalize column names (case-insensitive)
    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        normalized[key.toLowerCase().trim()] = value
      }
      return normalized
    })

    // Validate rows
    const errors: { row: number; error: string }[] = []
    const validQuestions: { title: string; description: string; difficulty: string; starterCode: string | null; orderNumber: number }[] = []

    normalizedRows.forEach((row, index) => {
      const rowNum = index + 2 // 1-indexed + header row

      const title = String(row["title"] || "").trim()
      const description = String(row["description"] || "").trim()
      const difficulty = String(row["difficulty"] || "EASY").trim().toUpperCase()
      const starterCode = row["startercode"] ? String(row["startercode"]).trim() : null

      if (!title) {
        errors.push({ row: rowNum, error: "Title is required" })
        return
      }
      if (!description) {
        errors.push({ row: rowNum, error: "Description is required" })
        return
      }
      if (!VALID_DIFFICULTIES.includes(difficulty)) {
        errors.push({
          row: rowNum,
          error: `Invalid difficulty "${difficulty}". Must be one of: ${VALID_DIFFICULTIES.join(", ")}`,
        })
        return
      }

      const orderNumber = row["ordernumber"] !== undefined && row["ordernumber"] !== null
        ? Number(row["ordernumber"])
        : 0

      validQuestions.push({
        title,
        description,
        difficulty,
        starterCode: starterCode || null,
        orderNumber,
      })
    })

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validCount: validQuestions.length,
          errorCount: errors.length,
        },
        { status: 400 }
      )
    }

    // Create all questions and backup record in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const lastQuestion = await tx.question.findFirst({
        where: { programId: id },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      })
      let nextAutoOrder = (lastQuestion?.orderNumber ?? 0) + 1

      const createdQuestions = await Promise.all(
        validQuestions.map((q) => {
          const order = q.orderNumber > 0 ? q.orderNumber : nextAutoOrder++
          return tx.question.create({
            data: {
              title: q.title,
              description: q.description,
              difficulty: q.difficulty as any,
              starterCode: q.starterCode,
              orderNumber: order,
              programId: id,
            },
          })
        })
      )

      const backupData = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        questions: validQuestions.map((q) => ({
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          starterCode: q.starterCode,
        })),
      }

      await tx.questionBulkUpload.create({
        data: {
          programId: id,
          fileName: file.name,
          questionCount: createdQuestions.length,
          questions: JSON.stringify(backupData),
        },
      })

      return createdQuestions
    })

    await logActivity(
      auth.session.user.id,
      "CREATE_BULK_UPLOAD",
      `Bulk uploaded ${result.length} questions to program "${program.title}" from "${file.name}"`
    )

    return NextResponse.json({
      success: true,
      count: result.length,
      questions: result,
    })
  } catch (error) {
    console.error("Failed to bulk upload questions:", error)
    return NextResponse.json(
      { error: "Failed to process bulk upload. Please ensure the file format is correct." },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getTeacherSession()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const program = await prisma.program.findFirst({
      where: { id, teacherId: auth.teacher.id },
      select: { id: true },
    })
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const bulkUploads = await prisma.questionBulkUpload.findMany({
      where: { programId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(bulkUploads)
  } catch (error) {
    console.error("Failed to fetch bulk uploads:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
