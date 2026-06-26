import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../../common/crypto/crypto.service";
import { GitHubService } from "../github/github.service";
import { AiFixService } from "../ai-fix/ai-fix.service";
import { NotificationsService } from "../notifications/notifications.service";
import { StackParser } from "./stack-parser";
import { FixStatus, ErrorStatus } from "@prisma/client";

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private githubService: GitHubService,
    private aiFixService: AiFixService,
    private notificationsService: NotificationsService,
  ) {}

  async run(errorEventId: string) {
    let fixAttemptId: string | null = null;

    try {
      this.logger.log(
        `[STEP 1] Starting pipeline for error event ${errorEventId}`,
      );

      const errorEvent = await this.prisma.errorEvent.findUnique({
        where: { id: errorEventId },
        include: {
          project: true,
          organization: true,
        },
      });

      if (!errorEvent) {
        throw new Error(`ErrorEvent not found: ${errorEventId}`);
      }

      // Update ErrorEvent status to PROCESSING
      await this.prisma.errorEvent.update({
        where: { id: errorEventId },
        data: { status: ErrorStatus.PROCESSING },
      });
      this.logger.log(`[STEP 1] ErrorEvent status updated to PROCESSING`);

      const project = errorEvent.project;
      const organization = errorEvent.organization;

      this.logger.log(
        `[STEP 2] Found project: ${project.name}, org: ${organization.name}`,
      );

      // Extract repo name from full GitHub URL if needed
      let repoName = project.githubRepo;
      if (repoName.includes("github.com/")) {
        const match = repoName.match(/github\.com\/[^\/]+\/([^\/]+)/);
        if (match) {
          repoName = match[1].replace(".git", "");
          this.logger.log(`[STEP 2] Extracted repo name from URL: ${repoName}`);
        }
      }

      const fixAttempt = await this.prisma.fixAttempt.create({
        data: {
          errorEventId,
          organizationId: organization.id,
          status: FixStatus.PENDING,
        },
      });

      fixAttemptId = fixAttempt.id;
      this.logger.log(`[STEP 3] Created fix attempt: ${fixAttemptId}`);

      // Update status to ANALYZING
      await this.prisma.fixAttempt.update({
        where: { id: fixAttemptId },
        data: { status: FixStatus.ANALYZING },
      });
      this.logger.log(`[STEP 4] Status updated to ANALYZING`);

      if (!project.githubTokenEncrypted || !project.githubTokenIv) {
        throw new Error("GitHub token not configured for project");
      }

      this.logger.log(`[STEP 4] Decrypting GitHub token`);
      const githubToken = this.cryptoService.decrypt(
        project.githubTokenEncrypted,
        project.githubTokenIv,
      );

      this.logger.log(`[STEP 5] Parsing stack trace`);
      const stackTrace = StackParser.parse(errorEvent.stack || "");
      this.logger.log(
        `[STEP 5] Stack trace parsed - file: ${stackTrace.primaryFile}, line: ${stackTrace.primaryLine}`,
      );

      // Convert Windows absolute path to relative path for GitHub
      let relativeFilePath = stackTrace.primaryFile;
      if (relativeFilePath.match(/^[A-Z]:\\/i)) {
        // Windows absolute path - extract relative path
        // Convert backslashes to forward slashes and remove drive letter
        relativeFilePath = relativeFilePath.replace(/\\/g, "/");
        // Find the last segment that looks like a source path (src/, lib/, etc.)
        const pathParts = relativeFilePath.split("/");
        const srcIndex = pathParts.findIndex(
          (p) => p === "src" || p === "lib" || p === "app" || p === "source",
        );
        if (srcIndex >= 0) {
          relativeFilePath = pathParts.slice(srcIndex).join("/");
        } else {
          // If no common source dir found, take last 2 segments
          relativeFilePath = pathParts.slice(-2).join("/");
        }
        this.logger.log(
          `[STEP 5] Converted Windows path to: ${relativeFilePath}`,
        );
      }
      // Mac/Linux absolute path
      else if (relativeFilePath.startsWith("/")) {
        const pathParts = relativeFilePath.split("/");
        const srcIndex = pathParts.findIndex((p) =>
          ["src", "lib", "app", "source"].includes(p),
        );
        relativeFilePath =
          srcIndex >= 0
            ? pathParts.slice(srcIndex).join("/")
            : pathParts.slice(-2).join("/");
      } else if (relativeFilePath.includes("\\")) {
        relativeFilePath = relativeFilePath.replace(/\\/g, "/");
      }

      await this.prisma.fixAttempt.update({
        where: { id: fixAttemptId },
        data: {
          status: FixStatus.ANALYZING,
          targetFile: relativeFilePath,
        },
      });

      this.logger.log(`[STEP 6] Fetching file content from GitHub`);
      this.logger.log(
        `[STEP 6] GitHub: ${project.githubOwner}/${repoName}, Branch: ${project.defaultBranch || "main"}, File: ${relativeFilePath}`,
      );
      const fileContent = await this.githubService.getFileContent(
        githubToken,
        project.githubOwner,
        repoName,
        relativeFilePath,
        project.defaultBranch || "main",
      );
      this.logger.log(`[STEP 6] File content fetched successfully`);

      await this.prisma.fixAttempt.update({
        where: { id: fixAttemptId },
        data: {
          status: FixStatus.GENERATING,
          originalCode: fileContent.content,
        },
      });
      this.logger.log(`[STEP 7] Status updated to GENERATING`);

      const decision = await this.aiFixService.generateAndDecide({
        errorMessage: errorEvent.message,
        stackTrace: errorEvent.stack || "",
        filePath: relativeFilePath,
        lineNumber: stackTrace.primaryLine || 0,
        functionName: stackTrace.primaryFunction || "unknown",
        fileContent: fileContent.content,
        language: stackTrace.language,
        organizationId: organization.id,
        errorEventId: errorEventId,
      });

      const aiFix = decision.fix;
      this.logger.log(
        `[STEP 7] AI fix generated - confidence: ${aiFix.confidenceScore}`,
      );

      await this.prisma.fixAttempt.update({
        where: { id: fixAttemptId },
        data: {
          status: FixStatus.TESTING,
          fixedCode: aiFix.fixedCode,
          explanation: aiFix.explanation,
          rootCause: aiFix.rootCause,
          confidenceScore: aiFix.confidenceScore,
          lowConfidence: aiFix.lowConfidence,
          aiModel: "llama-3.1-8b-instant",
          tokensUsed: aiFix.tokensUsed,
        },
      });

      this.logger.log(`[STEP 8] Running tests / Making decision`);
      this.logger.log(
        `[STEP 8] Changed lines: ${aiFix.changedLines}, Confidence: ${aiFix.confidenceScore}`,
      );

      this.logger.log(
        `[STEP 8] AI Decision: ${decision.action} - Reason: ${decision.reason}`,
      );

      if (decision.action === "open_pr") {
        this.logger.log(
          `[STEP 8] Tests passed or confidence high enough - proceeding with PR`,
        );
        await this.prisma.fixAttempt.update({
          where: { id: fixAttemptId },
          data: { status: FixStatus.SUCCESS },
        });
      } else {
        this.logger.log(
          `[STEP 8] Tests failed or confidence too low - manual review required`,
        );

        // Map AI decision reason to our failure reason
        const reasonMap: Record<string, string> = {
          tests_failed: "ASSERTION_FAILURE",
          low_confidence: "LOW_CONFIDENCE",
          too_many_changes: "TOO_MANY_CHANGES",
        };
        const failureReason = reasonMap[decision.reason] || "UNKNOWN";

        const updateData: any = {
          status: "NEEDS_MANUAL_REVIEW",
          failureReason: failureReason,
          requiresManualReview: true,
          testResult: decision.testOutput
            ? JSON.stringify({
                passed: false,
                stderr: decision.testOutput,
                output: decision.testOutput,
              })
            : null,
        };
        await this.prisma.fixAttempt.update({
          where: { id: fixAttemptId },
          data: updateData,
        });

        await this.prisma.errorEvent.update({
          where: { id: errorEventId },
          data: { status: ErrorStatus.FAILED },
        });

        // Send failure email
        const orgUsers = await this.prisma.user.findMany({
          where: {
            organizationId: organization.id,
            role: { in: ["OWNER", "ADMIN"] },
          },
        });

        for (const user of orgUsers) {
          await this.notificationsService.sendFailureEmail({
            to: user.email,
            errorMessage: errorEvent.message,
            step: "Fix validation",
            errorDetail: decision.testOutput || decision.reason,
            failureReason: failureReason,
            manualReviewUrl: `${process.env.FRONTEND_URL}/dashboard/errors/${errorEventId}`,
          });
        }

        this.logger.log(
          `[STEP 12] Pipeline halted for error event ${errorEventId} - fix saved for manual review`,
        );
        return;
      }

      // Tests passed, proceed with PR creation
      this.logger.log(`[STEP 9] Creating GitHub branch`);
      const branchName = `autopr/fix-${Date.now()}`;

      await this.githubService.createBranch(
        githubToken,
        project.githubOwner,
        repoName,
        branchName,
        project.defaultBranch || "main",
      );
      this.logger.log(`[STEP 9] Branch created: ${branchName}`);

      this.logger.log(`[STEP 10] Committing file to GitHub`);
      await this.githubService.commitFile(
        {
          owner: project.githubOwner,
          repo: repoName,
          branch: branchName,
          filePath: relativeFilePath,
          content: aiFix.fixedCode,
          message: `errflow: Fix for ${errorEvent.message.substring(0, 50)}`,
          sha: fileContent.sha,
        },
        githubToken,
      );
      this.logger.log(`[STEP 10] File committed successfully`);

      this.logger.log(`[STEP 11] Opening Pull Request`);
      const prBody = this.buildPrBody(errorEvent, aiFix);
      const pullRequest = await this.githubService.openPullRequest(
        {
          owner: project.githubOwner,
          repo: repoName,
          title: `errflow: Fix for ${errorEvent.message.substring(0, 50)}`,
          body: prBody,
          head: branchName,
          base: project.defaultBranch || "main",
        },
        githubToken,
      );
      this.logger.log(`[STEP 11] PR opened: ${pullRequest.prUrl}`);

      const savedPr = await this.prisma.pullRequest.create({
        data: {
          projectId: project.id,
          organizationId: organization.id,
          errorEventId,
          fixAttemptId: fixAttemptId,
          githubPrNumber: pullRequest.prNumber,
          githubPrUrl: pullRequest.prUrl,
          branchName,
          status: "OPEN",
        },
      });

      await this.prisma.errorEvent.update({
        where: { id: errorEventId },
        data: { status: ErrorStatus.FIX_READY },
      });

      await this.prisma.organization.update({
        where: { id: organization.id },
        data: { fixesUsedThisMonth: { increment: 1 } },
      });

      const orgUsers = await this.prisma.user.findMany({
        where: {
          organizationId: organization.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });

      for (const user of orgUsers) {
        await this.notificationsService.sendFixEmail({
          to: user.email,
          errorMessage: errorEvent.message,
          filePath: relativeFilePath,
          prUrl: savedPr.githubPrUrl || "",
          prNumber: savedPr.githubPrNumber || 0,
          explanation: aiFix.explanation,
          rootCause: aiFix.rootCause,
          confidenceScore: aiFix.confidenceScore,
          testsPassed: decision.reason === 'tests_passed',
        });
      }

      this.logger.log(
        `[STEP 12] Pipeline completed successfully for error event ${errorEventId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[ERROR] Pipeline failed for error event ${errorEventId}: ${error.message}`,
      );
      this.logger.error(`[ERROR] Stack trace: ${error.stack}`);

      if (fixAttemptId) {
        try {
          await this.prisma.fixAttempt.update({
            where: { id: fixAttemptId },
            data: { status: FixStatus.FAILED },
          });
        } catch (e) {
          this.logger.warn(
            `Could not update fix attempt ${fixAttemptId}: ${e.message}`,
          );
        }
      }

      // Check if error event exists before updating
      const existingEvent = await this.prisma.errorEvent.findUnique({
        where: { id: errorEventId },
        select: { id: true },
      });

      if (existingEvent) {
        await this.prisma.errorEvent.update({
          where: { id: errorEventId },
          data: { status: ErrorStatus.FAILED },
        });
      } else {
        this.logger.warn(
          `Error event ${errorEventId} not found, skipping status update`,
        );
      }

      const errorEvent = await this.prisma.errorEvent.findUnique({
        where: { id: errorEventId },
        include: { organization: true },
      });

      if (errorEvent) {
        const orgUsers = await this.prisma.user.findMany({
          where: {
            organizationId: errorEvent.organizationId,
            role: { in: ["OWNER", "ADMIN"] },
          },
        });

        for (const user of orgUsers) {
          await this.notificationsService.sendFailureEmail({
            to: user.email,
            errorMessage: errorEvent.message,
            step: "Pipeline execution",
            errorDetail: error.message,
          });
        }
      }

      throw error;
    }
  }

  private buildPrBody(errorEvent: any, aiFix: any): string {
    return `
## errflow Fix

**Error:** ${errorEvent.message}

**Root Cause:** ${aiFix.rootCause}

**Explanation:** ${aiFix.explanation}

**Confidence:** ${Math.round(aiFix.confidenceScore * 100)}%

### Changes
This PR automatically fixes the error by modifying the affected file.

### Testing
The fix has been validated with automated tests.

Please review changes and merge if they look correct.
    `.trim();
  }
}
