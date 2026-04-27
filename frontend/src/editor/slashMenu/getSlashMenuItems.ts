import type { TypedBlockType } from '@/types/cardBlocks';

// ---------------------------------------------------------------------------
// Slash-menu items — Wave 10-02 ships three: Intent / Input / Result. The
// remaining 8 typed kinds (KPI / Method / Run / Evidence / Gate / EmbedCard /
// EmbedRecord / AiAssist) land in 10-03+.
//
// The cardinality rule for IntentBlock (the doc may contain at most one) is
// enforced at the slash-menu level here: when the doc already has an
// intentBlock, the "Intent" item is hidden. The schema-level enforcement
// (Tiptap groups) lands later — defense-in-depth, per research §"Cardinality
// enforcement". For Input and Result, no cardinality limit applies; users can
// add as many of each as they want.
// ---------------------------------------------------------------------------

export interface SlashMenuItem {
  /** Stable id, used by tests and to disambiguate React list keys. */
  id: string;
  /** Display label shown in the popover. */
  label: string;
  /** Display emoji rendered before the label; popover styles it separately. */
  emoji: string;
  /** Tiptap node `type` to insert when the user picks this item. */
  blockType: TypedBlockType;
  /** Description shown beneath the label in the popover. */
  description: string;
}

const ALL_ITEMS: SlashMenuItem[] = [
  {
    id: 'intent',
    label: 'Intent',
    emoji: '🎯',
    blockType: 'intentBlock',
    description: 'Anchor the Card to an IntentSpec.',
  },
  {
    id: 'input',
    label: 'Input',
    emoji: '📌',
    blockType: 'inputBlock',
    description: 'Pin a board artifact as an input.',
  },
  {
    id: 'result',
    label: 'Result',
    emoji: '📈',
    blockType: 'resultBlock',
    description: 'Show a result artifact via the renderer registry.',
  },
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
  if (!doc || !Array.isArray(doc.content)) return false;
  return doc.content.some((c) => c && c.type === 'intentBlock');
}

export interface GetSlashMenuItemsOptions {
  /** Whether the doc already contains an intentBlock — hides the "Intent" item. */
  docHasIntentBlock: boolean;
}

/**
 * Filter the slash-menu items by the typed query (case-insensitive prefix /
 * substring match against label) and apply cardinality rules.
 *
 * Pure; same input → same output. Tested in env=node.
 */
export function getSlashMenuItems(
  query: string,
  opts: GetSlashMenuItemsOptions,
): SlashMenuItem[] {
  const q = query.trim().toLowerCase();

  let items = ALL_ITEMS;
  if (opts.docHasIntentBlock) {
    items = items.filter((it) => it.blockType !== 'intentBlock');
  }
  if (q.length > 0) {
    items = items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q),
    );
  }
  return items;
}
