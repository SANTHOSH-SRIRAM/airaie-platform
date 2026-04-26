// AirAIE editor extension bundle — Phase 10 / Plan 10-01.
//
// Exposes a single `airAirExtensions` array consumed by `useAirAirEditor`.
// Includes:
//   - StarterKit (paragraph, heading, lists, blockquote, codeBlock,
//     horizontalRule, hardBreak, history, dropcursor, gapcursor, marks)
//   - Placeholder (only on empty top-level paragraphs — for the "Type / for
//     commands…" prompt; the slash menu itself ships in 10-02)
//   - CalloutNode (custom info/warning/success block)
//   - 11 typed governance block Nodes that all share the placeholder NodeView
//     until 10-02 swaps in real components.

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { CalloutNode } from './CalloutNode';
import {
  IntentBlockNode,
  InputBlockNode,
  KpiBlockNode,
  MethodBlockNode,
  RunBlockNode,
  ResultBlockNode,
  EvidenceBlockNode,
  GateBlockNode,
  EmbedCardBlockNode,
  EmbedRecordBlockNode,
  AiAssistBlockNode,
} from './typedBlockNodes';

export const airAirExtensions = [
  StarterKit.configure({
    // StarterKit defaults are good for Wave 1; finer-grained config (e.g.,
    // disabling `codeBlock` once we ship a custom one) is a 10-04 follow-up.
  }),

  Placeholder.configure({
    // Only show the prompt on a single empty paragraph at the top level — the
    // slash-menu itself ships in 10-02; the prompt copy is forward-looking.
    placeholder: ({ node }) => {
      if (node.type.name === 'paragraph') return 'Type / for commands…';
      return '';
    },
    showOnlyWhenEditable: true,
    showOnlyCurrent: true,
  }),

  CalloutNode,

  IntentBlockNode,
  InputBlockNode,
  KpiBlockNode,
  MethodBlockNode,
  RunBlockNode,
  ResultBlockNode,
  EvidenceBlockNode,
  GateBlockNode,
  EmbedCardBlockNode,
  EmbedRecordBlockNode,
  AiAssistBlockNode,
];
