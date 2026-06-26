import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { io, Socket } from "socket.io-client"

export interface Notification {
  type: "error" | "pr" | "fix" | "system"
  title: string
  message: string
  data?: any
  timestamp: Date
}

export function useWebSocket() {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!session?.accessToken) return

    // Initialize socket connection
    const wsUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    console.log("WebSocket connecting to:", wsUrl)
    const socket = io(wsUrl, {
      auth: {
        token: session.accessToken,
      },
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      console.log("✅ WebSocket connected successfully with transport:", socket.io.engine.transport.name)
      setIsConnected(true)
    })

    socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket disconnected, reason:", reason)
      setIsConnected(false)
    })

    socket.on("connect_error", (error) => {
      console.error("🔥 WebSocket connection error:", error.message)
      console.error("Full error:", error)
      setIsConnected(false)
    })

    // Listen for notifications
    socket.on("notification", (notification: Notification) => {
      console.log("Received notification:", notification)
      setNotifications((prev) => [notification, ...prev])
      
      // Show toast notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
        })
      }
    })

    socket.on("error-update", (error: any) => {
      console.log("Error update:", error)
      setNotifications((prev) => [
        {
          type: "error",
          title: "New Error",
          message: error.message,
          data: error,
          timestamp: new Date(),
        },
        ...prev,
      ])
    })

    socket.on("pr-update", (pr: any) => {
      console.log("PR update:", pr)
      setNotifications((prev) => [
        {
          type: "pr",
          title: "Pull Request Update",
          message: `PR #${pr.number} is now ${pr.status}`,
          data: pr,
          timestamp: new Date(),
        },
        ...prev,
      ])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [session?.accessToken])

  const clearNotifications = () => {
    setNotifications([])
  }

  return {
    isConnected,
    notifications,
    clearNotifications,
    socket: socketRef.current,
  }
}
