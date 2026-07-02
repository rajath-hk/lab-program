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
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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
        setSubmissions(await res.json())
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Submissions</h1>
        <p className="mt-1 text-muted-foreground">
          Track your submitted code and feedback
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by question or program..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center">
          <FileCode className="size-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-sm font-medium">No submissions yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "No submissions matching your search"
              : "Start coding by browsing available programs!"}
          </p>
          {!search && (
            <Link href="/student/programs">
              <Button className="mt-4">
                <BookOpen className="size-4" />
                Browse Programs
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSubmissions.map((sub) => {
            const StatusIcon = statusIcons[sub.status] || Clock
            return (
              <Link
                key={sub.id}
                href={`/student/submissions/${sub.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {sub.question.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sub.question.program.title} · {sub.language}
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
