// Migration notes: Phase 8 (Card-as-page) Wave 1 replaces the side-sheet
// at frontend/src/components/boards/cards/CardDetail.tsx (302 LOC) — formerly
// mounted inside BoardDetailPage → CardsTab when `selectedCardId` was set —
// with this full-page route at `/cards/:cardId`.
//
// PRESERVED behaviors (must continue to work):
// 1. The same `useCard(card.id)` React Query cache is the source of truth
//    for card mutations. Title edits via `useUpdateCard` still invalidate
//    `cardKeys.detail(id)` so other surfaces (BoardDetailPage Cards-tab
//    list, dependency graph) stay in sync without polling.
// 2. IntentSpec linkage UI (D7's `<LinkedIntentSection>`) is the canonical
//    surface for card→intent binding — Wave 2 will inline it inside the
//    Hero / Inputs body section.
// 3. Plan generation (`useGeneratePlan`) is still invoked from the same
//    cache key (`planKeys.detail(cardId)`); Wave 1 promotes Run from a
//    separate `<ExecutePlanButton>` in the PlanViewer panel to a
//    first-class `[▶ Run Card]` action in `CardTopBar`.
// 4. The KPIs + Evidence inline tables — deferred to Wave 2 body sections
//    (`AvailableMethodsTable`, `CardStatusPanel`).
//
// INTENTIONALLY DROPPED in Wave 1:
// - The side-sheet's two-button row (Generate Plan / View Plan) is folded
//   into the new `CardTopBar` Run state machine on the page.
// - The "Close" affordance on the side-sheet → replaced by `← back to Board`
//   navigation in the top bar.
// - The side-sheet remains accessible behind `?legacy=1` on the Board route
//   (BoardDetailPage falls back to the side-sheet when the flag is set) for
//   one release window.
//
// No focus-trap, no keyboard shortcuts, no portal — the side-sheet was a
// regular flex panel. Closing had no side effects beyond clearing
// `selectedCardId`/`showPlanViewer` in BoardDetailPage's local state.

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCard } from '@hooks/useCards';
import { useBoard } from '@hooks/useBoards';
import { useUiStore } from '@store/uiStore';
import PageSkeleton from '@components/ui/PageSkeleton';
import ErrorState from '@components/ui/ErrorState';
import CardDetailLayout from '@components/cards/CardDetailLayout';
import CardTopBar from '@components/cards/CardTopBar';

export default function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);

  const { data: card, isLoading: cardLoading, error: cardError, refetch: refetchCard } = useCard(cardId);
  // Board fetch is non-fatal — the breadcrumb / Mode badge in CardTopBar
  // tolerates board=undefined while loading or on error.
  const { data: board, isLoading: boardLoading } = useBoard(card?.board_id);

  // While on /cards/:id the sidebar swaps to the Card-detail context —
  // see SidebarContentRouter, which mounts <CardDetailSidebar> for this
  // content type. CardDetailSidebar reads useParams to scope ThisBoardNav
  // and ThisCardStatusPill to the current card.
  useEffect(() => {
    setSidebarContentType('card-detail');
    hideBottomBar();
    return () => {
      setSidebarContentType('navigation');
    };
  }, [setSidebarContentType, hideBottomBar]);

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

  return (
    <CardDetailLayout>
      <CardTopBar card={card} board={board} boardLoading={boardLoading} />
      <div className="text-center text-sm text-[#9b978f] py-32">
        Card body — coming in 08-02
      </div>
    </CardDetailLayout>
  );
}
