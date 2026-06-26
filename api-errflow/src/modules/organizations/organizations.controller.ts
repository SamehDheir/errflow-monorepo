import { Controller, Get, Patch, Delete, Body, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { DeleteOrganizationDto } from './dto/delete-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get()
  async findOne(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationsService.findOne(organizationId);
  }

  @Patch()
  async update(
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organizationId, updateDto);
  }

  @Get('usage')
  async getUsage(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationsService.getUsage(organizationId);
  }

  @Patch('plan')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async updatePlan(
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdatePlanDto,
  ) {
    return this.organizationsService.updatePlan(organizationId, updateDto);
  }

  @Delete()
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async remove(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('userId') userId: string,
    @Body() deleteDto: DeleteOrganizationDto,
  ) {
    return this.organizationsService.remove(organizationId, userId, deleteDto);
  }
}
