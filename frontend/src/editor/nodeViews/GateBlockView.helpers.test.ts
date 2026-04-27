import { describe, it, expect } from 'vitest';
import { formatGateBadge, canSignOffGate, badgeColorTokens } from './GateBlockView.helpers';
import type { Gate } from '@/types/gate';

function makeGate(status: Gate['status'] = 'PENDING'): Gate {
  return {
    id: 'g_1',
    board_id: 'b_1',
    project_id: 'p_1',
    name: 'Approval Gate',
    gate_type: 'review',
    status,
    created_at: '2026-04-26T00:00:00Z',
    updated_at: '2026-04-26T00:00:00Z',
  };
}

describe('formatGateBadge', () => {
  it('PENDING → amber', () => {
    expect(formatGateBadge(makeGate('PENDING'))).toEqual({ label: 'Pending', color: 'amber' });
  });
  it('EVALUATING → blue', () => {
    expect(formatGateBadge(makeGate('EVALUATING'))).toEqual({ label: 'Evaluating', color: 'blue' });
  });
  it('PASSED → green', () => {
    expect(formatGateBadge(makeGate('PASSED'))).toEqual({ label: 'Passed', color: 'green' });
  });
  it('FAILED → red', () => {
    expect(formatGateBadge(makeGate('FAILED'))).toEqual({ label: 'Failed', color: 'red' });
  });
  it('WAIVED → grey', () => {
    expect(formatGateBadge(makeGate('WAIVED'))).toEqual({ label: 'Waived', color: 'grey' });
  });
  it('null gate → grey unknown', () => {
    expect(formatGateBadge(null)).toEqual({ label: 'Unknown', color: 'grey' });
  });
});

describe('canSignOffGate', () => {
  it('PENDING → true', () => {
    expect(canSignOffGate(makeGate('PENDING'))).toBe(true);
  });
  it('EVALUATING → false (terminal-ish)', () => {
    expect(canSignOffGate(makeGate('EVALUATING'))).toBe(false);
  });
  it('PASSED → false', () => {
    expect(canSignOffGate(makeGate('PASSED'))).toBe(false);
  });
  it('FAILED → false', () => {
    expect(canSignOffGate(makeGate('FAILED'))).toBe(false);
  });
  it('null gate → false', () => {
    expect(canSignOffGate(null)).toBe(false);
  });
});

describe('badgeColorTokens', () => {
  it('produces hex pairs for every color', () => {
    expect(badgeColorTokens('green')).toEqual({ bg: '#e8f5e9', fg: '#2e7d32' });
    expect(badgeColorTokens('amber')).toEqual({ bg: '#fff8e1', fg: '#ef6c00' });
    expect(badgeColorTokens('red')).toEqual({ bg: '#ffebee', fg: '#c62828' });
    expect(badgeColorTokens('blue')).toEqual({ bg: '#e3f2fd', fg: '#1565c0' });
    expect(badgeColorTokens('grey')).toEqual({ bg: '#f0f0ec', fg: '#6b6b6b' });
  });
});
