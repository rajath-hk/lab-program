import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// --- Types ---

export interface ExecutionResult {
  statusId: number;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: string | null;
  memory: number | null;
}

/**
 * Execution status codes (mirroring Judge0 semantics for compatibility):
 * 3  - Accepted (success)
 * 4  - Wrong Answer
 * 5  - Time Limit Exceeded
 * 6  - Compilation Error
 * 7  - Runtime Error
 */
export enum ExecutionStatus {
  ACCEPTED = 3,
  WRONG_ANSWER = 4,
  TIME_LIMIT_EXCEEDED = 5,
  COMPILATION_ERROR = 6,
  RUNTIME_ERROR = 7,
}

// --- Language Config ---

interface LangConfig {
  image: string;
  filename: string;
  compileCmd?: string[];
  runCmd: string[];
}

const LANGUAGE_CONFIG: Record<number, LangConfig> = {
  62: {
    image: 'eclipse-temurin:17-jdk-jammy',
    filename: 'Main.java',
    compileCmd: ['javac', 'Main.java'],
    runCmd: ['java', 'Main'],
  },
  71: {
    image: 'python:3-slim',
    filename: 'script.py',
    runCmd: ['python', 'script.py'],
  },
  54: {
    image: 'gcc:latest',
    filename: 'main.cpp',
    compileCmd: ['g++', '-o', 'main', 'main.cpp'],
    runCmd: ['./main'],
  },
  63: {
    image: 'node:18-alpine',
    filename: 'script.js',
    runCmd: ['node', 'script.js'],
  },
};

// --- Helpers ---

/**
 * Normalizes output by trimming trailing whitespace/newlines.
 */
function normalizeOutput(output: string | null): string {
  if (!output) return '';
  return output.replace(/\s+$/, '').replace(/\r\n/g, '\n');
}

/**
 * Compares stdout against expected output using strict normalization.
 */
export function compareOutput(
  stdout: string | null,
  expectedOutput: string
): boolean {
  return normalizeOutput(stdout) === normalizeOutput(expectedOutput);
}

/**
 * Runs a command with a timeout and returns stdout/stderr.
 * Throws on timeout or non-zero exit code.
 */
function runCommand(
  cmd: string[],
  options: { cwd?: string; stdin?: string; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd[0], cmd.slice(1), {
      cwd: options.cwd,
      timeout: options.timeout ?? 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    if (options.stdin) {
      proc.stdin?.write(options.stdin);
      proc.stdin?.end();
    } else {
      proc.stdin?.end();
    }

    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// Cache of images that have been checked/pulled
const imageCache = new Set<string>();

/**
 * Checks if a Docker image exists locally. If not, pulls it.
 * Uses a cache to avoid repeated `docker inspect` calls.
 */
function ensureImage(image: string): void {
  if (imageCache.has(image)) return;

  try {
    execSync(`docker image inspect ${image} > nul 2>&1`, { stdio: 'pipe' });
  } catch {
    console.log(`[DockerExecutor] Pulling image: ${image}...`);
    execSync(`docker pull ${image}`, { stdio: 'pipe', timeout: 120000 });
    console.log(`[DockerExecutor] Image ${image} ready`);
  }

  imageCache.add(image);
}

// --- Main Execution ---

/**
 * Executes code in a Docker container for the given language.
 *
 * Steps:
 * 1. Create a temp directory with the source file
 * 2. For compiled languages: compile in the container
 * 3. Run the code with the provided stdin
 * 4. Capture stdout, stderr, and timing
 * 5. Clean up the temp directory
 */
export async function executeCode(params: {
  sourceCode: string;
  languageId: number;
  stdin: string;
}): Promise<ExecutionResult> {
  const config = LANGUAGE_CONFIG[params.languageId];

  if (!config) {
    throw new Error(`Unsupported language ID: ${params.languageId}`);
  }

  // Ensure the Docker image is available
  ensureImage(config.image);

  // Create a temp directory for the source file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-exec-'));
  const sourcePath = path.join(tmpDir, config.filename);

  try {
    // Write the source code to a temp file
    fs.writeFileSync(sourcePath, params.sourceCode, 'utf-8');

    // Mount the temp directory into the container
    const mountArg = `${tmpDir}:/workspace:ro`;
    const baseArgs = [
      'docker',
      'run',
      '--rm',
      '-v',
      mountArg,
      '-w',
      '/workspace',
      '--network',
      'none',
      '--memory',
      '256m',
      '--cpus',
      '1',
      config.image,
    ];

    const startTime = Date.now();

    // --- Compilation step (for compiled languages) ---
    let compileOutput: string | null = null;
    if (config.compileCmd) {
      const compileArgs = [...baseArgs, ...config.compileCmd];
      try {
        const compileResult = await runCommand(compileArgs, {
          timeout: 15000,
        });
        if (compileResult.exitCode !== 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
          return {
            statusId: ExecutionStatus.COMPILATION_ERROR,
            stdout: null,
            stderr: compileResult.stderr,
            compileOutput: compileResult.stdout || compileResult.stderr,
            time: elapsed,
            memory: null,
          };
        }
        if (compileResult.stderr) {
          compileOutput = compileResult.stderr;
        }
      } catch (err: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
        return {
          statusId: ExecutionStatus.COMPILATION_ERROR,
          stdout: null,
          stderr: err.message || 'Compilation failed',
          compileOutput: err.message || 'Compilation failed',
          time: elapsed,
          memory: null,
        };
      }
    }

    // --- Execution step ---
    const runArgs = [...baseArgs, ...config.runCmd];
    try {
      const runResult = await runCommand(runArgs, {
        stdin: params.stdin,
        timeout: 10000,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);

      // Check for runtime errors
      if (runResult.exitCode !== 0) {
        return {
          statusId: ExecutionStatus.RUNTIME_ERROR,
          stdout: runResult.stdout || null,
          stderr: runResult.stderr || `Exit code: ${runResult.exitCode}`,
          compileOutput,
          time: elapsed,
          memory: null,
        };
      }

      return {
        statusId: ExecutionStatus.ACCEPTED,
        stdout: runResult.stdout || null,
        stderr: runResult.stderr || null,
        compileOutput,
        time: elapsed,
        memory: null,
      };
    } catch (err: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);

      // Check for timeout
      if (err.message?.includes('timeout') || err.killed) {
        return {
          statusId: ExecutionStatus.TIME_LIMIT_EXCEEDED,
          stdout: null,
          stderr: 'Time limit exceeded',
          compileOutput,
          time: elapsed,
          memory: null,
        };
      }

      return {
        statusId: ExecutionStatus.RUNTIME_ERROR,
        stdout: null,
        stderr: err.message || 'Runtime error',
        compileOutput,
        time: elapsed,
        memory: null,
      };
    }
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Runs code with custom input (no test case comparison).
 */
export async function runCodeOnly(params: {
  sourceCode: string;
  languageId: number;
  stdin: string;
}): Promise<ExecutionResult> {
  return executeCode(params);
}

/**
 * Runs code against an expected output for test case evaluation.
 */
export async function runTestCase(params: {
  sourceCode: string;
  languageId: number;
  stdin: string;
  expectedOutput: string;
}): Promise<ExecutionResult> {
  return executeCode(params);
}

/**
 * Pre-pulls all language Docker images so first execution is fast.
 */
export async function warmupImages(): Promise<void> {
  const images = new Set(Object.values(LANGUAGE_CONFIG).map((c) => c.image));
  for (const image of images) {
    try {
      ensureImage(image);
    } catch (err) {
      console.error(`[DockerExecutor] Failed to pull image ${image}:`, err);
    }
  }
}
