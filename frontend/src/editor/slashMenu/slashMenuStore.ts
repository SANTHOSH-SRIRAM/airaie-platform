import type { SlashMenuItem } from './getSlashMenuItems';

// ---------------------------------------------------------------------------
// slashMenuStore — tiny external store the React popover subscribes to via
// `useSyncExternalStore`. The Tiptap suggestion plugin (slashMenuExtension.ts)
// publishes lifecycle events into the store; the popover renders accordingly.
//
// We avoid coupling the popover to Tiptap directly so the popover can be
// unit-tested in isolation and the suggestion plugin stays a thin adapter.
// ---------------------------------------------------------------------------

export interface SlashMenuState {
  open: boolean;
  query: string;
  coords: { top: number; left: number };
  /** Inserts the selected item at the suggestion range. Set by the plugin's onStart. */
  command: (item: SlashMenuItem) => void;
  /** Filtered items list — pushed by the active extension on open/update. The
   *  popover renders these directly (no per-popover filter logic) so the same
   *  popover serves Card and Board scopes. Phase 10 / Plan 10-05c-final. */
  items: SlashMenuItem[];
}

const NOOP = () => {};

let state: SlashMenuState = {
  open: false,
  query: '',
  coords: { top: 0, left: 0 },
  command: NOOP,
  items: [],
};
const listeners = new Set<() => void>();
let keyHandler: ((key: string) => void) | null = null;

function emit() {
  listeners.forEach((l) => l());
}

export const slashMenuStore = {
  getState: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  open(
    query: string,
    coords: { top: number; left: number },
    command: SlashMenuState['command'],
    items: SlashMenuItem[] = [],
  ) {
    state = { open: true, query, coords, command, items };
    emit();
  },
  update(query: string, coords: { top: number; left: number }, items?: SlashMenuItem[]) {
    state = { ...state, query, coords, items: items ?? state.items };
    emit();
  },
  close() {
    state = { ...state, open: false, command: NOOP, items: [] };
    emit();
  },
  setKeyHandler(h: ((key: string) => void) | null) {
    keyHandler = h;
  },
  fireKey(key: string): boolean {
    if (keyHandler) {
      keyHandler(key);
      return true;
    }
    return false;
  },
};
