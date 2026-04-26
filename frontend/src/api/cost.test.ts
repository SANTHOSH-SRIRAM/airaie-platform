import { describe, it, expect } from 'vitest';
import { topByCost, fillDailyGaps, formatUSD } from './cost';

describe('topByCost', () => {
  it('returns empty array when input is undefined', () => {
    expect(topByCost(undefined, 5)).toEqual([]);
  });

  it('sorts by total_cost desc and slices to N', () => {
    const entries = [
      { tool_ref: 'a', total_cost: 1, run_count: 1, avg_cost: 1 },
      { tool_ref: 'b', total_cost: 5, run_count: 1, avg_cost: 5 },
      { tool_ref: 'c', total_cost: 3, run_count: 1, avg_cost: 3 },
    ];
    const top = topByCost(entries, 2);
    expect(top.map((e) => e.tool_ref)).toEqual(['b', 'c']);
  });

  it('does not mutate the input array', () => {
    const entries = [
      { tool_ref: 'a', total_cost: 1, run_count: 1, avg_cost: 1 },
      { tool_ref: 'b', total_cost: 5, run_count: 1, avg_cost: 5 },
    ];
    const before = entries.map((e) => e.tool_ref).join(',');
    topByCost(entries, 2);
    expect(entries.map((e) => e.tool_ref).join(',')).toBe(before);
  });
});

describe('fillDailyGaps', () => {
  it('fills missing days with zero entries', () => {
    const data = [{ date: '2026-04-02', total_cost: 5, run_count: 1 }];
    const out = fillDailyGaps(data, '2026-04-01T00:00:00Z', '2026-04-03T00:00:00Z');
    expect(out).toEqual([
      { date: '2026-04-01', total_cost: 0, run_count: 0 },
      { date: '2026-04-02', total_cost: 5, run_count: 1 },
      { date: '2026-04-03', total_cost: 0, run_count: 0 },
    ]);
  });

  it('returns input unchanged when range is invalid', () => {
    const data = [{ date: '2026-04-02', total_cost: 5, run_count: 1 }];
    expect(fillDailyGaps(data, 'not-a-date', 'also-bad')).toEqual(data);
  });
});

describe('formatUSD', () => {
  it('formats numbers with two decimals and dollar prefix', () => {
    expect(formatUSD(1.2)).toBe('$1.20');
    expect(formatUSD(0)).toBe('$0.00');
    expect(formatUSD(1234.567)).toBe('$1234.57');
  });

  it('handles undefined / NaN safely', () => {
    expect(formatUSD(undefined)).toBe('$0.00');
    expect(formatUSD(NaN)).toBe('$0.00');
  });
});
