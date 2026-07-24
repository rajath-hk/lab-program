import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const skip = (page - 1) * limit

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where: { teacherId: teacher.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { questions: true } },
        },
      }),
      prisma.program.count({ where: { teacherId: teacher.id } }),
    ])

    return NextResponse.json({ programs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error("Failed to fetch programs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, unlockDate, deadline } = body

    if (!title || !description || !unlockDate) {
      return NextResponse.json({ error: "Title, description, and unlock date are required" }, { status: 400 })
    }

    const program = await prisma.program.create({
      data: {
        title,
        description,
        unlockDate: new Date(unlockDate),
        deadline: deadline ? new Date(deadline) : null,
        teacherId: teacher.id,
      },
      include: {
        _count: { select: { questions: true } },
      },
    })

    await logActivity(
      session.user.id,
      "CREATE_PROGRAM",
      `Created program "${program.title}"`
    )

    return NextResponse.json(program, { status: 201 })
  } catch (error) {
    console.error("Failed to create program:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
