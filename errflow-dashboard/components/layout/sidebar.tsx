"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, AlertCircle, GitPullRequest, Settings, User, X, Zap } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAppStore } from "@/store/app.store"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useOrganization } from "@/hooks/use-organization"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/errors", icon: AlertCircle, label: "Errors", showBadge: true },
  { href: "/dashboard/pull-requests", icon: GitPullRequest, label: "Pull Requests" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
]

function getInitials(name: string | null | undefined) {
  if (!name) return "U"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export interface SidebarProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ isOpen, onOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const { newErrorsCount } = useAppStore()
  const { data: session } = useSession()
  const { data: organization } = useOrganization()

  const userName = session?.user?.name || "User"
  const orgName = organization?.name || session?.organization?.name || "Organization"
  const plan = organization?.plan || session?.organization?.plan || "FREE"

  const safePathname = pathname || ""

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-border bg-card text-card-foreground transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => onOpenChange(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-xl font-bold tracking-tight">errflow</span>
          </Link>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? safePathname === "/dashboard"
                : safePathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.showBadge && newErrorsCount > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-destructive/15 text-destructive"
                    )}
                  >
                    {newErrorsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/profile"
              onClick={() => onOpenChange(false)}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{orgName}</p>
              </div>
              <span className="flex-shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {plan}
              </span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  )
}
