import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/activity-logger"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: { id: true },
    })

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: "This email is already in use by another account" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user: set name, email, new password, and mark as onboarded
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashedPassword,
        isOnboarded: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnboarded: true,
      },
    })

    await logActivity(
      session.user.id,
      "COMPLETE_ONBOARDING",
      `Student completed onboarding: name="${updatedUser.name}", email="${updatedUser.email}"`
    )

    return NextResponse.json({
      ...updatedUser,
      message: "Profile setup complete. You can now start coding!",
    })
  } catch (error: any) {
    console.error("Failed to complete onboarding:", error)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
