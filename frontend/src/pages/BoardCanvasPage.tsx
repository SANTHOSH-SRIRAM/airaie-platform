// BoardCanvasPage — Tiptap canvas for Boards.
//
// Phase 10 / Plan 10-05b. Sibling of CardCanvasPage. Renders at /boards/:id
// (canvas is the default since 10-07-flip; ?legacy=1 reaches the structured
// tabs page in BoardDetailPage). Uses the Board-specific extension bundle.
//
// 10-07-cleanup made /boards/:boardId an AppShell-mounted route, so this
// page inherits the global Header / Sidebar / VerticalToolbar — we only
// render the in-page chrome (board top bar + canvas + optional bottom bar).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { ArrowLeft, MousePointer2, Plus, Shield } from 'lucide-react';

import { useBoard, useUpdateBoardBody } from '@hooks/useBoards';
import { useBoardModeRules } from '@hooks/useBoardModeRules';
import BoardCanvasPalette, {
  DROP_MIME,
  type DropPayload,
} from '@components/boards/BoardCanvasPalette';
import { useCardList } from '@hooks/useCards';
import { useUiStore } from '@store/uiStore';
import { cn } from '@utils/cn';
import PageSkeleton from '@components/ui/PageSkeleton';
import ErrorState from '@components/ui/ErrorState';
import CreateCardModal from '@components/boards/cards/CreateCardModal';

import { buildBoardEditorExtensions } from '@/editor/extensions/boardEditorExtensions';
import { generateDefaultBoardBody } from '@/editor/boardMigration';
import { scheduleIdleSave } from '@/editor/useAirAirEditor';
import { serializeDoc } from '@/editor/serialize';
import { BoardCanvasContext } from '@/editor/boardCanvasContext';
import { SlashMenuPopover } from '@/editor/slashMenu/SlashMenuPopover';
import { ConflictResolutionModal, type ConflictResolution } from '@/editor/ConflictResolutionModal';
import { ApiError } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { boardKeys } from '@hooks/useBoards';
import type { BoardBodyDoc } from '@/types/boardBlocks';
import type { CardBodyDoc } from '@/types/cardBlocks';

// ---------------------------------------------------------------------------
// computeInitialBoardDoc — pure helper. Picks the persisted body or the
// auto-migrated default. Exported for unit tests.
// ---------------------------------------------------------------------------

interface ComputeInitialBoardDocArgs {
  board: { name?: string; body_blocks?: unknown } | undefined;
}

export function computeInitialBoardDoc(
  args: ComputeInitialBoardDocArgs,
): BoardBodyDoc | null {
  const { board } = args;
  if (!board) return null;
  // Server has a doc — that's the source of truth.
  const persisted = board.body_blocks as BoardBodyDoc | null | undefined;
  if (persisted && persisted.type === 'doc') {
    return persisted;
  }
  // Auto-migrate from current entity state. (10-05b ships a thin default;
  // 10-05c will pull cards/gates/evidence to seed the rollups.)
  return generateDefaultBoardBody({ boardName: board.name });
}

