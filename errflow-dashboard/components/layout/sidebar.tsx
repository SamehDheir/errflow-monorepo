"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, AlertCircle, GitPullRequest, Settings, User, X } from "lucide-react"
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
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 bg-[#1C1A1B] text-white flex flex-col z-50 transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "w-64"
        )}
        suppressHydrationWarning
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold">errflow</h1>
          <button
            onClick={() => onOpenChange(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" suppressHydrationWarning>
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard" ? safePathname === "/dashboard" : safePathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive ? "bg-[#EA4C48] text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                suppressHydrationWarning
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.showBadge && newErrorsCount > 0 && (
                  <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {newErrorsCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <Link
          href="/dashboard/profile"
          onClick={() => onOpenChange(false)}
          className="p-4 border-t border-border hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-[#EA4C48] text-white flex-shrink-0">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{orgName}</p>
            </div>
            <span className="text-xs bg-[#EA4C48] px-2 py-0.5 rounded flex-shrink-0">{plan}</span>
            <ThemeToggle />
          </div>
        </Link>
      </aside>
    </>
  )
}
