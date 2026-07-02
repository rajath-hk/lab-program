import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { students: true },
        },
      },
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error("Failed to fetch departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, code } = body

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: { name, code: code.toUpperCase() },
    })

    await logActivity(
      session.user.id,
      "CREATE_DEPARTMENT",
      `Created department "${department.name}" (${department.code})`
    )

    return NextResponse.json(department, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create department:", error)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A department with this code already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
