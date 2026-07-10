"use client"

import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrganization } from "@/hooks/use-organization"

interface Organization {
  id: string
  name: string
  plan: string
  fixesUsedThisMonth?: number
  fixesLimit?: number
}

export function UsageSection() {
  const { data: org, isLoading: orgLoading } = useOrganization()

  const nextMonthReset = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1,
  )

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan: {org?.plan}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Fixes used this month</span>
              <span>
                {org?.fixesUsedThisMonth ?? 0}/{org?.fixesLimit ?? 100}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    ((org?.fixesUsedThisMonth ?? 0) / (org?.fixesLimit ?? 100)) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {(org?.fixesLimit ?? 100) - (org?.fixesUsedThisMonth ?? 0)} fixes remaining
            </p>
            <p className="text-xs text-gray-400">
              Resets on {format(nextMonthReset, "MMMM d, yyyy")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Free</TableHead>
                <TableHead>Pro</TableHead>
                <TableHead>Enterprise</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Fixes/month", "10", "100", "Unlimited"],
                ["Projects", "1", "5", "Unlimited"],
                ["Email notifications", "✓", "✓", "✓"],
                ["Support", "Community", "Priority", "Dedicated"],
              ].map(([feature, free, pro, enterprise]) => (
                <TableRow key={feature}>
                  <TableCell>{feature}</TableCell>
                  <TableCell>{free}</TableCell>
                  <TableCell>{pro}</TableCell>
                  <TableCell>{enterprise}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" className="flex-1">Upgrade to Pro</Button>
        <Button variant="outline" className="flex-1">Contact Sales</Button>
      </div>
    </div>
  )
}
