import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: teacher.id,
      employeeId: teacher.employeeId,
      name: teacher.user.name,
      email: teacher.user.email,
      createdAt: teacher.user.createdAt,
    })
  } catch (error) {
    console.error("Failed to fetch teacher settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, password: true,
            role: true, createdAt: true, isOnboarded: true,
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const body = await request.json()
    const { name, email, currentPassword, newPassword } = body

    // Update basic profile
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email

    // Handle password change
    if (currentPassword && newPassword) {
      const isValid = await bcrypt.compare(currentPassword, teacher.user.password)
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        )
      }

      updateData.password = await bcrypt.hash(newPassword, 10)
    } else if (currentPassword && !newPassword) {
      return NextResponse.json(
        { error: "New password is required when changing password" },
        { status: 400 }
      )
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({
      id: teacher.id,
      employeeId: teacher.employeeId,
      name: updatedUser.name,
      email: updatedUser.email,
    })
  } catch (error: any) {
    console.error("Failed to update teacher settings:", error)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
