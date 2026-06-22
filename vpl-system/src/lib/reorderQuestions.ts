import { prisma } from "@/lib/prisma";

/**
 * After a question is deleted, reassign order numbers sequentially.
 */
export async function reorderQuestions(programId: string): Promise<void> {
  const questions = await prisma.question.findMany({
    where: { programId },
    orderBy: { orderNumber: "asc" },
  });

  await prisma.$transaction(
    questions.map((q, index) =>
      prisma.question.update({
        where: { id: q.id },
        data: { orderNumber: index + 1 },
      })
    )
  );
}
