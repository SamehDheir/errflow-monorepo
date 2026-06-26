import { CodeContextItemDto, GitBlameDto, GitDiffDto } from './../ingest/dto/ingest.dto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedStackFrame {
  file: string;
  line: number;
  column?: number;
  function?: string;
}

export interface ParsedStackTrace {
  primaryFile: string;
  primaryLine: number;
  primaryFunction?: string;
  language: string;
  frames: ParsedStackFrame[];
}

// ─── Language Detection ───────────────────────────────────────────────────────

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  rs: 'rust',
  php: 'php',
};

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_LANGUAGE_MAP[ext] ?? 'javascript';
}

// ─── Stack Parser ─────────────────────────────────────────────────────────────

/**
 * StackParser is now a thin adapter over the codeContext the SDK already
 * parses and sends. The heavy lifting (frame extraction, app-frame filtering,
 * snippet reading) is done client-side by errflow's context.ts.
 *
 * Use fromCodeContext() when the payload includes codeContext (all new events).
 * Fall back to parse() only for legacy payloads that pre-date the SDK upgrade.
 */
export class StackParser {
  /**
   * Build a ParsedStackTrace from the SDK-supplied codeContext array.
   * This is the preferred path for all new payloads.
   */
  static fromCodeContext(
    codeContext: CodeContextItemDto[],
    stack: string,
  ): ParsedStackTrace {
    if (codeContext.length === 0) {
      return StackParser.parse(stack);
    }

    const primary = codeContext[0];

    const frames: ParsedStackFrame[] = codeContext.map((ctx) => ({
      file: ctx.file,
      line: ctx.line,
      function: ctx.functionName ?? undefined,
    }));

    return {
      primaryFile: primary.file,
      primaryLine: primary.line,
      primaryFunction: primary.functionName ?? undefined,
      language: detectLanguage(primary.file),
      frames,
    };
  }

  /**
   * Legacy fallback: parse a raw stack string directly.
   * Only used when codeContext is empty (old SDK versions).
   */
  static parse(stack: string): ParsedStackTrace {
    const frames: ParsedStackFrame[] = [];

    for (const line of stack.split('\n')) {
      const frame = StackParser.parseFrame(line.trim());
      if (frame) frames.push(frame);
    }

    if (frames.length === 0) {
      throw new Error('Could not parse stack trace');
    }

    const primary = frames[0];

    return {
      primaryFile: primary.file,
      primaryLine: primary.line,
      primaryFunction: primary.function,
      language: detectLanguage(primary.file),
      frames,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private static parseFrame(line: string): ParsedStackFrame | null {
    // "at functionName (file:line:col)"
    const withParens = /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/;
    // "at file:line:col"
    const withoutParens = /at\s+(.+?):(\d+):(\d+)/;
    // "at functionName (file:line)"
    const withParensNoCol = /at\s+(.+?)\s+\((.+?):(\d+)\)/;

    let match = line.match(withParens);
    if (match) {
      return {
        function: match[1],
        file: match[2],
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10),
      };
    }

    match = line.match(withoutParens);
    if (match) {
      return {
        function: undefined,
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
      };
    }

    match = line.match(withParensNoCol);
    if (match) {
      return {
        function: match[1],
        file: match[2],
        line: parseInt(match[3], 10),
      };
    }

    return null;
  }

  // ─── Git Context Helpers ───────────────────────────────────────────────────

  /**
   * Format gitBlame into a human-readable string for the AI prompt.
   */
  static formatBlame(blame: GitBlameDto | null | undefined): string {
    if (!blame) return 'No git blame available.';
    return [
      `Author:  ${blame.author} <${blame.authorEmail}>`,
      `Commit:  ${blame.commitHash.slice(0, 8)} — ${blame.commitMessage}`,
      `Date:    ${blame.committedAt}`,
    ].join('\n');
  }

  /**
   * Format recentDiff into a block for the AI prompt.
   * Trims the diff if it is excessively long (the SDK already caps at 4 000
   * chars, but guard here too in case of legacy payloads).
   */
  static formatDiff(
    diff: GitDiffDto | null | undefined,
    maxChars = 4_000,
  ): string {
    if (!diff) return 'No recent diff available.';
    const body =
      diff.diff.length > maxChars
        ? diff.diff.slice(0, maxChars) + '\n… [truncated]'
        : diff.diff;
    return [
      `Commit:  ${diff.commitHash.slice(0, 8)} — ${diff.commitMessage}`,
      `Author:  ${diff.author}  |  ${diff.committedAt}`,
      '',
      body,
    ].join('\n');
  }
}