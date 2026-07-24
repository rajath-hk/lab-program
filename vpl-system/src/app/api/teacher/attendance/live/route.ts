import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const departmentId = searchParams.get("departmentId")
  const semester = searchParams.get("semester")
  const search = searchParams.get("search")

  try {
    // Build student filter
    const studentWhere: any = {}
    if (departmentId) studentWhere.departmentId = departmentId
    if (semester) studentWhere.semester = parseInt(semester, 10)
    if (search) {
      studentWhere.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { rollNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: [{ semester: "asc" }, { rollNumber: "asc" }],
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    })

    if (students.length === 0) {
      return NextResponse.json({
        activeSessions: [],
        totalActive: 0,
        totalStudents: 0,
        checkedAt: new Date().toISOString(),
      })
    }

    const userIds = students.map((s) => s.user.id)

    // Get the most recent LOGIN or LOGOUT activity for each student user
    // We query activities from the last 48 hours to keep it efficient
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const recentActivities = await prisma.activityLog.findMany({
      where: {
        userId: { in: userIds },
        action: { in: ["LOGIN", "LOGOUT"] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        action: true,
        createdAt: true,
      },
    })

    // Group by userId and find the most recent activity per user
    const latestActivity = new Map<string, { action: string; createdAt: Date }>()
    for (const act of recentActivities) {
      if (!latestActivity.has(act.userId)) {
        latestActivity.set(act.userId, { action: act.action, createdAt: act.createdAt })
      }
    }

    // Build student map for quick lookup
    const studentMap = new Map(students.map((s) => [s.user.id, s]))

    // Filter to users whose most recent activity is LOGIN
    const now = new Date()
    const activeSessions: Array<{
      userId: string
      studentId: string
      name: string
      email: string
      rollNumber: string
      department: { id: string; name: string; code: string }
      semester: number
      loginTime: string
      durationMinutes: number
    }> = []

    for (const [userId, activity] of latestActivity.entries()) {
      if (activity.action === "LOGIN") {
        const student = studentMap.get(userId)
        if (student) {
          const durationMs = now.getTime() - activity.createdAt.getTime()
          activeSessions.push({
            userId,
            studentId: student.id,
            name: student.user.name,
            email: student.user.email,
            rollNumber: student.rollNumber,
            department: student.department,
            semester: student.semester,
            loginTime: activity.createdAt.toISOString(),
            durationMinutes: Math.round(durationMs / 60000),
          })
        }
      }
    }

    // Sort active sessions: longest first
    activeSessions.sort((a, b) => b.durationMinutes - a.durationMinutes)

    return NextResponse.json({
      activeSessions,
      totalActive: activeSessions.length,
      totalStudents: students.length,
      checkedAt: now.toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch live sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
