import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"
import type { SubmissionStatus } from "@prisma/client"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const submissions = await prisma.submission.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            program: { select: { id: true, title: true } },
          },
        },
      },
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error("Failed to fetch submissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const body = await request.json()
    const { questionId, code, language, output } = body

    if (!questionId || !code) {
      return NextResponse.json({ error: "Question ID and code are required" }, { status: 400 })
    }

    // Verify the question exists and its program is unlocked
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { program: { select: { unlockDate: true } } },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    if (question.program.unlockDate > new Date()) {
      return NextResponse.json({ error: "This program is not yet unlocked" }, { status: 403 })
    }

    // Check for existing submission - if exists, update it instead
    const existing = await prisma.submission.findFirst({
      where: {
        studentId: student.id,
        questionId,
      },
      orderBy: { createdAt: "desc" },
    })

    let submission
    let initialStatus: SubmissionStatus = "PENDING"

    // ── Auto-approve logic: run test cases if defined on the question ──
    let autoApprove = false
    let testResults: { input: string; expectedOutput: string; actualOutput: string; passed: boolean }[] | [] = []

    // Fetch full question including testCases
    const fullQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      select: { testCases: true },
    })

    if (fullQuestion?.testCases) {
      try {
        const parsedTestCases = JSON.parse(fullQuestion.testCases)
        if (Array.isArray(parsedTestCases) && parsedTestCases.length > 0) {
          // Call the execute endpoint to run test cases
          const baseUrl = `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host")}`
          const execRes = await fetch(`${baseUrl}/api/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              language: language || "plaintext",
              testCases: parsedTestCases,
            }),
          })

          if (execRes.ok) {
            const execData = await execRes.json()
            testResults = execData.testResults || []
            if (testResults.length > 0 && testResults.every((t: any) => t.passed)) {
              initialStatus = "APPROVED"
              autoApprove = true
            }
          }
        }
      } catch {
        // If test case parsing or execution fails, fall back to PENDING
      }
    }

    if (existing) {
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          code,
          language: language || "plaintext",            status: initialStatus,
          output: output || null,
          feedback: autoApprove ? "Auto-approved: all test cases passed." : null,
        },
        include: {
          question: {
            select: {
              id: true,
              title: true,
              program: { select: { id: true, title: true } },
            },
          },
        },
      })
    } else {
      submission = await prisma.submission.create({
        data: {
          studentId: student.id,
          questionId,
          code,
          language: language || "plaintext",
          status: initialStatus,
          output: output || null,
          feedback: autoApprove ? "Auto-approved: all test cases passed." : null,
        },
        include: {
          question: {
            select: {
              id: true,
              title: true,
              program: { select: { id: true, title: true } },
            },
          },
        },
      })
    }

    await logActivity(
      session.user.id,
      autoApprove ? "SUBMIT_CODE_AUTO_APPROVED" : "SUBMIT_CODE",
      autoApprove
        ? `Submitted code for question "${question.title}" — auto-approved (${testResults?.length} test cases passed)`
        : `Submitted code for question "${question.title}" (${language || "plaintext"})${testResults.length > 0 ? ` — ${testResults.filter((t) => t.passed).length}/${testResults.length} tests passed, pending review` : ""}`
    )

    return NextResponse.json(submission, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error("Failed to create submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
