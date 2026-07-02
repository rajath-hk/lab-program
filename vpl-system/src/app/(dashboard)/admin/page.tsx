"use client"

import { useEffect, useState } from "react"
import {
  Users,
  GraduationCap,
  Presentation,
  Building2,
  BookOpen,
  FileCode,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Stats {
  totalUsers: number
  totalTeachers: number
  totalStudents: number
  totalDepartments: number
  totalPrograms: number
  totalSubmissions: number
  recentUsers: Array<{
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }>
  roleDistribution: Array<{
    role: string
    count: number
  }>
}

const statCards = [
  {
    title: "Total Users",
    key: "totalUsers" as const,
    icon: Users,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/20",
  },
  {
    title: "Teachers",
    key: "totalTeachers" as const,
    icon: Presentation,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    ring: "ring-purple-500/20",
  },
  {
    title: "Students",
    key: "totalStudents" as const,
    icon: GraduationCap,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  {
    title: "Departments",
    key: "totalDepartments" as const,
    icon: Building2,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
  },
  {
    title: "Programs",
    key: "totalPrograms" as const,
    icon: BookOpen,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/20",
  },
  {
    title: "Submissions",
    key: "totalSubmissions" as const,
    icon: FileCode,
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    ring: "ring-cyan-500/20",
  },
]

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TEACHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STUDENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

const roleBarColors: Record<string, string> = {
  ADMIN: "bg-red-500",
  TEACHER: "bg-blue-500",
  STUDENT: "bg-green-500",
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats")
        if (!res.ok) throw new Error("Failed to fetch stats")
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError("Failed to load dashboard data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">{error || "No data available"}</p>
      </div>
    )
  }

  const maxRoleCount = Math.max(...stats.roleDistribution.map((r) => r.count), 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          System overview and management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon
          const value = stats[card.key]
          return (
            <Card key={card.key} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={cn("rounded-lg p-1.5 ring-1", card.color, card.ring)}>
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.roleDistribution.map((item) => {
              const percentage = Math.round((item.count / maxRoleCount) * 100)
              return (
                <div key={item.role} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          roleColors[item.role]
                        )}
                      >
                        {item.role}
                      </span>
                    </div>
                    <span className="font-medium tabular-nums">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        roleBarColors[item.role]
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight",
                      roleColors[user.role]
                    )}
                  >
                    {user.role}
                  </span>
                </div>
              ))}
              {stats.recentUsers.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No users yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
