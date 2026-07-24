"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  BookOpen,
  Clock,
  Lock,
  Unlock,
  Loader2,
  Calendar,
  AlertCircle,
  User,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Program {
  id: string
  title: string
  description: string
  unlockDate: string
  deadline: string | null
  teacherName: string
  questionCount: number
  isUnlocked: boolean
  isExpired: boolean
}

export default function StudentProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPrograms() {
      try {
        const res = await fetch("/api/student/programs")
        if (!res.ok) throw new Error("Failed to fetch programs")
        const data = await res.json()
        setPrograms(Array.isArray(data) ? data : data.programs || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPrograms()
  }, [])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  function getTimeRemaining(dateStr: string) {
    const diff = new Date(dateStr).getTime() - now
    if (diff <= 0) return null
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const unlockedPrograms = programs.filter((p) => p.isUnlocked && !p.isExpired)
  const lockedPrograms = programs.filter((p) => !p.isUnlocked)
  const expiredPrograms = programs.filter((p) => p.isExpired)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Programs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse available programming assignments
        </p>
      </div>

      {/* Available Programs */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Unlock className="size-3.5 text-approved" />
          Available ({unlockedPrograms.length})
        </h2>

        {unlockedPrograms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-16 text-center">
            <BookOpen className="size-8 text-muted-foreground/30" />
            <h3 className="mt-3 text-[13px] font-medium">No programs available yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Programs will appear here once they are unlocked.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unlockedPrograms.map((program) => {
              const timeLeft = program.deadline
                ? getTimeRemaining(program.deadline)
                : null
              return (
                <Link key={program.id} href={`/student/programs/${program.id}`} className="block">
                  <Card className="group h-full transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/5 text-primary mb-4">
                        <BookOpen className="size-5" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1.5">
                        {program.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {program.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            {program.teacherName}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="size-3" />
                            {program.questionCount} question
                            {program.questionCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {timeLeft && (
                          <div className="flex items-center gap-1 text-[11px] text-pending">
                            <Clock className="size-3" />
                            {timeLeft}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Locked Programs */}
      {lockedPrograms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Lock className="size-3.5 text-muted-foreground" />
            Upcoming ({lockedPrograms.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lockedPrograms.map((program) => (
              <Card key={program.id} className="h-full opacity-60">
                <CardContent className="p-5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-4">
                    <Lock className="size-5" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">
                    {program.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {program.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {program.teacherName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      Unlocks {formatDate(program.unlockDate)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Expired Programs */}
      {expiredPrograms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertCircle className="size-3.5 text-muted-foreground" />
            Past Deadline ({expiredPrograms.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expiredPrograms.map((program) => (
              <Link key={program.id} href={`/student/programs/${program.id}`} className="block">
                <Card className="group h-full opacity-60 transition-opacity hover:opacity-80">
                  <CardContent className="p-5">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-4">
                      <AlertCircle className="size-5" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5">
                      {program.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {program.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Deadline passed
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}