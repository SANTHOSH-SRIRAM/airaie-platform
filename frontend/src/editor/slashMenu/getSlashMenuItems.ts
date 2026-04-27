import type { TypedBlockType } from '@/types/cardBlocks';

// ---------------------------------------------------------------------------
// Slash-menu items — Wave 10-03 ships all 11 typed-governance kinds plus
// 5 layout kinds (Heading 1, Heading 2, Bullet List, Code Block, Divider).
//
// Cardinality (per 10-RESEARCH §"Cardinality enforcement"):
//   - intentBlock — at most 1 per Card. Item hidden when doc has one.
//   - methodBlock — at most 1 per Card. Item hidden when doc has one.
//   - runBlock    — at most 1 per Card. Item hidden when doc has one.
//   - all others  — 0..N. Never hidden.
//
// Two item shapes coexist via a `kind` discriminator:
//   - { kind: 'typed', blockType: TypedBlockType }  — inserts a typed block
//   - { kind: 'layout', layout: LayoutCommand }     — runs a Tiptap chain
//                                                     (e.g. setHeading, etc.)
//
// The popover renders both; the slashMenuExtension's `command` callback
// branches on `kind` to either insertContent (typed) or run a chain
// (layout). 10-02 only had the typed branch.
// ---------------------------------------------------------------------------

export type LayoutCommand =
  | 'heading-1'
  | 'heading-2'
  | 'bullet-list'
  | 'code-block'
  | 'divider';

export type SlashMenuGroup = 'governance' | 'layout';

/** Common shared fields. */
interface SlashMenuItemBase {
  /** Stable id for keys + tests. */
  id: string;
  /** Display label. */
  label: string;
  /** Display emoji. */
  emoji: string;
  /** Description shown beneath the label. */
  description: string;
  /** Visual section grouping in the popover. */
  group: SlashMenuGroup;
}

export interface TypedSlashMenuItem extends SlashMenuItemBase {
  kind: 'typed';
  /** Tiptap node type to insert. */
  blockType: TypedBlockType;
}

export interface LayoutSlashMenuItem extends SlashMenuItemBase {
  kind: 'layout';
  /** Layout command discriminator — slashMenuExtension maps to a Tiptap chain. */
  layout: LayoutCommand;
}

export type SlashMenuItem = TypedSlashMenuItem | LayoutSlashMenuItem;

const ALL_ITEMS: SlashMenuItem[] = [
  // Typed governance (11) ──────────────────────────────────────────────
  { kind: 'typed', id: 'intent',        label: 'Intent',      emoji: '🎯', blockType: 'intentBlock',      description: 'Anchor the Card to an IntentSpec.',                  group: 'governance' },
  { kind: 'typed', id: 'input',         label: 'Input',       emoji: '📌', blockType: 'inputBlock',       description: 'Pin a board artifact as an input.',                  group: 'governance' },
  { kind: 'typed', id: 'kpi',           label: 'KPI',         emoji: '📊', blockType: 'kpiBlock',         description: 'Acceptance criterion (metric + threshold).',         group: 'governance' },
  { kind: 'typed', id: 'method',        label: 'Method',      emoji: '⚙',  blockType: 'methodBlock',      description: 'The bound ExecutionPlan.',                           group: 'governance' },
  { kind: 'typed', id: 'run',           label: 'Run',         emoji: '▶',  blockType: 'runBlock',         description: 'The Run control surface.',                           group: 'governance' },
  { kind: 'typed', id: 'result',        label: 'Result',      emoji: '📈', blockType: 'resultBlock',      description: 'Show a result artifact via the renderer registry.',  group: 'governance' },
  { kind: 'typed', id: 'evidence',      label: 'Evidence',    emoji: '✓',  blockType: 'evidenceBlock',    description: 'Cite a measurement or decision.',                    group: 'governance' },
  { kind: 'typed', id: 'gate',          label: 'Gate',        emoji: '🛡', blockType: 'gateBlock',        description: 'Show a governance gate.',                            group: 'governance' },
  { kind: 'typed', id: 'embed-card',    label: 'Card link',   emoji: '🔗', blockType: 'embedCardBlock',   description: 'Link to another Card.',                              group: 'governance' },
  { kind: 'typed', id: 'embed-record',  label: 'Record',      emoji: '📄', blockType: 'embedRecordBlock', description: 'Embed a Record.',                                    group: 'governance' },
  { kind: 'typed', id: 'ai-assist',     label: 'AI Assist',   emoji: '✨', blockType: 'aiAssistBlock',    description: 'AI Assist conversation.',                            group: 'governance' },
  // Layout (5) ──────────────────────────────────────────────────────────
  { kind: 'layout', id: 'heading-1',    label: 'Heading 1',   emoji: 'H1',  layout: 'heading-1',  description: 'Section heading.',                  group: 'layout' },
  { kind: 'layout', id: 'heading-2',    label: 'Heading 2',   emoji: 'H2',  layout: 'heading-2',  description: 'Subsection heading.',               group: 'layout' },
  { kind: 'layout', id: 'bullet-list',  label: 'Bullet list', emoji: '•',   layout: 'bullet-list', description: 'Unordered list.',                   group: 'layout' },
  { kind: 'layout', id: 'code-block',   label: 'Code block',  emoji: '</>', layout: 'code-block',  description: 'Code block with monospace font.',  group: 'layout' },
  { kind: 'layout', id: 'divider',      label: 'Divider',     emoji: '—',   layout: 'divider',     description: 'Horizontal rule between sections.', group: 'layout' },
];

