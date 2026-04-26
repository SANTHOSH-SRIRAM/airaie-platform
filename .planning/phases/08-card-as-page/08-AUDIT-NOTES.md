# 08-01-T-01 — Audit notes for the existing CardDetail side-sheet

> Read-only research. Output is a comment block at the top of the new
> `frontend/src/pages/CardDetailPage.tsx` (Task 3 inlines this).

## Side-sheet shape (today)

`frontend/src/components/boards/cards/CardDetail.tsx` (302 LOC)
mounted inside `BoardDetailPage` → `CardsTab` → right column when
`selectedCardId` is non-null. It is a panel, not a modal — no overlay,
no focus trap, no portal. Closing is just `setSelectedCardId(null)`.

`selectedCardId` state lives in `BoardDetailPage` (line 137) and is
threaded to `CardsTab` via props. Switching tabs clears it
(line 362). Plan viewer opens on `onGeneratePlan`/`onViewPlan`
callbacks via separate `showPlanViewer` state (line 139).

## What the side-sheet renders

1. Title (h3) + Status badge (`STATUS_BADGE` table, 8 statuses).
2. Card type badge + intent_type chip + description.
3. `<LinkedIntentSection>` (D7) — IntentSpec linkage UI with
   re-link confirmation dialog. Updates persist through
   `useUpdateCard` which invalidates `cardKeys.detail(card.id)`.
4. KPIs table joined with `useCardEvidence` for actuals.
5. Evidence list (passed/failed/warning/info chips).
6. `[Generate Plan]` button → `useGeneratePlan(cardId).mutateAsync()`
   → notifies parent via `onGeneratePlan(cardId)`.
7. `[View Plan]` → `onViewPlan(cardId)` (parent opens PlanViewer panel).

There is NO `[▶ Run Card]` in the side-sheet today — execution is
gated through `<ExecutePlanButton>` mounted in the PlanViewer panel
(line 894 of BoardDetailPage). 08-01 Wave 1 promotes Run to a
first-class action on the per-card page.

## Behaviors that MUST be preserved

- IntentSpec linkage UI is the canonical D7 surface — the new page
  must continue to mount `<LinkedIntentSection>` (Wave 2 will do
  this in the body Hero / Inputs section).
- React Query cache key for `useCard(card.id)` is the source of
  truth for card mutations. The new top-bar's title editor must
  invalidate the same key (it does — `useUpdateCard` already does).
- KPIs joined with evidence (Wave 2 picks this up in
  `<AvailableMethodsTable>`/`<CardStatusPanel>`).
- Plan generation flow (`useGeneratePlan`) — the Run state machine
  in `CardTopBar` (Task 5) covers this and supersedes the
  side-sheet's Generate Plan button.

## Behaviors INTENTIONALLY DROPPED (in Wave 1)

- The Generate Plan + View Plan two-button row → folded into the
  `[▶ Run Card]` state-machine button on `CardTopBar`. Same
  underlying mutations.
- The "Close" button at the top of the side-sheet → no longer
  needed; closing is `← Back to Board` navigation.
- Inline KPIs/Evidence sections → deferred to Wave 2 body sections.
  Wave 1 renders only the chrome.

## No keyboard shortcuts / no focus trap

Confirmed by reading: side-sheet is a regular flex panel. Closing has
no side effects beyond clearing `selectedCardId` and `showPlanViewer`.

## `useGeneratePlan` invocation sites

Side-sheet (`CardDetail.tsx:65`) and `<PlanGeneratorPanel>` (board
right pane) both call it. The new `CardTopBar` becomes the third
caller — all three share the same `planKeys.detail(cardId)` cache,
so changes propagate everywhere automatically.

## Closing the side-sheet

`setSelectedCardId(null)` clears the state; `setShowPlanViewer(null)`
clears the related plan-viewer panel. No side effects beyond UI
unmount. Wave 1 keeps both behind `?legacy=1` for one release
(Task 4).
