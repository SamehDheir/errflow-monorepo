"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowRight, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GetStartedButtonProps {
  /** Label shown to logged-out visitors. */
  label?: string
  size?: "default" | "lg"
  className?: string
}

/**
 * Session-aware primary CTA. Sends logged-in users to their dashboard and
 * everyone else to sign-up. Kept as a small client island so the rest of the
 * landing page can be server-rendered.
 */
export function GetStartedButton({
  label = "Get started free",
  size = "lg",
  className,
}: GetStartedButtonProps) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className={cn("h-11 w-44 animate-pulse rounded-lg bg-muted", className)} aria-hidden />
  }

  const marketingSize = "h-11 px-6 text-base"

  if (session) {
    return (
      <Button asChild size={size} className={cn(marketingSize, className)}>
        <Link href="/dashboard">
          Go to dashboard
          <LayoutDashboard className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild size={size} className={cn(marketingSize, className)}>
      <Link href="/register">
        {label}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Link>
    </Button>
  )
}
