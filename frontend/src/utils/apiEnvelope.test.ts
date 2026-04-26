import { describe, it, expect } from 'vitest';
import { unwrapList } from './apiEnvelope';

// ---------------------------------------------------------------------------
// unwrapList: defensive envelope-stripping for backend list responses
// ---------------------------------------------------------------------------

describe('unwrapList', () => {
  it('extracts the array when the envelope key is present', () => {
    const raw = { gates: [{ id: 'g1' }, { id: 'g2' }], count: 2 };
    expect(unwrapList<{ id: string }>(raw, 'gates')).toEqual([
      { id: 'g1' },
      { id: 'g2' },
    ]);
  });

  it('returns [] when the envelope is an object missing the key', () => {
    const raw = { count: 0 };
    expect(unwrapList(raw, 'gates')).toEqual([]);
  });

  it('returns [] when the keyed value is not an array', () => {
    const raw = { gates: 'not-an-array' };
    expect(unwrapList(raw, 'gates')).toEqual([]);
  });

  it('returns the input unchanged when raw is already a bare array', () => {
    const raw = [{ id: 'g1' }];
    expect(unwrapList<{ id: string }>(raw, 'gates')).toEqual([{ id: 'g1' }]);
  });

  it('returns [] for null', () => {
    expect(unwrapList(null, 'gates')).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(unwrapList(undefined, 'gates')).toEqual([]);
  });

  it('returns [] for primitive scalars', () => {
    expect(unwrapList(42, 'gates')).toEqual([]);
    expect(unwrapList('string', 'gates')).toEqual([]);
    expect(unwrapList(true, 'gates')).toEqual([]);
  });

  it('handles different keys for different endpoints', () => {
    expect(unwrapList({ requirements: [{ r: 1 }] }, 'requirements')).toEqual([{ r: 1 }]);
    expect(unwrapList({ evidence: [{ e: 1 }] }, 'evidence')).toEqual([{ e: 1 }]);
    expect(unwrapList({ approvals: [{ a: 1 }] }, 'approvals')).toEqual([{ a: 1 }]);
  });

  it('returns [] when the keyed value is null', () => {
    expect(unwrapList({ gates: null }, 'gates')).toEqual([]);
  });

  it('returns the empty array contained in the envelope as-is', () => {
    const raw = { gates: [], count: 0 };
    expect(unwrapList(raw, 'gates')).toEqual([]);
  });
});
