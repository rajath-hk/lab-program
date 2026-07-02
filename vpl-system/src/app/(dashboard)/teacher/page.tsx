"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  FileCode,
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TeacherStats {
  totalPrograms: number
  totalQuestions: number
  totalSubmissions: number
  pendingSubmissions: number
  totalStudents: number
  recentSubmissions: Array<{
    id: string
    status: string
    createdAt: string
    student: {
      user: { name: string }
      department: { name: string }
    }
    question: {
      title: string
      program: { title: string }
    }
  }>
  programs: Array<{
    id: string
    title: string
    questionCount: number
    unlockDate: string
    deadline: string | null
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

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/teacher/stats")
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
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teacher Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your programs, questions, and review student submissions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Programs
            </CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400">
              <BookOpen className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPrograms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Questions
            </CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-1.5 text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-400">
              <FileCode className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalQuestions}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submissions
            </CardTitle>
            <div className="rounded-lg bg-cyan-500/10 p-1.5 text-cyan-600 ring-1 ring-cyan-500/20 dark:text-cyan-400">
              <GraduationCap className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSubmissions}</div>
            {stats.pendingSubmissions > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {stats.pendingSubmissions} pending review
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Students
            </CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Submissions</CardTitle>
            <Link href="/teacher/submissions">
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
                    href={`/teacher/submissions/${sub.id}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {sub.student.user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {sub.question.title} — {sub.question.program.title}
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
                  No submissions yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Programs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Programs</CardTitle>
            <Link href="/teacher/programs">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.programs.map((program) => (
                <Link
                  key={program.id}
                  href={`/teacher/programs/${program.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {program.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {program.questionCount} question
                        {program.questionCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ArrowRight className="ml-2 size-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))}
              {stats.programs.length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No programs yet
                  </p>
                  <Link href="/teacher/programs">
                    <Button variant="outline" size="sm" className="mt-3">
                      Create your first program
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
