"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { useOrganization } from "@/hooks/use-organization"
import { DeleteOrganizationDialog } from "@/components/settings"

interface Member {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface Organization {
  id: string
  name: string
  plan: string
  members: Member[]
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A"
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? "N/A" : format(d, "MMM d, yyyy")
}

export function GeneralSection() {
  const { data: org, isLoading: orgLoading } = useOrganization()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orgLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input defaultValue={org?.name} disabled />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Plan:</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {org?.plan}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : (
                org?.members?.map((member: Member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>{formatDate(member.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteOrganizationDialog />
        </CardContent>
      </Card>
    </div>
  )
}
