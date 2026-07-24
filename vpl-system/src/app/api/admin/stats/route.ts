import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [totalUsers, totalTeachers, totalStudents, totalDepartments, totalPrograms, totalSubmissions] =
      await Promise.all([
        prisma.user.count(),
        prisma.teacher.count(),
        prisma.student.count(),
        prisma.department.count(),
        prisma.program.count(),
        prisma.submission.count(),
      ])

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    const roleGroups = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    })
    const roleDistribution = roleGroups.map((g) => ({ role: g.role, count: g._count }))

    return NextResponse.json({
      totalUsers,
      totalTeachers,
      totalStudents,
      totalDepartments,
      totalPrograms,
      totalSubmissions,
      recentUsers,
      roleDistribution,
    })
  } catch (error) {
    console.error("Failed to fetch stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
