// Migration notes: Phase 8 (Card-as-page) Wave 2 fills the empty body slot
// from Wave 1 with a configuration-first layout: Hero → AvailableInputsTable
// → AvailableMethodsTable → AddCustomKpiForm → CardExecutionSequence (left)
// + CardStatusPanel (right) → CardActionBar (floating bottom). Lifecycle
// stage detection collapses sections during running/completed states, and
// `useCardModeRules` centralizes Mode-driven affordances.
//
// PRESERVED behaviors (must continue to work):
// 1. The same `useCard(card.id)` React Query cache is the source of truth
//    for card mutations. Title edits via `useUpdateCard` still invalidate
//    `cardKeys.detail(id)` so other surfaces (BoardDetailPage Cards-tab
//    list, dependency graph) stay in sync without polling.
// 2. The Run state machine is now in the SHARED `useCardRunState` hook;
//    CardTopBar (top) and CardActionBar (bottom) consume the same hook so
//    a Run started from either flips both within one render cycle.
// 3. IntentSpec linkage UI stays canonical; AvailableInputsTable handles
//    pinning via useUpdateIntent (replacing D7's LinkedIntentSection).
// 4. Plan generation (`useGeneratePlan`) is invoked from the same cache
//    key (`planKeys.detail(cardId)`); the Run actions on every surface
//    pick up the new plan via the shared cache automatically.
//
// INTENTIONALLY DROPPED in Wave 1 (still dropped in Wave 2):
// - The side-sheet's two-button row (Generate Plan / View Plan) is folded
//   into the new state machine.
// - The "Close" affordance on the side-sheet → replaced by `← back to Board`
//   navigation in the top bar.
// - The side-sheet remains accessible behind `?legacy=1` on the Board route
//   (BoardDetailPage falls back to the side-sheet when the flag is set) for
//   one release window. Non-`analysis` card types continue to show the
//   side-sheet via `UnsupportedCardTypeFallback`.

import { lazy, Suspense, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCard } from '@hooks/useCards';
import { useBoard } from '@hooks/useBoards';
import { useIntent } from '@hooks/useIntents';
import { usePlan } from '@hooks/usePlans';
import { useCardModeRules } from '@hooks/useCardModeRules';
import { useUiStore } from '@store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useRunDetail } from '@hooks/useRuns';
import { listCardRuns } from '@api/cards';
import { pickLatestRunId } from '@hooks/useCardRunState';
import { cardKeys } from '@hooks/useCards';
import PageSkeleton from '@components/ui/PageSkeleton';
import ErrorState from '@components/ui/ErrorState';
import CardDetailLayout from '@components/cards/CardDetailLayout';
import CardTopBar from '@components/cards/CardTopBar';
import CardHero from '@components/cards/CardHero';
import AvailableInputsTable from '@components/cards/AvailableInputsTable';
import AvailableMethodsTable from '@components/cards/AvailableMethodsTable';
import AddCustomKpiForm from '@components/cards/AddCustomKpiForm';
import CardExecutionSequence from '@components/cards/CardExecutionSequence';
import CardStatusPanel from '@components/cards/CardStatusPanel';
import CardActionBar from '@components/cards/CardActionBar';
import EmptyDraftIntent from '@components/cards/EmptyDraftIntent';
import UnsupportedCardTypeFallback from '@components/cards/UnsupportedCardTypeFallback';
import type { Card } from '@/types/card';
import type { IntentSpec } from '@/types/intent';
import type { RunDetail } from '@/types/run';

// Phase 10 — Card Canvas, behind `?canvas=1`. Lazy-loaded so the Tiptap
// editor chunk only enters the bundle when the user opens the canvas.
const CardCanvasPage = lazy(() => import('./CardCanvasPage'));

