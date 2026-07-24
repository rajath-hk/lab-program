"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Plus,
  BookOpen,
  FileCode,
  Pencil,
  Trash2,
  X,
  Loader2,
  Calendar,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Program {
  id: string
  title: string
  description: string
  unlockDate: string
  deadline: string | null
  createdAt: string
  _count: { questions: number }
}

export default function TeacherProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formUnlockDate, setFormUnlockDate] = useState("")
  const [formDeadline, setFormDeadline] = useState("")

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/programs")
      if (!res.ok) throw new Error("Failed to fetch programs")
      const data = await res.json()
      setPrograms(data.programs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  function resetForm() {
    setFormTitle("")
    setFormDescription("")
    setFormUnlockDate("")
    setFormDeadline("")
    setError(null)
  }

  function openCreateModal() {
    resetForm()
    setEditingProgram(null)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setFormUnlockDate(tomorrow.toISOString().slice(0, 16))
    setShowModal(true)
  }

  function openEditModal(program: Program) {
    setEditingProgram(program)
    setFormTitle(program.title)
    setFormDescription(program.description)
    setFormUnlockDate(new Date(program.unlockDate).toISOString().slice(0, 16))
    setFormDeadline(
      program.deadline
        ? new Date(program.deadline).toISOString().slice(0, 16)
        : ""
    )
    setError(null)
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const body = {
        title: formTitle,
        description: formDescription,
        unlockDate: formUnlockDate,
        deadline: formDeadline || null,
      }

      const url = editingProgram
        ? `/api/teacher/programs/${editingProgram.id}`
        : "/api/teacher/programs"

      const method = editingProgram ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save program")
      }

      setShowModal(false)
      resetForm()
      fetchPrograms()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingProgram) return
    setSaving(true)

    try {
      const res = await fetch(`/api/teacher/programs/${deletingProgram.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete program")
      }

      setDeletingProgram(null)
      fetchPrograms()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  function isUnlocked(unlockDate: string) {
    return new Date(unlockDate) <= new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage programming assignments
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          New Program
        </Button>
      </div>

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-sm font-medium">No programs yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first programming assignment.
          </p>
          <Button className="mt-4" onClick={openCreateModal}>
            <Plus className="size-4" />
            New Program
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => {
            const unlocked = isUnlocked(program.unlockDate)
            return (
              <Card
                key={program.id}
                className={cn(
                  "group relative transition-all hover:shadow-md",
                  !unlocked && "opacity-60"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="size-5" />
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEditModal(program)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeletingProgram(program)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Link
                    href={`/teacher/programs/${program.id}`}
                    className="mt-3 block"
                  >
                    <h3 className="text-base font-semibold group-hover:text-primary">
                      {program.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {program.description}
                    </p>
                  </Link>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileCode className="size-3.5" />
                      {program._count.questions} question
                      {program._count.questions !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {formatDate(program.unlockDate)}
                    </span>
                  </div>

                  <Link
                    href={`/teacher/programs/${program.id}`}
                    className="mt-3 flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    Manage Questions
                    <ArrowRight className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editingProgram ? "Edit Program" : "New Program"}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Title
                </label>
                <Input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Lab 1: Arrays & Pointers"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the programming assignment..."
                  rows={3}
                  className="h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Unlock Date
                  </label>
                  <Input
                    required
                    type="datetime-local"
                    value={formUnlockDate}
                    onChange={(e) => setFormUnlockDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Deadline (optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {editingProgram ? "Save Changes" : "Create Program"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete Program</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deletingProgram.title}</strong>? This will also delete
              all associated questions and submissions. This action cannot be
              undone.
            </p>

            {error && (
              <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeletingProgram(null)
                  setError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={handleDelete}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
