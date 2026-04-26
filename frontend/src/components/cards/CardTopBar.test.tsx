/**
 * CardTopBar — tests for the visual-mapping helper.
 *
 * As of 08-02 (Wave 2), the underlying state-machine logic was promoted to
 * the shared `useCardRunState` hook (see hooks/useCardRunState.test.ts for
 * the discriminator coverage). What's left to test in CardTopBar is the
 * mapping from CardRunState → button visual props (`runStateToButton`),
 * which is responsible for collapsing Wave 2's richer states (no-inputs,
 * completed, failed) back to Wave 1 vocabulary so the top-bar UX stays
 * compact.
 *
 * The test environment remains vitest env=node without
 * @testing-library/react. We test `runStateToButton` as a pure function;
 * the cross-surface sync invariant (CardTopBar and CardActionBar agree
 * on stage) is covered in `hooks/useCardRunState.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import { runStateToButton } from './CardTopBar';
import type { CardRunState } from '@hooks/useCardRunState';

const NOOP = vi.fn().mockResolvedValue(undefined);

// ---------------------------------------------------------------------------
// 1-7: stage → button label
// ---------------------------------------------------------------------------

describe('runStateToButton — stage → label', () => {
  it('no-intent → "Draft Intent first" disabled', () => {
    const result = runStateToButton({ stage: 'no-intent' });
    expect(result.label).toBe('Draft Intent first');
    expect(result.disabled).toBe(true);
    expect(result.title).toMatch(/IntentSpec/);
    expect(result.variant).toBe('sparkle');
  });

  it('no-inputs → collapses to disabled "Generate Plan" with input-pin tooltip', () => {
    const result = runStateToButton({ stage: 'no-inputs' });
    expect(result.label).toBe('Generate Plan');
    expect(result.disabled).toBe(true);
    expect(result.title).toMatch(/Pin at least one input/);
  });

  it('no-plan → "Generate Plan" enabled', () => {
    const state: CardRunState = { stage: 'no-plan', isPending: false, generate: NOOP };
    const result = runStateToButton(state);
    expect(result.label).toBe('Generate Plan');
    expect(result.disabled).toBe(false);
    expect(result.variant).toBe('settings');
  });

  it('ready → "Run Card" enabled', () => {
    const state: CardRunState = { stage: 'ready', isPending: false, run: NOOP };
    const result = runStateToButton(state);
    expect(result.label).toBe('Run Card');
    expect(result.disabled).toBe(false);
    expect(result.variant).toBe('primary');
  });

  it('running → "Cancel" enabled', () => {
    const state: CardRunState = { stage: 'running', isPending: false, cancel: NOOP };
    const result = runStateToButton(state);
    expect(result.label).toBe('Cancel');
    expect(result.disabled).toBe(false);
    expect(result.variant).toBe('cancel');
  });

  it('completed → "Run Card" (CardTopBar collapses to Wave 1 wording)', () => {
    const state: CardRunState = { stage: 'completed', isPending: false, rerun: NOOP };
    const result = runStateToButton(state);
    expect(result.label).toBe('Run Card');
    expect(result.variant).toBe('primary');
    expect(result.disabled).toBe(false);
  });

  it('failed → "Run Card" (CardTopBar collapses to Wave 1 wording)', () => {
    const state: CardRunState = { stage: 'failed', isPending: false, rerun: NOOP };
    const result = runStateToButton(state);
    expect(result.label).toBe('Run Card');
    expect(result.variant).toBe('primary');
    expect(result.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8-10: pending overrides
// ---------------------------------------------------------------------------

describe('runStateToButton — pending overrides', () => {
  it('no-plan + pending → "Generating…" disabled', () => {
    const state: CardRunState = { stage: 'no-plan', isPending: true, generate: NOOP };
    const result = runStateToButton(state);
    expect(result.label).toBe('Generating…');
    expect(result.pending).toBe(true);
    expect(result.disabled).toBe(true);
  });

  it('ready + pending → "Starting…" disabled', () => {
    const state: CardRunState = { stage: 'ready', isPending: true, run: NOOP };
    const result = runStateToButton(state);
    expect(result.label).toBe('Starting…');
    expect(result.pending).toBe(true);
    expect(result.disabled).toBe(true);
  });

  it('running + pending (cancel in flight) → "Cancelling…" disabled', () => {
    const state: CardRunState = { stage: 'running', isPending: true, cancel: NOOP };
    const result = runStateToButton(state);
    expect(result.label).toBe('Cancelling…');
    expect(result.pending).toBe(true);
    expect(result.disabled).toBe(true);
  });
});
