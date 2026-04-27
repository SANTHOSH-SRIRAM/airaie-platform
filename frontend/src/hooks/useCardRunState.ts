import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useExecutePlan, useGeneratePlan } from '@hooks/usePlans';
import { useCancelRun } from '@hooks/useRuns';
import { listCardRuns, type RunSummary } from '@api/cards';
import { cardKeys } from '@hooks/useCards';
import type { Card } from '@/types/card';
import type { ExecutionPlan } from '@/types/plan';
import type { IntentSpec } from '@/types/intent';

// ---------------------------------------------------------------------------
// useCardRunState — shared Run state machine
//
// Wave 1 shipped a 4-state Run button (Draft Intent → Generate Plan → Run
// Card → Cancel) inline in CardTopBar.tsx as a pure helper
// (`deriveRunButtonState`). Wave 2 promotes that helper to a hook so two
// surfaces — the existing CardTopBar and the new CardActionBar — share the
// same source of truth.
//
// Design contract:
//   - The hook is pure-of-mutation but stateful via React Query subscriptions.
//     CardTopBar and CardActionBar both call useCardRunState(card, intent,
//     plan, latestRun?) and get a discriminated-union `CardRunState`.
//   - Mutations (`useExecutePlan`, `useGeneratePlan`, `useCancelRun`) live
//     INSIDE the hook so each surface gets its own mutation slot but
//     shares the same React Query cache key for `cardKeys.detail` and
//     `planKeys.detail`. A run started from either surface flips both
//     to `Cancel` within one render cycle.
//   - The Wave 2 stages add `no-inputs` (between `no-intent` and `no-plan`,
//     when an IntentSpec has no pinned artifacts) and `completed`/`failed`
//     terminal stages with explicit `rerun` actions, which the older
//     `deriveRunButtonState` mapped to plain `Run Card`.
//
// Backwards-compat: CardTopBar continues to render a single button per
// stage. Stages it doesn't recognize (`no-inputs`, `completed`, `failed`)
// collapse visually to `no-intent`/`ready` to preserve Wave 1 semantics
// while CardActionBar shows the richer version.
// ---------------------------------------------------------------------------

export type CardRunStage =
  | 'no-intent'
  | 'no-inputs'
  | 'no-plan'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed';

export type CardRunState =
  | { stage: 'no-intent' }
  | { stage: 'no-inputs' }
  | { stage: 'no-plan'; generate: () => Promise<void>; isPending: boolean }
  | { stage: 'ready'; run: () => Promise<void>; isPending: boolean }
  | { stage: 'running'; cancel: () => Promise<void>; isPending: boolean }
  | { stage: 'completed'; rerun: () => Promise<void>; isPending: boolean }
  | { stage: 'failed'; rerun: () => Promise<void>; isPending: boolean };

// ---------------------------------------------------------------------------
// deriveCardRunStage — pure helper. Computes the stage from Card + IntentSpec
// + Plan state. Exported for unit tests so we can verify the discriminator
// without mounting React Query.
//
// Order of checks (priority high → low):
//   1. card.status === 'running' or 'queued' → 'running' (overrides everything)
//   2. card.status === 'completed' → 'completed'
//   3. card.status === 'failed' → 'failed'
//   4. !card.intent_spec_id → 'no-intent'
//   5. intent.inputs is empty/none-pinned → 'no-inputs'
//   6. !plan → 'no-plan'
//   7. otherwise → 'ready'
// ---------------------------------------------------------------------------

export function deriveCardRunStage(
  card: Pick<Card, 'intent_spec_id' | 'status'>,
  intent: IntentSpec | undefined,
  plan: ExecutionPlan | null | undefined,
): CardRunStage {
  // Run-in-flight stage is highest priority — even if intent or plan went
  // missing during the run somehow, we surface Cancel.
  if (card.status === 'running' || card.status === 'queued') return 'running';

  // Terminal run stages override the configuration progression — once a run
  // has completed/failed we want users to see the re-run path, not "no plan."
  if (card.status === 'completed') return 'completed';
  if (card.status === 'failed') return 'failed';

  // Configuration progression
  if (!card.intent_spec_id) return 'no-intent';
  // CardActionBar exposes the no-inputs gate; CardTopBar collapses it.
  if (intent && (!intent.inputs || intent.inputs.length === 0)) return 'no-inputs';
  if (!plan) return 'no-plan';
  return 'ready';
}

