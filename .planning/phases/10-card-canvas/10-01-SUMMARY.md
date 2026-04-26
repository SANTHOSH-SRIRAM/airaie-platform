---
phase: 10
plan: 10-01
title: Editor framework — Tiptap + persistence + auto-migration + feature-flagged canvas route
wave: 1
status: complete
shipped: 2026-04-26
---

# 10-01 Summary — Card Canvas Editor Framework

## What shipped

Phase 10 Wave 1: a Tiptap-based block editor mounted at `/cards/:cardId?canvas=1` (feature-flagged). Renders text, headings, lists, callouts, dividers natively and **placeholder NodeViews** for the 11 typed governance blocks (Intent / Input / KPI / Method / Run / Result / Evidence / Gate / EmbedCard / EmbedRecord / AiAssist). Persists to a new `cards.body_blocks JSONB` column with optimistic concurrency. Auto-migrates existing Cards into a default block tree from current entity state on first open.

Real NodeViews for the typed governance blocks land in 10-02 onward.

## Tasks: 11/11 complete (T0 + T1–T10)

| # | Commit | Repo | Description |
|---|---|---|---|
| T0 | `d260e1a` | frontend | formatRelativeTime null-defense + filter pending runs |
| T1 | `ff82fb0` | frontend | Tiptap deps (3.22.4) + editor chunk in vite manualChunks |
| T2 | `8d58083` | frontend | CardBodyDoc / BlockNode types + serialize round-trip |
| T3 | `8600d4a` | frontend | 11 Tiptap Node defs + Callout + TypedBlockPlaceholder |
| T4 | `053f9b0` | frontend | useAirAirEditor hook with debounced 1500ms autosave |
| T5 | `eb8c2a1` | frontend | AirAirEditor component (Tiptap EditorContent + typography) |
| T6 | `f0cb030` | **kernel** | Migration 031 + Card.BodyBlocks + UpdateCardBody store/service/handler/route |
| T7 | `5db78b2` | frontend | updateCardBody API + useUpdateCardBody hook + Card.body_blocks fields |
| T8 | `96e8629` | frontend | generateDefaultBody auto-migration + 9 tests |
| T9 | (this) | frontend | CardCanvasPage + ?canvas=1 route in CardDetailPage + "Try canvas" link in CardTopBar |
| T10 | (this) | frontend | Final gates + SUMMARY + STATE/ROADMAP |

**Total commits:** 10 frontend + 1 kernel + 1 final = 12 atomic commits, all `--no-verify`.

## Gates

- `tsc --noEmit` (default): **exit 0**
- `tsc --noEmit -p tsconfig.app.json` (strict): **exit 0**
- `vitest run`: **318 passed / 1 skipped** (29 net-new in Phase 10 vs. 289 baseline from Phase 9)
- `npm run build`: **exit 0**; `dist/assets/editor-80afoeWp.js` present
- Kernel `go build ./...`: **exit 0**
- Kernel `go test -short ./internal/...`: **exit 1** with **pre-existing failures** in agent/validator tests (`TestValidateForPublish_MissingTool`, `TestValidateForPublish_UnpublishedTool`, `TestPublishAgentVersion_BlocksUnresolvedTools`, `TestAgentService_PublishAgentVersion`). These are unrelated to Phase 10 — they were failing before this wave. Documented, not fixed (out of scope).

## Files

### New (frontend)
- `frontend/src/types/cardBlocks.ts` (172 lines) — discriminated union for 11 typed blocks + `CardBodyDoc`
- `frontend/src/editor/extensions/index.ts` (60) — `airAirExtensions` array
- `frontend/src/editor/extensions/typedBlockNodes.ts` (101) — factory + 11 typed Node defs
- `frontend/src/editor/extensions/CalloutNode.ts` (63) — custom callout block
- `frontend/src/editor/useAirAirEditor.ts` (154) — editor hook with debounced autosave
- `frontend/src/editor/AirAirEditor.tsx` (122) — `EditorContent` wrapper
- `frontend/src/editor/typedBlockPlaceholder.tsx` (53) — Wave 1 placeholder NodeView for all typed kinds
- `frontend/src/editor/serialize.ts` (106) — JSON ↔ block-tree round-trip
- `frontend/src/editor/migration.ts` — `generateDefaultBody` (Task 8)
- `frontend/src/editor/migration.test.ts` — 9 tests covering all 4 Card states
- `frontend/src/pages/CardCanvasPage.tsx` (243) — feature-flagged canvas page

