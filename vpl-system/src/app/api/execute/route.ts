import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { execSync, exec, type ChildProcess } from "child_process"
import { writeFileSync, rmSync, mkdtempSync, readFileSync, readdirSync } from "fs"
import { join, extname } from "path"
import { tmpdir } from "os"
import Database from "better-sqlite3"

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

const LANGUAGE_TIMEOUTS: Record<string, { compile: number; run: number }> = {
  python:     { compile: 0,     run: 5000 },
  javascript: { compile: 0,     run: 5000 },
  typescript: { compile: 5000,  run: 5000 },
  java:       { compile: 10000, run: 5000 },
  cpp:        { compile: 10000, run: 5000 },
  c:          { compile: 10000, run: 5000 },
  rust:       { compile: 15000, run: 5000 },
  go:         { compile: 10000, run: 5000 },
  sql:        { compile: 0,     run: 10000 },
}

// In-memory concurrency tracker: userId -> true
const activeExecutions = new Map<string, true>()

interface SqlResult {
  type: "table" | "message" | "error"
  columns?: string[]
  rows?: Record<string, unknown>[]
  affectedRows?: number
  message: string
}

/**
 * Translate Oracle-specific SQL syntax to SQLite equivalents.
 */
function translateOracleSql(stmt: string): string {
  let sql = stmt

  // Replace single-line comments -- with SQLite style
  // (SQLite already supports -- comments)

  // SYSDATE → datetime('now')
  sql = sql.replace(/\bSYSDATE\b/gi, "datetime('now','localtime')")

  // NVL(a, b) → IFNULL(a, b)
  sql = sql.replace(/\bNVL\s*\(/gi, "IFNULL(")

  // DECODE(a, b, c, d) → CASE WHEN a = b THEN c ELSE d END
  // Handled in executeSql() below with a more complete translation

  // TO_DATE(str, fmt) → DATE(str) (simplified)
  sql = sql.replace(/\bTO_DATE\s*\(([^,]+),\s*[^)]+\)/gi, "DATE($1)")

  // TO_CHAR(date, fmt) → STRFTIME(fmt, date) (simplified)
  sql = sql.replace(/\bTO_CHAR\s*\(([^,]+),\s*[^)]+\)/gi, "STRFTIME('%Y-%m-%d', $1)")

  // TRUNC(date) → DATE(date)
  sql = sql.replace(/\bTRUNC\s*\(/gi, "DATE(")

  // ROUND on dates → DATE
  sql = sql.replace(/\bROUND\s*\(/gi, "ROUND(")

  // LENGTH → LENGTH (same in SQLite)

  // INSTR → INSTR (same in SQLite)

  // SUBSTR → SUBSTR (same in SQLite)

  // REPLACE → REPLACE (same in SQLite)

  // CONCAT(a, b) → a || b
  sql = sql.replace(/\bCONCAT\s*\(([^,]+),\s*([^)]+)\)/gi, "($1 || $2)")

  // ADD_MONTHS(date, n) → DATE(date, '+n months')
  sql = sql.replace(/\bADD_MONTHS\s*\(([^,]+),\s*([^)]+)\)/gi, "DATE($1, '+' || $2 || ' months')")

  // MONTHS_BETWEEN(a, b) → (julianday(a) - julianday(b)) / 30 (approx)
  sql = sql.replace(/\bMONTHS_BETWEEN\s*\(([^,]+),\s*([^)]+)\)/gi, "((julianday($1) - julianday($2)) / 30.0)")

  // NEXT_DAY(date, day) → DATE(date, '+7 days') (approximation)
  sql = sql.replace(/\bNEXT_DAY\s*\(/gi, "DATE(")

  // GREATEST(a, b) → MAX(a, b)
  sql = sql.replace(/\bGREATEST\s*\(/gi, "MAX(")

  // LEAST(a, b) → MIN(a, b)
  sql = sql.replace(/\bLEAST\s*\(/gi, "MIN(")

  // TO_NUMBER(str) → CAST(str AS REAL)
  sql = sql.replace(/\bTO_NUMBER\s*\(([^)]+)\)/gi, "CAST($1 AS REAL)")

  // UID → (0) placeholder
  sql = sql.replace(/\bUID\b/gi, "(0)")

  // USER → 'user'
  sql = sql.replace(/\bUSER\b/gi, "'user'")

  // ROWNUM = 1 → LIMIT 1 (this is tricky, handle simple cases)
  // Simple: WHERE ROWNUM = 1 or WHERE ROWNUM < n
  // We'll handle this in the execution layer instead

  // Remove trailing semicolons that might be in the middle
  return sql
}

function createOracleLikeDb(): Database.Database {
  const db = new Database(":memory:")

  // Enable WAL mode for better concurrent access
  db.pragma("journal_mode = WAL")

  // Create DUAL table (Oracle-standard)
  db.exec(`CREATE TABLE IF NOT EXISTS DUAL (DUMMY TEXT)`)
  db.exec(`INSERT INTO DUAL VALUES ('X')`)

  return db
}

function executeSql(code: string): { results: SqlResult[] } {
  const db = createOracleLikeDb()
  const results: SqlResult[] = []

  // Split into individual statements
  const statements = code
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (let rawStmt of statements) {
    try {
      const upperStmt = rawStmt.toUpperCase().trimStart()

      // ── SQL*Plus-style commands ──

      // Handle DESC / DESCRIBE (Oracle-style)
      if (upperStmt.startsWith("DESC ") || upperStmt.startsWith("DESCRIBE ")) {
        const tableName = rawStmt.replace(/^DESCRIBE\s+/i, "").replace(/^DESC\s+/i, "").trim()
        const tableInfo = db
          .prepare(
            `SELECT name, type, "notnull", dflt_value FROM pragma_table_info(?)`
          )
          .all(tableName) as Record<string, unknown>[]
        if (tableInfo.length === 0) {
          results.push({
            type: "error",
            message: `ORA-00942: table or view '${tableName.toUpperCase()}' does not exist`,
          })
        } else {
          // Oracle DESC format
          const formatted = tableInfo.map((row) => ({
            Name: row.name,
            "Null?": (row.notnull as number) === 0 ? "Y" : "",
            Type: row.type,
            Default: row.dflt_value ?? "",
          }))
          results.push({
            type: "table",
            columns: ["Name", "Null?", "Type", "Default"],
            rows: formatted,
            message: `DESCRIBE ${tableName.toUpperCase()}`,
          })
        }
        continue
      }

      // Handle SHOW TABLES (translate to Oracle-style USER_TABLES)
      if (upperStmt === "SHOW TABLES") {
        const tables = db
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('DUAL', 'sqlite_sequence') ORDER BY name`)
          .all() as Record<string, unknown>[]
        const formatted = tables.map((t: Record<string, unknown>) => ({ TABLE_NAME: t.name }))
        results.push({
          type: "table",
          columns: ["TABLE_NAME"],
          rows: formatted,
          message: "",
        })
        continue
      }

      // Handle SELECT FROM DUAL
      // DUAL table already exists, so no special handling needed

      // Translate Oracle SQL to SQLite
      const translatedStmt = translateOracleSql(rawStmt)

      // ── Row number / limit handling ──
      let finalStmt = translatedStmt
      const upperTranslated = translatedStmt.toUpperCase().trimStart()

      // Handle ROWNUM in WHERE clause (simple cases)
      if (/WHERE\s+.*\bROWNUM\b/.test(upperTranslated)) {
        // Match patterns like: WHERE ... AND ROWNUM = 1 or WHERE ROWNUM <= 5 or WHERE ROWNUM < 10
        const rownumMatch = upperTranslated.match(/\bROWNUM\s*(=|<=|<)\s*(\d+)/i)
        if (rownumMatch && /WHERE/.test(upperTranslated)) {
          const operator = rownumMatch[1]
          const limit = parseInt(rownumMatch[2])
          // Remove ROWNUM condition
          finalStmt = finalStmt.replace(/\s*AND\s+ROWNUM\s*(=|<=|<)\s*\d+/i, "")
          finalStmt = finalStmt.replace(/\s*WHERE\s+ROWNUM\s*(=|<=|<)\s*\d+/i, "")
          if (operator === "=" && limit === 1) {
            finalStmt += " LIMIT 1"
          } else if (operator === "<=" || operator === "<") {
            finalStmt += ` LIMIT ${limit}`
          }
        }
      }

      // Oracle-style DECODE function → CASE expression
      if (/DECODE\s*\(/i.test(finalStmt)) {
        // Simple DECODE(val, search1, result1, search2, result2, ..., default)
        // This is a simplified translation
        finalStmt = finalStmt.replace(
          /DECODE\s*\(([^,]+),\s*([^)]+)\)/gi,
          (match, expr, argsStr) => {
            const args = argsStr.split(",").map((s: string) => s.trim())
            if (args.length < 3) return match
            let result = "CASE " + expr
            for (let i = 0; i < args.length - 1; i += 2) {
              if (i + 1 < args.length) {
                result += ` WHEN ${args[i]} THEN ${args[i + 1]}`
              }
            }
            if (args.length % 2 === 1) {
              result += ` ELSE ${args[args.length - 1]}`
            }
            result += " END"
            return result
          }
        )
      }

      // Check if it's a SELECT-like query (returns rows)
      const isQuery =
        upperTranslated.startsWith("SELECT") ||
        upperTranslated.startsWith("PRAGMA") ||
        upperTranslated.startsWith("EXPLAIN")

      if (isQuery) {
        const rows = db.prepare(finalStmt).all() as Record<string, unknown>[]
        if (rows.length > 0) {
          const columns = Object.keys(rows[0] as Record<string, unknown>)
          results.push({
            type: "table",
            columns,
            rows: rows as Record<string, unknown>[],
            message: `${rows.length} row(s) selected`,
          })
        } else {
          results.push({
            type: "message",
            message: "0 rows selected",
          })
        }
      } else {
        // DDL or DML statement
        const info = db.prepare(finalStmt).run()
        const affectedRows = info.changes
        const stmtType = upperTranslated.split(/\s+/)[0]

        if (stmtType === "CREATE") {
          const objType = upperTranslated.includes("TABLE") ? "Table" : upperTranslated.includes("VIEW") ? "View" : "Object"
          results.push({
            type: "message",
            message: `${objType} created.`,
          })
        } else if (stmtType === "DROP") {
          const objType = upperTranslated.includes("TABLE") ? "Table" : upperTranslated.includes("VIEW") ? "View" : "Object"
          results.push({
            type: "message",
            message: `${objType} dropped.`,
          })
        } else if (stmtType === "ALTER") {
          results.push({
            type: "message",
            message: "Table altered.",
          })
        } else if (stmtType === "INSERT") {
          results.push({
            type: "message",
            message: `${affectedRows} row(s) inserted.`,
            affectedRows,
          })
        } else if (stmtType === "UPDATE") {
          results.push({
            type: "message",
            message: `${affectedRows} row(s) updated.`,
            affectedRows,
          })
        } else if (stmtType === "DELETE") {
          results.push({
            type: "message",
            message: `${affectedRows} row(s) deleted.`,
            affectedRows,
          })
        } else if (stmtType === "TRUNCATE" || stmtType === "TRUNCATETABLE") {
          results.push({
            type: "message",
            message: "Table truncated.",
          })
        } else if (stmtType === "COMMIT" || stmtType === "ROLLBACK" || stmtType === "SAVEPOINT") {
          results.push({
            type: "message",
            message: `${stmtType.charAt(0) + stmtType.slice(1).toLowerCase()} complete.`,
          })
        } else {
          results.push({
            type: "message",
            message: "Statement processed.",
            affectedRows,
          })
        }
      }
    } catch (err: any) {
      // Oracle-style error formatting
      const msg = err.message || ""
      // Map common SQLite errors to Oracle-style
      let oraError = msg
      if (/no such table/i.test(msg)) {
        const match = msg.match(/no such table: (.+)/i)
        const tbl = match ? match[1].toUpperCase() : ""
        oraError = `ORA-00942: table or view '${tbl}' does not exist`
      } else if (/no such column/i.test(msg)) {
        const match = msg.match(/no such column: (.+)/i)
        const col = match ? match[1].toUpperCase() : ""
        oraError = `ORA-00904: "${col}": invalid identifier`
      } else if (/syntax error/i.test(msg)) {
        oraError = `ORA-00933: SQL command not properly ended`
      } else if (/UNIQUE constraint/i.test(msg)) {
        oraError = `ORA-00001: unique constraint violated`
      } else if (/NOT NULL constraint/i.test(msg)) {
        oraError = `ORA-01400: cannot insert NULL into column`
      } else if (/FOREIGN KEY constraint/i.test(msg)) {
        oraError = `ORA-02291: integrity constraint violated - parent key not found`
      } else if (/CHECK constraint/i.test(msg)) {
        oraError = `ORA-02290: check constraint violated`
      } else if (/table.*already exists/i.test(msg)) {
        const match = msg.match(/table\s+(.+?)\s+already/i)
        const tbl = match ? match[1].toUpperCase() : ""
        oraError = `ORA-00955: name is already used by an existing object`
      } else if (/ambiguous column/i.test(msg)) {
        oraError = `ORA-00918: column ambiguously defined`
      } else if (/no such function/i.test(msg)) {
        const match = msg.match(/no such function: (.+)/i)
        const fn = match ? match[1].toUpperCase() : ""
        oraError = `ORA-00904: "${fn}": invalid identifier`
      } else if (/datatype mismatch/i.test(msg)) {
        oraError = `ORA-00932: inconsistent datatypes`
      } else if (/value too long/i.test(msg)) {
        oraError = `ORA-01401: inserted value too large for column`
      } else if (/division by zero/i.test(msg)) {
        oraError = `ORA-01476: divisor is equal to zero`
      }

      results.push({
        type: "error",
        message: oraError,
      })
    }
  }

  db.close()
  return { results }
}

/**
 * Kill a process and its entire tree on Windows using taskkill.
 * Falls back to child.kill('SIGKILL') on other platforms.
 */
function killProcessTree(child: ChildProcess) {
  if (!child.pid) return
  try {
    if (process.platform === "win32") {
      // /T = kill child processes too, /F = force (equivalent to SIGKILL)
      execSync(`taskkill /PID ${child.pid} /T /F`, {
        windowsHide: true,
        stdio: "ignore",
        timeout: 3000,
      })
    } else {
      // Send SIGKILL to the process group
      try {
        process.kill(-child.pid, "SIGKILL")
      } catch {
        child.kill("SIGKILL")
      }
    }
  } catch {
    // Process may have already exited; ignore
    try {
      child.kill("SIGKILL")
    } catch {
      // Already dead
    }
  }
}

function executeWithTimeout(
  command: string,
  stdin: string,
  timeoutMs: number,
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const child = exec(
      command,
      {
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        cwd,
      },
      (error, stdout, stderr) => {
        if (timer) clearTimeout(timer)
        if (timedOut) {
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

    // Set up manual timeout that force-kills the process tree
    timer = setTimeout(() => {
      timedOut = true
      killProcessTree(child)
    }, timeoutMs)

    // Always write stdin and close it so input() calls receive EOF
    if (child.stdin) {
      child.stdin.write(stdin || "")
      child.stdin.end()
    }
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Per-user concurrency limit: only one execution at a time per user
  const userId = (session.user as any)?.id ?? session.user?.email ?? "anonymous"
  if (activeExecutions.has(userId)) {
    return NextResponse.json(
      { error: "You already have code running. Please wait." },
      { status: 429 }
    )
  }
  activeExecutions.set(userId, true)

  let tmpDir: string | null = null

  try {
    const body = await request.json()
    const { code, language: langId, stdin, testCases } = body

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    // Handle SQL language specially
    if (langId === "sql") {
      const sqlResults = executeSql(code)
      return NextResponse.json({
        output: sqlResults.results
          .map((r): string => {
            if (r.type === "table" && r.columns && r.rows) {
              const cols = r.columns!
              const rows = r.rows!
              const colWidths = cols.map((col) =>
                Math.max(
                  col.length,
                  ...rows.map((row) => String(row[col] ?? "NULL").length)
                )
              )
              const header = cols
                .map((col, i) => col.padEnd(colWidths[i]))
                .join(" | ")
              const separator = colWidths.map((w) => "-".repeat(w)).join("-+-")
              const body = rows
                .map((row) =>
                  cols
                    .map((col, i) => String(row[col] ?? "NULL").padEnd(colWidths[i]))
                    .join(" | ")
                )
                .join("\n")
              return `${r.message}\n${header}\n${separator}\n${body}`
            }
            if (r.type === "error") {
              return `ERROR: ${r.message}`
            }
            return r.message
          })
          .join("\n\n"),
        stdout: "",
        stderr: "",
        exitCode: sqlResults.results.some((r) => r.type === "error") ? 1 : 0,
        sqlResults: sqlResults.results,
      })
    }

    const langConfig = LANGUAGE_MAP[langId]
    if (!langConfig) {
      return NextResponse.json(
        { error: `Unsupported language: ${langId}` },
        { status: 400 }
      )
    }

    // Create a temp directory for this execution
    tmpDir = mkdtempSync(join(tmpdir(), "amc-"))
    const filePath = join(tmpDir, langConfig.fileExtension)

    // Write the code to a temp file
    writeFileSync(filePath, code, "utf-8")

    let compileOutput = ""

    // Resolve per-language timeouts
    const langTimeout = LANGUAGE_TIMEOUTS[langId] ?? { compile: 10000, run: 5000 }

    // Step 1: Compile if needed (Java, C++, C, Rust)
    if (langConfig.compileCmd) {
      try {
        execSync(langConfig.compileCmd(filePath), {
          timeout: langTimeout.compile || 10000,
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

    // Step 2: Run against test cases if provided
    if (testCases && Array.isArray(testCases) && testCases.length > 0) {
      const testResults: {
        input: string
        expectedOutput: string
        actualOutput: string
        passed: boolean
      }[] = []

      for (const tc of testCases) {
        let currentTmp = tmpDir
        // For compiled languages, create fresh temp dir for each test case
        if (testResults.length > 0 && langConfig.compileCmd) {
          currentTmp = mkdtempSync(join(tmpdir(), "amc-"))
          const newFilePath = join(currentTmp, langConfig.fileExtension)
          writeFileSync(newFilePath, code, "utf-8")
          try {
            execSync(langConfig.compileCmd(newFilePath), {
              timeout: langTimeout.compile || 10000,
              cwd: currentTmp,
              windowsHide: true,
              stdio: "pipe",
            })
          } catch {}
        }
        const currentFilePath = join(currentTmp, langConfig.fileExtension)
        const tcResult = await executeWithTimeout(
          langConfig.runCmd(currentFilePath),
          tc.input || "",
          langTimeout.run,
          currentTmp
        )
        const actual = (tcResult.stdout || "").trimEnd()
        const expected = (tc.expectedOutput || "").trimEnd()
        testResults.push({
          input: tc.input || "",
          expectedOutput: tc.expectedOutput || "",
          actualOutput: actual,
          passed: actual === expected,
        })
      }

      return NextResponse.json({
        output: `${testResults.filter((t) => t.passed).length}/${testResults.length} test cases passed`,
        stdout: "",
        stderr: "",
        exitCode: testResults.every((t) => t.passed) ? 0 : 1,
        signal: null,
        compileOutput: "",
        testResults,
      })
    }

    // Run normally (single execution with stdin)
    const result = await executeWithTimeout(
      langConfig.runCmd(filePath),
      stdin || "",
      langTimeout.run,
      tmpDir
    )

    // ── Capture any generated chart images (PNG) ──
    const images: { name: string; data: string; mime: string }[] = []
    try {
      const files = readdirSync(tmpDir)
      for (const file of files) {
        if (extname(file).toLowerCase() === ".png") {
          const filePath = join(tmpDir, file)
          const buffer = readFileSync(filePath)
          const base64 = buffer.toString("base64")
          images.push({
            name: file,
            data: `data:image/png;base64,${base64}`,
            mime: "image/png",
          })
        }
      }
    } catch {}

    return NextResponse.json({
      output: result.stdout + (result.stderr ? "\n" + result.stderr : ""),
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      signal: null,
      compileOutput,
      images: images.length > 0 ? images : undefined,
    })
  } catch (error) {
    console.error("Execution error:", error)
    return NextResponse.json(
      { error: "Failed to execute code. Please try again." },
      { status: 500 }
    )
  } finally {
    // Remove concurrency lock
    activeExecutions.delete(userId)
    // Clean up temp files
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true })
      } catch {}
    }
  }
}