// ---------------------------------------------------------------------------
// computeLifecycleStage — pure helper. Determines which sections to render
// expanded vs collapsed.
//
// Stages:
//   draft       → no IntentSpec yet. Hero + EmptyDraftIntent visible;
//                 configuration tables hidden; sequence/status visible but
//                 mostly empty.
//   configured  → IntentSpec exists, no run in flight, no completed run.
//                 Hero + tables + sequence + status all visible.
//   running     → a run is in flight. Configuration tables collapse into a
//                 disclosure ("Configuration locked during run"); sequence
//                 shows live progress; status panel shows status + Cancel.
//   completed   → a run has terminal status (completed or failed). Tables
//                 collapse with an "Edit configuration" disclosure;
//                 status panel expands with Results + Evidence detail.
//
// Exported for unit testing.
// ---------------------------------------------------------------------------

export type LifecycleStage = 'draft' | 'configured' | 'running' | 'completed';

export function computeLifecycleStage(
  intent: IntentSpec | undefined,
  cardStatus: Card['status'],
  runDetail: RunDetail | undefined,
): LifecycleStage {
  if (!intent) return 'draft';
  // Card status running/queued is the strongest signal for an in-flight run
  // (set the moment the kernel accepts the run start, before runDetail
  // even has rows). Use it as the primary "running" indicator.
  if (cardStatus === 'running' || cardStatus === 'queued') return 'running';
  // Run-status fallback: if the run-detail polling has caught the running
  // state but card status hasn't flipped yet, still treat as running.
  if (runDetail?.status === 'running' || runDetail?.status === 'waiting') return 'running';
  // Terminal run states.
  if (runDetail?.status === 'succeeded' || runDetail?.status === 'failed') return 'completed';
  // Card status completed/failed without runDetail still surfaces completed.
  if (cardStatus === 'completed' || cardStatus === 'failed') return 'completed';
  return 'configured';
}

