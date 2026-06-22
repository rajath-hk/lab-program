import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  unlockDate: z.string().optional().refine((val) => (val ? !isNaN(Date.parse(val)) : true)),
  deadline: z
    .string()
    .optional()
    .refine((val) => (val ? !isNaN(Date.parse(val)) : true))
    .refine((val, ctx) => {
      const unlock = ctx.parent.unlockDate ? new Date(ctx.parent.unlockDate) : null;
      if (val && unlock && new Date(val) <= unlock) return false;
      return true;
    }, { message: "Deadline must be after unlock date" }),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session!.user.id },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const program = await prisma.program.findUnique({
    where: { id: params.id },
    include: { questions: true },
  });
  if (!program || program.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Program not found or unauthorized" }, { status: 404 });
  }

  return NextResponse.json({
    id: program.id,
    title: program.title,
    description: program.description,
    unlockDate: program.unlockDate,
    deadline: program.deadline,
    questions: program.questions.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      orderNumber: q.orderNumber,
    })),
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session!.user.id },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const program = await prisma.program.findUnique({ where: { id: params.id } });
  if (!program || program.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Program not found or unauthorized" }, { status: 404 });
  }

  const data = await req.json();
  const validation = updateSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors }, { status: 400 });
  }

  const { title, description, unlockDate, deadline } = validation.data;

  const updated = await prisma.program.update({
    where: { id: params.id },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(unlockDate && { unlockDate: new Date(unlockDate) }),
      ...(deadline && { deadline: new Date(deadline) }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session!.user.id },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const program = await prisma.program.findUnique({ where: { id: params.id } });
  if (!program || program.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Program not found or unauthorized" }, { status: 404 });
  }

  // Prevent delete if any submissions exist for its questions
  const submissions = await prisma.submission.findFirst({
    where: { question: { programId: program.id } },
  });
  if (submissions) {
    return NextResponse.json({ error: "Cannot delete program with student submissions" }, { status: 400 });
  }

  await prisma.program.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
