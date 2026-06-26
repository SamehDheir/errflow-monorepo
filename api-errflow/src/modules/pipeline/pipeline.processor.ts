import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PipelineService } from './pipeline.service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineJobData {
  errorEventId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Cooldown between jobs to respect downstream rate limits (AI API, GitHub).
 * Override via PIPELINE_JOB_COOLDOWN_MS env var.
 */
const JOB_COOLDOWN_MS = parseInt(
  process.env.PIPELINE_JOB_COOLDOWN_MS ?? '10000',
  10,
);

// ─── Processor ────────────────────────────────────────────────────────────────

@Processor('pipeline')
export class PipelineProcessor {
  private readonly logger = new Logger(PipelineProcessor.name);

  constructor(private readonly pipelineService: PipelineService) {
    this.logger.log('PipelineProcessor initialized');
  }

  @Process('process-error')
  async handlePipeline(job: Job<PipelineJobData>): Promise<void> {
    const { errorEventId } = job.data;
    this.logger.log(`Processing error event: ${errorEventId}`);

    try {
      await this.pipelineService.run(errorEventId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      // Event not found — stale job from a deleted record, no point retrying.
      if (message.includes('ErrorEvent not found')) {
        this.logger.warn(
          `Error event ${errorEventId} not found — skipping job ${job.id}`,
        );
        return;
      }

      // Regression errors get a dedicated log line so the dashboard can
      // surface them without waiting for the full pipeline to finish.
      if (message.includes('regression')) {
        this.logger.warn(
          `Regression detected for event ${errorEventId} (job ${job.id})`,
        );
      }

      // Re-throw so Bull retries the job according to its backoff config.
      throw error;
    } finally {
      // Always cool down, even on success, to avoid thundering the AI API
      // when a burst of errors arrives at once.
      this.logger.debug(
        `Job ${job.id} done — waiting ${JOB_COOLDOWN_MS}ms before next`,
      );
      await this.sleep(JOB_COOLDOWN_MS);
    }
  }

  // ─── Queue event hooks ──────────────────────────────────────────────────────

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.log(`[queue] Active  — job ${job.id} (${job.name})`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    this.logger.log(`[queue] Done    — job ${job.id} (${job.name})`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `[queue] Failed  — job ${job.id} (${job.name}): ${error.message}`,
      error.stack,
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}