import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          question: {
            select: {
              id: true,
              title: true,
              program: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.submission.count({ where: { studentId: student.id } }),
    ])

    return NextResponse.json({
      submissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("Failed to fetch submissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const body = await request.json()
    const { questionId, code, language, output } = body

    if (!questionId || !code) {
      return NextResponse.json({ error: "Question ID and code are required" }, { status: 400 })
    }

    // Verify the question exists and its program is unlocked
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, title: true, program: { select: { unlockDate: true } } },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    if (question.program.unlockDate > new Date()) {
      return NextResponse.json({ error: "This program is not yet unlocked" }, { status: 403 })
    }

    let submission
    let isUpdate = false

    await prisma.$transaction(async (tx) => {
      const existing = await tx.submission.findFirst({
        where: { studentId: student.id, questionId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })

      if (existing) {
        isUpdate = true
        submission = await tx.submission.update({
          where: { id: existing.id },
          data: {
            code,
            language: language || "plaintext",
            status: "PENDING",
            output: output || null,
            feedback: null,
          },
          include: {
            question: {
              select: {
                id: true,
                title: true,
                program: { select: { id: true, title: true } },
              },
            },
          },
        })
      } else {
        submission = await tx.submission.create({
          data: {
            studentId: student.id,
            questionId,
            code,
            language: language || "plaintext",
            output: output || null,
          },
          include: {
            question: {
              select: {
                id: true,
                title: true,
                program: { select: { id: true, title: true } },
              },
            },
          },
        })
      }
    })

    await logActivity(
      session.user.id,
      "SUBMIT_CODE",
      `Submitted code for question "${question.title}" (${language || "plaintext"})`
    )

    return NextResponse.json(submission, { status: isUpdate ? 200 : 201 })
  } catch (error) {
    console.error("Failed to create submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
