import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { Request } from "express";

interface AuditLogData {
  adminId: string;
  adminEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AdminAuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminId: data.adminId,
        adminEmail: data.adminEmail,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }

  async getAuditLogs(filters?: {
    adminId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.adminId) {
      where.adminId = filters.adminId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAuditStats() {
    const [totalActions, actionsByType, actionsByResource, recentActions] =
      await Promise.all([
        this.prisma.adminAuditLog.count(),
        this.prisma.adminAuditLog.groupBy({
          by: ["action"],
          _count: { action: true },
        }),
        this.prisma.adminAuditLog.groupBy({
          by: ["resourceType"],
          _count: { resourceType: true },
        }),
        this.prisma.adminAuditLog.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            adminEmail: true,
            action: true,
            resourceType: true,
            resourceId: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      totalActions,
      actionsByType: actionsByType.map((item) => ({
        action: item.action,
        count: item._count.action,
      })),
      actionsByResource: actionsByResource.map((item) => ({
        resourceType: item.resourceType,
        count: item._count.resourceType,
      })),
      recentActions,
    };
  }

  async getAuditLogById(id: string) {
    return this.prisma.adminAuditLog.findUnique({
      where: { id },
    });
  }
}
