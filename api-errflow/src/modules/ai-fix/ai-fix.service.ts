import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import Groq from 'groq-sdk';
import { WebsocketService } from '../../websockets/websocket.service';

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface FixResult {
  fixedCode: string;
  explanation: string;
  rootCause: string;
  confidenceScore: number;
  lowConfidence: boolean;
  changedLines: number;
  tokensUsed: number;
}

export interface GenerateFixParams {
  errorMessage: string;
  stackTrace: string;
  filePath: string;
  lineNumber: number;
  functionName: string;
  fileContent: string;
  language: string;
  organizationId?: string;
  errorEventId?: string;
}

export interface TestRunResult {
  passed: boolean;
  output: string;
}

export interface FixDecision {
  action: 'open_pr' | 'notify_only';
  reason: 'tests_passed' | 'tests_failed' | 'low_confidence' | 'too_many_changes';
  fix: FixResult;
  testOutput?: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_CHANGED_LINES = 30;
const MIN_CONFIDENCE_FOR_PR = 0.6;
const MAX_TOKENS = 4096;
const MAX_ATTEMPTS = 3;
const TEST_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable()
export class AiFixService {
  private readonly logger = new Logger(AiFixService.name);
  private readonly groq: Groq;

  constructor(
    private readonly configService: ConfigService,
    private readonly websocketService: WebsocketService,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    this.groq = new Groq({ apiKey });
  }

  // ─────────────────────────────────────────────
  // Public — main entry point
  // ─────────────────────────────────────────────

  /**
   * Full pipeline:
   *  1. Generate fix via AI
   *  2. Decide: open PR or notify only
   *  3. Send WebSocket notification
   */
  async generateAndDecide(params: GenerateFixParams): Promise<FixDecision> {
    const fix = await this.generateFix(params);
    const decision = await this.decide(fix, params);

    if (params.organizationId && params.errorEventId) {
      this.sendNotification(params, fix, decision);
    }

    return decision;
  }

  // ─────────────────────────────────────────────
  // Public — AI fix generation
  // ─────────────────────────────────────────────

  async generateFix(params: GenerateFixParams): Promise<FixResult> {
    const modelName = this.configService.get<string>(
      'GROQ_MODEL',
      'llama-3.1-8b-instant',
    );

    let attempt = 0;

    while (attempt < MAX_ATTEMPTS) {
      try {
        const response = await this.groq.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: this.buildSystemPrompt() },
            { role: 'user', content: this.buildUserPrompt(params) },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.1, // low temp → deterministic code fixes
        });

