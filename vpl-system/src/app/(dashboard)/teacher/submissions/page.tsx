"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Submission {
  id: string
  status: string
  language: string
  createdAt: string
  student: {
    user: { name: string; email: string }
    department: { name: string; code: string }
  }
  question: {
    id: string
    title: string
    program: { id: string; title: string }
  }
}

interface Program {
  id: string
  title: string
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

export default function TeacherSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterProgram, setFilterProgram] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  const fetchSubmissions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterProgram) params.set("programId", filterProgram)
      if (filterStatus) params.set("status", filterStatus)

      const res = await fetch(`/api/teacher/submissions?${params}`)
      if (!res.ok) throw new Error("Failed to fetch submissions")
      setSubmissions(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterProgram, filterStatus])

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/programs")
      if (!res.ok) throw new Error("Failed to fetch programs")
      setPrograms(await res.json())
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  useEffect(() => {
    setLoading(true)
    fetchSubmissions()
  }, [fetchSubmissions])

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / 3600000)

    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    if (hours < 48) return "Yesterday"
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredSubmissions = submissions.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.student.user.name.toLowerCase().includes(q) ||
      s.student.user.email.toLowerCase().includes(q) ||
      s.question.title.toLowerCase().includes(q) ||
      s.question.program.title.toLowerCase().includes(q)
    )
  })

  if (loading && submissions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pendingCount = submissions.filter((s) => s.status === "PENDING").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        <p className="mt-1 text-muted-foreground">
          Review and grade student submissions
          {pendingCount > 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              ({pendingCount} pending)
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student or question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterProgram}
            onChange={(e) => {
              setFilterProgram(e.target.value)
              setLoading(true)
            }}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setLoading(true)
            }}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-sm font-medium">No submissions found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || filterProgram || filterStatus
              ? "Try adjusting your filters"
              : "No submissions have been made yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSubmissions.map((sub) => {
            const StatusIcon = statusIcons[sub.status] || Clock
            return (
              <Link
                key={sub.id}
                href={`/teacher/submissions/${sub.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {sub.student.user.name}
                      </p>
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        {sub.student.department.code}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {sub.question.program.title} — {sub.question.title}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatDate(sub.createdAt)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        statusColors[sub.status]
                      )}
                    >
                      <StatusIcon className="size-3" />
                      {sub.status}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
