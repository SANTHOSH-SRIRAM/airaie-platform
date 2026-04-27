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
}

const NOOP = () => {};

let state: SlashMenuState = {
  open: false,
  query: '',
  coords: { top: 0, left: 0 },
  command: NOOP,
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
  ) {
    state = { open: true, query, coords, command };
    emit();
  },
  update(query: string, coords: { top: number; left: number }) {
    state = { ...state, query, coords };
    emit();
  },
  close() {
    state = { ...state, open: false, command: NOOP };
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