        const text = response.choices[0]?.message?.content ?? '';
        const tokensUsed = response.usage?.total_tokens ?? 0;
        return this.parseResponse(text, tokensUsed, params.fileContent);
      } catch (error: any) {
        attempt++;

        if (attempt >= MAX_ATTEMPTS) {
          this.logger.error(
            `Failed to generate AI fix after ${MAX_ATTEMPTS} attempts: ${error.message}`,
          );
          throw error;
        }

        this.logger.warn(
          `AI fix attempt ${attempt} failed, retrying: ${error.message}`,
        );

        await this.sleep(this.resolveRetryDelay(error, attempt));
      }
    }

    // Unreachable — satisfies TS return type
    throw new Error('Failed to generate AI fix');
  }

  // ─────────────────────────────────────────────
  // Public — test runner
  // ─────────────────────────────────────────────

  /**
   * Runs the project's existing Jest tests for the given file path.
   * Uses --passWithNoTests so files without dedicated tests don't block the pipeline.
   */
  async runExistingTests(filePath: string): Promise<TestRunResult> {
    try {
      const output = execSync(
        `npx jest --testPathPattern=${filePath} --passWithNoTests --forceExit`,
        { timeout: TEST_TIMEOUT_MS, encoding: 'utf-8' },
      );
      return { passed: true, output };
    } catch (error: any) {
      return {
        passed: false,
        output: error.stdout ?? error.message ?? 'Unknown test error',
      };
    }
  }

  // ─────────────────────────────────────────────
  // Private — decision logic
  // ─────────────────────────────────────────────

  private async decide(
    fix: FixResult,
    params: GenerateFixParams,
  ): Promise<FixDecision> {
    // Rule 1: too many changed lines → always notify only
    if (fix.changedLines > MAX_CHANGED_LINES) {
      return {
        action: 'notify_only',
        reason: 'too_many_changes',
        fix,
      };
    }

    // Rule 2: low confidence → always notify only
    if (fix.confidenceScore < MIN_CONFIDENCE_FOR_PR) {
      return {
        action: 'notify_only',
        reason: 'low_confidence',
        fix,
      };
    }

    // Rule 3: confidence OK → run existing tests
    const testResult = await this.runExistingTests(params.filePath);

    if (testResult.passed) {
      return {
        action: 'open_pr',
        reason: 'tests_passed',
        fix,
        testOutput: testResult.output,
      };
    }

    return {
      action: 'notify_only',
      reason: 'tests_failed',
      fix,
      testOutput: testResult.output,
    };
  }

  // ─────────────────────────────────────────────
  // Private — prompt builders
  // ─────────────────────────────────────────────

  private buildSystemPrompt(): string {
    return `You are an expert debugging assistant. Analyze errors and provide fixes.

IMPORTANT: Return ONLY raw JSON. No markdown, no code blocks, no explanations outside the JSON.

Required JSON structure:
{
  "fixedCode": "the complete fixed file content as a single string",
  "explanation": "one sentence — what was wrong and how it was fixed",
  "rootCause": "one sentence — the root cause of the error",
  "confidenceScore": 0.0
}

FIXED CODE RULES:
1. Must compile without TypeScript errors
2. Add proper type annotations — never use 'any'; use 'unknown' with type guards
3. Handle null/undefined explicitly
4. Change as few lines as possible — minimal diff
5. Do not add new imports unless absolutely required
6. Use type guards when narrowing: if (data && typeof data === 'object' && 'name' in data)

CONFIDENCE SCORE RULES:
- 0.9–1.0 : simple, obvious fix (null check, type annotation, off-by-one)
- 0.7–0.89: moderate change, logic is clear
- 0.4–0.69: uncertain — multiple possible causes
- 0.0–0.39: complex or architectural issue

Set confidenceScore to 0.3 or below if the fix requires changing more than 10 lines.`;
  }

  private buildUserPrompt(params: GenerateFixParams): string {
    return `Error Message:
${params.errorMessage}

Stack Trace:
${params.stackTrace}

File: ${params.filePath}
Line: ${params.lineNumber}
Function: ${params.functionName}
Language: ${params.language}

Current File Content:
\`\`\`${params.language}
${params.fileContent}
\`\`\`

Generate a fix for this error. Return ONLY the JSON object.`;
  }

  // ─────────────────────────────────────────────
  // Private — response parsing
  // ─────────────────────────────────────────────

  private parseResponse(
    text: string,
    tokensUsed: number,
    originalContent: string,
  ): FixResult {
    let jsonStr = text.trim();

    // Strip markdown fences if the model ignores instructions
    jsonStr = jsonStr
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    jsonStr = this.sanitizeJsonString(jsonStr);

    let parsed: unknown;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (firstError: any) {
      this.logger.warn(
        `First JSON parse failed, trying regex fallback: ${firstError.message}`,
      );

      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error(
          `Invalid AI response: no JSON object found — ${firstError.message}`,
        );
      }

      try {
        parsed = JSON.parse(this.sanitizeJsonString(match[0]));
        this.logger.log('Parsed JSON via regex fallback');
      } catch (secondError: any) {
        throw new Error(
          `Invalid AI response: JSON parsing failed — ${secondError.message}`,
        );
      }
    }

    return this.validateAndBuild(parsed, tokensUsed, originalContent);
  }

  private validateAndBuild(
    parsed: unknown,
    tokensUsed: number,
    originalContent: string,
  ): FixResult {
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('fixedCode' in parsed) ||
      !('explanation' in parsed) ||
      !('rootCause' in parsed)
    ) {
      throw new Error('Invalid AI response: missing required fields');
    }

    const p = parsed as Record<string, unknown>;

    const fixedCode =
      typeof p.fixedCode === 'string' ? p.fixedCode : '';
    const explanation =
      typeof p.explanation === 'string' ? p.explanation : '';
    const rootCause =
      typeof p.rootCause === 'string' ? p.rootCause : '';

    if (!fixedCode || !explanation || !rootCause) {
      throw new Error('Invalid AI response: fields must be non-empty strings');
    }

    // Validate confidenceScore strictly — never trust the model blindly
    const rawScore = p.confidenceScore;
    const confidenceScore =
      typeof rawScore === 'number' && rawScore >= 0 && rawScore <= 1
        ? rawScore
        : 0.5;

    // Count how many lines actually changed
    const changedLines = this.countChangedLines(originalContent, fixedCode);

    // Force low confidence if too many lines changed
    const adjustedScore =
      changedLines > MAX_CHANGED_LINES
        ? Math.min(confidenceScore, 0.3)
        : confidenceScore;

    return {
      fixedCode,
      explanation,
      rootCause,
      confidenceScore: adjustedScore,
      lowConfidence: adjustedScore < MIN_CONFIDENCE_FOR_PR,
      changedLines,
      tokensUsed,
    };
  }

  // ─────────────────────────────────────────────
  // Private — JSON sanitisation
  // ─────────────────────────────────────────────

  /**
   * Character-by-character parser — correctly escapes bare newlines/tabs
   * inside JSON string values without breaking escaped sequences or URLs.
   */
  private sanitizeJsonString(input: string): string {
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];

      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        result += ch;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        result += ch;
        continue;
      }

      if (inString) {
        // Escape bare control characters inside strings
        if (ch === '\n') { result += '\\n'; continue; }
        if (ch === '\r') { result += '\\r'; continue; }
        if (ch === '\t') { result += '\\t'; continue; }
        // Strip other control characters (0x00–0x1F except already handled)
        if (ch.charCodeAt(0) < 0x20) continue;
      }

      result += ch;
    }

    // Remove trailing commas before } or ]
    return result.replace(/,(\s*[}\]])/g, '$1');
  }

  // ─────────────────────────────────────────────
  // Private — diff counter
  // ─────────────────────────────────────────────

  private countChangedLines(original: string, fixed: string): number {
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');
    const maxLen = Math.max(originalLines.length, fixedLines.length);
    let changed = 0;

    for (let i = 0; i < maxLen; i++) {
      if (originalLines[i] !== fixedLines[i]) changed++;
    }

    return changed;
  }

  // ─────────────────────────────────────────────
  // Private — WebSocket notification
  // ─────────────────────────────────────────────

  private sendNotification(
    params: GenerateFixParams,
    fix: FixResult,
    decision: FixDecision,
  ): void {
    const actionLabel =
      decision.action === 'open_pr' ? 'PR Opened' : 'Manual Review Required';

    const reasonMessages: Record<FixDecision['reason'], string> = {
      tests_passed: 'All existing tests passed — PR opened automatically',
      tests_failed: 'Existing tests failed after fix — manual review required',
      low_confidence: `AI confidence too low (${Math.round(fix.confidenceScore * 100)}%) — manual review required`,
      too_many_changes: `Fix changed ${fix.changedLines} lines (limit: ${MAX_CHANGED_LINES}) — manual review required`,
    };

    this.websocketService.sendFixNotification(params.organizationId!, {
      id: params.errorEventId!,
      title: actionLabel,
      message: reasonMessages[decision.reason],
      data: {
        fixAttemptId: params.errorEventId,
        errorId: params.errorEventId,
        confidence: fix.confidenceScore,
        changedLines: fix.changedLines,
        explanation: fix.explanation,
        rootCause: fix.rootCause,
        action: decision.action,
        reason: decision.reason,
        testOutput: decision.testOutput ?? null,
      },
      timestamp: new Date(),
    });
  }

  // ─────────────────────────────────────────────
  // Private — retry helpers
  // ─────────────────────────────────────────────

  private resolveRetryDelay(error: any, attempt: number): number {
    const message: string = error?.message ?? '';

    // Honour the API's own retry-after header when present
    const explicit = message.match(/retry\s+in\s+(\d+\.?\d*)s/i);
    if (explicit) {
      return Math.ceil(parseFloat(explicit[1]) * 1000);
    }

    const isRateLimit =
      message.includes('429') ||
      message.toLowerCase().includes('rate limit');

    return isRateLimit
      ? Math.min(30_000 * attempt, 120_000)   // 30 s, 60 s, 120 s
      : Math.min(2_000 * 2 ** attempt, 30_000); // 4 s, 8 s, 16 s …
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}