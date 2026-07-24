import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const encoder = new TextEncoder()
  let interval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial comment to keep connection alive
      controller.enqueue(encoder.encode(": connected\n\n"))

      interval = setInterval(async () => {
        try {
          const now = new Date()
          const oneMinuteAgo = new Date(now.getTime() - 60_000)
          const [activeStudents, recentSubmissions, totalActivities] = await Promise.all([
            prisma.activityLog.count({
              where: {
                action: "TAB_SWITCH",
                user: { role: "STUDENT" },
                createdAt: { gte: oneMinuteAgo },
              },
            }),
            prisma.activityLog.count({
              where: {
                action: "SUBMIT_CODE",
                createdAt: { gte: oneMinuteAgo },
              },
            }),
            prisma.activityLog.count({
              where: { createdAt: { gte: oneMinuteAgo } },
            }),
          ])
          const payload = {
            timestamp: now.toISOString(),
            activeStudents,
            recentSubmissions,
            totalActivities,
          }
          const data = `data: ${JSON.stringify(payload)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (err) {
          console.error("Analytics stream error", err)
        }
      }, 5000) // every 5 seconds
    },
    cancel() {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
