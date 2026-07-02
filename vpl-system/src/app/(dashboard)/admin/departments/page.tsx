"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  X,
  Loader2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DepartmentWithCount {
  id: string
  name: string
  code: string
  _count: {
    students: number
  }
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<DepartmentWithCount | null>(null)
  const [deletingDept, setDeletingDept] = useState<DepartmentWithCount | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formName, setFormName] = useState("")
  const [formCode, setFormCode] = useState("")

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/departments")
      if (!res.ok) throw new Error("Failed to fetch departments")
      setDepartments(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  function resetForm() {
    setFormName("")
    setFormCode("")
    setError(null)
  }

  function openCreateModal() {
    resetForm()
    setEditingDept(null)
    setShowModal(true)
  }

  function openEditModal(dept: DepartmentWithCount) {
    setEditingDept(dept)
    setFormName(dept.name)
    setFormCode(dept.code)
    setError(null)
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const body = { name: formName, code: formCode }

      const url = editingDept
        ? `/api/admin/departments/${editingDept.id}`
        : "/api/admin/departments"

      const method = editingDept ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save department")
      }

      setShowModal(false)
      resetForm()
      fetchDepartments()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingDept) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/departments/${deletingDept.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete department")
      }

      setDeletingDept(null)
      fetchDepartments()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="mt-1 text-muted-foreground">
            Manage academic departments
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          Add Department
        </Button>
      </div>

      {/* Departments Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card key={dept.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => openEditModal(dept)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setDeletingDept(dept)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-3">{dept.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium">
                  {dept.code}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {dept._count.students} student{dept._count.students !== 1 ? "s" : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {departments.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
            <Building2 className="size-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-sm font-medium">No departments yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first department to get started.
            </p>
            <Button className="mt-4" onClick={openCreateModal}>
              <Plus className="size-4" />
              Add Department
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editingDept ? "Edit Department" : "Add Department"}
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
                  Department Name
                </label>
                <Input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Master of Computer Applications"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Department Code
                </label>
                <Input
                  required
                  value={formCode}
                  onChange={(e) =>
                    setFormCode(e.target.value.toUpperCase())
                  }
                  placeholder="e.g., MC"
                  className="uppercase"
                  maxLength={10}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Short code (max 10 characters). Will be uppercased
                  automatically.
                </p>
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
                  {editingDept ? "Save Changes" : "Create Department"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete Department</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deletingDept.name}</strong> ({deletingDept.code})? This
              action cannot be undone.
            </p>

            {deletingDept._count.students > 0 && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-400">
                This department has {deletingDept._count.students} student
                {deletingDept._count.students !== 1 ? "s" : ""} associated with
                it. You must reassign or remove them first.
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeletingDept(null)
                  setError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={saving || deletingDept._count.students > 0}
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
