import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StackFrame {
  file: string;
  line: number;
  column: number;
  functionName: string | null;
}

export interface CodeContext {
  file: string;
  line: number;
  functionName: string | null;
  snippet: SnippetLine[];
}

export interface SnippetLine {
  lineNumber: number;
  content: string;
  isErrorLine: boolean;
}

export interface GitBlame {
  author: string;
  authorEmail: string;
  commitHash: string;
  commitMessage: string;
  committedAt: string;
}

export interface GitDiff {
  commitHash: string;
  commitMessage: string;
  author: string;
  committedAt: string;
  diff: string;
}

export interface ErrorContext {
  codeContext: CodeContext[];
  gitBlame: GitBlame | null;
  recentDiff: GitDiff | null;
  severity: Severity;
  isRegression: boolean;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SeverityHints {
  /** Number of users affected (if known) */
  affectedUsers?: number;
  /** Number of occurrences in the last hour (if tracked server-side) */
  occurrencesLastHour?: number;
  /** The request URL that triggered the error */
  url?: string;
}

// ─── Stack Parsing ────────────────────────────────────────────────────────────

const STACK_FRAME_RE =
  /at (?:(.+?) \()?(?:(.+?):(\d+):(\d+))\)?/;

export function parseStackFrames(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];

  for (const raw of stack.split('\n').slice(1)) {
    const match = raw.trim().match(STACK_FRAME_RE);
    if (!match) continue;

    const [, fnName, filePath, lineStr, colStr] = match;

    // Skip non-file frames (node:internal/*, <anonymous>, etc.)
    if (!filePath || filePath.startsWith('node:') || filePath === '<anonymous>') {
      continue;
    }

    frames.push({
      file: filePath,
      line: parseInt(lineStr, 10),
      column: parseInt(colStr, 10),
      functionName: fnName?.trim() ?? null,
    });
  }

  return frames;
}

function isAppFrame(frame: StackFrame): boolean {
  return (
    !frame.file.includes('node_modules') &&
    !frame.file.startsWith('node:') &&
    existsSync(frame.file)
  );
}

// ─── Code Snippets ────────────────────────────────────────────────────────────

const SNIPPET_RADIUS = 5; // lines above and below the error line

function readCodeSnippet(
  filePath: string,
  errorLine: number,
  radius = SNIPPET_RADIUS,
): SnippetLine[] {
  try {
    const absolutePath = resolve(filePath);
    if (!existsSync(absolutePath)) return [];

    const lines = readFileSync(absolutePath, 'utf8').split('\n');
    const start = Math.max(0, errorLine - radius - 1);
    const end = Math.min(lines.length, errorLine + radius);

    return lines.slice(start, end).map((content, idx) => ({
      lineNumber: start + idx + 1,
      content,
      isErrorLine: start + idx + 1 === errorLine,
    }));
  } catch {
    return [];
  }
}

export function extractCodeContext(stack: string): CodeContext[] {
  const frames = parseStackFrames(stack);

  return frames
    .filter(isAppFrame)
    .slice(0, 3) // top 3 app frames is enough context for AI
    .map((frame) => ({
      file: frame.file,
      line: frame.line,
      functionName: frame.functionName,
      snippet: readCodeSnippet(frame.file, frame.line),
    }));
}

// ─── Git Blame ────────────────────────────────────────────────────────────────

