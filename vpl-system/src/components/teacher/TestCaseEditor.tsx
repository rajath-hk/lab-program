"use client"

import { useState } from "react"
import { Plus, Trash2, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TestCase {
  input: string
  expectedOutput: string
}

interface TestCaseEditorProps {
  testCases: TestCase[]
  onChange: (testCases: TestCase[]) => void
}

export default function TestCaseEditor({ testCases, onChange }: TestCaseEditorProps) {
  function addTestCase() {
    onChange([...testCases, { input: "", expectedOutput: "" }])
  }

  function removeTestCase(index: number) {
    onChange(testCases.filter((_, i) => i !== index))
  }

  function updateTestCase(index: number, field: keyof TestCase, value: string) {
    const updated = testCases.map((tc, i) =>
      i === index ? { ...tc, [field]: value } : tc
    )
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Test Cases</label>
        <Button type="button" variant="outline" size="xs" onClick={addTestCase}>
          <Plus className="size-3.5" />
          Add Test Case
        </Button>
      </div>

      {testCases.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          No test cases yet. Add test cases to let students verify their code against expected outputs.
        </div>
      )}

      <div className="space-y-2">
        {testCases.map((tc, index) => (
          <div key={index} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Test Case #{index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeTestCase(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Input (stdin)
                </label>
                <textarea
                  value={tc.input}
                  onChange={(e) => updateTestCase(index, "input", e.target.value)}
                  placeholder="Enter input that will be passed to the program via stdin..."
                  rows={2}
                  className="w-full rounded border bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-info placeholder:text-muted-foreground"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Expected Output
                </label>
                <textarea
                  value={tc.expectedOutput}
                  onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                  placeholder="Enter the expected output from the program..."
                  rows={2}
                  className="w-full rounded border bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-info placeholder:text-muted-foreground"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
