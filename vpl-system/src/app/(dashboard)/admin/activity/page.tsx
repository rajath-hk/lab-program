"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Search,
  Filter,
  Download,
  Loader2,
  History,
  UserIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ActivityUser {
  id: string
  name: string
  email: string
  role: string
}

interface ActivityLog {
  id: string
  userId: string
  user: ActivityUser
  action: string
  details: string | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ActivityResponse {
  logs: ActivityLog[]
  pagination: Pagination
  actionTypes: string[]
}

const actionColors: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  LOGOUT: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  CREATE_USER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  UPDATE_USER: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  DELETE_USER: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CREATE_DEPARTMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  UPDATE_DEPARTMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE_DEPARTMENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CREATE_PROGRAM: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  UPDATE_PROGRAM: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  DELETE_PROGRAM: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CREATE_QUESTION: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  UPDATE_QUESTION: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  DELETE_QUESTION: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  SUBMIT_CODE: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  REVIEW_SUBMISSION: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  CREATE_BULK_UPLOAD: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  TAB_SWITCH: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
}

function formatAction(action: string) {
  return action
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TEACHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STUDENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export default function AdminActivityPage() {
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<keyof ActivityLog>("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (actionFilter) params.set("action", actionFilter)
      if (fromDate) params.set("from", fromDate)
      if (toDate) params.set("to", toDate)
      params.set("page", String(page))
      params.set("limit", "50")

      const res = await fetch(`/api/admin/activity?${params}`)
      if (!res.ok) throw new Error("Failed to fetch activity logs")
      setData(await res.json())
    } catch (err) {
      setError("Failed to load activity logs")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, actionFilter, fromDate, toDate, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function handleReset() {
    setSearch("")
    setActionFilter("")
    setFromDate("")
    setToDate("")
    setPage(1)
  }

  function hasActiveFilters() {
    return search || actionFilter || fromDate || toDate
  }

  async function handleExportExcel() {
    if (!data?.logs.length) return
    setExporting(true)

    try {
      const XLSX = await import("xlsx")

      const rows = data.logs.map((log) => ({
        "Date & Time": formatDate(log.createdAt),
        "User Name": log.user.name,
        "Email": log.user.email,
        "Role": log.user.role,
        "Action": formatAction(log.action),
        "Details": log.details || "",
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()

      // Set column widths
      worksheet["!cols"] = [
        { wch: 22 }, // Date & Time
        { wch: 20 }, // User Name
        { wch: 28 }, // Email
        { wch: 10 }, // Role
        { wch: 20 }, // Action
        { wch: 50 }, // Details
      ]

      XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Logs")

      // Add a summary sheet if filters are active
      if (hasActiveFilters()) {
        const summaryRows: any[] = []
        if (actionFilter) summaryRows.push({ "Filter": "Action", "Value": formatAction(actionFilter) })
        if (fromDate) summaryRows.push({ "Filter": "From Date", "Value": fromDate })
        if (toDate) summaryRows.push({ "Filter": "To Date", "Value": toDate })
        if (search) summaryRows.push({ "Filter": "Search", "Value": search })
        summaryRows.push({ "Filter": "Generated", "Value": new Date().toLocaleString() })
        summaryRows.push({ "Filter": "Total Records", "Value": data.pagination.total })

        const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
        summarySheet["!cols"] = [{ wch: 15 }, { wch: 40 }]
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")
      }

      XLSX.writeFile(workbook, `activity-logs-${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch (err) {
      console.error("Failed to generate Excel:", err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Logs</h1>
          <p className="mt-1 text-muted-foreground">
            Track all system activity — logins, logouts, and administrative changes
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RotateCcw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting || !data?.logs.length}
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="User name, email, details..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="pl-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Action Type
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">All actions</option>
                  {data?.actionTypes.map((action) => (
                    <option key={action} value={action}>
                      {formatAction(action)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  From Date
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

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Activity Logs Table */}
      {!loading && data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {data.pagination.total} log{data.pagination.total !== 1 ? "s" : ""} found
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
<th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button type="button" className="flex items-center gap-1.5" onClick={() => {
                      setSortKey('createdAt');
                      setSortDir(prev => (sortKey === 'createdAt' && prev === 'asc') ? 'desc' : 'asc');
                    }}>
                      <CalendarDays className="size-3.5" />
                      Date & Time
                    </button>
                  </th>
<th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button type="button" className="flex items-center gap-1.5" onClick={() => {
                      setSortKey('user');
                      setSortDir(prev => (sortKey === 'user' && prev === 'asc') ? 'desc' : 'asc');
                    }}>
                      <UserIcon className="size-3.5" />
                      User
                    </button>
                  </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.logs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{log.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight",
                            roleColors[log.user.role]
                          )}
                        >
                          {log.user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight",
                            actionColors[log.action] ||
                              "bg-muted text-muted-foreground"
                          )}
                        >
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">
                        {log.details || "—"}
                      </td>
                    </tr>
                  ))}
                  {data.logs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-16 text-center"
                      >
                        <History className="mx-auto size-10 text-muted-foreground/40" />
                        <p className="mt-3 font-medium">No activity logs found</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {hasActiveFilters()
                            ? "Try adjusting your filters."
                            : "Activity will appear here once users start interacting with the system."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
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
                  onClick={() =>
                    setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                  }
                  disabled={page >= data.pagination.totalPages}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
