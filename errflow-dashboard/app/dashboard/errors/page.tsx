"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useErrors } from "@/hooks/use-errors"
import { useIgnoreError } from "@/hooks/use-errors"
import { StatusBadge } from "@/components/shared/status-badge"
import { SeverityBadge } from "@/components/shared/severity-badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, Search, X } from "lucide-react"
import { truncate, formatRelativeTime } from "@/lib/utils"
import { ErrorStatus, ErrorSeverity } from "@/types"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "sonner"

const STATUSES: (ErrorStatus | "ALL")[] = ["ALL", "RECEIVED", "QUEUED", "PROCESSING", "FIX_READY", "FAILED", "IGNORED"]
const SEVERITIES: (ErrorSeverity | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"]

export default function ErrorsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ErrorStatus | "ALL">("ALL")
  const [severity, setSeverity] = useState<ErrorSeverity | "ALL">("ALL")
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const { confirm, ConfirmComponent } = useConfirm()

  const { data, isLoading } = useErrors({
    limit: 20,
    status: status === "ALL" ? undefined : status,
    severity: severity === "ALL" ? undefined : severity,
    search: debouncedSearch || undefined,
    page,
  })

  const ignoreMutation = useIgnoreError()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const hasFilters = status !== "ALL" || severity !== "ALL" || debouncedSearch.length > 0

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/errors/${id}`)
  }

  const handleIgnore = (id: string) => {
    confirm({
      title: "Ignore Error",
      description: "Are you sure you want to ignore this error? You won't receive notifications for it anymore.",
      confirmText: "Ignore Error",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        ignoreMutation.mutate(id)
        toast.success("Error ignored successfully")
      }
    })
  }

  const resetFilters = () => {
    setStatus("ALL")
    setSeverity("ALL")
    setSearch("")
    setPage(1)
  }

  const errors = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 20)

  return (
    <>
      <ConfirmComponent />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h1 className="text-2xl font-bold">Errors</h1>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by error message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <X className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </Card>

        <Card>
          {/* Mobile/Tablet View - Card Layout */}
          <div className="block lg:hidden">
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {hasFilters ? "No errors match your filters" : "No errors yet"}
                </div>
              ) : (
                errors.map((error) => (
                  <ContextMenu key={error.id}>
                    <ContextMenuTrigger asChild>
                      <Card
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(error.id)}
                      >
                        <div className="space-y-3">
                          {/* Header with Severity and Status */}
                          <div className="flex items-center justify-between">
                            <SeverityBadge severity={error.severity} />
                            <div className="flex items-center gap-2">
                              <StatusBadge status={error.status} />
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Error Message */}
                          <div className="font-mono text-xs break-all">
                            {truncate(error.message, 100)}
                          </div>

                          {/* File and Occurrences */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{error.file}:{error.line}</span>
                            <span className="font-medium">{error.occurrences}x</span>
                          </div>

                          {/* Last Seen */}
                          <div className="text-xs text-muted-foreground">
                            Last seen: {formatRelativeTime(error.lastSeen)}
                          </div>
                        </div>
                      </Card>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleIgnore(error.id)}>
                        Ignore error
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              )}
            </div>
          </div>

          {/* Desktop View - Table Layout */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead>Error Message</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="w-[120px]">Occurrences</TableHead>
                  <TableHead className="w-[120px]">Last seen</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : errors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {hasFilters ? "No errors match your filters" : "No errors yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  errors.map((error) => (
                    <ContextMenu key={error.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleRowClick(error.id)}
                        >
                          <TableCell>
                            <SeverityBadge severity={error.severity} />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {truncate(error.message, 60)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {error.file}:{error.line}
                          </TableCell>
                          <TableCell className="text-sm">{error.occurrences}x</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatRelativeTime(error.lastSeen)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={error.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleIgnore(error.id)}>
                          Ignore error
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total} errors
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}