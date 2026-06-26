import { ErrorStatus } from "@/types"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface StatusBadgeProps {
  status: ErrorStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    RECEIVED: "bg-blue-100 text-blue-700",
    QUEUED: "bg-purple-100 text-purple-700",
    PROCESSING: "bg-[#fde8e7] text-[#d43d39]",
    FIX_READY: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    IGNORED: "bg-gray-100 text-gray-700",
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
