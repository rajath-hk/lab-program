"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"

// How often to check user activity and refresh the session (in ms)
const ACTIVITY_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes

// Debounce window — if user was active within this window, consider them active
const ACTIVITY_DEBOUNCE = 60 * 1000 // 1 minute

export default function SessionActivityTracker() {
  const { update } = useSession()
  const lastActivityRef = useRef<number>(Date.now())
  const lastRefreshRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const tryRefreshSession = useCallback(() => {
    const now = Date.now()

    // Only refresh if there was user activity since the last refresh
    if (lastActivityRef.current > lastRefreshRef.current) {
      // Only refresh if enough time has passed
      if (now - lastRefreshRef.current >= ACTIVITY_REFRESH_INTERVAL) {
        lastRefreshRef.current = now
        update()
      }
    }
  }, [update])

  useEffect(() => {
    // Track user activity events
    const events = ["mousedown", "keydown", "touchstart", "scroll", "wheel"]
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }))

    // Periodically check if we should refresh the session
    timerRef.current = setInterval(tryRefreshSession, ACTIVITY_REFRESH_INTERVAL)

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity))
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [handleActivity, tryRefreshSession])

  // This component doesn't render anything
  return null
}
