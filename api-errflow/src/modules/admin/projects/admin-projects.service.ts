import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../audit/admin-audit.service';

@Injectable()
export class AdminProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
  ) {}

  async getAllProjects(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    organizationId?: string;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { githubOwner: { contains: filters.search, mode: 'insensitive' } },
        { githubRepo: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
            },
          },
          _count: {
            select: {
              errorEvents: true,
              apiKeys: true,
              pullRequests: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
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
        errorEvents: {
          select: {
            id: true,
            message: true,
            severity: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        pullRequests: {
          select: {
            id: true,
            githubPrNumber: true,
            status: true,
            githubPrUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async toggleProjectStatus(id: string, adminId: string, adminEmail: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const oldStatus = project.isActive;
    const newStatus = !oldStatus;

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: { isActive: newStatus },
    });

    // Log the status change
    await this.auditService.log({
      adminId,
      adminEmail,
      action: newStatus ? 'ACTIVATE' : 'DEACTIVATE',
      resourceType: 'PROJECT',
      resourceId: id,
      oldValues: { isActive: oldStatus },
      newValues: { isActive: newStatus },
    });

    return updatedProject;
  }

  async deleteProject(id: string, adminId: string, adminEmail: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            errorEvents: true,
            apiKeys: true,
            pullRequests: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    // Log the deletion
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'DELETE',
      resourceType: 'PROJECT',
      resourceId: id,
      oldValues: {
        name: project.name,
        githubOwner: project.githubOwner,
        githubRepo: project.githubRepo,
        isActive: project.isActive,
        errorCount: project._count.errorEvents,
        apiKeyCount: project._count.apiKeys,
        pullRequestCount: project._count.pullRequests,
      },
    });

    return { message: 'Project deleted successfully' };
  }

  async getProjectStats() {
    const [
      totalProjects,
      activeProjects,
      projectsByOrganization,
      recentProjects,
      topProjects,
    ] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.count({
        where: { isActive: true },
      }),
      this.prisma.project.groupBy({
        by: ['organizationId'],
        _count: { organizationId: true },
        orderBy: { _count: { organizationId: 'desc' } },
        take: 10,
      }),
      this.prisma.project.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          githubOwner: true,
          githubRepo: true,
          isActive: true,
          createdAt: true,
          organization: {
            select: { name: true },
          },
        },
      }),
      this.getTopProjects(),
    ]);

    return {
      totalProjects,
      activeProjects,
      inactiveProjects: totalProjects - activeProjects,
      projectsByOrganization,
      recentProjects,
      topProjects,
    };
  }

  private async getTopProjects() {
    return this.prisma.project.findMany({
      take: 10,
      orderBy: {
        errorEvents: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: { errorEvents: true },
        },
        organization: {
          select: { name: true },
        },
      },
    });
  }

  async getProjectActivity(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [
      errorTrends,
      recentErrors,
      recentFixes,
      recentPullRequests,
    ] = await Promise.all([
      this.prisma.errorEvent.groupBy({
        by: ['createdAt'],
        _count: { createdAt: true },
        where: {
          projectId: id,
          createdAt: { gte: last30Days },
        },
      }),
      this.prisma.errorEvent.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          message: true,
          severity: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.fixAttempt.findMany({
        where: { 
          errorEvent: {
            projectId: id,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.pullRequest.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      project,
      errorTrends: errorTrends.map(item => ({
        date: item.createdAt,
        count: item._count.createdAt,
      })),
      recentErrors,
      recentFixes,
      recentPullRequests,
    };
  }
}
