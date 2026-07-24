import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        rollNumber: true,
        semester: true,
        departmentId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const [submissions, totalSubmissions, department, submissionCounts] = await Promise.all([
      prisma.submission.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          question: {
            select: {
              id: true,
              title: true,
              orderNumber: true,
              program: {
                select: { id: true, title: true },
              },
            },
          },
        },
      }),
      prisma.submission.count({ where: { studentId: student.id } }),
      prisma.department.findUnique({ where: { id: student.departmentId } }),
      prisma.submission.groupBy({
        by: ["status"],
        where: { studentId: student.id },
        _count: true,
      }),
    ])

    const submissionStats = {
      pending: submissionCounts.find((s) => s.status === "PENDING")?._count ?? 0,
      approved: submissionCounts.find((s) => s.status === "APPROVED")?._count ?? 0,
      rejected: submissionCounts.find((s) => s.status === "REJECTED")?._count ?? 0,
    }

    return NextResponse.json({
      id: student.id,
      rollNumber: student.rollNumber,
      semester: student.semester,
      name: student.user.name,
      email: student.user.email,
      department,
      createdAt: student.user.createdAt,
      totalSubmissions,
      submissionStats,
      submissions,
    })
  } catch (error) {
    console.error("Failed to fetch student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
