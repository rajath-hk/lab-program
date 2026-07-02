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
  Mail,
  Building2,
  BookOpen,
  GraduationCap,
  FileCode,
  Calendar,
  ExternalLink,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Submission {
  id: string
  status: string
  language: string
  code: string
  feedback: string | null
  createdAt: string
  question: {
    id: string
    title: string
    orderNumber: number
    program: { id: string; title: string }
  }
}

interface StudentDetail {
  id: string
  rollNumber: string
  semester: number
  name: string
  email: string
  department: { id: string; name: string; code: string }
  createdAt: string
  totalSubmissions: number
  submissionStats: {
    pending: number
    approved: number
    rejected: number
  }
  submissions: Submission[]
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

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStudent = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/students/${studentId}`)
      if (!res.ok) throw new Error("Failed to fetch student")
      setStudent(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchStudent()
  }, [fetchStudent])

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

  if (!student) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto size-10 text-muted-foreground/40" />
        <p className="mt-3 text-muted-foreground">Student not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/teacher/students")}
        >
          Back to Students
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/teacher/students")}
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Students
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Submissions Section */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Submissions ({student.totalSubmissions})
            </h2>
          </div>

          {student.submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
              <FileCode className="size-10 text-muted-foreground/40" />
              <h3 className="mt-3 text-sm font-medium">No submissions yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This student hasn't submitted any code yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {student.submissions.map((sub) => {
                const StatusIcon = statusIcons[sub.status] || Clock
                return (
                  <Link
                    key={sub.id}
                    href={`/teacher/submissions/${sub.id}`}
                    className="block"
                  >
                    <Card className="group cursor-pointer transition-all hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
                                {sub.question.orderNumber}
                              </span>
                              <p className="truncate text-sm font-medium group-hover:text-primary">
                                {sub.question.title}
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {sub.question.program.title}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="capitalize">{sub.language}</span>
                              <span>{formatDate(sub.createdAt)}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                statusColors[sub.status]
                              )}
                            >
                              <StatusIcon className="size-3" />
                              {sub.status}
                            </span>
                            <ExternalLink className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                        </div>

                        {sub.feedback && (
                          <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              Feedback
                            </p>
                            <p className="mt-0.5 text-xs text-foreground/80 line-clamp-2">
                              {sub.feedback}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar - Student Info */}
        <div className="space-y-6">
          {/* Profile card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.rollNumber}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-4 shrink-0" />
                  <span>
                    {student.department.name} ({student.department.code})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="size-4 shrink-0" />
                  <span>Semester {student.semester}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4 shrink-0" />
                  <span>Joined {formatDate(student.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Submission Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-sm font-medium">
                  {student.totalSubmissions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  Approved
                </span>
                <span className="text-sm font-medium text-green-600">
                  {student.submissionStats.approved}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-3.5 text-amber-600" />
                  Pending
                </span>
                <span className="text-sm font-medium text-amber-600">
                  {student.submissionStats.pending}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <XCircle className="size-3.5 text-red-600" />
                  Rejected
                </span>
                <span className="text-sm font-medium text-red-600">
                  {student.submissionStats.rejected}
                </span>
              </div>

              {student.totalSubmissions > 0 && (
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="flex h-full">
                    {student.submissionStats.approved > 0 && (
                      <div
                        className="bg-green-500"
                        style={{
                          width: `${(student.submissionStats.approved / student.totalSubmissions) * 100}%`,
                        }}
                      />
                    )}
                    {student.submissionStats.pending > 0 && (
                      <div
                        className="bg-amber-500"
                        style={{
                          width: `${(student.submissionStats.pending / student.totalSubmissions) * 100}%`,
                        }}
                      />
                    )}
                    {student.submissionStats.rejected > 0 && (
                      <div
                        className="bg-red-500"
                        style={{
                          width: `${(student.submissionStats.rejected / student.totalSubmissions) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
