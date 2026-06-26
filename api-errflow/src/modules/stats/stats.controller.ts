// stats.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { QueryTimelineDto } from './dto/query-timeline.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private statsService: StatsService) { }

  @Get('overview')
  async getOverview(
    // ✅ إضافة organizationId وتمريره للسيرفس
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.statsService.getOverview(organizationId);
  }

  @Get('timeline')
  async getTimeline(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryTimelineDto,
  ) {
    return this.statsService.getTimeline(organizationId, query);
  }
}