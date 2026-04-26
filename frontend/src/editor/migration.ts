// Card Canvas auto-migration — Phase 10 / Plan 10-01.
//
// `generateDefaultBody` produces an initial Tiptap document for a Card the
// first time the user opens the canvas (before they've ever saved). It walks
// the card's current entity state (intent, plan, latest run, evidence, gates)
// and emits the typed-governance blocks in the canonical order:
//
//   1. IntentBlock          (one)
//   2. InputBlock           (per IntentSpec.inputs entry)
//   3. KpiBlock             (per IntentSpec.acceptance_criteria entry)
//   4. MethodBlock          (one — when a plan exists)
//   5. RunBlock             (one — when a plan exists)
//   6. ResultBlock          (per evidence row carrying an artifact_id, when
//                            the latest run is completed)
//   7. EvidenceBlock        (per evidence row)
//   8. GateBlock            (per gate required by the board's mode)
//
// When the card has no IntentSpec the document degrades to a single paragraph
// inviting the user to start; the user can then `/intent` to add the first
// typed block.
//
// IMPORTANT: this function is a *frontend* migration. It runs in memory only
// — we never POST a server-side migration. The user's first explicit save
// (debounced 1500ms after the first edit) populates `cards.body_blocks` for
// real; if another tab populated it first we'll re-fetch on next mount and
// honor the persisted shape.

import type { Card, CardEvidence } from '@/types/card';
import type { IntentSpec, AcceptanceCriterion, IntentInput, CriterionOperator } from '@/types/intent';
import type { ExecutionPlan } from '@/types/plan';
import type { Gate } from '@/types/gate';
import type {
  BlockNode,
  CardBodyDoc,
  KpiOperator,
  KpiBlockNode,
} from '@/types/cardBlocks';

/**
 * Minimal shape we need from the latest run. We accept a pared-down view so
 * tests can pass synthetic data and the page can pass either `RunDetail` or
 * the lighter `RunSummary` returned by `listCardRuns`.
 */
export interface MigrationRun {
  id: string;
  status: string; // 'running' | 'completed' | 'succeeded' | 'failed' | …
}

export interface GenerateDefaultBodyArgs {
  card: Card;
  intent: IntentSpec | null;
  plan: ExecutionPlan | null;
  latestRun: MigrationRun | null;
  /**
   * Evidence rows for this card. When the latest run is in a terminal-pass
   * state, evidence rows that carry an `artifact_id` are also rendered as
   * ResultBlocks (so the document shows both the raw outputs and the
   * structured evidence). Evidence without an artifact still renders as
   * EvidenceBlock only.
   */
  evidence: CardEvidence[];
  /** Gates required by the board's mode. */
  gates: Gate[];
}

/**
 * Map IntentSpec's `CriterionOperator` (lt/lte/gt/gte/eq/neq/in/between) to
 * the cardBlocks `KpiOperator` (between/less_than/greater_than/eq).
 *
 * The KPI block schema collapses several IntentSpec operators into the four
 * UI-meaningful buckets the editor exposes:
 *   - lt | lte → less_than
 *   - gt | gte → greater_than
 *   - eq | neq | in → eq        (in/neq fall back to eq for now; richer
 *                                 operators land with the Wave 2 KPI block UI)
 *   - between → between
 *
 * The frontend block stores this collapsed operator only; the source-of-truth
 * IntentSpec carries the full criterion. When the user edits a KpiBlock in
 * the canvas we round-trip back through the IntentSpec, not through the
 * block's denormalized attrs.
 */
function mapCriterionOperator(op: CriterionOperator): KpiOperator {
  switch (op) {
    case 'lt':
    case 'lte':
      return 'less_than';
    case 'gt':
    case 'gte':
      return 'greater_than';
    case 'between':
      return 'between';
    case 'eq':
    case 'neq':
    case 'in':
    default:
      return 'eq';
  }
}

/**
 * Coerce the IntentSpec criterion's `threshold: unknown` into the KPI block's
 * `number | [number, number]` shape. Falls back to `0` for non-numeric input
 * so the block still renders (the underlying IntentSpec stays unchanged).
 */
