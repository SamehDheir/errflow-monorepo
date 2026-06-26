"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FolderKanban, Github, Search, Filter, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Project {
  id: string
  name: string
  githubOwner: string
  githubRepo: string
  organizationId: string
  organization: {
    name: string
    slug: string
  }
  isActive: boolean
  createdAt: string
}

interface ProjectsResponse {
  data: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function fetchAdminProjects(): Promise<Project[]> {
  const res = await adminApi.get<ProjectsResponse>('/admin/projects') // ✅ صح
  return res.data ?? []
}

export default function AdminProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleToggleProjectStatus = async (projectId: string) => {
    try {
      await adminApi.put(`/admin/projects/${projectId}/toggle-status`)
      setProjects(await fetchAdminProjects()) // ✅ صح
    } catch (error) {
      console.error('Error toggling project status:', error)
      alert('Failed to toggle project status')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return

    try {
      await adminApi.delete(`/admin/projects/${projectId}`)
      setProjects(await fetchAdminProjects()) // ✅ صح
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    }
  }

  useEffect(() => {
    fetchAdminProjects()
      .then(setProjects)
      .catch((err) => {
        setError('Failed to fetch projects')
        console.error('Error fetching projects:', err)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.githubRepo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 bg-slate-700" />
          <Skeleton className="h-10 w-32 bg-slate-700" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <Skeleton className="h-5 w-1/3 bg-slate-700 mb-2" />
                <Skeleton className="h-4 w-1/4 bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 mt-2">Manage all projects across organizations</p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <FolderKanban className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No projects found</p>
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project.id} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <button
                        onClick={() => router.push(`/admin/projects/${project.id}`)}
                        className="text-lg font-semibold text-white hover:text-blue-400 cursor-pointer"
                      >
                        {project.name}
                      </button>
                      <Badge
                        variant={project.isActive ? "default" : "secondary"}
                        className={project.isActive
                          ? "bg-green-500/20 text-green-400 border-green-500/20"
                          : "bg-slate-700 text-slate-400 border-slate-600"}
                      >
                        {project.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Github className="h-4 w-4" />
                        <span>{project.githubOwner}/{project.githubRepo}</span>
                      </div>
                      <span>•</span>
                      <span>{project.organization?.name}</span>
                      <span>•</span>
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleProjectStatus(project.id)}
                      className={project.isActive
                        ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                        : "text-green-400 hover:text-green-300 hover:bg-green-500/10"}
                    >
                      {project.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{projects.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{projects.filter(p => p.isActive).length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Inactive Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{projects.filter(p => !p.isActive).length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}