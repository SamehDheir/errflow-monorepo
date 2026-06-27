/**
 * Best-effort secret redaction for auto-collected content (code snippets and
 * git diffs) before it leaves the host machine. This is a safety net, not a
 * guarantee — use the `beforeSend` hook for anything domain-specific.
 */

const REDACTED = '[REDACTED]';

// `key: "value"` / `key = value` assignments for sensitive-looking keys.
// Keeps the key, masks the value.
const ASSIGNMENT_RE =
  /(['"]?(?:api[-_]?key|secret|token|password|passwd|pwd|authorization|auth[-_]?token|access[-_]?token|refresh[-_]?token|client[-_]?secret|private[-_]?key|encryption[-_]?key)['"]?\s*[:=]\s*['"]?)([^'"\s,;]{4,})/gi;

// `Bearer <token>` — keeps the scheme, masks the token.
const BEARER_RE = /(Bearer\s+)([A-Za-z0-9\-._~+/]{8,}=*)/gi;

// Standalone provider key formats — the whole match is the secret.
const STANDALONE_RES: RegExp[] = [
  /\bsk-[A-Za-z0-9]{16,}\b/g, // OpenAI-style
  /\bgsk_[A-Za-z0-9]{20,}\b/g, // Groq
  /\bre_[A-Za-z0-9_]{16,}\b/g, // Resend
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub tokens
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, // Slack
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT
];

/** Mask secrets in a single string. Returns the input unchanged if clean. */
export function redactString(input: string): string {
  let out = input.replace(ASSIGNMENT_RE, (_m, prefix) => `${prefix}${REDACTED}`);
  out = out.replace(BEARER_RE, (_m, scheme) => `${scheme}${REDACTED}`);
  for (const re of STANDALONE_RES) {
    out = out.replace(re, REDACTED);
  }
  return out;
}
