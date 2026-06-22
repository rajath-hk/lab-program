import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { z } from "zod";

const programSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  unlockDate: z.string().refine((val) => !isNaN(Date.parse(val)),
  deadline: z
    .string()
    .optional()
    .refine((val) => (val ? !isNaN(Date.parse(val)) : true), { message: "Invalid date" })
    .refine((val, ctx) => {
      const unlock = new Date(ctx.parent.unlockDate);
      if (val) {
        const dead = new Date(val);
        if (dead <= unlock) {
          return false;
        }
      }
      return true;
    }, { message: "Deadline must be after unlock date" }),
});

export async function GET() {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session!.user.id },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher record not found" }, { status: 404 });

  const programs = await prisma.program.findMany({
    where: { teacherId: teacher.id },
    include: { questions: true },
    orderBy: { createdAt: "desc" },
  });

  const result = programs.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    unlockDate: p.unlockDate,
    deadline: p.deadline,
    questionsCount: p.questions.length,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session!.user.id },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher record not found" }, { status: 404 });

  const json = await req.json();
  const parse = programSchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.errors }, { status: 400 });
  }
  const { title, description, unlockDate, deadline } = parse.data;

  const program = await prisma.program.create({
    data: {
      title,
      description,
      unlockDate: new Date(unlockDate),
      deadline: deadline ? new Date(deadline) : null,
      teacher: { connect: { id: teacher.id } },
    },
  });
  return NextResponse.json({
    id: program.id,
    title: program.title,
    description: program.description,
    unlockDate: program.unlockDate,
    deadline: program.deadline,
    questionsCount: 0,
  });
}
