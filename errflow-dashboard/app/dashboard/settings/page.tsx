"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProjects } from "@/hooks/use-projects"
import { useCreateApiKey } from "@/hooks/use-api-keys"
import { useApiKeys } from "@/hooks/use-api-keys"
import { toast } from "sonner"
import {
  GeneralSection,
  ProjectsSection,
  ApiKeysSection,
  NotificationsSection,
  UsageSection,
} from "@/components/settings"
import { SETTINGS_TABS } from "@/constants/settings"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  githubOwner: string
  githubRepo: string
  defaultBranch: string
  status: "ACTIVE" | "INACTIVE"
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const apiKeySchema = z.object({
  label: z.string().min(1, "Label is required"),
  projectId: z.string().min(1, "Project is required"),
})

type ApiKeyFormData = z.infer<typeof apiKeySchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A"
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? "N/A" : format(d, "MMM d, yyyy")
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)

  const { data: projects } = useProjects()
  const { data: apiKeys } = useApiKeys()

  // Debug: Log when createdApiKey changes
  console.log("SettingsPage - createdApiKey:", createdApiKey)

  function handleApiKeyCreated(key: string | null) {
    console.log("handleApiKeyCreated called with:", key)
    setCreatedApiKey(key)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          {SETTINGS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralSection />
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <ProjectsSection />
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          <ApiKeysSection
            projects={projects}
            createdApiKey={createdApiKey}
            onApiKeyCreated={handleApiKeyCreated}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationsSection projects={projects} />
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <UsageSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}