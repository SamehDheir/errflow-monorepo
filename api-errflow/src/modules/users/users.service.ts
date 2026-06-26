import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            plan: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's activity stats
    const stats = await this.getUserStats(userId, user.organizationId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organization: user.organization,
      stats,
    };
  }

  private async getUserStats(userId: string, organizationId: string) {
    const [
      projectsCount,
      apiKeysCount,
      errorEventsCount,
      pullRequestsCount,
    ] = await Promise.all([
      this.prisma.project.count({
        where: { organizationId },
      }),
      this.prisma.apiKey.count({
        where: { organizationId },
      }),
      this.prisma.errorEvent.count({
        where: { organizationId },
      }),
      this.prisma.pullRequest.count({
        where: { organizationId },
      }),
    ]);

    return {
      projectsCount,
      apiKeysCount,
      errorEventsCount,
      pullRequestsCount,
    };
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email is already taken');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: updateDto.name,
        email: updateDto.email,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            plan: true,
            slug: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      organization: updated.organization,
    };
  }

  async changePassword(userId: string, passwordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      passwordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    // Validate new password
    if (passwordDto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    if (passwordDto.newPassword !== passwordDto.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(passwordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return {
      message: 'Password changed successfully',
    };
  }
}
