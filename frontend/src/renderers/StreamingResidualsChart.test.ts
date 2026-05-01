import { describe, expect, it } from 'vitest';
import { merge } from './StreamingResidualsChart';
import type { ResidualPoint } from '@utils/residualParser';

// Pure-helper test for the wide-format merge — the heart of the chart's
// data-prep. Phase 9 Plan 09-02 §2E.1.

describe('StreamingResidualsChart.merge', () => {
  it('returns empty when series is empty', () => {
    expect(merge({})).toEqual({ rows: [], names: [] });
  });

  it('emits a single-name series in iteration order', () => {
    const ux: ResidualPoint[] = [
      { name: 'Ux', value: 1e-3, iteration: 1 },
      { name: 'Ux', value: 1e-5, iteration: 2 },
    ];
    expect(merge({ Ux: ux })).toEqual({
      names: ['Ux'],
      rows: [
        { iteration: 1, Ux: 1e-3 },
        { iteration: 2, Ux: 1e-5 },
      ],
    });
  });

  it('union-merges multiple series with same iteration grid', () => {
    const ux: ResidualPoint[] = [
      { name: 'Ux', value: 1e-3, iteration: 1 },
      { name: 'Ux', value: 1e-5, iteration: 2 },
    ];
    const p: ResidualPoint[] = [
      { name: 'p', value: 0.5, iteration: 1 },
      { name: 'p', value: 5e-3, iteration: 2 },
    ];
    const out = merge({ Ux: ux, p });
    expect(out.names.sort()).toEqual(['Ux', 'p']);
    expect(out.rows).toEqual([
      { iteration: 1, Ux: 1e-3, p: 0.5 },
      { iteration: 2, Ux: 1e-5, p: 5e-3 },
    ]);
  });

  it('produces gaps when one series lags behind another', () => {
    const ux: ResidualPoint[] = [
      { name: 'Ux', value: 1e-3, iteration: 1 },
      { name: 'Ux', value: 1e-5, iteration: 2 },
      { name: 'Ux', value: 1e-7, iteration: 3 },
    ];
    const p: ResidualPoint[] = [
      // no iteration 2 for p (solver skipped pressure that step)
      { name: 'p', value: 0.5, iteration: 1 },
      { name: 'p', value: 5e-3, iteration: 3 },
    ];
    const out = merge({ Ux: ux, p });
    expect(out.rows).toEqual([
      { iteration: 1, Ux: 1e-3, p: 0.5 },
      { iteration: 2, Ux: 1e-5 }, // p is absent; recharts will skip
      { iteration: 3, Ux: 1e-7, p: 5e-3 },
    ]);
  });

  it('sorts iterations ascending even if input is unordered', () => {
    const ux: ResidualPoint[] = [
      { name: 'Ux', value: 1e-7, iteration: 3 },
      { name: 'Ux', value: 1e-3, iteration: 1 },
      { name: 'Ux', value: 1e-5, iteration: 2 },
    ];
    const out = merge({ Ux: ux });
    expect(out.rows.map((r) => r.iteration)).toEqual([1, 2, 3]);
  });
});
