import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const userId = searchParams.get("userId")
  const search = searchParams.get("search")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "50", 10)
  const skip = (page - 1) * limit

  try {
    const where: any = {}

    if (action) {
      where.action = action
    }

    if (userId) {
      where.userId = userId
    }

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z")
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { details: { contains: search, mode: "insensitive" } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    // Get unique action types for filter dropdown
    const actionTypes = await prisma.activityLog.groupBy({
      by: ["action"],
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
    })

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      actionTypes: actionTypes.map((a) => a.action),
    })
  } catch (error) {
    console.error("Failed to fetch activity logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
