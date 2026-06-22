import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error, session } = await requireRole(["TEACHER"]);
  if (error) return error;

  const students = await prisma.student.findMany({
    include: { user: true, department: true },
    orderBy: { rollNumber: "asc" },
  });

  const result = students.map((s) => ({
    id: s.id,
    rollNumber: s.rollNumber,
    name: s.user.name,
    email: s.user.email,
    department: s.department.name,
    semester: s.semester,
    createdAt: s.createdAt,
  }));

  return NextResponse.json(result);
}
