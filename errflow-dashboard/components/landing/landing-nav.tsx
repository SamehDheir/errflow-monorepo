"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { LayoutDashboard, LogOut, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#quickstart", label: "Quickstart" },
  { href: "#pricing", label: "Pricing" },
]

export function LandingNav() {
  const { data: session, status } = useSession()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2" aria-label="errflow home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-xl font-bold tracking-tight">errflow</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {status === "loading" ? (
            <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" aria-hidden />
          ) : session ? (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
