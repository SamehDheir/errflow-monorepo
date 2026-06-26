import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { CryptoService } from '../../common/crypto/crypto.service';

@Injectable()
export class ApiKeysService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async generateApiKey(): Promise<{ key: string; prefix: string; hash: string }> {
    const key = this.cryptoService.generateApiKey();
    const prefix = key.substring(0, 12);
    const hash = this.cryptoService.hashApiKey(key);

    return { key, prefix, hash };
  }

  async create(userId: string, organizationId: string, createApiKeyDto: CreateApiKeyDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: createApiKeyDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const { key, prefix, hash } = await this.generateApiKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        projectId: createApiKeyDto.projectId,
        organizationId,
        keyHash: hash,
        keyPrefix: prefix,
        label: createApiKeyDto.label,
        isActive: true,
      },
    });

    return {
      id: apiKey.id,
      key,
      prefix: apiKey.keyPrefix,
      label: apiKey.label,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
    };
  }

  async findAll(organizationId: string, projectId?: string) {
    const where: any = { organizationId };

    if (projectId) {
      where.projectId = projectId;
    }

    return this.prisma.apiKey.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            githubOwner: true,
            githubRepo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            githubOwner: true,
            githubRepo: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this API key');
    }

    return apiKey;
  }

  async update(id: string, organizationId: string, updateApiKeyDto: UpdateApiKeyDto) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this API key');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: updateApiKeyDto,
    });
  }

  async remove(id: string, organizationId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this API key');
    }

    return this.prisma.apiKey.delete({
      where: { id },
    });
  }

  async validateApiKey(key: string) {
    const hash = this.cryptoService.hashApiKey(key);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        keyHash: hash,
        isActive: true,
      },
      include: {
        project: true,
        organization: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      apiKey: {
        id: apiKey.id,
        projectId: apiKey.projectId,
        organizationId: apiKey.organizationId,
      },
      project: apiKey.project,
      organization: apiKey.organization,
    };
  }
}
