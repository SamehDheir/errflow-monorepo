import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryErrorsDto } from './dto/query-errors.dto';
import { ErrorStatus, FixStatus } from '@prisma/client';
import { GitHubService } from '../github/github.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CryptoService } from '../../common/crypto/crypto.service';

@Injectable()
export class ErrorsService {
  private readonly logger = new Logger(ErrorsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('pipeline') private pipelineQueue: Queue,
    private githubService: GitHubService,
    private notificationsService: NotificationsService,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Json columns are returned as objects by Prisma, but legacy rows were
   * written double-encoded (a JSON string). Accept both so file/line resolve
   * for old and new rows alike.
   */
  private toObject(value: unknown): any {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value;
  }

  async findAll(organizationId: string, query: QueryErrorsDto) {
    const { page = 1, limit = 20, status, severity, projectId } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const [data, total] = await Promise.all([
      this.prisma.errorEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              githubOwner: true,
              githubRepo: true,
            },
          },
          fixAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          pullRequests: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.errorEvent.count({ where }),
    ]);

    // Map fields to match frontend expectations
    const mappedData = data.map(errorEvent => {
      const runtime = this.toObject(errorEvent.runtime);
      const metadata = this.toObject(errorEvent.metadata);

      return {
        ...errorEvent,
        occurrences: errorEvent.occurrenceCount,
        firstSeen: errorEvent.firstSeenAt.toISOString(),
        lastSeen: errorEvent.lastSeenAt.toISOString(),
        file: runtime.primaryFile || metadata.file || runtime.file || 'unknown',
        line: runtime.primaryLine ?? metadata.line ?? runtime.line ?? 0,
        fixAttempts: errorEvent.fixAttempts.map(fixAttempt => ({
          ...fixAttempt,
          confidence: fixAttempt.confidenceScore ? Math.round(fixAttempt.confidenceScore * 100) : null,
        })),
        pullRequests: errorEvent.pullRequests.map(pr => ({
          ...pr,
          url: pr.githubPrUrl,
          number: pr.githubPrNumber,
        })),
      };
    });

    return {
      data: mappedData,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, organizationId: string) {
    const errorEvent = await this.prisma.errorEvent.findFirst({
      where: { id, organizationId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            githubOwner: true,
            githubRepo: true,
            defaultBranch: true,
          },
        },
        fixAttempts: {
          orderBy: { createdAt: 'desc' },
          include: {
            pullRequests: true,
          },
        },
        pullRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!errorEvent) {
      throw new NotFoundException('Error event not found');
    }

    // Map PullRequest fields to match frontend expectations
    const runtime = this.toObject(errorEvent.runtime);
    const metadata = this.toObject(errorEvent.metadata);

    const mappedErrorEvent = {
      ...errorEvent,
      occurrences: errorEvent.occurrenceCount,
      firstSeen: errorEvent.firstSeenAt.toISOString(),
      lastSeen: errorEvent.lastSeenAt.toISOString(),
      file: runtime.primaryFile || metadata.file || runtime.file || 'unknown',
      line: runtime.primaryLine ?? metadata.line ?? runtime.line ?? 0,
      fixAttempts: errorEvent.fixAttempts.map((fixAttempt: any) => ({
        ...fixAttempt,
        confidence: fixAttempt.confidenceScore ? Math.round(fixAttempt.confidenceScore * 100) : null,
        pullRequests: fixAttempt.pullRequests ? [{
          ...fixAttempt.pullRequests,
          url: fixAttempt.pullRequests.githubPrUrl,
          number: fixAttempt.pullRequests.githubPrNumber,
        }] : [],
      })),
      pullRequests: errorEvent.pullRequests.map((pr: any) => ({
        ...pr,
        url: pr.githubPrUrl,
        number: pr.githubPrNumber,
      })),
    };

    return mappedErrorEvent;
  }

  async ignore(id: string, organizationId: string) {
    const errorEvent = await this.prisma.errorEvent.findFirst({
      where: { id, organizationId },
    });

    if (!errorEvent) {
      throw new NotFoundException('Error event not found');
    }

    await this.prisma.errorEvent.update({
      where: { id },
      data: { status: ErrorStatus.IGNORED },
    });

    return { message: 'Error event ignored' };
  }

