"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Play,
  Terminal,
  AlertCircle,
  Info,
  Keyboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Dynamically import Monaco editor (no SSR)
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-[500px] animate-pulse rounded-lg bg-muted" /> }
)

interface QuestionDetail {
  id: string
  title: string
  description: string
  difficulty: string
  orderNumber: number
  starterCode: string | null
  program: {
    id: string
    title: string
  }
}

interface SubmissionResult {
  id: string
  status: string
  feedback: string | null
  createdAt: string
  language: string
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
  EASY: { label: "Easy", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  MEDIUM: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  HARD: { label: "Hard", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  EXTREME: { label: "Extreme", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

const SUPPORTED_LANGUAGES = [
  { id: "python", label: "Python", ext: ".py" },
  { id: "javascript", label: "JavaScript", ext: ".js" },
  { id: "typescript", label: "TypeScript", ext: ".ts" },
  { id: "java", label: "Java", ext: ".java" },
  { id: "cpp", label: "C++", ext: ".cpp" },
  { id: "c", label: "C", ext: ".c" },
  { id: "rust", label: "Rust", ext: ".rs" },
  { id: "go", label: "Go", ext: ".go" },
  { id: "plaintext", label: "Plain Text", ext: ".txt" },
]

export default function CodeEditorPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params.id as string
  const questionId = params.questionId as string

  const [question, setQuestion] = useState<QuestionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("python")
  const [submitting, setSubmitting] = useState(false)
  const [submission, setSubmission] = useState<SubmissionResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Run state
  const [running, setRunning] = useState(false)
  const [stdin, setStdin] = useState("")
  const [showStdin, setShowStdin] = useState(true)
  const [runResult, setRunResult] = useState<{
    output: string
    stdout: string
    stderr: string
    exitCode: number | null
    compileOutput: string | null
  } | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch program detail to get question info
  const fetchQuestion = useCallback(async () => {
    try {
      const res = await fetch(`/api/student/programs/${programId}`)
      if (!res.ok) throw new Error("Failed to fetch question")
      const data = await res.json()
      const q = data.questions.find((q: any) => q.id === questionId)
      if (!q) throw new Error("Question not found")
      setQuestion({
        id: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty || "EASY",
        orderNumber: q.orderNumber,
        starterCode: q.starterCode,
        program: { id: data.id, title: data.title },
      })
      // Set initial code from starter code or existing submission
      setCode(q.starterCode || "")
      if (q.submission) {
        setSubmission(q.submission)
        // Fetch full submission to get the code
        const subRes = await fetch(`/api/student/submissions/${q.submission.id}`)
        if (subRes.ok) {
          const subData = await subRes.json()
          setCode(subData.code || q.starterCode || "")
          setLanguage(subData.language || "python")
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [programId, questionId])

  useEffect(() => {
    fetchQuestion()
  }, [fetchQuestion])

  async function handleRun() {
    if (!code.trim()) {
      setRunError("Please write some code before running.")
      return
    }

    setRunning(true)
    setRunResult(null)
    setRunError(null)

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Execution failed")
      }

      setRunResult(await res.json())
    } catch (err: any) {
      setRunError(err.message)
    } finally {
      setRunning(false)
    }
  }

  async function handleSubmit() {
    if (!code.trim()) {
      setSubmitError("Please write some code before submitting.")
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch("/api/student/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          code,
          language,
          output: runResult?.output || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit")
      }

      const result = await res.json()
      setSubmission({
        id: result.id,
        status: result.status,
        feedback: result.feedback || null,
        createdAt: result.createdAt,
        language: result.language,
      })
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEditorChange(value: string | undefined) {
    if (value !== undefined) setCode(value)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !question) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto size-10 text-muted-foreground/40" />
        <p className="mt-3 text-muted-foreground">{error || "Question not found"}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/student/programs/${programId}`)}
        >
          Back to Program
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/student/programs/${programId}`)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-medium text-primary">
              {question.orderNumber}
            </span>
            <h1 className="text-xl font-bold tracking-tight truncate">
              {question.title}
            </h1>
            {question.difficulty && difficultyConfig[question.difficulty] && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold shrink-0",
                  difficultyConfig[question.difficulty].color
                )}
              >
                {difficultyConfig[question.difficulty].label}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {question.program.title}
          </p>
        </div>

        {/* Submission status badge */}
        {submission && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase",
              statusColors[submission.status]
            )}
          >
            {submission.status === "PENDING" && <Clock className="size-3.5" />}
            {submission.status === "APPROVED" && (
              <CheckCircle2 className="size-3.5" />
            )}
            {submission.status === "REJECTED" && (
              <XCircle className="size-3.5" />
            )}
            {submission.status}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Editor */}
        <div className="space-y-4 lg:col-span-2">
          {/* Monaco Editor */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-4 py-2.5">
              <CardTitle className="text-sm font-medium">Code Editor</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {mounted && (
                <MonacoEditor
                  height="500px"
                  language={language}
                  value={code}
                  onChange={handleEditorChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    padding: { top: 12 },
                  }}
                />
              )}
              {!mounted && (
                <div className="flex h-[500px] items-center justify-center bg-[#1e1e1e]">
                  <Loader2 className="size-6 animate-spin text-white/50" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stdin Input */}
          <div>
            <button
              type="button"
              onClick={() => setShowStdin(!showStdin)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Keyboard className="size-3.5" />
              {showStdin ? "Hide" : "Add"} Runtime Input (stdin)
            </button>
            {showStdin && (
              <div className="mt-2">
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder={`Enter input for your program here...\nExample: if your program uses input() or scanf(),\ntype the values here, one per line.`}
                  rows={3}
                  className="h-16 w-full min-w-0 rounded-lg border border-input bg-muted/30 px-2.5 py-1.5 font-mono text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                  spellCheck={false}
                />
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  This input is passed as stdin when you run the code.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={handleRun}
              disabled={running}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {running ? "Running..." : "Run Code"}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="lg"
                className="gap-2"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>

          {/* Output Panel */}
          {(runResult || runError || running) && (
            <Card className="overflow-hidden border-t-2 border-t-cyan-500/30">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-4 py-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Terminal className="size-4" />
                  Output
                </CardTitle>
                {runResult && runResult.exitCode === 0 && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Exit: {runResult.exitCode}
                  </span>
                )}
                {runResult && runResult.exitCode !== null && runResult.exitCode !== 0 && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Exit: {runResult.exitCode}
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {running ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Executing code...
                  </div>
                ) : runError ? (
                  <div className="flex items-start gap-2 p-4 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {runError}
                  </div>
                ) : runResult ? (
                  <div className="font-mono text-sm leading-relaxed">
                    {runResult.compileOutput && (
                      <>
                        <div className="bg-amber-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                          Compile Output
                        </div>
                        <pre className="overflow-x-auto px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
                          {runResult.compileOutput}
                        </pre>
                      </>
                    )}
                    <pre className="overflow-x-auto px-4 py-3 text-foreground">
                      {runResult.output || runResult.stdout || "(no output)"}
                    </pre>
                    {runResult.stderr && (
                      <pre className="overflow-x-auto border-t px-4 py-2 text-xs text-red-600">
                        {runResult.stderr}
                      </pre>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Right: Description & Status */}
        <div className="space-y-4">
          {/* Question description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                {question.description}
              </p>
            </CardContent>
          </Card>

          {/* Starter code info */}
          {question.starterCode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Info className="size-3.5" />
                  Starter Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                  <code className="font-mono">{question.starterCode}</code>
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Submission result */}
          {submission && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Submission Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      statusColors[submission.status]
                    )}
                  >
                    {submission.status === "PENDING" && <Clock className="size-3" />}
                    {submission.status === "APPROVED" && (
                      <CheckCircle2 className="size-3" />
                    )}
                    {submission.status === "REJECTED" && (
                      <XCircle className="size-3" />
                    )}
                    {submission.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {formatDate(submission.createdAt)}
                </p>

                {submission.feedback && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Feedback
                    </p>
                    <p className="text-sm">{submission.feedback}</p>
                  </div>
                )}

                {submission.status === "PENDING" && (
                  <p className="text-xs text-amber-600">
                    Your submission is pending review by the teacher.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
