import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  constructor(private prisma: PrismaService) {}

  async getSystemOverview() {
    // Run each query individually to catch which one fails or returns 0
    const results: Record<string, any> = {};

    const queries: Record<string, () => Promise<any>> = {
      totalUsers: () => this.prisma.user.count(),
      totalOrganizations: () => this.prisma.organization.count(),
      totalProjects: () => this.prisma.project.count(),
      totalErrors: () => this.prisma.errorEvent.count(),
      totalApiKeys: () => this.prisma.apiKey.count(),
      totalPullRequests: () => this.prisma.pullRequest.count(),
    };

    for (const [key, fn] of Object.entries(queries)) {
      try {
        results[key] = await fn();
        this.logger.log(`✅ ${key}: ${results[key]}`);
      } catch (err) {
        this.logger.error(`❌ ${key} failed: ${err.message}`);
        results[key] = 0;
      }
    }

    let recentActivity = null;
    try {
      recentActivity = await this.getRecentActivity();
    } catch (err) {
      this.logger.error(`❌ recentActivity failed: ${err.message}`);
    }

    return {
      ...results,
      recentActivity,
    };
  }

  async getUserStats() {
    const [usersByRole, suspendedUsers, userGrowth, recentUsers] =
      await Promise.all([
        this.prisma.user.groupBy({
          by: ["role"],
          _count: { role: true },
        }),
        this.prisma.user.count({
          where: { isSuspended: true },
        }),
        this.getUserGrowth(),
        this.prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        count: item._count.role,
      })),
      suspendedUsers,
      userGrowth,
      recentUsers,
    };
  }

  async getOrganizationStats() {
    const [
      organizationsByPlan,
      organizationGrowth,
      usageStats,
      recentOrganizations,
    ] = await Promise.all([
      this.prisma.organization.groupBy({
        by: ["plan"],
        _count: { plan: true },
      }),
      this.getOrganizationGrowth(),
      this.getUsageStats(),
      this.prisma.organization.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          fixesUsedThisMonth: true,
          fixesLimit: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      organizationsByPlan: organizationsByPlan.map((item) => ({
        plan: item.plan,
        count: item._count.plan,
      })),
      organizationGrowth,
      usageStats,
      recentOrganizations,
    };
  }

  async getErrorStats() {
    const [errorsByStatus, errorsBySeverity, errorTrends, recentErrors] =
      await Promise.all([
        this.prisma.errorEvent.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        this.prisma.errorEvent.groupBy({
          by: ["severity"],
          _count: { severity: true },
        }),
        this.getErrorTrends(),
        this.prisma.errorEvent.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            message: true,
            severity: true,
            status: true,
            projectId: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      errorsByStatus: errorsByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      errorsBySeverity: errorsBySeverity.map((item) => ({
        severity: item.severity,
        count: item._count.severity,
      })),
      errorTrends,
      recentErrors,
    };
  }

  async getPerformanceMetrics() {
    const [fixSuccessRate, avgConfidenceScore, avgFixTime, topProjects] =
      await Promise.all([
        this.getFixSuccessRate(),
        this.getAvgConfidenceScore(),
        this.getAvgFixTime(),
        this.getTopProjects(),
      ]);

    return {
      fixSuccessRate,
      avgConfidenceScore,
      avgFixTime,
      topProjects,
    };
  }

  // ── Debug endpoint ────────────────────────────────────────────────────────
  async debugCounts() {
    const tables = [
      { name: "user",         fn: () => this.prisma.user.count()         },
      { name: "organization", fn: () => this.prisma.organization.count() },
      { name: "project",      fn: () => this.prisma.project.count()      },
      { name: "errorEvent",   fn: () => this.prisma.errorEvent.count()   },
      { name: "apiKey",       fn: () => this.prisma.apiKey.count()       },
      { name: "pullRequest",  fn: () => this.prisma.pullRequest.count()  },
      { name: "fixAttempt",   fn: () => this.prisma.fixAttempt.count()   },
    ];

    const results: Record<string, any> = {};

    for (const { name, fn } of tables) {
      try {
        results[name] = { count: await fn(), error: null };
      } catch (err) {
        results[name] = { count: null, error: err.message };
      }
    }

    return results;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async getRecentActivity() {
    const [recentUsers, recentOrganizations, recentErrors, recentFixes] =
      await Promise.all([
        this.prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, name: true, createdAt: true },
        }),
        this.prisma.organization.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, slug: true, createdAt: true },
        }),
        this.prisma.errorEvent.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { id: true, message: true, severity: true, createdAt: true },
        }),
        this.prisma.fixAttempt.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            confidenceScore: true,
            createdAt: true,
          },
        }),
      ]);

    return { recentUsers, recentOrganizations, recentErrors, recentFixes };
  }

  private async getUserGrowth() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const growth = await this.prisma.user.groupBy({
      by: ["createdAt"],
      _count: { createdAt: true },
      where: { createdAt: { gte: last30Days } },
    });

    return growth.map((item) => ({
      date: item.createdAt,
      count: item._count.createdAt,
    }));
  }

  private async getOrganizationGrowth() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const growth = await this.prisma.organization.groupBy({
      by: ["createdAt"],
      _count: { createdAt: true },
      where: { createdAt: { gte: last30Days } },
    });

    return growth.map((item) => ({
      date: item.createdAt,
      count: item._count.createdAt,
    }));
  }

  private async getUsageStats() {
    const stats = await this.prisma.organization.aggregate({
      _sum: { fixesUsedThisMonth: true, fixesLimit: true },
      _avg: { fixesUsedThisMonth: true },
    });

    return {
      totalFixesUsed: stats._sum.fixesUsedThisMonth || 0,
      totalFixesLimit: stats._sum.fixesLimit || 0,
      avgFixesUsed: stats._avg.fixesUsedThisMonth || 0,
    };
  }

  private async getErrorTrends() {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const trends = await this.prisma.errorEvent.groupBy({
      by: ["createdAt"],
      _count: { createdAt: true },
      where: { createdAt: { gte: last7Days } },
    });

    return trends.map((item) => ({
      date: item.createdAt,
      count: item._count.createdAt,
    }));
  }

  private async getFixSuccessRate() {
    const [total, successful] = await Promise.all([
      this.prisma.fixAttempt.count(),
      this.prisma.fixAttempt.count({ where: { status: "SUCCESS" } }),
    ]);
    return total > 0 ? (successful / total) * 100 : 0;
  }

  private async getAvgConfidenceScore() {
    const result = await this.prisma.fixAttempt.aggregate({
      _avg: { confidenceScore: true },
    });
    return result._avg.confidenceScore || 0;
  }

  private async getAvgFixTime() {
    return 15;
  }

  private async getTopProjects() {
    return this.prisma.project.findMany({
      take: 10,
      orderBy: { errorEvents: { _count: "desc" } },
      include: {
        _count: { select: { errorEvents: true } },
        organization: { select: { name: true } },
      },
    });
  }
}