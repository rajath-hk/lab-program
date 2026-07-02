import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        programs: {
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const programIds = teacher.programs.map((p) => p.id)

    const [totalSubmissions, pendingSubmissions, totalStudents] = await Promise.all([
      prisma.submission.count({
        where: { question: { programId: { in: programIds } } },
      }),
      prisma.submission.count({
        where: {
          question: { programId: { in: programIds } },
          status: "PENDING",
        },
      }),
      prisma.student.count(),
    ])

    const totalPrograms = teacher.programs.length
    const totalQuestions = teacher.programs.reduce((sum, p) => sum + p._count.questions, 0)

    const recentSubmissions = await prisma.submission.findMany({
      where: { question: { programId: { in: programIds } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
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

    return NextResponse.json({
      totalPrograms,
      totalQuestions,
      totalSubmissions,
      pendingSubmissions,
      totalStudents,
      recentSubmissions,
      programs: teacher.programs.map((p) => ({
        id: p.id,
        title: p.title,
        questionCount: p._count.questions,
        unlockDate: p.unlockDate,
        deadline: p.deadline,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch teacher stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
