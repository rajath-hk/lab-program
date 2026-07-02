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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        department: true,
        submissions: {
          orderBy: { createdAt: "desc" },
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
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const submissionStats = {
      pending: student.submissions.filter((s) => s.status === "PENDING").length,
      approved: student.submissions.filter((s) => s.status === "APPROVED").length,
      rejected: student.submissions.filter((s) => s.status === "REJECTED").length,
    }

    return NextResponse.json({
      id: student.id,
      rollNumber: student.rollNumber,
      semester: student.semester,
      name: student.user.name,
      email: student.user.email,
      department: student.department,
      createdAt: student.user.createdAt,
      totalSubmissions: student.submissions.length,
      submissionStats,
      submissions: student.submissions,
    })
  } catch (error) {
    console.error("Failed to fetch student:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
