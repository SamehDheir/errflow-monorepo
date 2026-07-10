"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, ExternalLink, Github, RefreshCw } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useProjects, useCreateProject } from "@/hooks/use-projects"
import { useGitHubRepositories } from "@/hooks/use-github-repositories"
import { toast } from "sonner"
import { DeleteProjectButton } from "@/components/settings"
import { GitHubRepository } from "@/types"

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  githubOwner: z.string().min(1, "GitHub owner is required"),
  githubRepo: z.string().min(1, "GitHub repo is required"),
  defaultBranch: z.string().min(1, "Default branch is required"),
  githubToken: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface Project {
  id: string
  name: string
  githubOwner: string
  githubRepo: string
  defaultBranch: string
  status: "ACTIVE" | "INACTIVE"
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

function NewProjectDialog() {
  const [open, setOpen] = useState(false)
  const [showGithubRepos, setShowGithubRepos] = useState(false)
  const projectForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { defaultBranch: "main" },
  })
  const createProjectMutation = useCreateProject()
  const githubReposQuery = useGitHubRepositories()

  function handleFetchGithubRepos() {
    githubReposQuery.refetch()
    setShowGithubRepos(true)
  }

  function handleSelectRepo(repo: GitHubRepository) {
    const [owner, repoName] = repo.full_name.split("/")
    projectForm.setValue("name", repo.name)
    projectForm.setValue("githubOwner", owner)
    projectForm.setValue("githubRepo", repoName)
    projectForm.setValue("defaultBranch", repo.default_branch)
    setShowGithubRepos(false)
  }

  function handleProjectSubmit(data: ProjectFormData) {
    createProjectMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Project created successfully")
        setOpen(false)
        projectForm.reset()
        setShowGithubRepos(false)
      },
      onError: (error: Error) => {
        toast.error(`Failed to create project: ${error.message}`)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        setShowGithubRepos(false)
        projectForm.reset()
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new GitHub repository to monitor
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={projectForm.handleSubmit(handleProjectSubmit)}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchGithubRepos}
                disabled={githubReposQuery.isFetching}
                className="flex-1"
              >
                <Github className="h-4 w-4 mr-2" />
                {githubReposQuery.isFetching ? "Fetching..." : "Fetch from GitHub"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleFetchGithubRepos}
                disabled={githubReposQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${githubReposQuery.isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {showGithubRepos && githubReposQuery.data && (
              <div className="space-y-2">
                <Label>Select a repository</Label>
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {githubReposQuery.data.data.map((repo: GitHubRepository) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => handleSelectRepo(repo)}
                      className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{repo.full_name}</div>
                          {repo.description && (
                            <div className="text-sm text-gray-500">{repo.description}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {repo.language && <span className="mr-2">{repo.language}</span>}
                            {repo.private && <span className="mr-2">Private</span>}
                            Updated {new Date(repo.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showGithubRepos && githubReposQuery.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
                Failed to fetch repositories. Please log in with GitHub OAuth or enter details manually.
              </div>
            )}

            <div className="border-t pt-4">
              {(
                [
                  { field: "name", label: "Project Name", placeholder: "My App" },
                  { field: "githubOwner", label: "GitHub Owner", placeholder: "username" },
                  { field: "githubRepo", label: "GitHub Repo", placeholder: "repository" },
                  { field: "defaultBranch", label: "Default Branch", placeholder: "main" },
                ] as const
              ).map(({ field, label, placeholder }) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input {...projectForm.register(field)} placeholder={placeholder} />
                  {projectForm.formState.errors[field] && (
                    <p className="text-sm text-red-600">
                      {projectForm.formState.errors[field]?.message}
                    </p>
                  )}
                </div>
              ))}
              <div className="space-y-2">
                <Label>GitHub Token (Optional)</Label>
                <Input
                  {...projectForm.register("githubToken")}
                  type="password"
                  placeholder="ghp_..."
                />
                <p className="text-xs text-gray-500">
                  Only needed if not using GitHub OAuth. Needs repo scope.{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Get yours here
                  </a>
                </p>
              </div>
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
            <Button type="submit" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ProjectsSection() {
  const { data: projects, isLoading: projectsLoading } = useProjects()

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <NewProjectDialog />
      </div>

      <div className="grid gap-4">
        {projectsLoading
          ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
          : (projects as Project[])?.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="font-semibold">{project.name}</h3>
                    <a
                      href={`${project.githubRepo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      {project.githubRepo}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-gray-500">
                      Default branch: {project.defaultBranch}
                    </p>
                    <StatusBadge
                      active={project.status === "ACTIVE"}
                      activeLabel="ACTIVE"
                      inactiveLabel="INACTIVE"
                    />
                  </div>
                  <DeleteProjectButton projectId={project.id} />
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
