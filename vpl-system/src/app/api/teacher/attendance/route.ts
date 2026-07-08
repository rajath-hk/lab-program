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
  const fromDate = searchParams.get("from")
  const toDate = searchParams.get("to")
  const departmentId = searchParams.get("departmentId")
  const semester = searchParams.get("semester")
  const search = searchParams.get("search")
  const studentId = searchParams.get("studentId")

  if (!fromDate) {
    return NextResponse.json({ error: "From date is required" }, { status: 400 })
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
    if (studentId) studentWhere.id = studentId

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: [{ semester: "asc" }, { rollNumber: "asc" }],
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
        attendance: [],
        departments: [],
        summary: { totalStudents: 0, present: 0, absent: 0, totalDays: 0 },
      })
    }

    const userIds = students.map((s) => s.user.id)

    // Set the date range
    const startDate = new Date(fromDate)
    startDate.setHours(0, 0, 0, 0)
    const endDate = toDate ? new Date(toDate + "T23:59:59.999Z") : new Date(startDate)
    if (!toDate) {
      endDate.setHours(23, 59, 59, 999)
    }

    // Fetch LOGIN/LOGOUT activities for these students
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
    })

    // Group activities by (studentId, date)
    const grouped: Record<string, {
      studentId: string
      date: string
      logins: { time: string; id: string }[]
      logouts: { time: string; id: string }[]
    }> = {}

    for (const activity of activities) {
      const dateKey = activity.createdAt.toISOString().split("T")[0]
      const groupKey = `${activity.userId}|${dateKey}`
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          studentId: activity.userId,
          date: dateKey,
          logins: [],
          logouts: [],
        }
      }
      if (activity.action === "LOGIN") {
        grouped[groupKey].logins.push({
          id: activity.id,
          time: activity.createdAt.toISOString(),
        })
      } else if (activity.action === "LOGOUT") {
        grouped[groupKey].logouts.push({
          id: activity.id,
          time: activity.createdAt.toISOString(),
        })
      }
    }

    // Build a map of userId -> student info
    const studentMap = new Map(students.map((s) => [s.user.id, s]))

    // Generate date range
    const dates: string[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      dates.push(current.toISOString().split("T")[0])
      current.setDate(current.getDate() + 1)
    }

    // Build attendance records
    const attendance: Array<{
      userId: string
      studentId: string
      name: string
      email: string
      rollNumber: string
      department: { id: string; name: string; code: string }
      semester: number
      date: string
      firstLogin: string | null
      lastLogout: string | null
      duration: number | null // in minutes
      status: "present" | "absent"
      loginCount: number
    }> = []

    for (const student of students) {
      for (const dateStr of dates) {
        const groupKey = `${student.user.id}|${dateStr}`
        const group = grouped[groupKey]

        const firstLogin = group?.logins[0]?.time || null
        const lastLogout = group?.logouts[group.logouts.length - 1]?.time || null

        let duration: number | null = null
        if (firstLogin && lastLogout) {
          duration = Math.round(
            (new Date(lastLogout).getTime() - new Date(firstLogin).getTime()) / 60000
          )
        } else if (firstLogin && !lastLogout) {
          // Still logged in, calculate until now or end of day
          const endOfDay = new Date(dateStr + "T23:59:59.999Z")
          duration = Math.round(
            (endOfDay.getTime() - new Date(firstLogin).getTime()) / 60000
          )
        }

        attendance.push({
          userId: student.user.id,
          studentId: student.id,
          name: student.user.name,
          email: student.user.email,
          rollNumber: student.rollNumber,
          department: student.department,
          semester: student.semester,
          date: dateStr,
          firstLogin,
          lastLogout,
          duration,
          status: group ? "present" : "absent",
          loginCount: group?.logins.length || 0,
        })
      }
    }

    // Get departments for filter
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    })

    // Summary stats
    const totalDays = dates.length
    const totalStudents = students.length
    const totalRecords = attendance.length
    const presentRecords = attendance.filter((a) => a.status === "present").length

    return NextResponse.json({
      attendance,
      departments,
      summary: {
        totalStudents,
        totalDays,
        totalRecords,
        present: presentRecords,
        absent: totalRecords - presentRecords,
      },
    })
  } catch (error) {
    console.error("Failed to fetch attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
