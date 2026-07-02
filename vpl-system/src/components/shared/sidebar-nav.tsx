"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  FileCode,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  UserIcon,
  Cpu,
  History,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: string
}

interface SidebarNavProps {
  user: NavUser
}

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  roles: string[]
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    label: "Departments",
    href: "/admin/departments",
    icon: Building2,
    roles: ["ADMIN"],
  },
  {
    label: "System",
    href: "/admin/piston",
    icon: Cpu,
    roles: ["ADMIN"],
  },
  {
    label: "Activity Logs",
    href: "/admin/activity",
    icon: History,
    roles: ["ADMIN"],
  },
  {
    label: "Dashboard",
    href: "/teacher",
    icon: LayoutDashboard,
    roles: ["TEACHER"],
  },
  {
    label: "Programs",
    href: "/teacher/programs",
    icon: BookOpen,
    roles: ["TEACHER"],
  },
  {
    label: "Submissions",
    href: "/teacher/submissions",
    icon: FileCode,
    roles: ["TEACHER"],
  },
  {
    label: "Students",
    href: "/teacher/students",
    icon: GraduationCap,
    roles: ["TEACHER"],
  },
  {
    label: "Settings",
    href: "/teacher/settings",
    icon: Settings,
    roles: ["TEACHER"],
  },
  {
    label: "Dashboard",
    href: "/student",
    icon: LayoutDashboard,
    roles: ["STUDENT"],
  },
  {
    label: "My Programs",
    href: "/student/programs",
    icon: BookOpen,
    roles: ["STUDENT"],
  },
  {
    label: "My Submissions",
    href: "/student/submissions",
    icon: FileCode,
    roles: ["STUDENT"],
  },
]

const roleBadgeColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TEACHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STUDENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 flex size-9 items-center justify-center rounded-lg border bg-background md:hidden"
        aria-label="Toggle navigation"
      >
        <Menu className="size-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar transition-all duration-300",
          "fixed inset-y-0 left-0 z-50 md:static md:z-0",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            "flex h-14 items-center border-b px-4",
            collapsed && "justify-center px-2"
          )}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
              <div className="flex size-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                V
              </div>
              <span className="truncate">VPL System</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="flex items-center justify-center">
              <div className="flex size-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                V
              </div>
            </Link>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {filteredNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User area */}
        <div
          className={cn(
            "border-t p-2",
            collapsed && "flex flex-col items-center"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg p-2",
              collapsed && "justify-center"
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/10 text-sidebar-primary">
              <UserIcon className="size-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </p>
                <span
                  className={cn(
                    "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-tight",
                    roleBadgeColors[user.role] || "bg-muted text-muted-foreground"
                  )}
                >
                  {user.role}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogOut className="size-4 shrink-0" />
              <span>Sign out</span>
            </button>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-20 size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn("size-3 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </aside>
    </>
  )
}
