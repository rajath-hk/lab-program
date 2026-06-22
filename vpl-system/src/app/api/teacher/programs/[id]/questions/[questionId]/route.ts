import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { reorderQuestions } from "@/lib/reorderQuestions";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  starterCode: z.string().optional(),
  languages: z.array(z.enum(["C", "C++", "Java", "Python", "JavaScript"]))
    .optional(),
});

export async function GET(req: Request, { params }: { params: { id: string; questionId: string } }) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const question = await prisma.question.findUnique({
    where: { id: params.questionId },
    include: { program: true },
  });
  if (!question || question.program.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Question not found or unauthorized" }, { status: 404 });
  }

  return NextResponse.json({
    id: question.id,
    title: question.title,
    description: question.description,
    starterCode: question.starterCode,
    languages: question.languages,
    orderNumber: question.orderNumber,
  });
}

export async function PUT(req: Request, { params }: { params: { id: string; questionId: string } }) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const existing = await prisma.question.findUnique({
    where: { id: params.questionId },
    include: { program: true },
  });
  if (!existing || existing.program.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Question not found or unauthorized" }, { status: 404 });
  }

  const data = await req.json();
  const validation = updateSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  const { title, description, starterCode, languages } = validation.data;

  const updated = await prisma.question.update({
    where: { id: params.questionId },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(starterCode !== undefined && { starterCode }),
      ...(languages && { languages }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string; questionId: string } }) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const question = await prisma.question.findUnique({
    where: { id: params.questionId },
    include: { program: true },
  });
  if (!question || question.program.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Question not found or unauthorized" }, { status: 404 });
  }

  // Prevent deletion if submissions exist for this question
  const hasSub = await prisma.submission.findFirst({ where: { questionId: question.id } });
  if (hasSub) {
    return NextResponse.json({ error: "Cannot delete question with existing submissions" }, { status: 400 });
  }

  await prisma.question.delete({ where: { id: question.id } });
  // Reorder remaining questions
  await reorderQuestions(question.programId);

  return NextResponse.json({ success: true });
}
