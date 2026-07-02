"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users as UsersIcon,
  X,
  Loader2,
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

interface UserWithRelations {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  student?: {
    rollNumber: string
    semester: number
    department: Department
  } | null
  teacher?: {
    employeeId: string
  } | null
}

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TEACHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STUDENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithRelations[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRelations | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserWithRelations | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState("STUDENT")
  const [formRollNumber, setFormRollNumber] = useState("")
  const [formEmployeeId, setFormEmployeeId] = useState("")
  const [formDepartmentId, setFormDepartmentId] = useState("")
  const [formSemester, setFormSemester] = useState("1")

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      setUsers(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/departments")
      if (!res.ok) throw new Error("Failed to fetch departments")
      setDepartments(await res.json())
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, [fetchUsers, fetchDepartments])

  function resetForm() {
    setFormName("")
    setFormEmail("")
    setFormPassword("")
    setFormRole("STUDENT")
    setFormRollNumber("")
    setFormEmployeeId("")
    setFormDepartmentId("")
    setFormSemester("1")
    setError(null)
  }

  function openCreateModal() {
    resetForm()
    setEditingUser(null)
    setShowModal(true)
  }

  function openEditModal(user: UserWithRelations) {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword("")
    setFormRole(user.role)
    setFormRollNumber(user.student?.rollNumber || "")
    setFormEmployeeId(user.teacher?.employeeId || "")
    setFormDepartmentId(user.student?.department?.id || "")
    setFormSemester(user.student?.semester?.toString() || "1")
    setError(null)
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const body: any = {
        name: formName,
        email: formEmail,
        role: formRole,
      }

      if (formPassword) body.password = formPassword

      if (formRole === "STUDENT") {
        body.rollNumber = formRollNumber
        body.departmentId = formDepartmentId
        body.semester = formSemester
      } else if (formRole === "TEACHER") {
        body.employeeId = formEmployeeId
      }

      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : "/api/admin/users"

      const method = editingUser ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save user")
      }

      setShowModal(false)
      resetForm()
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingUser) return
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete user")
      }

      setDeletingUser(null)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.student?.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
      u.teacher?.employeeId?.toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">
            Manage all system users
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    ID / Roll No.
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Department
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight",
                          roleColors[user.role]
                        )}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {user.student?.rollNumber || user.teacher?.employeeId || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.student?.department?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditModal(user)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeletingUser(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      {search ? "No users matching your search" : "No users yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editingUser ? "Edit User" : "Add User"}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Name</label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <Input
                    required
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">
                    Password {editingUser && "(leave blank to keep current)"}
                  </label>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUser ? "New password" : "Password"}
                    required={!editingUser}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>

                {formRole === "TEACHER" && (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">
                      Employee ID
                    </label>
                    <Input
                      required
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      placeholder="e.g., EMP001"
                    />
                  </div>
                )}

                {formRole === "STUDENT" && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Roll Number
                      </label>
                      <Input
                        required
                        value={formRollNumber}
                        onChange={(e) => setFormRollNumber(e.target.value)}
                        placeholder="e.g., 1AM25MC001"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Semester
                      </label>
                      <select
                        value={formSemester}
                        onChange={(e) => setFormSemester(e.target.value)}
                        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium">
                        Department
                      </label>
                      <select
                        required
                        value={formDepartmentId}
                        onChange={(e) => setFormDepartmentId(e.target.value)}
                        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Select department...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
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
                  {editingUser ? "Save Changes" : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete User</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deletingUser.name}</strong> ({deletingUser.email})? This
              action cannot be undone.
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
                  setDeletingUser(null)
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
