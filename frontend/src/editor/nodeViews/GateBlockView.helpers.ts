import type { Gate, GateStatus } from '@/types/gate';
import type { GateStatus as PrimitiveGateStatus } from '@/components/cards/primitives';

// ---------------------------------------------------------------------------
// GateBlockView helpers — pure functions extracted for testability.
// ---------------------------------------------------------------------------

export type GateBadgeColor = 'green' | 'amber' | 'red' | 'blue' | 'grey';

/**
 * Map a gate's status to a badge label + color used by the NodeView chrome.
 * The kernel statuses are uppercase enums; we surface human-friendly labels.
 */
export function formatGateBadge(gate: Gate | undefined | null): {
  label: string;
  color: GateBadgeColor;
} {
  if (!gate) return { label: 'Unknown', color: 'grey' };
  const status: GateStatus = gate.status;
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', color: 'amber' };
    case 'EVALUATING':
      return { label: 'Evaluating', color: 'blue' };
    case 'PASSED':
      return { label: 'Passed', color: 'green' };
    case 'FAILED':
      return { label: 'Failed', color: 'red' };
    case 'WAIVED':
      return { label: 'Waived', color: 'grey' };
    default:
      return { label: status, color: 'grey' };
  }
}

/**
 * Whether the current user can sign off (approve/reject) a given gate. For
 * Wave 10-04 we keep this permissive — Mode-rule gating ships in 10-06.
 * The decision: only PENDING gates show sign-off buttons; PASSED/FAILED/WAIVED
 * are terminal.
 */
export function canSignOffGate(gate: Gate | undefined | null): boolean {
  if (!gate) return false;
  return gate.status === 'PENDING';
}

const COLOR_TOKENS: Record<GateBadgeColor, { bg: string; fg: string }> = {
  green: { bg: '#e8f5e9', fg: '#2e7d32' },
  amber: { bg: '#fff8e1', fg: '#ef6c00' },
  red:   { bg: '#ffebee', fg: '#c62828' },
  blue:  { bg: '#e3f2fd', fg: '#1565c0' },
  grey:  { bg: '#f0f0ec', fg: '#6b6b6b' },
};

/** Color tokens for a given badge color. Pure — no React. */
export function badgeColorTokens(color: GateBadgeColor): { bg: string; fg: string } {
  return COLOR_TOKENS[color];
}

/**
 * Collapse the kernel's `GateStatus` (5 values, includes EVALUATING) onto
 * the `GateBadge` primitive's `GateStatus` (4 values). EVALUATING surfaces
 * as PENDING in the new chrome — the primitive's design intentionally
 * folds intermediate evaluation into the pending state.
 */
export function toPrimitiveGateStatus(status: GateStatus): PrimitiveGateStatus {
  switch (status) {
    case 'PASSED':     return 'PASSED';
    case 'FAILED':     return 'FAILED';
    case 'WAIVED':     return 'WAIVED';
    case 'PENDING':
    case 'EVALUATING':
    default:           return 'PENDING';
  }
}
