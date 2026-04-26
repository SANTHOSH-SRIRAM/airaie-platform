/**
 * ResultsSection — pure-helper tests of `planResults()`.
 *
 * vitest env=node + no @testing-library/react means we can't actually mount
 * the component. The plan-and-test pattern (used throughout Phase 8): the
 * load-bearing decision is extracted into a pure function, exercised here
 * with synthesized RunArtifact + IntentSpec fixtures.
 *
 * Coverage:
 *   1. Empty mode — 0 artifacts → kind: 'empty'.
 *   2. Layout mode — known intent_type with 3 matching artifacts (cfd_analysis)
 *      → 3-slot plan with each slot bound to its expected artifact.
 *   3. Layout mode — known intent_type with no matching artifacts → 3 slots
 *      with `artifact: null` so the fallbackText placeholder renders.
 *   4. Layout mode — slot.rendererId override beats pickRenderer().
 *   5. Auto-pick mode — unknown intent_type with 2 artifacts → kind: 'auto-pick'
 *      with 2 (artifact, renderer) tuples.
 *   6. Auto-pick mode — chart-friendly intent picks csv-chart for csv (instead
 *      of the table fallback) when no layout exists.
 *   7. Auto-pick mode — non-chart intent picks csv-table for csv.
 *
 * The DOM-level test cases (visible tile, lazy chunk loaded) must wait for
 * the post-MVP testing-infra task (Phase 8 Outstanding §"DOM-render tests are
 * still impossible").
 */

import { describe, it, expect } from 'vitest';
import { planResults } from './ResultsSection';
import type { RunArtifact } from '@api/runs';
import type { IntentSpec } from '@/types/intent';

function makeArtifact(partial: Partial<RunArtifact>): RunArtifact {
  return {
    id: `art_${Math.random().toString(36).slice(2, 8)}`,
    type: 'csv',
    created_at: '2026-04-26T00:00:00Z',
    ...partial,
  };
}

