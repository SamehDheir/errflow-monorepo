"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Check, AlertTriangle, X, RefreshCw } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import { PRStatus } from "@/types"
import { usePullRequests } from "@/hooks/use-pull-requests"
import { useQueryClient } from "@tanstack/react-query"

function getProjectName(pr: any): string {
  // Try to get project name from various sources
  if (pr.project?.name) return pr.project.name
  if (pr.projectName) return pr.projectName

  // Extract from GitHub URL if available
  if (pr.url) {
    try {
      const url = new URL(pr.url)
      const pathParts = url.pathname.split('/')
      if (pathParts.length >= 3 && pathParts[1] && pathParts[2]) {
        return `${pathParts[1]}/${pathParts[2]}`
      }
    } catch (e) {
      // Invalid URL, continue to fallback
    }
  }

  // Extract from branch name if it looks like a GitHub branch
  if (pr.branch && pr.branch.includes('/')) {
    const parts = pr.branch.split('/')
    if (parts.length >= 2) {
      return parts.slice(0, 2).join('/')
    }
  }

  return "Unknown Project"
}

export default function PullRequestsPage() {
  const [status, setStatus] = useState<PRStatus | "ALL">("ALL")
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = usePullRequests(status === "ALL" ? undefined : status)

  const handleRefresh = async () => {
    // Invalidate and refetch to force fresh data from server
    await queryClient.invalidateQueries({ queryKey: ["pull-requests"] })
    await refetch()
  }

  const prs = data?.pullRequests || []
  const stats = data?.stats || { total: 0, merged: 0, open: 0, avgConfidence: 0 }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold">Pull Requests</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Select value={status} onValueChange={(value: any) => setStatus(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="MERGED">Merged</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total PRs" value={stats.total} />
        <StatsCard label="Merged" value={stats.merged} subtitle={`${Math.round((stats.merged / stats.total) * 100) || 0}%`} />
        <StatsCard label="Open" value={stats.open} />
        <StatsCard label="Avg Confidence" value={`${stats.avgConfidence}%`} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">PR #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-[100px]">Confidence</TableHead>
              <TableHead className="w-[80px]">Tests</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Opened</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : prs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No pull requests yet
                </TableCell>
              </TableRow>
            ) : (
              prs.map((pr: any) => (
                <TableRow key={pr.id}>
                  <TableCell className="font-mono text-sm">
                    {pr.url ? (
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#EA4C48] hover:underline"
                      >
                        #{pr.number || "N/A"}
                      </a>
                    ) : (
                      <span>#{pr.number || "N/A"}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{pr.title || "Untitled PR"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getProjectName(pr)}
                  </TableCell>
                  <TableCell>
                    <ConfidenceBadge confidence={pr.confidence} />
                  </TableCell>
                  <TableCell>
                    {pr.testsPassed === true && <Check className="h-4 w-4 text-green-600" />}
                    {pr.testsSkipped === true && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    {pr.testsFailed === true && <X className="h-4 w-4 text-red-600" />}
                    {(pr.testsPassed === false || pr.testsPassed === undefined) && pr.testsFailed !== true && pr.testsSkipped !== true && (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PRStatusBadge status={pr.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelativeTime(pr.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a href={pr.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function StatsCard({ label, value, subtitle }: { label: string; value: number | string; subtitle?: string }) {
  return (
    <Card>
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </Card>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  if (confidence === null || confidence === undefined) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-muted-foreground">
        N/A
      </span>
    )
  }
  const color = confidence >= 70 ? "bg-green-100 text-green-700" : confidence >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {confidence}%
    </span>
  )
}

function PRStatusBadge({ status }: { status: PRStatus }) {
  const styles = {
    OPEN: "bg-green-100 text-green-700",
    MERGED: "bg-purple-100 text-purple-700",
    CLOSED: "bg-muted text-foreground",
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}
