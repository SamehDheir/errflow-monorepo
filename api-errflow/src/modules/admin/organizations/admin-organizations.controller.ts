import { Controller, Get, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { AdminOrganizationsService } from './admin-organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';

@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOrganizationsController {
  constructor(private adminOrganizationsService: AdminOrganizationsService) { }

  @Get()
  async getAllOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('plan') plan?: string,
  ) {
    return this.adminOrganizationsService.getAllOrganizations({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      plan,
    });
  }

  @Get('stats')
  async getOrganizationStats() {
    return this.adminOrganizationsService.getOrganizationStats();
  }

  @Get(':id')
  async getOrganizationById(@Param('id') id: string) {
    return this.adminOrganizationsService.getOrganizationById(id);
  }

  @Get(':id/usage')
  async getUsageReport(@Param('id') id: string) {
    return this.adminOrganizationsService.getUsageReport(id);
  }

  @Put(':id')
  @UseGuards(SuperAdminGuard)
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminOrganizationsService.updateOrganization(id, updateDto, adminId, adminEmail);
  }

  @Put(':id/plan')
  @UseGuards(SuperAdminGuard)
  async updatePlan(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlanDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminOrganizationsService.updatePlan(id, updateDto, adminId, adminEmail);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  async deleteOrganization(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminOrganizationsService.deleteOrganization(id, adminId, adminEmail);
  }
}
