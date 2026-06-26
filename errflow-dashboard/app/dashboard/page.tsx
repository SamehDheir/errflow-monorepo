"use client"

import { useStatsOverview, useTimeline } from "@/hooks/use-stats"
import { useErrors } from "@/hooks/use-errors"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { formatRelativeTime, truncate } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import { ArrowRight } from "lucide-react"

export default function OverviewPage() {
  const { data: stats, isLoading: statsLoading } = useStatsOverview()
  const { data: timeline, isLoading: timelineLoading } = useTimeline(30)
  const { data: errorsData, isLoading: errorsLoading } = useErrors({ limit: 5 })

  const errors = errorsData?.data || []

  const timelineData = timeline?.map((entry) => {
    const date = new Date(entry.date);
    return {
      date: isNaN(date.getTime()) ? 'Invalid' : format(date, "MMM dd"),
      errorsReceived: entry.errorsReceived,
      fixesOpened: entry.fixesOpened,
    };
  }) || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Errors"
          value={stats?.totalErrors || 0}
          subtitle="all time"
          loading={statsLoading}
        />
        <StatsCard
          title="Fixed/Month"
          value={stats?.fixedThisMonth || 0}
          subtitle="this cycle"
          loading={statsLoading}
        />
        <StatsCard
          title="Success Rate"
          value={`${Number(stats?.fixSuccessRate || 0).toFixed(2)}%`}
          subtitle={`${Number(stats?.avgConfidenceScore || 0).toFixed(2)}% avg conf`}
          loading={statsLoading}
        />
        <StatsCard
          title="Fixes Left"
          value={`${(stats?.fixesLimit ?? 100) - (stats?.fixesUsed || 0)}/${stats?.fixesLimit ?? 100}`}
          subtitle={`${stats?.plan || 'FREE'} plan`}
          loading={statsLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Errors vs Fixes — Last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="errorsReceived" stroke="#ef4444" name="Errors" />
                <Line type="monotone" dataKey="fixesOpened" stroke="#4f46e5" name="Fixes" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Errors</CardTitle>
            <Link href="/dashboard/errors" className="text-[#EA4C48] hover:underline text-sm flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {errorsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : errors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No errors yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((error) => (
                    <TableRow key={error.id} className="cursor-pointer hover:bg-muted">
                      <TableCell className="font-mono text-xs">
                        {truncate(error.message, 40)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {error.file}:{error.line}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatRelativeTime(error.lastSeen)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Frequent</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.topErrors && stats.topErrors.length > 0 ? (
              <div className="space-y-4">
                {stats.topErrors.map((error, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-mono text-xs">{truncate(error.message, 50)}</span>
                      <span className="text-muted-foreground">{error.count}x</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EA4C48] rounded-full"
                        style={{ width: `${(error.count / (stats.topErrors[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatsCard({ title, value, subtitle, loading }: { title: string; value: string | number; subtitle: string; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
