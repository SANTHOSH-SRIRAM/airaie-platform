// Board canvas editor extension bundle — Phase 10 / Plan 10-05b.
//
// Mirror of `index.ts` (Card-canvas extensions) but with Board-specific
// typed-block nodes instead of Card-specific ones, AND no slash menu yet
// (slash-menu integration ships in 10-05c so it can render Board kinds).
//
// Includes:
//   - StarterKit (paragraph, heading, lists, blockquote, codeBlock,
//     horizontalRule, hardBreak, history, dropcursor, gapcursor, marks)
//   - Placeholder (empty top-level paragraphs)
//   - CalloutNode (shared with Card canvas)
//   - 5 Board-specific typed Nodes — CardsGridBlockNode mounts the real
//     CardsGridBlockView (10-05b); the other 4 use BoardBlockPlaceholder
//     until 10-05c.

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { CalloutNode } from './CalloutNode';
import { boardTypedBlockNodes } from './boardBlockNodes';
import { BoardSlashMenu } from '../slashMenu/boardSlashMenuExtension';

export function buildBoardEditorExtensions() {
  return [
    StarterKit.configure({}),

    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'paragraph') return 'Type / for commands…';
        return '';
      },
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
    }),

    CalloutNode,

    ...boardTypedBlockNodes,

    // Phase 10 / Plan 10-05c-final — Board-scoped slash menu. Reuses the
    // shared SlashMenuPopover via slashMenuStore; surfaces 5 Board kinds
    // + 5 layout kinds.
    BoardSlashMenu,
  ];
}
