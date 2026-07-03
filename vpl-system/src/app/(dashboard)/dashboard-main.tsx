"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isEditor = pathname.includes("/questions/")

  return (
    <main className={cn("flex-1", isEditor ? "overflow-hidden" : "overflow-auto")}>
      <div className={cn(isEditor ? "h-full" : "mx-auto max-w-7xl p-6")}>
        {children}
      </div>
    </main>
  )
}