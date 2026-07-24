"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  FileCode,
  BookOpen,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Submission {
  id: string
  status: string
  language: string
  createdAt: string
  question: {
    id: string
    title: string
    program: { id: string; title: string }
  }
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

export default function StudentSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const res = await fetch("/api/student/submissions")
        if (!res.ok) throw new Error("Failed to fetch submissions")
        const data = await res.json()
        setSubmissions(data.submissions)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchSubmissions()
  }, [])

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
      s.question.title.toLowerCase().includes(q) ||
      s.question.program.title.toLowerCase().includes(q) ||
      s.language.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          My Submissions
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Track your submitted code and feedback
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by question or program..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-16 text-center">
          <FileCode className="size-8 text-muted-foreground/30" />
          <h3 className="mt-3 text-[13px] font-medium">
            No submissions yet
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {search
              ? "No submissions matching your search"
              : "Start coding by browsing available programs!"}
          </p>
          {!search && (
            <Link href="/student/programs">
              <Button className="mt-3" size="sm">
                <BookOpen className="size-3.5" />
                Browse Programs
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredSubmissions.map((sub) => {
            const StatusIcon = statusIcons[sub.status] || Clock
            return (
              <Link
                key={sub.id}
                href={`/student/submissions/${sub.id}`}
                className="block rounded-md ring-1 ring-border px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">
                      {sub.question.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {sub.question.program.title} &middot; {sub.language}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-[11px] text-muted-foreground sm:inline">
                      {formatDate(sub.createdAt)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium capitalize",
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