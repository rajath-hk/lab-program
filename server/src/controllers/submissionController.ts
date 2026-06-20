import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { runTestCase, runCodeOnly, compareOutput, Judge0Status } from '../services/judgeService';
import { evaluateHints } from '../services/hintEngine';

const prisma = new PrismaClient();

// --- Types ---

interface SubmitCodeRequestBody {
  sourceCode: string;
  languageId: number;
  problemId: string;
}

interface RunCodeRequestBody {
  sourceCode: string;
  languageId: number;
  stdin: string;
}

interface SubmitCodeResponse {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'ERROR';
  passedCases: number;
  totalCases: number;
  stdout: string | null;
  stderr: string | null;
  hint: string | null;
}

/**
 * POST /api/student/run
 *
 * Runs code with custom input (no test case evaluation).
 * Useful for students to test their code interactively.
 */
export const runCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sourceCode, languageId, stdin } = req.body as RunCodeRequestBody;

    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim() === '') {
      res.status(400).json({ error: 'sourceCode is required' });
      return;
    }
    if (!languageId || typeof languageId !== 'number') {
      res.status(400).json({ error: 'languageId is required' });
      return;
    }

    const result = await runCodeOnly({
      sourceCode,
      languageId,
      stdin: stdin || '',
    });

    res.status(200).json({
      stdout: result.stdout,
      stderr: result.stderr || result.compileOutput,
      statusId: result.statusId,
      time: result.time,
      memory: result.memory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/submissions?problemId=X
 *
 * Returns submission history for the authenticated student and problem.
 */
export const getSubmissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const problemId = req.query.problemId as string;
    const userId = req.user!.id;

    if (!problemId) {
      res.status(400).json({ error: 'problemId query parameter is required' });
      return;
    }

    const submissions = await prisma.submission.findMany({
      where: { userId, problemId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        languageId: true,
        executionTime: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    res.status(200).json({ submissions });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/submit
 *
 * Submits code for evaluation.
 * - Fetches the Problem, its TestCases (all), and its HintRules
 * - Iterates through test cases sequentially via Judge0
 * - Applies hint engine on runtime/compilation errors
 * - Logs the submission result to the database
 * - Returns the evaluation result (without hidden expected outputs)
 */
export const submitCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sourceCode, languageId, problemId } = req.body as SubmitCodeRequestBody;
    const userId = req.user!.id;

    // --- Input Validation ---

    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim() === '') {
      res.status(400).json({ error: 'Validation Error: sourceCode is required and must be a non-empty string' });
      return;
    }

    if (!languageId || typeof languageId !== 'number' || !Number.isInteger(languageId)) {
      res.status(400).json({ error: 'Validation Error: languageId is required and must be a valid integer' });
      return;
    }

    if (!problemId || typeof problemId !== 'string' || problemId.trim() === '') {
      res.status(400).json({ error: 'Validation Error: problemId is required and must be a non-empty string' });
      return;
    }

    // --- Fetch Problem with TestCases and HintRules ---

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: true,
        hintRules: true,
      },
    });

    if (!problem) {
      res.status(404).json({ error: 'Not Found: No problem with the provided ID exists' });
      return;
    }

    const testCases = problem.testCases;
    const hintRules = problem.hintRules;

    if (testCases.length === 0) {
      res.status(400).json({ error: 'Validation Error: This problem has no test cases configured' });
      return;
    }

    // --- Execution Loop ---

    let finalStatus: SubmitCodeResponse['status'] = 'ACCEPTED';
    let passedCases = 0;
    let lastStdout: string | null = null;
    let lastStderr: string | null = null;
    let hintMessage: string | null = null;
    let totalExecutionTime: number | null = null;
    let errorMessage: string | null = null;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

      try {
        const result = await runTestCase({
          sourceCode,
          languageId,
          stdin: tc.input,
          expectedOutput: tc.expectedOutput,
        });

        lastStdout = result.stdout;
        lastStderr = result.stderr || result.compileOutput;

        if (result.time) {
          const execTime = parseFloat(result.time);
          if (totalExecutionTime === null || execTime > totalExecutionTime) {
            totalExecutionTime = execTime;
          }
        }

        let passed = false;

        if (
          result.statusId === Judge0Status.COMPILATION_ERROR ||
          result.statusId === Judge0Status.RUNTIME_ERROR_SIGSEGV ||
          result.statusId === Judge0Status.RUNTIME_ERROR_SIGXFSZ ||
          result.statusId === Judge0Status.RUNTIME_ERROR_SIGKILL ||
          result.statusId === Judge0Status.RUNTIME_ERROR_SIGXCPU
        ) {
          const errorText = result.compileOutput || result.stderr || 'Unknown error';

          if (result.statusId === Judge0Status.COMPILATION_ERROR) {
            finalStatus = 'COMPILATION_ERROR';
          } else {
            finalStatus = 'RUNTIME_ERROR';
          }

          errorMessage = errorText;
          lastStderr = errorText;

          const hintResult = evaluateHints(errorText, hintRules);
          if (hintResult.matched) {
            hintMessage = hintResult.hintMessage;
          }

          break;
        }

        if (result.statusId === Judge0Status.ACCEPTED) {
          passed = compareOutput(result.stdout, tc.expectedOutput);
        }

        if (passed) {
          passedCases++;
        } else {
          finalStatus = 'WRONG_ANSWER';
          errorMessage = `Test case ${i + 1} failed: expected output did not match`;

          if (result.stderr) {
            const hintResult = evaluateHints(result.stderr, hintRules);
            if (hintResult.matched) {
              hintMessage = hintResult.hintMessage;
            }
          }
        }

        if (!passed) {
          break;
        }
      } catch (execError) {
        finalStatus = 'ERROR';
        errorMessage = execError instanceof Error ? execError.message : 'Unknown execution error';
        break;
      }
    }

    if (passedCases === testCases.length && finalStatus === 'ACCEPTED') {
      finalStatus = 'ACCEPTED';
    }

    // --- Log Submission ---

    const submissionStatus = mapStatusToSubmissionStatus(finalStatus);

    await prisma.submission.create({
      data: {
        userId,
        problemId,
        sourceCode: sourceCode.trim(),
        languageId,
        status: submissionStatus,
        errorMessage,
        executionTime: totalExecutionTime,
      },
    });

    const response: SubmitCodeResponse = {
      status: finalStatus,
      passedCases,
      totalCases: testCases.length,
      stdout: lastStdout,
      stderr: lastStderr,
      hint: hintMessage,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

function mapStatusToSubmissionStatus(
  status: SubmitCodeResponse['status']
): 'ACCEPTED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR' | 'PENDING' {
  switch (status) {
    case 'ACCEPTED': return 'ACCEPTED';
    case 'WRONG_ANSWER': return 'WRONG_ANSWER';
    case 'COMPILATION_ERROR': return 'COMPILATION_ERROR';
    case 'RUNTIME_ERROR': return 'RUNTIME_ERROR';
    case 'ERROR': return 'RUNTIME_ERROR';
    default: return 'PENDING';
  }
}
