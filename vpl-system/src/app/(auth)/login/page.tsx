"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BRAND } from "@/lib/branding"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { getRoleDashboard } from "@/lib/redirect"

const loginSchema = z.object({
  identifier: z.string().min(3, "Roll number or email must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        identifier: data.identifier,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid credentials. Please try again.")
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        // Fetch session to get role and onboarding status
        const sessionRes = await fetch("/api/auth/session")
        const session = await sessionRes.json()

        if (session?.user?.role) {
          // If student is not onboarded, redirect to onboarding page
          if (
            session.user.role === "STUDENT" &&
            session.user.isOnboarded === false
          ) {
            router.push("/onboarding")
          } else {
            router.push(getRoleDashboard(session.user.role))
          }
        } else {
          router.push("/login")
        }
      } else {
        // Handle unexpected case (result is null or missing ok/error)
        setError("Sign-in failed. Please try again.")
        setIsLoading(false)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center">
            <Image
              src={BRAND.logoPath}
              alt={BRAND.name}
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold">{BRAND.name}</CardTitle>
          <CardDescription>{BRAND.name} Programming Lab</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Roll Number or Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter your roll number or email"
                {...register("identifier")}
              />
              {errors.identifier && (
                <p className="text-sm text-destructive">{errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
