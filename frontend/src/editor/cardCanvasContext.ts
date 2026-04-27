import { createContext, useContext } from 'react';
import type { Card } from '@/types/card';
import type { IntentSpec } from '@/types/intent';
import type { ExecutionPlan } from '@/types/plan';

// ---------------------------------------------------------------------------
// CardCanvasContext — Wave 10-03 widens the value to include the bound
// Card / IntentSpec / ExecutionPlan objects so the new RunBlockView and
// MethodBlockView can call `useCardRunState(card, intent, plan)` without
// each NodeView re-fetching what the page has already fetched.
//
// The thin Wave-10-02 value (cardId / boardId / intentSpecId) is preserved
// so existing consumers (ResultBlockView reading `intentSpecId` to scope
// pickRenderer) keep working unchanged.
// ---------------------------------------------------------------------------

export interface CardCanvasContextValue {
  /** Wave 10-02 fields — preserved verbatim for ResultBlockView et al. */
  cardId: string | null;
  boardId: string | null;
  intentSpecId: string | null;

  /**
   * Wave 10-03 — the bound entities themselves, populated by CardCanvasPage
   * from its existing useCard / useIntent / usePlan query data. NodeViews
   * read these instead of calling their own hooks (single source of truth,
   * no n+1 fetches when 3 NodeViews each need the same Card).
   *
   * `card: null` means: no Card context (NodeView mounted outside the
   * Provider — degrade gracefully). When `card === null`, `intent` and
   * `plan` are also nullish.
   */
  card: Card | null;
  intent: IntentSpec | undefined;
  plan: ExecutionPlan | null | undefined;
}

const DEFAULT: CardCanvasContextValue = {
  cardId: null,
  boardId: null,
  intentSpecId: null,
  card: null,
  intent: undefined,
  plan: null,
};

export const CardCanvasContext = createContext<CardCanvasContextValue>(DEFAULT);

/**
 * Read the current Card's canvas context. When called outside a
 * `<CardCanvasContext.Provider>`, returns the default — NodeViews degrade
 * gracefully (no card → no intent → render empty / unavailable chrome
 * rather than crash).
 */
export function useCardCanvasContext(): CardCanvasContextValue {
  return useContext(CardCanvasContext);
}
