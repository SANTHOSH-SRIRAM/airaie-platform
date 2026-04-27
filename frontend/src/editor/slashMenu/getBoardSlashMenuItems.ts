import type { BoardBlockType } from '@/types/boardBlocks';
import type { LayoutSlashMenuItem, SlashMenuItem } from './getSlashMenuItems';

// ---------------------------------------------------------------------------
// Board canvas slash-menu items — Phase 10 / Plan 10-05c-final.
//
// 5 Board-specific typed kinds + 5 shared layout kinds. Cardinality is 0..N
// for every kind (the user might want multiple Cards Grids with different
// filters, multiple Gates Rollups split by tag, etc.) — no hide-when-present
// rules. The popover applies a substring filter against id + label as its
// only filter; the suggestion plugin pushes the result into slashMenuStore.
//
// `BoardTypedSlashMenuItem` is a sibling shape to the Card `TypedSlashMenuItem`
// (same render-time fields), parameterized on `BoardBlockType` instead of
// `TypedBlockType` so the discriminated union in the extension's `command`
// callback narrows correctly when inserting.
// ---------------------------------------------------------------------------

export interface BoardTypedSlashMenuItem {
  kind: 'board-typed';
  id: string;
  label: string;
  emoji: string;
  description: string;
  group: 'board' | 'layout';
  blockType: BoardBlockType;
}

export type BoardSlashMenuItem = BoardTypedSlashMenuItem | LayoutSlashMenuItem;

const ALL_BOARD_ITEMS: BoardSlashMenuItem[] = [
  { kind: 'board-typed', id: 'cards-grid',     label: 'Cards Grid',     emoji: '🗂️', blockType: 'cardsGridBlock',     description: 'Grid of cards in this board.',           group: 'board' },
  { kind: 'board-typed', id: 'cards-graph',    label: 'Cards Graph',    emoji: '🕸️', blockType: 'cardsGraphBlock',    description: 'Dependency DAG of the board cards.',     group: 'board' },
  { kind: 'board-typed', id: 'gates-rollup',   label: 'Gates Rollup',   emoji: '🛡',  blockType: 'gatesRollupBlock',   description: 'Status counts + per-gate list.',         group: 'board' },
  { kind: 'board-typed', id: 'evidence-rollup',label: 'Evidence Rollup',emoji: '✓',   blockType: 'evidenceRollupBlock',description: 'Card-status summary across the board.',  group: 'board' },
  { kind: 'board-typed', id: 'artifact-pool',  label: 'Artifact Pool',  emoji: '📦',  blockType: 'artifactPoolBlock',  description: 'All artifacts pinned to the board.',     group: 'board' },
  // Layout (5) — same kinds the Card slash menu surfaces. Reuse the Card
  // LayoutSlashMenuItem shape verbatim so a single popover renders both.
  { kind: 'layout', id: 'heading-1',    label: 'Heading 1',   emoji: 'H1',  layout: 'heading-1',   description: 'Section heading.',                  group: 'layout' },
  { kind: 'layout', id: 'heading-2',    label: 'Heading 2',   emoji: 'H2',  layout: 'heading-2',   description: 'Subsection heading.',               group: 'layout' },
  { kind: 'layout', id: 'bullet-list',  label: 'Bullet list', emoji: '•',   layout: 'bullet-list', description: 'Unordered list.',                   group: 'layout' },
  { kind: 'layout', id: 'code-block',   label: 'Code block',  emoji: '</>', layout: 'code-block',  description: 'Code block with monospace font.',  group: 'layout' },
  { kind: 'layout', id: 'divider',      label: 'Divider',     emoji: '—',   layout: 'divider',     description: 'Horizontal rule between sections.', group: 'layout' },
];

/** Pure substring filter against id + label. Empty query returns all items. */
export function getBoardSlashMenuItems(query: string): BoardSlashMenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_BOARD_ITEMS;
  return ALL_BOARD_ITEMS.filter(
    (item) => item.id.toLowerCase().includes(q) || item.label.toLowerCase().includes(q),
  );
}

/** Adapter — coerce the Board union member into the generic SlashMenuItem
 *  shape the popover renders. The popover only reads the shared display
 *  fields (id/label/emoji/description/group + a `kind` for grouping). */
export function asGenericSlashMenuItems(items: BoardSlashMenuItem[]): SlashMenuItem[] {
  return items.map((item) => {
    if (item.kind === 'layout') return item; // already generic
    return {
      kind: 'typed',
      id: item.id,
      label: item.label,
      emoji: item.emoji,
      description: item.description,
      // Cast: Board kinds aren't in the Card-side TypedBlockType union, but
      // the popover only reads display fields — the `command` callback in
      // the suggestion plugin is what interprets blockType for insertion,
      // and that branch lives in boardSlashMenuExtension where the Board
      // shape is preserved before this adapter runs.
      blockType: item.blockType as unknown as import('@/types/cardBlocks').TypedBlockType,
      // Map 'board' visual section to 'governance' so the existing popover
      // section grouping (Governance / Layout) renders Board kinds in the
      // top section without further changes.
      group: item.group === 'board' ? 'governance' : item.group,
    };
  });
}