// Status badge for the board top bar — same color tokens BoardDetailPage uses.
const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Complete: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  Running: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  Pending: { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
  Blocked: { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
  PASSED: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  PENDING: { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  BLOCKED: { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
  DRAFT: { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
};

function modeColor(mode: string | undefined): { bg: string; text: string } {
  if (mode === 'study') return { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' };
  if (mode === 'release') return { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' };
  return { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' };
}

export default function BoardCanvasPage() {
  // Route param is `boardId` (matches BoardDetailPage and the route
  // declaration in App.tsx). Earlier draft used `id` and got an empty
  // boardId → "Could not load board." chrome on smoke.
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);
  const { data: board, isLoading: boardLoading, error: boardError } = useBoard(boardId);
  const { data: cards = [] } = useCardList(boardId);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const updateBody = useUpdateBoardBody(boardId ?? '');
  const queryClient = useQueryClient();

  // Track the body_blocks_version seen by the editor. Bumped on each
  // successful save. 409 conflicts re-set it from the server.
  const [version, setVersion] = useState<number>(1);

  // 10-06 — conflict-resolution modal state. Set when the autosave PATCH
  // returns 409 VERSION_CONFLICT; cleared by the user picking a resolution.
  const [conflict, setConflict] = useState<{ currentVersion: number } | null>(null);

  // Task #20 — drag-drop palette state + mode rules for the drop handler.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const canvasModeRules = useBoardModeRules(board ?? undefined);

  // Snapshot the initialDoc + version once when the board first loads. We
  // don't want to rebuild the editor on every refetch.
  const [initialDoc, setInitialDoc] = useState<BoardBodyDoc | null>(null);
  useEffect(() => {
    if (!board || initialDoc) return;
    const doc = computeInitialBoardDoc({ board });
    if (doc) {
      setInitialDoc(doc);
      setVersion(typeof board.body_blocks_version === 'number' ? board.body_blocks_version : 1);
    }
  }, [board, initialDoc]);

  // Refs used inside the Tiptap onUpdate (which captures stale values
  // otherwise — same pattern as useAirAirEditor).
  const idleSaveRef = useRef<ReturnType<typeof scheduleIdleSave> | null>(null);
  const versionRef = useRef(version);
  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  // Set up the idle-save handler. Re-created when boardId changes so the
  // mutation closes over the right id.
  useEffect(() => {
    if (!boardId) return;
    const ctrl = scheduleIdleSave((doc) => {
      const expected = versionRef.current;
      // The doc shape passes through scheduleIdleSave as CardBodyDoc but
      // is structurally identical to BoardBodyDoc.
      updateBody.mutate(
        { body: doc as unknown as BoardBodyDoc, expectedVersion: expected },
        {
          onSuccess: (resp) => {
            setVersion(resp.body_blocks_version);
          },
          onError: (err) => {
            // 10-06 — surface 409 VERSION_CONFLICT via ConflictResolutionModal.
            if (err instanceof ApiError && err.status === 409) {
              const cur = (err.details?.current_version as number | undefined) ?? versionRef.current + 1;
              setConflict({ currentVersion: cur });
              return;
            }
            // eslint-disable-next-line no-console
            console.warn('Board body autosave failed', err);
          },
        },
      );
    });
    idleSaveRef.current = ctrl;
    return () => {
      ctrl.cancel();
    };
  }, [boardId, updateBody]);

  const extensions = useMemo(() => buildBoardEditorExtensions(), []);

  useEffect(() => {
    setSidebarContentType('board-detail');
    hideBottomBar();
    return () => {
      setSidebarContentType('navigation');
    };
  }, [hideBottomBar, setSidebarContentType]);

  const editor = useEditor(
    {
      extensions,
      content: initialDoc ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      editable: true,
      autofocus: false,
      onUpdate: ({ editor: ed }) => {
        // serializeDoc and scheduleIdleSave are typed against CardBodyDoc;
        // BoardBodyDoc is structurally identical (`{type:'doc', content}`).
        // Cast at the boundary — the runtime payload passes through unchanged.
        const json = ed.getJSON() as unknown as CardBodyDoc;
        const doc = serializeDoc(json);
        idleSaveRef.current?.schedule(doc);
      },
    },
    [initialDoc],
  );

  // Flush pending save on navigation away.
  useEffect(() => {
    const handler = () => {
      idleSaveRef.current?.flush();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // 10-06 — resolve a 409 conflict per user choice.
  const handleConflictResolve = (choice: ConflictResolution) => {
    if (!editor || !boardId) {
      setConflict(null);
      return;
    }
    if (choice === 'discard') {
      // Refetch the server doc + replace local state. The simplest path is
      // to invalidate the board query and reset the editor's content from
      // the refreshed `board.body_blocks`. We close the modal; React Query
      // refetch + the [initialDoc] dep on useEditor remount handles the rest.
      setInitialDoc(null);
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    } else if (choice === 'overwrite') {
      // Force-save with the server's current_version as expected_version.
      const cur = conflict?.currentVersion ?? versionRef.current;
      const json = editor.getJSON() as unknown as CardBodyDoc;
      const doc = serializeDoc(json);
      updateBody.mutate(
        { body: doc as unknown as BoardBodyDoc, expectedVersion: cur },
        {
          onSuccess: (resp) => setVersion(resp.body_blocks_version),
        },
      );
    } else if (choice === 'merge') {
      // Naive append-merge: bump the local version to the server's current
      // and re-save. The next autosave includes our local doc; if there are
      // no overlapping edits this lands cleanly. If overlap exists the user
      // hits the modal again and can choose discard/overwrite.
      const cur = conflict?.currentVersion ?? versionRef.current;
      setVersion(cur);
    }
    setConflict(null);
  };

  if (boardLoading) return <PageSkeleton />;
  if (boardError || !board) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-6 py-6">
        <ErrorState
          message={boardError instanceof Error ? boardError.message : 'Could not load board.'}
        />
      </div>
    );
  }

  const statusCfg = STATUS_BADGE_COLORS[board.status] ?? STATUS_BADGE_COLORS.DRAFT;
  const modeCfg = modeColor(board.mode);
  const modeLabel = board.mode
    ? board.mode.charAt(0).toUpperCase() + board.mode.slice(1)
    : '—';

  // Mode-aware drop gate. v1 mappings (per
  // .planning/research/board-canvas-drag-drop-2026-04-30.md):
  //   card → cardsGridBlock with attrs.filter = card.intent_type
  //   artifact → artifactPoolBlock (unfiltered for v1)
  // canAddBlocks is false in Study + Release → drop silently no-ops.
  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(DROP_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = canvasModeRules.canAddBlocks ? 'copy' : 'none';
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const raw = e.dataTransfer.getData(DROP_MIME);
    if (!raw) return;
    e.preventDefault();
    if (!editor || !canvasModeRules.canAddBlocks) return;
    let payload: DropPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const end = editor.state.doc.content.size;
    if (payload.kind === 'card') {
      editor
        .chain()
        .focus()
        .insertContentAt(end, {
          type: 'cardsGridBlock',
          attrs: { filter: payload.intentType ?? null },
        })
        .run();
    } else if (payload.kind === 'artifact') {
      editor
        .chain()
        .focus()
        .insertContentAt(end, {
          type: 'artifactPoolBlock',
        })
        .run();
    }
  };

  return (
    <BoardCanvasContext.Provider value={{ boardId: board.id, board }}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[12px] px-4 pb-12 pt-0">
        {/* ── Board section header pill ─────────────────────────────────
            Mirrors BoardsPage's "Governance Boards" pattern (image 6):
            icon + bold title + count badge on the left, action buttons
            on the right. Replaces the global header on detail pages. */}
        <section className="flex h-[52px] items-center gap-[12px] rounded-[12px] bg-white px-[16px] py-[8px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
          {/* Title group — back + identity + count */}
          <div className="flex min-w-0 flex-1 items-center gap-[8px]">
            <button
              type="button"
              onClick={() => navigate('/boards')}
              aria-label="Back to Boards"
              className="p-[6px] hover:bg-[#f0f0ec] rounded-[6px] transition-colors shrink-0"
            >
              <ArrowLeft size={16} className="text-[#1a1a1a]" />
            </button>
            <Shield size={20} className="text-[#ff9800] shrink-0" aria-hidden="true" />
            <h1
              className="text-[18px] font-bold tracking-tight text-[#1a1a1a] truncate max-w-[420px]"
              title={board.name}
            >
              {board.name}
            </h1>
            <span className="h-[22px] px-[10px] rounded-[8px] bg-[#f0f0ec] text-[11px] font-medium text-[#acacac] inline-flex items-center shrink-0">
              {cards.length} card{cards.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Spacer pushes badges + actions to the right */}
          {/* Mode + Status badges */}
          <div className="flex items-center gap-[6px] shrink-0">
            <span
              className={cn(
                'h-[22px] px-[10px] rounded-full text-[10px] font-medium inline-flex items-center capitalize',
                modeCfg.bg,
                modeCfg.text,
              )}
              title={`Board mode: ${modeLabel}`}
            >
              {modeLabel}
            </span>
            <span
              className={cn(
                'h-[22px] px-[10px] rounded-full text-[10px] font-medium inline-flex items-center',
                statusCfg.bg,
                statusCfg.text,
              )}
            >
              {board.status}
            </span>
          </div>

          {/* Drag-drop palette toggle — task #20 v1. */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="h-[36px] px-[12px] border border-[#1976d2]/30 bg-white hover:bg-[#1976d2]/[0.06] text-[#1976d2] rounded-[8px] text-[12px] font-semibold flex items-center gap-[6px] transition-colors shrink-0"
            title="Drag cards or artifacts onto the canvas"
          >
            <MousePointer2 size={14} strokeWidth={2.5} />
            Palette
          </button>

          {/* + New Card — primary CTA, mirrors "+ New Board" on the list page */}
          <button
            type="button"
            onClick={() => setShowCreateCard(true)}
            className="h-[36px] px-[14px] bg-[#ff9800] hover:bg-[#f57c00] text-white rounded-[8px] text-[12px] font-semibold flex items-center gap-[6px] transition-colors shadow-sm shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
            New Card
          </button>
        </section>

        {/* ── Canvas card ─────────────────────────────────────────────── */}
        <div
          className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] px-[24px] py-[20px]"
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <EditorContent
            editor={editor}
            className="min-h-[400px] prose-base text-[14px] leading-[1.6] text-[#1a1a1a] focus:outline-none [&_p]:my-[6px] [&_h1]:text-[28px] [&_h1]:font-semibold [&_h1]:mt-[8px] [&_h1]:mb-[8px] [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:mt-[12px] [&_h2]:mb-[6px]"
          />
          <SlashMenuPopover editor={editor} />
        </div>

        {/* Drag-drop palette — task #20 v1. Card → CardsGrid filtered;
            Artifact → ArtifactPool. Disabled in non-Explore modes. */}
        <BoardCanvasPalette
          open={paletteOpen}
          boardId={boardId}
          disabled={!canvasModeRules.canAddBlocks}
          disabledReason={canvasModeRules.lockReason}
          onClose={() => setPaletteOpen(false)}
        />

        {/* 10-06 — 3-way merge UI on 409 VERSION_CONFLICT. */}
        {conflict ? (
          <ConflictResolutionModal
            currentVersion={conflict.currentVersion}
            onResolve={handleConflictResolve}
            onDismiss={() => setConflict(null)}
          />
        ) : null}

        {/* + New Card modal — same one BoardDetailPage's legacy tabs use. */}
        {boardId && (
          <CreateCardModal
            boardId={boardId}
            isOpen={showCreateCard}
            onClose={() => setShowCreateCard(false)}
          />
        )}
      </div>
    </BoardCanvasContext.Provider>
  );
}
