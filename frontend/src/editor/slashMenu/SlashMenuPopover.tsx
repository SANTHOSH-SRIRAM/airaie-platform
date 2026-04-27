import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import {
  getSlashMenuItems,
  docHasIntentBlock,
  type SlashMenuItem,
} from './getSlashMenuItems';
import { slashMenuStore, type SlashMenuState } from './slashMenuStore';

// ---------------------------------------------------------------------------
// SlashMenuPopover — renders the floating menu. Subscribes to slashMenuStore
// (driven by the Tiptap suggestion plugin in slashMenuExtension.ts). When
// the store reports `open: true`, we render the items list at the cursor
// coordinates the plugin published.
//
// Keyboard: arrow up/down moves selection; Enter inserts selected; Escape
// closes. The plugin's onKeyDown forwards events to us via the store.
// ---------------------------------------------------------------------------

interface SlashMenuPopoverProps {
  editor: Editor | null;
}

export function SlashMenuPopover({ editor }: SlashMenuPopoverProps) {
  const state = useSyncExternalStore(
    slashMenuStore.subscribe,
    slashMenuStore.getState,
    slashMenuStore.getState,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = computeItems(state, editor);

  // Reset selection when the items list shrinks below the index.
  useEffect(() => {
    if (selectedIndex >= items.length) setSelectedIndex(Math.max(0, items.length - 1));
  }, [items.length, selectedIndex]);

  // Forward keyboard from the plugin's onKeyDown into selection movement.
  useEffect(() => {
    if (!state.open) return;
    const handler = (key: string) => {
      if (key === 'ArrowDown')
        setSelectedIndex((i) => (i + 1) % Math.max(items.length, 1));
      else if (key === 'ArrowUp')
        setSelectedIndex(
          (i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1),
        );
      else if (key === 'Enter') {
        const item = items[selectedIndex];
        if (item) state.command(item);
      } else if (key === 'Escape') {
        slashMenuStore.close();
      }
    };
    slashMenuStore.setKeyHandler(handler);
    return () => slashMenuStore.setKeyHandler(null);
  }, [state, items, selectedIndex]);

  if (!state.open || items.length === 0) return null;

  const popover = (
    <div
      className="fixed z-[1000] min-w-[240px] rounded-[8px] border border-[#e8e8e8] bg-white shadow-[0px_4px_16px_0px_rgba(0,0,0,0.12)] p-[4px]"
      style={{ top: state.coords.top + 24, left: state.coords.left }}
      role="listbox"
      aria-label="Slash menu"
    >
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          role="option"
          aria-selected={i === selectedIndex}
          className={
            'w-full text-left flex items-center gap-[8px] px-[8px] py-[6px] rounded-[6px] text-[12px] ' +
            (i === selectedIndex ? 'bg-[#f0f0ec]' : 'hover:bg-[#fafafa]')
          }
          onMouseEnter={() => setSelectedIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            state.command(it);
          }}
        >
          <span aria-hidden="true">{it.emoji}</span>
          <div className="flex-1">
            <div className="font-semibold text-[#1a1a1a]">{it.label}</div>
            <div className="text-[10px] text-[#6b6b6b]">{it.description}</div>
          </div>
        </button>
      ))}
    </div>
  );

  return createPortal(popover, document.body);
}

function computeItems(state: SlashMenuState, editor: Editor | null): SlashMenuItem[] {
  if (!editor) return [];
  const docJson = editor.getJSON();
  return getSlashMenuItems(state.query, {
    docHasIntentBlock: docHasIntentBlock({
      content: (docJson.content ?? []).map((n: { type?: string }) => ({
        type: n.type ?? '',
      })),
    }),
  });
}
