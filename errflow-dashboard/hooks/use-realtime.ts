import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import { getSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export function useRealtime() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    let mounted = true
    let currentSocket: Socket | null = null

    const connect = async () => {
      try {
        const session = await getSession()
        if (!session?.accessToken) {
          console.log("No session or access token, skipping socket connection")
          return
        }

        const wsUrl = API_URL.replace('/api', '')
        console.log("Attempting socket connection to:", wsUrl)
        console.log("Available transports: websocket, polling")
        
        currentSocket = io(wsUrl, {
          auth: { token: session.accessToken },
          transports: ["websocket", "polling"],
          timeout: 20000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })

        currentSocket.on("connect", () => {
          console.log("✅ Socket connected successfully with transport:", currentSocket?.io.engine.transport.name)
          if (mounted) setIsConnected(true)
        })

        currentSocket.on("disconnect", (reason) => {
          console.log("❌ Socket disconnected, reason:", reason)
          if (mounted) setIsConnected(false)
        })

        currentSocket.on("connect_error", (error) => {
          console.error("🔥 Socket connection error:", error.message)
          console.error("Full error:", error)
          if (mounted) setIsConnected(false)
        })

        currentSocket.on("error.received", (data: { project: { name: string } }) => {
          queryClient.invalidateQueries({ queryKey: ["errors"] })
          toast(`New error captured in ${data.project.name}`)
        })

        currentSocket.on("error.processing", () => {
          queryClient.invalidateQueries({ queryKey: ["error"] })
        })

        currentSocket.on("fix.ready", (data: { error: { message: string }; prNumber: number }) => {
          queryClient.invalidateQueries({ queryKey: ["errors"] })
          queryClient.invalidateQueries({ queryKey: ["pull-requests"] })
          toast.success(`✅ Fix ready for: ${data.error.message} — PR #${data.prNumber}`)
        })

        currentSocket.on("fix.failed", (data: { error: { message: string } }) => {
          queryClient.invalidateQueries({ queryKey: ["errors"] })
          toast.error(`❌ Fix failed for: ${data.error.message}`)
        })

        if (mounted) setSocket(currentSocket)
      } catch (error) {
        console.error("Socket connection error:", error)
        // Don't throw error to prevent redirect loop
      }
    }

    connect()

    return () => {
      mounted = false
      if (currentSocket) {
        currentSocket.disconnect()
        currentSocket.removeAllListeners()
      }
    }
  }, [isMounted, queryClient])

  return { isConnected }
}
