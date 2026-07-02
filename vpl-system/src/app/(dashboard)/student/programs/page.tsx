"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Clock,
  Lock,
  Unlock,
  Loader2,
  Calendar,
  AlertCircle,
  ArrowRight,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
        setPrograms(await res.json())
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

  function getTimeRemaining(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now()
    if (diff <= 0) return null
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const unlockedPrograms = programs.filter((p) => p.isUnlocked && !p.isExpired)
  const lockedPrograms = programs.filter((p) => !p.isUnlocked)
  const expiredPrograms = programs.filter((p) => p.isExpired)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
        <p className="mt-1 text-muted-foreground">
          Browse available programming assignments
        </p>
      </div>

      {/* Available Programs */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Unlock className="size-4 text-green-600" />
          Available ({unlockedPrograms.length})
        </h2>

        {unlockedPrograms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
            <BookOpen className="size-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-sm font-medium">No programs available yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
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
                <Link key={program.id} href={`/student/programs/${program.id}`}>
                  <Card className="group cursor-pointer transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <BookOpen className="size-5" />
                      </div>
                      <h3 className="mt-3 text-base font-semibold group-hover:text-primary">
                        {program.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {program.description}
                      </p>
                      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-3.5" />
                          {program.teacherName}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="size-3.5" />
                          {program.questionCount} question
                          {program.questionCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {timeLeft && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="size-3.5" />
                          {timeLeft}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
                        Start Coding
                        <ArrowRight className="size-3.5" />
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
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            Upcoming ({lockedPrograms.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lockedPrograms.map((program) => (
              <Card key={program.id} className="opacity-60">
                <CardContent className="p-5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Lock className="size-5" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold">
                    {program.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {program.description}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="size-3.5" />
                      {program.teacherName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
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
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="size-4 text-muted-foreground" />
            Past Deadline ({expiredPrograms.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expiredPrograms.map((program) => (
              <Link key={program.id} href={`/student/programs/${program.id}`}>
                <Card className="group cursor-pointer opacity-60 transition-all hover:opacity-100 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <AlertCircle className="size-5" />
                    </div>
                    <h3 className="mt-3 text-base font-semibold group-hover:text-primary">
                      {program.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {program.description}
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
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
