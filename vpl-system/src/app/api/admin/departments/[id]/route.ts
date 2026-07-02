import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

async function getAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return null
  }
  return session
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
    const { name, code } = body

    if (!name && !code) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const data: any = {}
    if (name) data.name = name
    if (code) data.code = code.toUpperCase()

    const department = await prisma.department.update({
      where: { id },
      data,
      include: {
        _count: { select: { students: true } },
      },
    })

    await logActivity(
      session.user.id,
      "UPDATE_DEPARTMENT",
      `Updated department "${department.name}" (${department.code})`
    )

    return NextResponse.json(department)
  } catch (error: any) {
    console.error("Failed to update department:", error)
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A department with this code already exists" },
        { status: 409 }
      )
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
    const deletedDept = await prisma.department.findUnique({ where: { id }, select: { name: true, code: true } })

    await prisma.department.delete({ where: { id } })

    await logActivity(
      session.user.id,
      "DELETE_DEPARTMENT",
      `Deleted department "${deletedDept?.name || 'Unknown'}" (${deletedDept?.code || id})`
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to delete department:", error)
    if (error?.code === "P2003" || error?.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete this department because it has associated students" },
        { status: 409 }
      )
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
