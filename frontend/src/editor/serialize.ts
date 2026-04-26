// Serialize / parse helpers for `CardBodyDoc` round-trip.
//
// `editor.getJSON()` already produces a plain-JSON document, so serialize is
// effectively a structural deep-copy that strips unknown block kinds. The
// pair (`parseDoc` ∘ `serializeDoc`) is idempotent for any well-formed doc,
// which the regression test in `serialize.test.ts` asserts directly.

import {
  isTypedBlock,
  TYPED_BLOCK_KINDS,
  type BlockNode,
  type BlockType,
  type CardBodyDoc,
  type LayoutBlockType,
} from '@/types/cardBlocks';

/** All block kinds the editor understands — typed + layout + text + marks. */
const LAYOUT_KINDS: ReadonlySet<LayoutBlockType> = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'text',
  'callout',
]);

const TYPED_KINDS_SET: ReadonlySet<string> = new Set(TYPED_BLOCK_KINDS);

/** Returns true for a recognized block kind (layout OR typed). */
export function isKnownBlockType(kind: unknown): kind is BlockType {
  if (typeof kind !== 'string') return false;
  return LAYOUT_KINDS.has(kind as LayoutBlockType) || TYPED_KINDS_SET.has(kind);
}

/**
 * Serialize a `CardBodyDoc` to plain JSON. Unknown block kinds are removed
 * silently (defensive: an older Card might have block kinds we don't yet
 * understand; we don't want to crash the editor on first paint).
 */
export function serializeDoc(doc: CardBodyDoc): CardBodyDoc {
  return {
    type: 'doc',
    content: filterBlocks(doc.content),
  };
}

/**
 * Parse a JSON value back into a typed `CardBodyDoc`. Returns `null` if the
 * value isn't shaped like a Tiptap doc; otherwise filters unknown kinds and
 * returns the cleaned tree.
 */
export function parseDoc(raw: unknown): CardBodyDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { type?: unknown; content?: unknown };
  if (obj.type !== 'doc') return null;
  const content = Array.isArray(obj.content) ? obj.content : [];
  return {
    type: 'doc',
    content: filterBlocks(content as BlockNode[]),
  };
}

function filterBlocks(blocks: BlockNode[] | undefined): BlockNode[] {
  if (!Array.isArray(blocks)) return [];
  const out: BlockNode[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (!isKnownBlockType(block.type)) continue;
    out.push(cloneBlock(block));
  }
  return out;
}

function cloneBlock(block: BlockNode): BlockNode {
  const next: BlockNode = { type: block.type } as BlockNode;
  // Preserve `attrs` whenever the source carries an attrs object — even an
  // empty one. `runBlock` ships `attrs: {}` by design (Tiptap normalizes
  // node attrs to `{}` rather than `undefined`), so dropping empty objects
  // would break round-trip equality with `editor.getJSON()`.
  if (block.attrs && typeof block.attrs === 'object') {
    next.attrs = { ...block.attrs };
  }
  if (block.text != null) {
    next.text = block.text;
  }
  if (block.marks && block.marks.length > 0) {
    next.marks = block.marks.map((m) => ({ type: m.type, attrs: m.attrs ? { ...m.attrs } : undefined }));
  }
  if (Array.isArray(block.content) && block.content.length > 0) {
    next.content = filterBlocks(block.content);
  }
  return next;
}

/**
 * Convenience predicate for code that walks a doc and wants to react only to
 * the 11 typed governance blocks. Re-exports `isTypedBlock` from the types
 * module so importers can grab everything from one entry point.
 */
export { isTypedBlock };
