import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { getRoleDashboard } from "@/lib/redirect"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Redirect authenticated users away from /login to their dashboard
    if (pathname === "/login") {
      if (token) {
        const role = token.role as string
        return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
      }
      return NextResponse.next()
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const role = token.role

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
    "/login",
  ],
}
