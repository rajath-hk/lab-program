// API route to log student tab switching activity
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tab, programId, questionId } = await request.json();
    if (!tab) {
      return NextResponse.json({ error: "Missing tab" }, { status: 400 });
    }

    await logActivity(
      session.user.id,
      "TAB_SWITCH",
      `Switched to "${tab}" tab for question ${questionId} in program ${programId}`
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to log tab switch:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
