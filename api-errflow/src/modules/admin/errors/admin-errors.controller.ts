import { Controller, Get, Query, Param } from '@nestjs/common';
import { AdminErrorsService } from './admin-errors.service';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('admin/errors')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminErrorsController {
  constructor(private adminErrorsService: AdminErrorsService) { }

  @Get()
  async getAllErrors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminErrorsService.getAllErrors({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
      severity,
      organizationId,
      projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  async getErrorStats() {
    return this.adminErrorsService.getErrorStats();
  }

  @Get('top-errors')
  async getTopErrors() {
    return this.adminErrorsService.getTopErrors();
  }

  @Get('trends')
  async getErrorTrends() {
    return this.adminErrorsService.getErrorTrends();
  }

  @Get(':id')
  async getErrorById(@Param('id') id: string) {
    return this.adminErrorsService.getErrorById(id);
  }
}
