import { getConfig } from './config/env';
import { logger } from './logger';
import { VERSION } from './version';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ErrorPayload {
  // ── Identity ────────────────────────────────────────────────────────────────
  fingerprint: string;
  errorName: string;
  errorCode?: string;
  message: string;
  stack: string;

  // ── Classification ──────────────────────────────────────────────────────────
  severity: 'critical' | 'high' | 'medium' | 'low';
  isRegression: boolean;

  // ── AI Fix Context ──────────────────────────────────────────────────────────
  codeContext: Array<{
    file: string;
    line: number;
    functionName: string | null;
    snippet: Array<{
      lineNumber: number;
      content: string;
      isErrorLine: boolean;
    }>;
  }>;
  gitBlame: {
    author: string;
    authorEmail: string;
    commitHash: string;
    commitMessage: string;
    committedAt: string;
  } | null;
  recentDiff: {
    commitHash: string;
    commitMessage: string;
    author: string;
    committedAt: string;
    diff: string;
  } | null;

  // ── Request ─────────────────────────────────────────────────────────────────
  request?: {
    method?: string;
    url?: string;
    bodyKeys?: string[];
    userId?: string | number;
    traceId?: string;
  };

  // ── Breadcrumbs ─────────────────────────────────────────────────────────────
  breadcrumbs?: Array<{
    message: string;
    category?: string;
    level?: string;
    timestamp: string;
    data?: Record<string, unknown>;
  }>;

  // ── Runtime ─────────────────────────────────────────────────────────────────
  environment: string;
  timestamp: string;
  runtime: {
    node: string;
    platform: string;
    arch: string;
    cwd: string;
    pid: number;
    memory?: NodeJS.MemoryUsage;
  };

  metadata?: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [3_000, 6_000, 12_000] as const;

// ─── Error Queue ──────────────────────────────────────────────────────────────

/**
 * Limits the number of in-flight send requests to avoid thundering-herd
 * bursts (e.g. 50 errors thrown at startup all firing requests at once).
 */
class ErrorQueue {
  private readonly concurrency: number;
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.running++;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.running--;
            const next = this.queue.shift();
            if (next) next();
          });
      };

      if (this.running < this.concurrency) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}

const errorQueue = new ErrorQueue(2);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ─── Core send (with retries) ─────────────────────────────────────────────────

async function sendWithRetry(payload: ErrorPayload): Promise<void> {
  const config = getConfig();
  const apiUrl = config.ERRFLOW_API_URL;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Errflow-Key': config.ERRFLOW_API_KEY,
    'User-Agent': `errflow/${VERSION} (node/${process.version})`,
  };

  const body = JSON.stringify(payload);
  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        apiUrl,
        { method: 'POST', headers, body },
        TIMEOUT_MS,
      );

      if (response.ok) {
        logger.log(`Sent successfully on attempt ${attempt + 1}`);
        return;
      }

      // 4xx errors are not retryable (bad payload / auth)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(
          `Non-retryable error: HTTP ${response.status} ${response.statusText}`,
        );
      }

      lastError = `HTTP ${response.status}`;
      logger.warn(`Attempt ${attempt + 1} failed: ${lastError}`);
    } catch (error) {
      // Re-throw non-retryable errors immediately
      if (
        error instanceof Error &&
        error.message.startsWith('Non-retryable')
      ) {
        throw error;
      }

      lastError = error instanceof Error ? error.message : String(error);
      logger.warn(`Attempt ${attempt + 1} failed:`, lastError);
    }

    if (attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error(
    `Failed to send error after ${MAX_RETRIES} attempts: ${lastError}`,
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function sendError(payload: ErrorPayload): Promise<void> {
  return errorQueue.enqueue(() => sendWithRetry(payload));
}