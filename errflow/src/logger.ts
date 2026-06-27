import { getConfig } from './config/env';

/**
 * Internal logger. Silent by default — a library should not write to the host
 * application's stdout/stderr unless explicitly asked. Enable with
 * `Errflow.init({ debug: true })` or `ERRFLOW_DEBUG=true`.
 *
 * Reads the debug flag lazily on each call so it reflects the latest config
 * (e.g. after init() or in tests after reset()).
 */
function debugEnabled(): boolean {
  try {
    return getConfig().ERRFLOW_DEBUG;
  } catch {
    // Config not loaded yet (e.g. before init) — stay silent.
    return false;
  }
}

export const logger = {
  log(...args: unknown[]): void {
    if (debugEnabled()) console.log('[errflow]', ...args);
  },
  warn(...args: unknown[]): void {
    if (debugEnabled()) console.warn('[errflow]', ...args);
  },
  error(...args: unknown[]): void {
    if (debugEnabled()) console.error('[errflow]', ...args);
  },
};
