import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GitHubService } from '../github/github.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { QueryPullRequestsDto } from './dto/query-pull-requests.dto';
import { PrStatus } from '@prisma/client';

@Injectable()
export class PullRequestsService {
  constructor(
    private prisma: PrismaService,
    private githubService: GitHubService,
    private cryptoService: CryptoService,
  ) {}

  async findAll(organizationId: string, query: QueryPullRequestsDto) {
    const where: any = { organizationId };

    if (query.status) {
      where.status = query.status as PrStatus;
    }

    let pullRequests = await this.prisma.pullRequest.findMany({
      where,
      include: {
        fixAttempt: true,
        project: true,
        errorEvent: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sync open PRs with GitHub to get latest status FIRST
    await this.syncWithGitHub(pullRequests);

    // Helper function to safely extract test result values from JsonValue
    const getTestResultValue = (testResult: any, key: string): boolean | null => {
      if (typeof testResult === 'object' && testResult !== null && key in testResult) {
        return testResult[key] ?? null;
      }
      return null;
    };

    // Transform data to match frontend format AFTER sync
    const transformedPullRequests = pullRequests.map((pr) => ({
      id: pr.id,
      number: pr.githubPrNumber,
      title: pr.title,
      branch: pr.branchName,
      status: pr.status,
      confidence: pr.fixAttempt?.confidenceScore ? Math.round(pr.fixAttempt.confidenceScore * 100) : null,
      testsPassed: getTestResultValue(pr.fixAttempt?.testResult, 'passed'),
      testsSkipped: getTestResultValue(pr.fixAttempt?.testResult, 'skipped'),
      testsFailed: getTestResultValue(pr.fixAttempt?.testResult, 'failed'),
      url: pr.githubPrUrl,
      errorId: pr.errorEventId,
      projectId: pr.projectId,
      project: pr.project,
      projectName: pr.project?.name,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
    }));

    const total = pullRequests.length;
    const merged = pullRequests.filter((pr) => pr.status === PrStatus.MERGED).length;
    const open = pullRequests.filter((pr) => pr.status === PrStatus.OPEN).length;
    const avgConfidence =
      pullRequests.length > 0
        ? pullRequests.reduce((sum, pr) => sum + (pr.fixAttempt?.confidenceScore || 0), 0) / pullRequests.length
        : 0;

    return {
      pullRequests: transformedPullRequests,
      stats: {
        total,
        merged,
        open,
        avgConfidence: avgConfidence ? Math.round(avgConfidence * 100) : 0,
      },
    };
  }

  private async syncWithGitHub(pullRequests: any[]) {
    // Only sync open PRs that have GitHub PR numbers
    const openPrs = pullRequests.filter(
      (pr) => pr.status === PrStatus.OPEN && pr.githubPrNumber && pr.project,
    );

    console.log(`[Sync] Found ${openPrs.length} open PRs to sync with GitHub`);

    for (const pr of openPrs) {
      try {
        // Get the project's GitHub token
        const project = pr.project;
        
        // Extract repo name from full GitHub URL if needed
        let repoName = project.githubRepo;
        if (repoName.includes('github.com/')) {
          const match = repoName.match(/github\.com\/[^\/]+\/([^\/]+)/);
          if (match) {
            repoName = match[1].replace('.git', '');
          }
        }
        
        console.log(`[Sync] Checking PR #${pr.githubPrNumber} for ${project.githubOwner}/${repoName}`);
        
        if (!project.githubTokenEncrypted || !project.githubTokenIv) {
          console.log(`[Sync] Skipping PR #${pr.githubPrNumber} - no GitHub token`);
          continue;
        }

        // Decrypt token using CryptoService
        const token = this.cryptoService.decrypt(
          project.githubTokenEncrypted,
          project.githubTokenIv,
        );

        console.log(`[Sync] Fetching GitHub status for PR #${pr.githubPrNumber}`);
        const githubStatus = await this.githubService.getPullRequestStatus(
          token,
          project.githubOwner,
          repoName,
          pr.githubPrNumber,
        );

        console.log(`[Sync] GitHub status for PR #${pr.githubPrNumber}:`, githubStatus);

        if (githubStatus) {
          let newStatus: PrStatus = pr.status;

          if (githubStatus.merged) {
            newStatus = PrStatus.MERGED;
            console.log(`[Sync] PR #${pr.githubPrNumber} is MERGED on GitHub`);
          } else if (githubStatus.state === 'closed') {
            newStatus = PrStatus.CLOSED;
            console.log(`[Sync] PR #${pr.githubPrNumber} is CLOSED on GitHub`);
          } else {
            console.log(`[Sync] PR #${pr.githubPrNumber} is still OPEN on GitHub`);
          }

          // Update if status changed
          if (newStatus !== pr.status) {
            console.log(`[Sync] Updating PR #${pr.githubPrNumber} from ${pr.status} to ${newStatus}`);
            await this.prisma.pullRequest.update({
              where: { id: pr.id },
              data: {
                status: newStatus,
                mergedAt: newStatus === PrStatus.MERGED ? new Date() : pr.mergedAt,
              },
            });
            
            // Update the local pr object so the response reflects the new status
            pr.status = newStatus;
            if (newStatus === PrStatus.MERGED) {
              pr.mergedAt = new Date();
            }
            console.log(`[Sync] Successfully updated PR #${pr.githubPrNumber} to ${newStatus}`);
          }
        } else {
          console.log(`[Sync] No GitHub status returned for PR #${pr.githubPrNumber}`);
        }
      } catch (error) {
        // Log error but don't fail the entire request
        console.error(
          `[Sync] Failed to sync PR ${pr.id} (GitHub #${pr.githubPrNumber}):`,
          error,
        );
      }
    }
  }
}
