import { describe, it, expect } from 'vitest';
import { findEvidenceById, formatEvidenceSummary } from './EvidenceBlockView.helpers';
import type { CardEvidence } from '@/types/card';

function makeEvidence(overrides: Partial<CardEvidence> = {}): CardEvidence {
  return {
    id: 'ev_1',
    card_id: 'card_1',
    metric_key: 'max_von_mises_mpa',
    metric_value: 187.4,
    metric_unit: 'MPa',
    operator: 'less_than',
    threshold: 210,
    evaluation: 'pass',
    ...overrides,
  };
}

describe('findEvidenceById', () => {
  it('returns the matching row', () => {
    const list = [makeEvidence({ id: 'ev_a' }), makeEvidence({ id: 'ev_b' })];
    expect(findEvidenceById(list, 'ev_b')?.id).toBe('ev_b');
  });

  it('returns undefined when not found', () => {
    const list = [makeEvidence({ id: 'ev_a' })];
    expect(findEvidenceById(list, 'ev_missing')).toBeUndefined();
  });

  it('returns undefined for null list', () => {
    expect(findEvidenceById(null, 'ev_a')).toBeUndefined();
  });

  it('returns undefined for undefined id', () => {
    expect(findEvidenceById([makeEvidence()], undefined)).toBeUndefined();
  });

  it('returns undefined for empty list', () => {
    expect(findEvidenceById([], 'ev_a')).toBeUndefined();
  });
});

describe('formatEvidenceSummary', () => {
  it('renders metric + value + unit + threshold operator', () => {
    const ev = makeEvidence({
      metric_key: 'max_von_mises_mpa',
      metric_value: 187.4,
      metric_unit: 'MPa',
      operator: 'less_than',
      threshold: 210,
      run_id: 'run_x',
    });
    const out = formatEvidenceSummary(ev);
    expect(out.line1).toBe('max_von_mises_mpa: 187.4 MPa (less_than 210 MPa)');
    expect(out.line2).toBe('From run run_x');
    expect(out.chip).toBe('pass');
  });

  it('omits unit when missing', () => {
    const ev = makeEvidence({
      metric_value: 1.5,
      metric_unit: undefined,
      operator: 'eq',
      threshold: 1.5,
    });
    expect(formatEvidenceSummary(ev).line1).toBe('max_von_mises_mpa: 1.5 (eq 1.5)');
  });

  it('omits threshold clause when not set', () => {
    const ev = makeEvidence({ operator: undefined, threshold: undefined });
    expect(formatEvidenceSummary(ev).line1).toBe('max_von_mises_mpa: 187.4 MPa');
  });

  it('marks manual evidence (no run_id)', () => {
    const ev = makeEvidence({ run_id: undefined });
    expect(formatEvidenceSummary(ev).line2).toBe('Manual evidence');
  });

  it('passes through fail evaluation', () => {
    const ev = makeEvidence({ evaluation: 'fail' });
    expect(formatEvidenceSummary(ev).chip).toBe('fail');
  });

  it('passes through warning evaluation', () => {
    const ev = makeEvidence({ evaluation: 'warning' });
    expect(formatEvidenceSummary(ev).chip).toBe('warning');
  });

  it('passes through info evaluation', () => {
    const ev = makeEvidence({ evaluation: 'info' });
    expect(formatEvidenceSummary(ev).chip).toBe('info');
  });
});
