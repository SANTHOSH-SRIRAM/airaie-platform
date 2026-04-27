import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import {
  getBoardSlashMenuItems,
  asGenericSlashMenuItems,
  type BoardSlashMenuItem,
} from './getBoardSlashMenuItems';
import type { LayoutCommand } from './getSlashMenuItems';
import { slashMenuStore } from './slashMenuStore';
import type { BoardBlockType } from '@/types/boardBlocks';

// ---------------------------------------------------------------------------
// BoardSlashMenu — Phase 10 / Plan 10-05c-final.
//
// Mirror of Card-side `SlashMenu` in slashMenuExtension.ts, but for the
// Board canvas. Same `/`-trigger / startOfLine / store-bridge contract;
// items are the 5 Board-typed kinds + 5 layout kinds (no cardinality
// filtering — Board blocks are 0..N).
//
// The popover renders both Card and Board scopes via the shared
// slashMenuStore — the Suggestion plugin's `items` callback is the only
// scope-aware piece here.
// ---------------------------------------------------------------------------

export const BoardSlashMenuPluginKey = new PluginKey('boardSlashMenu');

export const BoardSlashMenu = Extension.create({
  name: 'boardSlashMenu',

  addProseMirrorPlugins() {
    return [
      Suggestion<BoardSlashMenuItem>({
        editor: this.editor,
        char: '/',
        pluginKey: BoardSlashMenuPluginKey,
        startOfLine: true,
        allowSpaces: false,
        items: ({ query }) => {
          const filtered = getBoardSlashMenuItems(query);
          // Push into store on every keystroke so the popover stays in sync.
          if (slashMenuStore.getState().open) {
            slashMenuStore.update(
              query,
              slashMenuStore.getState().coords,
              asGenericSlashMenuItems(filtered),
            );
          }
          return filtered;
        },
        command: ({ editor, range, props }) => {
          const item = props as BoardSlashMenuItem;
          editor.chain().focus().deleteRange(range).run();
          if (item.kind === 'board-typed') {
            const attrs = defaultAttrsFor(item.blockType);
            editor
              .chain()
              .focus()
              .insertContentAt(range.from, { type: item.blockType, attrs })
              .run();
          } else {
            applyLayoutCommand(editor, item.layout);
          }
          slashMenuStore.close();
        },
        render: () => ({
          onStart: (props) => {
            const rect = props.clientRect?.();
            slashMenuStore.open(
              props.query,
              { top: rect?.top ?? 0, left: rect?.left ?? 0 },
              (it) => props.command(it as BoardSlashMenuItem),
              asGenericSlashMenuItems(props.items),
            );
          },
          onUpdate: (props) => {
            const rect = props.clientRect?.();
            slashMenuStore.update(
              props.query,
              { top: rect?.top ?? 0, left: rect?.left ?? 0 },
              asGenericSlashMenuItems(props.items),
            );
          },
          onKeyDown: (props) => {
            const handled = slashMenuStore.fireKey(props.event.key);
            if (
              handled &&
              (props.event.key === 'ArrowUp' ||
                props.event.key === 'ArrowDown' ||
                props.event.key === 'Enter' ||
                props.event.key === 'Escape')
            ) {
              return true;
            }
            return false;
          },
          onExit: () => {
            slashMenuStore.close();
          },
        }),
      }),
    ];
  },
});

function defaultAttrsFor(blockType: BoardBlockType): Record<string, unknown> {
  switch (blockType) {
    case 'cardsGridBlock':
      return { filter: null };
    case 'cardsGraphBlock':
    case 'gatesRollupBlock':
    case 'evidenceRollupBlock':
    case 'artifactPoolBlock':
      return {};
    default:
      return {};
  }
}

function applyLayoutCommand(editor: Editor, layout: LayoutCommand) {
  switch (layout) {
    case 'heading-1':
      editor.chain().focus().toggleHeading({ level: 1 }).run();
      break;
    case 'heading-2':
      editor.chain().focus().toggleHeading({ level: 2 }).run();
      break;
    case 'bullet-list':
      editor.chain().focus().toggleBulletList().run();
      break;
    case 'code-block':
      editor.chain().focus().toggleCodeBlock().run();
      break;
    case 'divider':
      editor.chain().focus().setHorizontalRule().run();
      break;
  }
}
