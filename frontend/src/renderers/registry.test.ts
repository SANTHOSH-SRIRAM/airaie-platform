/**
 * Renderer registry — lookup priority tests.
 *
 * vitest env=node, so we can't actually `lazy()`-load components. The tests
 * use mock entries with cast `component` references to satisfy the type
 * system; the lookup function never reads `.component`.
 *
 * Plan-spec 09-01 task 2: ≥ 4 cases covering manifest-hint precedence,
 * exact (intent_type, kind) match, kind-only match, and fallback.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registry, registerRenderer, pickRenderer, _resetRegistry } from './registry';
import type { Renderer, RendererId } from './types';
import type { RunArtifact } from '@api/runs';
import type { IntentSpec } from '@/types/intent';

// ---------------------------------------------------------------------------
// Helpers — synthesize the minimum shape the lookup walks. The cast to
// `Renderer['component']` is intentional; the test doesn't render the
// component, only consults `match()`.
// ---------------------------------------------------------------------------

function makeRenderer(id: RendererId, match: Renderer['match']): Renderer {
  return {
    id,
    match,
    component: null as unknown as Renderer['component'],
  };
}

function makeArtifact(partial: Partial<RunArtifact> = {}): RunArtifact {
  return {
    id: 'art_test',
    name: 'output.csv',
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
// Reset between cases — `registerRenderer` is module-scoped state.
// ---------------------------------------------------------------------------

beforeEach(() => {
  _resetRegistry();
});

// ---------------------------------------------------------------------------
// Case 1: Manifest hint takes precedence over predicate matches
// ---------------------------------------------------------------------------

describe('pickRenderer — manifest hint precedence', () => {
  it('returns the renderer whose id matches artifact.metadata.renderer_hint, even if a non-hint entry would also match', () => {
    const tableEntry = makeRenderer('csv-table', (c) => c.artifact_kind === 'csv');
    const chartEntry = makeRenderer(
      'csv-chart',
      (c) => c.artifact_kind === 'csv' && c.intent_type === 'cfd_analysis',
    );
    registerRenderer(chartEntry);
    registerRenderer(tableEntry);

    const artifact = makeArtifact({
      type: 'csv',
      metadata: { renderer_hint: 'csv-table' },
    });
    const intent = makeIntent('cfd_analysis');

    const picked = pickRenderer(artifact, intent);
    expect(picked).toBe(tableEntry);
    // Without the hint, csv-chart would have won (registered first AND
    // intent-specific); the hint forces the table renderer instead.
  });

  it('falls through to predicate walk if hint references an unregistered id', () => {
    const tableEntry = makeRenderer('csv-table', (c) => c.artifact_kind === 'csv');
    registerRenderer(tableEntry);

    const artifact = makeArtifact({
      type: 'csv',
      metadata: { renderer_hint: 'never-registered' },
    });
    const picked = pickRenderer(artifact, makeIntent('any'));
    expect(picked).toBe(tableEntry);
  });

  it('ignores empty / non-string hint values', () => {
    const tableEntry = makeRenderer('csv-table', (c) => c.artifact_kind === 'csv');
    registerRenderer(tableEntry);

    expect(pickRenderer(makeArtifact({ metadata: { renderer_hint: '' } }), makeIntent('x'))).toBe(
      tableEntry,
    );
    expect(
      pickRenderer(makeArtifact({ metadata: { renderer_hint: 42 as unknown as string } }), makeIntent('x')),
    ).toBe(tableEntry);
  });
});

// ---------------------------------------------------------------------------
// Case 2: Exact (intent_type, kind) match wins over kind-only match
// ---------------------------------------------------------------------------

describe('pickRenderer — exact intent_type match wins', () => {
  it('picks the intent-specific renderer when both kind-only and intent-specific entries match', () => {
    // Order matters in the registry; we put kind-only FIRST to prove the
    // lookup correctly prefers intent-specific even when it's later.
    const kindOnly = makeRenderer('csv-table', (c) => c.artifact_kind === 'csv');
    const intentSpecific = makeRenderer(
      'csv-chart',
      (c) => c.artifact_kind === 'csv' && c.intent_type === 'cfd_analysis',
    );
    registerRenderer(kindOnly);
    registerRenderer(intentSpecific);

    const picked = pickRenderer(makeArtifact({ type: 'csv' }), makeIntent('cfd_analysis'));
    expect(picked).toBe(intentSpecific);
  });

  it('picks csv-chart for cfd_analysis intent even though csv-table also matches the kind', () => {
    // Same scenario as above but with chart registered first — order shouldn't
    // matter for the priority decision; both orderings should pick the
    // intent-specific entry.
    const intentSpecific = makeRenderer(
      'csv-chart',
      (c) => c.artifact_kind === 'csv' && c.intent_type === 'cfd_analysis',
    );
    const kindOnly = makeRenderer('csv-table', (c) => c.artifact_kind === 'csv');
    registerRenderer(intentSpecific);
    registerRenderer(kindOnly);

    expect(pickRenderer(makeArtifact({ type: 'csv' }), makeIntent('cfd_analysis'))).toBe(
      intentSpecific,
    );
  });
});

// ---------------------------------------------------------------------------
// Case 3: Kind-only match used when no intent-specific entry exists
// ---------------------------------------------------------------------------

describe('pickRenderer — kind-only fallback', () => {
  it('returns the kind-only entry when the intent_type does not appear in any predicate', () => {
    const intentSpecific = makeRenderer(
      'csv-chart',
      (c) => c.artifact_kind === 'csv' && c.intent_type === 'cfd_analysis',
    );
    const kindOnly = makeRenderer('csv-table', (c) => c.artifact_kind === 'csv');
    registerRenderer(intentSpecific);
    registerRenderer(kindOnly);

    // intent_type 'fea_static' isn't in the chart predicate, so chart shouldn't match;
    // fall through to kind-only.
    const picked = pickRenderer(makeArtifact({ type: 'csv' }), makeIntent('fea_static'));
    expect(picked).toBe(kindOnly);
  });

  it('returns image renderer for png artifacts regardless of intent_type', () => {
    const imageEntry = makeRenderer('image', (c) =>
      ['png', 'jpg', 'jpeg', 'svg'].includes(c.artifact_kind),
    );
    registerRenderer(imageEntry);

    expect(pickRenderer(makeArtifact({ type: 'png' }), makeIntent('parameter_sweep'))).toBe(
      imageEntry,
    );
    expect(pickRenderer(makeArtifact({ type: 'jpg' }), makeIntent('cfd_analysis'))).toBe(imageEntry);
  });
});

// ---------------------------------------------------------------------------
// Case 4: Fallback fires when nothing matches
// ---------------------------------------------------------------------------

describe('pickRenderer — fallback', () => {
  it('returns the always-true entry when no kind-specific entry matches', () => {
    const csvOnly = makeRenderer('csv-table', (c) => c.artifact_kind === 'csv');
    const fallback = makeRenderer('fallback', () => true);
    registerRenderer(csvOnly);
    registerRenderer(fallback);

    // 'frd' isn't csv — csvOnly's predicate fails; fallback wins.
    const picked = pickRenderer(makeArtifact({ type: 'frd' }), makeIntent('fea_static'));
    expect(picked).toBe(fallback);
  });

  it('returns null when registry is empty (only reachable before Task 7 fallback lands)', () => {
    expect(registry.length).toBe(0);
    const picked = pickRenderer(makeArtifact({ type: 'unknown' }), makeIntent('hello'));
    expect(picked).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Case 5: registerRenderer idempotency — re-registering the same id replaces
// the entry rather than appending a duplicate.
// ---------------------------------------------------------------------------

describe('registerRenderer — idempotency', () => {
  it('replaces the entry in place when called twice with the same id', () => {
    const v1 = makeRenderer('csv-table', () => true);
    const v2 = makeRenderer('csv-table', () => false);
    registerRenderer(v1);
    registerRenderer(v2);
    expect(registry.length).toBe(1);
    expect(registry[0]).toBe(v2);
  });
});
