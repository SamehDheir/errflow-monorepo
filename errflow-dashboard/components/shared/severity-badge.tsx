import { ErrorSeverity } from "@/types"
import { cn } from "@/lib/utils"

interface SeverityBadgeProps {
  severity: ErrorSeverity
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const styles = {
    CRITICAL: "bg-red-500/15 text-red-600 dark:text-red-400",
    HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    MEDIUM: "bg-amber-500/15 text-amber-600 dark:text-amber-500",
    LOW: "bg-muted text-muted-foreground",
  }

  const icons = {
    CRITICAL: "🔴",
    HIGH: "🟠",
    MEDIUM: "🟡",
    LOW: "⚪",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        styles[severity]
      )}
    >
      {icons[severity]} {severity}
    </span>
  )
}
