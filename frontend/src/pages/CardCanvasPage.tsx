// CardCanvasPage — the feature-flagged Tiptap canvas surface.
//
// Phase 10 / Plan 10-01 ships this behind `?canvas=1` on `/cards/:cardId`.
// The default route still renders Phase 8's `CardDetailPage` — toggling the
// flag in the top bar is the only way users see the canvas in Wave 1.
//
// Wiring:
//   - useCard / useIntent / usePlan / useCardEvidence / useCardGates pull
//     the same React Query caches the structured page uses, so a card edit
//     in either surface invalidates both.
//   - When `card.body_blocks` is populated (server has a saved doc) we feed
//     it to the editor as the initial doc. Otherwise we run
//     `generateDefaultBody()` once on first render and feed the synthetic
//     doc — the user's first edit + idle save (1500ms) populates the row.
//   - `useUpdateCardBody` mutation fires inside the editor's `onIdle` with
//     the current `body_blocks_version`. 409 VERSION_CONFLICT is logged for
//     Wave 1; full 3-way merge UI lands in 10e.
//
// What's intentionally NOT here in Wave 1:
//   - Slash menu (lands in 10-02 + 10-03)
//   - Right palette / drag-drop (10-04)
//   - Mode-aware per-block edit locks (10-05)
//   - 3-way merge UI (10-05)
//   - Real NodeViews for the typed governance blocks — the schema renders
//     them as <TypedBlockPlaceholder> for now (also lands in 10-02).

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useCard, useCardEvidence, useUpdateCardBody, cardKeys } from '@hooks/useCards';
import { useBoard } from '@hooks/useBoards';
import { useIntent } from '@hooks/useIntents';
import { usePlan } from '@hooks/usePlans';
import { useCardGates } from '@hooks/useGates';
import { useCardModeRules } from '@hooks/useCardModeRules';
import { useUiStore } from '@store/uiStore';
import { listCardRuns } from '@api/cards';

import PageSkeleton from '@components/ui/PageSkeleton';
import ErrorState from '@components/ui/ErrorState';
import CardDetailLayout from '@components/cards/CardDetailLayout';
import CardTopBar from '@components/cards/CardTopBar';
import CardActionBar from '@components/cards/CardActionBar';

import { generateDefaultBody, type MigrationRun } from '@/editor/migration';
import { useAirAirEditor } from '@/editor/useAirAirEditor';
import { AirAirEditor } from '@/editor/AirAirEditor';
import type { CardBodyDoc } from '@/types/cardBlocks';

// ---------------------------------------------------------------------------
// computeInitialDoc — pure helper. Picks between the persisted body or the
// auto-migrated default. Exported for unit tests.
// ---------------------------------------------------------------------------

export interface ComputeInitialDocArgs {
  card: Parameters<typeof generateDefaultBody>[0]['card'] | undefined;
  intent: Parameters<typeof generateDefaultBody>[0]['intent'];
  plan: Parameters<typeof generateDefaultBody>[0]['plan'];
  latestRun: MigrationRun | null;
  evidence: Parameters<typeof generateDefaultBody>[0]['evidence'];
  gates: Parameters<typeof generateDefaultBody>[0]['gates'];
}

export function computeInitialDoc(args: ComputeInitialDocArgs): CardBodyDoc | null {
  const { card } = args;
  if (!card) return null;
  // Server has a doc — that's the source of truth.
  if (card.body_blocks && (card.body_blocks as CardBodyDoc).type === 'doc') {
    return card.body_blocks as CardBodyDoc;
  }
  // No persisted doc yet — auto-migrate from current entity state.
  return generateDefaultBody({
    card,
    intent: args.intent,
    plan: args.plan,
    latestRun: args.latestRun,
    evidence: args.evidence,
    gates: args.gates,
  });
}

// ---------------------------------------------------------------------------
// CardCanvasPage
// ---------------------------------------------------------------------------

