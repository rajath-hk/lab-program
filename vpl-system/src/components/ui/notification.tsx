"use client"
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  message: string
  type: "info" | "success" | "error"
}

interface NotificationContextValue {
  notify: (message: string, type?: Notification["type"]) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider")
  return ctx
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const notify = useCallback((message: string, type: Notification["type"] = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    setNotifications((prev) => [...prev, { id, message, type }])
  }, [])

  // Auto‑dismiss after 6 seconds
  useEffect(() => {
    if (notifications.length === 0) return
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(1))
    }, 6000)
    return () => clearTimeout(timer)
  }, [notifications])

  const remove = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id))

  const bgColors: Record<Notification["type"], string> = {
    info: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    error: "bg-red-500/10 text-red-600",
  }

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {/* Notification container */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm">
        {notifications.map((note) => (
          <div
            key={note.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-md p-3 shadow-md",
              bgColors[note.type]
            )}
          >
            <span className="flex-1 text-sm">{note.message}</span>
            <button
              onClick={() => remove(note.id)}
              className="rounded-full p-0.5 hover:bg-muted/20"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
