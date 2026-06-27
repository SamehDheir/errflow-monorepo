import { describe, it, expect } from 'vitest';
import { parseStackFrames } from '../src/context';

describe('parseStackFrames', () => {
  it('parses file, line, column and function name', () => {
    const stack = [
      'Error: boom',
      '    at processOrder (/app/src/orders.ts:42:13)',
    ].join('\n');

    const frames = parseStackFrames(stack);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual({
      file: '/app/src/orders.ts',
      line: 42,
      column: 13,
      functionName: 'processOrder',
    });
  });

  it('parses frames without a function name', () => {
    const stack = ['Error: boom', '    at /app/src/index.ts:10:5'].join('\n');
    const frames = parseStackFrames(stack);
    expect(frames[0].functionName).toBeNull();
    expect(frames[0].file).toBe('/app/src/index.ts');
    expect(frames[0].line).toBe(10);
  });

  it('skips node: internal frames', () => {
    const stack = [
      'Error: boom',
      '    at run (node:internal/process/task_queues:95:5)',
      '    at handler (/app/src/server.ts:7:9)',
    ].join('\n');

    const frames = parseStackFrames(stack);
    expect(frames.every((f) => !f.file.startsWith('node:'))).toBe(true);
    expect(frames).toHaveLength(1);
    expect(frames[0].file).toBe('/app/src/server.ts');
  });

  it('returns an empty array for an empty stack', () => {
    expect(parseStackFrames('')).toEqual([]);
  });
});