export default function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);

  // Phase 10 — `?canvas=1` opts the user into the Tiptap canvas. The chunk
  // is lazy-imported so non-canvas Card opens don't pay for the editor.
  // NOTE: this dispatch must happen as a *render-tree* delegation, not an
  // early return before the other hooks, otherwise React's rules-of-hooks
  // breaks (different hook count per render).
  const onCanvas = searchParams.get('canvas') === '1';

  const { data: card, isLoading: cardLoading, error: cardError, refetch: refetchCard } = useCard(cardId);
  const { data: board, isLoading: boardLoading } = useBoard(card?.board_id);
  const { data: intent } = useIntent(card?.intent_spec_id);
  const { data: plan } = usePlan(card?.id);

  // Latest run id is the same query CardActionBar / CardTopBar use; React
  // Query dedupes so we only hit /v0/cards/{id}/runs once per cycle.
  const { data: runs } = useQuery({
    queryKey: cardId ? [...cardKeys.detail(cardId), 'runs'] as const : ['cards', 'runs', '__missing__'] as const,
    queryFn: () => listCardRuns(cardId!),
    enabled: !!cardId,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
  // pickLatestRunId returns the workflow-run id (`run_*`), not the card-run
  // link id (`crun_*`). useRunDetail/cancelRun target /v0/runs/{id}; passing
  // a crun_* 404s. Shared with useLatestCardRunId.
  const latestRunId = useMemo(() => pickLatestRunId(runs), [runs]);
  const { data: runDetail } = useRunDetail(latestRunId);

  // Mode-driven rules — computed once at the page level and threaded down.
  const rules = useCardModeRules(card, board);

  // Lifecycle stage — computed once per render.
  const stage = useMemo(
    () => computeLifecycleStage(intent, card?.status ?? 'draft', runDetail),
    [intent, card?.status, runDetail],
  );

  // While on /cards/:id the sidebar swaps to the Card-detail context.
  useEffect(() => {
    setSidebarContentType('card-detail');
    hideBottomBar();
    return () => {
      setSidebarContentType('navigation');
    };
  }, [setSidebarContentType, hideBottomBar]);

  // Phase 10 canvas dispatch — placed AFTER all hooks so rules-of-hooks
  // (consistent hook count per render) is preserved. The data fetches
  // above are cached by React Query and reused inside CardCanvasPage,
  // so the work is not wasted.
  if (onCanvas) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <CardCanvasPage />
      </Suspense>
    );
  }

  // ── Loading state: show skeleton while card is fetching ─────────
  if (cardLoading) {
    return <PageSkeleton />;
  }

  // ── Error states: distinguish 404 vs other errors for clearer UX ─
  if (cardError) {
    const message = (cardError as { message?: string })?.message ?? '';
    const is404 = /404|not found/i.test(message);
    return (
      <div className="mx-auto w-full max-w-[1200px] px-6 py-6">
        <ErrorState
          message={is404 ? 'Card not found' : message || 'Failed to load card'}
          onRetry={is404 ? undefined : () => refetchCard()}
        />
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate('/boards')}
            className="text-[12px] text-[#ff9800] hover:underline"
          >
            ← Return to Boards
          </button>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-6 py-6">
        <ErrorState message="Card not found" />
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate('/boards')}
            className="text-[12px] text-[#ff9800] hover:underline"
          >
            ← Return to Boards
          </button>
        </div>
      </div>
    );
  }

  // ── Non-`analysis` card type: short-circuit to legacy fallback ──
  if (card.card_type !== 'analysis') {
    return <UnsupportedCardTypeFallback card={card} />;
  }

  // Configuration sections collapse during running / completed stages so
  // the user's eyes go to Sequence + Status. We use a <details> element so
  // the disclosure is keyboard-accessible without bespoke JS.
  const configurationLocked = stage === 'running' || stage === 'completed';

  return (
    <>
      <CardDetailLayout>
        <CardTopBar card={card} board={board} boardLoading={boardLoading} />

        {/* Hero — always visible, click-to-edit IntentSpec goal */}
        <CardHero card={card} intent={intent} rules={rules} />

        {/* Draft state: prompt for IntentSpec creation */}
        {stage === 'draft' && (
          <EmptyDraftIntent boardId={card.board_id} cardId={card.id} />
        )}

        {/* Configuration tables — collapse during running/completed */}
        {stage !== 'draft' && intent && !configurationLocked && (
          <>
            <AvailableInputsTable card={card} intent={intent} rules={rules} />
            <AvailableMethodsTable card={card} intent={intent} rules={rules} />
            <AddCustomKpiForm intent={intent} rules={rules} boardId={card.board_id} />
          </>
        )}

        {stage !== 'draft' && intent && configurationLocked && (
          <details
            aria-label="Card configuration (collapsed during run)"
            className="bg-white rounded-[12px] border border-[#f0f0ec] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)] p-[16px]"
          >
            <summary className="cursor-pointer text-[12px] font-medium text-[#6b6b6b] hover:text-[#1a1a1a] flex items-center gap-[6px] focus-visible:outline-2 focus-visible:outline-[#f57c00] focus-visible:outline-offset-2 rounded">
              <span aria-hidden="true">🔒</span>
              {stage === 'running'
                ? 'Configuration locked during run'
                : 'Edit configuration'}
              <span className="ml-auto text-[10px] text-[#acacac]">
                Inputs · Methods · KPIs
              </span>
            </summary>
            <div className="mt-[12px] flex flex-col gap-[16px]">
              <AvailableInputsTable card={card} intent={intent} rules={rules} />
              <AvailableMethodsTable card={card} intent={intent} rules={rules} />
              <AddCustomKpiForm intent={intent} rules={rules} boardId={card.board_id} />
            </div>
          </details>
        )}

        {/* Sequence + Status — two-column on wide viewports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <CardExecutionSequence
            card={card}
            plan={plan}
            latestRunId={latestRunId}
            rules={rules}
          />
          <CardStatusPanel
            card={card}
            intent={intent}
            rules={rules}
            latestRunId={latestRunId}
          />
        </div>

        {/* Bottom padding so floating action bar doesn't cover content */}
        <div aria-hidden="true" className="h-[80px]" />
      </CardDetailLayout>

      {/* CardActionBar floats fixed-bottom; rendered OUTSIDE the layout so its
          centered positioning works against the viewport, not the layout's
          max-width column. */}
      <CardActionBar card={card} intent={intent} plan={plan} rules={rules} />
    </>
  );
}
