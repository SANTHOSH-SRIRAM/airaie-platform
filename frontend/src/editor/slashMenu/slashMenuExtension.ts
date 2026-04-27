import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import {
  getSlashMenuItems,
  docHasIntentBlock,
  type SlashMenuItem,
} from './getSlashMenuItems';
import { slashMenuStore } from './slashMenuStore';

// ---------------------------------------------------------------------------
// SlashMenu — a Tiptap Extension wrapping `@tiptap/suggestion`. Triggered
// by `/` at the start of an empty paragraph (configured via
// `startOfLine: true`). Forwards open/update/close events into
// slashMenuStore so the React popover (mounted as a sibling in
// AirAirEditor) can render the items list.
//
// Item insertion: `editor.commands.insertContentAt(range, { type, attrs })`.
// Default attrs:
//   - intentBlock → { intentSpecId: cardContext.intentSpecId ?? null }
//   - inputBlock  → { artifactId: null, portName: null }
//   - resultBlock → { artifactId: null }
// The user fills artifact bindings via the existing structured-page flow
// OR (later) via the Wave 10-04 drag-drop palette.
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
          return getSlashMenuItems(query, {
            docHasIntentBlock: docHasIntentBlock({
              content: (docJson.content ?? []).map((n: { type?: string }) => ({
                type: n.type ?? '',
              })),
            }),
          });
        },
        command: ({ editor, range, props }) => {
          const item = props as SlashMenuItem;
          const attrs = defaultAttrsFor(item.blockType, opts.cardContext);
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContentAt(range.from, { type: item.blockType, attrs })
            .run();
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
  blockType: SlashMenuItem['blockType'],
  ctx: { intentSpecId: string | null },
): Record<string, unknown> {
  switch (blockType) {
    case 'intentBlock':
      return { intentSpecId: ctx.intentSpecId };
    case 'inputBlock':
      return { artifactId: null, portName: null };
    case 'resultBlock':
      return { artifactId: null };
    default:
      return {};
  }
}
