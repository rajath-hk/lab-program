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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const skip = (page - 1) * limit

    const where: any = {
      question: {
        program: {
          teacherId: teacher.id,
        },
      },
    }

    if (programId) where.question.programId = programId
    if (status) where.status = status

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
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
      }),
      prisma.submission.count({ where }),
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
