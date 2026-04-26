import { describe, it, expect } from 'vitest';
import type { GateEvidence } from '@api/gates';
import { groupEvidenceByPassFail, formatEvidenceSummary } from './evidenceAggregation';

function ev(partial: Partial<GateEvidence>): GateEvidence {
  return {
    id: partial.id ?? 'cevd_x',
    card_id: partial.card_id ?? 'card_1',
    metric_name: partial.metric_name ?? 'metric',
    metric_value: partial.metric_value ?? 0,
    passed: partial.passed as boolean,
    extracted_at: partial.extracted_at ?? '2026-04-25T00:00:00Z',
    ...partial,
  } as GateEvidence;
}

describe('groupEvidenceByPassFail', () => {
  it('returns all-zero summary for an empty list', () => {
    const s = groupEvidenceByPassFail([]);
    expect(s).toEqual({ passed: 0, failed: 0, pending: 0, total: 0, passRate: 0 });
  });

  it('returns all-zero summary for undefined input', () => {
    const s = groupEvidenceByPassFail(undefined);
    expect(s).toEqual({ passed: 0, failed: 0, pending: 0, total: 0, passRate: 0 });
  });

  it('counts a mixed list correctly', () => {
    const rows = [
      ev({ id: '1', passed: true }),
      ev({ id: '2', passed: true }),
      ev({ id: '3', passed: false }),
      ev({ id: '4', passed: undefined }),
    ];
    const s = groupEvidenceByPassFail(rows);
    expect(s.passed).toBe(2);
    expect(s.failed).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.total).toBe(4);
    expect(s.passRate).toBe(0.5);
  });

  it('treats undefined `passed` as pending, not failed', () => {
    const rows = [
      ev({ id: '1', passed: undefined as unknown as boolean }),
      ev({ id: '2', passed: undefined as unknown as boolean }),
    ];
    const s = groupEvidenceByPassFail(rows);
    expect(s.failed).toBe(0);
    expect(s.pending).toBe(2);
  });

  it('counts a fully-passing list as 100%', () => {
    const rows = [
      ev({ id: '1', passed: true }),
      ev({ id: '2', passed: true }),
    ];
    const s = groupEvidenceByPassFail(rows);
    expect(s.passed).toBe(2);
    expect(s.failed).toBe(0);
    expect(s.passRate).toBe(1);
  });

  it('counts a fully-failing list as 0%', () => {
    const rows = [
      ev({ id: '1', passed: false }),
      ev({ id: '2', passed: false }),
    ];
    const s = groupEvidenceByPassFail(rows);
    expect(s.passed).toBe(0);
    expect(s.failed).toBe(2);
    expect(s.passRate).toBe(0);
  });
});

describe('formatEvidenceSummary', () => {
  it('renders the canonical "X of Y criteria met (Z%)" string', () => {
    const s = groupEvidenceByPassFail([
      ev({ id: '1', passed: true }),
      ev({ id: '2', passed: true }),
      ev({ id: '3', passed: false }),
      ev({ id: '4', passed: false }),
      ev({ id: '5', passed: false }),
    ]);
    expect(formatEvidenceSummary(s)).toBe('2 of 5 criteria met (40%)');
  });

  it('returns "No evidence collected" for empty summaries', () => {
    expect(formatEvidenceSummary(groupEvidenceByPassFail([]))).toBe('No evidence collected');
  });
});
