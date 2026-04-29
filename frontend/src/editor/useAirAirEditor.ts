// Idle-save debounce primitive — extracted from the (now-removed) Card
// Tiptap canvas. The Board canvas still uses this to schedule body
// persistence after the user stops typing.
//
// Returns `{ schedule, cancel, flush }`. Schedule restarts the timer with
// the latest doc; cancel drops a pending save; flush invokes onIdle now.
//
// Scoped to env=node tests — no React, no Tiptap. The previous
// `useAirAirEditor` hook + `AirAirEditor` React component were removed
// when CardCanvasPage was replaced by the static CardPhase11Page.

import type { CardBodyDoc } from '@/types/cardBlocks';

export const IDLE_DEBOUNCE_MS = 1500;

export interface IdleSaveControl {
  schedule: (doc: CardBodyDoc) => void;
  cancel: () => void;
  flush: () => void;
}

export function scheduleIdleSave(
  onIdle: (doc: CardBodyDoc) => void,
  delayMs: number = IDLE_DEBOUNCE_MS,
): IdleSaveControl {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastDoc: CardBodyDoc | null = null;

  return {
    schedule(doc) {
      lastDoc = doc;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (lastDoc) onIdle(lastDoc);
        lastDoc = null;
      }, delayMs);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastDoc = null;
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (lastDoc) {
        onIdle(lastDoc);
        lastDoc = null;
      }
    },
  };
}
