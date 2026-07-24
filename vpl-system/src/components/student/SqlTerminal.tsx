"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Loader2, Terminal, CornerDownLeft, Maximize2, Minimize2 } from "lucide-react"

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

interface SqlTerminalProps {
  onSubmit: (sql: string) => Promise<void>
  isRunning: boolean
  results: SqlResult[] | null
  error: string | null
  onResultsChange: (results: SqlResult[] | null) => void
  fullScreen?: boolean
  onToggleFullScreen?: () => void
}

const HISTORY_KEY = "amc-sql-history"
const BUFFER_KEY = "amc-sql-buffer"

/** Right-align numeric values, left-align text (like SQL*Plus). */
function formatOracleValue(val: unknown): string {
  if (val === null || val === undefined) return ""
  const s = String(val)
  // If it looks numeric (integer or decimal), right-align
  if (/^-?\d+(\.\d+)?$/.test(s)) return s
  // Otherwise left-align (we pad on the right later)
  return s
}

/** Check if a column value should be right-aligned (numeric). */
function isNumericColumn(rows: SqlResultRow[], col: string): boolean {
  if (rows.length === 0) return false
  // Check first few rows
  const sample = rows.slice(0, Math.min(5, rows.length))
  return sample.every((r) => {
    const v = r[col]
    if (v === null || v === undefined) return true
    return /^-?\d+(\.\d+)?$/.test(String(v))
  })
}

