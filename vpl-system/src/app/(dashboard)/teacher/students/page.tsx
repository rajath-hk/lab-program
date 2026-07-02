"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Loader2,
  Search,
  GraduationCap,
  Users,
  Mail,
  Building2,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface Student {
  id: string
  rollNumber: string
  semester: number
  name: string
  email: string
  department: { id: string; name: string; code: string }
  totalSubmissions: number
  submissionStats: {
    pending: number
    approved: number
    rejected: number
  }
}

interface Department {
  id: string
  name: string
  code: string
}

interface StudentsResponse {
  students: Student[]
  departments: Department[]
  totalCount: number
}

export default function TeacherStudentsPage() {
  const [data, setData] = useState<StudentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("")
  const [filterSemester, setFilterSemester] = useState("")

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterDepartment) params.set("departmentId", filterDepartment)
      if (filterSemester) params.set("semester", filterSemester)
      if (search) params.set("search", search)

      const res = await fetch(`/api/teacher/students?${params}`)
      if (!res.ok) throw new Error("Failed to fetch students")
      setData(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterDepartment, filterSemester, search])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8]

  if (loading && !data) {
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
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="mt-1 text-muted-foreground">
          View all enrolled students and their submission activity
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Departments</option>
            {data?.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Semesters</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {data && data.students.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 ring-1 ring-blue-500/20">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {data.totalCount}
                </p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {data.students.reduce(
                    (sum, s) => sum + s.submissionStats.approved,
                    0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Approved Submissions
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 ring-1 ring-amber-500/20">
                <Clock className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {data.students.reduce(
                    (sum, s) => sum + s.submissionStats.pending,
                    0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pending Review
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students List */}
      {data?.students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center">
          <GraduationCap className="size-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-sm font-medium">No students found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || filterDepartment || filterSemester
              ? "Try adjusting your filters"
              : "No students are enrolled in the system yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.students.map((student) => (
            <Link key={student.id} href={`/teacher/students/${student.id}`} className="block">
              <Card className="group cursor-pointer transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Student info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <GraduationCap className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary">
                            {student.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.rollNumber}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="size-3.5" />
                          {student.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3.5" />
                          {student.department.name} ({student.department.code})
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="size-3.5" />
                          Sem {student.semester}
                        </span>
                      </div>
                    </div>

                    {/* Submission stats */}
                    <div className="flex shrink-0 items-center gap-2">
                      {student.submissionStats.approved > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="size-3" />
                          {student.submissionStats.approved}
                        </span>
                      )}
                      {student.submissionStats.pending > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock className="size-3" />
                          {student.submissionStats.pending}
                        </span>
                      )}
                      {student.submissionStats.rejected > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <XCircle className="size-3" />
                          {student.submissionStats.rejected}
                        </span>
                      )}
                      {student.totalSubmissions === 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          No submissions
                        </span>
                      )}
                      <ExternalLink className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
