"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  FileCode,
  BookOpen,
  User,
  Calendar,
  AlertCircle,
  Code,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const difficultyConfig: Record<string, string> = {
  EASY: "bg-approved-bg/10 text-approved border border-approved/10",
  MEDIUM: "bg-pending-bg/10 text-pending border border-pending/10",
  HARD: "bg-rejected-bg/10 text-rejected border border-rejected/10",
  EXTREME: "bg-info-bg/10 text-info border border-info/10",
}

interface QuestionWithSubmission {
  id: string
  title: string
  description: string
  difficulty: string
  orderNumber: number
  starterCode: string | null
  submission: {
    id: string
    status: string
    createdAt: string
    language: string
  } | null
}

interface ProgramDetail {
  id: string
  title: string
  description: string
  unlockDate: string
  deadline: string | null
  teacherName: string
  questions: QuestionWithSubmission[]
}

const statusColors: Record<string, string> = {
  PENDING: "bg-pending-bg/10 text-pending border border-pending/10",
  APPROVED: "bg-approved-bg/10 text-approved border border-approved/10",
  REJECTED: "bg-rejected-bg/10 text-rejected border border-rejected/10",
}

const statusIcons: Record<string, React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
}

export default function StudentProgramDetailPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params.id as string

  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgram = useCallback(async () => {
    try {
      const res = await fetch(`/api/student/programs/${programId}`)
      if (!res.ok) {
        if (res.status === 403) throw new Error("This program is not yet unlocked")
        throw new Error("Failed to fetch program")
      }
      setProgram(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => {
    fetchProgram()
  }, [fetchProgram])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const completedCount = program?.questions.filter(
    (q) => q.submission?.status === "APPROVED"
  ).length ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="size-8 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/student/programs")}
        >
          Back to Programs
        </Button>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-sm text-muted-foreground">Program not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/student/programs")}
        >
          Back to Programs
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/student/programs")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{program.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{program.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="size-3" />
              {program.teacherName}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3" />
              Unlocked {formatDate(program.unlockDate)}
            </span>
            {program.deadline && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3" />
                Deadline {formatDate(program.deadline)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Progress:</span>
        <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted max-w-md">
          <div
            className="bg-approved transition-all duration-300"
            style={{
              width: `${
                program.questions.length > 0
                  ? (completedCount / program.questions.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <span className="tabular-nums font-medium text-sm tabular-nums">
          {completedCount}/{program.questions.length}
        </span>
      </div>

      {/* Questions */}
      <div className="space-y-1">
        {program.questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-16 text-center">
            <BookOpen className="size-8 text-muted-foreground/30" />
            <h3 className="mt-3 text-[13px] font-medium">No questions yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              The teacher hasn&apos;t added any questions to this program yet.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="grid divide-y">
              {program.questions.map((question) => {
                const StatusIcon = question.submission
                  ? statusIcons[question.submission.status] || Clock
                  : null

                return (
                  <Link
                    key={question.id}
                    href={`/student/programs/${program.id}/questions/${question.id}`}
                    className="block hover:bg-muted/40 transition-colors"
                  >
                    <div className="p-4 flex items-start gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                        {question.orderNumber}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-sm">
                            {question.title}
                          </h3>
                          {question.difficulty && difficultyConfig[question.difficulty] && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                difficultyConfig[question.difficulty]
                              )}
                            >
                              {question.difficulty.charAt(0) + question.difficulty.slice(1).toLowerCase()}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {question.description}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {question.starterCode && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Code className="size-3" />
                              Has starter code
                            </span>
                          )}
                          {question.submission && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <FileCode className="size-3" />
                              Last submission:{" "}
                              {new Date(
                                question.submission.createdAt
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {question.submission ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                              statusColors[question.submission.status]
                            )}
                          >
                            {StatusIcon && <StatusIcon className="size-3" />}
                            {question.submission.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Not started
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}