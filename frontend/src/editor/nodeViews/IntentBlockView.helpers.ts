import type { IntentSpec } from '@/types/intent';

/**
 * Format the IntentSpec summary line shown in the IntentBlockView. Pure
 * helper extracted for env=node unit testing.
 *
 * Examples:
 *   { intent_type: 'cfd_analysis', goal: 'Drag < 0.3 at 30 m/s' }
 *     -> 'cfd_analysis · Drag < 0.3 at 30 m/s'
 *
 *   { intent_type: 'fea_static', goal: '' }
 *     -> 'fea_static'
 *
 *   undefined -> ''
 */
export function formatIntentSummary(intent: IntentSpec | undefined | null): string {
  if (!intent) return '';
  const goal = (intent.goal ?? '').trim();
  if (!goal) return intent.intent_type;
  return `${intent.intent_type} · ${goal}`;
}

/** Status pill text + tone for the IntentBlockView. Pure. */
export function formatIntentStatus(intent: IntentSpec | undefined | null):
  | { label: string; tone: 'draft' | 'locked' | 'active' | 'completed' | 'failed' | 'unknown' }
  | null {
  if (!intent) return null;
  const tone =
    intent.status === 'draft' ||
    intent.status === 'locked' ||
    intent.status === 'active' ||
    intent.status === 'completed' ||
    intent.status === 'failed'
      ? intent.status
      : 'unknown';
  return { label: intent.status, tone };
}
