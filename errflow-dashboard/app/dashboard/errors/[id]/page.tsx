"use client"

import React, { useState } from "react"
import { useError, useIgnoreError, useCreatePrAnyway, useRetryFix } from "@/hooks/use-errors"
import { StatusBadge } from "@/components/shared/status-badge"
import { SeverityBadge } from "@/components/shared/severity-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, X, Loader2, Copy, ExternalLink, AlertCircle, CheckCircle2, Clock, Eye, RotateCcw, GitPullRequest, Code2 } from "lucide-react"
import { formatDateTime, formatRelativeTime } from "@/lib/utils"
import ReactDiffViewer from "react-diff-viewer-continued"

interface Step {
  label: string
  status: "pending" | "done" | "failed"
}

export default function ErrorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const { data: error, isLoading } = useError(id)
  const ignoreMutation = useIgnoreError()
  const createPrMutation = useCreatePrAnyway()
  const retryFixMutation = useRetryFix()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (error?.stack) {
      navigator.clipboard.writeText(error.stack)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleIgnore = () => {
    ignoreMutation.mutate(id)
  }

  const handleCreatePrAnyway = () => {
    createPrMutation.mutate(id)
  }

  const handleRetryFix = () => {
    retryFixMutation.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Error not found</p>
      </div>
    )
  }

  const latestFix = error.fixAttempts[0]
  const latestPR = latestFix?.pullRequests?.[0] || error.pullRequests?.[0]

  // Get tests status from fix attempt or PR
  const testsPassed = latestFix?.testsPassed ?? latestPR?.testsPassed ?? false

  // Check if PR was created - has URL means PR was opened
  const prOpened = latestPR?.url || latestPR?.number

  // Map FixStatus to step progress
  const fixStatus = latestFix?.status
  const isAnalyzing = fixStatus === 'ANALYZING'
  const isGenerating = fixStatus === 'GENERATING'
  const isTesting = fixStatus === 'TESTING'
  const isSuccess = fixStatus === 'SUCCESS'
  const isFailed = fixStatus === 'FAILED'
  const needsManualReview = fixStatus === 'NEEDS_MANUAL_REVIEW'

  const steps: Step[] = [
    { label: "Error received", status: "done" },
    { label: "Stack parsed", status: fixStatus ? "done" : "pending" },
    { label: "File fetched", status: isAnalyzing || isGenerating || isTesting || isSuccess || isFailed ? "done" : fixStatus ? "pending" : "pending" },
    { label: "Fix generated", status: isTesting || isSuccess || isFailed ? "done" : isGenerating ? "pending" : "pending" },
    { label: "Tests passed", status: isSuccess ? "done" : isFailed || needsManualReview ? "failed" : isTesting ? "pending" : "pending" },
    { label: "PR opened", status: prOpened ? "done" : isSuccess && !prOpened ? "pending" : "pending" },
    ...(needsManualReview ? [{ label: "Needs manual review", status: "failed" as const }] : [])
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={error.severity} />
                  <StatusBadge status={error.status} />
                </div>
                <CardTitle className="font-mono text-lg">{error.message}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {error.file}:{error.line}
                </p>
              </div>
              <Button variant="outline" onClick={handleIgnore} disabled={ignoreMutation.isPending}>
                Ignore
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">First seen</p>
                <p className="font-medium">{formatDateTime(error.firstSeen)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last seen</p>
                <p className="font-medium">{formatRelativeTime(error.lastSeen)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Occurrences</p>
                <p className="font-medium">{error.occurrences || 0}x</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Stack Trace</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted text-muted-foreground p-4 rounded-lg font-mono text-xs overflow-x-auto">
              {error.stack.split("\n").map((line, index) => {
                const isPrimary = index === 0
                const isNodeModules = line.includes("node_modules")
                return (
                  <div
                    key={index}
                    className={cn(
                      "py-0.5",
                      isPrimary && "text-[#f08a87] font-bold",
                      isNodeModules && "text-muted-foreground"
                    )}
                  >
                    {line}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {latestFix && latestFix.originalCode && latestFix.fixedCode && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI Generated Fix</CardTitle>
                  <p className="text-sm text-muted-foreground">Compare the original code with the AI-generated solution</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-lg overflow-hidden border" style={{ maxHeight: '700px', overflow: 'auto' }}>
                <ReactDiffViewer
                  oldValue={latestFix.originalCode}
                  newValue={latestFix.fixedCode}
                  splitView={true}
                  useDarkTheme={document.documentElement.classList.contains('dark')}
                  styles={{
                    variables: {
                      light: {
                        diffViewerBackground: "#ffffff",
                        addedBackground: "#e6ffed",
                        removedBackground: "#ffeef0",
                        addedColor: "#24292e",
                        removedColor: "#24292e",
                        wordAddedBackground: "#acf2bd",
                        wordRemovedBackground: "#fdb8c0",
                        addedGutterBackground: "#cdffd8",
                        removedGutterBackground: "#fdbdcc",
                        gutterBackground: "#f6f8fa",
                        gutterBackgroundDark: "#f3f4f6",
                        highlightBackground: "#fff8c5",
                        highlightGutterBackground: "#fffbdd",
                        codeFoldGutterBackground: "#f6f8fa",
                        codeFoldBackground: "#ffffff",
                        emptyLineBackground: "#ffffff",
                        gutterColor: "#586069",
                        addedGutterColor: "#28a745",
                        removedGutterColor: "#d73a49",
                        codeFoldContentColor: "#586069",
                        diffViewerTitleBackground: "#ffffff",
                        diffViewerTitleColor: "#24292e",
                        diffViewerTitleBorderColor: "#e1e4e8",
                      },
                      dark: {
                        diffViewerBackground: "#0d1117",
                        addedBackground: "#033a16",
                        removedBackground: "#67060c",
                        addedColor: "#c9d1d9",
                        removedColor: "#c9d1d9",
                        wordAddedBackground: "#0d4f21",
                        wordRemovedBackground: "#b91c1c",
                        addedGutterBackground: "#0d4f21",
                        removedGutterBackground: "#67060c",
                        gutterBackground: "#161b22",
                        gutterBackgroundDark: "#21262d",
                        highlightBackground: "#1c2b2a",
                        highlightGutterBackground: "#1f6feb",
                        codeFoldGutterBackground: "#161b22",
                        codeFoldBackground: "#0d1117",
                        emptyLineBackground: "#0d1117",
                        gutterColor: "#7d8590",
                        addedGutterColor: "#3fb950",
                        removedGutterColor: "#f85149",
                        codeFoldContentColor: "#7d8590",
                        diffViewerTitleBackground: "#161b22",
                        diffViewerTitleColor: "#c9d1d9",
                        diffViewerTitleBorderColor: "#30363d",
                      },
                    },
                    line: {
                      fontSize: '13px',
                      lineHeight: '1.6',
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                    },
                    gutter: {
                      fontSize: '12px',
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                    },
                    contentText: {
                      fontSize: '13px',
                      lineHeight: '1.6',
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                    },
                    titleBlock: {
                      background: "transparent",
                      border: "none",
                      padding: "16px",
                    },
                    marker: {
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#58a6ff",
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fix Status</CardTitle>
              {fixStatus && (
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  fixStatus === 'SUCCESS' && "bg-green-100 text-green-700",
                  fixStatus === 'FAILED' && "bg-red-100 text-red-700",
                  fixStatus === 'NEEDS_MANUAL_REVIEW' && "bg-[#fde8e7] text-[#d43d39]",
                  fixStatus === 'TESTING' && "bg-blue-100 text-blue-700",
                  fixStatus === 'GENERATING' && "bg-yellow-100 text-yellow-700",
                  fixStatus === 'ANALYZING' && "bg-purple-100 text-purple-700",
                  fixStatus === 'PENDING' && "bg-blue-100 text-blue-700",
                  fixStatus === 'PENDING' && "bg-muted text-muted-foreground",
                )}>
                  {fixStatus === 'NEEDS_MANUAL_REVIEW' ? 'NEEDS REVIEW' : fixStatus}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3">
                  {step.status === "done" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {step.status === "failed" && (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                  {step.status === "pending" && (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-sm",
                    step.status === "pending" && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                  {step.status === "done" && latestFix && step.label === "Fix generated" && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {latestFix.confidence ? `${latestFix.confidence}% conf` : 'Calculating...'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {needsManualReview && latestFix && (
          <Card className="border-[#f5b7b1]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-[#EA4C48]" />
                <CardTitle>Manual Review Required</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#fef2f2] border border-[#f5b7b1] rounded-lg p-3">
                <p className="text-sm text-[#c0392b]">
                  <strong>Tests failed</strong> — The fix couldn&apos;t be automatically validated.
                </p>
                {latestFix.failureReason && (
                  <p className="text-xs text-[#EA4C48] mt-1">
                    Reason: {latestFix.failureReason.replace(/_/g, ' ')}
                  </p>
                )}
              </div>

              {latestFix.failureReason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Test Error:</p>
                  <pre className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-32 overflow-y-auto">
                    {latestFix.failureReason.substring(0, 500)}
                  </pre>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Actions:</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-green-300 hover:bg-green-50"
                    onClick={handleCreatePrAnyway}
                    disabled={createPrMutation.isPending}
                  >
                    {createPrMutation.isPending ? (
                      <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                    ) : (
                      <GitPullRequest className="h-4 w-4 text-green-600" />
                    )}
                    {createPrMutation.isPending ? 'Creating PR...' : 'Create PR anyway'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleRetryFix}
                    disabled={retryFixMutation.isPending}
                  >
                    {retryFixMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    {retryFixMutation.isPending ? 'Retrying...' : 'Retry fix'}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                The AI-generated fix is shown in the diff above. Review it carefully before creating a PR.
              </p>
            </CardContent>
          </Card>
        )}

        {latestPR && (
          <Card>
            <CardHeader>
              <CardTitle>Pull Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Number</p>
                <p className="font-medium text-sm">#{latestPR.number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium text-sm">{latestPR.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-medium text-sm">{latestPR.projectName || error.project?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-mono text-xs">{latestPR.branch}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={latestPR.status as any} />
                <span className="text-xs text-muted-foreground">
                  {latestPR.confidence ? `${latestPR.confidence}% confidence` : 'Calculating confidence...'}
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <a
                  href={latestPR.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  View on GitHub <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {latestFix && (
          <Card>
            <CardHeader>
              <CardTitle>AI Explanation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Root Cause</p>
                <p className="text-sm text-muted-foreground">{latestFix.rootCause}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">What Changed</p>
                <p className="text-sm text-muted-foreground">{latestFix.explanation}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          (latestFix.confidence || 0) >= 70 ? "bg-green-600" :
                            (latestFix.confidence || 0) >= 40 ? "bg-yellow-500" : "bg-red-600"
                        )}
                        style={{ width: `${latestFix.confidence || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{latestFix.confidence ? `${latestFix.confidence}%` : 'N/A'}</span>
                  </div>
                </div>
                {(latestFix.changedLines !== undefined && latestFix.changedLines !== null) && (
                  <div>
                    <p className="text-sm font-medium mb-1">Lines Changed</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            latestFix.changedLines <= 15 ? "bg-green-600" :
                              latestFix.changedLines <= 25 ? "bg-yellow-500" : "bg-red-600"
                          )}
                          style={{ width: `${Math.min((latestFix.changedLines / 25) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{latestFix.changedLines}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
