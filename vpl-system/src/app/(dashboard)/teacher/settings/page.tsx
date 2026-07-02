"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Loader2,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  IdCard,
  Calendar,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface TeacherProfile {
  id: string
  employeeId: string
  name: string
  email: string
  createdAt: string
}

export default function TeacherSettingsPage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Password form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/settings")
      if (!res.ok) throw new Error("Failed to fetch profile")
      const data = await res.json()
      setProfile(data)
      setName(data.name)
      setEmail(data.email)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileSuccess(null)
    setProfileError(null)

    try {
      const res = await fetch("/api/teacher/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update profile")
      }

      const data = await res.json()
      setProfile(data)
      setName(data.name)
      setEmail(data.email)
      setProfileSuccess("Profile updated successfully")
    } catch (err: any) {
      setProfileError(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordSuccess(null)
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      setPasswordSaving(false)
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      setPasswordSaving(false)
      return
    }

    try {
      const res = await fetch("/api/teacher/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to change password")
      }

      setPasswordSuccess("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile and account settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Name</label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>

                {profileSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {profileSuccess}
                  </div>
                )}

                {profileError && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {profileError}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileSaving}>
                    {profileSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-4" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="relative">
                  <label className="mb-1.5 block text-sm font-medium">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      required
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      required
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      required
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}

                {passwordError && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {passwordError}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordSaving}>
                    {passwordSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Lock className="size-4" />
                    )}
                    Change Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Account Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IdCard className="size-4 shrink-0" />
                  <span>
                    Employee ID: <strong>{profile.employeeId}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4 shrink-0" />
                  <span>Joined {formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Your <strong>Employee ID</strong> is a read-only identifier
                assigned by the system administrator.
              </p>
              <p>
                Changing your <strong>email</strong> will update your login
                credentials. You'll need to use the new email to sign in next
                time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
