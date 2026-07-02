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
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id,
        studentId: student.id,
      },
      include: {
        question: {
          include: {
            program: { select: { id: true, title: true, description: true } },
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
