import { setConfig, isDisabled, resetConfig } from './config/env';
import {
  captureError,
  attachGlobalListeners,
  detachGlobalListeners,
  addBreadcrumb,
  clearBreadcrumbs,
  setRequestContext,
  clearRequestContext,
  runWithRequestScope,
} from './monitor';
import { markResolved } from './context';
import type { Breadcrumb, RequestContext, SeverityHints } from './monitor';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ErrflowConfig {
  apiKey: string;
  env?: string;
  apiUrl?: string;
  disabled?: boolean;
  /** Include process.memoryUsage() in each payload. Off by default. */
  includeMemory?: boolean;
  /** Emit internal `[errflow]` logs to the console. Off by default. */
  debug?: boolean;
}

export type { Breadcrumb, RequestContext, SeverityHints };

// ─── SDK ──────────────────────────────────────────────────────────────────────

export class Errflow {
  /**
   * Initialise the SDK. Call once at app startup.
   */
  static init(config: ErrflowConfig): void {
    setConfig(config);
    if (!config.disabled) {
      attachGlobalListeners();
    }
  }

  /**
   * Manually capture an error.
   *
   * @param error    The error to report.
   * @param metadata Arbitrary key/value pairs attached to the event.
   * @param hints    Optional signals used to calculate severity
   *                 (affectedUsers, occurrencesLastHour, url).
   *
   * @example
   * try {
   *   await processPayment(order);
   * } catch (err) {
   *   await Errflow.capture(err, { orderId: order.id }, { url: req.url });
   * }
   */
  static async capture(
    error: Error,
    metadata?: Record<string, unknown>,
    hints?: SeverityHints,
  ): Promise<void> {
    if (isDisabled()) {
      return;
    }
    await captureError(error, metadata, hints);
  }

  /**
   * Add a breadcrumb that will be included in the next captured error's payload.
   *
   * @example
   * Errflow.addBreadcrumb({
   *   message: 'User submitted checkout form',
   *   category: 'ui',
   *   level: 'info',
   *   data: { cartItems: 3 },
   * });
   */
  static addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'>): void {
    addBreadcrumb(crumb);
  }

  /** Clear all breadcrumbs (e.g. at the start of each request). */
  static clearBreadcrumbs(): void {
    clearBreadcrumbs();
  }

  /**
   * Attach HTTP request metadata to the current error capture scope.
   * Only body keys (not values) are sent to protect user privacy.
   *
   * @example
   * app.use((req, _res, next) => {
   *   Errflow.setRequestContext({
   *     method: req.method,
   *     url: req.url,
   *     bodyKeys: Object.keys(req.body ?? {}),
   *     userId: req.user?.id,
   *     traceId: req.headers['x-trace-id'],
   *   });
   *   next();
   * });
   */
  static setRequestContext(ctx: RequestContext): void {
    setRequestContext(ctx);
  }

  /** Clear the request context (call in response `finally` hooks). */
  static clearRequestContext(): void {
    clearRequestContext();
  }

  /**
   * Express / Fastify middleware that establishes an isolated per-request
   * scope (via AsyncLocalStorage) and wires up request context automatically.
   * Breadcrumbs and request context recorded during the request can't leak
   * into concurrent requests, and the scope is cleaned up automatically when
   * the request's async context ends — no manual clearing required.
   *
   * @example
   * app.use(Errflow.middleware());
   */
  static middleware() {
    return (
      req: {
        method: string;
        url: string;
        body?: unknown;
        user?: { id?: string | number };
        headers: Record<string, string | string[] | undefined>;
      },
      _res: unknown,
      next: () => void,
    ): void => {
      runWithRequestScope(() => {
        Errflow.setRequestContext({
          method: req.method,
          url: req.url,
          bodyKeys: req.body && typeof req.body === 'object'
            ? Object.keys(req.body as object)
            : [],
          userId: req.user?.id,
          traceId: req.headers['x-trace-id'] as string | undefined,
        });

        next();
      });
    };
  }

  /**
   * Mark an error fingerprint as resolved so the dashboard / AI can detect
   * regressions if it reappears.
   *
   * @example
   * // Call from your dashboard webhook after a PR is merged
   * Errflow.markResolved('TypeError:Cannot read properties of null:at foo (src/foo.ts:42)');
   */
  static markResolved(fingerprint: string): void {
    markResolved(fingerprint);
  }

  /**
   * Tear down global listeners and reset configuration.
   * Primarily useful in tests so each test starts with a clean slate.
   */
  static reset(): void {
    detachGlobalListeners();
    resetConfig();
    clearBreadcrumbs();
    clearRequestContext();
  }
}

// ─── Backward compatibility ───────────────────────────────────────────────────

export class AutoPR extends Errflow {}
export interface AutoPRConfig extends ErrflowConfig {}