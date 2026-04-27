import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import {
  getSlashMenuItems,
  docHasIntentBlock,
  docHasMethodBlock,
  docHasRunBlock,
  type SlashMenuItem,
  type LayoutCommand,
} from './getSlashMenuItems';
import { slashMenuStore } from './slashMenuStore';
import type { TypedBlockType } from '@/types/cardBlocks';

// ---------------------------------------------------------------------------
// SlashMenu — a Tiptap Extension wrapping `@tiptap/suggestion`. Triggered
// by `/` at the start of an empty paragraph (configured via
// `startOfLine: true`). Forwards open/update/close events into
// slashMenuStore so the React popover (mounted as a sibling in
// AirAirEditor) can render the items list.
//
// Item insertion: `editor.commands.insertContentAt(range, { type, attrs })`
// for typed kinds, OR a Tiptap chain (toggleHeading, toggleBulletList,
// setHorizontalRule, …) for layout kinds. Default attrs for typed blocks
// match the schema defaults declared in extensions/typedBlockNodes.ts;
// the user fills artifact bindings via the existing structured-page flow
// (Phase 8) until the Wave 10-04 inline pickers ship.
// ---------------------------------------------------------------------------

export interface SlashMenuOptions {
  /**
   * Card context threaded from useAirAirEditor → extension config. Used to
   * default `intentBlock.intentSpecId` when the user inserts an Intent.
   * `null` for both fields means: insert with all-null attrs (the user
   * binds via the structured page in this wave).
   */
  cardContext: { intentSpecId: string | null };
}

export const SlashMenuPluginKey = new PluginKey('slashMenu');

export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',

  addOptions() {
    return { cardContext: { intentSpecId: null } };
  },

  addProseMirrorPlugins() {
    const opts = this.options;
    return [
      Suggestion<SlashMenuItem>({
        editor: this.editor,
        char: '/',
        pluginKey: SlashMenuPluginKey,
        startOfLine: true,
        allowSpaces: false,
        items: ({ query }) => {
          const docJson = this.editor.getJSON();
          const docLike = {
            content: (docJson.content ?? []).map((n: { type?: string }) => ({
              type: n.type ?? '',
            })),
          };
          return getSlashMenuItems(query, {
            docHasIntentBlock: docHasIntentBlock(docLike),
            docHasMethodBlock: docHasMethodBlock(docLike),
            docHasRunBlock: docHasRunBlock(docLike),
          });
        },
        command: ({ editor, range, props }) => {
          const item = props as SlashMenuItem;
          // Always remove the slash + query first so the inserted block
          // (or layout transform) replaces the trigger text.
          editor.chain().focus().deleteRange(range).run();
          if (item.kind === 'typed') {
            const attrs = defaultAttrsFor(item.blockType, opts.cardContext);
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
              (it) => props.command(it),
            );
          },
          onUpdate: (props) => {
            const rect = props.clientRect?.();
            slashMenuStore.update(props.query, {
              top: rect?.top ?? 0,
              left: rect?.left ?? 0,
            });
          },
          onKeyDown: (props) => {
            const handled = slashMenuStore.fireKey(props.event.key);
            // Suppress arrow / enter / escape when the popover handled them.
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

function defaultAttrsFor(
  blockType: TypedBlockType,
  ctx: { intentSpecId: string | null },
): Record<string, unknown> {
  switch (blockType) {
    case 'intentBlock':
      return { intentSpecId: ctx.intentSpecId };
    case 'inputBlock':
      return { artifactId: null, portName: null };
    case 'kpiBlock':
      return { metricKey: '', operator: 'eq', threshold: 0 };
    case 'methodBlock':
      return { planId: null };
    case 'runBlock':
      return {};
    case 'resultBlock':
      return { artifactId: null };
    case 'evidenceBlock':
      return { evidenceId: null };
    case 'gateBlock':
      return { gateId: null };
    case 'embedCardBlock':
      return { cardId: null };
    case 'embedRecordBlock':
      return { recordId: null };
    case 'aiAssistBlock':
      return { conversationId: null };
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
