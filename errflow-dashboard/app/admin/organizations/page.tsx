"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  Search,
  Building2,
  Users,
  FolderKanban,
  Edit,
  Trash2,
  CreditCard,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  fixesUsedThisMonth: number;
  fixesLimit?: number;
  createdAt: string;
  _count: {
    users: number;
    projects: number;
    errorEvents: number;
  };
}

interface OrganizationsResponse {
  data: Organization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] =
    useState<OrganizationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, [search, planFilter, page]);

  const fetchOrganizations = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (planFilter && planFilter !== "all") params.plan = planFilter;
      params.page = page;
      params.limit = 20;

      const data = await adminApi.get<OrganizationsResponse>(
        "/admin/organizations",
        params,
      );
      setOrganizations(data);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePlan = async (
    orgId: string,
    plan: string,
    fixesLimit?: number,
  ) => {
    try {
      await adminApi.put(`/admin/organizations/${orgId}/plan`, { plan, fixesLimit });
      fetchOrganizations();
      setIsPlanDialogOpen(false);
    } catch (error) {
      console.error("Error updating plan:", error);
      alert("Failed to update plan");
    }
  };

  const handleDeleteOrganization = async (orgId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this organization? This action cannot be undone and will delete all associated data.",
      )
    ) {
      return;
    }

    try {
      await adminApi.delete(`/admin/organizations/${orgId}`);
      fetchOrganizations();
    } catch (error) {
      alert("Failed to delete organization");
      console.error("Error deleting organization:", error);
    }
  };

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

  const getUsagePercentage = (used: number, limit: number) => {
    if (!limit) return 0;
    return Math.round((used / limit) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 bg-slate-700" />
          <Skeleton className="h-10 w-32 bg-slate-700" />
        </div>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-700" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Organization Management
          </h1>
          <p className="text-slate-400 mt-2">
            Manage all organizations and their billing plans
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search organizations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            Organizations ({organizations?.pagination.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">Organization</TableHead>
                <TableHead className="text-slate-400">Plan</TableHead>
                <TableHead className="text-slate-400">Usage</TableHead>
                <TableHead className="text-slate-400">Resources</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
                <TableHead className="text-slate-400 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations?.data.map((org) => {
                const usagePercentage = getUsagePercentage(
                  org.fixesUsedThisMonth,
                  org.fixesLimit || 0,
                );

                return (
                  <TableRow key={org.id} className="border-slate-700">
                    <TableCell>
                      <div>
                        <button
                          onClick={() =>
                            router.push(`/admin/organizations/${org.id}`)
                          }
                          className="font-medium text-white hover:text-blue-400 cursor-pointer"
                        >
                          {org.name}
                        </button>
                        <div className="text-sm text-slate-400">{org.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeVariant(org.plan)}>
                        {org.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm text-white">
                          {org.fixesUsedThisMonth} / {org.fixesLimit || "∞"}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${usagePercentage > 90
                                  ? "bg-red-500"
                                  : usagePercentage > 70
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                              style={{
                                width: `${Math.min(usagePercentage, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            {usagePercentage}%
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-4 text-sm">
                        <div className="flex items-center text-slate-400">
                          <Users className="h-4 w-4 mr-1" />
                          {org._count.users}
                        </div>
                        <div className="flex items-center text-slate-400">
                          <FolderKanban className="h-4 w-4 mr-1" />
                          {org._count.projects}
                        </div>
                        <div className="flex items-center text-slate-400">
                          <Building2 className="h-4 w-4 mr-1" />
                          {org._count.errorEvents}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-slate-800 border-slate-700"
                        >

                          <DropdownMenuItem
                            className="text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                            onClick={() => {
                              setSelectedOrg(org);
                              setIsPlanDialogOpen(true);
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Update Plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem
                            className="text-red-400 hover:text-red-300 hover:bg-slate-700"
                            onClick={() => handleDeleteOrganization(org.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Organization
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Update Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Update Organization Plan
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Change the billing plan for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan" className="text-slate-300">
                Plan
              </Label>
              <Select
                value={selectedOrg?.plan}
                onValueChange={(value) =>
                  selectedOrg && setSelectedOrg({ ...selectedOrg, plan: value })
                }
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="FREE">Free (10 fixes/month)</SelectItem>
                  <SelectItem value="PRO">Pro (100 fixes/month)</SelectItem>
                  <SelectItem value="ENTERPRISE">
                    Enterprise (Unlimited)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fixesLimit" className="text-slate-300">
                Custom Fix Limit (Optional)
              </Label>
              <Input
                id="fixesLimit"
                type="number"
                placeholder="Leave empty for default"
                className="bg-slate-700 border-slate-600 text-white"
                onChange={(e) =>
                  selectedOrg &&
                  setSelectedOrg({
                    ...selectedOrg,
                    fixesLimit: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPlanDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() =>
                selectedOrg &&
                handleUpdatePlan(
                  selectedOrg.id,
                  selectedOrg.plan,
                  selectedOrg.fixesLimit,
                )
              }
            >
              Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {organizations && organizations.pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            Previous
          </Button>
          <span className="text-slate-400 py-2 px-4">
            Page {page} of {organizations.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === organizations.pagination.totalPages}
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
