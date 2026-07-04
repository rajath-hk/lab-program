"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useNotification } from "@/components/ui/notification"

interface AnalyticsData {
  timestamp: string
  activeStudents: number
  recentSubmissions: number
  totalActivities: number
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useNotification()

  useEffect(() => {
    const es = new EventSource("/api/admin/analytics/stream")
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as AnalyticsData
        setData(payload)
      } catch (err) {
        console.error("Failed to parse analytics SSE", err)
      }
    }
    es.onerror = () => {
      console.error("Analytics SSE error")
      setError("Connection lost. Trying to reconnect…")
      notify("Analytics connection lost", "error")
      // Do NOT close the EventSource; let it retry automatically
    }
    es.onopen = () => {
      // Connection re‑established – clear any error message
      setError(null)
    }
    return () => {
      es.close()
    }
  }, [notify])

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Realtime Analytics Dashboard</h1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Students (last 1 min)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{data?.activeStudents ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Submissions (last 1 min)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{data?.recentSubmissions ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Activities (last 1 min)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{data?.totalActivities ?? "-"}</p>
          </CardContent>
        </Card>
      </div>
      {data && (
        <p className="text-sm text-muted-foreground">
          Last updated at {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
