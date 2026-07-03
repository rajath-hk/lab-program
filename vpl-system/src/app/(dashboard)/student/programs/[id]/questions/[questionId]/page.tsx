"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileCode,
  BookOpen,
  Save,
  Undo2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Panel, Group, Separator } from "react-resizable-panels"

// Dynamically import Monaco editor (no SSR)
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-secondary" /> }
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
  PENDING: "text-pending",
  APPROVED: "text-approved",
  REJECTED: "text-rejected",
}

const statusBgColors: Record<string, string> = {
  PENDING: "bg-pending-bg/15 border-pending/20",
  APPROVED: "bg-approved-bg/15 border-approved/20",
  REJECTED: "bg-rejected-bg/15 border-rejected/20",
}

const difficultyConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  EASY: { 
    label: "Easy", 
    color: "text-approved", 
    bgColor: "bg-approved-bg/15 text-approved border border-approved/10" 
  },
  MEDIUM: { 
    label: "Medium", 
    color: "text-pending", 
    bgColor: "bg-pending-bg/15 text-pending border border-pending/10" 
  },
  HARD: { 
    label: "Hard", 
    color: "text-rejected", 
    bgColor: "bg-rejected-bg/15 text-rejected border border-rejected/10" 
  },
  EXTREME: { 
    label: "Extreme", 
    color: "text-info", 
    bgColor: "bg-info-bg/15 text-info border border-info/10" 
  },
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

type ConsoleTab = "testcase" | "output" | "submission"

// --- localStorage draft helpers ---
const DRAFT_PREFIX = "vpl-draft-"

interface DraftData {
  code: string
  language: string
  savedAt: number
}

function getDraftKey(questionId: string) {
  return `${DRAFT_PREFIX}${questionId}`
}

