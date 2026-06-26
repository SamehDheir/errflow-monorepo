import { Controller, Get, Put, Delete, Query, Param } from '@nestjs/common';
import { AdminProjectsService } from './admin-projects.service';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';

@Controller('admin/projects')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProjectsController {
  constructor(private adminProjectsService: AdminProjectsService) { }

  @Get()
  async getAllProjects(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminProjectsService.getAllProjects({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      organizationId,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get('stats')
  async getProjectStats() {
    return this.adminProjectsService.getProjectStats();
  }

  @Get(':id')
  async getProjectById(@Param('id') id: string) {
    return this.adminProjectsService.getProjectById(id);
  }

  @Get(':id/activity')
  async getProjectActivity(@Param('id') id: string) {
    return this.adminProjectsService.getProjectActivity(id);
  }

  @Put(':id/toggle-status')
  @UseGuards(SuperAdminGuard)
  async toggleProjectStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminProjectsService.toggleProjectStatus(id, adminId, adminEmail);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  async deleteProject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminProjectsService.deleteProject(id, adminId, adminEmail);
  }
}
