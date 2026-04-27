// AirAIE Card Canvas block schema — Phase 10 / Plan 10-01.
//
// This is a *typed* mirror of the document shape Tiptap's `editor.getJSON()`
// produces. The discriminated union below validates the `attrs` payload of
// each typed governance block kind (intent, input, kpi, method, run, result,
// evidence, gate, embed-card, embed-record, ai-assist).
//
// Layout/text blocks (paragraph, heading, lists, blockquote, codeBlock,
// horizontalRule, callout) are tracked structurally via `BaseBlockNode` —
// their attrs vary by kind and we don't enforce them at the type level
// (Tiptap's schema validation handles malformed content during parse).
//
// Persistence: this exact JSON shape is what gets serialized to
// `cards.body_blocks` (JSONB) on the kernel side. See `migration.ts` for
// the auto-migration that builds an initial doc from current entity state,
// and `useAirAirEditor` for the editor binding that keeps everything typed.

export type LayoutBlockType =
  | 'doc'
  | 'paragraph'
  | 'heading' // attrs.level: 1 | 2 | 3
  | 'bulletList'
  | 'orderedList'
  | 'listItem'
  | 'blockquote'
  | 'codeBlock'
  | 'horizontalRule'
  | 'hardBreak'
  | 'text' // text node (carries `text` + `marks`)
  | 'callout'; // attrs.variant: 'info' | 'warning' | 'success'

export type TypedBlockType =
  | 'intentBlock'
  | 'inputBlock'
  | 'kpiBlock'
  | 'methodBlock'
  | 'runBlock'
  | 'resultBlock'
  | 'evidenceBlock'
  | 'gateBlock'
  | 'embedCardBlock'
  | 'embedRecordBlock'
  | 'aiAssistBlock';

/** Phase 10 / Plan 10-05 — Board-canvas-only typed kinds. Co-located here
 *  so `BaseBlockNode.type` accepts them too (Tiptap docs the canvas
 *  editor emits include these). The Card-canvas factory does NOT mount
 *  them; the Board factory does. */
export type BoardOnlyBlockType =
  | 'cardsGridBlock'
  | 'cardsGraphBlock'
  | 'gatesRollupBlock'
  | 'evidenceRollupBlock'
  | 'artifactPoolBlock';

export type BlockType = LayoutBlockType | TypedBlockType | BoardOnlyBlockType;

/** Mark on a text node (bold, italic, code, link, …). */
export interface BlockMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/** Base shape — every Tiptap node satisfies this. */
export interface BaseBlockNode {
  type: BlockType;
  attrs?: Record<string, unknown>;
  content?: BlockNode[];
  marks?: BlockMark[];
  text?: string;
}

// ── Discriminated typed-block nodes ─────────────────────────────────────────

export interface IntentBlockNode extends BaseBlockNode {
  type: 'intentBlock';
  attrs: { intentSpecId: string | null };
}

export interface InputBlockNode extends BaseBlockNode {
  type: 'inputBlock';
  attrs: { artifactId: string | null; portName?: string | null };
}

export type KpiOperator = 'between' | 'less_than' | 'greater_than' | 'eq';

export interface KpiBlockNode extends BaseBlockNode {
  type: 'kpiBlock';
  attrs: {
    metricKey: string;
    operator: KpiOperator;
    /** A scalar threshold for unary operators or a `[lo, hi]` tuple for `between`. */
    threshold: number | [number, number];
  };
}

export interface MethodBlockNode extends BaseBlockNode {
  type: 'methodBlock';
  attrs: { planId: string | null };
}

export interface RunBlockNode extends BaseBlockNode {
  type: 'runBlock';
  attrs: Record<string, never>;
}

export interface ResultBlockNode extends BaseBlockNode {
  type: 'resultBlock';
  attrs: { artifactId: string | null };
}

export interface EvidenceBlockNode extends BaseBlockNode {
  type: 'evidenceBlock';
  attrs: { evidenceId: string | null };
}

export interface GateBlockNode extends BaseBlockNode {
  type: 'gateBlock';
  attrs: { gateId: string | null };
}

export interface EmbedCardBlockNode extends BaseBlockNode {
  type: 'embedCardBlock';
  attrs: { cardId: string | null };
}

export interface EmbedRecordBlockNode extends BaseBlockNode {
  type: 'embedRecordBlock';
  attrs: { recordId: string | null };
}

export interface AiAssistBlockNode extends BaseBlockNode {
  type: 'aiAssistBlock';
  attrs: { conversationId: string | null };
}

/**
 * Discriminated union of every block node kind. Layout nodes are still
 * `BaseBlockNode` (their `type` is one of the LayoutBlockType strings); the
 * typed-block branches lock down `attrs` shape.
 */
export type BlockNode =
  | BaseBlockNode
  | IntentBlockNode
  | InputBlockNode
  | KpiBlockNode
  | MethodBlockNode
  | RunBlockNode
  | ResultBlockNode
  | EvidenceBlockNode
  | GateBlockNode
  | EmbedCardBlockNode
  | EmbedRecordBlockNode
  | AiAssistBlockNode;

/** Top-level Tiptap document — `editor.getJSON()` returns this shape. */
export interface CardBodyDoc {
  type: 'doc';
  content: BlockNode[];
}

/**
 * The 11 typed governance block kinds, in slash-menu order. Used by
 * `isTypedBlock` and the placeholder NodeView's KIND_LABELS map.
 */
export const TYPED_BLOCK_KINDS = [
  'intentBlock',
  'inputBlock',
  'kpiBlock',
  'methodBlock',
  'runBlock',
  'resultBlock',
  'evidenceBlock',
  'gateBlock',
  'embedCardBlock',
  'embedRecordBlock',
  'aiAssistBlock',
] as const satisfies readonly TypedBlockType[];

/** Type guard — returns `true` for the 11 typed governance blocks. */
export function isTypedBlock(b: BlockNode): b is BlockNode & { type: TypedBlockType } {
  return (TYPED_BLOCK_KINDS as readonly string[]).includes(b.type);
}
