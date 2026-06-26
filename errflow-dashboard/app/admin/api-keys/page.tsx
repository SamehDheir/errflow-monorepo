"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Key,
  Search,
  Filter,
  MoreHorizontal,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ApiKey {
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
  };
  organization: {
    id: string;
    name: string;
  };
}

export default function AdminApiKeysPage() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const res = await adminApi.get<{ data: ApiKey[]; pagination: any }>(
          "/admin/api-keys",
        );
        setApiKeys(res.data ?? []);
      } catch (err) {
        setError("Failed to fetch API keys");
        console.error("Error fetching API keys:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKeys();
  }, []);

  const filteredApiKeys = (Array.isArray(apiKeys) ? apiKeys : []).filter(
    (apiKey) =>
      apiKey.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apiKey.project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apiKey.organization.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const copyToClipboard = (keyPrefix: string) => {
    navigator.clipboard.writeText(keyPrefix);
    setCopiedKey(keyPrefix);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeactivateKey = async (keyId: string) => {
    try {
      await adminApi.put(`/admin/api-keys/${keyId}/deactivate`);
      const data = await adminApi.get<ApiKey[]>("admin//api-keys");
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error deactivating API key:", error);
      alert("Failed to deactivate API key");
    }
  };

  const handleActivateKey = async (keyId: string) => {
    try {
      await adminApi.put(`/admin/api-keys/${keyId}/activate`);
      const data = await adminApi.get<ApiKey[]>("/admin/api-keys");
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error activating API key:", error);
      alert("Failed to activate API key");
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this API key? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await adminApi.delete(`/admin/api-keys/${keyId}`);
      const data = await adminApi.get<ApiKey[]>("/admin/api-keys");
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error deleting API key:", error);
      alert("Failed to delete API key");
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
                <Skeleton className="h-5 w-1/3 bg-slate-700 mb-2" />
                <Skeleton className="h-4 w-1/4 bg-slate-700" />
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
          <h1 className="text-3xl font-bold text-white">API Keys</h1>
          <p className="text-slate-400 mt-2">
            Manage API keys for all organizations and projects
          </p>
        </div>
        {/* <Button className="bg-blue-600 hover:bg-blue-700">
          Generate API Key
        </Button> */}
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search API keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="space-y-4">
        {filteredApiKeys.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <Key className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No API keys found</p>
            </CardContent>
          </Card>
        ) : (
          filteredApiKeys.map((apiKey) => (
            <Card key={apiKey.id} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <button
                        onClick={() =>
                          router.push(`/admin/api-keys/${apiKey.id}`)
                        }
                        className="text-lg font-semibold text-white hover:text-blue-400 cursor-pointer text-left"
                      >
                        {apiKey.label || "Unnamed Key"}
                      </button>
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
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400 mb-3">
                      <div className="flex items-center space-x-2 bg-slate-700 px-3 py-1 rounded">
                        <code className="text-blue-400">
                          {apiKey.keyPrefix}***
                        </code>
                        <button
                          onClick={() => copyToClipboard(apiKey.keyPrefix)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedKey === apiKey.keyPrefix ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <span>{apiKey.project.name}</span>
                      <span>•</span>
                      <span>{apiKey.organization.name}</span>
                      <span>•</span>
                      <span>
                        Created{" "}
                        {new Date(apiKey.createdAt).toLocaleDateString()}
                      </span>
                      {apiKey.lastUsedAt && (
                        <>
                          <span>•</span>
                          <span>
                            Last used{" "}
                            {new Date(apiKey.lastUsedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {apiKey.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivateKey(apiKey.id)}
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleActivateKey(apiKey.id)}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteKey(apiKey.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Array.isArray(apiKeys) ? apiKeys.length : 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Active Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Array.isArray(apiKeys)
                ? apiKeys.filter((k) => k.isActive).length
                : 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Inactive Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Array.isArray(apiKeys)
                ? apiKeys.filter((k) => !k.isActive).length
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
