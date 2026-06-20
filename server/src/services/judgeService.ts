import { executeCode, runCodeOnly as dockerRunOnly, runTestCase as dockerRunTestCase, compareOutput as dockerCompare, ExecutionStatus } from './dockerExecutor';

// --- Re-export types for backward compatibility ---

export interface Judge0Submission {
  sourceCode: string;
  languageId: number;
  stdin: string;
  expectedOutput: string;
}

export interface Judge0Result {
  statusId: number;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;
}

/**
 * Execution status codes:
 * 3  - Accepted
 * 4  - Wrong Answer
 * 5  - Time Limit Exceeded
 * 6  - Compilation Error
 * 7  - Runtime Error
 */
export const Judge0Status = ExecutionStatus;

/**
 * Compares stdout against expected output using strict normalization.
 */
export function compareOutput(
  stdout: string | null,
  expectedOutput: string
): boolean {
  return dockerCompare(stdout, expectedOutput);
}

/**
 * Runs code with custom input (no test case comparison).
 * Used for the "Run Code" feature where students test interactively.
 */
export async function runCodeOnly(submission: {
  sourceCode: string;
  languageId: number;
  stdin: string;
}): Promise<Judge0Result> {
  return dockerRunOnly(submission);
}

/**
 * Runs a single test case against the expected output.
 * Used for the "Submit" feature where code is evaluated against test cases.
 */
export async function runTestCase(
  submission: Judge0Submission
): Promise<Judge0Result> {
  return dockerRunTestCase(submission);
}

/**
 * Warm up: pre-pulls all language Docker images for faster first execution.
 */
export async function warmupExecutor(): Promise<void> {
  const { warmupImages } = await import('./dockerExecutor');
  await warmupImages();
}
