import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
  ) {}

  async getAllUsers(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    organizationId?: string;
    isSuspended?: boolean;
  }) {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.isSuspended !== undefined) {
      where.isSuspended = filters.isSuspended;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(user => ({
        ...user,
        passwordHash: undefined, // Never return password hash
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            projects: {
              select: { id: true, name: true, isActive: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      passwordHash: undefined,
    };
  }

  async createUser(createUserDto: CreateUserDto, adminId: string, adminEmail: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        passwordHash,
        role: createUserDto.role,
        organizationId: createUserDto.organizationId || null,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    });

    // Log the creation
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'CREATE',
      resourceType: 'USER',
      resourceId: user.id,
      newValues: {
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });

    return {
      ...user,
      passwordHash: undefined,
    };
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto, adminId: string, adminEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldValues = {
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    // Check if email is being changed and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Hash new password if provided
    const updateData: any = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
      delete updateData.password;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    });

    const newValues = {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      organizationId: updatedUser.organizationId,
    };

    // Log the update
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'UPDATE',
      resourceType: 'USER',
      resourceId: id,
      oldValues,
      newValues,
    });

    return {
      ...updatedUser,
      passwordHash: undefined,
    };
  }

  async suspendUser(id: string, suspendDto: SuspendUserDto, adminId: string, adminEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot suspend super admin');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isSuspended: suspendDto.isSuspended,
        suspendedAt: suspendDto.isSuspended ? new Date() : null,
        suspendedReason: suspendDto.isSuspended ? suspendDto.reason : null,
      },
    });

    // Log the suspension
    await this.auditService.log({
      adminId,
      adminEmail,
      action: suspendDto.isSuspended ? 'SUSPEND' : 'UNSUSPEND',
      resourceType: 'USER',
      resourceId: id,
      newValues: {
        isSuspended: suspendDto.isSuspended,
        reason: suspendDto.reason,
      },
    });

    return {
      ...updatedUser,
      passwordHash: undefined,
    };
  }

  async deleteUser(id: string, adminId: string, adminEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot delete super admin');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    // Log the deletion
    await this.auditService.log({
      adminId,
      adminEmail,
      action: 'DELETE',
      resourceType: 'USER',
      resourceId: id,
      oldValues: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    return { message: 'User deleted successfully' };
  }

  async getUserStats() {
    const [
      totalUsers,
      usersByRole,
      suspendedUsers,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      this.prisma.user.count({
        where: { isSuspended: true },
      }),
      this.prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isSuspended: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalUsers,
      suspendedUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.role,
      })),
      recentUsers,
    };
  }
}
