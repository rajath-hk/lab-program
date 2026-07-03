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
  PENDING: "bg-pending-bg/15 text-pending border border-pending/20",
  APPROVED: "bg-approved-bg/15 text-approved border border-approved/20",
  REJECTED: "bg-rejected-bg/15 text-rejected border border-rejected/20",
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground text-sm">Failed to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Student Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your programs, write code, and track your submissions
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Building2 className="size-4" />
          {stats.department}
        </span>
        <span className="flex items-center gap-2">
          <GraduationCap className="size-4" />
          Semester {stats.semester}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Available
            </CardTitle>
            <div className="rounded-md bg-info-bg/15 p-1.5 text-info">
              <BookOpen className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="pb-5 px-5">
            <div className="text-2xl font-bold tracking-tight tabular-nums">
              {stats.availablePrograms}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              of {stats.totalPrograms} total programs
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-none ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Submissions
            </CardTitle>
            <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
              <FileCode className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="pb-5 px-5">
            <div className="text-2xl font-bold tracking-tight tabular-nums">
              {stats.totalSubmissions}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Approved
            </CardTitle>
            <div className="rounded-md bg-approved-bg/15 p-1.5 text-approved">
              <CheckCircle2 className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="pb-5 px-5">
            <div className="text-2xl font-bold tracking-tight tabular-nums">
              {stats.approvedCount}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending
            </CardTitle>
            <div className="rounded-md bg-pending-bg/15 p-1.5 text-pending">
              <Clock className="size-3.5" />
            </div>
          </CardHeader>
          <CardContent className="pb-5 px-5">
            <div className="text-2xl font-bold tracking-tight tabular-nums">
              {stats.pendingCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-none ring-1 ring-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/student/programs">
              <Button variant="default" size="lg" className="w-full justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <BookOpen className="size-4" />
                  Browse Programs
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/student/submissions">
              <Button variant="outline" size="lg" className="w-full justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <FileCode className="size-4" />
                  View My Submissions
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-none ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            <Link href="/student/submissions">
              <Button variant="ghost" size="xs" className="h-6 text-[11px] text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="ml-0.5 size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentSubmissions.map((sub) => {
                const StatusIcon = statusIcons[sub.status] || Clock
                return (
                  <Link
                    key={sub.id}
                    href={`/student/submissions/${sub.id}`}
                    className="block rounded-md ring-1 ring-border px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          {sub.question.title}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                          {sub.question.program.title}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium capitalize",
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
                <p className="py-8 text-center text-xs text-muted-foreground">
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