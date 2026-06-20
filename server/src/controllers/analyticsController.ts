import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/teacher/analytics/overview
 *
 * Returns overview stats for the teacher's dashboard.
 */
export const getOverviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;

    const totalProblems = await prisma.problem.count({ where: { teacherId } });
    const totalSubmissions = await prisma.submission.count({
      where: { problem: { teacherId } },
    });
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalViolations = await prisma.tabViolation.count();

    const acceptedSubmissions = await prisma.submission.count({
      where: { problem: { teacherId }, status: 'ACCEPTED' },
    });

    res.status(200).json({
      totalProblems,
      totalSubmissions,
      totalStudents,
      totalViolations,
      acceptanceRate: totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/analytics/submission-trends?days=30
 *
 * Returns daily submission counts for the last N days.
 */
export const getSubmissionTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const days = parseInt(req.query.days as string) || 30;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const submissions = await prisma.submission.findMany({
      where: {
        problem: { teacherId },
        createdAt: { gte: since },
      },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const trends: Record<string, { total: number; accepted: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      trends[key] = { total: 0, accepted: 0 };
    }

    for (const s of submissions) {
      const key = s.createdAt.toISOString().split('T')[0];
      if (trends[key]) {
        trends[key].total++;
        if (s.status === 'ACCEPTED') trends[key].accepted++;
      }
    }

    const data = Object.entries(trends).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    res.status(200).json({ trends: data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/analytics/problem-performance
 *
 * Returns performance stats for each problem.
 */
export const getProblemPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;

    const problems = await prisma.problem.findMany({
      where: { teacherId },
      include: {
        _count: { select: { submissions: true } },
        submissions: {
          where: { status: 'ACCEPTED' },
          select: { id: true },
        },
      },
    });

    const data = problems.map((p) => ({
      id: p.id,
      title: p.title,
      totalSubmissions: p._count.submissions,
      acceptedSubmissions: p.submissions.length,
      passRate: p._count.submissions > 0
        ? Math.round((p.submissions.length / p._count.submissions) * 100)
        : 0,
    }));

    res.status(200).json({ problems: data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/analytics/student-performance
 *
 * Returns per-student performance stats.
 */
export const getStudentPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        submissions: {
          where: { problem: { teacherId } },
          select: { id: true, status: true, createdAt: true },
        },
        tabViolations: {
          select: { id: true },
        },
      },
    });

    const data = students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      totalSubmissions: s.submissions.length,
      acceptedSubmissions: s.submissions.filter((sub) => sub.status === 'ACCEPTED').length,
      violations: s.tabViolations.length,
      lastSubmission: s.submissions.length > 0
        ? s.submissions.reduce((latest, sub) =>
            sub.createdAt > latest.createdAt ? sub : latest
          ).createdAt
        : null,
    }));

    res.status(200).json({ students: data });
  } catch (error) {
    next(error);
  }
};