function loadDraft(questionId: string): DraftData | null {
  try {
    const raw = localStorage.getItem(getDraftKey(questionId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveDraft(questionId: string, code: string, language: string) {
  try {
    const data: DraftData = { code, language, savedAt: Date.now() }
    localStorage.setItem(getDraftKey(questionId), JSON.stringify(data))
  } catch {
    // localStorage may be full or unavailable
  }
}

function clearDraft(questionId: string) {
  try {
    localStorage.removeItem(getDraftKey(questionId))
  } catch {
    // ignore
  }
}

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
  const [runResult, setRunResult] = useState<{
    output: string
    stdout: string
    stderr: string
    exitCode: number | null
    compileOutput: string | null
  } | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // Console state
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase")
  const [consoleOpen, setConsoleOpen] = useState(true)

  // Panel ref for programmatic collapse/expand
  const descPanelRef = useRef<{ collapse: () => void; expand: () => void; isCollapsed: () => boolean } | null>(null)
  const [descriptionCollapsed, setDescriptionCollapsed] = useState(false)

  // Editor font size
  const [fontSize, setFontSize] = useState(14)

  // Draft / auto-save state
  const [hasDraft, setHasDraft] = useState(false)
  const [draftInfo, setDraftInfo] = useState<DraftData | null>(null)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadDoneRef = useRef(false)

  // Refs for keyboard shortcuts (always point to latest callbacks)
  const handleRunRef = useRef<() => Promise<void>>(handleRun)
  const handleSubmitRef = useRef<() => Promise<void>>(handleSubmit)

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

  // Initialize panel state after mounting
  useEffect(() => {
    if (descPanelRef.current && descriptionCollapsed) {
      descPanelRef.current.expand();
      setDescriptionCollapsed(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      // Ctrl+Enter → Run code
      if (isCtrlOrCmd && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        // Don't run if Monaco editor is in the middle of a composition (e.g., IME input)
        if (e.isComposing) return
        handleRunRef.current()
        return
      }

      // Ctrl+Shift+Enter → Submit
      if (isCtrlOrCmd && e.key === "Enter" && e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        handleSubmitRef.current()
        return
      }

      // Ctrl+B → Toggle description panel
      if (isCtrlOrCmd && e.key === "b") {
        e.preventDefault()
        if (descPanelRef.current?.isCollapsed()) {
          descPanelRef.current?.expand()
        } else {
          descPanelRef.current?.collapse()
        }
        return
      }
    }

    // Use capture phase to intercept before Monaco
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, []) // Stable — all deps accessed through refs

  async function handleRun() {
    if (!code.trim()) {
      setRunError("Please write some code before running.")
      setConsoleTab("output")
      setConsoleOpen(true)
      return
    }

    setRunning(true)
    setRunResult(null)
    setRunError(null)
    setConsoleTab("output")
    setConsoleOpen(true)

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
      setConsoleTab("submission")
      setConsoleOpen(true)
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
      // Clear draft on successful submission
      clearDraft(questionId)
      setHasDraft(false)
      setDraftInfo(null)
      setShowDraftBanner(false)
      setConsoleTab("submission")
      setConsoleOpen(true)
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEditorChange(value: string | undefined) {
    if (value !== undefined) setCode(value)
  }

  // Keep refs up to date
  handleRunRef.current = handleRun
  handleSubmitRef.current = handleSubmit

  // --- Auto-save draft to localStorage ---
  useEffect(() => {
    // Wait until question is fully loaded and we have code set
    if (!mounted || !question) return

    // Clear any pending timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Debounce by 1 second
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(questionId, code, language)
      setAutoSaving(false)
      setHasDraft(true)
    }, 1000)

    setAutoSaving(true)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [code, language, mounted, question, questionId])

  // --- Check for existing draft on question load ---
  useEffect(() => {
    if (!question || mounted === false || initialLoadDoneRef.current) return
    initialLoadDoneRef.current = true

    // Only check draft if there's no existing submission (don't overwrite submitted code)
    if (submission) return

    const draft = loadDraft(questionId)
    if (draft && draft.code.trim()) {
      // Only show banner if draft differs from current code
      const starterOrEmpty = question.starterCode || ""
      if (draft.code !== starterOrEmpty) {
        setHasDraft(true)
        setDraftInfo(draft)
        setShowDraftBanner(true)
      }
    }
  }, [question, mounted, submission, questionId])

  function handleRestoreDraft() {
    if (!draftInfo) return
    setCode(draftInfo.code)
    setLanguage(draftInfo.language)
    setShowDraftBanner(false)
    setHasDraft(false)
  }

  function handleDiscardDraft() {
    clearDraft(questionId)
    setShowDraftBanner(false)
    setHasDraft(false)
    setDraftInfo(null)
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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading problem...</p>
        </div>
      </div>
    )
  }

  if (error || !question) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{error || "Question not found"}</p>
          <Button
            variant="outline"
            onClick={() => router.push(`/student/programs/${programId}`)}
          >
            Back to Program
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* ===== DRAFT RESTORE BANNER ===== */}
      {showDraftBanner && draftInfo && (
        <div className="flex shrink-0 items-center gap-3 border-b border-pending/30 bg-pending-bg/10 px-4 py-2 text-sm">
          <Save className="size-4 text-pending" />
          <span className="text-foreground">
            You have an unsaved draft from{" "}
            {new Date(draftInfo.savedAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </span>
          <Button
            size="xs"
            variant="outline"
            onClick={handleRestoreDraft}
            className="h-7 gap-1 border-pending/30 text-pending hover:bg-pending-bg/20"
          >
            <Undo2 className="size-3" />
            Restore Draft
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={handleDiscardDraft}
            className="h-7 text-pending hover:bg-pending-bg/20"
          >
            <X className="size-3" />
            Discard
          </Button>
        </div>
      )}

      {/* ===== TOP HEADER BAR ===== */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push(`/student/programs/${programId}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            {question.orderNumber}
          </span>
          <h1 className="text-base font-semibold truncate max-w-xs text-foreground">{question.title}</h1>
          {question.difficulty && difficultyConfig[question.difficulty] && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                difficultyConfig[question.difficulty].bgColor
              )}
            >
              {difficultyConfig[question.difficulty].label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Submission status */}
          {submission && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                statusBgColors[submission.status]
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
          )}
          <span className="text-sm text-muted-foreground truncate max-w-xs">
            {question.program.title}
          </span>
        </div>
      </header>

      {/* ===== MAIN CONTENT: Split Panels ===== */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Group orientation="horizontal" id="leetcode-editor" className="w-full h-full min-w-0">
          {/* ===== LEFT PANEL: Problem Description ===== */}
          <Panel
            id="description-panel"
            defaultSize={300}
            minSize={400}
            maxSize={500}
            collapsible={true}
            collapsedSize={45}
            onResize={(size: any) => {
              const sizeNum = typeof size === "string" ? parseFloat(size) : Number(size)
              setDescriptionCollapsed(sizeNum === 0)
            }}
            panelRef={(ref: any) => {
              descPanelRef.current = ref
            }}
            className="h-full"
          >
            <div className="flex h-full flex-col min-w-0 overflow-hidden bg-card">
              {/* Description Tab Header */}
              <div className="flex h-10 shrink-0 items-center border-b bg-muted/30 px-4">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <BookOpen className="size-3.5" />
                  Description
                </div>
                <button
                  onClick={() => descPanelRef.current?.collapse()}
                  className="ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  title="Collapse description panel"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>

              {/* Description Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-5 h-full">
                  {/* Title */}
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-foreground">{question.title}</h2>
                    <div className="mt-1.5 flex items-center gap-3">
                      {question.difficulty && difficultyConfig[question.difficulty] && (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            difficultyConfig[question.difficulty].color
                          )}
                        >
                          {difficultyConfig[question.difficulty].label}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {question.program.title}
                      </span>
                    </div>
                  </div>

                  {/* Description text */}
                  <div className="max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                      {question.description}
                    </div>
                  </div>

                  {/* Starter Code Section */}
                  {question.starterCode && (
                    <div className="mt-6">
                      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <FileCode className="size-3.5" />
                        Starter Code
                      </h3>
                      <div className="overflow-hidden rounded-lg border bg-secondary/40">
                        <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
                          <code className="font-mono text-foreground">
                            {question.starterCode}
                          </code>
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Submission info */}
                  {submission && (
                    <div className="mt-6">
                      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Info className="size-3.5" />
                        Submission
                      </h3>
                      <div
                        className={cn(
                          "rounded-lg border p-3",
                          statusBgColors[submission.status]
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {submission.status === "PENDING" && (
                            <Clock className={cn("size-4", statusColors[submission.status])} />
                          )}
                          {submission.status === "APPROVED" && (
                            <CheckCircle2 className={cn("size-4", statusColors[submission.status])} />
                          )}
                          {submission.status === "REJECTED" && (
                            <XCircle className={cn("size-4", statusColors[submission.status])} />
                          )}
                          <span
                            className={cn(
                              "text-sm font-semibold uppercase",
                              statusColors[submission.status]
                            )}
                          >
                            {submission.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted {formatDate(submission.createdAt)}
                        </p>
                        {submission.feedback && (
                          <p className="mt-2 text-sm text-foreground">{submission.feedback}</p>
                        )}
                        {submission.status === "PENDING" && (
                          <p className="mt-2 text-xs text-pending">
                            Your submission is pending review by the teacher.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {/* ===== SEPARATOR ===== */}
          <Separator className="group relative flex w-1.5 shrink-0 items-center justify-center bg-transparent transition-colors hover:bg-info/20 data-[resize-handle-active]:bg-info/30">
            <div className="flex h-8 w-0.5 rounded-full bg-border group-hover:bg-info group-data-[resize-handle-active]:bg-info transition-colors" />
          </Separator>

          {/* ===== RIGHT PANEL: Editor + Console ===== */}
          <Panel id="editor-panel" defaultSize={15} minSize={10} className="h-full">
            <div className="flex h-full flex-col bg-secondary">
              {/* ---- Editor Toolbar ---- */}
              <div className="flex h-12 shrink-0 items-center justify-between border-b bg-secondary/60 px-4">
                <div className="flex items-center gap-2">
                  <FileCode className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    code.{SUPPORTED_LANGUAGES.find((l) => l.id === language)?.ext || ".txt"}
                  </span>
                  {/* Auto-save indicator */}
                  {hasDraft && !showDraftBanner && (
                    <span className="flex items-center gap-1 rounded bg-pending-bg/15 px-1.5 py-0.5 text-xs text-pending">
                      <Save className="size-3" />
                      Saved
                    </span>
                  )}
                  {autoSaving && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Font size controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFontSize((s) => Math.max(10, s - 1))}
                      className="flex size-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Decrease font size"
                    >
                      A-
                    </button>
                    <span className="w-6 text-center text-xs text-muted-foreground">{fontSize}</span>
                    <button
                      onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                      className="flex size-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Increase font size"
                    >
                      A+
                    </button>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  {/* Language selector */}
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-7 rounded border bg-secondary px-2 text-xs text-foreground outline-none focus:border-info"
                    title="Select language"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.label}
                      </option>
                    ))}
                  </select>

                  <div className="h-4 w-px bg-border" />

                  {/* Run/Submit buttons */}
                  <Button
                    onClick={handleRun}
                    disabled={running}
                    size="sm"
                    variant="default"
                    className="h-7 gap-1 bg-approved text-xs font-medium text-approved-foreground hover:bg-approved/80"
                    title="Run code (Ctrl+Enter)"
                  >
                    {running ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    {running ? "Run..." : "Run"}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    size="sm"
                    variant="default"
                    className="h-7 gap-1 bg-info text-xs font-medium text-white hover:bg-info/80"
                    title="Submit code (Ctrl+Shift+Enter)"
                  >
                    {submitting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    {submitting ? "Sub..." : "Submit"}
                  </Button>
                </div>
              </div>

              {/* ---- Editor Area ---- */}
              <div className="flex-1 overflow-hidden">
                {mounted && (
                  <MonacoEditor
                    height="100%"
                    width="100%"
                    language={language}
                    value={code}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: fontSize,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: "on",
                      padding: { top: 12 },
                      renderLineHighlight: "line",
                      cursorBlinking: "smooth",
                      smoothScrolling: true,
                      folding: true,
                      bracketPairColorization: { enabled: true },
                    }}
                  />
                )}
                {!mounted && (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* ---- Console Toggle ---- */}
              {!consoleOpen && (
                <button
                  onClick={() => setConsoleOpen(true)}
                  className="flex h-8 shrink-0 items-center gap-2 border-t bg-secondary/60 px-4 text-xs text-muted-foreground hover:text-foreground"
                  title="Show console"
                >
                  <Terminal className="size-3.5" />
                  Console
                  <ChevronRight className="size-3.5" />
                  {runResult && (
                    <span
                      className={cn(
                        "ml-auto rounded px-1.5 py-0.5 text-[10px]",
                        runResult.exitCode === 0
                          ? "bg-approved-bg/15 text-approved"
                          : "bg-rejected-bg/15 text-rejected"
                      )}
                    >
                      Exit: {runResult.exitCode}
                    </span>
                  )}
                </button>
              )}

              {/* ---- Console Panel ---- */}
              {consoleOpen && (
                <div
                  className={cn(
                    "flex shrink-0 flex-col border-t bg-secondary",
                    "h-60"
                  )}
                >
                  {/* Console Tabs */}
                  <div className="flex h-10 shrink-0 items-center border-b bg-secondary/60">
                    <button
                      onClick={() => setConsoleTab("testcase")}
                      className={cn(
                        "flex h-full items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors",
                        consoleTab === "testcase"
                          ? "border-info text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Keyboard className="size-3.5" />
                      Test Case
                    </button>
                    <button
                      onClick={() => setConsoleTab("output")}
                      className={cn(
                        "flex h-full items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors",
                        consoleTab === "output"
                          ? "border-info text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Terminal className="size-3.5" />
                      Run Output
                      {(runResult || runError) && (
                        <span
                          className={cn(
                            "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                            runResult?.exitCode === 0
                              ? "bg-approved-bg/15 text-approved"
                              : "bg-rejected-bg/15 text-rejected"
                          )}
                        >
                          {runResult?.exitCode === 0
                            ? "✓"
                            : runResult
                            ? "✗"
                            : "!"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setConsoleTab("submission")}
                      className={cn(
                        "flex h-full items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors",
                        consoleTab === "submission"
                          ? "border-info text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Send className="size-3.5" />
                      Submission
                      {submission && (
                        <span
                          className={cn(
                            "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                            submission.status === "APPROVED"
                              ? "bg-approved-bg/15 text-approved"
                              : submission.status === "REJECTED"
                              ? "bg-rejected-bg/15 text-rejected"
                              : "bg-pending-bg/15 text-pending"
                          )}
                        >
                          {submission.status === "APPROVED"
                            ? "✓"
                            : submission.status === "REJECTED"
                            ? "✗"
                            : "~"}
                        </span>
                      )}
                    </button>

                    {/* Console close button */}
                    <button
                      onClick={() => setConsoleOpen(false)}
                      className="ml-auto mr-2 flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Hide console"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  {/* Console Content */}
                  <div className="flex-1 overflow-y-auto p-0">
                    {/* Test Case Tab */}
                    {consoleTab === "testcase" && (
                      <div className="p-3 h-full">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          <Keyboard className="size-3.5" />
                          Runtime Input (stdin)
                        </label>
                        <textarea
                          value={stdin}
                          onChange={(e) => setStdin(e.target.value)}
                          placeholder={`Enter input for your program here...\nExample: if your program uses input() or scanf(),\ntype the values here, one per line.`}
                          rows={5}
                          className="w-full h-32 rounded border bg-muted/40 px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-info placeholder:text-muted-foreground"
                          spellCheck={false}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          This input is passed as stdin when you run the code.
                        </p>
                      </div>
                    )}

                    {/* Output Tab */}
                    {consoleTab === "output" && (
                      <div className="h-full">
                        {/* Exit code badge */}
                        <div className="flex items-center justify-between border-b px-3 py-1.5">
                          <span className="text-xs text-muted-foreground">Output</span>
                          <div className="flex items-center gap-2">
                            {(runResult || runError) && (
                              <>
                                {runResult && (
                                  <span
                                    className={cn(
                                      "rounded px-1.5 py-0.5 text-xs font-medium",
                                      runResult.exitCode === 0
                                        ? "bg-approved-bg/15 text-approved"
                                        : "bg-rejected-bg/15 text-rejected"
                                    )}
                                  >
                                    Exit: {runResult.exitCode}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Output content */}
                        <div className="p-0 h-full overflow-auto">
                          {running ? (
                            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                              <Loader2 className="size-3.5 animate-spin" />
                              Executing code...
                            </div>
                          ) : runError ? (
                            <div className="flex items-start gap-2 px-3 py-3 text-sm text-rejected">
                              <AlertCircle className="mt-0.5 size-4 shrink-0" />
                              <span>{runError}</span>
                            </div>
                          ) : runResult ? (
                            <div className="font-mono text-sm leading-relaxed h-full">
                              {runResult.compileOutput && (
                                <>
                                  <div className="bg-pending-bg/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-pending">
                                    Compile Output
                                  </div>
                                  <pre className="overflow-x-auto px-3 py-2 text-xs text-pending">
                                    {runResult.compileOutput}
                                  </pre>
                                </>
                              )}
                              <pre className="overflow-x-auto px-3 py-3 text-sm text-foreground">
                                {runResult.output || runResult.stdout || (
                                  <span className="text-muted-foreground">(no output)</span>
                                )}
                              </pre>
                              {runResult.stderr && (
                                <pre className="overflow-x-auto border-t px-3 py-2 text-xs text-rejected">
                                  {runResult.stderr}
                                </pre>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                              <Play className="size-8 text-muted-foreground" />
                              <p className="mt-2 text-sm text-muted-foreground">
                                Run your code to see the output here
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Use the Run button above or press a keyboard shortcut
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submission Tab */}
                    {consoleTab === "submission" && (
                      <div className="p-3 h-full overflow-auto">
                        {submitError && (
                          <div className="mb-3 flex items-start gap-2 rounded-md border border-rejected/20 bg-rejected-bg/15 px-3 py-2 text-sm text-rejected">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <span>{submitError}</span>
                          </div>
                        )}
                        {submission ? (
                          <div className="space-y-3">
                            <div
                              className={cn(
                                "flex items-center gap-2 rounded-md border px-3 py-2.5",
                                statusBgColors[submission.status]
                              )}
                            >
                              {submission.status === "PENDING" && (
                                <Clock className={cn("size-5", statusColors[submission.status])} />
                              )}
                              {submission.status === "APPROVED" && (
                                <CheckCircle2 className={cn("size-5", statusColors[submission.status])} />
                              )}
                              {submission.status === "REJECTED" && (
                                <XCircle className={cn("size-5", statusColors[submission.status])} />
                              )}
                              <div>
                                <p
                                  className={cn(
                                    "text-sm font-semibold uppercase",
                                    statusColors[submission.status]
                                  )}
                                >
                                  {submission.status}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Submitted {formatDate(submission.createdAt)}
                                </p>
                              </div>
                            </div>

                            {submission.feedback && (
                              <div className="rounded-md border bg-muted/40 p-3">
                                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  Feedback
                                </p>
                                <p className="text-sm text-foreground">{submission.feedback}</p>
                              </div>
                            )}

                            {submission.status === "PENDING" && (
                              <p className="text-xs text-pending">
                                Your submission is pending review by the teacher.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                            <Send className="size-8 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              No submission yet
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Write your solution and click Submit
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  )
}