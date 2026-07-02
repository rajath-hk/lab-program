import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
        questions: {
          orderBy: { orderNumber: "asc" },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const now = new Date()
    if (program.unlockDate > now) {
      return NextResponse.json({ error: "This program is not yet unlocked" }, { status: 403 })
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    // Get student's submissions for this program's questions
    const questionIds = program.questions.map((q) => q.id)
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: student?.id,
        questionId: { in: questionIds },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["questionId"],
      select: {
        id: true,
        questionId: true,
        status: true,
        createdAt: true,
        language: true,
      },
    })

    const submissionMap = new Map(submissions.map((s) => [s.questionId, s]))

    const questionsWithStatus = program.questions.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      orderNumber: q.orderNumber,
      starterCode: q.starterCode,
      submission: submissionMap.get(q.id) || null,
    }))

    return NextResponse.json({
      id: program.id,
      title: program.title,
      description: program.description,
      unlockDate: program.unlockDate,
      deadline: program.deadline,
      teacherName: program.teacher.user.name,
      questions: questionsWithStatus,
    })
  } catch (error) {
    console.error("Failed to fetch program:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