export interface DocLike {
  content?: { type: string }[];
}

/**
 * Pure check — does the document already contain an intentBlock?
 * Walks only the top-level children (intentBlock is a top-level atom block;
 * it cannot be nested inside another block by the schema).
 */
export function docHasIntentBlock(doc: DocLike | null | undefined): boolean {
  return docHasTypedBlock(doc, 'intentBlock');
}

/** Pure check — does the document already contain a methodBlock? */
export function docHasMethodBlock(doc: DocLike | null | undefined): boolean {
  return docHasTypedBlock(doc, 'methodBlock');
}

/** Pure check — does the document already contain a runBlock? */
export function docHasRunBlock(doc: DocLike | null | undefined): boolean {
  return docHasTypedBlock(doc, 'runBlock');
}

function docHasTypedBlock(
  doc: DocLike | null | undefined,
  blockType: string,
): boolean {
  if (!doc || !Array.isArray(doc.content)) return false;
  return doc.content.some((c) => c && c.type === blockType);
}

export interface GetSlashMenuItemsOptions {
  /** Hide Intent item when true (cardinality 1-per-Card). */
  docHasIntentBlock: boolean;
  /** Hide Method item when true (cardinality 1-per-Card). */
  docHasMethodBlock: boolean;
  /** Hide Run item when true (cardinality 1-per-Card). */
  docHasRunBlock: boolean;
}

/**
 * Filter the slash-menu items by the typed query (case-insensitive substring
 * match against label or id) and apply cardinality rules.
 *
 * Pure; same input → same output. Tested in env=node.
 */
export function getSlashMenuItems(
  query: string,
  opts: GetSlashMenuItemsOptions,
): SlashMenuItem[] {
  const q = query.trim().toLowerCase();

  let items: SlashMenuItem[] = ALL_ITEMS;

  // Cardinality filters
  if (opts.docHasIntentBlock) {
    items = items.filter((it) => it.kind !== 'typed' || it.blockType !== 'intentBlock');
  }
  if (opts.docHasMethodBlock) {
    items = items.filter((it) => it.kind !== 'typed' || it.blockType !== 'methodBlock');
  }
  if (opts.docHasRunBlock) {
    items = items.filter((it) => it.kind !== 'typed' || it.blockType !== 'runBlock');
  }

  // Substring filter
  if (q.length > 0) {
    items = items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q),
    );
  }

  return items;
}
