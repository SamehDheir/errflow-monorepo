import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../audit/admin-audit.service';

@Injectable()
export class AdminApiKeysService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
  ) {}

  async getAllApiKeys(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    organizationId?: string;
    projectId?: string;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { label: { contains: filters.search, mode: 'insensitive' } },
        { keyPrefix: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [apiKeys, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              githubOwner: true,
              githubRepo: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiKey.count({ where }),
    ]);

    return {
      data: apiKeys,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getApiKeyById(id: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        organization: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    return apiKey;
  }

  async deactivateApiKey(id: string, adminId: string, adminEmail: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    const updatedApiKey = await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    // Log the deactivation
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'DEACTIVATE',
      resourceType: 'API_KEY',
      resourceId: id,
      oldValues: { isActive: true },
      newValues: { isActive: false },
    });

    return updatedApiKey;
  }

  async activateApiKey(id: string, adminId: string, adminEmail: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    const updatedApiKey = await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: true },
    });

    // Log the activation
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'ACTIVATE',
      resourceType: 'API_KEY',
      resourceId: id,
      oldValues: { isActive: false },
      newValues: { isActive: true },
    });

    return updatedApiKey;
  }

  async deleteApiKey(id: string, adminId: string, adminEmail: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id },
    });

    // Log the deletion
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'DELETE',
      resourceType: 'API_KEY',
      resourceId: id,
      oldValues: {
        keyPrefix: apiKey.keyPrefix,
        label: apiKey.label,
        isActive: apiKey.isActive,
      },
    });

    return { message: 'API Key deleted successfully' };
  }

  async getApiKeyStats() {
    const [
      totalApiKeys,
      activeApiKeys,
      apiKeysByOrganization,
      apiKeysByProject,
      recentApiKeys,
    ] = await Promise.all([
      this.prisma.apiKey.count(),
      this.prisma.apiKey.count({
        where: { isActive: true },
      }),
      this.prisma.apiKey.groupBy({
        by: ['organizationId'],
        _count: { organizationId: true },
        orderBy: { _count: { organizationId: 'desc' } },
        take: 10,
      }),
      this.prisma.apiKey.groupBy({
        by: ['projectId'],
        _count: { projectId: true },
        orderBy: { _count: { projectId: 'desc' } },
        take: 10,
      }),
      this.prisma.apiKey.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          keyPrefix: true,
          label: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalApiKeys,
      activeApiKeys,
      inactiveApiKeys: totalApiKeys - activeApiKeys,
      apiKeysByOrganization,
      apiKeysByProject,
      recentApiKeys,
    };
  }

  async getUsageReport() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const usage = await this.prisma.apiKey.findMany({
      where: {
        lastUsedAt: { gte: last30Days },
      },
      select: {
        id: true,
        keyPrefix: true,
        lastUsedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return {
      usage,
      totalUsed: usage.length,
    };
  }
}
