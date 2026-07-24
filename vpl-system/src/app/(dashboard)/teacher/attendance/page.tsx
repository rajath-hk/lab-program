"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserIcon,
  CalendarDays,
  LogIn,
  LogOut,
  Search,
  X,
  AlertCircle,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Department {
  id: string
  name: string
  code: string
}

interface DayStudent {
  userId: string
  studentId: string
  name: string
  email: string
  rollNumber: string
  department: { id: string; name: string; code: string }
  semester: number
  loginTime: string
  logoutTime: string | null
}

interface DayData {
  count: number
  students: DayStudent[]
}

interface CalendarResponse {
  year: number
  month: number
  days: Record<string, DayData>
  departments: Department[]
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}

export default function TeacherAttendancePage() {
  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<CalendarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [departmentId, setDepartmentId] = useState("")
  const [semester, setSemester] = useState("")
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Day click modal
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<DayStudent[]>([])

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("month", String(currentMonth))
      params.set("year", String(currentYear))
      if (departmentId) params.set("departmentId", departmentId)
      if (semester) params.set("semester", semester)
      if (search) params.set("search", search)

      const res = await fetch(`/api/teacher/attendance?${params}`)
      if (!res.ok) throw new Error("Failed to fetch attendance data")
      setData(await res.json())
    } catch (err) {
      setError("Failed to load attendance data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, currentYear, departmentId, semester, search])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  function goToPrevMonth() {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  function goToNextMonth() {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  function goToToday() {
    const today = new Date()
    setCurrentMonth(today.getMonth() + 1)
    setCurrentYear(today.getFullYear())
  }

  function handleDayClick(dateStr: string) {
    if (!data?.days[dateStr]) return
    setSelectedDay(dateStr)
    setSelectedStudents(data.days[dateStr].students)
  }

  function hasActiveFilters() {
    return departmentId || semester || search
  }

  function handleResetFilters() {
    setDepartmentId("")
    setSemester("")
    setSearch("")
  }

  // ---- Build calendar grid ----
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const todayStr = new Date().toISOString().split("T")[0]

  const calendarDays: Array<{ day: number; dateStr: string; isToday: boolean; data?: DayData }> = []
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth).padStart(2, "0")
    const dayStr = String(d).padStart(2, "0")
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`
    calendarDays.push({
      day: d,
      dateStr,
      isToday: dateStr === todayStr,
      data: data?.days[dateStr],
    })
  }

  // Summary
  const totalDaysWithActivity = data ? Object.keys(data.days).length : 0
  const totalLogins = data
    ? Object.values(data.days).reduce((sum, d) => sum + d.count, 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Calendar</h1>
          <p className="mt-1 text-muted-foreground">
            View which students logged in on each day
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Search className="size-4" />
            Filters
            {hasActiveFilters() && (
              <span className="ml-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                !
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            <RotateCcw className="size-3.5" />
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAttendance}
            disabled={loading}
          >
            <RotateCcw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {data && !loading && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 ring-1 ring-blue-500/20">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{totalDaysWithActivity}</p>
                <p className="text-xs text-muted-foreground">
                  Days with activity in {MONTH_NAMES[currentMonth - 1]}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 ring-1 ring-emerald-500/20">
                <LogIn className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{totalLogins}</p>
                <p className="text-xs text-muted-foreground">Total student logins</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 ring-1 ring-purple-500/20">
                <UserIcon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {daysInMonth}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total days in {MONTH_NAMES[currentMonth - 1]}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">All Departments</option>
                  {data?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Search Student
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Name, roll, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-end">
                {hasActiveFilters() && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    <RotateCcw className="size-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </h2>
        <Button variant="ghost" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="mx-auto size-10 text-destructive/60" />
            <p className="mt-3 font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchAttendance}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAY_HEADERS.map((header) => (
                <div
                  key={header}
                  className="px-2 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted/30"
                >
                  {header}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] border-b border-r bg-muted/10" />
              ))}

              {/* Actual days */}
              {calendarDays.map(({ day, dateStr, isToday, data: dayData }) => (
                <div
                  key={dateStr}
                  className={cn(
                    "relative min-h-[80px] border-b border-r p-1.5 transition-colors",
                    dayData
                      ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      : "bg-muted/5",
                    isToday && "ring-2 ring-inset ring-primary/30"
                  )}
                  onClick={() => dayData && handleDayClick(dateStr)}
                  title={
                    dayData
                      ? `${dayData.count} student${dayData.count !== 1 ? "s" : ""} logged in`
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    )}
                  >
                    {day}
                  </span>

                  {dayData && (
                    <div className="mt-1">
                      <div className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5">
                        <LogIn className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[10px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                          {dayData.count}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card shadow-lg max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  {formatFullDate(selectedDay)}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedStudents.length} student{selectedStudents.length !== 1 ? "s" : ""} logged in
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {selectedStudents.map((student) => (
                  <div
                    key={student.userId}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.rollNumber} · {student.department.name} · Sem {student.semester}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Login time - green */}
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30 px-2.5 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <LogIn className="size-3" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            Login
                          </span>
                        </div>
                        <p className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-0.5 font-medium">
                          {formatTime(student.loginTime)}
                        </p>
                      </div>
                      {/* Logout time - red/amber, shown as '—' if still logged in */}
                      <div className={cn(
                        "rounded-lg px-2.5 py-1.5 text-center ring-1",
                        student.logoutTime
                          ? "bg-red-50 dark:bg-red-950/30 ring-red-200/50 dark:ring-red-800/30"
                          : "bg-amber-50 dark:bg-amber-950/30 ring-amber-200/50 dark:ring-amber-800/30"
                      )}>
                        <div className={cn(
                          "flex items-center justify-center gap-1",
                          student.logoutTime
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}>
                          <LogOut className="size-3" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            Logout
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs font-mono tabular-nums mt-0.5 font-medium",
                          student.logoutTime
                            ? "text-red-700 dark:text-red-300"
                            : "text-amber-700 dark:text-amber-300"
                        )}>
                          {student.logoutTime ? formatTime(student.logoutTime) : "Still in"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t px-6 py-3 shrink-0">
              <Button variant="outline" onClick={() => setSelectedDay(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
