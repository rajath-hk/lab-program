"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import {
  Search,
  Filter,
  Loader2,
  History,
  UserIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  LogIn,
  LogOut,
  Users,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Radio,
  Wifi,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Department {
  id: string
  name: string
  code: string
}

interface AttendanceRecord {
  userId: string
  studentId: string
  name: string
  email: string
  rollNumber: string
  department: { id: string; name: string; code: string }
  semester: number
  date: string
  firstLogin: string | null
  lastLogout: string | null
  duration: number | null
  status: "present" | "absent"
  loginCount: number
}

interface AttendanceResponse {
  attendance: AttendanceRecord[]
  departments: Department[]
  summary: {
    totalStudents: number
    totalDays: number
    totalRecords: number
    present: number
    absent: number
  }
}

interface LiveSession {
  userId: string
  studentId: string
  name: string
  email: string
  rollNumber: string
  department: { id: string; name: string; code: string }
  semester: number
  loginTime: string
  durationMinutes: number
}

interface LiveResponse {
  activeSessions: LiveSession[]
  totalActive: number
  totalStudents: number
  checkedAt: string
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return "—"
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

function formatDurationLive(loginTime: string): string {
  const diff = Date.now() - new Date(loginTime).getTime()
  const totalMinutes = Math.floor(diff / 60000)
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const secs = Math.floor((diff % 60000) / 1000)
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function TeacherAttendancePage() {
  const [data, setData] = useState<AttendanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null)

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split("T")[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0])
  const [departmentId, setDepartmentId] = useState("")
  const [semester, setSemester] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(true)
  const [viewMode, setViewMode] = useState<"table" | "cards" | "live">("table")

  // Live session state
  const [liveData, setLiveData] = useState<LiveResponse | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Triggers re-renders so formatDurationLive() picks up Date.now()
  const [, setTick] = useState(0)

  const recordsPerPage = 30

  const fetchAttendance = useCallback(async () => {
    if (!fromDate) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("from", fromDate)
      if (toDate) params.set("to", toDate)
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
  }, [fromDate, toDate, departmentId, semester, search])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  // ===== LIVE SESSION POLLING =====

  const fetchLiveSessions = useCallback(async () => {
    setLiveLoading(true)
    setLiveError(null)

    try {
      const params = new URLSearchParams()
      if (departmentId) params.set("departmentId", departmentId)
      if (semester) params.set("semester", semester)
      if (search) params.set("search", search)

      const res = await fetch(`/api/teacher/attendance/live?${params}`)
      if (!res.ok) throw new Error("Failed to fetch live sessions")
      setLiveData(await res.json())
    } catch (err) {
      setLiveError("Failed to load live sessions")
      console.error(err)
    } finally {
      setLiveLoading(false)
    }
  }, [departmentId, semester, search])

