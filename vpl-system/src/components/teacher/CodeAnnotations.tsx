"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, X, MessageSquare, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Annotation {
  lineNumber: number
  text: string
  createdAt: string
}

interface CodeAnnotationsProps {
  code: string
  annotations: Annotation[]
  onAnnotationsChange: (annotations: Annotation[]) => void
  readonly?: boolean
}

export default function CodeAnnotations({
  code,
  annotations,
  onAnnotationsChange,
  readonly = false,
}: CodeAnnotationsProps) {
  const codeLines = code.split("\n")
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [annotationText, setAnnotationText] = useState("")
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(false)
  const annotationInputRef = useRef<HTMLTextAreaElement>(null)

  // Focus annotation input when a line is selected
  useEffect(() => {
    if (selectedLine !== null && annotationInputRef.current) {
      annotationInputRef.current.focus()
    }
  }, [selectedLine])

  function getAnnotationForLine(lineNumber: number): Annotation | undefined {
    return annotations.find((a) => a.lineNumber === lineNumber)
  }

  function handleLineClick(lineNumber: number) {
    if (readonly) return
    setSelectedLine(lineNumber)
    const existing = getAnnotationForLine(lineNumber)
    setAnnotationText(existing?.text || "")
    setShowAnnotationPanel(true)
  }

  function saveAnnotation() {
    if (selectedLine === null) return

    const trimmed = annotationText.trim()
    let updated: Annotation[]

    if (trimmed) {
      const existing = getAnnotationForLine(selectedLine)
      if (existing) {
        updated = annotations.map((a) =>
          a.lineNumber === selectedLine ? { ...a, text: trimmed } : a
        )
      } else {
        updated = [
          ...annotations,
          {
            lineNumber: selectedLine,
            text: trimmed,
            createdAt: new Date().toISOString(),
          },
        ]
      }
    } else {
      // Remove annotation if text is empty
      updated = annotations.filter((a) => a.lineNumber !== selectedLine)
    }

    onAnnotationsChange(updated)
    setShowAnnotationPanel(false)
    setSelectedLine(null)
    setAnnotationText("")
  }

  function removeAnnotation(lineNumber: number) {
    const updated = annotations.filter((a) => a.lineNumber !== lineNumber)
    onAnnotationsChange(updated)
    if (selectedLine === lineNumber) {
      setShowAnnotationPanel(false)
      setSelectedLine(null)
      setAnnotationText("")
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Line numbers + Code */}
      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Line numbers column */}
        <div className="shrink-0 select-none border-r bg-muted/20 text-right font-mono text-xs leading-relaxed text-muted-foreground">
          {codeLines.map((_, index) => {
            const lineNum = index + 1
            const hasAnnotation = !!getAnnotationForLine(lineNum)
            return (
              <div
                key={lineNum}
                className={cn(
                  "flex h-[22px] cursor-pointer items-center justify-end pr-3 transition-colors hover:bg-muted/40",
                  hasAnnotation && "text-info font-semibold",
                  selectedLine === lineNum && "bg-info/10"
                )}
                onClick={() => handleLineClick(lineNum)}
                title={hasAnnotation ? "Click to edit annotation" : "Click to add annotation"}
              >
                {hasAnnotation && !readonly && (
                  <MessageSquare className="mr-1 size-2.5 text-info" />
                )}
                {lineNum}
              </div>
            )
          })}
        </div>

        {/* Code content */}
        <div className="flex-1 overflow-x-auto">
          {codeLines.map((line, index) => {
            const lineNum = index + 1
            const annotation = getAnnotationForLine(lineNum)
            return (
              <div key={lineNum} className="relative">
                <div
                  className={cn(
                    "flex h-[22px] cursor-pointer items-center px-4 font-mono text-sm leading-relaxed transition-colors hover:bg-muted/20",
                    annotation && "bg-info/5",
                    selectedLine === lineNum && "bg-info/10"
                  )}
                  onClick={() => handleLineClick(lineNum)}
                >
                  {line || "\u00A0"}
                </div>
                {/* Inline annotation indicator */}
                {annotation && (
                  <div
                    className={cn(
                      "ml-4 mr-4 mb-1 rounded border border-info/20 bg-info/5 px-3 py-1.5 text-xs leading-relaxed",
                      readonly && "bg-approved-bg/5 border-approved/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-foreground/80">{annotation.text}</span>
                      {!readonly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeAnnotation(lineNum)
                          }}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Annotation input panel */}
      {showAnnotationPanel && !readonly && (
        <div className="flex w-72 shrink-0 flex-col border-l bg-muted/20">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium">
              Line {selectedLine} Annotation
            </span>
            <button
              onClick={() => {
                setShowAnnotationPanel(false)
                setSelectedLine(null)
                setAnnotationText("")
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex-1 p-3">
            <div className="mb-2 rounded bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
              <code>Line {selectedLine}: {codeLines[(selectedLine || 1) - 1]?.trim() || "(empty)"}</code>
            </div>
            <textarea
              ref={annotationInputRef}
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Write your feedback for this line..."
              rows={4}
              className="w-full rounded border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-info placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault()
                  saveAnnotation()
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Ctrl+Enter to save
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setShowAnnotationPanel(false)
                    setSelectedLine(null)
                    setAnnotationText("")
                  }}
                >
                  Cancel
                </Button>
                <Button size="xs" onClick={saveAnnotation}>
                  {annotationText.trim() && getAnnotationForLine(selectedLine || 0)
                    ? "Update"
                    : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
