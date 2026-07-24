import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { checkRateLimit, checkConcurrentLimit } from "@/lib/rate-limiter"
import { getRoleDashboard } from "@/lib/redirect"
import { INACTIVITY_TIMEOUT } from "@/lib/session-config"

// ===========================================================================
// Rate-limit configurations
// ===========================================================================

/** 1 minute in milliseconds. */
const MINUTE = 60_000

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

const RATE_LIMITS = {
  /** Code execution endpoint — expensive, strict limit. */
  execute: { windowMs: MINUTE, max: 10 },
  /** Student submissions (POST only) — moderate limit. */
  submissions: { windowMs: MINUTE, max: 20 },
  /** Analytics SSE stream — concurrent connection limit (TTL-based). */
  stream: { maxConcurrent: 3, ttlMs: 5 * MINUTE },
  /** Default for all other API routes. */
  default: { windowMs: MINUTE, max: 60 },
} as const

/** IPs that bypass rate limiting in development. */
const DEV_BYPASS_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"])

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

/** IPs that bypass rate limiting in development. */
const DEV_BYPASS_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"])

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Extract the client IP from the request.
 * Checks `x-forwarded-for` first, then `x-real-ip`, then falls back to
 * the Next.js-provided `req.ip`.
 */
function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    return xff.split(",")[0].trim()
  }

  const xRealIp = req.headers.get("x-real-ip")
  if (xRealIp) return xRealIp

  // Fallback (may be undefined in some edge runtime contexts)
  // @ts-ignore
  return (req.ip || "") as string
}

  }

  const xRealIp = req.headers.get("x-real-ip")
  if (xRealIp) {
    return xRealIp.trim()
  }

  // Next.js does not expose a typed `ip` property on NextRequest,
  // but the runtime may still populate it — cast safely as a last resort.
  const connectionIp = (req as unknown as { ip?: string }).ip
  return connectionIp ?? "unknown"
}

/** Build a standard 429 response with JSON body and Retry-After header. */
function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests", retryAfter },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  )
}

/**
 * Apply route-specific rate limiting to an API request.
 * Returns a 429 response when blocked, or `null` when the request is allowed.
 */
function applyRateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  const ip = getClientIP(req)

  // Optional dev bypass — skip rate limiting for localhost.
  if (process.env.NODE_ENV !== "production" && DEV_BYPASS_IPS.has(ip)) {
    return null
  }

  // /api/execute — 10 requests per minute per IP.
  if (pathname === "/api/execute") {
    const result = checkRateLimit(ip, "/api/execute", RATE_LIMITS.execute)
    return result.allowed ? null : tooManyRequests(result.retryAfter!)
  }

  // /api/student/submissions (POST only) — 20 requests per minute per IP.
  if (pathname.startsWith("/api/student/submissions") && req.method === "POST") {
    const result = checkRateLimit(
      ip,
      "/api/student/submissions",
      RATE_LIMITS.submissions,
    )
    return result.allowed ? null : tooManyRequests(result.retryAfter!)
  }

  // /api/admin/analytics/stream — max 3 concurrent connections per IP.
  if (pathname.startsWith("/api/admin/analytics/stream")) {
    const result = checkConcurrentLimit(
      ip,
      "/api/admin/analytics/stream",
      RATE_LIMITS.stream.maxConcurrent,
      RATE_LIMITS.stream.ttlMs,
    )
    return result.allowed ? null : tooManyRequests(result.retryAfter!)
  }

  // All other /api/* routes — 60 requests per minute per IP.
  if (pathname.startsWith("/api/")) {
    const result = checkRateLimit(ip, "/api/_default", RATE_LIMITS.default)
    return result.allowed ? null : tooManyRequests(result.retryAfter!)
  }

  return null
}

// ===========================================================================
// Middleware
// ===========================================================================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // -----------------------------------------------------------------------
  // API routes — rate limiting only
  // -----------------------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    const blocked = applyRateLimit(req)
    if (blocked) return blocked
    return NextResponse.next()
  }

  // -----------------------------------------------------------------------
  // Page routes — auth & access control (incorporated from proxy.ts)
  // -----------------------------------------------------------------------
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Inactivity timeout for authenticated users (skip /login).
  if (token && token.lastActivity && pathname !== "/login") {
    const elapsed = Date.now() - Number(token.lastActivity)
    if (elapsed > INACTIVITY_TIMEOUT) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // Redirect authenticated users away from /login to their dashboard.
  if (pathname === "/login") {
    if (token) {
      const role = token.role as string
      // Students who need onboarding go to /onboarding instead of /student.
      if (role === "STUDENT" && token.isOnboarded === false) {
        return NextResponse.redirect(new URL("/onboarding", req.url))
      }
      return NextResponse.redirect(new URL(getRoleDashboard(role), req.url))
    }
    return NextResponse.next()
  }

  // Unauthenticated users are redirected to login.
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = token.role

  // Allow un-onboarded students to access the onboarding page.
  if (pathname === "/onboarding") {
    if (role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    // If already onboarded, redirect to student dashboard.
    if (token.isOnboarded === true) {
      return NextResponse.redirect(new URL("/student", req.url))
    }
    return NextResponse.next()
  }

  // Prevent wrong role from accessing wrong dashboard.
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (pathname.startsWith("/teacher") && role !== "TEACHER") {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  if (pathname.startsWith("/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Un-onboarded students can only access /onboarding.
  if (
    role === "STUDENT" &&
    token.isOnboarded === false &&
    pathname !== "/onboarding"
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url))
  }

  return NextResponse.next()
}

// ===========================================================================
// Matcher — API routes (rate limiting) + page routes (auth checks)
// ===========================================================================

export const config = {
  matcher: [
    // API routes — rate limiting
    "/api/:path*",
    // Page routes — auth & access control
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/onboarding",
    "/login",
  ],
}
