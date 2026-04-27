import { describe, it, expect } from 'vitest';
import { formatKpiSummary, evaluateKpi } from './KpiBlockView.helpers';

describe('formatKpiSummary', () => {
  it('formats less_than operator with scalar threshold', () => {
    expect(formatKpiSummary({ metricKey: 'drag', operator: 'less_than', threshold: 0.3 }))
      .toBe('drag < 0.3');
  });
  it('formats greater_than operator with scalar threshold', () => {
    expect(formatKpiSummary({ metricKey: 'lift', operator: 'greater_than', threshold: 100 }))
      .toBe('lift > 100');
  });
  it('formats eq operator with integer threshold', () => {
    expect(formatKpiSummary({ metricKey: 'iterations', operator: 'eq', threshold: 50 }))
      .toBe('iterations = 50');
  });
  it('formats between operator with tuple threshold', () => {
    expect(formatKpiSummary({ metricKey: 'reynolds', operator: 'between', threshold: [100, 500] }))
      .toBe('reynolds in [100, 500]');
  });
  it('returns empty string for empty metricKey', () => {
    expect(formatKpiSummary({ metricKey: '', operator: 'eq', threshold: 0 })).toBe('');
    expect(formatKpiSummary({ metricKey: '   ', operator: 'eq', threshold: 0 })).toBe('');
  });
  it('handles malformed between threshold gracefully', () => {
    // Defensive fallback for paste-corrupted attrs — the schema accepts a
    // scalar threshold for `between` because the union allows `number`, but
    // semantically a tuple is required. The helper must not crash.
    expect(formatKpiSummary({ metricKey: 'x', operator: 'between', threshold: 5 }))
      .toBe('x in [?]');
  });
});

describe('evaluateKpi', () => {
  it('returns pending when measured is undefined', () => {
    expect(evaluateKpi('less_than', 0.3, undefined)).toBe('pending');
  });
  it('returns pending when measured is NaN', () => {
    expect(evaluateKpi('less_than', 0.3, NaN)).toBe('pending');
  });
  it('less_than pass / fail', () => {
    expect(evaluateKpi('less_than', 0.3, 0.25)).toBe('pass');
    expect(evaluateKpi('less_than', 0.3, 0.35)).toBe('fail');
  });
  it('greater_than pass / fail', () => {
    expect(evaluateKpi('greater_than', 100, 150)).toBe('pass');
    expect(evaluateKpi('greater_than', 100, 50)).toBe('fail');
  });
  it('eq pass / fail', () => {
    expect(evaluateKpi('eq', 5, 5)).toBe('pass');
    expect(evaluateKpi('eq', 5, 5.0001)).toBe('fail');
  });
  it('between pass / fail', () => {
    expect(evaluateKpi('between', [10, 20], 15)).toBe('pass');
    expect(evaluateKpi('between', [10, 20], 25)).toBe('fail');
    expect(evaluateKpi('between', [10, 20], 10)).toBe('pass'); // inclusive
    expect(evaluateKpi('between', [10, 20], 20)).toBe('pass'); // inclusive
  });
  it('between with malformed threshold returns pending', () => {
    // Defensive fallback — `between` semantically expects a tuple but the
    // KpiThreshold union allows scalar; the helper must not crash.
    expect(evaluateKpi('between', 15, 15)).toBe('pending');
  });
});
