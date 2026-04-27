import { createContext, useContext } from 'react';

export interface CardCanvasContextValue {
  cardId: string | null;
  boardId: string | null;
  intentSpecId: string | null;
}

const DEFAULT: CardCanvasContextValue = {
  cardId: null,
  boardId: null,
  intentSpecId: null,
};

export const CardCanvasContext = createContext<CardCanvasContextValue>(DEFAULT);

/**
 * Read the current Card's canvas context. When called outside a
 * `<CardCanvasContext.Provider>`, returns the default
 * `{ cardId: null, boardId: null, intentSpecId: null }` so NodeViews degrade
 * gracefully (no card → no intent → kind-only renderer pick).
 */
export function useCardCanvasContext(): CardCanvasContextValue {
  return useContext(CardCanvasContext);
}
