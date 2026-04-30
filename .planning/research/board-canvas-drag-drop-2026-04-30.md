# Board Canvas Drag-Drop UX (Phase 10 polish, post-Phase-11)

**Date:** 2026-04-30
**Status:** design + v1 implementation
**Outcome:** ship card-drop → CardsGrid filtered + artifact-drop → ArtifactPool;
defer record-drop until a record-embed block kind is designed

---

## Problem

The original Phase 10 spec (`10-04` in the wave plan) called for a right-side
palette that drag-drops artifacts / Cards / Records onto the canvas, filling
`attrs.artifactId` on the dropped-onto NodeView. Phase 11 ripped Tiptap from
the **card** canvas (now `CardPhase11Page`, a static 5-stage layout), so
drag-drop only applies to the **board** canvas now. Board-canvas blocks are
filterless rollups — none of them carry per-id attrs, so the original spec
doesn't map onto them.

We need a new mapping that's actually useful given the rollup-block reality.

## Options considered

| Drop source | Option | Verdict |
|---|---|---|
| **Card** | Insert a single-card embed block. | Reject — no such block kind exists; would require a new Tiptap node + NodeView + slash-menu entry just for this. |
| **Card** | Insert a `cardsGridBlock` with `attrs.filter` set to that card's `intent_type`. | **Pick.** `filter` attr already exists on `cardsGridBlock`. Mapping is "show this card AND its siblings of the same intent type" — a reasonable user expectation. |
| **Artifact** | Add `attrs.artifactId` (or `attrs.filter`) to `artifactPoolBlock`, render a single-artifact preview when set. | Long-term right answer. Requires schema migration of board body_blocks docs that already use the unfiltered pool, plus updates to ArtifactPoolBlockView. |
| **Artifact** | Insert an unfiltered `artifactPoolBlock`. | **Pick for v1.** Ships today with zero schema changes; user gets the pool view they'd otherwise reach via the slash menu. Document the limitation; iterate to per-artifact preview later. |
| **Record** | New `recordEmbedBlock` kind with `attrs.recordId`. | Defer. Records don't yet have a board-canvas embed surface; designing the block is its own task. |

## v1 mappings (this commit)

- **Drag a card from the palette → drop on canvas → inserts `cardsGridBlock`
  with `attrs.filter = card.intent_type`.** Document end is the insert
  point (no per-coord pos resolution yet).
- **Drag an artifact from the palette → drop on canvas → inserts
  `artifactPoolBlock` (no attrs).** User sees the full pool inline; the
  per-artifact filter follow-up extends `attrs` later.
- **Drop while `board.mode !== 'explore'` is silently no-op'd.** `canAddBlocks`
  on `useBoardModeRules` gates the insertion. No toast for MVP — the
  palette tiles themselves render disabled in non-Explore so the user
  doesn't try.

## Out of scope for v1

- Per-coord drop positioning (insert always lands at document end).
- Per-artifact preview block (would need `attrs.artifactId` + new render
  branch on ArtifactPoolBlockView).
- Record embeds.
- Visual hover-zone highlighting on the canvas during drag.
- Reorder existing blocks via drag handle.

## Implementation notes

- HTML5 DnD: drag tiles set `dataTransfer.setData('application/x-airaie-drop', JSON.stringify({kind, ...payload}))`.
- Canvas drop wrapper: `<div onDragOver={preventDefault} onDrop={handle}>`
  around `<EditorContent>`. `preventDefault` on `dragover` is required to
  enable drop, otherwise the browser rejects.
- Insertion: `editor.commands.insertContentAt(editor.state.doc.content.size, { type, attrs })`.
- Mode gate: `useBoardModeRules(board).canAddBlocks` — drop handler returns
  early when false.

## Follow-ups

- **Per-artifact preview**: extend `artifactPoolBlock` schema with
  `attrs.artifactId`, render a single-artifact card when set; migrate
  existing body_blocks (none have it today, so just additive — no migration).
- **Record embed block**: design + ship a new Tiptap node kind plus its
  NodeView. Currently no board surface previews a record; this is a
  product-level UX call.
- **Per-coord drop**: use ProseMirror's `posAtCoords({left, top})` to
  insert at the actual drop location instead of doc end.
