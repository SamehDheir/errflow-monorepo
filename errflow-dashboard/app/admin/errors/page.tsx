"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal,
  Clock,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ErrorEvent {
  id: string;
  message: string;
  status: string;
  severity: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  project: {
    id: string;
    name: string;
    githubOwner: string;
    githubRepo: string;
  };
  organization: {
    id: string;
    name: string;
  };
}

export default function AdminErrorsPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const res = await adminApi.get<{ data: ErrorEvent[]; total: number }>(
          "/admin/errors",
        );
        setErrors(res.data ?? []);
      } catch (err) {
        setError("Failed to fetch errors");
        console.error("Error fetching errors:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchErrors();
  }, []);

  const filteredErrors = (Array.isArray(errors) ? errors : []).filter(
    (errorEvent) => {
      const matchesSearch =
        errorEvent.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        errorEvent.project.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || errorEvent.status === statusFilter;
      return matchesSearch && matchesStatus;
    },
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return "bg-blue-500/20 text-blue-400 border-blue-500/20";
      case "QUEUED":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/20";
      case "PROCESSING":
        return "bg-purple-500/20 text-purple-400 border-purple-500/20";
      case "FIX_READY":
        return "bg-green-500/20 text-green-400 border-green-500/20";
      case "FAILED":
        return "bg-red-500/20 text-red-400 border-red-500/20";
      case "IGNORED":
        return "bg-slate-700 text-slate-400 border-slate-600";
      default:
        return "bg-slate-700 text-slate-400 border-slate-600";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "LOW":
        return "bg-blue-500/20 text-blue-400 border-blue-500/20";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/20";
      case "HIGH":
        return "bg-orange-500/20 text-orange-400 border-orange-500/20";
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border-red-500/20";
      default:
        return "bg-slate-700 text-slate-400 border-slate-600";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 bg-slate-700" />
          <Skeleton className="h-10 w-32 bg-slate-700" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <Skeleton className="h-5 w-1/2 bg-slate-700 mb-2" />
                <Skeleton className="h-4 w-1/4 bg-slate-700 mb-4" />
                <Skeleton className="h-4 w-1/3 bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Errors</h1>
          <p className="text-slate-400 mt-2">
            Monitor and manage error events across all projects
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">Export Report</Button>
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="RECEIVED">Received</option>
              <option value="QUEUED">Queued</option>
              <option value="PROCESSING">Processing</option>
              <option value="FIX_READY">Fix Ready</option>
              <option value="FAILED">Failed</option>
              <option value="IGNORED">Ignored</option>
            </select>
            <Button
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Errors List */}
      <div className="space-y-4">
        {filteredErrors.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No errors found</p>
            </CardContent>
          </Card>
        ) : (
          filteredErrors.map((errorEvent) => (
            <Card key={errorEvent.id} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <button
                        onClick={() =>
                          router.push(`/admin/errors/${errorEvent.id}`)
                        }
                        className="text-lg font-semibold text-white hover:text-blue-400 cursor-pointer truncate max-w-2xl text-left"
                      >
                        {errorEvent.message}
                      </button>
                      <Badge
                        variant="secondary"
                        className={getSeverityColor(errorEvent.severity)}
                      >
                        {errorEvent.severity}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(errorEvent.status)}
                      >
                        {errorEvent.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400 mb-3">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{errorEvent.project.name}</span>
                      </div>
                      <span>•</span>
                      <span>{errorEvent.organization.name}</span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          Last seen{" "}
                          {new Date(errorEvent.lastSeenAt).toLocaleString()}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{errorEvent.occurrenceCount} occurrences</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Array.isArray(errors) ? errors.length : 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {Array.isArray(errors)
                ? errors.filter((e) => e.severity === "CRITICAL").length
                : 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Fix Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {Array.isArray(errors)
                ? errors.filter((e) => e.status === "FIX_READY").length
                : 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              {Array.isArray(errors)
                ? errors.filter((e) => e.status === "FAILED").length
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
