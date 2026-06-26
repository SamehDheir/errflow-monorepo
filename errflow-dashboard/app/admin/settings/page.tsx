"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Calendar,
  Shield,
  Users,
  Building2,
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  Key,
  FolderKanban,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditStats {
  totalActions: number;
  actionsByType: Array<{ action: string; count: number }>;
  actionsByResource: Array<{ resourceType: string; count: number }>;
  recentActions: AuditLog[];
}

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  UPDATE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  ACTIVATE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  DEACTIVATE: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  SUSPEND: "bg-red-500/15 text-red-400 border-red-500/30",
  UNSUSPEND: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  LOGIN: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  LOGOUT: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  USER: <Users className="h-3.5 w-3.5" />,
  ORGANIZATION: <Building2 className="h-3.5 w-3.5" />,
  PROJECT: <FolderKanban className="h-3.5 w-3.5" />,
  API_KEY: <Key className="h-3.5 w-3.5" />,
  ADMIN_SESSION: <Shield className="h-3.5 w-3.5" />,
  ERROR: <AlertTriangle className="h-3.5 w-3.5" />,
};

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      try {
        const params: Record<string, string | number> = { page, limit: 20 };
        if (search) params.search = search;
        if (actionFilter !== "all") params.action = actionFilter;
        if (resourceFilter !== "all") params.resourceType = resourceFilter;

        const [logsRes, statsRes] = await Promise.all([
          adminApi.get<AuditLogsResponse>("/admin/audit/logs", params),
          adminApi.get<AuditStats>("/admin/audit/stats"),
        ]);

        setLogs(logsRes.data ?? []);
        setPagination(logsRes.pagination);
        setStats(statsRes);
      } catch (err) {
        console.error("Error fetching audit data:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, search, actionFilter, resourceFilter],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setSearch("");
    setActionFilter("all");
    setResourceFilter("all");
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-56 bg-slate-700" />
          <Skeleton className="h-10 w-32 bg-slate-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <Skeleton className="h-8 w-16 bg-slate-700 mb-2" />
                <Skeleton className="h-4 w-24 bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-slate-700" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400 mt-1">
            Track all admin actions across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Actions
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalActions?.toLocaleString() ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              By Action Type
            </CardTitle>
            <Shield className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {stats?.actionsByType.slice(0, 4).map((item) => (
                <div
                  key={item.action}
                  className="flex justify-between items-center text-sm"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium border ${ACTION_COLORS[item.action] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}
                  >
                    {item.action}
                  </span>
                  <span className="text-white font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              By Resource
            </CardTitle>
            <Building2 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {stats?.actionsByResource.slice(0, 4).map((item) => (
                <div
                  key={item.resourceType}
                  className="flex justify-between items-center text-sm"
                >
                  <div className="flex items-center gap-1.5 text-slate-400">
                    {RESOURCE_ICONS[item.resourceType] ?? (
                      <Activity className="h-3.5 w-3.5" />
                    )}
                    <span>{item.resourceType}</span>
                  </div>
                  <span className="text-white font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by admin email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <Select
                value={actionFilter}
                onValueChange={(v) => {
                  setActionFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="ACTIVATE">Activate</SelectItem>
                  <SelectItem value="DEACTIVATE">Deactivate</SelectItem>
                  <SelectItem value="SUSPEND">Suspend</SelectItem>
                  <SelectItem value="UNSUSPEND">Unsuspend</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={resourceFilter}
                onValueChange={(v) => {
                  setResourceFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by resource" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ORGANIZATION">Organization</SelectItem>
                  <SelectItem value="PROJECT">Project</SelectItem>
                  <SelectItem value="API_KEY">API Key</SelectItem>
                  <SelectItem value="ADMIN_SESSION">Admin Session</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-600"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="text-white text-base">
            Audit Logs
            <span className="ml-2 text-slate-400 font-normal text-sm">
              ({pagination.total.toLocaleString()} total)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-700/30 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Action badge */}
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded border text-xs font-semibold tracking-wide ${ACTION_COLORS[log.action] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}
                    >
                      {log.action}
                    </span>

                    {/* Resource */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-300 shrink-0">
                      {RESOURCE_ICONS[log.resourceType] ?? (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                      <span>{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="text-slate-500 font-mono text-xs">
                          #{log.resourceId.slice(-6)}
                        </span>
                      )}
                    </div>

                    {/* Admin */}
                    <div className="text-sm text-slate-400 truncate min-w-0">
                      by{" "}
                      <span className="text-slate-200">{log.adminEmail}</span>
                    </div>

                    {/* IP */}
                    {log.ipAddress && (
                      <span className="text-xs text-slate-500 font-mono shrink-0 hidden lg:block">
                        {log.ipAddress}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/settings/${log.id}`)}
                      className="h-7 w-7 text-slate-500 hover:text-white hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * 20 + 1}–
            {Math.min(page * 20, pagination.total)} of{" "}
            {pagination.total.toLocaleString()} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-slate-400 text-sm px-2">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