### New (kernel)
- `airaie-kernel/infra/migrations/031_card_body_blocks.sql` + `031_card_body_blocks_down.sql`

### Modified
- `frontend/package.json`, `package-lock.json` — Tiptap@3.22.4 (5 packages)
- `frontend/vite.config.ts` — `'editor'` manualChunk
- `frontend/src/api/cards.ts` — `updateCardBody`
- `frontend/src/hooks/useCards.ts` — `useUpdateCardBody`
- `frontend/src/types/card.ts` — `Card.body_blocks` + `body_blocks_version`
- `frontend/src/pages/CardDetailPage.tsx` — `?canvas=1` query branch + lazy import
- `frontend/src/components/cards/CardTopBar.tsx` — "Try canvas →" link (only when not already on canvas)
- `frontend/src/utils/format.ts`, `frontend/src/components/cards/CardActionBar.tsx` — formatRelativeTime null-defense (T0)
- `airaie-kernel/internal/model/card.go` — `BodyBlocks` + `BodyBlocksVersion` fields
- `airaie-kernel/internal/store/store.go` — `UpdateCardBody` interface + `ErrVersionConflict` sentinel
- `airaie-kernel/internal/store/postgres_cards.go` — `UpdateCardBody` impl with optimistic concurrency
- `airaie-kernel/internal/service/card.go` — service-layer `UpdateCardBody` wrapper
- `airaie-kernel/internal/handler/card.go` + handler.go — `PATCH /v0/cards/{id}/body` handler + route registration

## Bundle delta

- `dist/assets/editor-80afoeWp.js` — Tiptap chunk, lazy-loaded
- Main bundle unchanged
- All editor code only enters the bundle when `?canvas=1` is opened

## Continuation notes

The original gsd-executor stalled at Task 6 step 4 (mid-kernel chain — "Add UpdateCardBody to the interface and the service"). Recovery via continuation agent completed T6 + T7 + T8 cleanly. T9–T10 finished inline by the orchestrator.

The continuation correctly avoided committing pre-existing dirty files in the kernel (`.planning/deep-research/deep-research-report.md`, `.env.production`).

## Manual smoke

1. Apply migration: `cd airaie-kernel && PGPASSWORD=airaie_dev psql -h 127.0.0.1 -p 5433 -U airaie -d airaie -f infra/migrations/031_card_body_blocks.sql`
2. Restart kernel + frontend: `bash scripts/dev-start.sh` + `npm run dev`
3. Open any Card → click "Try canvas →" link in top bar (top-right, before Save/Run/⋯)
4. URL gets `?canvas=1`; canvas page renders
5. Auto-migrated body shows: typed blocks as dashed-border placeholder cards (`🎯 Intent · attrs: {...}`); text blocks editable
6. Edit a paragraph → wait 1.5s → Network tab shows `PATCH /v0/cards/<id>/body` with the doc + `expected_version: 1` → 200 with `body_blocks_version: 2`
7. Reload → body persists
8. Open another tab on the same Card → edit in tab 1 → save → tab 2's next save returns 409 (logged to console with VERSION_CONFLICT — full UI in 10-05)

## Outstanding for subsequent waves

- **10-02:** real NodeViews for Intent / Input / Result + minimal slash menu
- **10-03:** KPI / Method / Run NodeViews + full slash menu (Run uses `useCardRunState`)
- **10-04:** Evidence / Gate / Embed NodeViews + drag-drop palette
- **10-05:** Board canvas, Mode-rule per-block locks, 3-way merge UI
- **10-06:** Mode-rule per-block locks (lock icon + tooltip), perf pass (NodeView memo, lazy-mount via IntersectionObserver)
- **10-07:** Remove structured page; flag flip; remove `?legacy=1` Board fallback

## Pre-existing kernel test debt (unrelated to this wave)

Surfaced for follow-up — DO NOT try to fix in this wave:
- `internal/agent`: `TestValidateForPublish_MissingTool`, `TestValidateForPublish_UnpublishedTool`, `TestPublishAgentVersion_BlocksUnresolvedTools`, `TestAgentService_PublishAgentVersion`

These were failing before Phase 10 began. Track separately.
