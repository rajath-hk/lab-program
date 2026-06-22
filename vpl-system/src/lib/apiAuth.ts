import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Helper to enforce role based access in API routes.
 * Returns an object with `error` (a NextResponse) when unauthorized/forbidden
 * and the `session` when allowed.
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  if (!allowedRoles.includes(session.user.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}
