import { sendError } from './sender';
import { getConfig, isDisabled } from './config/env';
import { collectErrorContext, SeverityHints } from './context';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 60_000;
const MAX_CACHE_SIZE = 1_000;
const MAX_BREADCRUMBS = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Breadcrumb {
  message: string;
  category?: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface RequestContext {
  method?: string;
  url?: string;
  bodyKeys?: string[];
  userId?: string | number;
  traceId?: string;
}

export { SeverityHints };

// ─── State ────────────────────────────────────────────────────────────────────

const errorCache = new Map<string, number>();
const breadcrumbs: Breadcrumb[] = [];
let currentRequestContext: RequestContext | null = null;
let listenersAttached = false;

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

export function addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'>): void {
  breadcrumbs.push({ ...crumb, timestamp: new Date().toISOString() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

// ─── Request Context ──────────────────────────────────────────────────────────

export function setRequestContext(ctx: RequestContext): void {
  currentRequestContext = ctx;
}

export function clearRequestContext(): void {
  currentRequestContext = null;
}

// ─── Cache / Fingerprint ──────────────────────────────────────────────────────

function getFingerprint(error: Error): string {
  const stackLines = error.stack?.split('\n') ?? [];
  const appFrame =
    stackLines
      .slice(1)
      .find(
        (line) =>
          line.includes('at ') &&
          !line.includes('node_modules') &&
          !line.includes('node:'),
      )
      ?.trim() ?? stackLines[1]?.trim() ?? '';

  return `${error.name}:${error.message}:${appFrame}`;
}

function cleanStaleEntries(): void {
  const now = Date.now();
  for (const [key, timestamp] of errorCache) {
    if (now - timestamp > DEBOUNCE_MS) errorCache.delete(key);
  }
}

function shouldSendError(fingerprint: string): boolean {
  const now = Date.now();
  const lastSent = errorCache.get(fingerprint);

  if (lastSent !== undefined && now - lastSent < DEBOUNCE_MS) return false;

  if (errorCache.size >= MAX_CACHE_SIZE) cleanStaleEntries();

  if (errorCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = errorCache.keys().next().value;
    if (oldestKey !== undefined) errorCache.delete(oldestKey);
  }

  errorCache.set(fingerprint, now);
  return true;
}

// ─── Payload ──────────────────────────────────────────────────────────────────

function buildPayload(
  error: Error,
  fingerprint: string,
  hints: SeverityHints,
  metadata?: Record<string, unknown>,
) {
  const config = getConfig();
  const errorContext = collectErrorContext(error, fingerprint, hints);

  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    fingerprint,
    errorName: error.name,
    errorCode: (error as NodeJS.ErrnoException).code,
    message: error.message,
    stack: error.stack ?? `${error.name}: ${error.message}`,

    // ── Classification ────────────────────────────────────────────────────────
    severity: errorContext.severity,
    isRegression: errorContext.isRegression,

    // ── AI Fix Context ────────────────────────────────────────────────────────
    codeContext: errorContext.codeContext,
    gitBlame: errorContext.gitBlame,
    recentDiff: errorContext.recentDiff,

    // ── Request ───────────────────────────────────────────────────────────────
    request: currentRequestContext ?? undefined,

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: getBreadcrumbs(),

    // ── Runtime ───────────────────────────────────────────────────────────────
    environment: config.ERRFLOW_ENV,
    timestamp: new Date().toISOString(),
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      pid: process.pid,
      memory: config.ERRFLOW_INCLUDE_MEMORY ? process.memoryUsage() : undefined,
    },

    metadata,
  };
}

// ─── Core capture ─────────────────────────────────────────────────────────────

export async function captureError(
  error: Error,
  metadata?: Record<string, unknown>,
  hints: SeverityHints = {},
): Promise<void> {
  if (isDisabled()) {
    console.log('[errflow] Disabled, skipping error capture');
    return;
  }

  const fingerprint = getFingerprint(error);

  if (!shouldSendError(fingerprint)) return;

  addBreadcrumb({
    message: `Capturing: ${error.message}`,
    category: 'errflow',
    level: 'error',
  });

  console.log('[errflow] Error captured:', error.message);

  try {
    const payload = buildPayload(error, fingerprint, hints, metadata);
    await sendError(payload);
    console.log('[errflow] Sent successfully');
  } catch (err) {
    console.error(
      '[errflow] Failed to send:',
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ─── Global listeners ─────────────────────────────────────────────────────────

export function attachGlobalListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  process.on('uncaughtException', (error: Error) => {
    console.error('[errflow] Uncaught exception:', error.message);
    process.exitCode = 1;
    captureError(error)
      .catch(() => {})
      .finally(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error('[errflow] Unhandled rejection:', error.message);
    captureError(error).catch(() => {});
  });
}

export function detachGlobalListeners(): void {
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  listenersAttached = false;
}