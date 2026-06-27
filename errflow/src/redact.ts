/**
 * Best-effort secret redaction for auto-collected content (code snippets and
 * git diffs) before it leaves the host machine. This is a safety net, not a
 * guarantee — use the `beforeSend` hook for anything domain-specific.
 */

const REDACTED = '[REDACTED]';

// Standalone provider key formats — the whole match is the secret.
const STANDALONE_RES: RegExp[] = [
  /\bsk-[A-Za-z0-9]{16,}\b/g, // OpenAI-style
  /\bgsk_[A-Za-z0-9]{20,}\b/g, // Groq
  /\bre_[A-Za-z0-9_]{16,}\b/g, // Resend
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub tokens
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, // Slack
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, // JWT (header always starts eyJ)
];

// `Bearer <token>` / `Basic <token>` — keeps the scheme, masks the credential.
const AUTH_SCHEME_RE = /((?:Bearer|Basic)\s+)([A-Za-z0-9\-._~+/]{8,}=*)/gi;

// `key: "value"` / `key = value` assignments for sensitive-looking keys.
// Keeps the key, masks the value. Note: `authorization` is intentionally not
// listed here — auth headers are handled by AUTH_SCHEME_RE so the scheme word
// (Bearer/Basic) is preserved rather than swallowed.
const ASSIGNMENT_RE =
  /(['"]?(?:api[-_]?key|secret|token|password|passwd|pwd|auth[-_]?token|access[-_]?token|refresh[-_]?token|client[-_]?secret|private[-_]?key|encryption[-_]?key)['"]?\s*[:=]\s*['"]?)([^'"\s,;]{4,})/gi;

/** Mask secrets in a single string. Returns the input unchanged if clean. */
export function redactString(input: string): string {
  // Order matters: standalone tokens and auth schemes first, then key=value
  // assignments, so the scheme keyword isn't treated as an assignment value.
  let out = input;
  for (const re of STANDALONE_RES) {
    out = out.replace(re, REDACTED);
  }
  out = out.replace(AUTH_SCHEME_RE, (_m, scheme) => `${scheme}${REDACTED}`);
  out = out.replace(ASSIGNMENT_RE, (_m, prefix) => `${prefix}${REDACTED}`);
  return out;
}
