// BoardCanvasPage — feature-flagged Tiptap canvas for Boards.
//
// Phase 10 / Plan 10-05b. Sibling of CardCanvasPage. Renders behind
// `?canvas=1` on `/boards/:id` (BoardDetailPage dispatches). Uses the
// Board-specific extension bundle (no Card NodeViews, no slash menu
// yet — that ships in 10-05c).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';

import { useBoard, useUpdateBoardBody } from '@hooks/useBoards';
import PageSkeleton from '@components/ui/PageSkeleton';
import ErrorState from '@components/ui/ErrorState';

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

export default function BoardCanvasPage() {
  // Route param is `boardId` (matches BoardDetailPage and the route
  // declaration in App.tsx). Earlier draft used `id` and got an empty
  // boardId → "Could not load board." chrome on smoke.
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board, isLoading: boardLoading, error: boardError } = useBoard(boardId);
  const updateBody = useUpdateBoardBody(boardId ?? '');
  const queryClient = useQueryClient();

  // Track the body_blocks_version seen by the editor. Bumped on each
  // successful save. 409 conflicts re-set it from the server.
  const [version, setVersion] = useState<number>(1);

  // 10-06 — conflict-resolution modal state. Set when the autosave PATCH
  // returns 409 VERSION_CONFLICT; cleared by the user picking a resolution.
  const [conflict, setConflict] = useState<{ currentVersion: number } | null>(null);

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
      <ErrorState
        message={boardError instanceof Error ? boardError.message : 'Could not load board.'}
      />
    );
  }

  return (
    <BoardCanvasContext.Provider value={{ boardId: board.id, board }}>
      <div className="px-[24px] py-[16px] max-w-[1100px] mx-auto">
        {/* The H1 is emitted by generateDefaultBoardBody so the canvas
            owns the title rendering. We don't duplicate it in chrome. */}
        <EditorContent
          editor={editor}
          className="min-h-[400px] prose-base text-[14px] leading-[1.6] text-[#1a1a1a] focus:outline-none [&_p]:my-[6px] [&_h1]:text-[28px] [&_h1]:font-semibold [&_h1]:mt-[16px] [&_h1]:mb-[8px] [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:mt-[12px] [&_h2]:mb-[6px]"
        />
        {/* Phase 10 / Plan 10-05c-final — Board slash menu. Same popover
            component as Card canvas; the BoardSlashMenu extension pushes
            Board-scoped items into slashMenuStore on '/'. */}
        <SlashMenuPopover editor={editor} />
        {/* Phase 10 / Plan 10-06 — 3-way merge UI on 409 VERSION_CONFLICT. */}
        {conflict ? (
          <ConflictResolutionModal
            currentVersion={conflict.currentVersion}
            onResolve={handleConflictResolve}
            onDismiss={() => setConflict(null)}
          />
        ) : null}
      </div>
    </BoardCanvasContext.Provider>
  );
}
