import { Controller, Get, Put, Query, Param, Body } from '@nestjs/common';
import { AdminBillingService } from './admin-billing.service';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBillingController {
  constructor(private adminBillingService: AdminBillingService) { }

  @Get('overview')
  async getBillingOverview() {
    return this.adminBillingService.getBillingOverview();
  }

  @Get('organizations')
  async getOrganizationsByPlan() {
    return this.adminBillingService.getOrganizationsByPlan();
  }

  @Get('usage')
  async getUsageReport(@Query('organizationId') organizationId?: string) {
    return this.adminBillingService.getUsageReport(organizationId);
  }

  @Get('cycles')
  async getBillingCycles() {
    return this.adminBillingService.getBillingCycles();
  }

  @Put(':organizationId/billing-cycle')
  @UseGuards(SuperAdminGuard)
  async updateBillingCycle(
    @Param('organizationId') organizationId: string,
    @Body('cycleStart') cycleStart: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminBillingService.updateBillingCycle(
      organizationId,
      new Date(cycleStart),
      adminId,
      adminEmail,
    );
  }
}
