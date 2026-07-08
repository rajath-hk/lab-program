"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Building2,
  BookOpen,
  FileQuestion,
  AlertCircle,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import CodeAnnotations from "@/components/teacher/CodeAnnotations"

interface SubmissionDetail {
  id: string
  status: string
  code: string
  language: string
  output: string | null
  feedback: string | null
  createdAt: string
  updatedAt: string
  student: {
    rollNumber: string
    semester: number
    user: { name: string; email: string }
    department: { name: string; code: string }
  }
  question: {
    title: string
    description: string
    starterCode: string | null
    program: { id: string; title: string }
  }
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PENDING_BG: "border-l-amber-500",
  APPROVED_BG: "border-l-green-500",
  REJECTED_BG: "border-l-red-500",
}

export default function SubmissionReviewPage() {
  const params = useParams()
  const router = useRouter()
  const submissionId = params.id as string

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState("")
  const [annotations, setAnnotations] = useState<{ lineNumber: number; text: string; createdAt: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<"APPROVED" | "REJECTED" | null>(null)
  const [showAnnotations, setShowAnnotations] = useState(false)

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/submissions/${submissionId}`)
      if (!res.ok) throw new Error("Failed to fetch submission")
      const data = await res.json()
      setSubmission(data)
      setFeedback(data.feedback || "")
      try {
        const parsed = JSON.parse(data.annotations || "[]")
        setAnnotations(Array.isArray(parsed) ? parsed : [])
      } catch {
        setAnnotations([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    fetchSubmission()
  }, [fetchSubmission])

  async function handleReview(status: "APPROVED" | "REJECTED") {
    setSaving(true)
    setError(null)
    setAction(status)

    try {
      const res = await fetch(`/api/teacher/submissions/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, feedback, annotations }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to review submission")
      }

      setSubmission(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
      setAction(null)
    }
  }

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
        <p className="text-muted-foreground">Submission not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/teacher/submissions")}
        >
          Back to Submissions
        </Button>
      </div>
    )
  }

  const alreadyReviewed =
    submission.status === "APPROVED" || submission.status === "REJECTED"

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/teacher/submissions")}
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Submissions
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Code */}
        <div className="space-y-6 lg:col-span-2">
          {/* Submission header */}
          <Card
            className={cn(
              "border-l-4",
              statusColors[`${submission.status}_BG` as keyof typeof statusColors]
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold">
                    {submission.question.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {submission.question.program.title}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase",
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

          {/* Code Viewer with Annotations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Submitted Code</CardTitle>
                {annotations.length > 0 && (
                  <span className="rounded-md bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">
                    {annotations.length} annotation{annotations.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant={showAnnotations ? "default" : "outline"}
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  className="h-7 gap-1"
                >
                  <MessageSquare className="size-3" />
                  Annotate
                </Button>
                {submission.language && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                    {submission.language}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {showAnnotations ? (
                <CodeAnnotations
                  code={submission.code}
                  annotations={annotations}
                  onAnnotationsChange={setAnnotations}
                />
              ) : (
                <pre className="overflow-x-auto p-4 text-sm">
                  <code className="font-mono leading-relaxed">
                    {submission.code}
                  </code>
                </pre>
              )}
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

        {/* Sidebar - Student Info & Review */}
        <div className="space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {submission.student.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {submission.student.user.email}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-3.5" />
                  <span>
                    {submission.student.department.name} ({submission.student.department.code})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="size-3.5" />
                  <span>Sem {submission.student.semester}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileQuestion className="size-3.5" />
                  <span>Roll: {submission.student.rollNumber}</span>
                </div>
              </div>
              <div className="border-t pt-3 text-xs text-muted-foreground">
                Submitted {formatDate(submission.createdAt)}
              </div>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {alreadyReviewed ? "Review" : "Review Submission"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback on the submission..."
                  rows={4}
                  className="h-24 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {alreadyReviewed ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    {submission.status === "APPROVED" ? (
                      <>
                        <CheckCircle2 className="size-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          Approved
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-4 text-red-600" />
                        <span className="text-red-600 font-medium">
                          Rejected
                        </span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newStatus =
                        submission.status === "APPROVED" ? "REJECTED" : "APPROVED"
                      handleReview(newStatus)
                    }}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    Change to{" "}
                    {submission.status === "APPROVED" ? "Rejected" : "Approved"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleReview("APPROVED")}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving && action === "APPROVED" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReview("REJECTED")}
                    disabled={saving}
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    {saving && action === "REJECTED" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <XCircle className="size-4" />
                    )}
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
