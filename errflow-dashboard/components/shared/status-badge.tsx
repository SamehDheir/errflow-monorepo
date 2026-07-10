import { ErrorStatus } from "@/types"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface StatusBadgeProps {
  status: ErrorStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    RECEIVED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    QUEUED: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    PROCESSING: "bg-primary/10 text-primary",
    FIX_READY: "bg-green-500/15 text-green-600 dark:text-green-400",
    FAILED: "bg-destructive/10 text-destructive",
    IGNORED: "bg-muted text-muted-foreground",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        styles[status]
      )}
    >
      {status === "PROCESSING" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status.replace("_", " ")}
    </span>
  )
}
