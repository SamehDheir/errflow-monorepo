import { Module } from '@nestjs/common';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminOrganizationsController } from './organizations/admin-organizations.controller';
import { AdminProjectsController } from './projects/admin-projects.controller';
import { AdminStatsController } from './stats/admin-stats.controller';
import { AdminErrorsController } from './errors/admin-errors.controller';
import { AdminApiKeysController } from './api-keys/admin-api-keys.controller';
import { AdminBillingController } from './billing/admin-billing.controller';
import { AdminAuditController } from './audit/admin-audit.controller';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersService } from './users/admin-users.service';
import { AdminOrganizationsService } from './organizations/admin-organizations.service';
import { AdminProjectsService } from './projects/admin-projects.service';
import { AdminStatsService } from './stats/admin-stats.service';
import { AdminErrorsService } from './errors/admin-errors.service';
import { AdminApiKeysService } from './api-keys/admin-api-keys.service';
import { AdminBillingService } from './billing/admin-billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminAuditService } from './audit/admin-audit.service';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminOrganizationsController,
    AdminProjectsController,
    AdminStatsController,
    AdminErrorsController,
    AdminApiKeysController,
    AdminBillingController,
    AdminAuditController,
  ],
  providers: [
    AdminUsersService,
    AdminOrganizationsService,
    AdminProjectsService,
    AdminStatsService,
    AdminErrorsService,
    AdminApiKeysService,
    AdminBillingService,
    AdminAuditService,
    PrismaService,
    JwtService,
    ConfigService,
  ],
  exports: [
    AdminUsersService,
    AdminOrganizationsService,
    AdminProjectsService,
    AdminStatsService,
    AdminErrorsService,
    AdminApiKeysService,
    AdminBillingService,
    AdminAuditService,
  ],
})
export class AdminModule {}