  async createPrAnyway(errorEventId: string, organizationId: string, userId: string) {
    this.logger.log(`[createPrAnyway] Creating PR for error ${errorEventId} despite test failures`);

    const errorEvent = await this.prisma.errorEvent.findFirst({
      where: { id: errorEventId, organizationId },
      include: {
        project: true,
        organization: true,
        fixAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!errorEvent) {
      throw new NotFoundException('Error event not found');
    }

    const latestFix = errorEvent.fixAttempts[0];
    if (!latestFix || !latestFix.fixedCode) {
      throw new BadRequestException('No fix available for this error');
    }

    // Only allow PR creation for failed/needs-review fixes
    if (latestFix.status !== 'NEEDS_MANUAL_REVIEW' && latestFix.status !== 'FAILED') {
      throw new BadRequestException('Fix is not in a valid state for manual PR creation');
    }

    const project = errorEvent.project;
    const organization = errorEvent.organization;

    // Decrypt GitHub token
    if (!project.githubTokenEncrypted || !project.githubTokenIv) {
      throw new BadRequestException('GitHub token not configured for project');
    }

    const githubToken = this.cryptoService.decrypt(
      project.githubTokenEncrypted,
      project.githubTokenIv,
    );

    // Extract repo name
    let repoName = project.githubRepo;
    if (repoName.includes('github.com/')) {
      const match = repoName.match(/github\.com\/[^\/]+\/([^\/]+)/);
      if (match) {
        repoName = match[1].replace('.git', '');
      }
    }

    // Get file content for SHA
    const fileContent = await this.githubService.getFileContent(
      githubToken,
      project.githubOwner,
      repoName,
      latestFix.targetFile!,
      project.defaultBranch || 'main',
    );

    // Create branch and commit
    const branchName = `autopr/manual-fix-${Date.now()}`;
    await this.githubService.createBranch(
      githubToken,
      project.githubOwner,
      repoName,
      branchName,
      project.defaultBranch || 'main',
    );

    await this.githubService.commitFile(
      {
        owner: project.githubOwner,
        repo: repoName,
        branch: branchName,
        filePath: latestFix.targetFile!,
        content: latestFix.fixedCode,
        message: `AutoPR: Manual fix for ${errorEvent.message.substring(0, 50)}`,
        sha: fileContent.sha,
      },
      githubToken,
    );

    // Create PR
    const prBody = this.buildPrBody(errorEvent, latestFix, true);
    const pullRequest = await this.githubService.openPullRequest(
      {
        owner: project.githubOwner,
        repo: repoName,
        title: `AutoPR: Fix for ${errorEvent.message.substring(0, 50)} (manual)`,
        body: prBody,
        head: branchName,
        base: project.defaultBranch || 'main',
      },
      githubToken,
    );

    // Save PR to database
    const savedPr = await this.prisma.pullRequest.create({
      data: {
        projectId: project.id,
        organizationId: organization.id,
        errorEventId,
        fixAttemptId: latestFix.id,
        githubPrNumber: pullRequest.prNumber,
        githubPrUrl: pullRequest.prUrl,
        branchName,
        status: 'OPEN',
      },
    });

    // Update error status
    await this.prisma.errorEvent.update({
      where: { id: errorEventId },
      data: { status: ErrorStatus.FIX_READY },
    });

    // Update fix status
    await this.prisma.fixAttempt.update({
      where: { id: latestFix.id },
      data: { status: 'SUCCESS' as FixStatus },
    });

    // Increment usage
    await this.prisma.organization.update({
      where: { id: organization.id },
      data: { fixesUsedThisMonth: { increment: 1 } },
    });

    // Send email notification
    const orgUsers = await this.prisma.user.findMany({
      where: { organizationId: organization.id, role: { in: ['OWNER', 'ADMIN'] } },
    });

    for (const user of orgUsers) {
      await this.notificationsService.sendFixEmail({
        to: user.email,
        errorMessage: errorEvent.message,
        filePath: latestFix.targetFile!,
        prUrl: savedPr.githubPrUrl || '',
        prNumber: savedPr.githubPrNumber || 0,
        explanation: latestFix.explanation || '',
        rootCause: latestFix.rootCause || '',
        confidenceScore: latestFix.confidenceScore || 0,
        testsPassed: false, // Tests failed, user created anyway
      });
    }

    this.logger.log(`[createPrAnyway] PR created successfully: ${pullRequest.prUrl}`);

    return {
      message: 'Pull request created successfully',
      prNumber: pullRequest.prNumber,
      prUrl: pullRequest.prUrl,
    };
  }

  async retryFix(errorEventId: string, organizationId: string) {
    this.logger.log(`[retryFix] Retrying fix for error ${errorEventId}`);

    const errorEvent = await this.prisma.errorEvent.findFirst({
      where: { id: errorEventId, organizationId },
    });

    if (!errorEvent) {
      throw new NotFoundException('Error event not found');
    }

    // Reset status and enqueue a pipeline job — same path as ingest, so the
    // retry gets the queue's concurrency limit, cooldown, and retry/backoff
    // instead of running the full AI pipeline inline on the API process.
    await this.prisma.errorEvent.update({
      where: { id: errorEventId },
      data: { status: ErrorStatus.QUEUED },
    });

    await this.pipelineQueue.add('process-error', { errorEventId });

    return { message: 'Fix retry initiated' };
  }

  private buildPrBody(errorEvent: any, fixAttempt: any, isManual: boolean): string {
    const warning = isManual
      ? `\n\n⚠️ **Warning:** This fix did not pass automated tests. Please review carefully before merging.`
      : '';

    return `
## AutoPR Fix${isManual ? ' (Manual Override)' : ''}

**Error:** ${errorEvent.message}

**Root Cause:** ${fixAttempt.rootCause || 'Unknown'}

**Explanation:** ${fixAttempt.explanation || 'No explanation provided'}

**Confidence:** ${Math.round((fixAttempt.confidenceScore || 0) * 100)}%${warning}

### Changes
This PR ${isManual ? 'manually' : 'automatically'} fixes the error by modifying the affected file.

### Testing
${isManual ? '⚠️ Tests failed during automated validation.' : 'The fix has been validated with automated tests.'}

Please review the changes and merge if they look correct.
    `.trim();
  }
}
