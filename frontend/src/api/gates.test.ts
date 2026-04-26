import { describe, it, expect } from 'vitest';
import { gateActionEnabled, type GateAction } from './gates';
import type { GateStatus } from '@/types/gate';

// ---------------------------------------------------------------------------
// D5: action enablement table-driven tests (5 statuses × 4 actions = 20 cases)
// ---------------------------------------------------------------------------

const STATUSES: GateStatus[] = ['PENDING', 'EVALUATING', 'PASSED', 'FAILED', 'WAIVED'];
const ACTIONS: GateAction[] = ['evaluate', 'approve', 'reject', 'waive'];

// Expected enablement matrix mirrors `service/gate.go` transition rules:
//   - evaluate : PENDING only
//   - approve  : PENDING | EVALUATING | FAILED
//   - reject   : PENDING | EVALUATING | FAILED
//   - waive    : FAILED only
const EXPECTED: Record<GateStatus, Record<GateAction, boolean>> = {
  PENDING: { evaluate: true, approve: true, reject: true, waive: false },
  EVALUATING: { evaluate: false, approve: true, reject: true, waive: false },
  PASSED: { evaluate: false, approve: false, reject: false, waive: false },
  FAILED: { evaluate: false, approve: true, reject: true, waive: true },
  WAIVED: { evaluate: false, approve: false, reject: false, waive: false },
};

describe('gateActionEnabled', () => {
  for (const status of STATUSES) {
    for (const action of ACTIONS) {
      const expected = EXPECTED[status][action];
      it(`status=${status} action=${action} -> ${expected}`, () => {
        expect(gateActionEnabled(status, action)).toBe(expected);
      });
    }
  }

  it('returns false for unknown actions', () => {
    expect(gateActionEnabled('PENDING', 'unknown' as unknown as GateAction)).toBe(false);
  });

  it('terminal states (PASSED, WAIVED) disable all actions', () => {
    for (const action of ACTIONS) {
      expect(gateActionEnabled('PASSED', action)).toBe(false);
      expect(gateActionEnabled('WAIVED', action)).toBe(false);
    }
  });
});
