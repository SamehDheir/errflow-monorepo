// `__PACKAGE_VERSION__` is replaced at build time by tsup (see tsup.config.ts)
// with the version from package.json, so the runtime version never drifts from
// the published package. Falls back to a sentinel when run un-bundled (ts-node,
// tests).
declare const __PACKAGE_VERSION__: string;

export const VERSION: string =
  typeof __PACKAGE_VERSION__ !== 'undefined' ? __PACKAGE_VERSION__ : '0.0.0-dev';