export default function SqlTerminal({
  onSubmit,
  isRunning,
  results,
  error,
  onResultsChange,
  fullScreen = false,
  onToggleFullScreen,
}: SqlTerminalProps) {
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [multiLine, setMultiLine] = useState(false)
  const [multiLineBuffer, setMultiLineBuffer] = useState("")

  // SQL buffer — like Oracle's SQL buffer (last statement stored)
  const [sqlBuffer, setSqlBuffer] = useState<string>(() => {
    try {
      return localStorage.getItem(BUFFER_KEY) || ""
    } catch {
      return ""
    }
  })

  // SET options (SQL*Plus-style settings)
  const [setOptions, setSetOptions] = useState({
    linesize: 80,
    pagesize: 14,
    heading: true as boolean,
    feedback: true as boolean,
    nullDisplay: "",
    echo: false as boolean,
  })

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const [outputLines, setOutputLines] = useState<
    { type: "input" | "output" | "error" | "info"; text: string }[]
  >([])

  // Auto-scroll to bottom when new output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [outputLines, results, error])

  // Show welcome message on mount
  useEffect(() => {
    setOutputLines([
      { type: "info", text: "" },
      { type: "info", text: "Oracle-style SQL Terminal (SQL*Plus Compatible)" },
      { type: "info", text: "" },
      { type: "info", text: "  SQL commands:   SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER" },
      { type: "info", text: "  SQL*Plus cmds:  DESC <table>, L (list buffer), / (run buffer), CLEAR" },
      { type: "info", text: "  Special:        DUAL table, SYSDATE, NVL(), TO_DATE(), ROWNUM" },
      { type: "info", text: "  Settings:       SET LINESIZE, SET PAGESIZE, SET HEADING, SET FEEDBACK" },
      { type: "info", text: "" },
      { type: "info", text: "───────────────────────────────────────────────────" },
      { type: "info", text: "" },
    ])
  }, [])

  // ── Render results in Oracle SQL*Plus style ──
  useEffect(() => {
    if (results && results.length > 0) {
      const newLines: typeof outputLines = []

      for (const result of results) {
        if (result.type === "table" && result.columns && result.rows) {
          const cols = result.columns
          const rows = result.rows

          // Determine alignment per column
          const numericCols = cols.map((col) => isNumericColumn(rows, col))

          // Calculate column display widths
          const colWidths = cols.map((col, i) => {
            const headerLen = col.length
            const maxDataLen = rows.reduce((max, row) => {
              const formatted = formatOracleValue(row[col])
              return Math.max(max, formatted.length || 0)
            }, 0)
            // Minimum width = header length; at least 2 chars for readability
            return Math.max(headerLen, maxDataLen, 2)
          })

          // Show page break if there are many rows (SQL*Plus style)
          const pageSize = setOptions.pagesize

          // Optional heading
          if (result.message) {
            newLines.push({ type: "output", text: result.message })
          }

          // Column headers (uppercase, like Oracle)
          if (setOptions.heading) {
            const headerRow = cols
              .map((col, i) => {
                const w = colWidths[i]
                return numericCols[i] ? col.toUpperCase().padStart(w) : col.toUpperCase().padEnd(w)
              })
              .join(" ")
            newLines.push({ type: "output", text: headerRow })

            // Dashed underline under headers (SQL*Plus style: ---- for each column)
            const dashRow = colWidths.map((w) => "-".repeat(w)).join(" ")
            newLines.push({ type: "output", text: dashRow })
          }

          // Data rows
          let rowCountSincePageBreak = 0
          for (let ri = 0; ri < rows.length; ri++) {
            const row = rows[ri]
            const dataRow = cols
              .map((col, i) => {
                const w = colWidths[i]
                const val = row[col] === null || row[col] === undefined
                  ? setOptions.nullDisplay
                  : String(row[col])
                return numericCols[i] ? val.padStart(w) : val.padEnd(w)
              })
              .join(" ")
            newLines.push({ type: "output", text: dataRow })
            rowCountSincePageBreak++

            // Page break handling
            if (pageSize > 0 && rowCountSincePageBreak >= pageSize && ri < rows.length - 1) {
              newLines.push({ type: "output", text: "" })
              rowCountSincePageBreak = 0
            }
          }

          // Footer with row count (SQL*Plus style)
          if (setOptions.feedback) {
            if (rows.length === 0) {
              newLines.push({ type: "output", text: "0 rows selected" })
            } else {
              newLines.push({ type: "output", text: `${rows.length} row(s) selected` })
            }
          }
        } else if (result.type === "error") {
          newLines.push({ type: "error", text: result.message })
        } else {
          // Message type (DDL feedback, etc.)
          newLines.push({ type: "output", text: result.message })
        }
      }

      setOutputLines((prev) => [...prev, ...newLines])
    }
  }, [results, setOptions.heading, setOptions.feedback, setOptions.nullDisplay, setOptions.pagesize])

  // Add error to output
  useEffect(() => {
    if (error) {
      setOutputLines((prev) => [...prev, { type: "error", text: error }])
    }
  }, [error])

  function saveToHistory(sql: string) {
    if (!sql.trim()) return
    const newHistory = [sql, ...history.filter((h) => h !== sql)].slice(0, 50)
    setHistory(newHistory)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
  }

  function handleSetCommand(args: string): boolean {
    const parts = args.trim().split(/\s+/)
    if (parts.length < 2) return false

    const option = parts[0].toUpperCase()
    const value = parts.slice(1).join(" ")

    switch (option) {
      case "LINESIZE": {
        const n = parseInt(value)
        if (!isNaN(n) && n >= 20 && n <= 500) {
          setSetOptions((prev) => ({ ...prev, linesize: n }))
          setOutputLines((prev) => [...prev, { type: "output", text: `LINESIZE set to ${n}` }])
        } else {
          setOutputLines((prev) => [...prev, { type: "error", text: "LINESIZE must be between 20 and 500" }])
        }
        return true
      }
      case "PAGESIZE": {
        const n = parseInt(value)
        if (!isNaN(n) && n >= 0 && n <= 500) {
          setSetOptions((prev) => ({ ...prev, pagesize: n }))
          setOutputLines((prev) => [...prev, { type: "output", text: `PAGESIZE set to ${n}` }])
        } else {
          setOutputLines((prev) => [...prev, { type: "error", text: "PAGESIZE must be between 0 and 500" }])
        }
        return true
      }
      case "HEADING": {
        if (value.toUpperCase() === "ON") {
          setSetOptions((prev) => ({ ...prev, heading: true }))
          setOutputLines((prev) => [...prev, { type: "output", text: "HEADING ON" }])
        } else if (value.toUpperCase() === "OFF") {
          setSetOptions((prev) => ({ ...prev, heading: false }))
          setOutputLines((prev) => [...prev, { type: "output", text: "HEADING OFF" }])
        } else {
          setOutputLines((prev) => [...prev, { type: "error", text: "HEADING must be ON or OFF" }])
        }
        return true
      }
      case "FEEDBACK": {
        if (value.toUpperCase() === "ON") {
          setSetOptions((prev) => ({ ...prev, feedback: true }))
          setOutputLines((prev) => [...prev, { type: "output", text: "FEEDBACK ON" }])
        } else if (value.toUpperCase() === "OFF") {
          setSetOptions((prev) => ({ ...prev, feedback: false }))
          setOutputLines((prev) => [...prev, { type: "output", text: "FEEDBACK OFF" }])
        } else {
          setOutputLines((prev) => [...prev, { type: "error", text: "FEEDBACK must be ON or OFF" }])
        }
        return true
      }
      case "NULL": {
        // SET NULL 'text' — set the null display string
        const nullDisplay = value.replace(/^['"]|['"]$/g, "")
        setSetOptions((prev) => ({ ...prev, nullDisplay }))
        setOutputLines((prev) => [...prev, { type: "output", text: `NULL set to "${nullDisplay}"` }])
        return true
      }
      case "ECHO": {
        if (value.toUpperCase() === "ON") {
          setSetOptions((prev) => ({ ...prev, echo: true }))
          setOutputLines((prev) => [...prev, { type: "output", text: "ECHO ON" }])
        } else if (value.toUpperCase() === "OFF") {
          setSetOptions((prev) => ({ ...prev, echo: false }))
          setOutputLines((prev) => [...prev, { type: "output", text: "ECHO OFF" }])
        } else {
          setOutputLines((prev) => [...prev, { type: "error", text: "ECHO must be ON or OFF" }])
        }
        return true
      }
      default:
        return false
    }
  }

  function handleSpecialCommand(sql: string): boolean {
    const upper = sql.toUpperCase().trim()

    // CLEAR screen (SQL*Plus: CL SCR or CLEAR SCREEN)
    if (upper === "CLEAR" || upper === "CLS" || upper === "CL SCR") {
      setOutputLines([
        { type: "info", text: "" },
        { type: "info", text: "Oracle-style SQL Terminal (SQL*Plus Compatible)" },
        { type: "info", text: "" },
        { type: "info", text: "───────────────────────────────────────────────────" },
        { type: "info", text: "" },
      ])
      onResultsChange(null)
      setInput("")
      return true
    }

    // HELP
    if (upper === "HELP" || upper === "?") {
      setOutputLines((prev) => [
        ...prev,
        { type: "info", text: "" },
        { type: "info", text: "  HELP / ?        - Show this help" },
        { type: "info", text: "  CLEAR           - Clear screen" },
        { type: "info", text: "  DESC <table>    - Describe table structure" },
        { type: "info", text: "  L / LIST        - List SQL buffer" },
        { type: "info", text: "  R / RUN         - Run SQL buffer" },
        { type: "info", text: "  /               - Run SQL buffer" },
        { type: "info", text: "  DEL             - Delete SQL buffer" },
        { type: "info", text: "  C / CHANGE /old/new - Change text in buffer" },
        { type: "info", text: "  CL BUFFER       - Clear SQL buffer" },
        { type: "info", text: "" },
        { type: "info", text: "  SET LINESIZE n  - Set line width (20-500)" },
        { type: "info", text: "  SET PAGESIZE n  - Set rows per page" },
        { type: "info", text: "  SET HEADING ON|OFF - Toggle column headers" },
        { type: "info", text: "  SET FEEDBACK ON|OFF - Toggle row count" },
        { type: "info", text: "  SET NULL 'text' - Set null display text" },
        { type: "info", text: "  SET ECHO ON|OFF - Toggle command echo" },
        { type: "info", text: "" },
      ])
      setInput("")
      return true
    }

    // SET commands
    if (upper.startsWith("SET ")) {
      const args = sql.slice(3).trim()
      handleSetCommand(args)
      setInput("")
      return true
    }

    // L / LIST — list SQL buffer
    if (upper === "L" || upper === "LIST") {
      if (sqlBuffer.trim()) {
        setOutputLines((prev) => [
          ...prev,
          { type: "input", text: `SQL> ${sql}` },
          { type: "output", text: `    1  ${sqlBuffer}` },
        ])
      } else {
        setOutputLines((prev) => [
          ...prev,
          { type: "input", text: `SQL> ${sql}` },
          { type: "info", text: "  No SQL buffer contains SQL text." },
        ])
      }
      setInput("")
      return true
    }

    // R / RUN — run SQL buffer
    if (upper === "R" || upper === "RUN") {
      if (sqlBuffer.trim()) {
        setOutputLines((prev) => [...prev, { type: "input", text: `SQL> ${sql}` }])
        setInput("")
        saveToHistory(sqlBuffer)
        if (setOptions.echo) {
          setOutputLines((prev) => [...prev, { type: "output", text: sqlBuffer }])
        }
        onSubmit(sqlBuffer)
      } else {
        setOutputLines((prev) => [
          ...prev,
          { type: "input", text: `SQL> ${sql}` },
          { type: "info", text: "  No SQL buffer contains SQL text." },
        ])
        setInput("")
      }
      return true
    }

    // / (slash) — run SQL buffer (same as R)
    if (upper === "/") {
      if (sqlBuffer.trim()) {
        setOutputLines((prev) => [...prev, { type: "input", text: `SQL> ${sql}` }])
        setInput("")
        saveToHistory(sqlBuffer)
        if (setOptions.echo) {
          setOutputLines((prev) => [...prev, { type: "output", text: sqlBuffer }])
        }
        onSubmit(sqlBuffer)
      } else {
        setOutputLines((prev) => [
          ...prev,
          { type: "input", text: `SQL> ${sql}` },
          { type: "info", text: "  No SQL buffer contains SQL text." },
        ])
        setInput("")
      }
      return true
    }

    // DEL — delete/clear SQL buffer
    if (upper === "DEL") {
      setSqlBuffer("")
      localStorage.removeItem(BUFFER_KEY)
      setOutputLines((prev) => [
        ...prev,
        { type: "input", text: `SQL> ${sql}` },
        { type: "output", text: "  Buffer cleared." },
      ])
      setInput("")
      return true
    }

    // CL BUFFER or CLEAR BUFFER — clear SQL buffer
    if (upper === "CL BUFFER" || upper === "CLEAR BUFFER") {
      setSqlBuffer("")
      localStorage.removeItem(BUFFER_KEY)
      setOutputLines((prev) => [
        ...prev,
        { type: "input", text: `SQL> ${sql}` },
        { type: "output", text: "  Buffer cleared." },
      ])
      setInput("")
      return true
    }

    // C / CHANGE /old/new — change text in buffer
    if (upper.startsWith("C ") || upper.startsWith("CHANGE ")) {
      const changeCmd = sql.trim()
      // Extract the old/new pattern
      const firstSep = changeCmd.slice(1).trim()
      const sep = firstSep.charAt(0)
      const sepIndex = firstSep.indexOf(sep, 1)
      if (sepIndex > 1) {
        const oldStr = firstSep.slice(1, sepIndex)
        const newStr = firstSep.slice(sepIndex + 1)
        if (sqlBuffer.includes(oldStr)) {
          const newBuffer = sqlBuffer.replace(oldStr, newStr)
          setSqlBuffer(newBuffer)
          localStorage.setItem(BUFFER_KEY, newBuffer)
          setOutputLines((prev) => [
            ...prev,
            { type: "input", text: `SQL> ${sql}` },
            { type: "output", text: `    1  ${newBuffer}` },
          ])
        } else {
          setOutputLines((prev) => [
            ...prev,
            { type: "input", text: `SQL> ${sql}` },
            { type: "info", text: `  '${oldStr}' not found in buffer.` },
          ])
        }
      }
      setInput("")
      return true
    }

    return false
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()

    let sql: string
    if (multiLine) {
      // Check if multiLineBuffer ends with semicolon or slash on new line
      const buffer = multiLineBuffer.trim()
      if (!buffer.endsWith(";") && !buffer.endsWith("\n/")) {
        // Continue multi-line mode
        setInput("")
        return
      }
      sql = buffer.replace(/\n\/$/, "").trim()
      setMultiLine(false)
      setMultiLineBuffer("")
    } else {
      sql = input.trim()
      if (!sql) return

      // Handle SQL*Plus special commands
      // (slash, R, L, SET, etc. — these don't need semicolons)
      const upper = sql.toUpperCase().trim()

      // Single-letter commands and special commands (SET, L, R, /, DEL, C, HELP, CLEAR)
      if (handleSpecialCommand(sql)) return

      // If input is just a word like DESC, HELP, CLEAR without args — pass to API
      if (upper.startsWith("DESC ") || upper.startsWith("DESCRIBE ")) {
        // Pass through to execution - API will handle it
      }

      // If no semicolon at end, enter multi-line mode
      if (!sql.endsWith(";")) {
        setMultiLine(true)
        setMultiLineBuffer(sql + "\n")
        setInput("")
        return
      }

      sql = sql.replace(/;+$/, "").trim()
    }

    // Save to SQL buffer
    setSqlBuffer(sql)
    localStorage.setItem(BUFFER_KEY, sql)

    // Save to history
    saveToHistory(sql)

    // Add input to display
    const displaySql = multiLine ? multiLineBuffer.trim() : input.trim()
    setOutputLines((prev) => [...prev, { type: "input", text: `SQL> ${displaySql}` }])

    // Clear input
    setInput("")
    setHistoryIndex(-1)

    // Execute
    onSubmit(sql + (sql.endsWith(";") ? "" : ";"))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter or Ctrl+Shift+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
      return
    }

    // Enter to submit (if not multi-line)
    if (e.key === "Enter" && !e.shiftKey && !multiLine) {
      e.preventDefault()
      handleSubmit()
      return
    }

    // Shift+Enter for newline
    if (e.key === "Enter" && e.shiftKey) {
      return
    }

    // Up arrow for history
    if (e.key === "ArrowUp" && !multiLine) {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1)
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
      }
      return
    }

    // Down arrow for history
    if (e.key === "ArrowDown" && !multiLine) {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
      } else {
        setHistoryIndex(-1)
        setInput("")
      }
      return
    }

    // Tab for 2-space indent
    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = input.substring(0, start) + "  " + input.substring(end)
      setInput(newValue)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
      return
    }
  }

  // Auto-resize textarea
  function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-[#0d1117] font-mono text-sm",
        fullScreen ? "fixed inset-0 z-[100]" : "h-full"
      )}
    >
      {/* Terminal Header */}
      <div className="flex h-9 shrink-0 items-center border-b border-[#30363d] bg-[#161b22] px-3">
        <Terminal className="size-3.5 text-[#8b949e]" />
        <span className="ml-2 text-xs text-[#8b949e] font-medium">SQL*Plus</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-[#8b949e]">{'SQL>'} Enter to run</span>
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="flex size-6 items-center justify-center rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
              title={fullScreen ? "Exit full screen" : "Full screen"}
            >
              {fullScreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Output Area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 leading-relaxed whitespace-pre"
      >
        {outputLines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "py-[1px]",
              line.type === "input" && "text-[#c9d1d9]",
              line.type === "output" && "text-[#c9d1d9]",
              line.type === "error" && "text-[#ff7b72]",
              line.type === "info" && "text-[#8b949e]"
            )}
          >
            {line.text}
          </div>
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 py-1 text-[#8b949e]">
            <Loader2 className="size-3.5 animate-spin" />
            Executing...
          </div>
        )}
        {results && results.length > 0 && !isRunning && (
          <div className="mt-2 text-[10px] text-[#8b949e] border-t border-[#30363d] pt-2">
            {results.filter((r) => r.type === "error").length > 0 ? (
              <span className="text-[#ff7b72]">
                {results.filter((r) => r.type === "error").length} error(s)
              </span>
            ) : (
              <span>
                {results.length} statement(s) executed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Prompt & Input Area */}
      <div className="shrink-0 border-t border-[#30363d] bg-[#161b22]">
        {/* Multi-line indicator */}
        {multiLine && (
          <div className="flex items-center gap-2 border-b border-[#30363d] px-3 py-1.5">
            <span className="text-[10px] text-[#d29922] font-medium bg-[#d29922]/10 px-1.5 py-0.5 rounded">
              MULTI-LINE
            </span>
            <span className="text-[10px] text-[#8b949e]">
              Type ; then Enter to submit
            </span>
            <button
              onClick={() => {
                setMultiLine(false)
                setMultiLineBuffer("")
              }}
              className="ml-auto text-[10px] text-[#8b949e] hover:text-[#c9d1d9]"
            >
              Cancel
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-start gap-0 p-2">
          <span className="shrink-0 text-[#58a6ff] font-semibold pt-2 pl-2 select-none">
            SQL&gt;{" "}
          </span>
          <textarea
            ref={inputRef}
            value={multiLine ? multiLineBuffer : input}
            onChange={(e) => {
              if (multiLine) {
                setMultiLineBuffer(e.target.value)
              } else {
                setInput(e.target.value)
              }
              adjustTextareaHeight(e.target)
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              multiLine
                ? "Continue typing... (end with ;)"
                : 'Enter SQL or SQL*Plus command'
            }
            rows={1}
            disabled={isRunning}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-[#c9d1d9] outline-none placeholder:text-[#484f58] disabled:opacity-50 font-mono text-sm"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isRunning || (!multiLine && !input.trim())}
            className="shrink-0 mt-1.5 mr-1 flex size-7 items-center justify-center rounded text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Execute (Enter)"
          >
            <CornerDownLeft className="size-3.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
