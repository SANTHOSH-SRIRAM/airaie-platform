/**
 * useCardModeRules — pure-function tests for Mode → affordance mapping.
 *
 * The hook itself is a pure function (it doesn't subscribe to any external
 * state — its arguments fully determine its return value), so we can call it
 * directly in vitest env=node without mounting React. This matches the
 * pattern Wave 1 established for `deriveRunButtonState` / `orderCards`.
 */

import { describe, it, expect } from 'vitest';
import { useCardModeRules } from './useCardModeRules';
import type { Card } from '@/types/card';
import type { Board } from '@/types/board';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(partial: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    board_id: 'b1',
    card_type: 'analysis',
    title: 'Test Card',
    description: '',
    status: 'draft',
    ordinal: 0,
    kpis: [],
    created_at: '2026-04-26T00:00:00Z',
    updated_at: '2026-04-26T00:00:00Z',
    ...partial,
  };
}

function makeBoard(mode: Board['mode']): Board {
  return {
    id: 'b1',
    project_id: 'prj_default',
    type: 'engineering',
    name: 'Test Board',
    mode,
    status: 'DRAFT',
    owner: 'user_test',
    created_at: '2026-04-26T00:00:00Z',
    updated_at: '2026-04-26T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Tests — Mode-driven affordances
// ---------------------------------------------------------------------------

describe('useCardModeRules — Explore mode', () => {
  it('all editing affordances enabled in Explore', () => {
    const card = makeCard({ intent_spec_id: 'is_1' });
    const board = makeBoard('explore');
    const rules = useCardModeRules(card, board);
    expect(rules.mode).toBe('explore');
    expect(rules.canEditIntentGoalAndKpis).toBe(true);
    expect(rules.canPinInputs).toBe(true);
    expect(rules.canChangePipeline).toBe(true);
    expect(rules.canUseAgentInstead).toBe(true);
    expect(rules.canAddManualEvidence).toBe(true);
    expect(rules.requiresPeerReview).toBe(false);
    expect(rules.requiresQaApproval).toBe(false);
    expect(rules.promoteTarget).toBe('study');
  });

  it('canRun true when intent_spec_id is set', () => {
    const card = makeCard({ intent_spec_id: 'is_1' });
    const rules = useCardModeRules(card, makeBoard('explore'));
    expect(rules.canRun).toBe(true);
  });

  it('canRun false when intent_spec_id is missing', () => {
    const card = makeCard({ intent_spec_id: undefined });
    const rules = useCardModeRules(card, makeBoard('explore'));
    expect(rules.canRun).toBe(false);
  });
});

describe('useCardModeRules — Study mode', () => {
  it('locks IntentSpec/Inputs once a run has started (first run)', () => {
    const card = makeCard({
      intent_spec_id: 'is_1',
      started_at: '2026-04-26T10:00:00Z',
    });
    const rules = useCardModeRules(card, makeBoard('study'));
    expect(rules.mode).toBe('study');
    expect(rules.canEditIntentGoalAndKpis).toBe(false);
    expect(rules.canPinInputs).toBe(false);
    expect(rules.canChangePipeline).toBe(false);
    expect(rules.canUseAgentInstead).toBe(false);
    expect(rules.requiresPeerReview).toBe(true);
    expect(rules.requiresQaApproval).toBe(false);
    expect(rules.canAddManualEvidence).toBe(true);
    expect(rules.promoteTarget).toBe('release');
  });

  it('Study before first run still allows IntentSpec edit but locks Inputs', () => {
    const card = makeCard({
      intent_spec_id: 'is_1',
      started_at: undefined,
    });
    const rules = useCardModeRules(card, makeBoard('study'));
    expect(rules.canEditIntentGoalAndKpis).toBe(true);
    // Inputs are still locked in Study — only Explore allows pin/unpin.
    expect(rules.canPinInputs).toBe(false);
  });
});

describe('useCardModeRules — Release mode', () => {
  it('locks all editing and forbids manual evidence', () => {
    const card = makeCard({
      intent_spec_id: 'is_1',
      started_at: '2026-04-26T10:00:00Z',
    });
    const rules = useCardModeRules(card, makeBoard('release'));
    expect(rules.mode).toBe('release');
    expect(rules.canEditIntentGoalAndKpis).toBe(false);
    expect(rules.canPinInputs).toBe(false);
    expect(rules.canChangePipeline).toBe(false);
    expect(rules.canAddManualEvidence).toBe(false);
    expect(rules.requiresPeerReview).toBe(true);
    expect(rules.requiresQaApproval).toBe(true);
    expect(rules.promoteTarget).toBeNull();
  });
});

describe('useCardModeRules — defaults', () => {
  it('defaults to Explore-mode rules when card or board is missing', () => {
    const rules = useCardModeRules(undefined, undefined);
    expect(rules.mode).toBe('explore');
    expect(rules.canEditIntentGoalAndKpis).toBe(true);
    expect(rules.canPinInputs).toBe(true);
    expect(rules.canChangePipeline).toBe(true);
    // canRun is gated on intent_spec_id, which is absent → false even in
    // Explore default.
    expect(rules.canRun).toBe(false);
    expect(rules.promoteTarget).toBe('study');
  });

  it('defaults to Explore when only board is missing', () => {
    const rules = useCardModeRules(makeCard({ intent_spec_id: 'is_1' }), undefined);
    expect(rules.mode).toBe('explore');
    expect(rules.canRun).toBe(true);
  });
});
