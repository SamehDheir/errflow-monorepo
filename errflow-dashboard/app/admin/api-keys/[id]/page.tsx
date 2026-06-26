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
  Key,
  Calendar,
  Activity,
  Copy,
  Check,
  Building2,
  FolderKanban,
} from "lucide-react";

interface ApiKeyDetail {
  id: string;
  keyPrefix: string;
  label: string;
  projectId: string;
  organizationId: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    githubOwner: string;
    githubRepo: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function ApiKeyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [apiKey, setApiKey] = useState<ApiKeyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const data = await adminApi.get<ApiKeyDetail>(
          `/admin/api-keys/${params.id}`,
        );
        setApiKey(data);
      } catch (err) {
        setError("Failed to fetch API key details");
        console.error("Error fetching API key:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchApiKey();
    }
  }, [params.id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to API Keys
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

  if (error || !apiKey) {
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
          {error || "API Key not found"}
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
        Back to API Keys
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {apiKey.label || "Unnamed Key"}
        </h1>
        <p className="text-slate-400">API Key ID: {apiKey.id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={apiKey.isActive ? "default" : "secondary"}
              className={
                apiKey.isActive
                  ? "bg-green-500/20 text-green-400 border-green-500/20"
                  : "bg-slate-700 text-slate-400 border-slate-600"
              }
            >
              {apiKey.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-white">
              {new Date(apiKey.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Last Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-white">
              {apiKey.lastUsedAt
                ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                : "Never"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>API Key Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-400 mb-2">Key Prefix</p>
            <div className="flex items-center space-x-2 bg-slate-700 px-4 py-2 rounded">
              <code className="text-blue-400 flex-1">
                {apiKey.keyPrefix}***
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(apiKey.keyPrefix)}
                className="text-slate-400 hover:text-white"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Label</p>
            <p className="text-white">{apiKey.label || "Unnamed Key"}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Calendar className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-sm text-slate-400">Created At</p>
              <p className="text-white">
                {new Date(apiKey.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          {apiKey.lastUsedAt && (
            <div className="flex items-center space-x-3">
              <Activity className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Last Used At</p>
                <p className="text-white">
                  {new Date(apiKey.lastUsedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FolderKanban className="h-5 w-5" />
              <span>Project</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-400 mb-1">Project Name</p>
              <p className="text-white">{apiKey.project.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">GitHub Repository</p>
              <p className="text-white">
                {apiKey.project.githubOwner}/{apiKey.project.githubRepo}
              </p>
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
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-400 mb-1">Organization Name</p>
              <p className="text-white">{apiKey.organization.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Slug</p>
              <p className="text-white">@{apiKey.organization.slug}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
