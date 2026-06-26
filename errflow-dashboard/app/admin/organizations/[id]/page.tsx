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
  Building2,
  Calendar,
  Users,
  FolderKanban,
  CreditCard,
  Activity,
} from "lucide-react";

interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  fixesUsedThisMonth: number;
  fixesLimit: number | null;
  createdAt: string;
  users?: any[];
  projects?: any[];
  apiKeys?: any[];
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const data = await adminApi.get<OrganizationDetail>(
          `/admin/organizations/${params.id}`,
        );
        setOrg(data);
      } catch (err) {
        setError("Failed to fetch organization details");
        console.error("Error fetching organization:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchOrg();
    }
  }, [params.id]);

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case "FREE":
        return "outline";
      case "PRO":
        return "secondary";
      case "ENTERPRISE":
        return "default";
      default:
        return "outline";
    }
  };

  const getUsagePercentage = (used: number, limit: number | null) => {
    if (!limit) return 0;
    return Math.round((used / limit) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Organizations
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

  if (error || !org) {
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
          {error || "Organization not found"}
        </div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage(
    org.fixesUsedThisMonth,
    org.fixesLimit,
  );

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Organizations
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{org.name}</h1>
        <p className="text-slate-400">@{org.slug}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={getPlanBadgeVariant(org.plan)}
              className="text-base"
            >
              {org.plan}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Monthly Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {org.fixesUsedThisMonth} / {org.fixesLimit || "∞"}
            </div>
            {org.fixesLimit && (
              <div className="mt-2">
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usagePercentage > 90
                        ? "bg-red-500"
                        : usagePercentage > 70
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {usagePercentage}% used
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg text-white">
              {new Date(org.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Organization Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Building2 className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Name</p>
                <p className="text-white">{org.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Building2 className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Slug</p>
                <p className="text-white">@{org.slug}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Created At</p>
                <p className="text-white">
                  {new Date(org.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Plan</p>
                <Badge variant={getPlanBadgeVariant(org.plan)} className="mt-1">
                  {org.plan}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Resources</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Users className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Users</p>
                <p className="text-2xl font-bold text-white">
                  {org.users?.length || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <FolderKanban className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">Projects</p>
                <p className="text-2xl font-bold text-white">
                  {org.projects?.length || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Activity className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-400">API Keys</p>
                <p className="text-2xl font-bold text-white">
                  {org.apiKeys?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
