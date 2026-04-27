import { createContext, useContext } from 'react';
import type { Board } from '@/types/board';

// ---------------------------------------------------------------------------
// BoardCanvasContext — Phase 10 / Plan 10-05 sibling of CardCanvasContext.
//
// Threaded by `BoardCanvasPage` so Board-specific NodeViews (CardsGridBlockView
// et al.) can scope their data fetches to the active board without each
// NodeView re-fetching what the page already has.
//
// Wave 10-05b ships the minimum viable shape (`{ boardId, board }`). 10-05c
// will widen to thread `cards / gates / artifacts / evidence` once the
// rollup NodeViews land — same n+1-avoidance discipline as cardCanvasContext.
// ---------------------------------------------------------------------------

export interface BoardCanvasContextValue {
  /** Active board id. `null` when mounted outside `<BoardCanvasPage>`. */
  boardId: string | null;
  /** The full Board entity. `null` while loading or outside Provider. */
  board: Board | null;
}

const DEFAULT: BoardCanvasContextValue = {
  boardId: null,
  board: null,
};

export const BoardCanvasContext = createContext<BoardCanvasContextValue>(DEFAULT);

/** Read the active Board canvas context; returns DEFAULT outside Provider. */
export function useBoardCanvasContext(): BoardCanvasContextValue {
  return useContext(BoardCanvasContext);
}
