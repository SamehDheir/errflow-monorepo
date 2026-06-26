import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { DeleteOrganizationDto } from './dto/delete-organization.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findOne(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    return {
      id: organization.id,
      name: organization.name,
      plan: organization.plan,
      fixesLimit: organization.fixesLimit,
      fixesUsedThisMonth: organization.fixesUsedThisMonth,
      createdAt: organization.createdAt,
      usersCount: organization._count.users,
      projectsCount: organization._count.projects,
    };
  }

  async update(organizationId: string, updateDto: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: updateDto.name,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      plan: updated.plan,
    };
  }

  async getUsage(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const percentUsed =
      organization.fixesLimit && organization.fixesLimit > 0
        ? (organization.fixesUsedThisMonth / organization.fixesLimit) * 100
        : 0;

    return {
      fixesUsed: organization.fixesUsedThisMonth,
      fixesLimit: organization.fixesLimit,
      percentUsed: Math.round(percentUsed * 100) / 100,
      billingCycleStart: startOfMonth.toISOString().split('T')[0],
      billingCycleEnd: endOfMonth.toISOString().split('T')[0],
      daysRemaining,
    };
  }

  async updatePlan(organizationId: string, updateDto: UpdatePlanDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const planLimits: Record<string, number> = {
      FREE: 10,
      PRO: 100,
      ENTERPRISE: 999999,
    };

    const newFixesLimit = planLimits[updateDto.plan];

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: updateDto.plan as any,
        fixesLimit: newFixesLimit,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      plan: updated.plan,
      fixesLimit: updated.fixesLimit,
    };
  }

  async remove(
    organizationId: string,
    userId: string,
    deleteDto: DeleteOrganizationDto,
  ) {
    const { password, confirmText } = deleteDto;

    // Validate confirmation text
    const expectedText = 'delete my organization';
    if (confirmText.toLowerCase().trim() !== expectedText) {
      throw new BadRequestException(
        `Please type "${expectedText}" to confirm deletion`,
      );
    }

    // Get organization with owner
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { role: 'OWNER' },
          take: 1,
        },
      },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    // Verify the requesting user is the owner
    const owner = organization.users[0];
    if (!owner || owner.id !== userId) {
      throw new ForbiddenException(
        'Only the organization owner can delete the organization',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, owner.passwordHash);
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid password');
    }

    // Get counts for audit log
    const stats = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            apiKeys: true,
            errorEvents: true,
            pullRequests: true,
          },
        },
      },
    });

    // Archive organization data before deletion (soft delete approach)
    const deletionRecord = await this.prisma.deletionLog.create({
      data: {
        organizationId: organization.id,
        organizationName: organization.name,
        deletedBy: userId,
        deletedAt: new Date(),
        stats: {
          users: stats?._count.users || 0,
          projects: stats?._count.projects || 0,
          apiKeys: stats?._count.apiKeys || 0,
          errorEvents: stats?._count.errorEvents || 0,
          pullRequests: stats?._count.pullRequests || 0,
        },
      },
    });

    // Delete all related data in a transaction with timeout
    await this.prisma.$transaction(
      async (tx) => {
        // Delete in correct order to respect foreign keys
        // 1. Delete pull requests
        await tx.pullRequest.deleteMany({
          where: { organizationId },
        });

        // 2. Delete notifications
        await tx.notification.deleteMany({
          where: { organizationId },
        });

        // 3. Delete fix attempts
        await tx.fixAttempt.deleteMany({
          where: { organizationId },
        });

        // 4. Delete error events
        await tx.errorEvent.deleteMany({
          where: { organizationId },
        });

        // 5. Delete projects
        await tx.project.deleteMany({
          where: { organizationId },
        });

        // 6. Delete API keys
        await tx.apiKey.deleteMany({
          where: { organizationId },
        });

        // 7. Delete users (cascade will handle this, but explicit is safer)
        await tx.user.deleteMany({
          where: { organizationId },
        });

        // 8. Finally delete the organization
        await tx.organization.delete({
          where: { id: organizationId },
        });
      },
      {
        timeout: 30000, // 30 seconds timeout for large organizations
        maxWait: 5000, // Wait up to 5s for transaction to start
      },
    );

    return {
      id: organization.id,
      name: organization.name,
      deletedAt: deletionRecord.deletedAt,
      message:
        'Organization and all associated data have been permanently deleted',
    };
  }
}
