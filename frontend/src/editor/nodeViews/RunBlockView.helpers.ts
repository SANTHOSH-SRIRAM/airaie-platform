import type { CardRunStage } from '@hooks/useCardRunState';

/**
 * Pure helper — map a CardRunStage to the inline Run button label. Same
 * vocabulary as CardActionBar's `runStateToActionView` (a Run started from
 * either surface should display the same label across both).
 */
export function runStageToButtonLabel(stage: CardRunStage): string {
  switch (stage) {
    case 'no-intent':
      return 'Draft Intent first';
    case 'no-inputs':
      return 'Pin Inputs first';
    case 'no-plan':
      return 'Generate Plan';
    case 'ready':
      return 'Run Card';
    case 'running':
      return 'Cancel';
    case 'completed':
      return 'Re-run';
    case 'failed':
      return 'Re-run';
  }
}

/**
 * Pure helper — map a CardRunStage to a discriminator describing what the
 * primary action does. RunBlockView branches on this to decide which
 * `state.X()` method to invoke.
 *
 *   no-intent → 'add-intent'  (no action; informational)
 *   no-inputs → 'add-inputs'  (no action; informational)
 *   no-plan   → 'generate'    (calls state.generate())
 *   ready     → 'run'         (calls state.run())
 *   running   → 'cancel'      (calls state.cancel())
 *   completed → 'view-result' (calls state.rerun() — re-run is the action;
 *                              "view-result" is a misnomer of historical
 *                              record. The action is rerun. Tests pin
 *                              the discriminator name.)
 *   failed    → 'retry'       (calls state.rerun())
 *
 * NOTE: 'view-result' and 'retry' both map to state.rerun() in completed/
 * failed stages — the discriminator distinguishes them so the UI can
 * pick a different icon (RotateCcw for both is fine for Wave 10-03).
 */
export type RunCallToAction =
  | 'run'
  | 'cancel'
  | 'generate'
  | 'add-intent'
  | 'add-inputs'
  | 'view-result'
  | 'retry';

export function runStageToCallToAction(stage: CardRunStage): RunCallToAction {
  switch (stage) {
    case 'no-intent':
      return 'add-intent';
    case 'no-inputs':
      return 'add-inputs';
    case 'no-plan':
      return 'generate';
    case 'ready':
      return 'run';
    case 'running':
      return 'cancel';
    case 'completed':
      return 'view-result';
    case 'failed':
      return 'retry';
  }
}
