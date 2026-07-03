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
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SubmissionDetail {
  id: string
  status: string
  code: string
  language: string
  output: string | null
  feedback: string | null
  createdAt: string
  updatedAt: string
  question: {
    id: string
    title: string
    description: string
    program: { id: string; title: string; description: string }
  }
}

const statusColors: Record<string, string> = {
  PENDING: "bg-pending-bg/15 text-pending border border-pending/20",
  APPROVED: "bg-approved-bg/15 text-approved border border-approved/20",
  REJECTED: "bg-rejected-bg/15 text-rejected border border-rejected/20",
  PENDING_BG: "border-l-pending",
  APPROVED_BG: "border-l-approved",
  REJECTED_BG: "border-l-rejected",
}

export default function StudentSubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const submissionId = params.id as string

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await fetch(`/api/student/submissions/${submissionId}`)
      if (!res.ok) throw new Error("Failed to fetch submission")
      setSubmission(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    fetchSubmission()
  }, [fetchSubmission])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto size-10 text-muted-foreground/40" />
        <p className="mt-3 text-muted-foreground">Submission not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/student/submissions")}
        >
          Back to Submissions
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back & Header */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/student/submissions")}
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Submissions
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Status header */}
          <Card
            className={cn(
              "border-l-4",
              statusColors[`${submission.status}_BG` as keyof typeof statusColors]
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold truncate">
                    {submission.question.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {submission.question.program.title}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase",
                    statusColors[submission.status]
                  )}
                >
                  {submission.status === "PENDING" && <Clock className="size-3.5" />}
                  {submission.status === "APPROVED" && (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  {submission.status === "REJECTED" && (
                    <XCircle className="size-3.5" />
                  )}
                  {submission.status}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Code viewer */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Submitted Code</CardTitle>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {submission.language}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="overflow-x-auto p-4 text-sm">
                <code className="font-mono leading-relaxed">
                  {submission.code}
                </code>
              </pre>
            </CardContent>
          </Card>

          {/* Output */}
          {submission.output && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Output</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="overflow-x-auto bg-muted/50 p-4 text-sm">
                  <code className="font-mono leading-relaxed">
                    {submission.output}
                  </code>
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Question info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">{submission.question.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {submission.question.description}
              </p>
              <Link
                href={`/student/programs/${submission.question.program.id}/questions/${submission.question.id}`}
              >
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <FileCode className="size-3.5" />
                  Edit & Resubmit
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Submission info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>{formatDate(submission.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language</span>
                <span className="uppercase">{submission.language}</span>
              </div>
              {submission.updatedAt !== submission.createdAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last updated</span>
                  <span>{formatDate(submission.updatedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback */}
          {submission.feedback && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {submission.feedback}
                </p>
              </CardContent>
            </Card>
          )}

          {submission.status === "PENDING" && (
            <div className="flex items-start gap-2 rounded-lg border border-pending/20 bg-pending-bg/10 px-3 py-2.5 text-sm text-pending">
              <Clock className="mt-0.5 size-4 shrink-0" />
              <span>
                Your submission is pending review. You'll be able to see
                feedback once the teacher reviews it.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
