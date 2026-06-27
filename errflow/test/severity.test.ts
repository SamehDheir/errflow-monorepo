import { describe, it, expect } from 'vitest';
import { calculateSeverity } from '../src/context';

describe('calculateSeverity', () => {
  it('is critical when many users are affected', () => {
    expect(calculateSeverity(new Error('x'), { affectedUsers: 101 })).toBe('critical');
  });

  it('is critical on a high occurrence rate', () => {
    expect(calculateSeverity(new Error('x'), { occurrencesLastHour: 51 })).toBe('critical');
  });

  it('is high for moderate user impact', () => {
    expect(calculateSeverity(new Error('x'), { affectedUsers: 11 })).toBe('high');
  });

  it('is high for high-priority URLs', () => {
    expect(calculateSeverity(new Error('x'), { url: '/api/checkout' })).toBe('high');
    expect(calculateSeverity(new Error('x'), { url: '/auth/login' })).toBe('high');
  });

  it('is medium for TypeError / ReferenceError with no hints', () => {
    expect(calculateSeverity(new TypeError('nope'))).toBe('medium');
    expect(calculateSeverity(new ReferenceError('nope'))).toBe('medium');
  });

  it('defaults to low', () => {
    expect(calculateSeverity(new Error('something minor'))).toBe('low');
  });

  it('prioritises the highest matching signal', () => {
    // affectedUsers > 100 wins even on a low-priority URL
    expect(
      calculateSeverity(new Error('x'), { affectedUsers: 500, url: '/' }),
    ).toBe('critical');
  });
});
