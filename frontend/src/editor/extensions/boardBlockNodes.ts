import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import type { ComponentType } from 'react';
import { BoardBlockPlaceholder } from '../nodeViews/BoardBlockPlaceholder';
import { CardsGridBlockView } from '../nodeViews/CardsGridBlockView';
import type { BoardBlockType } from '@/types/boardBlocks';

// ---------------------------------------------------------------------------
// Board-specific Tiptap typed-block factory — Phase 10 / Plan 10-05b.
//
// Mirrors `typedBlockNodes.ts` but emits the 5 Board-specific kinds:
// cardsGridBlock / cardsGraphBlock / gatesRollupBlock / evidenceRollupBlock /
// artifactPoolBlock. CardsGridBlockView is the only real NodeView in 10-05b;
// the other 4 use BoardBlockPlaceholder until 10-05c.
//
// Same structural rules as the Card-side factory:
//   - group: 'block'
//   - atom: true (single indivisible unit; no inline editing inside)
//   - selectable + draggable
//   - parseHTML / renderHTML mirror data-block-type="<name>" round-trip
// ---------------------------------------------------------------------------

type AttrSchema = Record<string, { default: unknown }>;

function makeBoardBlockNode(
  name: BoardBlockType,
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
      return ReactNodeViewRenderer(nodeView ?? BoardBlockPlaceholder);
    },
  });
}

// ── 5 Board-specific typed Nodes ────────────────────────────────────────────

export const CardsGridBlockNode = makeBoardBlockNode('cardsGridBlock', {
  filter: { default: null },
}, CardsGridBlockView);

export const CardsGraphBlockNode = makeBoardBlockNode('cardsGraphBlock', {});

export const GatesRollupBlockNode = makeBoardBlockNode('gatesRollupBlock', {});

export const EvidenceRollupBlockNode = makeBoardBlockNode('evidenceRollupBlock', {});

export const ArtifactPoolBlockNode = makeBoardBlockNode('artifactPoolBlock', {});

export const boardTypedBlockNodes = [
  CardsGridBlockNode,
  CardsGraphBlockNode,
  GatesRollupBlockNode,
  EvidenceRollupBlockNode,
  ArtifactPoolBlockNode,
];
