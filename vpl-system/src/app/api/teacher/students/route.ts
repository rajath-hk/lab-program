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
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get("departmentId")
    const semester = searchParams.get("semester")
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const skip = (page - 1) * limit

    const where: any = {}

    if (departmentId) where.departmentId = departmentId
    if (semester) where.semester = parseInt(semester, 10)
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { rollNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    const [students, totalCount] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: [{ semester: "asc" }, { rollNumber: "asc" }],
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { submissions: true },
          },
        },
      }),
      prisma.student.count({ where }),
    ])

    // Get submission status counts for each student
    const studentIds = students.map((s) => s.id)
    const submissionCounts = await prisma.submission.groupBy({
      by: ["studentId", "status"],
      where: { studentId: { in: studentIds } },
      _count: true,
    })

    const submissionMap = new Map<string, { pending: number; approved: number; rejected: number }>()
    for (const sc of submissionCounts) {
      const existing = submissionMap.get(sc.studentId) || { pending: 0, approved: 0, rejected: 0 }
      if (sc.status === "PENDING") existing.pending = sc._count
      else if (sc.status === "APPROVED") existing.approved = sc._count
      else if (sc.status === "REJECTED") existing.rejected = sc._count
      submissionMap.set(sc.studentId, existing)
    }

    // Get all departments for filter
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    })

    const studentsWithStats = students.map((student) => ({
      id: student.id,
      rollNumber: student.rollNumber,
      semester: student.semester,
      name: student.user.name,
      email: student.user.email,
      department: student.department,
      createdAt: student.user.createdAt,
      totalSubmissions: student._count.submissions,
      submissionStats: submissionMap.get(student.id) || { pending: 0, approved: 0, rejected: 0 },
    }))

    return NextResponse.json({
      students: studentsWithStats,
      departments,
      totalCount,
    })
  } catch (error) {
    console.error("Failed to fetch students:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
