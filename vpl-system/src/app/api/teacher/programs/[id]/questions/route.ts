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
    })
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const questions = await prisma.question.findMany({
      where: { programId: id },
      orderBy: { orderNumber: "asc" },
      include: {
        _count: { select: { submissions: true } },
      },
    })

    return NextResponse.json(questions)
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
    })
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, difficulty, starterCode } = body

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 })
    }

    // Get the next order number
    const lastQuestion = await prisma.question.findFirst({
      where: { programId: id },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    })

    const nextOrderNumber = (lastQuestion?.orderNumber ?? 0) + 1

    const question = await prisma.question.create({
      data: {
        title,
        description,
        difficulty: difficulty || "EASY",
        starterCode: starterCode || null,
        orderNumber: nextOrderNumber,
        programId: id,
      },
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
