import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import type { SlashMenuItem } from './getSlashMenuItems';
import { slashMenuStore } from './slashMenuStore';

// ---------------------------------------------------------------------------
// SlashMenuPopover — renders the floating menu. Subscribes to slashMenuStore
// (driven by the Tiptap suggestion plugin in slashMenuExtension.ts). When
// the store reports `open: true`, we render the items list at the cursor
// coordinates the plugin published.
//
// Wave 10-03 expands the popover to:
//   - thread all 3 cardinality flags (intent/method/run) into
//     getSlashMenuItems
//   - render two visual sections (Governance / Layout) with a thin divider
//
// Keyboard navigation continues to walk the flat `items[]` array (arrow
// up/down moves selection across the section break; Enter inserts the
// selected item; Escape closes). The visual grouping is purely a render
// concern — selection logic is unchanged.
// ---------------------------------------------------------------------------

interface SlashMenuPopoverProps {
  /** Editor prop kept for API stability; popover now reads items from the
   *  store (set by the active Tiptap suggestion plugin) so the same popover
   *  serves both Card and Board scopes. Phase 10 / Plan 10-05c-final. */
  editor?: Editor | null;
}

export function SlashMenuPopover(_props: SlashMenuPopoverProps = {}) {
  const state = useSyncExternalStore(
    slashMenuStore.subscribe,
    slashMenuStore.getState,
    slashMenuStore.getState,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: SlashMenuItem[] = state.items;

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

  const governance = items.filter((i) => i.group === 'governance');
  const layout = items.filter((i) => i.group === 'layout');

  const popover = (
    <div
      className="fixed z-[1000] min-w-[240px] rounded-[8px] border border-[#e8e8e8] bg-white shadow-[0px_4px_16px_0px_rgba(0,0,0,0.12)] p-[4px]"
      style={{ top: state.coords.top + 24, left: state.coords.left }}
      role="listbox"
      aria-label="Slash menu"
    >
      {governance.length > 0 ? (
        <>
          <div className="px-[8px] py-[4px] text-[9px] uppercase tracking-wide text-[#9b978f]">
            Governance
          </div>
          {governance.map((it) => {
            const i = items.indexOf(it);
            return renderItem(it, i, selectedIndex, setSelectedIndex, state.command);
          })}
        </>
      ) : null}
      {layout.length > 0 ? (
        <>
          {governance.length > 0 ? (
            <div className="my-[4px] border-t border-[#f0f0ec]" aria-hidden="true" />
          ) : null}
          <div className="px-[8px] py-[4px] text-[9px] uppercase tracking-wide text-[#9b978f]">
            Layout
          </div>
          {layout.map((it) => {
            const i = items.indexOf(it);
            return renderItem(it, i, selectedIndex, setSelectedIndex, state.command);
          })}
        </>
      ) : null}
    </div>
  );

  return createPortal(popover, document.body);
}

function renderItem(
  it: SlashMenuItem,
  i: number,
  selectedIndex: number,
  setSelectedIndex: (n: number) => void,
  command: (item: SlashMenuItem) => void,
) {
  return (
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
        command(it);
      }}
    >
      <span aria-hidden="true" className="w-[20px] text-center">{it.emoji}</span>
      <div className="flex-1">
        <div className="font-semibold text-[#1a1a1a]">{it.label}</div>
        <div className="text-[10px] text-[#6b6b6b]">{it.description}</div>
      </div>
    </button>
  );
}

// Note: per-extension item filtering now happens in the suggestion plugin
// (slashMenuExtension.ts / boardSlashMenuExtension.ts), which pushes the
// computed items into slashMenuStore on open/update. The popover reads
// state.items directly. This decoupling lets the same popover serve both
// Card and Board canvases without scope-aware logic in the UI layer.
