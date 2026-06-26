import { ErrorSeverity } from "@/types"
import { cn } from "@/lib/utils"

interface SeverityBadgeProps {
  severity: ErrorSeverity
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const styles = {
    CRITICAL: "bg-red-600 text-white",
    HIGH: "bg-[#fef2f2]0 text-white",
    MEDIUM: "bg-yellow-500 text-gray-900",
    LOW: "bg-gray-400 text-white",
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
