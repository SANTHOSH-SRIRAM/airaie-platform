import { describe, it, expect } from 'vitest';
import { eventTypeColor, decodeAuditPayload } from './audit';

describe('eventTypeColor', () => {
  it('maps approved/completed events to success', () => {
    expect(eventTypeColor('gate.approved')).toBe('success');
    expect(eventTypeColor('run.completed')).toBe('success');
    expect(eventTypeColor('tool.published')).toBe('success');
  });

  it('maps rejected/failed events to danger', () => {
    expect(eventTypeColor('gate.rejected')).toBe('danger');
    expect(eventTypeColor('run.failed')).toBe('danger');
    expect(eventTypeColor('run.cancelled')).toBe('danger');
  });

  it('maps waived/throttled events to warning', () => {
    expect(eventTypeColor('gate.waived')).toBe('warning');
    expect(eventTypeColor('quota.throttled')).toBe('warning');
  });

  it('maps unknown events to info', () => {
    expect(eventTypeColor('tool.trust_level.updated')).toBe('info');
    expect(eventTypeColor('budget.updated')).toBe('info');
    expect(eventTypeColor('auth.login')).toBe('info');
  });

  it('maps run.started to success (started is treated as positive lifecycle)', () => {
    expect(eventTypeColor('run.started')).toBe('success');
  });

  it('handles arbitrary casing', () => {
    expect(eventTypeColor('GATE.APPROVED')).toBe('success');
  });
});

describe('decodeAuditPayload', () => {
  it('returns null for null/undefined input', () => {
    expect(decodeAuditPayload(null)).toBeNull();
    expect(decodeAuditPayload(undefined)).toBeNull();
  });

  it('passes through plain objects', () => {
    const obj = { foo: 'bar', n: 1 };
    expect(decodeAuditPayload(obj)).toEqual(obj);
  });

  it('parses inline JSON strings', () => {
    expect(decodeAuditPayload('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses base64-encoded JSON (Go []byte over JSON)', () => {
    const original = { event: 'gate.approved', actor: 'user_x' };
    const b64 = btoa(JSON.stringify(original));
    expect(decodeAuditPayload(b64)).toEqual(original);
  });

  it('returns null for unparseable strings', () => {
    expect(decodeAuditPayload('not json or base64 !!!')).toBeNull();
  });
});
