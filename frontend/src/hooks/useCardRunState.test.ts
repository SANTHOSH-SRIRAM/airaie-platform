/**
 * useCardRunState — pure-function tests for the discriminated-union stage
 * derivation, plus a "cross-surface sync" logic test verifying that two
 * separate callers receive the same stage when given the same Card snapshot.
 *
 * Note on test environment:
 *   We test `deriveCardRunStage` directly because the frontend's vitest
 *   config uses `environment: 'node'` and `@testing-library/react` is not
 *   yet installed. Mounting the actual hook would require both. The shared
 *   logic that determines whether CardTopBar and CardActionBar agree on
 *   the stage *is* the pure helper — both surfaces call useCardRunState()
 *   which immediately delegates to deriveCardRunStage(). If the helper
 *   returns the same stage for the same inputs, both surfaces render the
 *   same CTA. That's the cross-surface sync invariant.
 */

import { describe, it, expect } from 'vitest';
import { deriveCardRunStage } from './useCardRunState';
import type { Card, CardStatus } from '@/types/card';
import type { ExecutionPlan } from '@/types/plan';
import type { IntentSpec } from '@/types/intent';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(partial: Partial<Pick<Card, 'intent_spec_id' | 'status'>>): Pick<
  Card,
  'intent_spec_id' | 'status'
> {
  return {
    intent_spec_id: undefined,
    status: 'draft' as CardStatus,
    ...partial,
  };
}

function makeIntent(inputs: IntentSpec['inputs'] = []): IntentSpec {
  return {
    id: 'is_1',
    board_id: 'b1',
    intent_type: 'cfd_analysis',
    version: 1,
    goal: 'goal',
    inputs,
    acceptance_criteria: [],
    status: 'draft',
    created_at: '2026-04-26T00:00:00Z',
    updated_at: '2026-04-26T00:00:00Z',
  };
}

const STUB_PLAN: ExecutionPlan = {
  id: 'plan_abc',
  card_id: 'card_xyz',
  status: 'compiled',
} as unknown as ExecutionPlan;

// ---------------------------------------------------------------------------
// Stage 1-7 — discriminator coverage
// ---------------------------------------------------------------------------

describe('deriveCardRunStage', () => {
  it('no IntentSpec → no-intent', () => {
    const stage = deriveCardRunStage(
      makeCard({ intent_spec_id: undefined, status: 'draft' }),
      undefined,
      null,
    );
    expect(stage).toBe('no-intent');
  });

  it('IntentSpec with empty inputs → no-inputs', () => {
    const stage = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'draft' }),
      makeIntent([]),
      null,
    );
    expect(stage).toBe('no-inputs');
  });

  it('IntentSpec with pinned inputs but no plan → no-plan', () => {
    const stage = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'draft' }),
      makeIntent([{ name: 'mesh', artifact_ref: 'art_1', required: true }]),
      null,
    );
    expect(stage).toBe('no-plan');
  });

  it('Plan exists, ready → ready', () => {
    const stage = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'ready' }),
      makeIntent([{ name: 'mesh', artifact_ref: 'art_1', required: true }]),
      STUB_PLAN,
    );
    expect(stage).toBe('ready');
  });

  it('card.status running overrides everything → running', () => {
    const stage = deriveCardRunStage(
      makeCard({ intent_spec_id: undefined, status: 'running' }),
      undefined,
      null,
    );
    expect(stage).toBe('running');
  });

  it('card.status queued counts as running → running', () => {
    const stage = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'queued' }),
      makeIntent(),
      STUB_PLAN,
    );
    expect(stage).toBe('running');
  });

  it('card.status completed → completed (terminal, expose re-run)', () => {
    const stage = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'completed' }),
      makeIntent([{ name: 'mesh', artifact_ref: 'art_1', required: true }]),
      STUB_PLAN,
    );
    expect(stage).toBe('completed');
  });

  it('card.status failed → failed (terminal, expose re-run)', () => {
    const stage = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'failed' }),
      makeIntent([{ name: 'mesh', artifact_ref: 'art_1', required: true }]),
      STUB_PLAN,
    );
    expect(stage).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// Cross-surface sync — verify two callers get the same stage for the same
// card snapshot. This is the core invariant: CardTopBar and CardActionBar
// both call useCardRunState() which delegates to deriveCardRunStage().
// ---------------------------------------------------------------------------

describe('cross-surface sync', () => {
  it('two callers with the same inputs receive the same stage', () => {
    const card = makeCard({ intent_spec_id: 'is_1', status: 'ready' });
    const intent = makeIntent([
      { name: 'mesh', artifact_ref: 'art_1', required: true },
    ]);
    // Simulate the two callers (CardTopBar + CardActionBar) both reading the
    // same React Query cache snapshot — the helper input is identical.
    const cardTopBarStage = deriveCardRunStage(card, intent, STUB_PLAN);
    const cardActionBarStage = deriveCardRunStage(card, intent, STUB_PLAN);
    expect(cardTopBarStage).toBe(cardActionBarStage);
    expect(cardTopBarStage).toBe('ready');
  });

  it('flipping card.status to running flips both callers in the same render cycle', () => {
    // Caller A reads the current snapshot
    const before = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'ready' }),
      makeIntent([{ name: 'mesh', artifact_ref: 'art_1', required: true }]),
      STUB_PLAN,
    );
    expect(before).toBe('ready');

    // After mutation: card.status flips to running. Both surfaces re-render
    // and call the helper again with the new snapshot. They MUST agree.
    const afterA = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'running' }),
      makeIntent([{ name: 'mesh', artifact_ref: 'art_1', required: true }]),
      STUB_PLAN,
    );
    const afterB = deriveCardRunStage(
      makeCard({ intent_spec_id: 'is_1', status: 'running' }),
      makeIntent([{ name: 'mesh', artifact_ref: 'art_1', required: true }]),
      STUB_PLAN,
    );
    expect(afterA).toBe('running');
    expect(afterB).toBe('running');
    expect(afterA).toBe(afterB);
  });

  it('terminal completed → both callers expose re-run path', () => {
    const card = makeCard({ intent_spec_id: 'is_1', status: 'completed' });
    const intent = makeIntent([
      { name: 'mesh', artifact_ref: 'art_1', required: true },
    ]);
    const a = deriveCardRunStage(card, intent, STUB_PLAN);
    const b = deriveCardRunStage(card, intent, STUB_PLAN);
    expect(a).toBe('completed');
    expect(b).toBe('completed');
  });
});
