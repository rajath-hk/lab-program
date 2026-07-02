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
    const program = await prisma.program.findFirst({
      where: { id, teacherId: auth.teacher.id },
      include: {
        questions: {
          orderBy: { orderNumber: "asc" },
        },
        _count: { select: { questions: true } },
      },
    })

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    // Get submission stats per question
    const questionIds = program.questions.map((q) => q.id)
    const submissionCounts = await prisma.submission.groupBy({
      by: ["questionId"],
      where: { questionId: { in: questionIds } },
      _count: true,
    })

    const submissionMap = new Map(
      submissionCounts.map((s) => [s.questionId, s._count])
    )

    const questionsWithStats = program.questions.map((q) => ({
      ...q,
      submissionCount: submissionMap.get(q.id) || 0,
    }))

    return NextResponse.json({
      ...program,
      questions: questionsWithStats,
    })
  } catch (error) {
    console.error("Failed to fetch program:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getTeacherSession()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.program.findFirst({
      where: { id, teacherId: auth.teacher.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, unlockDate, deadline } = body

    const data: any = {}
    if (title) data.title = title
    if (description) data.description = description
    if (unlockDate) data.unlockDate = new Date(unlockDate)
    data.deadline = deadline ? new Date(deadline) : null

    const program = await prisma.program.update({
      where: { id },
      data,
      include: {
        questions: { orderBy: { orderNumber: "asc" } },
        _count: { select: { questions: true } },
      },
    })

    await logActivity(
      auth.session.user.id,
      "UPDATE_PROGRAM",
      `Updated program "${program.title}"`
    )

    return NextResponse.json(program)
  } catch (error) {
    console.error("Failed to update program:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getTeacherSession()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.program.findFirst({
      where: { id, teacherId: auth.teacher.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    // Delete in order: submissions -> questions -> program
    await prisma.$transaction(async (tx) => {
      const questions = await tx.question.findMany({
        where: { programId: id },
        select: { id: true },
      })
      const questionIds = questions.map((q) => q.id)

      await tx.submission.deleteMany({ where: { questionId: { in: questionIds } } })
      await tx.question.deleteMany({ where: { programId: id } })
      await tx.program.delete({ where: { id } })
    })

    await logActivity(
      auth.session.user.id,
      "DELETE_PROGRAM",
      `Deleted program "${existing.title}"`
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete program:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
