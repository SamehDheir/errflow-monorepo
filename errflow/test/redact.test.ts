import { describe, it, expect } from 'vitest';
import { redactString } from '../src/redact';

describe('redactString', () => {
  it('masks key=value assignments for sensitive keys', () => {
    expect(redactString('const apiKey = "abcd1234efgh"')).toContain('[REDACTED]');
    expect(redactString('password: "hunter2pass"')).toContain('[REDACTED]');
    expect(redactString('PASSWORD=hunter2pass')).toContain('[REDACTED]');
  });

  it('keeps the key name, only masks the value', () => {
    const out = redactString('api_key = "supersecretvalue"');
    expect(out).toMatch(/api_key/i);
    expect(out).not.toContain('supersecretvalue');
  });

  it('masks Bearer tokens but keeps the scheme', () => {
    const out = redactString('Authorization: Bearer abcdef0123456789ABCDEF');
    expect(out).toContain('Bearer [REDACTED]');
    expect(out).not.toContain('abcdef0123456789ABCDEF');
  });

  it('masks known provider key formats', () => {
    expect(redactString('gsk_' + 'a'.repeat(40))).toBe('[REDACTED]');
    expect(redactString('re_' + 'a'.repeat(20))).toBe('[REDACTED]');
    expect(redactString('ghp_' + 'a'.repeat(36))).toBe('[REDACTED]');
    expect(redactString('AKIA' + 'ABCDEFGHIJKLMNOP')).toBe('[REDACTED]');
  });

  it('masks JWTs', () => {
    const jwt = 'eyJhbGciOiJI.eyJzdWIiOiAxMjM.SflKxwRJSMeKKF2QT4';
    expect(redactString(jwt)).toBe('[REDACTED]');
  });

  it('leaves clean text untouched', () => {
    const clean = 'function add(a, b) { return a + b; }';
    expect(redactString(clean)).toBe(clean);
  });
});
