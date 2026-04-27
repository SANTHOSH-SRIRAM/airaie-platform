// AirAIE Board Canvas block schema — Phase 10 / Plan 10-05.
//
// Mirrors `cardBlocks.ts` for Boards. Same `BlockNode` recursive shape; the
// typed-governance kinds are Board-specific (rollups, grids, pools) instead
// of Card-specific (intent / input / kpi / etc.). Layout/text blocks are
// shared (paragraph, heading, lists, callout, divider, code).
//
// Persistence: this exact JSON shape is what gets serialized to
// `boards.body_blocks` (JSONB) on the kernel side via PATCH /v0/boards/{id}/body.

import type { LayoutBlockType, BaseBlockNode, BlockNode, BlockMark } from './cardBlocks';

export type { LayoutBlockType, BaseBlockNode, BlockNode, BlockMark };

/** Five typed-governance Board block kinds. */
export type BoardBlockType =
  | 'cardsGridBlock'
  | 'cardsGraphBlock'
  | 'gatesRollupBlock'
  | 'evidenceRollupBlock'
  | 'artifactPoolBlock';

export type BoardBlockKind = LayoutBlockType | BoardBlockType;

// -- Per-kind attrs ---------------------------------------------------------

export interface CardsGridBlockNode extends BaseBlockNode {
  type: 'cardsGridBlock';
  attrs?: {
    /** Optional intent_type filter (e.g. 'sim.fea_stress_analysis').
     *  When omitted, the grid renders ALL cards in the board. */
    filter?: string | null;
  };
}

export interface CardsGraphBlockNode extends BaseBlockNode {
  type: 'cardsGraphBlock';
  attrs?: Record<string, never>;
}

export interface GatesRollupBlockNode extends BaseBlockNode {
  type: 'gatesRollupBlock';
  attrs?: Record<string, never>;
}

export interface EvidenceRollupBlockNode extends BaseBlockNode {
  type: 'evidenceRollupBlock';
  attrs?: Record<string, never>;
}

export interface ArtifactPoolBlockNode extends BaseBlockNode {
  type: 'artifactPoolBlock';
  attrs?: Record<string, never>;
}

export type BoardTypedBlockNode =
  | CardsGridBlockNode
  | CardsGraphBlockNode
  | GatesRollupBlockNode
  | EvidenceRollupBlockNode
  | ArtifactPoolBlockNode;

/** Top-level Tiptap doc shape for the Board canvas. */
export interface BoardBodyDoc {
  type: 'doc';
  content: BlockNode[];
}

/** All five Board-specific kinds, exported for the slash menu / factory. */
export const BOARD_BLOCK_KINDS: readonly BoardBlockType[] = [
  'cardsGridBlock',
  'cardsGraphBlock',
  'gatesRollupBlock',
  'evidenceRollupBlock',
  'artifactPoolBlock',
] as const;
