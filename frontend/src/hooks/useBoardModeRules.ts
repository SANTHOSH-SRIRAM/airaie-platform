import type { Board, BoardMode } from '@/types/board';

/**
 * Mode-aware affordances for the BOARD canvas surface (Phase 10 polish, #16).
 *
 * Sister hook to `useCardModeRules`. Boards roll up many cards; their mode
 * locks govern which board-scope blocks (CardsGrid / CardsGraph /
 * GatesRollup / EvidenceRollup / ArtifactPool) the user can edit/reorder
 * and which board-level actions surface in chrome.
 *
 * Rules summary (mirrors `useCardModeRules` but board-scoped):
 *   Explore  → all blocks editable, can drag-drop palette, can add new
 *              blocks via slash menu, can reorder.
 *   Study    → blocks locked for content (no slash menu inserts, no
 *              palette drops), but selection + viewing still allowed.
 *   Release  → fully locked; canvas is read-only governance evidence.
 */
export interface BoardModeRules {
  mode: BoardMode;
  /** Whether the slash menu / palette can insert new blocks. */
  canAddBlocks: boolean;
  /** Whether existing block content (attrs, inner text) is editable. */
  canEditBlocks: boolean;
  /** Whether blocks can be reordered or removed. */
  canReorderBlocks: boolean;
  /** Whether dropping artifacts onto the canvas (drag-drop palette) is allowed. */
  canDropArtifacts: boolean;
  /** Tooltip copy explaining why an action is locked, when relevant. */
  lockReason: string | null;
}

export function useBoardModeRules(board: Board | undefined): BoardModeRules {
  const mode = (board?.mode ?? 'explore') as BoardMode;
  const explore = mode === 'explore';
  const release = mode === 'release';
  return {
    mode,
    canAddBlocks: explore,
    canEditBlocks: explore,
    canReorderBlocks: explore,
    canDropArtifacts: explore,
    lockReason: explore
      ? null
      : release
        ? 'Board is in Release mode — content is locked for governance.'
        : 'Board is in Study mode — escalate back to Explore to edit.',
  };
}
