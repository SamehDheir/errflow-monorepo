import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) { }

  @Get()
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('organizationId') organizationId?: string,
    @Query('isSuspended') isSuspended?: string,
  ) {
    return this.adminUsersService.getAllUsers({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      role,
      organizationId,
      isSuspended: isSuspended ? isSuspended === 'true' : undefined,
    });
  }

  @Get('stats')
  async getUserStats() {
    return this.adminUsersService.getUserStats();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminUsersService.createUser(createUserDto, adminId, adminEmail);
  }

  @Put(':id')
  @UseGuards(SuperAdminGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminUsersService.updateUser(id, updateUserDto, adminId, adminEmail);
  }

  @Put(':id/suspend')
  @UseGuards(SuperAdminGuard)
  async suspendUser(
    @Param('id') id: string,
    @Body() suspendDto: SuspendUserDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminUsersService.suspendUser(id, suspendDto, adminId, adminEmail);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.adminUsersService.deleteUser(id, adminId, adminEmail);
  }
}
