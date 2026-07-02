"use client"

import { useEffect, useState } from "react"
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Server,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Cpu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Runtime {
  language: string
  version: string
  aliases: string[]
}

interface TestResult {
  success: boolean
  output?: string
  stdout?: string
  exitCode?: number | null
  error?: string
}

interface PistonHealth {
  status: string
  apiUrl: string
  responseTime: number
  totalRuntimes?: number
  error?: string
  supportedRuntimes: Runtime[]
  unsupportedRuntimes: { language: string; version: string }[]
  testResult: TestResult | null
}

export default function AdminPistonPage() {
  const [health, setHealth] = useState<PistonHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUnsupported, setShowUnsupported] = useState(false)

  async function fetchHealth() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/piston")
      if (!res.ok) throw new Error("Failed to fetch Piston health")
      setHealth(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  const isHealthy = health?.status === "ok"
  const supportedLangs = [
    { id: "python", label: "Python" },
    { id: "javascript", label: "JavaScript" },
    { id: "typescript", label: "TypeScript" },
    { id: "java", label: "Java" },
    { id: "c++", label: "C++" },
    { id: "c", label: "C" },
    { id: "rust", label: "Rust" },
    { id: "go", label: "Go" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Code Execution Engine</h1>
          <p className="mt-1 text-muted-foreground">
            Piston API health check and runtime information
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                isHealthy
                  ? "bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
                  : "bg-red-500/10 text-red-600 ring-1 ring-red-500/20"
              )}
            >
              {isHealthy ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <XCircle className="size-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">Connection Status</CardTitle>
              <CardDescription>
                {isHealthy ? "Piston API is reachable" : "Cannot reach Piston API"}
              </CardDescription>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              isHealthy
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isHealthy ? "bg-green-600" : "bg-red-600"
              )}
            />
            {isHealthy ? "Connected" : "Disconnected"}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">API URL</p>
              <div className="flex items-center gap-1.5 text-sm font-mono">
                <Server className="size-3.5 text-muted-foreground" />
                {health?.apiUrl || "..."}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Response Time</p>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="size-3.5 text-muted-foreground" />
                {health ? `${health.responseTime}ms` : "..."}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Available Runtimes</p>
              <div className="flex items-center gap-1.5 text-sm">
                <Cpu className="size-3.5 text-muted-foreground" />
                {health ? `${health.totalRuntimes ?? 0} languages` : "..."}
              </div>
            </div>
          </div>

          {health?.error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircle className="mt-0.5 size-4 shrink-0" />
              {health.error}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : health ? (
        <>
          {/* Supported Runtimes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supported Runtimes</CardTitle>
              <CardDescription>
                Languages configured for use in the VPL code editor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Language
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Version
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {supportedLangs.map((lang) => {
                      const runtime = health.supportedRuntimes.find(
                        (r) => r.language === lang.id
                      )
                      return (
                        <tr key={lang.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 font-medium">{lang.label}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            {runtime?.version || "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {runtime ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="size-3" />
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                <XCircle className="size-3" />
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Test Execution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="size-4" />
                Test Execution
              </CardTitle>
              <CardDescription>
                Quick test: running print(&quot;Piston is working!&quot;) in Python
              </CardDescription>
            </CardHeader>
            <CardContent>
              {health.testResult ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {health.testResult.success ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="size-3.5" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="size-3.5" />
                        Failed
                      </span>
                    )}
                    {health.testResult.exitCode !== null && (
                      <span className="text-xs text-muted-foreground">
                        Exit code: {health.testResult.exitCode}
                      </span>
                    )}
                  </div>

                  <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-sm font-mono leading-relaxed">
                    {health.testResult.output || health.testResult.stdout || health.testResult.error || "(no output)"}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <XCircle className="size-4" />
                  Test execution failed — the Piston API may not be available.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Other Available Runtimes */}
          {health.unsupportedRuntimes.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setShowUnsupported(!showUnsupported)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Other Runtimes</CardTitle>
                    <CardDescription>
                      {health.unsupportedRuntimes.length} additional languages
                      available on the Piston server
                    </CardDescription>
                  </div>
                  {showUnsupported ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {showUnsupported && (
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {health.unsupportedRuntimes.map((r, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                      >
                        {r.language}
                        <span className="text-muted-foreground">v{r.version}</span>
                      </span>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
