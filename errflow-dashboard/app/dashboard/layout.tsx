"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers"
import { ErrorBoundary } from "@/components/error-boundary"
import { NotificationToasts } from "@/components/notifications/notification-toast"
import { ReactNode } from "react"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <Providers>
      <ErrorBoundary>
        <div className="flex min-h-screen bg-background">
          <Sidebar isOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen} />
          <div className="flex-1 flex flex-col lg:ml-64 ml-0">
            <Navbar
              title="Dashboard"
              showMenuButton={true}
              onMenuClick={() => setIsSidebarOpen(true)}
            />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </ErrorBoundary>
      <NotificationToasts />
      <Toaster />
    </Providers>
  )
}
