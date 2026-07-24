
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        orderBy: [{ unlockDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          teacher: {
            include: {
              user: { select: { name: true } },
            },
          },
          _count: { select: { questions: true } },
        },
      }),
      prisma.program.count(),
    ])

    const now = new Date()

    const programsWithStatus = programs.map((program) => ({
      id: program.id,
      title: program.title,
      description: program.description,
      unlockDate: program.unlockDate,
      deadline: program.deadline,
      teacherName: program.teacher.user.name,
      questionCount: program._count.questions,
      isUnlocked: program.unlockDate <= now,
      isExpired: program.deadline ? program.deadline < now : false,
    }))

    return NextResponse.json({
      programs: programsWithStatus,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("Failed to fetch programs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
