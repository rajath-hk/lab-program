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
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        department: true,
        _count: { select: { submissions: true } },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    // Available programs (unlocked)
    const now = new Date()
    const [totalPrograms, availablePrograms] = await Promise.all([
      prisma.program.count(),
      prisma.program.count({ where: { unlockDate: { lte: now } } }),
    ])

    const submissionCounts = await prisma.submission.groupBy({
      by: ["status"],
      where: { studentId: student.id },
      _count: true,
    })

    const pendingCount = submissionCounts.find((s) => s.status === "PENDING")?._count ?? 0
    const approvedCount = submissionCounts.find((s) => s.status === "APPROVED")?._count ?? 0
    const rejectedCount = submissionCounts.find((s) => s.status === "REJECTED")?._count ?? 0

    const recentSubmissions = await prisma.submission.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
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
      availablePrograms,
      totalSubmissions: student._count.submissions,
      pendingCount,
      approvedCount,
      rejectedCount,
      department: student.department.name,
      semester: student.semester,
      recentSubmissions,
    })
  } catch (error) {
    console.error("Failed to fetch student stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