function coerceThreshold(
  threshold: unknown,
  operator: KpiOperator,
): KpiBlockNode['attrs']['threshold'] {
  if (operator === 'between') {
    if (Array.isArray(threshold) && threshold.length === 2) {
      const [lo, hi] = threshold;
      if (typeof lo === 'number' && typeof hi === 'number') {
        return [lo, hi];
      }
    }
    return [0, 0];
  }
  if (typeof threshold === 'number') return threshold;
  // Permissive: numeric strings get parsed; everything else falls back to 0.
  if (typeof threshold === 'string') {
    const parsed = Number(threshold);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Build the canonical default doc for a card.
 *
 * The order of blocks below is the contract — Wave 2's slash menu and the
 * mode-aware editing rules both assume it. Skipping a stage (e.g. card has
 * no IntentSpec yet) keeps the *relative order* of the surviving stages.
 */
export function generateDefaultBody(args: GenerateDefaultBodyArgs): CardBodyDoc {
  const { card: _card, intent, plan, latestRun, evidence, gates } = args;
  const blocks: BlockNode[] = [];

  // 1. Intent — anchors the doc. When absent we emit a paragraph so the
  //    user has somewhere to start typing or to invoke `/intent`.
  if (intent) {
    blocks.push({ type: 'intentBlock', attrs: { intentSpecId: intent.id } });
  } else {
    blocks.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Type / to add an Intent, or click Edit Intent above.',
        },
      ],
    });
  }

  // 2. Inputs — one per IntentSpec input. `IntentInput` carries `name`
  //    + optional `artifact_ref`. We use `artifact_ref` as the artifactId
  //    when present; otherwise we still emit the block with `null` so the
  //    user sees a placeholder for the missing artifact pin.
  if (intent && Array.isArray(intent.inputs)) {
    for (const input of intent.inputs as IntentInput[]) {
      blocks.push({
        type: 'inputBlock',
        attrs: {
          artifactId: input.artifact_ref ?? null,
          portName: input.name ?? null,
        },
      });
    }
  }

  // 3. KPIs — one per acceptance criterion. Operator collapsed via
  //    mapCriterionOperator; threshold coerced via coerceThreshold.
  if (intent && Array.isArray(intent.acceptance_criteria)) {
    for (const crit of intent.acceptance_criteria as AcceptanceCriterion[]) {
      const op = mapCriterionOperator(crit.operator);
      blocks.push({
        type: 'kpiBlock',
        attrs: {
          metricKey: crit.metric,
          operator: op,
          threshold: coerceThreshold(crit.threshold, op),
        },
      });
    }
  }

  // 4. Method — only when a plan exists.
  if (plan) {
    blocks.push({ type: 'methodBlock', attrs: { planId: plan.id } });
  }

  // 5. Run — pairs with method. Always emitted alongside method so the
  //    canvas always shows the run-control stage when there's something to
  //    run, even if no run has been started yet.
  if (plan) {
    blocks.push({ type: 'runBlock', attrs: {} });
  }

  // 6. Results — only emitted when the latest run is in a terminal-pass
  //    state. We use evidence rows as a proxy for "what artifacts came out
  //    of this run" because the run summary itself doesn't ship outputs;
  //    every result-bearing evidence row will carry an artifact_id, the
  //    rest are skipped here (they still appear as EvidenceBlock below).
  if (latestRun && (latestRun.status === 'completed' || latestRun.status === 'succeeded')) {
    for (const ev of evidence) {
      if (ev.artifact_id) {
        blocks.push({
          type: 'resultBlock',
          attrs: { artifactId: ev.artifact_id },
        });
      }
    }
  }

  // 7. Evidence — every evidence row. Renders the structured metric reading
  //    regardless of whether the run completed (ad-hoc evidence is valid).
  for (const ev of evidence) {
    blocks.push({ type: 'evidenceBlock', attrs: { evidenceId: ev.id } });
  }

  // 8. Gates — every gate required by the board's mode.
  for (const g of gates) {
    blocks.push({ type: 'gateBlock', attrs: { gateId: g.id } });
  }

  return { type: 'doc', content: blocks };
}
