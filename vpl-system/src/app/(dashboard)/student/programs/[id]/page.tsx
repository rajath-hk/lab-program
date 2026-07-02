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
  Signal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const difficultyConfig: Record<string, { label: string; color: string }> = {
  EASY: { label: "Easy", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  MEDIUM: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  HARD: { label: "Hard", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  EXTREME: { label: "Extreme", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
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
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto size-10 text-muted-foreground/40" />
        <p className="mt-3 text-muted-foreground">{error}</p>
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
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Program not found</p>
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
          <h1 className="text-2xl font-bold tracking-tight">{program.title}</h1>
          <p className="mt-1 text-muted-foreground">{program.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="size-3.5" />
              {program.teacherName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              Unlocked {formatDate(program.unlockDate)}
            </span>
            {program.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                Deadline {formatDate(program.deadline)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Progress:</span>
        <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="bg-green-500 transition-all"
            style={{
              width: `${
                program.questions.length > 0
                  ? (completedCount / program.questions.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <span className="text-muted-foreground tabular-nums">
          {completedCount}/{program.questions.length}
        </span>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {program.questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
            <BookOpen className="size-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-sm font-medium">No questions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The teacher hasn't added any questions to this program yet.
            </p>
          </div>
        ) : (
          program.questions.map((question) => {
            const StatusIcon = question.submission
              ? statusIcons[question.submission.status] || Clock
              : null

            return (
              <Link
                key={question.id}
                href={`/student/programs/${program.id}/questions/${question.id}`}
              >
                <Card className="group cursor-pointer transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Question number */}
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-medium text-primary">
                        {question.orderNumber}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium group-hover:text-primary">
                            {question.title}
                          </h3>
                          {question.difficulty && difficultyConfig[question.difficulty] && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                difficultyConfig[question.difficulty].color
                              )}
                            >
                              {difficultyConfig[question.difficulty].label}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {question.description}
                        </p>

                        <div className="mt-2 flex items-center gap-3">
                          {question.starterCode && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Code className="size-3" />
                              Has starter code
                            </span>
                          )}
                          {question.submission && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileCode className="size-3" />
                              Last submission:{" "}
                              {new Date(
                                question.submission.createdAt
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="shrink-0">
                        {question.submission ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
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
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
