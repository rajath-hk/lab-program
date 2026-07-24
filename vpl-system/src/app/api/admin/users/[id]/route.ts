import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/activity-logger"

async function getAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return null
  }
  return session
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        student: { include: { department: true } },
        teacher: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Failed to fetch user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, email, password, role, rollNumber, employeeId, departmentId, semester, isOnboarded } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (password) updateData.password = await bcrypt.hash(password, 10)
    if (role) updateData.role = role
    if (isOnboarded !== undefined) updateData.isOnboarded = isOnboarded

    // If role changed to different type, handle related records
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { student: true, teacher: true },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = await prisma.$transaction(async (tx) => {
      // If role is changing, clean up old related records
      if (role && role !== existingUser.role) {
        if (existingUser.student) {
          await tx.student.delete({ where: { userId: id } })
        }
        if (existingUser.teacher) {
          await tx.teacher.delete({ where: { userId: id } })
        }

        // Create new related records based on new role
        if (role === "STUDENT") {
          if (!rollNumber || !departmentId || !semester) {
            throw new Error("Student requires rollNumber, departmentId, and semester")
          }
          await tx.student.create({
            data: {
              userId: id,
              rollNumber,
              departmentId,
              semester: parseInt(semester, 10),
            },
          })
        } else if (role === "TEACHER") {
          if (!employeeId) {
            throw new Error("Teacher requires employeeId")
          }
          await tx.teacher.create({
            data: {
              userId: id,
              employeeId,
            },
          })
        }
      } else {
        // Update existing related record
        if (role === "STUDENT" && existingUser.student) {
          await tx.student.update({
            where: { userId: id },
            data: {
              ...(rollNumber && { rollNumber }),
              ...(departmentId && { departmentId }),
              ...(semester && { semester: parseInt(semester, 10) }),
            },
          })
        } else if (role === "TEACHER" && existingUser.teacher) {
          await tx.teacher.update({
            where: { userId: id },
            data: {
              ...(employeeId && { employeeId }),
            },
          })
        }
      }

      return tx.user.update({
        where: { id },
        data: updateData,
        include: {
          student: { include: { department: true } },
          teacher: true,
        },
      })
    })

    const changedFields = Object.keys(updateData).filter(k => k !== 'password').join(', ')
    await logActivity(
      session.user.id,
      "UPDATE_USER",
      `Updated user "${user.name}" (${user.email}): ${changedFields || 'password changed'}`
    )

    return NextResponse.json(user)
  } catch (error: any) {
    console.error("Failed to update user:", error)
    if (error?.code === "P2002") {
      const target = error.meta?.target as string[] | undefined
      const field = target?.[0] || "field"
      return NextResponse.json(
        { error: `A user with this ${field} already exists` },
        { status: 409 }
      )
    }
    if (error instanceof Error && error.message) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const deletedUser = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } })

    // Delete in correct order to respect foreign keys
    await prisma.$transaction(async (tx) => {
      await tx.student.deleteMany({ where: { userId: id } })
      await tx.teacher.deleteMany({ where: { userId: id } })
      await tx.user.delete({ where: { id } })
    })

    await logActivity(
      session.user.id,
      "DELETE_USER",
      `Deleted user "${deletedUser?.name || 'Unknown'}" (${deletedUser?.email || id})`
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to delete user:", error)
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete this user because they have related records (programs, submissions, etc.)" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
