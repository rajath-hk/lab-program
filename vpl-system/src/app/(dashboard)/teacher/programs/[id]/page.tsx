"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  Code,
  FileQuestion,
  ChevronUp,
  ChevronDown,
  Upload,
  History,
  Search,
  FlaskConical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import TestCaseEditor from "@/components/teacher/TestCaseEditor"

interface Question {
  id: string
  title: string
  description: string
  difficulty: string
  orderNumber: number
  starterCode: string | null
  submissionCount: number
  createdAt: string
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
  EASY: { label: "Easy", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  MEDIUM: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  HARD: { label: "Hard", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  EXTREME: { label: "Extreme", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

interface Program {
  id: string
  title: string
  description: string
  unlockDate: string
  deadline: string | null
  questions: Question[]
  _count: { questions: number }
}

export default function ProgramDetailPage() {
  const params = useParams()
  const router = useRouter()
  const programId = params.id as string

  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Question modal
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [qTitle, setQTitle] = useState("")
  const [qDescription, setQDescription] = useState("")
  const [qDifficulty, setQDifficulty] = useState("EASY")
  const [qStarterCode, setQStarterCode] = useState("")
  const [qTestCases, setQTestCases] = useState<{ input: string; expectedOutput: string }[]>([])
  const [qSaving, setQSaving] = useState(false)
  const [qError, setQError] = useState<string | null>(null)

  // Search filter
  const [questionSearch, setQuestionSearch] = useState("")
  const [showTestCases, setShowTestCases] = useState(false)

  // Bulk upload
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ success: boolean; count?: number; error?: string; details?: any[] } | null>(null)
  const [showBulkHistory, setShowBulkHistory] = useState(false)
  const [bulkHistory, setBulkHistory] = useState<any[]>([])
  const [bulkHistoryLoading, setBulkHistoryLoading] = useState(false)

  // Delete confirmation
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchProgram = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/programs/${programId}`)
      if (!res.ok) throw new Error("Failed to fetch program")
      setProgram(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => {
    fetchProgram()
  }, [fetchProgram])

  function resetQuestionForm() {
    setQTitle("")
    setQDescription("")
    setQDifficulty("EASY")
    setQStarterCode("")
    setQTestCases([])
    setQError(null)
  }

  function openAddQuestion() {
    resetQuestionForm()
    setEditingQuestion(null)
    setShowQuestionModal(true)
  }

  function openEditQuestion(q: Question) {
    setEditingQuestion(q)
    setQTitle(q.title)
    setQDescription(q.description)
    setQDifficulty(q.difficulty || "EASY")
    setQStarterCode(q.starterCode || "")
    try {
      const parsed = JSON.parse((q as any).testCases || "[]")
      setQTestCases(Array.isArray(parsed) ? parsed : [])
    } catch {
      setQTestCases([])
    }
    setQError(null)
    setShowQuestionModal(true)
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault()
    setQSaving(true)
    setQError(null)

    try {
      const body = {
        title: qTitle,
        description: qDescription,
        difficulty: qDifficulty,
        starterCode: qStarterCode || null,
        testCases: qTestCases,
      }

      const url = editingQuestion
        ? `/api/teacher/programs/${programId}/questions/${editingQuestion.id}`
        : `/api/teacher/programs/${programId}/questions`

      const method = editingQuestion ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save question")
      }

      setShowQuestionModal(false)
      resetQuestionForm()
      fetchProgram()
    } catch (err: any) {
      setQError(err.message)
    } finally {
      setQSaving(false)
    }
  }

  async function handleDeleteQuestion() {
    if (!deletingQuestion) return
    setDeleteError(null)

    try {
      const res = await fetch(
        `/api/teacher/programs/${programId}/questions/${deletingQuestion.id}`,
        { method: "DELETE" }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete question")
      }

      setDeletingQuestion(null)
      setDeleteError(null)
      fetchProgram()
    } catch (err: any) {
      setDeleteError(err.message)
    }
  }

  async function moveQuestion(index: number, direction: "up" | "down") {
    if (!program) return

    const questions = [...program.questions]
    const newIndex = direction === "up" ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= questions.length) return

    // Swap order numbers
    const temp = questions[index].orderNumber
    questions[index].orderNumber = questions[newIndex].orderNumber
    questions[newIndex].orderNumber = temp

    // Swap positions in array
    ;[questions[index], questions[newIndex]] = [questions[newIndex], questions[index]]

    setProgram({ ...program, questions })

    // Save to server
    try {
      await fetch(
        `/api/teacher/programs/${programId}/questions/${questions[index].id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder",
            questions: questions.map((q, i) => ({
              id: q.id,
              orderNumber: i + 1,
            })),
          }),
        }
      )
    } catch (err) {
      console.error("Failed to reorder:", err)
      fetchProgram() // revert
    }
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

  if (!program) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Program not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/teacher/programs")}
        >
          Back to Programs
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
          onClick={() => router.push("/teacher/programs")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {program.title}
            </h1>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {program.questions.length} question
              {program.questions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">{program.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unlock: {formatDate(program.unlockDate)}
            {program.deadline && ` | Deadline: ${formatDate(program.deadline)}`}
          </p>
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Questions</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowBulkHistory(true)
                setBulkHistoryLoading(true)
                fetch(`/api/teacher/programs/${programId}/questions/bulk`)
                  .then((r) => r.json())
                  .then((data) => {
                    setBulkHistory(data)
                    setBulkHistoryLoading(false)
                  })
                  .catch(() => setBulkHistoryLoading(false))
              }}
            >
              <History className="size-4" />
              History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowBulkModal(true)
                setBulkResult(null)
              }}
            >
              <Upload className="size-4" />
              Bulk Upload
            </Button>
            <Button onClick={openAddQuestion} size="sm">
              <Plus className="size-4" />
              Add Question
            </Button>
          </div>
        </div>

        {/* Search filter */}
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions..."
            value={questionSearch}
            onChange={(e) => setQuestionSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
        </div>

        {(() => {
          const filtered = program.questions.filter((q) =>
            !questionSearch || q.title.toLowerCase().includes(questionSearch.toLowerCase())
          )
          return filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
            <FileQuestion className="size-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-sm font-medium">No questions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add questions to this program to let students submit code.
            </p>
            <Button className="mt-4" onClick={openAddQuestion} size="sm">
              <Plus className="size-4" />
              Add Your First Question
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((question, index) => (
              <Card key={question.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Drag/reorder handle */}
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        onClick={() => moveQuestion(index, "up")}
                        disabled={index === 0}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <span className="flex h-5 w-5 items-center justify-center text-xs font-medium text-muted-foreground">
                        {question.orderNumber}
                      </span>
                      <button
                        onClick={() => moveQuestion(index, "down")}
                        disabled={index === program.questions.length - 1}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>

                    {/* Question content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{question.title}</h3>
                        {difficultyConfig[question.difficulty] && (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              difficultyConfig[question.difficulty].color
                            )}
                          >
                            {difficultyConfig[question.difficulty].label}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {question.description}
                      </p>

                      {question.starterCode && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5">
                          <Code className="size-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Has starter code
                          </span>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-muted-foreground">
                        {question.submissionCount} submission
                        {question.submissionCount !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEditQuestion(question)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeletingQuestion(question)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
        })()}
      </div>

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editingQuestion ? "Edit Question" : "Add Question"}
              </h2>
              <button
                onClick={() => {
                  setShowQuestionModal(false)
                  resetQuestionForm()
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Question Title
                </label>
                <Input
                  required
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                  placeholder="e.g., Reverse a String"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  required
                  value={qDescription}
                  onChange={(e) => setQDescription(e.target.value)}
                  placeholder="Describe the problem, input/output format, constraints, etc."
                  rows={5}
                  className="h-24 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Difficulty
                </label>
                <select
                  value={qDifficulty}
                  onChange={(e) => setQDifficulty(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                  <option value="EXTREME">Extreme</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Starter Code{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={qStarterCode}
                  onChange={(e) => setQStarterCode(e.target.value)}
                  placeholder={`// Write starter code here (e.g., function signature)\nfunction solution(input) {\n  // Your code here\n  return input;\n}\n`}
                  rows={8}
                  className="h-40 w-full min-w-0 rounded-lg border border-input bg-muted/50 px-2.5 py-1.5 font-mono text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                  spellCheck={false}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This code will be pre-filled in the editor when students start
                  this question.
                </p>
              </div>

              {/* Test Cases */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTestCases(!showTestCases)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FlaskConical className="size-4" />
                  Test Cases
                  <span className="text-xs text-muted-foreground">({qTestCases.length})</span>
                </button>
                {showTestCases && (
                  <div className="mt-3">
                    <TestCaseEditor
                      testCases={qTestCases}
                      onChange={setQTestCases}
                    />
                  </div>
                )}
              </div>

              {qError && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {qError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowQuestionModal(false)
                    resetQuestionForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={qSaving}>
                  {qSaving && <Loader2 className="size-4 animate-spin" />}
                  {editingQuestion ? "Save Changes" : "Add Question"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Question Confirmation */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete Question</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong>{deletingQuestion.title}</strong>? This will also delete
              all associated submissions. This action cannot be undone.
            </p>

            {deleteError && (
              <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeletingQuestion(null)
                  setDeleteError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteQuestion}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Bulk Upload Questions</h2>
              <button
                onClick={() => {
                  setShowBulkModal(false)
                  setBulkResult(null)
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-medium">Excel Format</h3>
                <p className="text-xs text-muted-foreground">
                  Upload an .xlsx file with the following columns:
                </p>
                <div className="mt-2 overflow-x-auto rounded-lg bg-muted p-3">
                  <code className="text-xs font-mono whitespace-nowrap">
                    Title &nbsp;| Description &nbsp;| Difficulty &nbsp;| StarterCode &nbsp;| OrderNumber
                  </code>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li><strong>Title</strong> (required) - Question title</li>
                  <li><strong>Description</strong> (required) - Question description</li>
                  <li><strong>Difficulty</strong> (optional, default: Easy) - Easy / Medium / Hard / Extreme</li>
                  <li><strong>StarterCode</strong> (optional) - Starter code for students</li>
                  <li><strong>OrderNumber</strong> (optional) - Order number (auto-assigned if omitted)</li>
                </ul>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const file = formData.get("file") as File

                  if (!file) {
                    setBulkResult({ success: false, error: "Please select a file" })
                    return
                  }

                  setBulkUploading(true)
                  setBulkResult(null)

                  try {
                    const fd = new FormData()
                    fd.append("file", file)

                    const res = await fetch(`/api/teacher/programs/${programId}/questions/bulk`, {
                      method: "POST",
                      body: fd,
                    })

                    const data = await res.json()

                    if (!res.ok) {
                      setBulkResult({
                        success: false,
                        error: data.error,
                        details: data.details,
                      })
                    } else {
                      setBulkResult({ success: true, count: data.count })
                      fetchProgram()
                    }
                  } catch (err: any) {
                    setBulkResult({ success: false, error: err.message })
                  } finally {
                    setBulkUploading(false)
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Select Excel File
                  </label>
                  <Input
                    type="file"
                    name="file"
                    accept=".xlsx,.xls"
                    required
                  />
                </div>

                {bulkUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Uploading and processing...
                  </div>
                )}

                {bulkResult && !bulkResult.success && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <p className="font-medium">{bulkResult.error}</p>
                    {bulkResult.details && bulkResult.details.length > 0 && (
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {bulkResult.details.map((d: any, i: number) => (
                          <li key={i}>
                            Row {d.row}: {d.error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {bulkResult && bulkResult.success && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/30 dark:bg-green-950/30 dark:text-green-400">
                    Successfully uploaded {bulkResult.count} question
                    {bulkResult.count !== 1 ? "s" : ""}!
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowBulkModal(false)
                      setBulkResult(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={bulkUploading}>
                    {bulkUploading && <Loader2 className="size-4 animate-spin" />}
                    Upload
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload History Modal */}
      {showBulkHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Bulk Upload History</h2>
              <button
                onClick={() => setShowBulkHistory(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-6">
              {bulkHistoryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : bulkHistory.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No bulk uploads yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bulkHistory.map((upload: any) => (
                    <div
                      key={upload.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{upload.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(upload.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {upload.questionCount} question{upload.questionCount !== 1 ? "s" : ""} uploaded
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setShowBulkHistory(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
