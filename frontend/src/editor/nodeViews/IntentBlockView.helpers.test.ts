import { describe, it, expect } from 'vitest';
import { formatIntentSummary, formatIntentStatus } from './IntentBlockView.helpers';
import type { IntentSpec } from '@/types/intent';

const base: IntentSpec = {
  id: 'int_1',
  board_id: 'brd_1',
  intent_type: 'cfd_analysis',
  version: 1,
  goal: 'Drag < 0.3 at 30 m/s',
  inputs: [],
  acceptance_criteria: [],
  status: 'draft',
  created_at: '',
  updated_at: '',
};

describe('formatIntentSummary', () => {
  it('renders intent_type · goal when goal is present', () => {
    expect(formatIntentSummary(base)).toBe('cfd_analysis · Drag < 0.3 at 30 m/s');
  });
  it('falls back to intent_type when goal is blank', () => {
    expect(formatIntentSummary({ ...base, goal: '   ' })).toBe('cfd_analysis');
  });
  it('returns empty string for undefined / null', () => {
    expect(formatIntentSummary(undefined)).toBe('');
    expect(formatIntentSummary(null)).toBe('');
  });
});

describe('formatIntentStatus', () => {
  it('returns null for missing intent', () => {
    expect(formatIntentStatus(null)).toBeNull();
  });
  it('passes through known statuses', () => {
    expect(formatIntentStatus({ ...base, status: 'locked' })).toEqual({
      label: 'locked',
      tone: 'locked',
    });
  });
  it('marks unknown statuses as unknown tone', () => {
    // @ts-expect-error -- exercising defensive fallback
    expect(formatIntentStatus({ ...base, status: 'weird' })).toEqual({
      label: 'weird',
      tone: 'unknown',
    });
  });
});
