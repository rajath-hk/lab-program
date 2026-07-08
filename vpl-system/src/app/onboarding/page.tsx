"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { BRAND } from "@/lib/branding"
import {
  User,
  Mail,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect if already onboarded
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated" && session?.user?.isOnboarded) {
      router.push("/student")
    }
  }, [status, session, router])

  // Pre-fill existing values if any
  useEffect(() => {
    if (session?.user) {
      if (session.user.name && session.user.name !== "New Student") {
        setName(session.user.name)
      }
      if (session.user.email && !session.user.email.includes("@temp.")) {
        setEmail(session.user.email)
      }
    }
  }, [session])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === "authenticated" && session?.user?.isOnboarded) {
    return null // Will redirect via useEffect
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    setSaving(true)

    try {
      const res = await fetch("/api/student/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to complete setup")
      }

      setSuccess(true)

      // Redirect to student dashboard after a brief delay
      setTimeout(() => {
        router.push("/student")
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-24 items-center justify-center">
            <Image
              src={BRAND.logoPath}
              alt={BRAND.name}
              width={96}
              height={96}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{BRAND.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your profile setup
          </p>
        </div>

        {success ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-approved-bg/15">
                <CheckCircle2 className="size-7 text-approved" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Profile Complete!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;re all set. Redirecting to your dashboard...
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Welcome to the Lab</CardTitle>
              <CardDescription>
                Set up your profile to get started. You can change these later in
                your settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a new password (min. 6 chars)"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={cn("pl-10", password !== confirmPassword && confirmPassword && "border-destructive")}
                    />
                  </div>
                  {password !== confirmPassword && confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <Button type="submit" className="w-full" disabled={saving} size="lg">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Setting up profile...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>

                {/* Sign out */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LogOut className="size-3" />
                    Sign out and start over
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Help text */}
        <p className="text-center text-xs text-muted-foreground">
          Use your roll number and new password to sign in next time.
        </p>
      </div>
    </div>
  )
}
