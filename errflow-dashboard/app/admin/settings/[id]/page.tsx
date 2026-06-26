"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { adminApi } from "@/lib/admin-auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  ChevronLeft,
  Shield,
  Clock,
  Globe,
  Monitor,
  Database,
  ArrowRightLeft,
  Activity
} from "lucide-react"

// يمكنك نقل هذه الواجهات إلى ملف types مشترك لتجنب التكرار
interface AuditLog {
  id: string
  adminId: string
  adminEmail: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  CREATE:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  UPDATE:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  DELETE:    "bg-red-500/15 text-red-400 border-red-500/30",
  ACTIVATE:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  DEACTIVATE:"bg-orange-500/15 text-orange-400 border-orange-500/30",
  SUSPEND:   "bg-red-500/15 text-red-400 border-red-500/30",
  UNSUSPEND: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  LOGIN:     "bg-violet-500/15 text-violet-400 border-violet-500/30",
  LOGOUT:    "bg-slate-500/15 text-slate-400 border-slate-500/30",
}

export default function AuditLogDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [log, setLog] = useState<AuditLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogDetails = useCallback(async () => {
    try {
      const response = await adminApi.get<AuditLog>(`/admin/audit/logs/${id}`)
      setLog(response)
    } catch (err) {
      console.error("Error fetching audit log details:", err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchLogDetails()
  }, [fetchLogDetails, id])

  const formatJSON = (data: any) => {
    if (!data) return null
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      return JSON.stringify(parsed, null, 2)
    } catch (e) {
      return String(data)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32 bg-slate-700 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full bg-slate-700 lg:col-span-1" />
          <Skeleton className="h-64 w-full bg-slate-700 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-16 w-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Log Not Found</h2>
        <p className="text-slate-400 mb-6">The audit log you are looking for does not exist or has been removed.</p>
        <Button onClick={() => router.push('/admin/audit')} variant="outline" className="border-slate-600">
          Back to Logs
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/admin/audit')}
          className="border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Audit Log Details
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wider border uppercase ${ACTION_COLORS[log.action] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}>
              {log.action}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">ID: {log.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Meta Data */}
        <div className="space-y-6 lg:col-span-1">
          {/* Actor Info */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-400" />
                Actor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Admin Email</p>
                <p className="text-slate-200 font-medium">{log.adminEmail}</p>
              </div>
              <Separator className="bg-slate-700" />
              <div>
                <p className="text-sm text-slate-400 mb-1">Admin ID</p>
                <p className="text-slate-200 font-mono text-sm">{log.adminId}</p>
              </div>
            </CardContent>
          </Card>

          {/* Context Info */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-400" />
                Context & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-400">Timestamp</p>
                  <p className="text-slate-200 text-sm">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-400">IP Address</p>
                  <p className="text-slate-200 font-mono text-sm">{log.ipAddress || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Monitor className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-400">User Agent</p>
                  <p className="text-slate-200 text-xs break-all leading-relaxed">{log.userAgent || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Resource & Changes */}
        <div className="space-y-6 lg:col-span-2">
          {/* Target Resource */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-400" />
                Target Resource
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-8">
              <div>
                <p className="text-sm text-slate-400 mb-1">Resource Type</p>
                <p className="text-slate-200 font-medium">{log.resourceType}</p>
              </div>
              {log.resourceId && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Resource ID</p>
                  <p className="text-slate-200 font-mono text-sm bg-slate-900 px-2 py-1 rounded border border-slate-700">
                    {log.resourceId}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Changes (Diff View) */}
          {(log.oldValues || log.newValues) && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-orange-400" />
                  Data Changes
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Detailed view of the payload and modifications made during this action.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Old Values */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-t-md">
                      <span className="text-sm font-medium text-red-400">Old Values (Previous State)</span>
                    </div>
                    <div className="bg-[#0d1117] border border-slate-700 rounded-b-md p-4 overflow-x-auto">
                      {log.oldValues ? (
                        <pre className="text-xs text-slate-300 font-mono">
                          {formatJSON(log.oldValues)}
                        </pre>
                      ) : (
                        <span className="text-slate-500 text-sm italic">No previous data</span>
                      )}
                    </div>
                  </div>

                  {/* New Values */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-t-md">
                      <span className="text-sm font-medium text-emerald-400">New Values (Current State)</span>
                    </div>
                    <div className="bg-[#0d1117] border border-slate-700 rounded-b-md p-4 overflow-x-auto">
                      {log.newValues ? (
                        <pre className="text-xs text-slate-300 font-mono">
                          {formatJSON(log.newValues)}
                        </pre>
                      ) : (
                        <span className="text-slate-500 text-sm italic">No new data</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}