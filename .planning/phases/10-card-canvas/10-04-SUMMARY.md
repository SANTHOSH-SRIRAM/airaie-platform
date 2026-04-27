---
phase: 10
plan: 10-04
title: Real Evidence / Gate / EmbedCard / EmbedRecord NodeViews + AiAssist stub
wave: 4
status: complete
shipped: 2026-04-27
---

# 10-04 Summary — Last 5 NodeViews wired (palette split to 10-04b)

## What shipped

The remaining **5 of 11** typed-governance NodeViews replace `TypedBlockPlaceholder`:

- `EvidenceBlockView` — reads `attrs.evidenceId`, filters the card's full evidence list (single fetch via `useCardEvidence(cardId)`, shared with the page) using a pure `findEvidenceById` helper. Renders metric_key + value + threshold-clause + an evaluation chip (pass/fail/warning/info/pending).
- `GateBlockView` — reads `attrs.gateId`, fetches the bound Gate via `useGate(gateId)`. Renders name + status badge with color tokens (PENDING amber / EVALUATING blue / PASSED green / FAILED red / WAIVED grey). PENDING gates show inline Approve / Reject buttons calling `useApproveGate / useRejectGate`. Mode-rule gating ships in 10-06.
- `EmbedCardBlockView` — `useCard(cardId)` → mini-preview chrome with title + intent_type pill + status + click-through link to `/cards/:cardId`.
- `EmbedRecordBlockView` — new `useRecord(boardId, recordId)` hook (Task 1) backed by new `getRecord` API client; renders title + record_type pill + 120-char body preview. Pure `formatRecordPreview` helper handles the canonical `{ text }` shape and falls back to `JSON.stringify` for non-text content.
- `AiAssistBlockView` — STUB. Kernel has no `/v0/conversations` route yet, so a real fetch would 404 every render. Renders a dashed-border card with the bound `conversationId` visible. Block kind, attrs, and the slash-menu item all stay so users can drop the block in and have its `conversationId` persist; runtime wiring lights up when the backend ships.

After this wave: `grep -c "}, [A-Z][a-zA-Z]*View);" frontend/src/editor/extensions/typedBlockNodes.ts` returns **11** — every typed-governance Tiptap node mounts a real per-kind NodeView. `TypedBlockPlaceholder` import is retained as the factory's safety fallback for any future kind declared without a NodeView.

## Tasks

| # | Commit | Description |
|---|---|---|
| T1 | `0eac661` | `getRecord` API + `useRecord` hook + `boardKeys.record` |
| T2 | `bb41982` | `EvidenceBlockView` NodeView + 12 helper tests |
| T3 | `1d5ea1e` | `GateBlockView` NodeView + 12 helper tests |
| T4-6 | `3b0cde7` | `EmbedCardBlockView`, `EmbedRecordBlockView` (+5 helper tests), `AiAssistBlockView` stub |
| T7 | `3fb6d1d` | wire 5 NodeViews into `typedBlockNodes` factory; all 11 now real |
| T8 | (this) | SUMMARY + STATE + ROADMAP updates |

**6 atomic commits** for the wave.

## Gates

- `tsc --noEmit` (default): exit 0
- `tsc --noEmit -p tsconfig.app.json` (strict): exit 0
- `vitest run`: **410 passed / 1 skipped** (was 381; **+29 net-new** vs the +12 minimum target)
- `npm run build`: exit 0; `dist/assets/editor-BcatEhBp.js` (387.56 kB, same as 10-03 — no growth despite 5 new NodeView components)
- `grep -c "}, [A-Z][a-zA-Z]*View);" typedBlockNodes.ts` → 11 ✓

### Bundle delta

The editor chunk is byte-identical to the post-10-03 version (387.56 kB / 123.21 kB gzip). The new components compress cleanly within the existing chunk envelope. No new dependencies, no new chunks.

## Files