// ---------------------------------------------------------------------------
// useLatestCardRunId — small co-located hook. Wave 1's CardTopBar already had
// this as a private helper; we lift it here so CardActionBar can re-use the
// same React Query cache key. Lifting was deferred in Wave 1 ("we deliberately
// did NOT ship a new shared hook ... if 08-02 grows a second caller we'll
// lift it then" — 08-01-SUMMARY decision #2). Now we have a second caller.
// ---------------------------------------------------------------------------

/**
 * Pure selector — given the card's run-link summaries, return the latest
 * underlying **workflow-run** id (`run_*`), NOT the card-run **link** id
 * (`crun_*`). `useRunDetail` and `cancelRun` both target `/v0/runs/{id}`;
 * passing the link id 404s. Exported so the same logic can be unit-tested
 * AND shared by `CardDetailPage`'s memoized selector.
 */
export function pickLatestRunId(runs: RunSummary[] | undefined | null): string | null {
  if (!runs || runs.length === 0) return null;
  const sorted = [...runs].sort((a, b) => {
    const ta = new Date(a.started_at).getTime();
    const tb = new Date(b.started_at).getTime();
    return tb - ta;
  });
  return sorted[0]?.run_id ?? null;
}

function useLatestCardRunId(cardId: string, enabled: boolean): string | null {
  const { data } = useQuery({
    queryKey: [...cardKeys.detail(cardId), 'runs'] as const,
    queryFn: () => listCardRuns(cardId),
    enabled: enabled && !!cardId,
    staleTime: 5_000,
    refetchInterval: enabled ? 5_000 : false,
  });
  return pickLatestRunId(data);
}

// ---------------------------------------------------------------------------
// useCardRunState — main hook
// ---------------------------------------------------------------------------

export function useCardRunState(
  card: Card,
  intent: IntentSpec | undefined,
  plan: ExecutionPlan | null | undefined,
): CardRunState {
  const queryClient = useQueryClient();
  const generatePlan = useGeneratePlan(card.id);
  const executePlan = useExecutePlan(card.id, card.board_id);
  const cancelRun = useCancelRun();

  // Need the latest run id for Cancel. Only poll while in flight so we don't
  // hit /v0/cards/{id}/runs on every page render for completed Cards.
  const inFlight = card.status === 'running' || card.status === 'queued';
  const latestRunId = useLatestCardRunId(card.id, inFlight);

  const stage = deriveCardRunStage(card, intent, plan);

  switch (stage) {
    case 'no-intent':
      return { stage: 'no-intent' };
    case 'no-inputs':
      return { stage: 'no-inputs' };
    case 'no-plan':
      return {
        stage: 'no-plan',
        isPending: generatePlan.isPending,
        generate: async () => {
          await generatePlan.mutateAsync();
        },
      };
    case 'ready':
      return {
        stage: 'ready',
        isPending: executePlan.isPending,
        run: async () => {
          await executePlan.mutateAsync();
          // Force a card refetch so card.status flips to 'running' faster
          // than the 15s staleTime would otherwise allow.
          queryClient.invalidateQueries({ queryKey: cardKeys.detail(card.id) });
        },
      };
    case 'running':
      return {
        stage: 'running',
        isPending: cancelRun.isPending,
        cancel: async () => {
          if (!latestRunId) {
            throw new Error('No run id to cancel');
          }
          await cancelRun.mutateAsync(latestRunId);
          queryClient.invalidateQueries({ queryKey: cardKeys.detail(card.id) });
        },
      };
    case 'completed':
      return {
        stage: 'completed',
        isPending: executePlan.isPending,
        rerun: async () => {
          await executePlan.mutateAsync();
          queryClient.invalidateQueries({ queryKey: cardKeys.detail(card.id) });
        },
      };
    case 'failed':
      return {
        stage: 'failed',
        isPending: executePlan.isPending,
        rerun: async () => {
          await executePlan.mutateAsync();
          queryClient.invalidateQueries({ queryKey: cardKeys.detail(card.id) });
        },
      };
  }
}
