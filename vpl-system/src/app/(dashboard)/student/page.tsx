"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  FileCode,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Building2,
  GraduationCap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StudentStats {
  totalPrograms: number
  availablePrograms: number
  totalSubmissions: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  department: string
  semester: number
  recentSubmissions: Array<{
    id: string
    status: string
    createdAt: string
    language: string
    question: {
      title: string
      program: { title: string }
    }
  }>
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const statusIcons: Record<string, React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
}

export default function StudentDashboardPage() {
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/student/stats")
        if (!res.ok) throw new Error("Failed to fetch stats")
        setStats(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          View your programs, write code, and track your submissions
        </p>
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Building2 className="size-4" />
          {stats.department}
        </span>
        <span className="flex items-center gap-1.5">
          <GraduationCap className="size-4" />
          Semester {stats.semester}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Programs Available
            </CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600 ring-1 ring-blue-500/20">
              <BookOpen className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.availablePrograms}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalPrograms} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submissions
            </CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-1.5 text-purple-600 ring-1 ring-purple-500/20">
              <FileCode className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSubmissions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
            <div className="rounded-lg bg-green-500/10 p-1.5 text-green-600 ring-1 ring-green-500/20">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.approvedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 ring-1 ring-amber-500/20">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/student/programs">
              <Button variant="default" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Browse Programs
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/student/submissions">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileCode className="size-4" />
                  View My Submissions
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Submissions</CardTitle>
            <Link href="/student/submissions">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentSubmissions.map((sub) => {
                const StatusIcon = statusIcons[sub.status] || Clock
                return (
                  <Link
                    key={sub.id}
                    href={`/student/submissions/${sub.id}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {sub.question.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {sub.question.program.title}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          statusColors[sub.status]
                        )}
                      >
                        <StatusIcon className="size-3" />
                        {sub.status}
                      </span>
                    </div>
                  </Link>
                )
              })}
              {stats.recentSubmissions.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No submissions yet. Start by browsing programs!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
