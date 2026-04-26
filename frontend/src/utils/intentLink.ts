// D7: helpers for the card → IntentSpec linkage UI.

import type { IntentSpec } from '@/types/intent';
import type { Card } from '@/types/card';

/**
 * Best-effort display name for an IntentSpec. Falls back through
 * goal → name (legacy) → intent_type → id so the picker never renders blank.
 */
export function intentDisplayName(intent: IntentSpec | null | undefined): string {
  if (!intent) return '';
  const anyIntent = intent as IntentSpec & { name?: string };
  if (intent.goal && intent.goal.trim()) return intent.goal.trim();
  if (anyIntent.name && anyIntent.name.trim()) return anyIntent.name.trim();
  if (intent.intent_type && intent.intent_type.trim()) return intent.intent_type.trim();
  return intent.id;
}

/**
 * Whether a re-link from the card's current intent to `nextIntent` is allowed.
 *
 * Rule: a locked intent cannot become the *new* link if the card already has
 * runs/evidence — locking is the boundary at which the card's plan and evidence
 * graph crystallise around an intent. Re-linking onto a locked intent after
 * runs exist would orphan evidence against an immutable spec.
 *
 * Always returns true for the initial link (no prior intent).
 */
export function canRelink(
  card: Pick<Card, 'intent_spec_id'> & { run_count?: number; has_evidence?: boolean },
  nextIntent: IntentSpec | null | undefined,
): boolean {
  // Clearing the link is always permitted.
  if (!nextIntent) return true;

  // Initial link (no current link) — always OK.
  if (!card.intent_spec_id) return true;

  // No-op link → fine.
  if (card.intent_spec_id === nextIntent.id) return true;

  const hasRuns = (card.run_count ?? 0) > 0 || card.has_evidence === true;
  if (hasRuns && nextIntent.status === 'locked') return false;

  return true;
}
