import type { CardEvidence } from '@/types/card';
import type { EvidenceEvaluation } from '@/components/cards/primitives';

// ---------------------------------------------------------------------------
// EvidenceBlockView helpers — pure functions extracted for testability under
// vitest env=node. The view shell stays JSX; helpers carry the logic.
// ---------------------------------------------------------------------------

/**
 * Find a single CardEvidence row in a list by id. Returns undefined when the
 * list is null/empty or the id isn't present. Pure — no fetches.
 */
export function findEvidenceById(
  list: CardEvidence[] | undefined | null,
  id: string | null | undefined,
): CardEvidence | undefined {
  if (!list || !id) return undefined;
  return list.find((ev) => ev.id === id);
}

export type EvidenceChip = 'pass' | 'fail' | 'warning' | 'info' | 'pending';

/**
 * Map a CardEvidence row to a 2-line summary + a chip color/label. The
 * `evaluation` field is the canonical chip kind; we additionally surface
 * `pending` when an evidence row exists but has no evaluation set yet
 * (defensive — kernel currently always emits one of the 4 canonical values).
 */
export function formatEvidenceSummary(ev: CardEvidence): {
  line1: string;
  line2: string;
  chip: EvidenceChip;
} {
  const valueDisplay =
    typeof ev.metric_value === 'number'
      ? `${ev.metric_value}${ev.metric_unit ? ` ${ev.metric_unit}` : ''}`
      : '—';

  let thresholdText = '';
  if (typeof ev.threshold === 'number' && ev.operator) {
    thresholdText = ` (${ev.operator} ${ev.threshold}${ev.metric_unit ? ` ${ev.metric_unit}` : ''})`;
  }

  return {
    line1: `${ev.metric_key}: ${valueDisplay}${thresholdText}`,
    line2: ev.run_id ? `From run ${ev.run_id}` : 'Manual evidence',
    chip: ev.evaluation ?? 'pending',
  };
}

/**
 * Collapse the helper's `EvidenceChip` (5 values) onto the `EvidenceRow`
 * primitive's `EvidenceEvaluation` (3 values). 'warning' and 'info' both
 * surface as 'pending' in the new chrome — the primitive doesn't model
 * intermediate states, and 'pending' uses the warning/amber tick.
 */
export function chipToEvaluation(chip: EvidenceChip): EvidenceEvaluation {
  switch (chip) {
    case 'pass': return 'pass';
    case 'fail': return 'fail';
    case 'warning':
    case 'info':
    case 'pending':
    default:     return 'pending';
  }
}
