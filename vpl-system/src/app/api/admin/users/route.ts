import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/activity-logger"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          include: { department: true },
        },
        teacher: true,
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Failed to fetch users:", error)
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
    const { name, email, password, role, rollNumber, employeeId, departmentId, semester } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        ...(role === "STUDENT" && {
          student: {
            create: {
              rollNumber,
              departmentId,
              semester: parseInt(semester, 10),
            },
          },
        }),
        ...(role === "TEACHER" && {
          teacher: {
            create: {
              employeeId,
            },
          },
        }),
      },
      include: {
        student: { include: { department: true } },
        teacher: true,
      },
    })

    await logActivity(
      session.user.id,
      "CREATE_USER",
      `Created ${role} user "${name}" (${email})`
    )

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create user:", error)
    if (error?.code === "P2002") {
      const target = error.meta?.target as string[] | undefined
      const field = target?.[0] || "field"
      return NextResponse.json(
        { error: `A user with this ${field} already exists` },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
