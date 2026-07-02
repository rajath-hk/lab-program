import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

const PISTON_API_URL = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const startTime = Date.now()

    // Fetch runtimes
    const runtimesRes = await fetch(`${PISTON_API_URL}/runtimes`, {
      signal: AbortSignal.timeout(10000),
    })

    const responseTime = Date.now() - startTime

    if (!runtimesRes.ok) {
      return NextResponse.json({
        status: "error",
        apiUrl: PISTON_API_URL,
        responseTime,
        error: `Piston API returned status ${runtimesRes.status}`,
        runtimes: [],
        testResult: null,
      })
    }

    const runtimes = await runtimesRes.json()

    // Filter to our supported languages
    const supportedLanguageIds = [
      "python", "javascript", "typescript",
      "java", "c++", "c", "rust", "go",
    ]

    const supportedRuntimes = runtimes
      .filter((r: any) => supportedLanguageIds.includes(r.language))
      .map((r: any) => ({
        language: r.language,
        version: r.version,
        aliases: r.aliases || [],
      }))

    const unsupportedRuntimes = runtimes
      .filter((r: any) => !supportedLanguageIds.includes(r.language))
      .slice(0, 20)
      .map((r: any) => ({
        language: r.language,
        version: r.version,
      }))

    // Test execution with Python
    let testResult: any = null
    try {
      const testRes = await fetch(`${PISTON_API_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "python",
          version: runtimes.find((r: any) => r.language === "python")?.version || "3.10.0",
          files: [{ name: "test.py", content: "print('Piston is working!')" }],
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (testRes.ok) {
        const testData = await testRes.json()
        testResult = {
          success: true,
          output: testData.run?.output || "",
          stdout: testData.run?.stdout || "",
          exitCode: testData.run?.code ?? null,
        }
      } else {
        testResult = {
          success: false,
          error: `Test execution failed with status ${testRes.status}`,
        }
      }
    } catch (err: any) {
      testResult = {
        success: false,
        error: err.message,
      }
    }

    return NextResponse.json({
      status: "ok",
      apiUrl: PISTON_API_URL,
      responseTime,
      totalRuntimes: runtimes.length,
      supportedRuntimes,
      unsupportedRuntimes,
      testResult,
    })
  } catch (error: any) {
    console.error("Piston health check failed:", error)
    return NextResponse.json({
      status: "error",
      apiUrl: PISTON_API_URL,
      responseTime: -1,
      error: error.message || "Failed to connect to Piston API",
      runtimes: [],
      testResult: null,
    })
  }
}
