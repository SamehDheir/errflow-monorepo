import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async create(organizationId: string, createProjectDto: CreateProjectDto) {
    const existingProject = await this.prisma.project.findFirst({
      where: {
        githubOwner: createProjectDto.githubOwner,
        githubRepo: createProjectDto.githubRepo,
        organizationId,
      },
    });

    if (existingProject) {
      throw new ForbiddenException('Project with this GitHub repository already exists');
    }

    let encryptedToken: string | null = null;
    let iv: string | null = null;
    let keyVersion: number | null = null;

    if (createProjectDto.githubToken) {
      const encrypted = this.cryptoService.encrypt(createProjectDto.githubToken);
      encryptedToken = encrypted.encrypted;
      iv = encrypted.iv;
      keyVersion = encrypted.keyVersion;
    }

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        organizationId,
        githubOwner: createProjectDto.githubOwner,
        githubRepo: createProjectDto.githubRepo,
        defaultBranch: createProjectDto.defaultBranch || 'main',
        githubTokenEncrypted: encryptedToken,
        githubTokenIv: iv,
        githubTokenKeyVersion: keyVersion,
        isActive: true,
      },
    });

    return this.sanitizeProject(project);
  }

  async findAll(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => this.sanitizeProject(p));
  }

  async findOne(id: string, organizationId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return this.sanitizeProject(project);
  }

  async update(id: string, organizationId: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.findOne(id, organizationId);

    const updateData: any = {};

    if (updateProjectDto.name) updateData.name = updateProjectDto.name;
    if (updateProjectDto.githubOwner) updateData.githubOwner = updateProjectDto.githubOwner;
    if (updateProjectDto.githubRepo) updateData.githubRepo = updateProjectDto.githubRepo;
    if (updateProjectDto.defaultBranch) updateData.defaultBranch = updateProjectDto.defaultBranch;

    if (updateProjectDto.githubToken) {
      const encrypted = this.cryptoService.encrypt(updateProjectDto.githubToken);
      updateData.githubTokenEncrypted = encrypted.encrypted;
      updateData.githubTokenIv = encrypted.iv;
      updateData.githubTokenKeyVersion = encrypted.keyVersion;
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateData,
    });

    return this.sanitizeProject(updated);
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }

  private sanitizeProject(project: any) {
    const { githubTokenEncrypted, githubTokenIv, githubTokenKeyVersion, ...sanitized } = project;
    return sanitized;
  }
}
