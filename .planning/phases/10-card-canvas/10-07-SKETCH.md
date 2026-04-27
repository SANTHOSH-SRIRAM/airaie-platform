---
phase: 10
plan: 10-07
title: Remove Phase 8 structured Card page; flag flip; remove ?legacy=1 Board fallback
wave: 7
depends_on: [10-01, 10-02, 10-03, 10-04, 10-05, 10-06]
status: sketch
estimate: 2 dev-days
---

# Plan 10-07 — SKETCH (deletion / flag-flip wave)

> **Why this is a sketch.** This wave is mostly mechanical — delete Phase 8's structured Card surface, flip the canvas to default, remove the legacy fallback. The full-plan exercise is brief once we know everything 10-02..10-06 actually shipped is the *complete* replacement. Until then, listing precise files to delete is premature.

## Goal

Make the Tiptap canvas the **default** Card surface. Remove the structured-sections page (Phase 8) and the `?legacy=1` Board-detail fallback. Keep nothing that was provisionally retained for parity-check.

## Must-haves (sketch level)

- `/cards/:cardId` (no query string) renders the canvas — `?canvas=1` becomes redundant and is REMOVED from URL handling
- `?canvas=0` → no longer flips to structured page (since structured page is gone); harmless when present (canvas renders regardless)
- `BoardDetailPage`'s `?legacy=1` branch removed; the new Board canvas (10-05) is the only Board surface
- All Phase 8 "structured-sections Card-page" components deleted: `<CardHero>`, `<AvailableInputsTable>`, `<AvailableMethodsTable>`, `<AddCustomKpiForm>`, `<ConfigSection>`, `<CardExecutionSequence>`, `<CardStatusPanel>`, `<CardActionBar>`, `<EmptyDraftIntent>`, `<UnsupportedCardTypeFallback>` — IF AND ONLY IF nothing on the canvas surfaces still imports them. Any component the canvas does reuse stays.
- `frontend/src/pages/CardDetailPage.tsx` either becomes a thin redirect to `CardCanvasPage` OR is deleted and its route swapped to point at `CardCanvasPage` directly
- `useCardRunState`, `useCardModeRules`, `useCardGates`, `useCardEvidence`, `useExecutePlan`, `useGeneratePlan` ALL stay — these are the data hooks; canvas continues to consume them
- `?canvas=0` URL handling removed cleanly — no dead branches in `CardDetailPage`
- All tests for the deleted components removed
- No regressions on the canvas; `tsc --noEmit` (default + strict) clean; vitest count drops by ≤ N where N = the count of deleted-component-only tests; npm build editor chunk still present
- STATE.md updated; ROADMAP.md Phase 10 entry marked complete; PROJECT.md updated to reflect canvas-as-default

## Removal checklist (to be confirmed at execution time)

```
frontend/src/pages/CardDetailPage.tsx              [DELETE or redirect]
frontend/src/pages/BoardDetailPage.tsx             [REMOVE ?legacy=1 branch only]

frontend/src/components/cards/CardHero.tsx                          [DELETE if unused]
frontend/src/components/cards/AvailableInputsTable.tsx              [DELETE if unused]
frontend/src/components/cards/AvailableMethodsTable.tsx             [DELETE if unused]
frontend/src/components/cards/AddCustomKpiForm.tsx                  [DELETE if unused]
frontend/src/components/cards/ConfigSection.tsx                     [DELETE if unused]
frontend/src/components/cards/CardExecutionSequence.tsx             [DELETE if unused]
frontend/src/components/cards/CardStatusPanel.tsx                   [DELETE if unused]
frontend/src/components/cards/CardActionBar.tsx                     [DELETE if unused]
frontend/src/components/cards/CardTopBar.tsx                        [audit — canvas may still need it]
frontend/src/components/cards/EmptyDraftIntent.tsx                  [DELETE if unused]
frontend/src/components/cards/UnsupportedCardTypeFallback.tsx       [DELETE if unused]

frontend/src/components/cards/sidebar/                              [audit each — canvas may keep ThisBoardNav / ThisCardStatusPill]

frontend/src/components/cards/CardDetailLayout.tsx                  [DELETE if unused]
```

For every "DELETE if unused" entry: pre-step is `grep -rn "<ComponentName\b\|from '.*ComponentName'" frontend/src --include="*.ts" --include="*.tsx" | grep -v ComponentName.tsx | grep -v ComponentName.test.tsx`. If returns 0 → delete the file + its test + its export entries. If returns > 0 → it's still consumed; leave it.

## Open questions to settle BEFORE writing the full plan

1. **Does any external surface link to `/cards/:id?canvas=0` (e.g. notification deep links, old emails, bookmarked URLs)?** If yes, decide: 301 redirect; or leave the param as a no-op. Recommend the latter — cheaper and harmless.
2. **Is `CardTopBar` retained?** It's the entry point with breadcrumb + title editor + Run state machine display. The canvas may still mount it above the editor; if so it stays. Confirm at execution time.
3. **Sidebar components — `ThisBoardNav` / `ThisCardStatusPill` — keep or drop?** Almost certainly keep (canvas page mounts them as the left rail context). Confirm.
4. **What's the right migration story for already-saved `body_blocks`?** The 10-01 auto-migration runs on Cards with `body_blocks IS NULL`. A user who opened the canvas during Wave 10-02..10-06 dev has saved versions; the 10-07 swap doesn't touch them. Verify: schema is forward-compatible (no Wave changed the typed-block attrs shape destructively); if any did, write a one-shot SQL migration to reshape the persisted JSON.

## Out of scope

- `?canvas=0` URL backwards-compat redirect (recommend no-op handling)
- Renaming `CardCanvasPage.tsx` to `CardDetailPage.tsx` (cosmetic; can do in a follow-up)
- Removing Phase 9's `ResultsSection.tsx` — it's ALSO consumed by the Board canvas (10-05) per the renderer-registry plan; keep
- Backend work — the kernel doesn't care which frontend page is mounted

## When to upgrade this sketch to a full plan

After **10-06** ships and a 1-week soak confirms no users miss anything from the structured page. Run `/gsd:plan-phase 10-07` then. The full plan is essentially this sketch with the audit results plugged in.
