
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const programs = await prisma.program.findMany({
      orderBy: [{ unlockDate: "desc" }, { createdAt: "desc" }],
      include: {
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
        _count: { select: { questions: true } },
      },
    })

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

    return NextResponse.json(programsWithStatus)
  } catch (error) {
    console.error("Failed to fetch programs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
