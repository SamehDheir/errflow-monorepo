"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  FileText,
  Activity,
  GitBranch,
} from "lucide-react";

interface ErrorDetail {
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
    organization?: {
      id: string;
      name: string;
    };
  };
  organization: {
    id: string;
    name: string;
  };
  fixAttempts: any[];
  pullRequests: any[];
}

export default function ErrorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchError = async () => {
      try {
        const data = await adminApi.get<ErrorDetail>(
          `/admin/errors/${params.id}`,
        );
        setErrorDetail(data);
      } catch (err) {
        setError("Failed to fetch error details");
        console.error("Error fetching error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchError();
    }
  }, [params.id]);

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
        <Button variant="ghost" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Errors
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
    );
  }

  if (error || !errorDetail) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error || "Error not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Errors
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {errorDetail.message}
        </h1>
        <p className="text-slate-400">Error ID: {errorDetail.id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant="secondary"
              className={getStatusColor(errorDetail.status)}
            >
              {errorDetail.status}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant="secondary"
              className={getSeverityColor(errorDetail.severity)}
            >
              {errorDetail.severity}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Occurrences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {errorDetail.occurrenceCount}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Last Seen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-white">
              {new Date(errorDetail.lastSeenAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Error Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">Message</p>
              <p className="text-white break-words">{errorDetail.message}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">First Seen</p>
                <p className="text-white">
                  {new Date(errorDetail.firstSeenAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Last Seen</p>
                <p className="text-white">
                  {new Date(errorDetail.lastSeenAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Project & Organization</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">Project</p>
              <p className="text-white">{errorDetail.project.name}</p>
              <p className="text-sm text-slate-400">
                {errorDetail.project.githubOwner}/
                {errorDetail.project.githubRepo}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Organization</p>
              <p className="text-white">
                {errorDetail.project?.organization?.name ??
                  errorDetail.organization?.name ??
                  "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Fix Attempts ({errorDetail.fixAttempts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorDetail.fixAttempts.length === 0 ? (
            <p className="text-slate-400">No fix attempts yet</p>
          ) : (
            <div className="space-y-3">
              {errorDetail.fixAttempts.map((attempt, index) => (
                <div key={index} className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="secondary"
                      className={getStatusColor(attempt.status)}
                    >
                      {attempt.status}
                    </Badge>
                    {attempt.confidenceScore && (
                      <span className="text-sm text-slate-400">
                        Confidence: {Math.round(attempt.confidenceScore * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">
                    {attempt.description || "No description"}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Created: {new Date(attempt.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Pull Requests ({errorDetail.pullRequests.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorDetail.pullRequests.length === 0 ? (
            <p className="text-slate-400">No pull requests created yet</p>
          ) : (
            <div className="space-y-3">
              {errorDetail.pullRequests.map((pr, index) => (
                <div
                  key={index}
                  className="bg-slate-700 p-4 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <a
                      href={pr.githubPrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      PR #{pr.githubPrNumber}
                    </a>
                    <p className="text-sm text-slate-300 mt-1">
                      {pr.title || "No title"}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      pr.status === "MERGED"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                    }
                  >
                    {pr.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
