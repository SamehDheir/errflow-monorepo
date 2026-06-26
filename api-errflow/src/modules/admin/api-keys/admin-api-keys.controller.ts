import { Controller, Get, Put, Delete, Query, Param } from '@nestjs/common';
import { AdminApiKeysService } from './admin-api-keys.service';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';

@Controller('admin/api-keys')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminApiKeysController {
  constructor(private adminApiKeysService: AdminApiKeysService) { }

  @Get()
  async getAllApiKeys(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminApiKeysService.getAllApiKeys({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      organizationId,
      projectId,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get('stats')
  async getApiKeyStats() {
    return this.adminApiKeysService.getApiKeyStats();
  }

  @Get('usage')
  async getUsageReport() {
    return this.adminApiKeysService.getUsageReport();
  }

  @Get(':id')
  async getApiKeyById(@Param('id') id: string) {
    return this.adminApiKeysService.getApiKeyById(id);
  }

  @Put(':id/deactivate')
  @UseGuards(SuperAdminGuard)
  async deactivateApiKey(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminApiKeysService.deactivateApiKey(id, adminId, adminEmail);
  }

  @Put(':id/activate')
  @UseGuards(SuperAdminGuard)
  async activateApiKey(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminApiKeysService.activateApiKey(id, adminId, adminEmail);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  async deleteApiKey(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminApiKeysService.deleteApiKey(id, adminId, adminEmail);
  }
}