function runGit(cmd: string): string | null {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5_000,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Returns blame info for the first app stack frame.
 * Useful for the AI and dashboard to surface who last touched the broken code.
 */
export function getGitBlame(stack: string): GitBlame | null {
  const frames = parseStackFrames(stack);
  const appFrame = frames.find(isAppFrame);
  if (!appFrame) return null;

  const raw = runGit(
    `git blame -L ${appFrame.line},${appFrame.line} --porcelain "${appFrame.file}"`,
  );
  if (!raw) return null;

  try {
    const lines = raw.split('\n');
    const commitHash = lines[0]?.split(' ')[0] ?? '';
    const author = lines.find((l) => l.startsWith('author '))?.slice(7) ?? 'unknown';
    const authorEmail =
      lines.find((l) => l.startsWith('author-mail '))?.slice(12).replace(/[<>]/g, '') ?? '';
    const ts = lines.find((l) => l.startsWith('author-time '))?.slice(12) ?? '';
    const committedAt = ts ? new Date(parseInt(ts, 10) * 1000).toISOString() : '';
    const summary = lines.find((l) => l.startsWith('summary '))?.slice(8) ?? '';

    return { author, authorEmail, commitHash, commitMessage: summary, committedAt };
  } catch {
    return null;
  }
}

// ─── Recent Git Diff ──────────────────────────────────────────────────────────

const MAX_DIFF_CHARS = 4_000; // cap to avoid huge payloads

/**
 * Returns the most recent commit diff for the file where the error originated.
 * Gives the AI a clear picture of what changed and potentially introduced the bug.
 */
export function getRecentDiff(stack: string): GitDiff | null {
  const frames = parseStackFrames(stack);
  const appFrame = frames.find(isAppFrame);
  if (!appFrame) return null;

  const logLine = runGit(
    `git log -1 --format="%H|%s|%an|%aI" -- "${appFrame.file}"`,
  );
  if (!logLine) return null;

  const [commitHash, commitMessage, author, committedAt] = logLine.split('|');
  if (!commitHash) return null;

  const rawDiff = runGit(
    `git show ${commitHash} --unified=3 -- "${appFrame.file}"`,
  );

  const diff = rawDiff
    ? rawDiff.length > MAX_DIFF_CHARS
      ? rawDiff.slice(0, MAX_DIFF_CHARS) + '\n… [truncated]'
      : rawDiff
    : '';

  return { commitHash, commitMessage: commitMessage ?? '', author: author ?? '', committedAt: committedAt ?? '', diff };
}

// ─── Severity Scoring ─────────────────────────────────────────────────────────

const HIGH_PRIORITY_PATHS = /payment|checkout|auth|login|signup|password|billing/i;

export function calculateSeverity(
  error: Error,
  hints: SeverityHints = {},
): Severity {
  const { affectedUsers = 0, occurrencesLastHour = 0, url = '' } = hints;

  if (affectedUsers > 100) return 'critical';
  if (occurrencesLastHour > 50) return 'critical';

  if (affectedUsers > 10) return 'high';
  if (occurrencesLastHour > 10) return 'high';
  if (HIGH_PRIORITY_PATHS.test(url)) return 'high';

  // TypeError / ReferenceError in app code are usually logic bugs → medium
  if (error.name === 'TypeError' || error.name === 'ReferenceError') return 'medium';

  return 'low';
}

// ─── Regression Detection ─────────────────────────────────────────────────────

/**
 * A lightweight in-process registry of previously seen + resolved errors.
 * In production you'd back this with your dashboard DB — this gives the
 * same interface so the AI prompt stays consistent.
 */
const resolvedErrors = new Map<string, string>(); // fingerprint → resolvedAt ISO

export function markResolved(fingerprint: string): void {
  resolvedErrors.set(fingerprint, new Date().toISOString());
}

export function checkRegression(fingerprint: string): {
  isRegression: boolean;
  previouslyResolvedAt?: string;
} {
  const resolvedAt = resolvedErrors.get(fingerprint);
  if (resolvedAt) {
    return { isRegression: true, previouslyResolvedAt: resolvedAt };
  }
  return { isRegression: false };
}

// ─── Public helper ────────────────────────────────────────────────────────────

/**
 * Collects all AI-useful context for a given error in one call.
 */
export function collectErrorContext(
  error: Error,
  fingerprint: string,
  hints: SeverityHints = {},
): ErrorContext {
  const stack = error.stack ?? '';
  const regression = checkRegression(fingerprint);

  return {
    codeContext: extractCodeContext(stack),
    gitBlame: getGitBlame(stack),
    recentDiff: getRecentDiff(stack),
    severity: calculateSeverity(error, hints),
    isRegression: regression.isRegression,
  };
}