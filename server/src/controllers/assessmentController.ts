import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/teacher/submissions?problemId=X&status=Y
 *
 * Lists submissions filtered by problem and/or status.
 */
export const getSubmissionsForReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const problemId = String(req.query.problemId || '');
    const status = String(req.query.status || '');

    const where: any = {
      problem: { teacherId },
    };

    if (problemId) where.problemId = problemId;
    if (status) where.status = status;

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        problem: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.status(200).json({ submissions });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/submissions/:id
 *
 * Gets full details of a single submission including source code.
 */
export const getSubmissionDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const teacherId = req.user!.id;

    const submission = await prisma.submission.findFirst({
      where: { id, problem: { teacherId } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        problem: { select: { id: true, title: true, description: true, testCases: true } },
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.status(200).json({ submission });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/teacher/submissions/:id/status
 *
 * Manually updates the status of a submission (for manual grading).
 * Body: { "status": "ACCEPTED" | "WRONG_ANSWER" }
 */
export const updateSubmissionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body as { status: string };
    const teacherId = req.user!.id;

    const validStatuses = ['ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const submission = await prisma.submission.findFirst({
      where: { id, problem: { teacherId } },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: { status: status as any },
      include: {
        user: { select: { id: true, name: true, email: true } },
        problem: { select: { id: true, title: true } },
      },
    });

    res.status(200).json({ message: 'Submission status updated', submission: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/help-request
 *
 * Allows students to request help from the teacher.
 * Body: { "problemId": "...", "message": "I'm stuck on..." }
 */
export const createHelpRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { problemId, message } = req.body as { problemId: string; message: string };
    const userId = req.user!.id;

    if (!problemId || !message) {
      res.status(400).json({ error: 'problemId and message are required' });
      return;
    }

    // Store the help request - we'll reuse the TabViolation table or create a simple mechanism
    // For simplicity, log it to submissions with a special note
    const helpSubmission = await prisma.submission.create({
      data: {
        userId,
        problemId,
        sourceCode: `[HELP REQUEST] ${message}`,
        languageId: 0,
        status: 'PENDING',
        errorMessage: `Help requested: ${message}`,
      },
    });

    res.status(201).json({
      message: 'Help request sent. Teacher will respond shortly.',
      helpRequest: { id: helpSubmission.id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/help-requests
 *
 * Gets all pending help requests for the teacher.
 */
export const getHelpRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;

    const helpRequests = await prisma.submission.findMany({
      where: {
        problem: { teacherId },
        languageId: 0,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        problem: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ helpRequests });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/teacher/help-requests/:id/resolve
 *
 * Marks a help request as resolved.
 */
export const resolveHelpRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const teacherId = req.user!.id;

    const request = await prisma.submission.findFirst({
      where: { id, problem: { teacherId }, languageId: 0 },
    });

    if (!request) {
      res.status(404).json({ error: 'Help request not found' });
      return;
    }

    await prisma.submission.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    res.status(200).json({ message: 'Help request resolved' });
  } catch (error) {
    next(error);
  }
};
