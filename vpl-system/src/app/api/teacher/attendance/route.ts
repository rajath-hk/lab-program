import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")
  const departmentId = searchParams.get("departmentId")
  const semester = searchParams.get("semester")
  const search = searchParams.get("search")

  const now = new Date()
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 })
  }

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
          select: { id: true, name: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    })

    if (students.length === 0) {
      return NextResponse.json({
        year,
        month,
        days: {},
        departments: [],
      })
    }

    const userIds = students.map((s) => s.user.id)

    // Calculate month date range
    const startDate = new Date(year, month - 1, 1)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month

    // Fetch LOGIN and LOGOUT activities for these students in this month
    const activities = await prisma.activityLog.findMany({
      where: {
        userId: { in: userIds },
        action: { in: ["LOGIN", "LOGOUT"] },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
      take: 20000,
    })

    // Build a map of userId -> student info for quick lookup
    const studentMap = new Map(students.map((s) => [s.user.id, s]))

    // Group activities by date
    const daysMap: Record<string, {
      count: number
      students: Array<{
        userId: string
        studentId: string
        name: string
        email: string
        rollNumber: string
        department: { id: string; name: string; code: string }
        semester: number
        loginTime: string
        logoutTime: string | null
      }>
    }> = {}

    // First pass: group all activities by (userId, date)
    const groupedActivities: Record<string, {
      logins: string[]
      logouts: string[]
    }> = {}

    for (const activity of activities) {
      const dateKey = activity.createdAt.toISOString().split("T")[0]
      const groupKey = `${activity.userId}|${dateKey}`
      if (!groupedActivities[groupKey]) {
        groupedActivities[groupKey] = { logins: [], logouts: [] }
      }
      if (activity.action === "LOGIN") {
        groupedActivities[groupKey].logins.push(activity.createdAt.toISOString())
      } else if (activity.action === "LOGOUT") {
        groupedActivities[groupKey].logouts.push(activity.createdAt.toISOString())
      }
    }

    // Second pass: build day entries from grouped data
    for (const [groupKey, group] of Object.entries(groupedActivities)) {
      const [userId, dateKey] = groupKey.split("|")
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = { count: 0, students: [] }
      }

      const student = studentMap.get(userId)
      if (student) {
        // Use first login and last logout
        const firstLogin = group.logins[0] || null
        const lastLogout = group.logouts[group.logouts.length - 1] || null

        // In case there was a logout before the first login (e.g., session from prev day),
        // use the login that has a corresponding logout cycle
        let loginTime = firstLogin
        let logoutTime = lastLogout

        // If first login is after the last logout, try the last login
        if (loginTime && logoutTime && new Date(loginTime) > new Date(logoutTime)) {
          loginTime = group.logins[group.logins.length - 1] || loginTime
        }

        // If no logout found after login, set logout to null
        if (loginTime && logoutTime && new Date(logoutTime) < new Date(loginTime)) {
          logoutTime = null
        }

        daysMap[dateKey].students.push({
          userId,
          studentId: student.id,
          name: student.user.name,
          email: student.user.email,
          rollNumber: student.rollNumber,
          department: student.department,
          semester: student.semester,
          loginTime: loginTime || group.logins[0] || "",
          logoutTime,
        })
        daysMap[dateKey].count++
      }
    }

    // Get departments for filter dropdown
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    })

    return NextResponse.json({
      year,
      month,
      days: daysMap,
      departments,
    })
  } catch (error) {
    console.error("Failed to fetch attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
