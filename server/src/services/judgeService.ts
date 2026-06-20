import axios from 'axios';

// --- Types ---

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
 * Judge0 status codes reference:
 * 1  - In Queue
 * 2  - Processing
 * 3  - Accepted
 * 4  - Wrong Answer
 * 5  - Time Limit Exceeded
 * 6  - Compilation Error
 * 7  - Runtime Error (SIGSEGV, SIGXFSZ, etc.)
 * 8  - Internal Error
 * 9  - Runtime Error (SIGKILL)
 * 10 - Internal Error
 * 11 - Runtime Error (SIGXCPU)
 * 12 - Internal Error
 * 13 - Internal Error
 * 14 - Internal Error
 */
export enum Judge0Status {
  IN_QUEUE = 1,
  PROCESSING = 2,
  ACCEPTED = 3,
  WRONG_ANSWER = 4,
  TIME_LIMIT_EXCEEDED = 5,
  COMPILATION_ERROR = 6,
  RUNTIME_ERROR_SIGSEGV = 7,
  RUNTIME_ERROR_SIGXFSZ = 8,
  RUNTIME_ERROR_SIGKILL = 9,
  RUNTIME_ERROR_SIGXCPU = 11,
}

// --- Configuration ---

function getJudge0Config() {
  const url = process.env.JUDGE0_API_URL;
  const apiKey = process.env.JUDGE0_API_KEY;
  const isRapidAPI = process.env.JUDGE0_IS_RAPIDAPI !== 'false';

  if (!url) {
    throw new Error(
      'JUDGE0_API_URL environment variable is not set. Configure it in .env'
    );
  }

  return { url, apiKey, isRapidAPI };
}

// --- Helpers ---

/**
 * Encodes a string to Base64.
 */
function encodeBase64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * Decodes a Base64 string. Returns null if decoding fails.
 */
function decodeBase64(encoded: string | null | undefined): string | null {
  if (!encoded) return null;
  try {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Normalizes a string by trimming trailing whitespace/newlines.
 * Used for output comparison.
 */
function normalizeOutput(output: string | null): string {
  if (!output) return '';
  return output.replace(/\s+$/, '').replace(/\r\n/g, '\n');
}

/**
 * Checks if stdout matches the expected output.
 * Performs strict string comparison after normalization.
 */
export function compareOutput(
  stdout: string | null,
  expectedOutput: string
): boolean {
  return normalizeOutput(stdout) === normalizeOutput(expectedOutput);
}

// --- Main Service ---

/**
 * Sends a submission to the Judge0 API and returns the normalized result.
 */
async function submitToJudge0(payload: Record<string, unknown>): Promise<Judge0Result> {
  const { url, apiKey, isRapidAPI } = getJudge0Config();
  const baseUrl = url.replace(/\/$/, '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isRapidAPI && apiKey) {
    headers['X-RapidAPI-Key'] = apiKey;
    headers['X-RapidAPI-Host'] = new URL(baseUrl).hostname;
  } else if (apiKey) {
    // Self-hosted Judge0 with auth token
    headers['X-Judge0-Token'] = apiKey;
  }

  try {
    const response = await axios.post(
      `${baseUrl}/submissions`,
      payload,
      { headers, timeout: 30000 }
    );

    const data = response.data;

    return {
      statusId: data.status?.id ?? 0,
      stdout: decodeBase64(data.stdout),
      stderr: decodeBase64(data.stderr),
      compileOutput: decodeBase64(data.compile_output),
      time: data.time ?? null,
      memory: data.memory ?? null,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status ?? 0;
      const errorMessage =
        error.response?.data?.error ??
        error.message ??
        'Unknown Judge0 API error';
      throw new Error(
        `Judge0 API request failed (HTTP ${statusCode}): ${errorMessage}`
      );
    }
    throw error;
  }
}

/**
 * Runs a single test case through Judge0 and returns the normalized result.
 *
 * Sends sourceCode, stdin, and expectedOutput as Base64-encoded strings
 * to prevent formatting and newline corruption. Uses wait=true for synchronous
 * execution.
 */
export async function runTestCase(
  submission: Judge0Submission
): Promise<Judge0Result> {
  const payload = {
    source_code: encodeBase64(submission.sourceCode),
    language_id: submission.languageId,
    stdin: encodeBase64(submission.stdin),
    expected_output: encodeBase64(submission.expectedOutput),
    base64_encoded: true,
    wait: true,
    cpu_time_limit: 5,
    wall_time_limit: 10,
    memory_limit: 256000,
  };

  return submitToJudge0(payload);
}

/**
 * Runs code through Judge0 WITHOUT expected_output comparison.
 * Used for the "Run Code" feature where students test with custom input.
 */
export async function runCodeOnly(submission: {
  sourceCode: string;
  languageId: number;
  stdin: string;
}): Promise<Judge0Result> {
  const payload = {
    source_code: encodeBase64(submission.sourceCode),
    language_id: submission.languageId,
    stdin: encodeBase64(submission.stdin),
    base64_encoded: true,
    wait: true,
    cpu_time_limit: 5,
    wall_time_limit: 10,
    memory_limit: 256000,
  };

  return submitToJudge0(payload);
}
