import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../audit/admin-audit.service';

@Injectable()
export class AdminBillingService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
  ) {}

  async getBillingOverview() {
    const [
      totalOrganizations,
      organizationsByPlan,
      revenueStats,
      usageStats,
      billingCycles,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
      this.getRevenueStats(),
      this.getUsageStats(),
      this.getBillingCycles(),
    ]);

    return {
      totalOrganizations,
      organizationsByPlan: organizationsByPlan.map(item => ({
        plan: item.plan,
        count: item._count.plan,
      })),
      revenueStats,
      usageStats,
      billingCycles,
    };
  }

  async getOrganizationsByPlan() {
    const organizations = await this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        fixesUsedThisMonth: true,
        fixesLimit: true,
        billingCycleStart: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
      orderBy: { plan: 'asc' },
    });

    return organizations;
  }

  async updateBillingCycle(organizationId: string, cycleStart: Date, adminId: string, adminEmail: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const oldValues = {
      billingCycleStart: organization.billingCycleStart,
      fixesUsedThisMonth: organization.fixesUsedThisMonth,
    };

    const updatedOrganization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        billingCycleStart: cycleStart,
        fixesUsedThisMonth: 0, // Reset usage for new cycle
      },
    });

    const newValues = {
      billingCycleStart: updatedOrganization.billingCycleStart,
      fixesUsedThisMonth: updatedOrganization.fixesUsedThisMonth,
    };

    // Log the billing cycle update
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'UPDATE_BILLING_CYCLE',
      resourceType: 'ORGANIZATION',
      resourceId: organizationId,
      oldValues,
      newValues,
    });

    return updatedOrganization;
  }

  async getUsageReport(organizationId?: string) {
    const where = organizationId ? { id: organizationId } : {};

    const organizations = await this.prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        fixesUsedThisMonth: true,
        fixesLimit: true,
        billingCycleStart: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            projects: true,
            errorEvents: true,
          },
        },
      },
    });

    const reports = organizations.map(org => {
      const usagePercentage = org.fixesLimit > 0 ? (org.fixesUsedThisMonth / org.fixesLimit) * 100 : 0;
      const daysUntilCycle = this.getDaysUntilBillingCycle(org.billingCycleStart);
      
      return {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
        },
        usage: {
          fixesUsed: org.fixesUsedThisMonth,
          fixesLimit: org.fixesLimit,
          usagePercentage: Math.round(usagePercentage * 100) / 100,
          remainingFixes: Math.max(0, org.fixesLimit - org.fixesUsedThisMonth),
        },
        billing: {
          billingCycleStart: org.billingCycleStart,
          daysUntilCycle,
          isOverLimit: org.fixesUsedThisMonth > org.fixesLimit,
        },
        stats: {
          usersCount: org._count.users,
          projectsCount: org._count.projects,
          errorsCount: org._count.errorEvents,
        },
      };
    });

    return organizationId ? reports[0] : reports;
  }

  async getRevenueStats() {
    // This would typically integrate with a payment processor
    // For now, we'll calculate estimated revenue based on plans
    const organizations = await this.prisma.organization.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });

    const planPrices = {
      FREE: 0,
      PRO: 29,
      ENTERPRISE: 99,
    };

    const revenueByPlan = organizations.map(item => ({
      plan: item.plan,
      count: item._count.plan,
      monthlyRevenue: item._count.plan * (planPrices[item.plan as keyof typeof planPrices] || 0),
    }));

    const totalMonthlyRevenue = revenueByPlan.reduce((sum, item) => sum + item.monthlyRevenue, 0);

    return {
      revenueByPlan,
      totalMonthlyRevenue,
      estimatedAnnualRevenue: totalMonthlyRevenue * 12,
    };
  }

  async getUsageStats() {
    const stats = await this.prisma.organization.aggregate({
      _sum: {
        fixesUsedThisMonth: true,
        fixesLimit: true,
      },
      _avg: {
        fixesUsedThisMonth: true,
      },
    });

    const totalUsage = stats._sum.fixesUsedThisMonth || 0;
    const totalLimit = stats._sum.fixesLimit || 0;
    const avgUsage = stats._avg.fixesUsedThisMonth || 0;

    return {
      totalUsage,
      totalLimit,
      avgUsage,
      utilizationRate: totalLimit > 0 ? (totalUsage / totalLimit) * 100 : 0,
    };
  }

  async getBillingCycles() {
    const organizations = await this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        billingCycleStart: true,
      },
    });

    const cycles = organizations.map(org => ({
      organizationId: org.id,
      organizationName: org.name,
      billingCycleStart: org.billingCycleStart,
      nextBillingDate: this.getNextBillingDate(org.billingCycleStart),
      daysUntilBilling: this.getDaysUntilBillingCycle(org.billingCycleStart),
    }));

    // Sort by days until billing (ascending)
    cycles.sort((a, b) => a.daysUntilBilling - b.daysUntilBilling);

    return cycles;
  }

  private getDaysUntilBillingCycle(billingCycleStart: Date): number {
    const now = new Date();
    const currentCycle = new Date(billingCycleStart);
    
    // Set current cycle to this month
    currentCycle.setFullYear(now.getFullYear());
    currentCycle.setMonth(now.getMonth());
    
    // If the cycle date hasn't passed this month, it's next month
    if (currentCycle > now) {
      currentCycle.setMonth(currentCycle.getMonth() - 1);
    }
    
    const nextCycle = new Date(currentCycle);
    nextCycle.setMonth(nextCycle.getMonth() + 1);
    
    const diffTime = nextCycle.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getNextBillingDate(billingCycleStart: Date): Date {
    const now = new Date();
    const nextBilling = new Date(billingCycleStart);
    
    nextBilling.setFullYear(now.getFullYear());
    nextBilling.setMonth(now.getMonth());
    
    if (nextBilling <= now) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    
    return nextBilling;
  }
}
