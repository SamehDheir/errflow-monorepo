"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, TrendingUp, Users, Search, Filter, MoreHorizontal, DollarSign, Calendar } from "lucide-react"

interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  fixesUsedThisMonth: number
  fixesLimit: number | null
  billingCycleStart: string
  createdAt: string
}

interface BillingStats {
  totalRevenue: number
  activeSubscriptions: number
  monthlyRecurringRevenue: number
  organizationsByPlan: {
    FREE: number
    PRO: number
    ENTERPRISE: number
  }
}

export default function AdminBillingPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [stats, setStats] = useState<BillingStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [planFilter, setPlanFilter] = useState<string>("all")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgsData, statsData] = await Promise.all([
          adminApi.get<Organization[]>('/admin/billing/organizations'),
          adminApi.get<BillingStats>('/admin/billing/overview')
        ])
        setOrganizations(orgsData)
        setStats(statsData)
      } catch (err) {
        setError('Failed to fetch billing data')
        console.error('Error fetching billing data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredOrganizations = (Array.isArray(organizations) ? organizations : []).filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlan = planFilter === "all" || org.plan === planFilter
    return matchesSearch && matchesPlan
  })

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "FREE": return "bg-slate-700 text-slate-300 border-slate-600"
      case "PRO": return "bg-blue-500/20 text-blue-400 border-blue-500/20"
      case "ENTERPRISE": return "bg-purple-500/20 text-purple-400 border-purple-500/20"
      default: return "bg-slate-700 text-slate-400 border-slate-600"
    }
  }

  const getUsagePercentage = (used: number, limit: number | null) => {
    if (!limit) return 0
    return Math.round((used / limit) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 bg-slate-700" />
          <Skeleton className="h-10 w-32 bg-slate-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-white">Billing</h1>
          <p className="text-slate-400 mt-2">
            Monitor subscriptions, revenue, and usage across all organizations
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Export Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.totalRevenue ? `$${stats.totalRevenue.toLocaleString()}` : '$0'}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.activeSubscriptions || 0}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <div className="text-2xl font-bold text-white">
                {stats?.monthlyRecurringRevenue ? `$${stats.monthlyRecurringRevenue.toLocaleString()}` : '$0'}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-xs text-slate-400">Free: {stats?.organizationsByPlan?.FREE || 0}</div>
              <div className="text-xs text-slate-400">Pro: {stats?.organizationsByPlan?.PRO || 0}</div>
              <div className="text-xs text-slate-400">Enterprise: {stats?.organizationsByPlan?.ENTERPRISE || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Plans</option>
              <option value="FREE">Free</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
            <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <div className="space-y-4">
        {filteredOrganizations.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No organizations found</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrganizations.map((org) => {
            const usagePercentage = getUsagePercentage(org.fixesUsedThisMonth, org.fixesLimit)
            return (
              <Card key={org.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{org.name}</h3>
                        <Badge variant="secondary" className={getPlanColor(org.plan)}>
                          {org.plan}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-400 mb-3">
                        <span>@{org.slug}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Started {new Date(org.billingCycleStart).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Monthly Usage</span>
                          <span className="text-white">
                            {org.fixesUsedThisMonth} / {org.fixesLimit || '∞'}
                          </span>
                        </div>
                        {org.fixesLimit && (
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getUsageColor(usagePercentage)}`}
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
