import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateProblemBody {
  title: string;
  description: string;
  boilerplateCode: string;
  testCases: { input: string; expectedOutput: string; isHidden?: boolean }[];
  hintRules: { regexPattern: string; hintMessage: string }[];
}

interface UpdateProblemBody extends Partial<CreateProblemBody> {}

/**
 * POST /api/teacher/problems/create
 *
 * Creates a new problem with test cases and hint rules.
 */
export const createProblem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, boilerplateCode, testCases, hintRules } =
      req.body as CreateProblemBody;
    const teacherId = req.user!.id;

    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required' });
      return;
    }

    const problem = await prisma.problem.create({
      data: {
        title: title.trim(),
        description,
        boilerplateCode: boilerplateCode || '',
        teacherId,
        testCases: {
          create: (testCases || []).map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? false,
          })),
        },
        hintRules: {
          create: (hintRules || []).map((hr) => ({
            regexPattern: hr.regexPattern,
            hintMessage: hr.hintMessage,
          })),
        },
      },
      include: {
        testCases: true,
        hintRules: true,
      },
    });

    res.status(201).json({ message: 'Problem created successfully', problem });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/teacher/problems/:id
 *
 * Updates an existing problem, replacing its test cases and hints.
 */
export const updateProblem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { title, description, boilerplateCode, testCases, hintRules } =
      req.body as UpdateProblemBody;
    const teacherId = req.user!.id;

    const existing = await prisma.problem.findFirst({
      where: { id, teacherId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    // Update problem and replace test cases/hints in a transaction
    const problem = await prisma.$transaction(async (tx) => {
      // Delete existing test cases and hints
      await tx.testCase.deleteMany({ where: { problemId: id } });
      await tx.hintRule.deleteMany({ where: { problemId: id } });

      // Update the problem
      return tx.problem.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description }),
          ...(boilerplateCode !== undefined && { boilerplateCode }),
          testCases: {
            create: (testCases || []).map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden ?? false,
            })),
          },
          hintRules: {
            create: (hintRules || []).map((hr) => ({
              regexPattern: hr.regexPattern,
              hintMessage: hr.hintMessage,
            })),
          },
        },
        include: {
          testCases: true,
          hintRules: true,
        },
      });
    });

    res.status(200).json({ message: 'Problem updated successfully', problem });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/problems/:id/edit
 *
 * Fetches a problem with all its test cases and hints for editing.
 */
export const getProblemForEdit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const teacherId = req.user!.id;

    const problem = await prisma.problem.findFirst({
      where: { id, teacherId },
      include: {
        testCases: { orderBy: { id: 'asc' } },
        hintRules: { orderBy: { id: 'asc' } },
      },
    });

    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    res.status(200).json({ problem });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/teacher/problems/:id
 *
 * Deletes a problem.
 */
export const deleteProblem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const teacherId = req.user!.id;

    const existing = await prisma.problem.findFirst({
      where: { id, teacherId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    await prisma.problem.delete({ where: { id } });

    res.status(200).json({ message: 'Problem deleted successfully' });
  } catch (error) {
    next(error);
  }
};
