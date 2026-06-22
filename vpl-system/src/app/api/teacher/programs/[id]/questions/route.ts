import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { z } from "zod";

// Validation schema for creating a question
const questionSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  starterCode: z.string().optional(),
  languages: z.array(z.enum(["C", "C++", "Java", "Python", "JavaScript"]))
    .nonempty()
    .default(["C", "C++", "Java", "Python", "JavaScript"]),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  // Verify ownership
  const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const program = await prisma.program.findUnique({ where: { id: params.id } });
  if (!program || program.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Program not found or unauthorized" }, { status: 404 });
  }

  const questions = await prisma.question.findMany({
    where: { programId: params.id },
    orderBy: { orderNumber: "asc" },
  });
  return NextResponse.json(
    questions.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      starterCode: q.starterCode,
      languages: q.languages,
      orderNumber: q.orderNumber,
    }))
  );
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({ where: { userId: session!.user.id } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const program = await prisma.program.findUnique({ where: { id: params.id } });
  if (!program || program.teacherId !== teacher.id) {
    return NextResponse.json({ error: "Program not found or unauthorized" }, { status: 404 });
  }

  // Enforce max 10 questions
  const count = await prisma.question.count({ where: { programId: params.id } });
  if (count >= 10) {
    return NextResponse.json({ error: "Maximum 10 questions reached" }, { status: 400 });
  }

  const json = await req.json();
  const parse = questionSchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.errors }, { status: 400 });
  }

  const { title, description, starterCode, languages } = parse.data;

  const orderNumber = count + 1;

  const question = await prisma.question.create({
    data: {
      title,
      description,
      starterCode,
      languages,
      orderNumber,
      program: { connect: { id: params.id } },
    },
  });

  return NextResponse.json({
    id: question.id,
    title: question.title,
    description: question.description,
    starterCode: question.starterCode,
    languages: question.languages,
    orderNumber: question.orderNumber,
  });
}
