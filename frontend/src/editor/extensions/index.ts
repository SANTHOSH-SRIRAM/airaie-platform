// AirAIE editor extension bundle — Phase 10 / Plans 10-01 + 10-02.
//
// Exposes a `buildAirAirExtensions(opts)` factory consumed by
// `useAirAirEditor`, plus a backwards-compatible `airAirExtensions` default.
//
// Includes:
//   - StarterKit (paragraph, heading, lists, blockquote, codeBlock,
//     horizontalRule, hardBreak, history, dropcursor, gapcursor, marks)
//   - Placeholder (only on empty top-level paragraphs — for the "Type / for
//     commands…" prompt)
//   - CalloutNode (custom info/warning/success block)
//   - 11 typed governance block Nodes — IntentBlockNode, InputBlockNode,
//     ResultBlockNode mount their real Wave 10-02 NodeViews; the other 8
//     keep TypedBlockPlaceholder until 10-03+
//   - SlashMenu — wraps @tiptap/suggestion to surface the 3-item Wave 10-02
//     slash menu on `/` at start of an empty paragraph

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
import { SlashMenu } from '../slashMenu/slashMenuExtension';

export interface AirAirExtensionsOptions {
  /**
   * Threaded into the SlashMenu extension; used to default
   * `intentBlock.intentSpecId` when the user inserts an Intent via `/`.
   */
  cardContext?: { intentSpecId: string | null };
}

export function buildAirAirExtensions(opts: AirAirExtensionsOptions = {}) {
  return [
    StarterKit.configure({
      // StarterKit defaults are good; finer-grained config (e.g.,
      // disabling `codeBlock` once we ship a custom one) is a 10-04 follow-up.
    }),

    Placeholder.configure({
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

    SlashMenu.configure({
      cardContext: opts.cardContext ?? { intentSpecId: null },
    }),
  ];
}

/**
 * Backwards-compatible default — used by callers that don't yet pass a
 * cardContext. SlashMenu's intentBlock insertion will default
 * `intentSpecId: null`. Keep this export so existing imports still resolve.
 */
export const airAirExtensions = buildAirAirExtensions();
