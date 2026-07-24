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
  FlaskConical,
  Network,
  BarChart,

} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Panel, Group, Separator } from "react-resizable-panels"
import SqlTerminal from "@/components/student/SqlTerminal"
import TestCaseResults from "@/components/student/TestCaseResults"
import NetworkSimulation, { type NetworkTopology } from "@/components/student/NetworkSimulation"

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

interface SqlResultRow {
  [key: string]: unknown
}

interface SqlResult {
  type: "table" | "message" | "error"
  columns?: string[]
  rows?: SqlResultRow[]
  affectedRows?: number
  message: string
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
  { id: "sql", label: "SQL (Oracle)", ext: ".sql" },
  { id: "plaintext", label: "Plain Text", ext: ".txt" },
]

type ConsoleTab = "testcase" | "output" | "submission" | "networklab" | "charts"

// --- localStorage draft helpers ---
const DRAFT_PREFIX = "amc-draft-"

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
    sqlResults?: SqlResult[]
    testResults?: { input: string; expectedOutput: string; actualOutput: string; passed: boolean }[]
    images?: { name: string; data: string; mime: string }[]
  } | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // SQL terminal state
  const [sqlResults, setSqlResults] = useState<SqlResult[] | null>(null)
  const [sqlFullScreen, setSqlFullScreen] = useState(false)

  // Console state
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase")
  const [testCaseRunResults, setTestCaseRunResults] = useState<{ input: string; expectedOutput: string; actualOutput: string; passed: boolean }[] | null>(null)
  const [consoleOpen, setConsoleOpen] = useState(true)

  // Network simulation state
  const isNetworkProgram = question?.program?.title?.toLowerCase().includes("network") ?? false
  const [networkTopology, setNetworkTopology] = useState<NetworkTopology | null>(null)

  // Panel ref for programmatic collapse/expand
  const descPanelRef = useRef<{ collapse: () => void; expand: () => void; isCollapsed: () => boolean } | null>(null)
  const [descriptionCollapsed, setDescriptionCollapsed] = useState(false)

  // Editor font size
  const [fontSize, setFontSize] = useState(14)

  // Draft / auto-save state
  const [hasDraft, setHasDraft] = useState(false)
  const [draftInfo, setDraftInfo] = useState<DraftData | null>(null)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false)
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

    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [])

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
    setSqlResults(null)
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

      const data = await res.json()
      setRunResult(data)
      if (data.sqlResults) {
        setSqlResults(data.sqlResults)
      }
    } catch (err: any) {
      setRunError(err.message)
    } finally {
      setRunning(false)
    }
  }

  async function handleSqlRun(sql: string) {
    setRunning(true)
    setRunResult(null)
    setRunError(null)
    setSqlResults(null)

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sql, language: "sql" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Execution failed")
      }

      const data = await res.json()
      setCode(sql)
      setRunResult(data)
      if (data.sqlResults) {
        setSqlResults(data.sqlResults)
      }
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
    if (!mounted || !question) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

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

    if (submission) return

    const draft = loadDraft(questionId)
    if (draft && draft.code.trim()) {
      const starterOrEmpty = question.starterCode || ""
      if (draft.code !== starterOrEmpty) {
        setHasDraft(true)
        setDraftInfo(draft)
        setShowDraftBanner(true)
      }
    }
  }, [question, mounted, submission, questionId])

  // Log tab switches
  const tabSwitchFirst = useRef(true);
  useEffect(() => {
    if (tabSwitchFirst.current) {
      tabSwitchFirst.current = false;
      return;
    }
    setShowTabSwitchWarning(true);
    fetch("/api/student/tab-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tab: consoleTab, programId, questionId }),
    }).catch(() => {});
  }, [consoleTab, programId, questionId]);

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

  const isSql = language === "sql"

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

      {/* Tab Switch Warning Banner */}
      {showTabSwitchWarning && (
        <div className="flex shrink-0 items-center gap-3 border-b border-yellow-300 bg-yellow-100/10 px-4 py-2 text-sm">
          <AlertCircle className="size-4 text-yellow-600" />
          <span className="text-foreground">You switched tabs while working on this question. This activity is logged.</span>
          <Button size="xs" variant="ghost" onClick={() => setShowTabSwitchWarning(false)} className="ml-auto h-7 gap-1 text-yellow-600 hover:bg-yellow-100/20">
            <X className="size-3" />
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
            defaultSize={400}
            minSize={200}
            maxSize={600}
            collapsible={true}
            collapsedSize={5}
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
                  {question.starterCode && !isSql && (
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

                  {/* For SQL questions - show starter SQL as a sample */}
                  {question.starterCode && isSql && (
                    <div className="mt-6">
                      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Terminal className="size-3.5" />
                        Sample SQL
                      </h3>
                      <div className="overflow-hidden rounded-lg border bg-[#0d1117]/80">
                        <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
                          <code className="font-mono text-[#7ee787]">
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
          <Panel id="editor-panel" defaultSize={60} minSize={30} className="h-full">
            <div className="flex h-full flex-col bg-secondary">
              {/* ---- Editor Toolbar ---- */}
              <div className="flex h-12 shrink-0 items-center justify-between border-b bg-secondary/60 px-4">
                <div className="flex items-center gap-2">
                  <FileCode className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {isSql ? "query.sql" : `code.${SUPPORTED_LANGUAGES.find((l) => l.id === language)?.ext || ".txt"}`}
                  </span>
                  {/* Auto-save indicator */}
                  {hasDraft && !showDraftBanner && !isSql && (
                    <span className="flex items-center gap-1 rounded bg-pending-bg/15 px-1.5 py-0.5 text-xs text-pending">
                      <Save className="size-3" />
                      Saved
                    </span>
                  )}
                  {autoSaving && !isSql && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Font size controls - only for non-SQL */}
                  {!isSql && (
                    <>
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
                    </>
                  )}
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

                  {!isSql && (
                    <>
                      <div className="h-4 w-px bg-border" />
                      {/* Run/Submit buttons for non-SQL */}
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
                    </>
                  )}

                  {/* Submit button - always visible */}
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

              {/* ---- SQL Terminal (full height, no split) ---- */}
              {isSql ? (
                <SqlTerminal
                  onSubmit={handleSqlRun}
                  isRunning={running}
                  results={sqlResults}
                  error={runError}
                  onResultsChange={setSqlResults}
                  fullScreen={sqlFullScreen}
                  onToggleFullScreen={() => setSqlFullScreen(!sqlFullScreen)}
                />
              ) : (
                <>
                  {/* ---- Editor + Console (vertical split panels) ---- */}
                  <Group orientation="vertical" className="flex-1 min-h-0">
                    {/* Editor Area Panel */}
                    <Panel id="editor-area" minSize={20} className="min-h-0">
                      {mounted ? (
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
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary">
                          <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </Panel>

                    {/* ---- Draggable Separator ---- */}
                    {consoleOpen && (
                      <Separator className="group relative flex h-1.5 shrink-0 items-center justify-center bg-transparent transition-colors hover:bg-info/20 data-[resize-handle-active]:bg-info/30 cursor-row-resize">
                        <div className="flex w-8 h-0.5 rounded-full bg-border group-hover:bg-info group-data-[resize-handle-active]:bg-info transition-colors" />
                      </Separator>
                    )}

                    {/* Console Panel (drag-resizable) */}
                    {consoleOpen && (
                      <Panel id="console-panel" defaultSize={100} minSize={50} maxSize={700} className="min-h-0">
                        <div className="flex flex-col h-full bg-secondary border-t">
                    <div className="flex items-center h-10 shrink-0 gap-0 border-b bg-muted/30 overflow-x-auto">
                      {/* Console Tabs */}
                    {/* Test Cases tab (always shown) */}
                    <button
                      onClick={() => setConsoleTab("testcase")}
                      className={cn(
                        "flex h-full items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors",
                        consoleTab === "testcase"
                          ? "border-info text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <FlaskConical className="size-3.5" />
                      Test Cases
                      {runResult?.testResults && (
                        <span className={cn(
                          "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                          runResult.testResults.every(t => t.passed)
                            ? "bg-approved-bg/15 text-approved"
                            : "bg-rejected-bg/15 text-rejected"
                        )}>
                          {runResult.testResults.filter(t => t.passed).length}/{runResult.testResults.length}
                        </span>
                      )}
                    </button>

                    {/* Run Output tab */}
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
                            ? "\u2713"
                            : runResult
                            ? "\u2717"
                            : "!"}
                        </span>
                      )}
                    </button>

                    {/* Charts tab (shown when images are available) */}
                    {runResult?.images && runResult.images.length > 0 && (
                      <button
                        onClick={() => setConsoleTab("charts")}
                        className={cn(
                          "flex h-full items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors",
                          consoleTab === "charts"
                            ? "border-info text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <BarChart className="size-3.5" />
                        Charts ({runResult.images.length})
                      </button>
                    )}

                    {/* Network Lab tab (shown for network programs) */}
                    {isNetworkProgram && (
                      <button
                        onClick={() => setConsoleTab("networklab")}
                        className={cn(
                          "flex h-full items-center gap-1.5 border-b-2 px-3 text-xs font-medium transition-colors",
                          consoleTab === "networklab"
                            ? "border-info text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Network className="size-3.5" />
                        Network Lab
                      </button>
                    )}

                    {/* Submission tab */}
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
                            ? "\u2713"
                            : submission.status === "REJECTED"
                            ? "\u2717"
                            : "~"}
                        </span>
                      )}
                    </button>

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
                      <div className="h-full">
                        <TestCaseResults
                          results={runResult?.testResults || []}
                          isRunning={running}
                        />
                      </div>
                    )}

                    {/* Output Tab */}
                    {consoleTab === "output" && (
                      <div className="flex flex-col h-full">
                        <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
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

                        {/* Stdin Input Area */}
                        <div className="shrink-0 border-b px-3 py-2 bg-muted/20">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              <Terminal className="size-3 inline mr-1" />
                              Stdin Input
                            </label>
                            <span className="text-[10px] text-muted-foreground">
                              For programs that use input()
                            </span>
                          </div>
                          <textarea
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                            placeholder="Enter input for your program here (one value per line)..."
                            rows={2}
                            className="w-full rounded border border-border bg-background/50 px-2.5 py-1.5 font-mono text-xs text-foreground outline-none transition-colors focus:border-info focus:ring-1 focus:ring-info/30 placeholder:text-muted-foreground/60"
                          />
                        </div>
                        <div className="p-0 flex-1 min-h-0 overflow-auto">
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
                              {/* Inline chart images in output */}
                              {runResult.images && runResult.images.length > 0 && (
                                <div className="border-t px-3 py-3">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Generated Charts
                                  </p>
                                  <div className="flex flex-wrap gap-3">
                                    {runResult.images.map((img, i) => (
                                      <div key={i} className="overflow-hidden rounded-lg border bg-background">
                                        <img
                                          src={img.data}
                                          alt={img.name}
                                          className="max-w-full h-auto"
                                          style={{ maxHeight: 300 }}
                                        />
                                        <p className="border-t px-2 py-1 text-[10px] text-muted-foreground">
                                          {img.name}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
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

                    {/* Charts Tab */}
                    {consoleTab === "charts" && (
                      <div className="h-full overflow-auto p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                          <BarChart className="size-4" />
                          Generated Charts
                        </h3>
                        {runResult?.images && runResult.images.length > 0 ? (
                          <div className="flex flex-col gap-4">
                            {runResult.images.map((img, i) => (
                              <div
                                key={i}
                                className="overflow-hidden rounded-lg border bg-background"
                              >
                                <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
                                  <span className="text-xs font-medium">{img.name}</span>
                                </div>
                                <div className="flex items-center justify-center p-4 bg-white/5">
                                  <img
                                    src={img.data}
                                    alt={img.name}
                                    className="max-w-full h-auto"
                                    style={{ maxHeight: 400 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <BarChart className="size-10 mb-2" />
                            <p className="text-sm">No charts generated</p>
                            <p className="text-xs">Run code that creates matplotlib plots</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Network Lab Tab */}
                    {consoleTab === "networklab" && (
                      <div className="h-full overflow-auto">
                        <NetworkSimulation
                          topology={networkTopology}
                          onTopologyChange={setNetworkTopology}
                          isRunning={running}
                          onRunCode={async (runCode: string) => {
                            setCode(runCode)
                            setRunning(true)
                            setRunResult(null)
                            setRunError(null)
                            setSqlResults(null)
                            setConsoleTab("output")
                            setConsoleOpen(true)
                            try {
                              const res = await fetch("/api/execute", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ code: runCode, language: "python", stdin: "" }),
                              })
                              if (!res.ok) {
                                const data = await res.json()
                                throw new Error(data.error || "Execution failed")
                              }
                              const data = await res.json()
                              setRunResult(data)
                              if (data.sqlResults) setSqlResults(data.sqlResults)
                            } catch (err: any) {
                              setRunError(err.message)
                            } finally {
                              setRunning(false)
                            }
                          }}
                        />
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
                    </Panel>
                  )}
                </Group>

                {/* Console Toggle (when hidden) — outside Group */}
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
              </>
            )}
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  )
}
