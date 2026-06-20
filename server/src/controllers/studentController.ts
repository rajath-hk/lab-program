import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TabViolationRequestBody {
  problemId: string;
  details: string;
}

/**
 * GET /api/student/problems
 *
 * Lists all available problems for students.
 * Security: Does NOT return hintRules or hidden test cases.
 * Returns basic info: id, title, and public test case count.
 */
export const getStudentProblems = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        _count: {
          select: {
            testCases: {
              where: { isHidden: false },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedProblems = problems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      testCaseCount: problem._count.testCases,
      createdAt: problem.createdAt,
    }));

    res.status(200).json({ problems: formattedProblems });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/problems/:id
 *
 * Fetches a problem by ID for student viewing.
 * Security: Does NOT return hintRules.
 * Only returns testCases where isHidden: false.
 * Exposes: title, description, boilerplateCode.
 */
export const getProblemById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      res.status(400).json({ error: 'Validation Error: Problem ID is required' });
      return;
    }

    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          where: { isHidden: false },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
          },
        },
        _count: {
          select: {
            testCases: true,
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({ error: 'Not Found: No problem with the provided ID exists' });
      return;
    }

    res.status(200).json({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      boilerplateCode: problem.boilerplateCode,
      testCases: problem.testCases,
      totalTestCases: problem._count.testCases,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/violation
 *
 * Logs a tab-switching violation for the authenticated student.
 * Body: { "problemId": "uuid", "details": "User switched tabs" }
 */
export const logTabViolation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { problemId, details } = req.body as TabViolationRequestBody;
    const userId = req.user!.id;

    // Validate problemId
    if (!problemId || typeof problemId !== 'string' || problemId.trim() === '') {
      res.status(400).json({ error: 'Validation Error: problemId is required and must be a non-empty string' });
      return;
    }

    // Validate that the problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    });

    if (!problem) {
      res.status(404).json({ error: 'Not Found: No problem with the provided ID exists' });
      return;
    }

    // Validate details
    if (!details || typeof details !== 'string' || details.trim() === '') {
      res.status(400).json({ error: 'Validation Error: details is required and must be a non-empty string' });
      return;
    }

    const violation = await prisma.tabViolation.create({
      data: {
        userId,
        details: details.trim(),
      },
    });

    res.status(201).json({
      message: 'Violation logged successfully',
      violation: {
        id: violation.id,
        timestamp: violation.timestamp,
        details: violation.details,
      },
    });
  } catch (error) {
    next(error);
  }
};