### New
- `frontend/src/editor/nodeViews/EvidenceBlockView.tsx` (135)
- `frontend/src/editor/nodeViews/EvidenceBlockView.helpers.ts` (54)
- `frontend/src/editor/nodeViews/EvidenceBlockView.helpers.test.ts` (98)
- `frontend/src/editor/nodeViews/GateBlockView.tsx` (134)
- `frontend/src/editor/nodeViews/GateBlockView.helpers.ts` (62)
- `frontend/src/editor/nodeViews/GateBlockView.helpers.test.ts` (78)
- `frontend/src/editor/nodeViews/EmbedCardBlockView.tsx` (91)
- `frontend/src/editor/nodeViews/EmbedRecordBlockView.tsx` (135)
- `frontend/src/editor/nodeViews/EmbedRecordBlockView.helpers.test.ts` (27)
- `frontend/src/editor/nodeViews/AiAssistBlockView.tsx` (45)

### Modified
- `frontend/src/api/boards.ts` — added `getRecord(boardId, recordId)`
- `frontend/src/hooks/useBoards.ts` — added `useRecord` hook + `boardKeys.record`
- `frontend/src/editor/extensions/typedBlockNodes.ts` — 5 imports + 5 third-positional `nodeView` arguments

## Manual smoke

Pending live verification. Sequence:
1. Open `/cards/<a-card-with-evidence>?canvas=1` (e.g. `crd_fea_3b5179` after running it)
2. Confirm Evidence blocks render with metric values + chips (no more `vidence` placeholder text)
3. If the card has Gates: confirm GateBlockView shows the gate name + badge; for PENDING gates the Approve / Reject buttons appear
4. Test embedding a Card via slash menu (`/card-link`); pick a card; confirm preview renders with click-through link
5. Test embedding a Record via slash menu (`/record`); confirm title + body preview
6. Test AI Assist insert; confirm dashed-border "coming soon" stub renders with conversationId

## Outstanding for subsequent waves

- **10-04b (split-off):** Drag-drop right-rail palette (Board Pool / Tools / Run Outputs / Records / Text Blocks / AI Assist sections). HTML5 drag, `editor.commands.insertContent({...}, { at: dropPos })` driven by `editor.view.posAtCoords`. Estimated 2-3 dev-days alone — substantial enough to warrant its own plan.
- **10-05:** Board canvas migration (`/boards/:id?canvas=1` + 5 Board-specific block kinds: cardsGrid, cardsGraph, gatesRollup, evidenceRollup, artifactPool).
- **10-06:** Mode-rule per-block locks + perf pass (NodeView memo, IntersectionObserver lazy-mount) + 3-way merge UI on 409. The `canSignOffGate` helper added in 10-04 currently returns true for any PENDING gate — 10-06 threads in role + Mode rules from `useCardModeRules` to gate sign-off properly.
- **10-07:** Remove Phase 8 structured Card page; remove `?legacy=1` Board fallback; canvas becomes default.
- **AI Assist backend** — once the kernel ships `/v0/conversations` (or equivalent), swap `AiAssistBlockView` from stub to a real fetch. The block's attrs, factory wiring, and slash-menu item are already in place.

### Decision log

- **AI Assist deferred to a stub** (this wave) rather than building a fake kernel route or shipping a broken NodeView. The block kind survives in serialization so existing docs aren't disrupted when the backend lands.
- **Drag-drop palette split off into 10-04b** because it's a cohesive standalone surface (~2-3 dev-days). Slash menu already lets users insert any kind, so the palette is value-additive but not value-blocking.
- **Approve / Reject rationale defaults** in GateBlockView are hardcoded to `'Approved via canvas'` / `'Rejected via canvas'` — Mode-rule wave (10-06) will surface a textarea for the rationale input.
- **`canSignOffGate` is permissive** — returns true for any PENDING gate. 10-06 threads in role + Mode for proper gating.

### Pre-existing test debt (unchanged)

Same 4 `internal/agent` kernel test failures documented in 10-01-SUMMARY. Not caused by this wave; track separately.
