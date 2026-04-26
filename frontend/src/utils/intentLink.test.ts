import { describe, it, expect } from 'vitest';
import { intentDisplayName, canRelink } from './intentLink';
import type { IntentSpec } from '@/types/intent';

function intent(overrides: Partial<IntentSpec> = {}): IntentSpec {
  return {
    id: 'intent_1',
    board_id: 'b1',
    intent_type: 'sim.fea',
    version: 1,
    goal: 'Verify yield safety factor',
    inputs: [],
    acceptance_criteria: [],
    status: 'draft',
    created_at: '2026-04-25T00:00:00Z',
    updated_at: '2026-04-25T00:00:00Z',
    ...overrides,
  };
}

describe('intentDisplayName', () => {
  it('uses goal when present', () => {
    expect(intentDisplayName(intent({ goal: 'Run FEA' }))).toBe('Run FEA');
  });

  it('falls back to legacy name field when goal is empty', () => {
    const i = intent({ goal: '' }) as IntentSpec & { name?: string };
    i.name = 'Legacy Name';
    expect(intentDisplayName(i)).toBe('Legacy Name');
  });

  it('falls back to intent_type when goal and name are blank', () => {
    const i = intent({ goal: '   ' }) as IntentSpec & { name?: string };
    i.name = '';
    expect(intentDisplayName(i)).toBe('sim.fea');
  });

  it('falls back to id as last resort', () => {
    const i = intent({ goal: '', intent_type: '' }) as IntentSpec & { name?: string };
    i.name = '';
    expect(intentDisplayName(i)).toBe('intent_1');
  });

  it('returns empty string for null/undefined', () => {
    expect(intentDisplayName(null)).toBe('');
    expect(intentDisplayName(undefined)).toBe('');
  });
});

describe('canRelink', () => {
  it('allows initial link onto a draft intent', () => {
    expect(canRelink({ intent_spec_id: undefined }, intent({ status: 'draft' }))).toBe(true);
  });

  it('allows initial link onto a locked intent (no runs yet)', () => {
    expect(canRelink({ intent_spec_id: undefined }, intent({ status: 'locked' }))).toBe(true);
  });

  it('blocks re-link onto a locked intent when card has runs', () => {
    expect(
      canRelink(
        { intent_spec_id: 'old', run_count: 3 },
        intent({ id: 'new', status: 'locked' }),
      ),
    ).toBe(false);
  });

  it('blocks re-link onto a locked intent when card has evidence', () => {
    expect(
      canRelink(
        { intent_spec_id: 'old', has_evidence: true },
        intent({ id: 'new', status: 'locked' }),
      ),
    ).toBe(false);
  });

  it('allows re-link onto a draft intent even with runs', () => {
    expect(
      canRelink(
        { intent_spec_id: 'old', run_count: 5 },
        intent({ id: 'new', status: 'draft' }),
      ),
    ).toBe(true);
  });

  it('treats no-op (same id) as always allowed', () => {
    expect(
      canRelink(
        { intent_spec_id: 'same', run_count: 99 },
        intent({ id: 'same', status: 'locked' }),
      ),
    ).toBe(true);
  });

  it('always allows clearing the link', () => {
    expect(canRelink({ intent_spec_id: 'old', run_count: 99 }, null)).toBe(true);
    expect(canRelink({ intent_spec_id: 'old', run_count: 99 }, undefined)).toBe(true);
  });
});
