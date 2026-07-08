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
  Key,
  Copy,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Eye,
  RotateCcw,
  Shield,
  Calendar,
  Hash,
  Building2,
  GraduationCap,
  Upload,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, generateRandomPassword } from "@/lib/utils"
import { useNotification } from "@/components/ui/notification"

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
  isOnboarded?: boolean
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
  const { notify } = useNotification()
  const [users, setUsers] = useState<UserWithRelations[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRelations | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserWithRelations | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dropdown state - tracks which user's action menu is open
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Change Password modal
  const [passwordModal, setPasswordModal] = useState<{
    user: UserWithRelations
  } | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [resetOnboarding, setResetOnboarding] = useState(true)

  // View Details modal
  const [viewUser, setViewUser] = useState<UserWithRelations | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState("STUDENT")
  const [formRollNumber, setFormRollNumber] = useState("")
  const [formEmployeeId, setFormEmployeeId] = useState("")
  const [formDepartmentId, setFormDepartmentId] = useState("")
  const [formSemester, setFormSemester] = useState("1")

  // Generated password after creation
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false)
  const [createdGeneratedPassword, setCreatedGeneratedPassword] = useState("")
  const [createdRollNumber, setCreatedRollNumber] = useState("")
  const [createdCopied, setCreatedCopied] = useState(false)

  // Bulk import
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkDefaultDept, setBulkDefaultDept] = useState("")
  const [bulkDefaultSemester, setBulkDefaultSemester] = useState("1")
  const [bulkResult, setBulkResult] = useState<{
    success: boolean
    total?: number
    successCount?: number
    failCount?: number
    students?: Array<{
      rollNumber: string
      name: string
      email: string
      generatedPassword: string
      success: boolean
      error?: string
    }>
    error?: string
    details?: Array<{ row: number; error: string }>
    validCount?: number
    errorCount?: number
  } | null>(null)

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick() {
      setOpenDropdownId(null)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

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
    setOpenDropdownId(null)
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

      const savedUser = await res.json()

      // If a student was created with auto-generated password, show it
      if (
        !editingUser &&
        savedUser.role === "STUDENT" &&
        savedUser.generatedPassword
      ) {
        setCreatedGeneratedPassword(savedUser.generatedPassword)
        setCreatedRollNumber(savedUser.student?.rollNumber || "")
        setShowGeneratedPassword(true)
      }

      setShowModal(false)
      resetForm()
      fetchUsers()
      notify(
        editingUser ? "User updated successfully" : "User created successfully",
        "success"
      )
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
      notify("User deleted successfully", "success")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Password Change Handlers ──────────────────────
  function openPasswordModal(user: UserWithRelations) {
    setPasswordModal({ user })
    setNewPassword("")
    setGeneratedPassword("")
    setPasswordCopied(false)
    setPasswordError(null)
    setResetOnboarding(user.role === "STUDENT")
    setOpenDropdownId(null)
  }

  function generateRandomPasswordForModal() {
    const pwd = generateRandomPassword()
    setNewPassword(pwd)
    setGeneratedPassword(pwd)
    setPasswordCopied(false)
  }

  async function handlePasswordChange() {
    if (!passwordModal) return

    // Use a local variable to avoid React state timing issues
    let finalPassword = newPassword
    let wasAutoGenerated = false
    const wasPreGenerated = !!generatedPassword

    if (!finalPassword) {
      finalPassword = generateRandomPassword()
      wasAutoGenerated = true
    } else if (finalPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    setPasswordSaving(true)
    setPasswordError(null)

    try {
      const res = await fetch(
        `/api/admin/users/${passwordModal.user.id}/password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: finalPassword, // Always send the actual password
            resetOnboarding,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to change password")
      }

      // Update display to show the saved password with copy button
      setNewPassword(finalPassword)
      setGeneratedPassword(finalPassword)
      setPasswordCopied(false)

      setPasswordSaving(false)
      notify(
        `Password changed for ${passwordModal.user.name}`,
        "success"
      )

      // Close modal only if user typed a manual password (no need to copy)
      if (!wasAutoGenerated && !wasPreGenerated) {
        setPasswordModal(null)
      }

      fetchUsers()
    } catch (err: any) {
      setPasswordError(err.message)
      setPasswordSaving(false)
    }
  }

  // ─── Reset Onboarding ──────────────────────────────
  async function handleResetOnboarding(user: UserWithRelations) {
    if (user.role !== "STUDENT") return

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnboarded: false }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to reset onboarding")
      }

      notify(
        `Onboarding reset for ${user.name}. They will need to complete setup on next login.`,
        "success"
      )
      fetchUsers()
      setOpenDropdownId(null)
    } catch (err: any) {
      notify(err.message, "error")
    }
  }

  function toggleDropdown(e: React.MouseEvent, userId: string) {
    e.stopPropagation()
    setOpenDropdownId(openDropdownId === userId ? null : userId)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
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
            Manage all system users — create, edit, change passwords, and more
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBulkModal(true)}>
            <Upload className="size-4" />
            Bulk Import
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="size-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <UsersIcon className="size-3.5" />
          {users.length} total
        </span>
        <span className="flex items-center gap-1.5 text-blue-500">
          {users.filter((u) => u.role === "TEACHER").length} teachers
        </span>
        <span className="flex items-center gap-1.5 text-green-500">
          {users.filter((u) => u.role === "STUDENT").length} students
        </span>
        <span className="flex items-center gap-1.5 text-red-500">
          {users.filter((u) => u.role === "ADMIN").length} admins
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, or ID..."
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
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
                      {user.student?.rollNumber ||
                        user.teacher?.employeeId ||
                        "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.student?.department?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "STUDENT" && user.isOnboarded === false && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pending-bg/15 px-2 py-0.5 text-[10px] font-medium text-pending">
                          <AlertCircle className="size-3" />
                          Pending
                        </span>
                      )}
                      {user.role === "STUDENT" && user.isOnboarded !== false && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-approved-bg/15 px-2 py-0.5 text-[10px] font-medium text-approved">
                          <CheckCircle2 className="size-3" />
                          Active
                        </span>
                      )}
                      {user.role !== "STUDENT" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditModal(user)}
                          title="Edit user"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openPasswordModal(user)}
                          title="Change password"
                          className="text-pending hover:text-pending"
                        >
                          <Key className="size-3.5" />
                        </Button>
                        {/* More actions dropdown */}
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => toggleDropdown(e, user.id)}
                            title="More actions"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                          {openDropdownId === user.id && (
                            <div
                              className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border bg-card py-1 shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* View Details */}
                              <button
                                onClick={() => {
                                  setViewUser(user)
                                  setOpenDropdownId(null)
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                              >
                                <Eye className="size-4 text-muted-foreground" />
                                View Details
                              </button>

                              {/* Change Password */}
                              <button
                                onClick={() => openPasswordModal(user)}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                              >
                                <Key className="size-4 text-pending" />
                                Change Password
                              </button>

                              {/* Reset Onboarding (students only) */}
                              {user.role === "STUDENT" && (
                                <button
                                  onClick={() => handleResetOnboarding(user)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                >
                                  <RotateCcw className="size-4 text-info" />
                                  Reset Onboarding
                                </button>
                              )}

                              <div className="my-1 border-t" />

                              {/* Edit */}
                              <button
                                onClick={() => openEditModal(user)}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                              >
                                <Pencil className="size-4 text-muted-foreground" />
                                Edit Profile
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => {
                                  setDeletingUser(user)
                                  setOpenDropdownId(null)
                                }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-4" />
                                Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      {search
                        ? "No users matching your search"
                        : "No users yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Create/Edit Modal ─────────────────────────── */}
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
                    Password{" "}
                    {editingUser
                      ? "(leave blank to keep current)"
                      : formRole === "STUDENT"
                      ? "(auto-generated if empty)"
                      : ""}
                  </label>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={
                      editingUser
                        ? "New password"
                        : formRole === "STUDENT"
                        ? "Leave empty for auto-generated"
                        : "Password"
                    }
                    required={!editingUser && formRole !== "STUDENT"}
                  />
                  {formRole === "STUDENT" && !editingUser && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave empty to auto-generate a secure password. The generated
                      password will be shown once after creation.
                    </p>
                  )}
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

      {/* ─── Change Password Modal ─────────────────────── */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Key className="size-4 text-pending" />
                Change Password
              </h2>
              <button
                onClick={() => {
                  setPasswordModal(null)
                  setPasswordError(null)
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-sm font-medium">
                  {passwordModal.user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {passwordModal.user.email} ·{" "}
                  <span
                    className={cn(
                      "inline-block rounded px-1 py-0.5 text-[10px] font-semibold uppercase",
                      roleColors[passwordModal.user.role]
                    )}
                  >
                    {passwordModal.user.role}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="mb-1.5 block text-sm font-medium">
                  New Password
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setGeneratedPassword("")
                      setPasswordCopied(false)
                    }}
                    placeholder="Enter new password or generate one"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateRandomPasswordForModal}
                    title="Generate random password"
                    className="shrink-0"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
                {!newPassword && (
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate, or type a custom password (min. 6
                    chars)
                  </p>
                )}
              </div>

              {/* Generated password display */}
              {generatedPassword && (
                <div className="rounded-lg border border-pending/20 bg-pending-bg/10 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-pending flex items-center gap-1.5">
                      <Key className="size-3" />
                      Generated Password
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword)
                        setPasswordCopied(true)
                        setTimeout(() => setPasswordCopied(false), 2000)
                      }}
                    >
                      {passwordCopied ? (
                        <CheckCircle2 className="size-3.5 text-approved" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="rounded-md bg-background px-3 py-2 font-mono text-sm tracking-wider">
                    {generatedPassword}
                  </div>
                </div>
              )}

              {/* Reset onboarding toggle (students only) */}
              {passwordModal.user.role === "STUDENT" && (
                <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={resetOnboarding}
                    onChange={(e) => setResetOnboarding(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-input accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Reset onboarding</p>
                    <p className="text-xs text-muted-foreground">
                      Student will need to set their name, email, and new password
                      on next login
                    </p>
                  </div>
                </label>
              )}

              {passwordError && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {passwordError}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordModal(null)
                    setPasswordError(null)
                  }}
                >
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordSaving}
                  >
                    {passwordSaving && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    {passwordSaving ? "Saving..." : "Change Password"}
                  </Button>
                  {generatedPassword && !passwordSaving && (
                    <Button
                      onClick={() => {
                        setPasswordModal(null)
                        setPasswordError(null)
                      }}
                    >
                      <CheckCircle2 className="size-4 text-approved" />
                      Done
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── View Details Modal ────────────────────────── */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="size-4 text-info" />
                User Details
              </h2>
              <button
                onClick={() => setViewUser(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {viewUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{viewUser.name}</h3>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight",
                      roleColors[viewUser.role]
                    )}
                  >
                    {viewUser.role}
                  </span>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                  <Hash className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">User ID</p>
                    <p className="text-sm font-mono">{viewUser.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                  <Eye className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{viewUser.email}</p>
                  </div>
                </div>
                {viewUser.student?.rollNumber && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                    <GraduationCap className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Roll Number</p>
                      <p className="text-sm font-mono">
                        {viewUser.student.rollNumber}
                      </p>
                    </div>
                  </div>
                )}
                {viewUser.teacher?.employeeId && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                    <Shield className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Employee ID</p>
                      <p className="text-sm font-mono">
                        {viewUser.teacher.employeeId}
                      </p>
                    </div>
                  </div>
                )}
                {viewUser.student?.department && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm">
                        {viewUser.student.department.name} (
                        {viewUser.student.department.code})
                      </p>
                    </div>
                  </div>
                )}
                {viewUser.student?.semester && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                    <GraduationCap className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Semester</p>
                      <p className="text-sm">Semester {viewUser.student.semester}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm">{formatDate(viewUser.createdAt)}</p>
                  </div>
                </div>
                {viewUser.role === "STUDENT" && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                    {viewUser.isOnboarded === false ? (
                      <>
                        <AlertCircle className="size-4 text-pending shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Onboarding</p>
                          <p className="text-sm text-pending">Not completed</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4 text-approved shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Onboarding</p>
                          <p className="text-sm text-approved">Completed</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewUser(null)
                    openEditModal(viewUser)
                  }}
                >
                  <Pencil className="size-4" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewUser(null)
                    openPasswordModal(viewUser)
                  }}
                >
                  <Key className="size-4" />
                  Change Password
                </Button>
                <Button onClick={() => setViewUser(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Generated Password After Creation ─────────── */}
      {showGeneratedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Key className="size-4 text-pending" />
                Student Created
              </h2>
              <button
                onClick={() => {
                  setShowGeneratedPassword(false)
                  setCreatedCopied(false)
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-pending/20 bg-pending-bg/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-pending mb-1">
                  <AlertCircle className="size-4" />
                  Save these credentials — they won&apos;t be shown again!
                </div>
                <p className="text-xs text-muted-foreground">
                  Share these login details with the student.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Roll Number
                  </label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 font-mono text-sm">
                    {createdRollNumber}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Generated Password
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 rounded-lg border bg-muted/30 px-3 py-2.5 font-mono text-sm tracking-wider">
                      {createdGeneratedPassword}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(createdGeneratedPassword)
                        setCreatedCopied(true)
                        setTimeout(() => setCreatedCopied(false), 2000)
                      }}
                      className="shrink-0"
                    >
                      {createdCopied ? (
                        <CheckCircle2 className="size-4 text-approved" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    setShowGeneratedPassword(false)
                    setCreatedCopied(false)
                  }}
                >
                  I&apos;ve Saved the Credentials
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk Import Modal ────────────────────────── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Upload className="size-4 text-info" />
                Bulk Import Students
              </h2>
              <button
                onClick={() => {
                  setShowBulkModal(false)
                  setBulkResult(null)
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Instructions */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-medium flex items-center gap-2">
                  <Download className="size-4 text-muted-foreground" />
                  File Format
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload a .xlsx, .xls, or .csv file with student data.
                  Column names are case-insensitive. The following columns are recognized:
                </p>
                <div className="overflow-x-auto rounded-lg bg-muted p-3">
                  <code className="text-xs font-mono whitespace-nowrap">
                    RollNumber* | Name | Email | DepartmentCode* | Semester
                  </code>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li><strong className="text-foreground">RollNumber</strong> (required) - Unique student roll number</li>
                  <li><strong className="text-foreground">Name</strong> (optional) - Defaults to "New Student"</li>
                  <li><strong className="text-foreground">Email</strong> (optional) - Auto-generated if empty</li>
                  <li><strong className="text-foreground">DepartmentCode</strong> (required if no default) - e.g., MC, CS, EC</li>
                  <li><strong className="text-foreground">Semester</strong> (optional) - Defaults to selected value (1-8)</li>
                </ul>
                <p className="mt-2 text-xs text-pending">
                  Secure passwords are auto-generated for all students. Passwords
                  will be shown in the results.
                </p>
                <Button
                  variant="ghost"
                  size="xs"
                  className="mt-2 h-7 text-xs"
                  onClick={() => {
                    const header = "RollNumber,Name,Email,DepartmentCode,Semester\n";
                    const sample = "1AM25MC001,Ramu Kumar,ramu@amc.edu,MC,1\n1AM25MC002,Sita Devi,sita@amc.edu,MC,1\n1AM25CS001,Amit Singh,amit@amc.edu,CS,1";
                    const blob = new Blob([header + sample], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "student-import-template.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="size-3" />
                  Download Sample CSV
                </Button>
              </div>

              {/* Show results if import completed */}
              {bulkResult ? (
                <div className="space-y-4">
                  {/* Success summary */}
                  {bulkResult.success && (
                    <div className="flex items-center gap-3 rounded-lg border border-approved/20 bg-approved-bg/10 px-4 py-3">
                      <CheckCircle2 className="size-5 text-approved shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-approved">
                          Import complete
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bulkResult.successCount ?? 0} student
                          {(bulkResult.successCount ?? 0) !== 1 ? "s" : ""} created
                          {(bulkResult.failCount ?? 0) > 0
                            ? `, ${bulkResult.failCount ?? 0} failed`
                            : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Validation errors */}
                  {!bulkResult.success && bulkResult.details && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
                      <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                        <AlertCircle className="size-4" />
                        {bulkResult.error}
                        {bulkResult.validCount !== undefined && (
                          <span className="text-xs text-muted-foreground font-normal">
                            ({bulkResult.validCount} valid, {bulkResult.errorCount} errors)
                          </span>
                        )}
                      </p>
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {bulkResult.details.map((d, i) => (
                          <li key={i} className="text-xs text-destructive/80">
                            Row {d.row}: {d.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Server error */}
                  {!bulkResult.success && !bulkResult.details && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
                      <p className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="size-4" />
                        {bulkResult.error}
                      </p>
                    </div>
                  )}

                  {/* Created students with passwords */}
                  {bulkResult.students && bulkResult.students.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">
                          Generated Credentials
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {bulkResult.successCount ?? 0} created
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto rounded-lg border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                Roll No.
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                Name
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                Password
                              </th>
                              <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {bulkResult.students.map((s, i) => (
                              <tr
                                key={i}
                                className={cn(
                                  "transition-colors",
                                  s.success
                                    ? "hover:bg-muted/30"
                                    : "bg-destructive/5"
                                )}
                              >
                                <td className="px-3 py-2 font-mono">
                                  {s.rollNumber}
                                </td>
                                <td className="px-3 py-2">{s.name}</td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] tracking-wider">
                                      {s.generatedPassword}
                                    </code>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(
                                          s.generatedPassword
                                        )
                                        notify("Password copied", "success")
                                      }}
                                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                                      title="Copy password"
                                    >
                                      <Copy className="size-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {s.success ? (
                                    <CheckCircle2 className="mx-auto size-3.5 text-approved" />
                                  ) : (
                                    <span
                                      className="text-destructive text-[10px]"
                                      title={s.error}
                                    >
                                      Failed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-pending flex items-center gap-1.5">
                        <AlertCircle className="size-3" />
                        Copy these passwords now. They won&apos;t be shown again!
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBulkModal(false)
                        setBulkResult(null)
                        fetchUsers()
                      }}
                    >
                      Close
                    </Button>
                    {(bulkResult.successCount ?? 0) > 0 && (
                      <Button
                        onClick={() => {
                          // Generate and download a CSV with credentials
                          const header =
                            "RollNumber,Name,Email,Password\n"
                          const rows = bulkResult
                            .students!.filter((s) => s.success)
                            .map(
                              (s) =>
                                `${s.rollNumber},"${s.name}",${s.email},"${s.generatedPassword}"`
                            )
                            .join("\n")
                          const blob = new Blob([header + rows], {
                            type: "text/csv",
                          })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = `student-credentials-${
                            new Date()
                              .toISOString()
                              .split("T")[0]
                          }.csv`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        <Download className="size-4" />
                        Export Credentials CSV
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* Upload form */
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const file = formData.get("file") as File

                    if (!file) {
                      notify("Please select a file", "error")
                      return
                    }

                    setBulkUploading(true)
                    setBulkResult(null)

                    try {
                      const fd = new FormData()
                      fd.append("file", file)
                      if (bulkDefaultDept) fd.append("departmentId", bulkDefaultDept)
                      if (bulkDefaultSemester)
                        fd.append("semester", bulkDefaultSemester)

                      const res = await fetch("/api/admin/users/bulk", {
                        method: "POST",
                        body: fd,
                      })

                      const data = await res.json()

                      if (!res.ok) {
                        setBulkResult({
                          success: false,
                          error: data.error,
                          details: data.details,
                          validCount: data.validCount,
                          errorCount: data.errorCount,
                        })
                      } else {
                        setBulkResult(data)
                      }

                      // Clear the file input
                      const fileInput = e.currentTarget.querySelector(
                        'input[type="file"]'
                      ) as HTMLInputElement
                      if (fileInput) fileInput.value = ""
                    } catch (err: any) {
                      setBulkResult({
                        success: false,
                        error: err.message,
                      })
                    } finally {
                      setBulkUploading(false)
                    }
                  }}
                  className="space-y-4"
                >
                  {/* Default department (optional) */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Default Department{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <select
                        value={bulkDefaultDept}
                        onChange={(e) => setBulkDefaultDept(e.target.value)}
                        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Use column in file</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Default Semester{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <select
                        value={bulkDefaultSemester}
                        onChange={(e) => setBulkDefaultSemester(e.target.value)}
                        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Use column in file</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Select File
                    </label>
                    <Input
                      type="file"
                      name="file"
                      accept=".xlsx,.xls,.csv"
                      required
                      className="cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Supports .xlsx, .xls, and .csv files (max 500 rows)
                    </p>
                  </div>

                  {bulkUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Processing file...
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowBulkModal(false)
                        setBulkResult(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={bulkUploading}>
                      {bulkUploading && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Import Students
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation ───────────────────────── */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete User</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deletingUser.name}</strong> ({deletingUser.email})? This
              action cannot be undone.
            </p>

            {deletingUser.role === "TEACHER" && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-400">
                This teacher has programs and questions. Deleting will remove
                them too.
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
