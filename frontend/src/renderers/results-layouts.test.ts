/**
 * Layout selection tests — the layer that picks which slots a Card's
 * Results section composes for a given intent_type.
 */

import { describe, it, expect } from 'vitest';
import { getLayoutForIntent, resultsLayouts } from './results-layouts';
import type { RunArtifact } from '@api/runs';

function makeArtifact(partial: Partial<RunArtifact>): RunArtifact {
  return {
    id: 'art_test',
    type: 'json',
    created_at: '2026-04-26T00:00:00Z',
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// getLayoutForIntent — dispatch table
// ---------------------------------------------------------------------------

describe('getLayoutForIntent', () => {
  it('returns the cfd_analysis layout with 3 slots in (vtu, residuals.csv, metrics.json) order', () => {
    const layout = getLayoutForIntent('cfd_analysis');
    expect(layout).not.toBeNull();
    expect(layout!.slots).toHaveLength(3);
    expect(layout!.slots[0].span).toBe(8);
    expect(layout!.slots[1].rendererId).toBe('csv-chart');
    expect(layout!.slots[2].rendererId).toBe('json-metrics');
  });

  it('returns the fea_static layout with 2 slots (frd at span:8, metrics.json at span:4)', () => {
    const layout = getLayoutForIntent('fea_static');
    expect(layout).not.toBeNull();
    expect(layout!.slots).toHaveLength(2);
    expect(layout!.slots[0].span).toBe(8);
    expect(layout!.slots[1].span).toBe(4);
  });

  it('returns the parameter_sweep layout with 2 slots (pareto + samples, both span:12)', () => {
    const layout = getLayoutForIntent('parameter_sweep');
    expect(layout).not.toBeNull();
    expect(layout!.slots).toHaveLength(2);
    expect(layout!.slots[0].span).toBe(12);
    expect(layout!.slots[1].span).toBe(12);
    expect(layout!.slots[0].rendererId).toBe('csv-chart');
    expect(layout!.slots[1].rendererId).toBe('csv-table');
  });

  it('returns null for unknown intent_type', () => {
    expect(getLayoutForIntent('completely_unknown')).toBeNull();
    expect(getLayoutForIntent('hello_world')).toBeNull();
  });

  it('returns null for undefined intent_type', () => {
    expect(getLayoutForIntent(undefined)).toBeNull();
    expect(getLayoutForIntent('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slot match() predicates — the byKind / byName helpers that decide which
// artifact populates each slot.
// ---------------------------------------------------------------------------

describe('cfd_analysis slot predicates', () => {
  const layout = resultsLayouts.cfd_analysis;

  it('first slot (vtu) matches a vtu artifact regardless of name', () => {
    const slot = layout.slots[0];
    expect(slot.match(makeArtifact({ type: 'vtu', name: 'pressure_field.vtu' }))).toBe(true);
    expect(slot.match(makeArtifact({ type: 'vtu', name: 'velocity.vtu' }))).toBe(true);
  });

  it('first slot does NOT match non-vtu artifacts', () => {
    expect(layout.slots[0].match(makeArtifact({ type: 'csv', name: 'residuals.csv' }))).toBe(false);
    expect(layout.slots[0].match(makeArtifact({ type: 'json', name: 'metrics.json' }))).toBe(false);
  });

  it('second slot only matches the artifact named exactly residuals.csv', () => {
    const slot = layout.slots[1];
    expect(slot.match(makeArtifact({ type: 'csv', name: 'residuals.csv' }))).toBe(true);
    expect(slot.match(makeArtifact({ type: 'csv', name: 'residual_history.csv' }))).toBe(false);
    expect(slot.match(makeArtifact({ type: 'csv', name: 'samples.csv' }))).toBe(false);
  });

  it('third slot only matches the artifact named exactly metrics.json', () => {
    const slot = layout.slots[2];
    expect(slot.match(makeArtifact({ type: 'json', name: 'metrics.json' }))).toBe(true);
    expect(slot.match(makeArtifact({ type: 'json', name: 'config.json' }))).toBe(false);
  });
});

describe('parameter_sweep slot predicates', () => {
  const layout = resultsLayouts.parameter_sweep;

  it('matches pareto.csv to slot 0 and samples.csv to slot 1', () => {
    expect(layout.slots[0].match(makeArtifact({ type: 'csv', name: 'pareto.csv' }))).toBe(true);
    expect(layout.slots[1].match(makeArtifact({ type: 'csv', name: 'samples.csv' }))).toBe(true);
    // Cross-check: pareto.csv should NOT also match the samples slot.
    expect(layout.slots[1].match(makeArtifact({ type: 'csv', name: 'pareto.csv' }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fallbackText — every Phase 2a slot ships a non-empty fallback so empty
// runs render explanatory placeholders instead of bare "no artifact"
// defaults.
// ---------------------------------------------------------------------------

describe('every layout slot ships a fallbackText for empty-state rendering', () => {
  it.each(Object.entries(resultsLayouts))('%s — every slot has fallbackText', (_name, layout) => {
    for (const slot of layout.slots) {
      expect(slot.fallbackText).toBeDefined();
      expect(slot.fallbackText!.length).toBeGreaterThan(0);
    }
  });
});
