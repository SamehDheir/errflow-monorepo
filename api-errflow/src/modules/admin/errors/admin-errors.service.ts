import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class AdminErrorsService {
  constructor(private prisma: PrismaService) {}

  async getAllErrors(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    severity?: string;
    organizationId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { message: { contains: filters.search, mode: "insensitive" } },
        { stack: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId;
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
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [errors, total] = await Promise.all([
      this.prisma.errorEvent.findMany({
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
          fixAttempts: {
            select: {
              id: true,
              status: true,
              confidenceScore: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          pullRequests: {
            select: {
              id: true,
              githubPrNumber: true,
              status: true,
              githubPrUrl: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.errorEvent.count({ where }),
    ]);

    return {
      data: errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getErrorById(id: string) {
    const error = await this.prisma.errorEvent.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        project: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
              },
            },
          },
        },
        fixAttempts: {
          include: {
            pullRequests: {
              select: {
                id: true,
                githubPrNumber: true,
                githubPrUrl: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        pullRequests: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!error) {
      throw new Error("Error not found");
    }

    return error;
  }

  async getErrorStats() {
    const [
      totalErrors,
      errorsByStatus,
      errorsBySeverity,
      errorsByProject,
      errorsByOrganization,
      recentErrors,
    ] = await Promise.all([
      this.prisma.errorEvent.count(),
      this.prisma.errorEvent.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      this.prisma.errorEvent.groupBy({
        by: ["severity"],
        _count: { severity: true },
      }),
      this.prisma.errorEvent.groupBy({
        by: ["projectId"],
        _count: { projectId: true },
        orderBy: { _count: { projectId: "desc" } },
        take: 10,
      }),
      this.prisma.errorEvent.groupBy({
        by: ["organizationId"],
        _count: { organizationId: true },
        orderBy: { _count: { organizationId: "desc" } },
        take: 10,
      }),
      this.prisma.errorEvent.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          message: true,
          severity: true,
          status: true,
          projectId: true,
          organizationId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalErrors,
      errorsByStatus: errorsByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      errorsBySeverity: errorsBySeverity.map((item) => ({
        severity: item.severity,
        count: item._count.severity,
      })),
      errorsByProject: errorsByProject.map((item) => ({
        projectId: item.projectId,
        count: item._count.projectId,
      })),
      errorsByOrganization: errorsByOrganization.map((item) => ({
        organizationId: item.organizationId,
        count: item._count.organizationId,
      })),
      recentErrors,
    };
  }

  async getTopErrors() {
    const topErrors = await this.prisma.errorEvent.groupBy({
      by: ["message"],
      _count: { message: true },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { _count: { message: "desc" } },
      take: 20,
    });

    return topErrors.map((item) => ({
      message: item.message,
      count: item._count.message,
    }));
  }

  async getErrorTrends() {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const trends = await this.prisma.errorEvent.groupBy({
      by: ["createdAt"],
      _count: { createdAt: true },
      where: {
        createdAt: { gte: last7Days },
      },
    });

    return trends.map((item) => ({
      date: item.createdAt,
      count: item._count.createdAt,
    }));
  }
}
