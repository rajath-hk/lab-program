import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

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
    // Verify the program belongs to this teacher
    const program = await prisma.program.findFirst({
      where: { id, teacherId: auth.teacher.id },
      select: { id: true },
    })
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const skip = (page - 1) * limit

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: { programId: id },
        orderBy: { orderNumber: "asc" },
        skip,
        take: limit,
        include: {
          _count: { select: { submissions: true } },
        },
      }),
      prisma.question.count({ where: { programId: id } }),
    ])

    return NextResponse.json({
      questions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("Failed to fetch questions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
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

    const body = await request.json()
    const { title, description, difficulty, starterCode, testCases } = body

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 })
    }

    const question = await prisma.$transaction(async (tx) => {
      const lastQuestion = await tx.question.findFirst({
        where: { programId: id },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      })

      const nextOrderNumber = (lastQuestion?.orderNumber ?? 0) + 1

      return tx.question.create({
        data: {
          title,
          description,
          difficulty: difficulty || "EASY",
          starterCode: starterCode || null,
          testCases: testCases ? JSON.stringify(testCases) : null,
          orderNumber: nextOrderNumber,
          programId: id,
        },
      })
    })

    await logActivity(
      auth.session.user.id,
      "CREATE_QUESTION",
      `Created question "${question.title}" in program "${program.title}"`
    )

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    console.error("Failed to create question:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
