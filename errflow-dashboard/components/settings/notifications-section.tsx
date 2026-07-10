"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Mail, Bell, TestTube, AlertTriangle, Info, CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"

interface Project {
  id: string
  name: string
}

interface NotificationSettings {
  email: string
  enabled: boolean
  severity: "ALL" | "HIGH" | "CRITICAL"
}

interface NotificationProjectCardProps {
  project: Project
}

function NotificationProjectCard({ project }: NotificationProjectCardProps) {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<NotificationSettings>({
    email: session?.user?.email || "",
    enabled: true,
    severity: "HIGH",
  })
  const [isSaving, setIsSaving] = useState(false)

  const testNotificationMutation = useMutation({
    mutationFn: (data: { email: string; projectId: string }) =>
      api.post("/notifications/test", data),
    onSuccess: (response: any) => {
      if (response.warning) {
        toast.warning(`⚠️ ${response.message}`, {
          description: response.details,
          duration: 8000,
        });
      } else if (response.error) {
        toast.error(`❌ ${response.message}`, {
          description: response.details,
          duration: 8000,
        });
      } else {
        toast.success("✅ Test email sent successfully! Check your inbox.", {
          description: `Email ID: ${response.emailId || 'N/A'}`,
        });
      }
    },
    onError: (error: Error) =>
      toast.error(`❌ Failed to send test email: ${error.message}`),
  })

  const handleSaveSettings = async () => {
    setIsSaving(true)
    // Simulate API call - replace with actual endpoint when available
    await new Promise(resolve => setTimeout(resolve, 500))
    toast.success("💾 Notification settings saved!")
    setIsSaving(false)
  }

  const severityInfo = {
    ALL: { color: "bg-blue-500/15 text-blue-600 dark:text-blue-400", icon: Info, label: "All Errors" },
    HIGH: { color: "bg-amber-500/15 text-amber-600 dark:text-amber-500", icon: AlertTriangle, label: "High & Critical" },
    CRITICAL: { color: "bg-destructive/10 text-destructive", icon: AlertTriangle, label: "Critical Only" },
  }

  const SeverityIcon = severityInfo[settings.severity].icon

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <CardDescription>Configure error notifications</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={settings.enabled ? "default" : "secondary"}
              className={settings.enabled ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-900" : ""}
            >
              {settings.enabled ? "✓ Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Get alerted when errors occur</p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        {settings.enabled && (
          <>
            <Separator />

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor={`email-${project.id}`} className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Notification Email
              </Label>
              <Input
                id={`email-${project.id}`}
                type="email"
                placeholder="alerts@example.com"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="max-w-md"
              />
              <p className="text-xs text-muted-foreground">
                Default: {session?.user?.email || "Your account email"}
              </p>
            </div>

            {/* Severity Level */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Minimum Severity Level
              </Label>
              <div className="flex items-center gap-3">
                <Select
                  value={settings.severity}
                  onValueChange={(value) => setSettings({ ...settings, severity: value as any })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        All Errors
                      </div>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        High & Critical
                      </div>
                    </SelectItem>
                    <SelectItem value="CRITICAL">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        Critical Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Badge className={severityInfo[settings.severity].color}>
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {severityInfo[settings.severity].label}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  testNotificationMutation.mutate({
                    email: settings.email || session?.user?.email || "",
                    projectId: project.id
                  })
                }
                disabled={testNotificationMutation.isPending}
                className="gap-2"
              >
                {testNotificationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current dark:border-white" />
                    Sending...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>

              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current dark:border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface NotificationsSectionProps {
  projects?: Project[]
}

export function NotificationsSection({ projects }: NotificationsSectionProps) {
  if (!projects?.length) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Projects Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a project first to configure notification settings
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Notification Settings</h2>
          <p className="text-sm text-muted-foreground">Configure how and when you receive error alerts</p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {projects.length} Project{projects.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <NotificationProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
