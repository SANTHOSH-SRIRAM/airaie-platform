// useAirAirEditor — the React hook that wraps `@tiptap/react`'s `useEditor`
// with our extension bundle, debounced idle save, and a beforeunload flush.
//
// Each consuming surface (CardCanvasPage in 10-01, BoardCanvasPage in 10-04)
// instantiates its own editor; the hook is intentionally *not* a singleton.
// React Query cache + the kernel's body_blocks_version field keep cross-tab
// state consistent.

import { useEditor, type Editor } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { buildAirAirExtensions } from './extensions';
import { serializeDoc } from './serialize';
import type { CardBodyDoc } from '@/types/cardBlocks';

export interface UseAirAirEditorOptions {
  /** Initial Tiptap document. `null` while the page is computing the
   *  auto-migration — the hook returns `null` for the editor until the
   *  parent supplies a doc. */
  initialDoc: CardBodyDoc | null;

  /** When false, the editor is read-only (e.g. Release-mode locks in 10-05). */
  editable?: boolean;

  /** Fired immediately on every change. Cheap; do not call expensive ops. */
  onChange?: (doc: CardBodyDoc) => void;

  /** Fired 1500ms after the last change — the autosave trigger. The page is
   *  expected to mutate `PATCH /v0/cards/:id/body` from this callback. */
  onIdle?: (doc: CardBodyDoc) => void;

  /**
   * Card context threaded into extensions (currently used by SlashMenu
   * to default `intentBlock.intentSpecId`). When omitted, defaults to
   * `{ intentSpecId: null }` — the inserted intentBlock will be empty
   * and the user fills it via the structured page.
   */
  cardContext?: { intentSpecId: string | null };
}

export const IDLE_DEBOUNCE_MS = 1500;

// ---------------------------------------------------------------------------
// scheduleIdleSave — the load-bearing debounce primitive. Extracted so the
// timing semantics are unit-testable in env=node without spinning up a real
// Tiptap editor (Tiptap requires a real DOM). The hook below uses this
// helper internally; tests cover it directly.
//
// Returns a `{ schedule, cancel, flush }` triple:
//   - schedule(doc): start (or restart) the 1500ms timer with the latest doc.
//   - cancel():      drop the pending save without calling onIdle.
//   - flush():       invoke onIdle synchronously with the most recently
//                    scheduled doc (no-op if nothing pending). beforeunload
//                    handlers want this so the user's last keystroke isn't
//                    lost on navigation.
// ---------------------------------------------------------------------------
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

export function useAirAirEditor(opts: UseAirAirEditorOptions): Editor | null {
  const { initialDoc, editable = true, onChange, onIdle, cardContext } = opts;

  // Stash the latest callbacks in refs so the editor's onUpdate closure
  // doesn't capture stale references between renders.
  const onChangeRef = useRef(onChange);
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onChangeRef.current = onChange;
    onIdleRef.current = onIdle;
  }, [onChange, onIdle]);

  // The idle-save controller is stable for the lifetime of the page; the
  // ref dance above keeps the user's latest onIdle reachable.
  const idleSaveRef = useRef<IdleSaveControl | null>(null);
  if (idleSaveRef.current === null) {
    idleSaveRef.current = scheduleIdleSave((doc) => {
      onIdleRef.current?.(doc);
    });
  }

  const editor = useEditor(
    {
      extensions: buildAirAirExtensions({ cardContext }),
      content: initialDoc ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      editable,
      autofocus: false,
      onUpdate: ({ editor }) => {
        const doc = serializeDoc(editor.getJSON() as unknown as CardBodyDoc);
        onChangeRef.current?.(doc);
        idleSaveRef.current?.schedule(doc);
      },
    },
    // Re-create the editor only when the *identity* of `initialDoc` flips
    // (e.g. when auto-migration computes the first doc, or the user reloads
    // the page after a 409 conflict) OR when the bound IntentSpec changes
    // so the SlashMenu default attrs reflect the new card context. Both
    // are rare; in-line edits don't trigger a re-instantiation.
    [initialDoc, cardContext?.intentSpecId],
  );

  // Sync editable flag — recreating the editor isn't needed for this.
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // beforeunload — flush pending save synchronously so an in-flight idle
  // timer doesn't lose the user's last keystroke when they navigate away.
  useEffect(() => {
    function flushHandler() {
      idleSaveRef.current?.flush();
    }
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', flushHandler);
    return () => {
      flushHandler();
      window.removeEventListener('beforeunload', flushHandler);
    };
  }, []);

  return editor;
}
