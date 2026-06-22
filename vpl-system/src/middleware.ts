import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const pathname = req.nextUrl.pathname;

    // Already on login, allow
    if (pathname === "/login") return NextResponse.next();

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role;

    // Role-based routing protection
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/teacher") && role !== "TEACHER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/login",
  ],
};
