"use client"

import { useEffect, useRef } from "react"
import { X, AlertCircle, CheckCircle, GitPullRequest, AlertTriangle } from "lucide-react"
import { useWebSocket, Notification } from "@/hooks/use-websocket"
import { toast } from "sonner"

export function NotificationToasts() {
  const { notifications, clearNotifications } = useWebSocket()
  const processedNotificationsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    notifications.forEach((notification) => {
      const notificationId = `${notification.title}-${notification.message}-${notification.timestamp}`

      // Skip if already processed
      if (processedNotificationsRef.current.has(notificationId)) {
        return
      }

      processedNotificationsRef.current.add(notificationId)

      const icon = getNotificationIcon(notification.type)
      const toastFn = notification.type === "error" ? toast.error : toast.success

      toastFn(notification.title, {
        description: notification.message,
        icon: icon,
        action: {
          label: "Dismiss",
          onClick: () => clearNotifications(),
        },
      })
    })

    // Clear notifications after showing them as toasts
    // Use setTimeout to avoid setState during render
    if (notifications.length > 0) {
      setTimeout(() => clearNotifications(), 0)
    }
  }, [notifications, clearNotifications])

  return null // This component only handles side effects (showing toasts)
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-600" />
    case "pr":
      return <GitPullRequest className="h-4 w-4 text-blue-600" />
    case "fix":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    default:
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
  }
}
