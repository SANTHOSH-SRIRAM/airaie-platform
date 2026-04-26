import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TypedBlockPlaceholder } from '../typedBlockPlaceholder';
import type { TypedBlockType } from '@/types/cardBlocks';

// ---------------------------------------------------------------------------
// Typed governance block factory — stamps out 11 Tiptap Node definitions
// with shared structural rules:
//   - group: 'block' (top-level block content)
//   - atom: true     (the block is a single, indivisible unit; no inline
//                     editing inside the NodeView)
//   - selectable + draggable
//   - parseHTML matches `div[data-block-type="<name>"]` on import
//   - renderHTML emits the same data-block-type attribute on serialize
//   - addNodeView returns the shared TypedBlockPlaceholder until 10-02
//     swaps in the per-kind real component.
//
// Each block exposes a typed `attrs` shape (see cardBlocks.ts). The factory
// receives an `addAttributes` map describing per-attribute defaults.
//
// Wave 10-02 will replace the shared NodeView in three of these calls
// (intentBlock / inputBlock / resultBlock); the rest follow in 10-03+.
// ---------------------------------------------------------------------------

type AttrSchema = Record<string, { default: unknown }>;

function makeTypedBlockNode(name: TypedBlockType, attrs: AttrSchema) {
  return Node.create({
    name,
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
      return attrs;
    },

    parseHTML() {
      return [{ tag: `div[data-block-type="${name}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(HTMLAttributes, { 'data-block-type': name }),
      ];
    },

    addNodeView() {
      return ReactNodeViewRenderer(TypedBlockPlaceholder);
    },
  });
}

// ── 11 typed governance block Nodes ─────────────────────────────────────────

export const IntentBlockNode = makeTypedBlockNode('intentBlock', {
  intentSpecId: { default: null },
});

export const InputBlockNode = makeTypedBlockNode('inputBlock', {
  artifactId: { default: null },
  portName: { default: null },
});

export const KpiBlockNode = makeTypedBlockNode('kpiBlock', {
  metricKey: { default: '' },
  operator: { default: 'eq' }, // 'between' | 'less_than' | 'greater_than' | 'eq'
  threshold: { default: 0 }, // number | [number, number]
});

export const MethodBlockNode = makeTypedBlockNode('methodBlock', {
  planId: { default: null },
});

export const RunBlockNode = makeTypedBlockNode('runBlock', {});

export const ResultBlockNode = makeTypedBlockNode('resultBlock', {
  artifactId: { default: null },
});

export const EvidenceBlockNode = makeTypedBlockNode('evidenceBlock', {
  evidenceId: { default: null },
});

export const GateBlockNode = makeTypedBlockNode('gateBlock', {
  gateId: { default: null },
});

export const EmbedCardBlockNode = makeTypedBlockNode('embedCardBlock', {
  cardId: { default: null },
});

export const EmbedRecordBlockNode = makeTypedBlockNode('embedRecordBlock', {
  recordId: { default: null },
});

export const AiAssistBlockNode = makeTypedBlockNode('aiAssistBlock', {
  conversationId: { default: null },
});
