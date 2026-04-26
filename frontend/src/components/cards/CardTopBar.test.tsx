/**
 * CardTopBar — tests for the Run state machine + label derivation.
 *
 * Note on test environment:
 *   The frontend's vitest config uses `environment: 'node'` and does NOT
 *   currently install `@testing-library/react`. Following the precedent set
 *   by the existing test files (e.g. `utils/trustLevel.test.ts`), these
 *   tests target the pure exported helper `deriveRunButtonState` rather
 *   than full DOM rendering. The Wave-1 day-one functional Run button is
 *   driven entirely by this pure helper, so covering all 4 state-machine
 *   stages here gives us regression protection without a runtime change.
 *
 *   When @testing-library/react is wired up (post-MVP testing infra task),
 *   this file should grow JSX render tests that mount the component with a
 *   QueryClientProvider + MemoryRouter to verify breadcrumb navigation,
 *   inline-edit blur behavior, and toast surfacing on mutation error.
 */

import { describe, it, expect } from 'vitest';
import { deriveRunButtonState } from './CardTopBar';
import type { Card, CardStatus } from '@/types/card';
import type { ExecutionPlan } from '@/types/plan';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(partial: Partial<Pick<Card, 'intent_spec_id' | 'status'>>): Pick<Card, 'intent_spec_id' | 'status'> {
  return {
    intent_spec_id: undefined,
    status: 'draft' as CardStatus,
    ...partial,
  };
}

const NO_PENDING = { generate: false, execute: false, cancel: false };

// Minimal ExecutionPlan stub — only fields the helper inspects matter (it
// just checks falsiness).
const STUB_PLAN: ExecutionPlan = {
  id: 'plan_abc',
  card_id: 'card_xyz',
  status: 'compiled',
} as unknown as ExecutionPlan;

// ---------------------------------------------------------------------------
// 1-4: Run state-machine stages
// ---------------------------------------------------------------------------

describe('deriveRunButtonState — Run state machine', () => {
  it('Stage 1 — no IntentSpec → "Draft Intent first" disabled', () => {
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: undefined, status: 'draft' }),
      null,
      NO_PENDING,
    );
    expect(result.label).toBe('Draft Intent first');
    expect(result.action).toBe('draft');
    expect(result.disabled).toBe(true);
    expect(result.title).toMatch(/IntentSpec/);
  });

  it('Stage 2 — IntentSpec set, no Plan → "Generate Plan" enabled', () => {
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: 'is_123', status: 'draft' }),
      null,
      NO_PENDING,
    );
    expect(result.label).toBe('Generate Plan');
    expect(result.action).toBe('generate');
    expect(result.disabled).toBe(false);
  });

  it('Stage 3 — Plan exists, ready → "Run Card" enabled', () => {
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: 'is_123', status: 'ready' }),
      STUB_PLAN,
      NO_PENDING,
    );
    expect(result.label).toBe('Run Card');
    expect(result.action).toBe('run');
    expect(result.disabled).toBe(false);
  });

  it('Stage 4 — running → "Cancel" enabled (action: cancel)', () => {
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: 'is_123', status: 'running' }),
      STUB_PLAN,
      NO_PENDING,
    );
    expect(result.label).toBe('Cancel');
    expect(result.action).toBe('cancel');
    expect(result.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5-7: Pending-state overrides
// ---------------------------------------------------------------------------

describe('deriveRunButtonState — pending overrides', () => {
  it('generate pending → "Generating…" disabled with spinner', () => {
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: 'is_1', status: 'draft' }),
      null,
      { ...NO_PENDING, generate: true },
    );
    expect(result.label).toBe('Generating…');
    expect(result.pending).toBe(true);
    expect(result.disabled).toBe(true);
  });

  it('execute pending → "Starting…" disabled', () => {
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: 'is_1', status: 'ready' }),
      STUB_PLAN,
      { ...NO_PENDING, execute: true },
    );
    expect(result.label).toBe('Starting…');
    expect(result.action).toBe('run');
    expect(result.pending).toBe(true);
    expect(result.disabled).toBe(true);
  });

  it('cancel pending → "Cancelling…" disabled (takes precedence over running status)', () => {
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: 'is_1', status: 'running' }),
      STUB_PLAN,
      { ...NO_PENDING, cancel: true },
    );
    expect(result.label).toBe('Cancelling…');
    expect(result.action).toBe('cancel');
    expect(result.pending).toBe(true);
    expect(result.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8-9: Edge cases & queued status (run-in-flight variant)
// ---------------------------------------------------------------------------

describe('deriveRunButtonState — edge cases', () => {
  it('queued status counts as in-flight → "Cancel" available', () => {
    // The kernel exposes `queued` as a transient pre-running status; we
    // surface Cancel for it so users can abort before solver-start.
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: 'is_1', status: 'queued' }),
      STUB_PLAN,
      NO_PENDING,
    );
    expect(result.label).toBe('Cancel');
    expect(result.action).toBe('cancel');
  });

  it('completed card with plan → "Run Card" (re-run path)', () => {
    // After a successful run, status flips to `completed`. The user should
    // be able to re-run; the same Run-Card label applies (no separate
    // "Re-run" wording in Wave 1).
    const result = deriveRunButtonState(
      makeCard({ intent_spec_id: 'is_1', status: 'completed' }),
      STUB_PLAN,
      NO_PENDING,
    );
    expect(result.label).toBe('Run Card');
    expect(result.action).toBe('run');
    expect(result.disabled).toBe(false);
  });
});
