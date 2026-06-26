import { Controller, Get } from '@nestjs/common';
import { AdminStatsService } from './admin-stats.service';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStatsController {
  constructor(private adminStatsService: AdminStatsService) {}

  @Get('overview')
  async getSystemOverview() {
    return this.adminStatsService.getSystemOverview();
  }

  @Get('users')
  async getUserStats() {
    return this.adminStatsService.getUserStats();
  }

  @Get('organizations')
  async getOrganizationStats() {
    return this.adminStatsService.getOrganizationStats();
  }

  @Get('errors')
  async getErrorStats() {
    return this.adminStatsService.getErrorStats();
  }

  @Get('performance')
  async getPerformanceMetrics() {
    return this.adminStatsService.getPerformanceMetrics();
  }

  @Get('debug')
  async debugCounts() {
    return this.adminStatsService.debugCounts();
  }
}