  // Start/stop polling when view mode changes
  useEffect(() => {
    if (viewMode === "live") {
      fetchLiveSessions()
      liveIntervalRef.current = setInterval(fetchLiveSessions, 10000)
      // Client-side tick every 30s to refresh duration display
      const tickInterval = setInterval(() => setTick((t) => t + 1), 10000)
      return () => {
        if (liveIntervalRef.current) clearInterval(liveIntervalRef.current)
        clearInterval(tickInterval)
      }
    } else {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current)
        liveIntervalRef.current = null
      }
    }
  }, [viewMode, fetchLiveSessions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current)
    }
  }, [])

  function handleReset() {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    setFromDate(d.toISOString().split("T")[0])
    setToDate(new Date().toISOString().split("T")[0])
    setDepartmentId("")
    setSemester("")
    setSearch("")
    setPage(1)
  }

  function hasActiveFilters() {
    return departmentId || semester || search
  }

  // Paginate attendance records
  const paginatedRecords = useMemo(() => {
    if (!data?.attendance) return []
    const start = (page - 1) * recordsPerPage
    return data.attendance.slice(start, start + recordsPerPage)
  }, [data?.attendance, page])

  const totalPages = useMemo(() => {
    if (!data?.attendance) return 1
    return Math.ceil(data.attendance.length / recordsPerPage)
  }, [data?.attendance])

  // Group by student for card view
  const groupedByStudent = useMemo(() => {
    if (!data?.attendance) return []
    const grouped = new Map<string, AttendanceRecord[]>()
    for (const record of data.attendance) {
      const existing = grouped.get(record.studentId) || []
      existing.push(record)
      grouped.set(record.studentId, existing)
    }
    return Array.from(grouped.entries()).map(([studentId, records]) => ({
      studentId,
      name: records[0].name,
      rollNumber: records[0].rollNumber,
      email: records[0].email,
      department: records[0].department,
      semester: records[0].semester,
      records: records.sort((a, b) => a.date.localeCompare(b.date)),
      presentDays: records.filter((r) => r.status === "present").length,
      totalDays: records.length,
    }))
  }, [data?.attendance])

  // ===== EXPORT FUNCTIONS =====

  async function handleExportExcel() {
    if (!data?.attendance.length) return
    setExporting("excel")

    try {
      const XLSX = await import("xlsx")

      const rows = data.attendance.map((record) => ({
        Date: formatDate(record.date),
        "Roll Number": record.rollNumber,
        "Student Name": record.name,
        Email: record.email,
        Department: record.department.name,
        Semester: record.semester,
        Status: record.status === "present" ? "Present" : "Absent",
        "First Login": formatTime(record.firstLogin),
        "Last Logout": formatTime(record.lastLogout),
        Duration: formatDuration(record.duration),
        "Login Count": record.loginCount,
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()

      worksheet["!cols"] = [
        { wch: 22 }, // Date
        { wch: 14 }, // Roll Number
        { wch: 22 }, // Student Name
        { wch: 28 }, // Email
        { wch: 18 }, // Department
        { wch: 10 }, // Semester
        { wch: 10 }, // Status
        { wch: 12 }, // First Login
        { wch: 12 }, // Last Logout
        { wch: 12 }, // Duration
        { wch: 12 }, // Login Count
      ]

      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance")

      // Summary sheet
      const summaryRows = [
        { Metric: "Date Range", Value: `${formatDate(fromDate)} — ${formatDate(toDate)}` },
        { Metric: "Total Students", Value: data.summary.totalStudents },
        { Metric: "Total Days", Value: data.summary.totalDays },
        { Metric: "Total Records", Value: data.summary.totalRecords },
        { Metric: "Present Records", Value: data.summary.present },
        { Metric: "Absent Records", Value: data.summary.absent },
        { Metric: "Attendance Rate", Value: `${((data.summary.present / data.summary.totalRecords) * 100).toFixed(1)}%` },
        { Metric: "Generated", Value: new Date().toLocaleString() },
      ]
      if (departmentId) {
        const dept = data.departments.find((d) => d.id === departmentId)
        summaryRows.push({ Metric: "Department", Value: dept?.name || departmentId })
      }
      if (semester) summaryRows.push({ Metric: "Semester", Value: semester })

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
      summarySheet["!cols"] = [{ wch: 20 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

      XLSX.writeFile(workbook, `attendance-${fromDate}-to-${toDate}.xlsx`)
    } catch (err) {
      console.error("Failed to generate Excel:", err)
    } finally {
      setExporting(null)
    }
  }

  async function handleExportPDF() {
    if (!data?.attendance.length) return
    setExporting("pdf")

    try {
      const { default: jsPDF } = await import("jspdf")
      await import("jspdf-autotable")
      // Type augmentation for autotable
      const jsPDFInstance = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

      // Title
      jsPDFInstance.setFontSize(16)
      jsPDFInstance.text("Student Attendance Report", 14, 15)

      jsPDFInstance.setFontSize(10)
      jsPDFInstance.setTextColor(100)
      jsPDFInstance.text(`Period: ${formatDate(fromDate)} — ${formatDate(toDate)}`, 14, 22)

      // Summary section
      jsPDFInstance.setFontSize(11)
      jsPDFInstance.setTextColor(50)
      jsPDFInstance.text(
        `Total Students: ${data.summary.totalStudents}  |  Total Days: ${data.summary.totalDays}  |  Records: ${data.summary.totalRecords}`,
        14,
        29
      )
      jsPDFInstance.text(
        `Present: ${data.summary.present}  |  Absent: ${data.summary.absent}  |  Rate: ${((data.summary.present / data.summary.totalRecords) * 100).toFixed(1)}%`,
        14,
        35
      )

      if (departmentId) {
        const dept = data.departments.find((d) => d.id === departmentId)
        jsPDFInstance.text(`Department: ${dept?.name || departmentId}`, 14, 41)
      }
      if (semester) jsPDFInstance.text(`Semester: ${semester}`, 14, 41)

      const yOffset = departmentId || semester ? 45 : 38

      // Table
      const tableData = data.attendance.map((record) => [
        formatDate(record.date),
        record.rollNumber,
        record.name,
        record.department.code,
        String(record.semester),
        record.status === "present" ? "Present" : "Absent",
        formatTime(record.firstLogin),
        formatTime(record.lastLogout),
        formatDuration(record.duration),
      ])

      ;(jsPDFInstance as any).autoTable({
        startY: yOffset + 3,
        head: [["Date", "Roll No", "Name", "Dept", "Sem", "Status", "Login", "Logout", "Duration"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontSize: 8,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 18 },
          2: { cellWidth: 40 },
          3: { cellWidth: 14 },
          4: { cellWidth: 12 },
          5: { cellWidth: 16, halign: "center" },
          6: { cellWidth: 16, halign: "center" },
          7: { cellWidth: 16, halign: "center" },
          8: { cellWidth: 16, halign: "center" },
        },
        didParseCell: function (data: any) {
          if (data.column.index === 5 && data.cell.text[0] === "Present") {
            data.cell.styles.textColor = [22, 163, 74]
            data.cell.styles.fontStyle = "bold"
          } else if (data.column.index === 5 && data.cell.text[0] === "Absent") {
            data.cell.styles.textColor = [220, 38, 38]
            data.cell.styles.fontStyle = "bold"
          }
        },
      })

      jsPDFInstance.save(`attendance-${fromDate}-to-${toDate}.pdf`)
    } catch (err) {
      console.error("Failed to generate PDF:", err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="mt-1 text-muted-foreground">
            Track student login/logout activity and generate attendance reports
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="size-4" />
            Filters
            {hasActiveFilters() && (
              <span className="ml-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                !
              </span>
            )}
          </Button>
          <Button
            variant={viewMode === "live" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode(viewMode === "live" ? "table" : "live")
            }}
            className={cn(
              viewMode === "live" && "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            <span className={cn(
              "relative flex size-2 mr-1.5",
              viewMode === "live" && "animate-pulse"
            )}>
              <span className={cn(
                "absolute inline-flex size-full rounded-full opacity-75",
                viewMode === "live" ? "bg-emerald-300" : "bg-muted-foreground"
              )} />
              <span className={cn(
                "relative inline-flex size-2 rounded-full",
                viewMode === "live" ? "bg-emerald-400" : "bg-muted-foreground/50"
              )} />
            </span>
            Live
            {liveData && viewMode !== "live" && liveData.totalActive > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                {liveData.totalActive}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAttendance}
            disabled={loading}
          >
            <RotateCcw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting === "excel" || !data?.attendance.length}
          >
            {exporting === "excel" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Excel
          </Button>
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={exporting === "pdf" || !data?.attendance.length}
          >
            {exporting === "pdf" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  From Date *
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value)
                    setPage(1)
                  }}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value)
                    setPage(1)
                  }}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value)
                    setPage(1)
                  }}
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
                  onChange={(e) => {
                    setSemester(e.target.value)
                    setPage(1)
                  }}
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
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="pl-8 text-sm"
                  />
                </div>
              </div>
            </div>
            {hasActiveFilters() && (
              <div className="mt-3 flex items-center justify-end">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw className="size-3.5" />
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {data && !loading && viewMode !== "live" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 ring-1 ring-blue-500/20">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{data.summary.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Students Tracked</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 ring-1 ring-purple-500/20">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{data.summary.totalDays}</p>
                <p className="text-xs text-muted-foreground">Days in Range</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-emerald-600">
                  {data.summary.present}
                </p>
                <p className="text-xs text-muted-foreground">
                  Present Records ({(data.summary.totalRecords > 0
                    ? ((data.summary.present / data.summary.totalRecords) * 100).toFixed(1)
                    : 0)}%)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-red-500/10 p-2 text-red-600 ring-1 ring-red-500/20">
                <XCircle className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-red-600">{data.summary.absent}</p>
                <p className="text-xs text-muted-foreground">
                  Absent Records ({(data.summary.totalRecords > 0
                    ? ((data.summary.absent / data.summary.totalRecords) * 100).toFixed(1)
                    : 0)}%)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View toggle */}
      {data && data.attendance.length > 0 && !loading && viewMode !== "live" && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.attendance.length} record{data.attendance.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              By Student
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
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

      {/* No data state */}
      {!loading && data && data.attendance.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center">
          <History className="size-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-sm font-medium">No attendance records found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveFilters()
              ? "Try adjusting your filters or selecting a wider date range."
              : "Select a date range and click refresh to view attendance data."}
          </p>
        </div>
      )}

      {/* ===== TABLE VIEW ===== */}
      {!loading && data && data.attendance.length > 0 && viewMode === "table" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        Date
                      </div>
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="size-3.5" />
                        Student
                      </div>
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground">
                      Dept
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-muted-foreground">
                      Sem
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <LogIn className="size-3.5" />
                        Login
                      </div>
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <LogOut className="size-3.5" />
                        Logout
                      </div>
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="size-3.5" />
                        Duration
                      </div>
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-muted-foreground">
                      Logins
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedRecords.map((record) => (
                    <tr
                      key={`${record.userId}|${record.date}`}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        record.status === "absent" && "bg-red-50/30 dark:bg-red-950/10"
                      )}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{record.name}</p>
                          <p className="text-xs text-muted-foreground">{record.rollNumber}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                        {record.department.code}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center text-xs text-muted-foreground">
                        {record.semester}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight",
                            record.status === "present"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}
                        >
                          {record.status === "present" ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <XCircle className="size-3" />
                          )}
                          {record.status === "present" ? "Present" : "Absent"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center font-mono text-xs tabular-nums text-muted-foreground">
                        {formatTime(record.firstLogin)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center font-mono text-xs tabular-nums text-muted-foreground">
                        {formatTime(record.lastLogout)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center text-xs font-medium tabular-nums">
                        {record.duration !== null ? (
                          <span
                            className={cn(
                              record.duration >= 60
                                ? "text-emerald-600 dark:text-emerald-400"
                                : record.duration >= 30
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatDuration(record.duration)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center text-xs text-muted-foreground">
                        {record.loginCount || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ===== CARD VIEW (Grouped by Student) ===== */}
      {!loading && data && data.attendance.length > 0 && viewMode === "cards" && (
        <div className="space-y-4">
          {groupedByStudent.map((group) => (
            <Card key={group.studentId} className="overflow-hidden">
              <CardHeader className="border-b bg-muted/20 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserIcon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.rollNumber} · {group.department.name} · Sem {group.semester}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      {group.presentDays} present
                    </span>
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="size-3.5" />
                      {group.totalDays - group.presentDays} absent
                    </span>
                    <span className="text-muted-foreground">
                      {((group.presentDays / group.totalDays) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Date
                        </th>
                        <th className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Status
                        </th>
                        <th className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Login
                        </th>
                        <th className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Logout
                        </th>
                        <th className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {group.records.map((record) => (
                        <tr
                          key={`${record.userId}|${record.date}`}
                          className={cn(
                            "transition-colors hover:bg-muted/20",
                            record.status === "absent" && "bg-red-50/20 dark:bg-red-950/5"
                          )}
                        >
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                            {formatDate(record.date)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                record.status === "present"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              )}
                            >
                              {record.status === "present" ? (
                                <CheckCircle2 className="size-2.5" />
                              ) : (
                                <XCircle className="size-2.5" />
                              )}
                              {record.status === "present" ? "Present" : "Absent"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-center font-mono text-xs tabular-nums text-muted-foreground">
                            {formatTime(record.firstLogin)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-center font-mono text-xs tabular-nums text-muted-foreground">
                            {formatTime(record.lastLogout)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-center text-xs tabular-nums">
                            {record.duration !== null ? (
                              <span
                                className={cn(
                                  "font-medium",
                                  record.duration >= 60
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : record.duration >= 30
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatDuration(record.duration)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== LIVE VIEW (Real-time Active Sessions) ===== */}
      {viewMode === "live" && (
        <div className="space-y-4">
          {/* Live banner */}
          <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    {liveData?.totalActive || 0} student{liveData?.totalActive !== 1 ? "s" : ""} currently active
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Out of {liveData?.totalStudents || 0} total students · Auto-refreshes every 10s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {liveData?.checkedAt && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Updated {new Date(liveData.checkedAt).toLocaleTimeString()}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={fetchLiveSessions}
                  disabled={liveLoading}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                >
                  <RefreshCw className={cn("size-3", liveLoading && "animate-spin")} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {liveLoading && !liveData && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error */}
          {liveError && !liveLoading && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
              <AlertCircle className="size-10 text-destructive/60" />
              <p className="mt-3 font-medium">{liveError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchLiveSessions}>
                Retry
              </Button>
            </div>
          )}

          {/* No active sessions */}
          {liveData && liveData.activeSessions.length === 0 && !liveLoading && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center">
              <Wifi className="size-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-sm font-medium">No active sessions</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No students are currently logged in. Active sessions will appear here in real time.
              </p>
            </div>
          )}

          {/* Active sessions grid */}
          {liveData && liveData.activeSessions.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {liveData.activeSessions.map((session) => (
                <Card
                  key={session.userId}
                  className="transition-all hover:shadow-md overflow-hidden border-emerald-200 dark:border-emerald-900/50"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="relative flex size-3 shrink-0 mt-1">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{session.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {session.rollNumber} · {session.department.code} · Sem {session.semester}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Logged In
                        </p>
                        <p className="mt-0.5 text-xs font-mono tabular-nums">
                          {formatTime(session.loginTime)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Duration
                        </p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                          {formatDurationLive(session.loginTime)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Radio className="size-3" />
                      <span>Active session · {session.department.name}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
