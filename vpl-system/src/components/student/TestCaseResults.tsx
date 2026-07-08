"use client"

import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TestCaseResult {
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
}

interface TestCaseResultsProps {
  results: TestCaseResult[]
  isRunning: boolean
}

export default function TestCaseResults({ results, isRunning }: TestCaseResultsProps) {
  if (isRunning) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Running test cases...
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <p className="text-sm">No test cases defined for this question.</p>
        <p className="text-xs mt-1">Teachers can add test cases to help verify your solution.</p>
      </div>
    )
  }

  const passedCount = results.filter((r) => r.passed).length

  return (
    <div className="space-y-2 p-0">
      {/* Summary bar */}
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-xs text-muted-foreground">
          Test Cases
        </span>
        <span className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          passedCount === results.length
            ? "bg-approved-bg/15 text-approved"
            : "bg-rejected-bg/15 text-rejected"
        )}>
          {passedCount}/{results.length} passed
        </span>
      </div>

      {/* Individual results */}
      {results.map((result, index) => (
        <div key={index} className="border-b border-border/50 last:border-b-0">
          <div className="flex items-center gap-2 px-3 py-2">
            {result.passed ? (
              <CheckCircle2 className="size-4 shrink-0 text-approved" />
            ) : (
              <XCircle className="size-4 shrink-0 text-rejected" />
            )}
            <span className={cn(
              "text-xs font-medium",
              result.passed ? "text-approved" : "text-rejected"
            )}>
              Test #{index + 1}
            </span>
          </div>

          {/* Input */}
          <div className="px-3 pb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Input:</span>
            <pre className="mt-0.5 rounded bg-muted/30 px-2 py-1 text-xs font-mono overflow-x-auto">
              {result.input || "(no input)"}
            </pre>
          </div>

          {/* Expected vs Actual - Diff View */}
          <div className="grid grid-cols-2 gap-2 px-3 pb-2">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Expected:</span>
              <pre className={cn(
                "mt-0.5 rounded px-2 py-1 text-xs font-mono overflow-x-auto border",
                result.passed ? "border-transparent bg-muted/30" : "border-approved/30 bg-approved-bg/10"
              )}>
                {result.expectedOutput || "(no output)"}
              </pre>
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Actual:</span>
              <pre className={cn(
                "mt-0.5 rounded px-2 py-1 text-xs font-mono overflow-x-auto border",
                result.passed ? "border-transparent bg-muted/30" : "border-rejected/30 bg-rejected-bg/10"
              )}>
                {result.actualOutput || "(no output)"}
              </pre>
            </div>
          </div>

          {/* Diff highlight for failed tests */}
          {!result.passed && (
            <div className="px-3 pb-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Diff:</span>
              <pre className="mt-0.5 rounded bg-rejected-bg/10 px-2 py-1 text-xs font-mono overflow-x-auto text-rejected">
                {generateDiff(result.expectedOutput, result.actualOutput)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function generateDiff(expected: string, actual: string): string {
  const expLines = expected.split("\n")
  const actLines = actual.split("\n")
  const maxLines = Math.max(expLines.length, actLines.length)
  const lines: string[] = []

  for (let i = 0; i < maxLines; i++) {
    const e = expLines[i] ?? ""
    const a = actLines[i] ?? ""
    if (e === a) {
      lines.push(`  ${e}`)
    } else {
      lines.push(`- ${e}`)
      lines.push(`+ ${a}`)
    }
  }

  return lines.join("\n").trim() || "(identical output)"
}
