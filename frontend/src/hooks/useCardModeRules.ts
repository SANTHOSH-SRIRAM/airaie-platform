import type { Card } from '@/types/card';
import type { Board } from '@/types/board';

/**
 * Mode-aware affordances for the Card-as-page surface.
 *
 * The Mode dial (Explore / Study / Release) governs what a user can edit and
 * what gates fire. Concept doc §"Mode-aware sections" (`03-CARDS-AS-PAGES.md`)
 * describes the matrix; this hook codifies it so every section can read the
 * same rule set without re-deriving from `board.mode` in seven places.
 *
 * Rules summary:
 *   Explore  → everything editable, manual evidence allowed, no peer review
 *              required, "Use Agent instead" available.
 *   Study    → IntentSpec/Inputs locked once first run completes; peer review
 *              required; manual evidence still allowed.
 *   Release  → IntentSpec + Inputs always locked; manual evidence forbidden;
 *              peer review + QA approval required.
 *
 * The `canRun` flag is independently gated on `intent_spec_id` because we
 * cannot generate a Plan without an IntentSpec — that's a hard precondition
 * orthogonal to Mode.
 */
export interface CardModeRules {
  mode: 'explore' | 'study' | 'release';
  // ── Editing
  canEditIntentGoalAndKpis: boolean;
  canPinInputs: boolean;
  canChangePipeline: boolean;
  canUseAgentInstead: boolean;
  // ── Evidence
  canAddManualEvidence: boolean;
  // ── Gates
  requiresPeerReview: boolean;
  requiresQaApproval: boolean;
  // ── Run
  canRun: boolean;
  // ── Promotion CTA on top bar (where to go from here)
  promoteTarget: 'study' | 'release' | null;
}

/**
 * Returns the rule set for the given Card on its Board.
 *
 * Defaults to Explore-mode rules when either argument is missing — this lets
 * the hook be called during the loading window without sections rendering as
 * "everything locked" by accident.
 */
export function useCardModeRules(
  card: Card | undefined,
  board: Board | undefined,
): CardModeRules {
  const mode = (board?.mode ?? 'explore') as CardModeRules['mode'];
  // `started_at` is set the first time a run starts — concept doc §"Mode-aware
  // sections" defines "first run" as "any run has been attempted." Using
  // `started_at` instead of "any completed run" matches the lock semantics
  // the kernel applies on Card transitions.
  const hasFirstRun = Boolean(card?.started_at);

  return {
    mode,
    // Intent goal/KPIs: editable in Explore; editable in Study only before
    // the first run; never editable in Release.
    canEditIntentGoalAndKpis:
      mode === 'explore' || (mode === 'study' && !hasFirstRun),
    // Inputs: pin/unpin only in Explore. Study + Release lock the input set
    // so reproducibility is preserved.
    canPinInputs: mode === 'explore',
    // Pipeline / Method: only the Explore mode can swap pipelines.
    canChangePipeline: mode === 'explore',
    // "Use Agent instead" toggle: Explore-only per concept doc table.
    canUseAgentInstead: mode === 'explore',
    // Evidence: manual evidence add allowed in Explore + Study; forbidden in
    // Release (auto-evidence only).
    canAddManualEvidence: mode !== 'release',
    // Peer review: required in Study and Release.
    requiresPeerReview: mode !== 'explore',
    // QA approval: required only in Release.
    requiresQaApproval: mode === 'release',
    // Run: allowed once an IntentSpec exists. Plan-generation is a separate
    // step the state machine in useCardRunState handles.
    canRun: Boolean(card?.intent_spec_id),
    // Promotion CTA: where to escalate from here. Release has no next step.
    promoteTarget:
      mode === 'explore' ? 'study' : mode === 'study' ? 'release' : null,
  };
}
