import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const programId = searchParams.get("programId")
    const status = searchParams.get("status")

    const where: any = {
      question: {
        program: {
          teacherId: teacher.id,
        },
      },
    }

    if (programId) where.question.programId = programId
    if (status) where.status = status

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            department: { select: { name: true, code: true } },
          },
        },
        question: {
          select: {
            id: true,
            title: true,
            program: { select: { id: true, title: true } },
          },
        },
      },
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error("Failed to fetch submissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
