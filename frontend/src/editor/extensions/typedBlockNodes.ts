import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import type { ComponentType } from 'react';
import { TypedBlockPlaceholder } from '../typedBlockPlaceholder';
import { IntentBlockView } from '../nodeViews/IntentBlockView';
import { InputBlockView } from '../nodeViews/InputBlockView';
import { ResultBlockView } from '../nodeViews/ResultBlockView';
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
//   - addNodeView returns the per-Node component (passed in as the optional
//     3rd arg). When omitted, falls back to TypedBlockPlaceholder so the
//     block kinds without a real NodeView yet still render.
//
// Each block exposes a typed `attrs` shape (see cardBlocks.ts). The factory
// receives an `addAttributes` map describing per-attribute defaults.
//
// Wave 10-02 wires real NodeViews for intentBlock / inputBlock / resultBlock;
// the remaining 8 typed blocks continue to use TypedBlockPlaceholder until
// 10-03+ ships their components.
// ---------------------------------------------------------------------------

type AttrSchema = Record<string, { default: unknown }>;

// The factory's optional `nodeView` argument matches the type
// `ReactNodeViewRenderer` expects. NodeView components themselves accept the
// narrower `NodeViewProps` (a structural prefix of ReactNodeViewProps); a
// safe cast at the call site bridges the two — runtime payload is identical,
// the difference is only the typed `ref` field that React adds for refs.
function makeTypedBlockNode(
  name: TypedBlockType,
  attrs: AttrSchema,
  nodeView?: ComponentType<ReactNodeViewProps>,
) {
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
      return ReactNodeViewRenderer(nodeView ?? TypedBlockPlaceholder);
    },
  });
}

// ── 11 typed governance block Nodes ─────────────────────────────────────────

export const IntentBlockNode = makeTypedBlockNode('intentBlock', {
  intentSpecId: { default: null },
}, IntentBlockView);

export const InputBlockNode = makeTypedBlockNode('inputBlock', {
  artifactId: { default: null },
  portName: { default: null },
}, InputBlockView);

export const KpiBlockNode = makeTypedBlockNode('kpiBlock', {
  metricKey: { default: '' },
  operator: { default: 'eq' }, // 'between' | 'less_than' | 'greater_than' | 'eq'
  threshold: { default: 0 }, // number | [number, number]
});

export const MethodBlockNode = makeTypedBlockNode('methodBlock', {
  planId: { default: null },
});

export const RunBlockNode = makeTypedBlockNode('runBlock', {
});

export const ResultBlockNode = makeTypedBlockNode('resultBlock', {
  artifactId: { default: null },
}, ResultBlockView);

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
