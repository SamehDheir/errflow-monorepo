import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class AdminOrganizationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
  ) {}

  async getAllOrganizations(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    plan?: string;
  }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.plan) {
      where.plan = filters.plan;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              projects: true,
              errorEvents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrganizationById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            githubOwner: true,
            githubRepo: true,
            isActive: true,
            createdAt: true,
          },
        },
        apiKeys: {
          select: {
            id: true,
            keyPrefix: true,
            label: true,
            isActive: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async updateOrganization(id: string, updateDto: UpdateOrganizationDto, adminId: string, adminEmail: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const oldValues = {
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      fixesLimit: organization.fixesLimit,
    };

    // Check if slug is being changed and if it's already taken
    if (updateDto.slug && updateDto.slug !== organization.slug) {
      const existingOrg = await this.prisma.organization.findUnique({
        where: { slug: updateDto.slug },
      });

      if (existingOrg) {
        throw new BadRequestException('Slug already exists');
      }
    }

    const updatedOrganization = await this.prisma.organization.update({
      where: { id },
      data: updateDto,
    });

    const newValues = {
      name: updatedOrganization.name,
      slug: updatedOrganization.slug,
      plan: updatedOrganization.plan,
      fixesLimit: updatedOrganization.fixesLimit,
    };

    // Log the update
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'UPDATE',
      resourceType: 'ORGANIZATION',
      resourceId: id,
      oldValues,
      newValues,
    });

    return updatedOrganization;
  }

  async updatePlan(id: string, updateDto: UpdatePlanDto, adminId: string, adminEmail: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const oldValues = {
      plan: organization.plan,
      fixesLimit: organization.fixesLimit,
    };

    const updatedOrganization = await this.prisma.organization.update({
      where: { id },
      data: {
        plan: updateDto.plan,
        fixesLimit: updateDto.fixesLimit,
      },
    });

    const newValues = {
      plan: updatedOrganization.plan,
      fixesLimit: updatedOrganization.fixesLimit,
    };

    // Log the plan update
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'UPDATE_PLAN',
      resourceType: 'ORGANIZATION',
      resourceId: id,
      oldValues,
      newValues,
    });

    return updatedOrganization;
  }

  async deleteOrganization(id: string, adminId: string, adminEmail: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            errorEvents: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Store deletion log before deletion
    await this.prisma.deletionLog.create({
      data: {
        organizationId: id,
        organizationName: organization.name,
        deletedBy: adminId,
        stats: organization._count,
      },
    });

    await this.prisma.organization.delete({
      where: { id },
    });

    // Log the deletion
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'DELETE',
      resourceType: 'ORGANIZATION',
      resourceId: id,
      oldValues: {
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        userCount: organization._count.users,
        projectCount: organization._count.projects,
      },
    });

    return { message: 'Organization deleted successfully' };
  }

  async getOrganizationStats() {
    const [
      totalOrganizations,
      organizationsByPlan,
      recentOrganizations,
      usageStats,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
      this.prisma.organization.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
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
      this.prisma.organization.aggregate({
        _sum: {
          fixesUsedThisMonth: true,
          fixesLimit: true,
        },
        _avg: {
          fixesUsedThisMonth: true,
        },
      }),
    ]);

    return {
      totalOrganizations,
      organizationsByPlan: organizationsByPlan.map(item => ({
        plan: item.plan,
        count: item._count.plan,
      })),
      recentOrganizations,
      usageStats: {
        totalFixesUsed: usageStats._sum.fixesUsedThisMonth || 0,
        totalFixesLimit: usageStats._sum.fixesLimit || 0,
        avgFixesUsed: usageStats._avg.fixesUsedThisMonth || 0,
      },
    };
  }

  async getUsageReport(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            errorEvents: {
              select: {
                id: true,
                severity: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const totalErrors = organization.projects.reduce(
      (sum, project) => sum + project.errorEvents.length,
      0,
    );

    const errorsBySeverity = organization.projects.reduce((acc, project) => {
      project.errorEvents.forEach(error => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const errorsByStatus = organization.projects.reduce((acc, project) => {
      project.errorEvents.forEach(error => {
        acc[error.status] = (acc[error.status] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        fixesUsedThisMonth: organization.fixesUsedThisMonth,
        fixesLimit: organization.fixesLimit,
      },
      usage: {
        totalProjects: organization.projects.length,
        totalErrors,
        errorsBySeverity,
        errorsByStatus,
      },
    };
  }
}
