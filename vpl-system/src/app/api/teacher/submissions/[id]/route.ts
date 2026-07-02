import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id,
        question: {
          program: {
            teacher: { userId: session.user.id },
          },
        },
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            department: { select: { name: true, code: true } },
          },
        },
        question: {
          include: {
            program: { select: { id: true, title: true } },
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error("Failed to fetch submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify the submission belongs to this teacher's program
    const existing = await prisma.submission.findFirst({
      where: {
        id,
        question: {
          program: {
            teacher: { userId: session.user.id },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    const body = await request.json()
    const { status, feedback } = body

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be APPROVED or REJECTED" },
        { status: 400 }
      )
    }

    const submission = await prisma.submission.update({
      where: { id },
      data: {
        status,
        feedback: feedback || null,
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            department: { select: { name: true, code: true } },
          },
        },
        question: {
          select: {
            title: true,
            program: { select: { title: true } },
          },
        },
      },
    })

    await logActivity(
      session.user.id,
      "REVIEW_SUBMISSION",
      `Reviewed submission for "${submission.question.title}" — ${status}${feedback ? ` (feedback: ${feedback})` : ""}`
    )

    return NextResponse.json(submission)
  } catch (error) {
    console.error("Failed to update submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
