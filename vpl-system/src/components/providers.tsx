"use client"

import { SessionProvider } from "next-auth/react"
import { NotificationProvider } from "@/components/ui/notification"
import SessionActivityTracker from "@/components/SessionActivityTracker"

// Refetch session every 5 minutes to check for inactivity timeout
const SESSION_REFETCH_INTERVAL = 5 * 60

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={SESSION_REFETCH_INTERVAL}>
      <SessionActivityTracker />
      <NotificationProvider>{children}</NotificationProvider>
    </SessionProvider>
  )
}