function makeIntent(intentType: string): IntentSpec {
  return {
    id: 'intent_test',
    board_id: 'b1',
    intent_type: intentType,
    version: 1,
    goal: 'Test',
    inputs: [],
    acceptance_criteria: [],
    status: 'active',
    created_at: '2026-04-26T00:00:00Z',
    updated_at: '2026-04-26T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Case 1 — empty
// ---------------------------------------------------------------------------

describe('planResults — empty mode', () => {
  it('returns kind:empty when runArtifacts is empty', () => {
    const plan = planResults([], makeIntent('cfd_analysis'));
    expect(plan).toEqual({ kind: 'empty' });
  });

  it('returns kind:empty even when no intent is supplied', () => {
    expect(planResults([], undefined)).toEqual({ kind: 'empty' });
  });
});

// ---------------------------------------------------------------------------
// Case 2 — layout-mode happy path: cfd_analysis with all 3 expected artifacts
// ---------------------------------------------------------------------------

describe('planResults — layout mode (cfd_analysis with all 3 artifacts)', () => {
  const vtu = makeArtifact({ id: 'art_vtu', type: 'vtu', name: 'pressure.vtu' });
  const residuals = makeArtifact({ id: 'art_res', type: 'csv', name: 'residuals.csv' });
  const metrics = makeArtifact({ id: 'art_met', type: 'json', name: 'metrics.json' });
  const intent = makeIntent('cfd_analysis');

  it('returns kind:layout with 3 slots', () => {
    const plan = planResults([vtu, residuals, metrics], intent);
    expect(plan.kind).toBe('layout');
    if (plan.kind !== 'layout') return; // type narrowing
    expect(plan.intentType).toBe('cfd_analysis');
    expect(plan.items).toHaveLength(3);
  });

  it('binds each slot to its expected artifact', () => {
    const plan = planResults([vtu, residuals, metrics], intent);
    if (plan.kind !== 'layout') throw new Error('expected layout plan');
    expect(plan.items[0].artifact?.id).toBe('art_vtu');
    expect(plan.items[1].artifact?.id).toBe('art_res');
    expect(plan.items[2].artifact?.id).toBe('art_met');
  });

  it('picks csv-chart renderer (slot.rendererId override) for residuals.csv', () => {
    const plan = planResults([vtu, residuals, metrics], intent);
    if (plan.kind !== 'layout') throw new Error('expected layout plan');
    expect(plan.items[1].renderer?.id).toBe('csv-chart');
  });

  it('picks json-metrics renderer for metrics.json', () => {
    const plan = planResults([vtu, residuals, metrics], intent);
    if (plan.kind !== 'layout') throw new Error('expected layout plan');
    expect(plan.items[2].renderer?.id).toBe('json-metrics');
  });

  it('falls through to fallback for the vtu slot (Phase 2c VTU renderer not yet shipped)', () => {
    // The Phase 2a registry has no kind:'vtu' entry; pickRenderer returns the
    // always-true fallback so the user gets a download link in the slot.
    const plan = planResults([vtu, residuals, metrics], intent);
    if (plan.kind !== 'layout') throw new Error('expected layout plan');
    expect(plan.items[0].renderer?.id).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// Case 3 — layout-mode empty slots: cfd_analysis with no matching artifacts
// ---------------------------------------------------------------------------

describe('planResults — layout mode (cfd_analysis with no matching artifacts)', () => {
  // Run produced one unrelated artifact — none of the 3 cfd slots match.
  const noise = makeArtifact({ id: 'art_noise', type: 'log', name: 'solver.log' });
  const intent = makeIntent('cfd_analysis');

  it('returns 3 slots all with artifact:null and renderer:null', () => {
    const plan = planResults([noise], intent);
    if (plan.kind !== 'layout') throw new Error('expected layout plan');
    expect(plan.items).toHaveLength(3);
    for (const item of plan.items) {
      expect(item.artifact).toBeNull();
      expect(item.renderer).toBeNull();
    }
  });

  it('preserves slot fallbackText for the placeholder render', () => {
    const plan = planResults([noise], intent);
    if (plan.kind !== 'layout') throw new Error('expected layout plan');
    for (const item of plan.items) {
      expect(item.slot.fallbackText).toBeDefined();
      expect(item.slot.fallbackText!.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Case 4 — layout slot.rendererId override forces a specific renderer
// ---------------------------------------------------------------------------

describe('planResults — slot.rendererId override', () => {
  it('parameter_sweep.pareto.csv slot forces csv-chart', () => {
    // For parameter_sweep, the layout's slot 0 says rendererId: 'csv-chart'.
    // pickRenderer would also pick csv-chart for parameter_sweep + csv (the
    // intent is in CHART_FRIENDLY_INTENTS), so this is a defense-in-depth
    // assertion that the override path is wired.
    const pareto = makeArtifact({ id: 'art_pareto', type: 'csv', name: 'pareto.csv' });
    const samples = makeArtifact({ id: 'art_samples', type: 'csv', name: 'samples.csv' });
    const plan = planResults([pareto, samples], makeIntent('parameter_sweep'));
    if (plan.kind !== 'layout') throw new Error('expected layout plan');
    expect(plan.items[0].renderer?.id).toBe('csv-chart');
    expect(plan.items[1].renderer?.id).toBe('csv-table');
  });
});

// ---------------------------------------------------------------------------
// Case 5 — auto-pick mode: unknown intent_type
// ---------------------------------------------------------------------------

describe('planResults — auto-pick mode (no layout)', () => {
  it('returns kind:auto-pick with one item per artifact when intent has no layout', () => {
    const a = makeArtifact({ id: 'art_a', type: 'png', name: 'plot.png' });
    const b = makeArtifact({ id: 'art_b', type: 'json', name: 'config.json' });
    const plan = planResults([a, b], makeIntent('hello_world'));
    expect(plan.kind).toBe('auto-pick');
    if (plan.kind !== 'auto-pick') return;
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0].artifact.id).toBe('art_a');
    expect(plan.items[0].renderer?.id).toBe('image');
    expect(plan.items[1].artifact.id).toBe('art_b');
    expect(plan.items[1].renderer?.id).toBe('json-metrics');
  });

  it('returns kind:auto-pick when intent is undefined', () => {
    const a = makeArtifact({ id: 'art_x', type: 'png' });
    const plan = planResults([a], undefined);
    expect(plan.kind).toBe('auto-pick');
    if (plan.kind !== 'auto-pick') return;
    expect(plan.items[0].renderer?.id).toBe('image');
  });

  it('csv with chart-friendly intent (cfd_analysis) but no layout match still picks csv-chart', () => {
    // This case validates that pickRenderer's intent-aware logic works in
    // auto-pick mode too. The artifact name doesn't match any cfd_analysis
    // slot, but the registry's csv-chart entry should still win because
    // intent_type === 'cfd_analysis'. Wait — cfd_analysis HAS a layout, so
    // this is technically layout mode. Use parameter_sweep with a non-
    // pareto/samples csv to exercise auto-pick semantics. Better yet, drop
    // to a chart-friendly-but-without-layout intent: time_series.
    const series = makeArtifact({ id: 'art_ts', type: 'csv', name: 'temperature.csv' });
    const plan = planResults([series], makeIntent('time_series'));
    expect(plan.kind).toBe('auto-pick');
    if (plan.kind !== 'auto-pick') return;
    expect(plan.items[0].renderer?.id).toBe('csv-chart');
  });

  it('csv with non-chart intent picks csv-table fallback in auto-pick mode', () => {
    const data = makeArtifact({ id: 'art_d', type: 'csv', name: 'data.csv' });
    const plan = planResults([data], makeIntent('hello_world'));
    if (plan.kind !== 'auto-pick') throw new Error('expected auto-pick plan');
    expect(plan.items[0].renderer?.id).toBe('csv-table');
  });

  it('unknown kind falls through to fallback renderer', () => {
    const blob = makeArtifact({ id: 'art_z', type: 'mystery_format' });
    const plan = planResults([blob], makeIntent('hello_world'));
    if (plan.kind !== 'auto-pick') throw new Error('expected auto-pick plan');
    expect(plan.items[0].renderer?.id).toBe('fallback');
  });
});
