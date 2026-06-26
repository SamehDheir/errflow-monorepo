// stats.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryTimelineDto } from './dto/query-timeline.dto';
import { ErrorStatus, FixStatus } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) { }

  async getOverview(organizationId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const whereClause = organizationId ? { organizationId } : {};

    const [
      totalErrors,
      fixedThisMonth,
      allFixAttempts,
      allFixAttemptsSuccess,
      avgConfidenceResult,
      topErrorsResult,
    ] = await Promise.all([
      this.prisma.errorEvent.count({ where: whereClause }),
      this.prisma.errorEvent.count({
        where: {
          ...whereClause,
          status: ErrorStatus.FIX_READY,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.fixAttempt.count({ where: whereClause }),
      this.prisma.fixAttempt.count({
        where: { ...whereClause, status: FixStatus.SUCCESS },
      }),
      this.prisma.fixAttempt.aggregate({
        where: whereClause,
        _avg: { confidenceScore: true },
      }),
      this.prisma.errorEvent.groupBy({
        by: ['message'],
        where: whereClause,
        _count: { message: true },
        orderBy: { _count: { message: 'desc' } },
        take: 5,
      }),
    ]);

    // ✅ organization query منفصلة — تُنفَّذ فقط إذا كان organizationId موجوداً
    const organization = organizationId
      ? await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          fixesUsedThisMonth: true,
          fixesLimit: true,
          plan: true,
        },
      })
      : null;

    const fixSuccessRate =
      allFixAttempts > 0 ? (allFixAttemptsSuccess / allFixAttempts) * 100 : 0;

    const topErrors = topErrorsResult.map((item) => ({
      message: item.message,
      count: item._count.message,
    }));

    return {
      totalErrors,
      fixedThisMonth,
      fixSuccessRate,
      avgConfidenceScore: avgConfidenceResult._avg.confidenceScore ?? 0,
      fixesUsed: organization?.fixesUsedThisMonth ?? 0,
      fixesLimit: organization?.fixesLimit ?? 0,
      topErrors,
    };
  }

  async getTimeline(organizationId: string, query: QueryTimelineDto) {
    const { days = 30 } = query;
    const startDate = new Date();
    // ✅ إصلاح: كان setDate يُستدعى مرتين بالخطأ
    startDate.setDate(startDate.getDate() - days);

    const errorEvents = await this.prisma.errorEvent.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const timeline: Array<{
      date: string;
      errorsReceived: number;
      fixesOpened: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const errorsReceived = errorEvents.filter(
        (e) => e.createdAt.toISOString().split('T')[0] === dateStr,
      ).length;

      const fixesOpened = errorEvents.filter(
        (e) =>
          e.createdAt.toISOString().split('T')[0] === dateStr &&
          e.status === ErrorStatus.FIX_READY,
      ).length;

      timeline.push({ date: dateStr, errorsReceived, fixesOpened });
    }

    return timeline;
  }
}