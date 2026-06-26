import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../../common/crypto/crypto.service";
import { WebsocketService } from "../../websockets/websocket.service";
import { IngestDto, SeverityHintsDto } from "./dto/ingest.dto";
import { Severity, ErrorStatus } from "@prisma/client";
import * as crypto from "crypto";

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private websocketService: WebsocketService,
    @InjectQueue("pipeline") private pipelineQueue: Queue,
  ) {}

  async ingest(
    projectId: string,
    organizationId: string,
    ingestDto: IngestDto,
  ) {
    this.logger.log(
      `[INGEST] Processing error for project ${projectId}: ${ingestDto.message.substring(0, 100)}...`,
    );

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: true },
    });

    if (!project) {
      this.logger.error(`[INGEST] Project not found: ${projectId}`);
      throw new Error("Project not found");
    }

    if (project.organizationId !== organizationId) {
      this.logger.error(
        `[INGEST] Unauthorized access to project: ${projectId} by org ${organizationId}`,
      );
      throw new Error("Unauthorized access to project");
    }

    this.logger.log(`[INGEST] Project found: ${project?.name || "Unknown"}`);

    // Use provided fingerprint or generate one
    const fingerprint =
      ingestDto.fingerprint ||
      this.generateFingerprint(ingestDto.stack, ingestDto.message);

    // Check for deduplication within 60 seconds
    const recentDuplicate = await this.prisma.errorEvent.findFirst({
      where: {
        projectId,
        fingerprint,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // 60 seconds ago
        },
      },
    });

    if (recentDuplicate) {
      // Update occurrence count without sending to pipeline again
      await this.prisma.errorEvent.update({
        where: { id: recentDuplicate.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });

      this.logger.debug(`[INGEST] Deduped error within 60s: ${fingerprint}`);

      return {
        id: recentDuplicate.id,
        status: recentDuplicate.status,
        severity: recentDuplicate.severity,
        deduped: true,
      };
    }

    // Check for regressions (error previously auto-fixed, now reappearing)
    const resolvedError = await this.prisma.errorEvent.findFirst({
      where: {
        projectId,
        fingerprint,
        status: ErrorStatus.FIX_READY,
      },
      orderBy: { lastSeenAt: "desc" },
    });

    const isRegression = !!resolvedError;

    // Calculate severity
    const severity = this.calculateSeverity(ingestDto, ingestDto.severityHints);

    // Extract primary stack frame info
    const stackInfo = this.extractPrimaryStackFrame(ingestDto);

    // Create new error event with all Errflow context
    const errorEvent = await this.prisma.errorEvent.create({
      data: {
        projectId,
        organizationId,
        message: ingestDto.message,
        errorName: ingestDto.errorName || "Error",
        errorCode: ingestDto.errorCode,
        fingerprint,
        isRegression,
        stack: ingestDto.stack,
        environment: ingestDto.environment,
        status: ErrorStatus.RECEIVED,
        severity,
        occurrenceCount: 1,
        firstSeenAt: new Date(ingestDto.timestamp),
        lastSeenAt: new Date(ingestDto.timestamp),

        // Store AI fix context
        codeContext: ingestDto.codeContext
          ? JSON.stringify(ingestDto.codeContext)
          : null,
        gitBlame: ingestDto.gitBlame
          ? JSON.stringify(ingestDto.gitBlame)
          : null,
        recentDiff: ingestDto.recentDiff
          ? JSON.stringify(ingestDto.recentDiff)
          : null,

        // Store request context
        requestContext: ingestDto.request
          ? JSON.stringify(ingestDto.request)
          : null,

        // Store breadcrumbs
        breadcrumbs: ingestDto.breadcrumbs
          ? JSON.stringify(ingestDto.breadcrumbs)
          : null,

        // Store runtime and metadata
        runtime: JSON.stringify({
          ...(ingestDto.runtime || {}),
          primaryFile: stackInfo.file,
          primaryLine: stackInfo.line,
        }),
        metadata: ingestDto.metadata
          ? JSON.stringify(ingestDto.metadata)
          : null,
      },
    });

    this.logger.log(
      `[INGEST] Error event created: ${errorEvent.id} (regression: ${isRegression})`,
    );

    // Send real-time notification
    this.websocketService.sendErrorNotification(organizationId, {
      id: errorEvent.id,
      message: errorEvent.message,
      severity: errorEvent.severity,
      status: errorEvent.status,
      projectId: errorEvent.projectId,
      timestamp: errorEvent.createdAt,
    });

    const { organization } = project;

    // Check plan limits
    if (
      organization?.fixesLimit &&
      organization.fixesUsedThisMonth >= organization.fixesLimit
    ) {
      await this.prisma.errorEvent.update({
        where: { id: errorEvent.id },
        data: { status: ErrorStatus.IGNORED },
      });

      this.logger.warn(`[INGEST] Fix limit reached for org ${organizationId}`);

      return {
        id: errorEvent.id,
        status: ErrorStatus.IGNORED,
        severity,
      };
    }

    // Queue for processing
    await this.prisma.errorEvent.update({
      where: { id: errorEvent.id },
      data: { status: ErrorStatus.QUEUED },
    });

    try {
      const job = await this.pipelineQueue.add("process-error", {
        errorEventId: errorEvent.id,
        fingerprint,
        isRegression,
      });
      this.logger.debug(
        `[INGEST] Queue job added: ${job.id} for error: ${errorEvent.id}`,
      );
    } catch (queueError) {
      this.logger.error(
        `[INGEST] Failed to queue error: ${errorEvent.id}`,
        queueError,
      );
    }

    return {
      id: errorEvent.id,
      status: ErrorStatus.QUEUED,
      severity,
      isRegression,
    };
  }

  /**
   * Generate fingerprint for error deduplication
   * Uses error name, message, and primary stack frame
   */
  private generateFingerprint(stack: string, message: string): string {
    const primaryFrame = this.extractPrimaryStackFrame({
      stack,
      message,
    } as any);
    const data = `${primaryFrame.file}:${primaryFrame.line}:${message}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Extract primary application stack frame (skip node_modules)
   */
  private extractPrimaryStackFrame(ingestDto: any): {
    file: string;
    line: number;
    function?: string;
  } {
    if (ingestDto.codeContext && ingestDto.codeContext.length > 0) {
      const primary = ingestDto.codeContext[0];
      return {
        file: primary.file,
        line: primary.line,
        function: primary.functionName,
      };
    }

    // Fallback to stack parsing
    const stack = ingestDto.stack || "";
    const lines = stack.split("\n");

    for (const line of lines.slice(1)) {
      if (line.includes("node_modules")) continue;
      if (line.includes("node:")) continue;

      // Match "at functionName (file:line:column)"
      const match = line.match(/at\s+(?:([^\s]+)\s+)?\(?([^:]+):(\d+):\d+\)?/);
      if (match) {
        return {
          file: match[2],
          line: parseInt(match[3], 10),
          function: match[1],
        };
      }
    }

    return { file: "unknown", line: 0 };
  }

  /**
   * Calculate error severity based on:
   * - Message content and stack patterns
   * - Severity hints (affectedUsers, occurrencesLastHour, url)
   * - Error classification
   */
  private calculateSeverity(
    ingestDto: IngestDto,
    hints?: SeverityHintsDto,
  ): Severity {
    let baseSeverity = this.detectSeverityFromContent(
      ingestDto.message,
      ingestDto.stack,
      ingestDto.errorName,
    );

    // Boost severity based on hints
    if (hints) {
      if (hints.affectedUsers !== undefined && hints.affectedUsers > 100) {
        baseSeverity = this.upgradeSeverity(baseSeverity, 2); // Boost 2 levels
      } else if (
        hints.affectedUsers !== undefined &&
        hints.affectedUsers > 10
      ) {
        baseSeverity = this.upgradeSeverity(baseSeverity, 1); // Boost 1 level
      }

      if (
        hints.occurrencesLastHour !== undefined &&
        hints.occurrencesLastHour > 50
      ) {
        baseSeverity = this.upgradeSeverity(baseSeverity, 1);
      }

      // Production API endpoints get higher priority
      if (hints.url && hints.url.includes("/api/")) {
        baseSeverity = this.upgradeSeverity(baseSeverity, 1);
      }
    }

    return baseSeverity;
  }

  /**
   * Detect base severity from error content
   */
  private detectSeverityFromContent(
    message: string,
    stack: string,
    errorName?: string,
  ): Severity {
    const lowerMessage = message.toLowerCase();
    const lowerStack = stack.toLowerCase();
    const lowerErrorName = errorName?.toLowerCase() || "";

    // ─ CRITICAL ──────────────────────────────────────────────────────────────
    if (
      lowerMessage.includes("fatal") ||
      lowerMessage.includes("segmentation fault") ||
      lowerMessage.includes("out of memory") ||
      lowerErrorName.includes("fatal")
    ) {
      return Severity.CRITICAL;
    }

    // ─ HIGH ───────────────────────────────────────────────────────────────────
    // Network failures
    if (
      lowerStack.includes("econnrefused") ||
      lowerStack.includes("etimedout") ||
      lowerStack.includes("enotfound") ||
      lowerStack.includes("connection refused") ||
      lowerStack.includes("timeout")
    ) {
      return Severity.HIGH;
    }

    // Database errors
    if (
      lowerStack.includes("econnreset") ||
      lowerStack.includes("connection pool") ||
      lowerStack.includes("database") ||
      lowerMessage.includes("query error")
    ) {
      return Severity.HIGH;
    }

    // Authentication failures
    if (
      lowerMessage.includes("authentication") ||
      lowerMessage.includes("unauthorized")
    ) {
      return Severity.HIGH;
    }

    // ─ MEDIUM ──────────────────────────────────────────────────────────────────
    // Null/undefined errors
    if (
      lowerMessage.includes("undefined") ||
      lowerMessage.includes("null") ||
      lowerMessage.includes("cannot read")
    ) {
      return Severity.MEDIUM;
    }

    // Property/reference errors
    if (
      lowerMessage.includes("cannot set") ||
      lowerMessage.includes("is not a function")
    ) {
      return Severity.MEDIUM;
    }

    // ─ LOW ──────────────────────────────────────────────────────────────────────
    // Type and validation errors
    if (
      lowerMessage.includes("typeerror") ||
      lowerMessage.includes("validation") ||
      lowerMessage.includes("invalid")
    ) {
      return Severity.LOW;
    }

    return Severity.MEDIUM;
  }

  /**
   * Upgrade severity level (capped at CRITICAL)
   */
  private upgradeSeverity(current: Severity, levels: number): Severity {
    const severities = [
      Severity.LOW,
      Severity.MEDIUM,
      Severity.HIGH,
      Severity.CRITICAL,
    ];
    const currentIndex = severities.indexOf(current);
    const newIndex = Math.min(currentIndex + levels, severities.length - 1);
    return severities[newIndex];
  }
}
