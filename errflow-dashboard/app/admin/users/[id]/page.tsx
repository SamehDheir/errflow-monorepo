"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { adminApi } from "@/lib/admin-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Building2, Calendar, Shield, User } from "lucide-react"

interface UserDetail {
  id: string
  email: string
  name: string
  role: string
  isSuspended: boolean
  createdAt: string
  organization?: {
    id: string
    name: string
    slug: string
    plan: string
  }
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await adminApi.get<UserDetail>(`/admin/users/${params.id}`)
        setUser(data)
      } catch (err) {
        setError('Failed to fetch user details')
        console.error('Error fetching user:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchUser()
    }
  }, [params.id])

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'destructive'
      case 'OWNER': return 'default'
      case 'ADMIN': return 'secondary'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
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

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error || 'User not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Users
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
        <p className="text-slate-400">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>User Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Role</p>
                <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1">
                  {user.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Created At</p>
                <p className="text-white">{new Date(user.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Status</p>
                <Badge variant={user.isSuspended ? 'destructive' : 'default'} className="mt-1">
                  {user.isSuspended ? 'Suspended' : 'Active'}
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
          <CardContent>
            {user.organization ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Organization Name</p>
                  <p className="text-white">{user.organization.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Slug</p>
                  <p className="text-white">@{user.organization.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Plan</p>
                  <Badge variant="secondary" className="mt-1">
                    {user.organization.plan}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No organization assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