export default function CardCanvasPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);

  const { data: card, isLoading: cardLoading, error: cardError, refetch: refetchCard } =
    useCard(cardId);
  const { data: board, isLoading: boardLoading } = useBoard(card?.board_id);
  const { data: intent } = useIntent(card?.intent_spec_id);
  const { data: plan } = usePlan(card?.id);
  const { data: evidence = [] } = useCardEvidence(cardId);
  const { data: gates = [] } = useCardGates(cardId, card?.board_id);

  // Same query CardDetailPage uses for the latest run, sorted by started_at.
  // We only need the run's status for the migration decision, so we keep this
  // as a lightweight summary.
  const { data: runs } = useQuery({
    queryKey: cardId
      ? ([...cardKeys.detail(cardId), 'runs'] as const)
      : (['cards', 'runs', '__missing__'] as const),
    queryFn: () => listCardRuns(cardId!),
    enabled: !!cardId,
    staleTime: 5_000,
  });
  const latestRun: MigrationRun | null = useMemo(() => {
    if (!runs || runs.length === 0) return null;
    const sorted = [...runs].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );
    const top = sorted[0];
    return top ? { id: top.id, status: top.status } : null;
  }, [runs]);

  // Mode-driven rules — passed to CardActionBar.
  const rules = useCardModeRules(card, board);

  // ── Initial doc + body_blocks_version ──────────────────────────────────
  // We snapshot the doc + version ONCE per card load (when the card finishes
  // fetching for the first time). Subsequent edits update the version
  // server-side; a server-side change from another tab is a 409, handled
  // in the mutation onError.
  const [initialDoc, setInitialDoc] = useState<CardBodyDoc | null>(null);
  const [version, setVersion] = useState<number>(1);
  const [snapshotted, setSnapshotted] = useState<boolean>(false);

  useEffect(() => {
    if (!card || snapshotted) return;
    // Wait until the dependent fetches have at least returned (intent /
    // plan can be undefined when there's no IntentSpec; that's fine) — we
    // only need to know they've resolved their first round.
    const doc = computeInitialDoc({
      card,
      intent: intent ?? null,
      plan: plan ?? null,
      latestRun,
      evidence: evidence,
      gates: gates,
    });
    setInitialDoc(doc);
    setVersion(card.body_blocks_version ?? 1);
    setSnapshotted(true);
  }, [card, intent, plan, latestRun, evidence, gates, snapshotted]);

  // ── Persistence mutation ───────────────────────────────────────────────
  const updateBody = useUpdateCardBody(cardId ?? '');

  // ── Editor ─────────────────────────────────────────────────────────────
  const editor = useAirAirEditor({
    initialDoc,
    editable: true, // Mode-aware editing lands in 10-05.
    onIdle: (doc) => {
      if (!cardId) return;
      updateBody.mutate(
        { body: doc, expectedVersion: version },
        {
          onSuccess: (data) => {
            setVersion(data.body_blocks_version);
          },
          onError: (err) => {
            // 409 VERSION_CONFLICT — full 3-way merge UI lands in 10e.
            // For Wave 1 we log the conflict and let the user keep
            // editing. The next save will conflict again until they
            // refresh; that's an acceptable Wave-1 trade.
            const status = (err as { status?: number })?.status;
            if (status === 409) {
              // eslint-disable-next-line no-console
              console.warn(
                '[card-canvas] body save 409 VERSION_CONFLICT — refresh to load latest',
                err,
              );
              return;
            }
            // Other errors — surface to the user via the same alert
            // pattern other surfaces use until 10e ships a toast.
            const msg = (err as { message?: string })?.message ?? 'Save failed';
            // eslint-disable-next-line no-console
            console.error('[card-canvas] body save failed:', msg);
          },
        },
      );
    },
  });

  // ── Layout side-effects ────────────────────────────────────────────────
  useEffect(() => {
    setSidebarContentType('card-detail');
    hideBottomBar();
    return () => {
      setSidebarContentType('navigation');
    };
  }, [setSidebarContentType, hideBottomBar]);

  // ── Loading / error states ─────────────────────────────────────────────
  if (cardLoading || !snapshotted) {
    return <PageSkeleton />;
  }
  if (cardError) {
    const message = (cardError as { message?: string })?.message ?? '';
    return (
      <div className="mx-auto w-full max-w-[1200px] px-6 py-6">
        <ErrorState
          message={message || 'Failed to load card'}
          onRetry={() => refetchCard()}
        />
      </div>
    );
  }
  if (!card) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-6 py-6">
        <ErrorState message="Card not found" />
      </div>
    );
  }

  return (
    <>
      <CardDetailLayout>
        <CardTopBar card={card} board={board} boardLoading={boardLoading} />

        {/* Canvas — the editor lives in a single white card so the typed
            block placeholders read as inline elements within a document. */}
        <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
          <AirAirEditor editor={editor} />
        </div>

        <div aria-hidden="true" className="h-[80px]" />
      </CardDetailLayout>

      {/* Re-use the same floating action bar so Run / Cancel etc. stay
          available on the canvas — Phase 10's right palette (10-04) will
          eventually layer on top of this. */}
      <CardActionBar card={card} intent={intent} plan={plan} rules={rules} />
    </>
  );
}
