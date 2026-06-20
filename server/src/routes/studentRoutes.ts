import { Router } from 'express';
import { verifyToken, requireStudent } from '../middleware/auth';
import {
  getStudentProblems,
  getProblemById,
  logTabViolation,
} from '../controllers/studentController';
import { submitCode, runCode, getSubmissions } from '../controllers/submissionController';

const router = Router();

/**
 * GET /api/student/problems
 *
 * Lists all available problems for students.
 * Protected: Requires STUDENT role.
 * Returns: id, title, public test case count.
 */
router.get('/problems', verifyToken, requireStudent, getStudentProblems);

/**
 * GET /api/student/problems/:id
 *
 * Fetches a single problem by ID.
 * Protected: Requires STUDENT role.
 * Returns public test cases only (isHidden: false), no hint rules.
 */
router.get('/problems/:id', verifyToken, requireStudent, getProblemById);

/**
 * POST /api/student/violation
 *
 * Logs a tab-switching violation.
 * Protected: Requires STUDENT role.
 * Body: { "problemId": "...", "details": "..." }
 */
router.post('/violation', verifyToken, requireStudent, logTabViolation);

/**
 * POST /api/student/submit
 *
 * Submits code for evaluation against the problem's test cases.
 * Protected: Requires STUDENT role.
 * Body: { "sourceCode": "...", "languageId": 62, "problemId": "..." }
 * Response: { status, passedCases, totalCases, stdout, stderr, hint }
 */
router.post('/submit', verifyToken, requireStudent, submitCode);

/**
 * POST /api/student/run
 *
 * Runs code with custom input (no test case evaluation).
 * Protected: Requires STUDENT role.
 * Body: { "sourceCode": "...", "languageId": 62, "stdin": "..." }
 */
router.post('/run', verifyToken, requireStudent, runCode);

/**
 * GET /api/student/submissions?problemId=...
 *
 * Gets submission history for a problem.
 * Protected: Requires STUDENT role.
 */
router.get('/submissions', verifyToken, requireStudent, getSubmissions);

export default router;
