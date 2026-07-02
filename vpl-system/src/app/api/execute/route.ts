import { NextResponse } from "next/server"
import { execSync, exec } from "child_process"
import { writeFileSync, rmSync, mkdtempSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

interface LangConfig {
  language: string
  fileExtension: string
  compileCmd?: (filePath: string) => string
  runCmd: (filePath: string) => string
}

const LANGUAGE_MAP: Record<string, LangConfig> = {
  python: {
    language: "Python 3",
    fileExtension: "main.py",
    runCmd: (filePath) => `python "${filePath}"`,
  },
  javascript: {
    language: "Node.js",
    fileExtension: "main.js",
    runCmd: (filePath) => `node "${filePath}"`,
  },
  typescript: {
    language: "TypeScript",
    fileExtension: "main.ts",
    runCmd: (filePath) => `npx tsx "${filePath}"`,
  },
  java: {
    language: "Java",
    fileExtension: "Main.java",
    compileCmd: (_filePath) => `javac Main.java`,
    runCmd: () => `java Main`,
  },
  cpp: {
    language: "C++",
    fileExtension: "main.cpp",
    compileCmd: (filePath) => `g++ -o "${filePath}.out" "${filePath}"`,
    runCmd: (filePath) => `"${filePath}.out"`,
  },
  c: {
    language: "C",
    fileExtension: "main.c",
    compileCmd: (filePath) => `gcc -o "${filePath}.out" "${filePath}"`,
    runCmd: (filePath) => `"${filePath}.out"`,
  },
  rust: {
    language: "Rust",
    fileExtension: "main.rs",
    compileCmd: (filePath) => `rustc -o "${filePath}.out" "${filePath}"`,
    runCmd: (filePath) => `"${filePath}.out"`,
  },
  go: {
    language: "Go",
    fileExtension: "main.go",
    runCmd: (filePath) => `go run "${filePath}"`,
  },
  plaintext: {
    language: "Plain Text",
    fileExtension: "main.txt",
    runCmd: () => `echo "(no output)"`,
  },
}

function executeWithTimeout(
  command: string,
  stdin: string,
  timeoutMs: number,
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = exec(
      command,
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        cwd,
      },
      (error, stdout, stderr) => {
        if (error && (error as any).killed) {
          resolve({
            stdout: stdout || "",
            stderr: (stderr || "") + "\nExecution timed out.",
            exitCode: null,
          })
        } else {
          resolve({
            stdout: stdout || "",
            stderr: stderr || "",
            exitCode: error?.code ?? 0,
          })
        }
      }
    )

    if (stdin && child.stdin) {
      child.stdin.write(stdin)
      child.stdin.end()
    }
  })
}

export async function POST(request: Request) {
  let tmpDir: string | null = null

  try {
    const body = await request.json()
    const { code, language: langId, stdin } = body

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const langConfig = LANGUAGE_MAP[langId]
    if (!langConfig) {
      return NextResponse.json(
        { error: `Unsupported language: ${langId}` },
        { status: 400 }
      )
    }

    // Create a temp directory for this execution
    tmpDir = mkdtempSync(join(tmpdir(), "vpl-"))
    const filePath = join(tmpDir, langConfig.fileExtension)

    // Write the code to a temp file
    writeFileSync(filePath, code, "utf-8")

    let compileOutput = ""

    // Step 1: Compile if needed (Java, C++, C, Rust)
    if (langConfig.compileCmd) {
      try {
        execSync(langConfig.compileCmd(filePath), {
          timeout: 10000,
          cwd: tmpDir,
          windowsHide: true,
          stdio: "pipe",
        })
      } catch (compileError: any) {
        compileOutput = (compileError.stdout || "") + (compileError.stderr || "")
        return NextResponse.json({
          output: "",
          stdout: "",
          stderr: "",
          exitCode: compileError.code ?? 1,
          signal: null,
          compileOutput: compileOutput.trim() || "Compilation failed",
        })
      }
    }

    // Step 2: Run the code
    const result = await executeWithTimeout(
      langConfig.runCmd(filePath),
      stdin || "",
      5000,
      tmpDir
    )

    return NextResponse.json({
      output: result.stdout + (result.stderr ? "\n" + result.stderr : ""),
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      signal: null,
      compileOutput,
    })
  } catch (error) {
    console.error("Execution error:", error)
    return NextResponse.json(
      { error: "Failed to execute code. Please try again." },
      { status: 500 }
    )
  } finally {
    // Clean up temp files
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true })
      } catch {}
    }
  }
}
