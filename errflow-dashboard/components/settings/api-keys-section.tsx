"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Copy, Check, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/hooks/use-api-keys"
import { toast } from "sonner"
import { CreateApiKeyResponse } from "@/types"

const apiKeySchema = z.object({
  label: z.string().min(1, "Label is required"),
  projectId: z.string().min(1, "Project is required"),
})

type ApiKeyFormData = z.infer<typeof apiKeySchema>

interface ApiKey {
  id: string
  label: string
  isActive: boolean
  createdAt: string
}

interface Project {
  id: string
  name: string
}

function StatusBadge({ active, activeLabel = "Active", inactiveLabel = "Inactive" }: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A"
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function NewApiKeyDialog({ projects, onApiKeyCreated }: {
  projects?: Project[]
  onApiKeyCreated?: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const apiKeyForm = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  })
  const createApiKeyMutation = useCreateApiKey()

  function handleApiKeySubmit(data: ApiKeyFormData) {
    console.log("Creating API key with data:", data)
    createApiKeyMutation.mutate(data, {
      onSuccess: (response: CreateApiKeyResponse) => {
        console.log("API key created successfully:", response)
        apiKeyForm.reset()
        setOpen(false)
        toast.success("API key created — copy it now, it won't be shown again.")
        onApiKeyCreated?.(response.key)
      },
      onError: (error: Error) => {
        console.error("API key creation failed:", error)
        toast.error(`Failed to create API key: ${error.message}`)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for your application
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={apiKeyForm.handleSubmit(handleApiKeySubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input {...apiKeyForm.register("label")} placeholder="Production" />
              {apiKeyForm.formState.errors.label && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {apiKeyForm.formState.errors.label.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                onValueChange={(value) =>
                  apiKeyForm.setValue("projectId", value, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {apiKeyForm.formState.errors.projectId && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {apiKeyForm.formState.errors.projectId.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createApiKeyMutation.isPending}>
              {createApiKeyMutation.isPending ? "Creating..." : "Create Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ApiKeysSectionProps {
  projects?: Project[]
  createdApiKey?: string | null
  onApiKeyCreated?: (key: string | null) => void
}

function DeleteApiKeyDialog({ apiKey, onConfirm, isPending }: {
  apiKey: { id: string; label: string }
  onConfirm: () => void
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    onConfirm()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400">Delete API Key</DialogTitle>
          <DialogDescription className="text-red-600/80 dark:text-white">
            Are you sure you want to delete the API key &quot;{apiKey.label}&quot;?
            This action cannot be undone and any applications using this key will stop working immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            {isPending ? "Deleting..." : "Delete Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ApiKeysSection({ projects, createdApiKey, onApiKeyCreated }: ApiKeysSectionProps) {
  const [copied, setCopied] = useState(false)
  const { data: apiKeys, isLoading: apiKeysLoading } = useApiKeys()
  const revokeApiKeyMutation = useDeleteApiKey()

  // Debug: Log when createdApiKey changes
  console.log("ApiKeysSection - createdApiKey:", createdApiKey)

  function handleCopyKey() {
    if (!createdApiKey) return
    console.log("Copying API key:", createdApiKey)
    navigator.clipboard.writeText(createdApiKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDeleteKey(keyId: string) {
    revokeApiKeyMutation.mutate(keyId, {
      onSuccess: () => {
        toast.success("API key deleted successfully")
      },
      onError: (error: Error) => {
        toast.error(`Failed to delete API key: ${error.message}`)
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <NewApiKeyDialog projects={projects} onApiKeyCreated={onApiKeyCreated} />
      </div>

      {createdApiKey && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-100 dark:bg-red-900 rounded-full p-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    🔑 API Key Generated - Save Immediately
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    This API key will only be shown once. Copy it now and store it securely.
                    You won't be able to retrieve it again.
                  </p>
                  <div className="bg-card border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono break-all text-gray-900 dark:text-gray-100">
                        {createdApiKey}
                      </code>
                      <Button
                        size="sm"
                        onClick={handleCopyKey}
                        className={copied ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Key
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onApiKeyCreated?.(null);
                      }}
                      className="text-red-600 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900"
                    >
                      I've saved it
                    </Button>
                    <span className="text-xs text-red-600 dark:text-red-400">
                      ⚠️ This key will disappear permanently
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeysLoading
                ? [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
                : (apiKeys as ApiKey[])?.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.label}</TableCell>
                    <TableCell>
                      <StatusBadge active={Boolean(key.isActive)} />
                    </TableCell>
                    <TableCell>{formatDate(key.createdAt)}</TableCell>
                    <TableCell>
                      <DeleteApiKeyDialog
                        apiKey={{ id: key.id, label: key.label }}
                        onConfirm={() => handleDeleteKey(key.id)}
                        isPending={revokeApiKeyMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}

            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
