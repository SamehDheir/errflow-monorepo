"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, 
  Building2, 
  FolderKanban, 
  AlertTriangle, 
  Key, 
  TrendingUp,
  Activity,
  Wrench,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"

interface RecentUser {
  id: string
  email: string
  name: string
  createdAt: string
}

interface RecentOrganization {
  id: string
  name: string
  slug: string
  createdAt: string
}

interface RecentError {
  id: string
  message: string
  severity: string
  createdAt: string
}

interface RecentFix {
  id: string
  status: string
  confidenceScore: number
  createdAt: string
}

interface RecentActivity {
  recentUsers: RecentUser[]
  recentOrganizations: RecentOrganization[]
  recentErrors: RecentError[]
  recentFixes: RecentFix[]
}

interface SystemOverview {
  totalUsers: number
  totalOrganizations: number
  totalProjects: number
  totalErrors: number
  totalApiKeys: number
  totalPullRequests: number
  recentActivity: RecentActivity
}

// Badge colors per severity
const severityColor: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
}

// Badge colors per fix status
const fixStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case "SUCCESS": return <CheckCircle className="h-3.5 w-3.5 text-green-400" />
    case "FAILED":  return <XCircle    className="h-3.5 w-3.5 text-red-400"   />
    default:        return <Clock      className="h-3.5 w-3.5 text-yellow-400"/>
  }
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<SystemOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const data = await adminApi.get<SystemOverview>('/admin/stats/overview')
        setOverview(data)
      } catch (err) {
        setError('Failed to fetch system overview')
        console.error('Error fetching overview:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchOverview()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20 bg-slate-700" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 bg-slate-700" />
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

  const stats = [
    { title: "Total Users",      value: overview?.totalUsers         || 0, icon: Users,        color: "text-blue-400",   bgColor: "bg-blue-500/10"   },
    { title: "Organizations",    value: overview?.totalOrganizations  || 0, icon: Building2,    color: "text-green-400",  bgColor: "bg-green-500/10"  },
    { title: "Projects",         value: overview?.totalProjects       || 0, icon: FolderKanban, color: "text-purple-400", bgColor: "bg-purple-500/10" },
    { title: "Total Errors",     value: overview?.totalErrors         || 0, icon: AlertTriangle, color: "text-red-400",   bgColor: "bg-red-500/10"    },
    { title: "API Keys",         value: overview?.totalApiKeys        || 0, icon: Key,          color: "text-yellow-400", bgColor: "bg-yellow-500/10" },
    { title: "Pull Requests",    value: overview?.totalPullRequests   || 0, icon: TrendingUp,   color: "text-cyan-400",   bgColor: "bg-cyan-500/10"   },
  ]

  const activity = overview?.recentActivity

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-2">System overview and management controls</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity — all 4 sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Users */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-400" />
              <span>Recent Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity?.recentUsers?.length ? (
                activity.recentUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No recent users</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Organizations */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-green-400" />
              <span>Recent Organizations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity?.recentOrganizations?.length ? (
                activity.recentOrganizations.slice(0, 5).map((org) => (
                  <div key={org.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{org.name}</div>
                      <div className="text-xs text-slate-400">{org.slug}</div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No recent organizations</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span>Recent Errors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity?.recentErrors?.length ? (
                activity.recentErrors.slice(0, 5).map((err) => (
                  <div key={err.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{err.message}</div>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${severityColor[err.severity?.toLowerCase()] ?? "bg-slate-600 text-slate-300"}`}>
                        {err.severity}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">
                      {new Date(err.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No recent errors</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Fix Attempts */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-purple-400" />
              <span>Recent Fix Attempts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity?.recentFixes?.length ? (
                activity.recentFixes.slice(0, 5).map((fix) => (
                  <div key={fix.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {fixStatusIcon(fix.status)}
                      <div>
                        <div className="text-sm font-medium text-white capitalize">{fix.status.toLowerCase()}</div>
                        <div className="text-xs text-slate-400">
                          Confidence: {fix.confidenceScore != null
                            ? `${Math.round(fix.confidenceScore * 100)}%`
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(fix.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No recent fixes</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
              <h3 className="font-medium text-white mb-2">User Management</h3>
              <p className="text-sm text-slate-400 mb-4">Create, suspend, or manage user accounts</p>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Create User</button>
                <button className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg">View All Users</button>
              </div>
            </div>
            <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
              <h3 className="font-medium text-white mb-2">Organization Control</h3>
              <p className="text-sm text-slate-400 mb-4">Manage organizations and billing plans</p>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">Create Organization</button>
                <button className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg">View All Organizations</button>
              </div>
            </div>
            <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
              <h3 className="font-medium text-white mb-2">System Monitoring</h3>
              <p className="text-sm text-slate-400 mb-4">Monitor errors and system performance</p>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">View Errors</button>
                <button className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg">System Stats</button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}