import { AsyncLocalStorage } from 'async_hooks';
import { sendError } from './sender';
import { getConfig, isDisabled } from './config/env';
import { collectErrorContext, SeverityHints } from './context';
import { logger } from './logger';

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
let listenersAttached = false;

/**
 * Per-request scope. Breadcrumbs and request context live here so that
 * concurrent requests on the same server can't leak context into each
 * other's error payloads.
 */
interface RequestStore {
  breadcrumbs: Breadcrumb[];
  requestContext: RequestContext | null;
}

const requestScope = new AsyncLocalStorage<RequestStore>();

/**
 * Fallback store for code running outside any request scope — scripts,
 * background jobs, or apps that don't use Errflow.middleware().
 */
const globalStore: RequestStore = { breadcrumbs: [], requestContext: null };

function activeStore(): RequestStore {
  return requestScope.getStore() ?? globalStore;
}

/**
 * Runs `fn` inside a fresh, isolated request scope. Errflow.middleware()
 * uses this so every request gets its own breadcrumbs and request context.
 */
export function runWithRequestScope<T>(fn: () => T): T {
  return requestScope.run({ breadcrumbs: [], requestContext: null }, fn);
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

export function addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'>): void {
  const { breadcrumbs } = activeStore();
  breadcrumbs.push({ ...crumb, timestamp: new Date().toISOString() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

export function clearBreadcrumbs(): void {
  activeStore().breadcrumbs.length = 0;
}

function getBreadcrumbs(): Breadcrumb[] {
  return [...activeStore().breadcrumbs];
}

// ─── Request Context ──────────────────────────────────────────────────────────

export function setRequestContext(ctx: RequestContext): void {
  activeStore().requestContext = ctx;
}

export function clearRequestContext(): void {
  activeStore().requestContext = null;
}

function getRequestContext(): RequestContext | null {
  return activeStore().requestContext;
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
    request: getRequestContext() ?? undefined,

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
    logger.log('Disabled, skipping error capture');
    return;
  }

  const fingerprint = getFingerprint(error);

  if (!shouldSendError(fingerprint)) return;

  addBreadcrumb({
    message: `Capturing: ${error.message}`,
    category: 'errflow',
    level: 'error',
  });

  logger.log('Error captured:', error.message);

  try {
    const payload = buildPayload(error, fingerprint, hints, metadata);
    await sendError(payload);
    logger.log('Sent successfully');
  } catch (err) {
    logger.error(
      'Failed to send:',
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ─── Global listeners ─────────────────────────────────────────────────────────

export function attachGlobalListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', error.message);
    process.exitCode = 1;
    captureError(error)
      .catch(() => {})
      .finally(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled rejection:', error.message);
    captureError(error).catch(() => {});
  });
}

export function detachGlobalListeners(): void {
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  listenersAttached = false;
}