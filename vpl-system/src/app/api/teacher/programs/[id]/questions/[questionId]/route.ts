import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

async function getTeacherSession() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "TEACHER") return null

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
  })
  if (!teacher) return null

  return { session, teacher }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const auth = await getTeacherSession()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, questionId } = await params

  try {
    // Verify the program belongs to this teacher
    const program = await prisma.program.findFirst({
      where: { id, teacherId: auth.teacher.id },
    })
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    const body = await request.json()

    // Handle reorder
    if (body.action === "reorder") {
      const { questions } = body
      if (!Array.isArray(questions)) {
        return NextResponse.json({ error: "Invalid reorder data" }, { status: 400 })
      }

      await prisma.$transaction(
        questions.map((q: { id: string; orderNumber: number }, index: number) =>
          prisma.question.update({
            where: { id: q.id },
            data: { orderNumber: index + 1 },
          })
        )
      )

      return NextResponse.json({ success: true })
    }

    // Normal update
    const { title, description, difficulty, starterCode, testCases } = body
    const data: any = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (difficulty !== undefined) data.difficulty = difficulty
    if (starterCode !== undefined) data.starterCode = starterCode
    if (testCases !== undefined) data.testCases = JSON.stringify(testCases)

    const question = await prisma.question.update({
      where: { id: questionId },
      data,
    })

    await logActivity(
      auth.session.user.id,
      "UPDATE_QUESTION",
      `Updated question "${question.title}" in program "${program.title}"`
    )

    return NextResponse.json(question)
  } catch (error) {
    console.error("Failed to update question:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const auth = await getTeacherSession()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, questionId } = await params

  try {
    const program = await prisma.program.findFirst({
      where: { id, teacherId: auth.teacher.id },
    })
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 })
    }

    // Get question title before deleting
    const deletedQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      select: { title: true, programId: true },
    })

    await prisma.$transaction(async (tx) => {
      await tx.submission.deleteMany({ where: { questionId } })
      await tx.question.delete({ where: { id: questionId } })

      // Renumber remaining questions
      const remaining = await tx.question.findMany({
        where: { programId: id },
        orderBy: { orderNumber: "asc" },
      })
      for (let i = 0; i < remaining.length; i++) {
        await tx.question.update({
          where: { id: remaining[i].id },
          data: { orderNumber: i + 1 },
        })
      }
    })

    await logActivity(
      auth.session.user.id,
      "DELETE_QUESTION",
      `Deleted question "${deletedQuestion?.title || 'Unknown'}" from program`
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete question:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
