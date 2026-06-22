import { prisma } from "@/lib/prisma";

/**
 * Generate a roll number for a student.
 * Format: 1AM{YY}{DEPT_CODE}{NNN}
 *   - YY: last two digits of admission year
 *   - DEPT_CODE: uppercase department code (e.g., MC)
 *   - NNN: sequential number padded to 3 digits
 */
export async function generateRollNumber(
  deptCode: string,
  admissionYear: number
): Promise<string> {
  const yy = admissionYear.toString().slice(-2);
  const prefix = `1AM${yy}${deptCode}`;
  const existing = await prisma.student.findMany({
    where: {
      rollNumber: {
        startsWith: prefix,
      },
    },
    select: { rollNumber: true },
  });
  const nextNumber = existing.length + 1;
  const padded = String(nextNumber).padStart(3, "0");
  return `${prefix}${padded}`;
}
