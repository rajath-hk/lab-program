import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateRandomPassword } from "@/lib/utils"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/activity-logger"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    let newPassword: string
    let isGenerated = false

    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        )
      }
      newPassword = body.password
    } else {
      newPassword = generateRandomPassword()
      isGenerated = true
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { password: hashedPassword },
      })

      if (user.role === "STUDENT" && body.resetOnboarding !== false) {
        await tx.user.update({
          where: { id },
          data: { isOnboarded: false },
        })
      }
    })


    await logActivity(
      session.user.id,
      "UPDATE_USER",
      `Changed password for user "${user.name}" (${user.email})` +
        (user.role === "STUDENT" && body.resetOnboarding !== false
          ? " — onboarding reset"
          : "")
    )

    return NextResponse.json({
      success: true,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      ...(isGenerated ? { generatedPassword: newPassword } : {}),
      ...(user.role === "STUDENT" && body.resetOnboarding !== false
        ? { onboardingReset: true }
        : {}),
    })
  } catch (error) {
    console.error("Failed to reset password:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
