import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { getRoleDashboard } from "@/lib/redirect"
import { INACTIVITY_TIMEOUT } from "@/lib/session-config"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Check inactivity timeout for authenticated users (skip for /login)
    if (token && token.lastActivity && pathname !== "/login") {
      const elapsed = Date.now() - Number(token.lastActivity)
      if (elapsed > INACTIVITY_TIMEOUT) {
        return NextResponse.redirect(new URL("/login", req.url))
      }
    }

    // Redirect authenticated users away from /login to their dashboard
    if (pathname === "/login") {
      if (token) {
        const role = token.role as string
        // Students who need onboarding go to /onboarding instead of /student
        if (role === "STUDENT" && token.isOnboarded === false) {
          return NextResponse.redirect(new URL("/onboarding", req.url))
        }
        return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
      }
      return NextResponse.next()
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const role = token.role

    // Allow un-onboarded students to access onboarding page
    if (pathname === "/onboarding") {
      if (role !== "STUDENT") {
        return NextResponse.redirect(new URL("/login", req.url))
      }
      // If already onboarded, redirect to student dashboard
      if (token.isOnboarded === true) {
        return NextResponse.redirect(new URL("/student", req.url))
      }
      return NextResponse.next()
    }

    // Prevent wrong role from accessing wrong dashboard
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (pathname.startsWith("/teacher") && role !== "TEACHER") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (pathname.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Un-onboarded students can only access /onboarding
    if (
      role === "STUDENT" &&
      token.isOnboarded === false &&
      pathname !== "/onboarding"
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true, // let middleware function handle it
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/onboarding",
    "/login",
  ],
}
