"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { adminApi } from "@/lib/admin-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FolderKanban, Github, Calendar, Building2, Activity, ToggleLeft } from "lucide-react"

interface ProjectDetail {
  id: string
  name: string
  githubOwner: string
  githubRepo: string
  organizationId: string
  isActive: boolean
  createdAt: string
  organization: {
    id: string
    name: string
    slug: string
  }
  errorEvents?: any[]
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await adminApi.get<ProjectDetail>(`/projects/${params.id}`)
        setProject(data)
      } catch (err) {
        setError('Failed to fetch project details')
        console.error('Error fetching project:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchProject()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <Skeleton className="h-8 w-48 bg-slate-700" />
        <div className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-1/3 bg-slate-700 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/2 bg-slate-700" />
                <Skeleton className="h-4 w-1/3 bg-slate-700" />
                <Skeleton className="h-4 w-1/4 bg-slate-700" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error || 'Project not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Projects
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{project.name}</h1>
        <p className="text-slate-400">{project.githubOwner}/{project.githubRepo}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={project.isActive ? "default" : "secondary"} className={
              project.isActive ? "bg-green-500/20 text-green-400 border-green-500/20" : "bg-slate-700 text-slate-400 border-slate-600"
            }>
              {project.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-white">
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">Error Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {project.errorEvents?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FolderKanban className="h-5 w-5" />
              <span>Project Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">Project Name</p>
              <p className="text-white">{project.name}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Github className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">GitHub Repository</p>
                <p className="text-white">{project.githubOwner}/{project.githubRepo}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Created At</p>
                <p className="text-white">{new Date(project.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ToggleLeft className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Status</p>
                <Badge variant={project.isActive ? "default" : "secondary"} className="mt-1">
                  {project.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Organization</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">Organization Name</p>
              <p className="text-white">{project.organization.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Slug</p>
              <p className="text-white">@{project.organization.slug}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Project Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Activity tracking coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}
