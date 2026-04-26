---
phase: 8
title: Card-as-Page (Phase 1 of conceptual rollout)
research_date: 2026-04-26
---

# Research — Card-as-Page

## Goal

Replace today's CardDetail side-sheet inside `BoardDetailPage` with a full-page route `/cards/:cardId` that renders the configuration-first layout from the Sensor Manager reference (per-card top bar, hero, "Available X" tables, "+ Add Custom KPI" form, two-column "Sequence | Status" panel, floating action bar). No backend changes. Validates the Card-as-page mental model documented in `airaie_platform/doc/concepts/03-CARDS-AS-PAGES.md` before investing in the renderer registry (Phase 2a).

## Source documents

- `airaie_platform/doc/concepts/03-CARDS-AS-PAGES.md` — UX shift, page anatomy, Mode-aware affordances
- `airaie_platform/doc/concepts/01-CORE-MODEL.md` — Card data model, lifecycle, IntentSpec structure
- `airaie_platform/doc/concepts/02-GOVERNANCE-AND-MODES.md` — Mode dial, Gate types

## Existing code we reuse

### Hooks (frontend/src/hooks/)

| Hook | Purpose | Status |
|---|---|---|
| `useCard(id)` | Single Card fetch | shipped |
| `useCardEvidence(id, autoRefresh)` | Evidence list with optional polling | shipped |
| `useUpdateCard(id, boardId)` | Card field updates | shipped |
| `useDeleteCard(id, boardId)` | Card deletion | shipped |
| `useAddEvidence(cardId)` | Manual Evidence rows (Explore only) | shipped |
| `useCardList(boardId)` | Cards in a Board | shipped |
| `useCardGraph(boardId)` | Dependency graph | shipped (envelope unwrap fixed today) |
| `usePlan(cardId)` | Single Plan fetch | shipped |
| `usePlanPolling(cardId, enabled)` | Plan poll while generating | shipped |
| `useGeneratePlan(cardId)` | Plan generation mutation | shipped |
| `useValidatePlan(cardId)` | Validate compiled plan | shipped |
| `useExecutePlan(cardId, boardId)` | Run a Card's plan | shipped |
| `useArtifactList(boardId)` | Board's artifacts pool | shipped |
| `useArtifact(id)` | Single artifact metadata | shipped |
| `useBoard(id)` | Board fetch (for Mode) | shipped |
| `useIntentSpec(id)` | IntentSpec fetch | check — may need verification |
| `useGates(cardId)` | Gates for a Card | **MISSING on frontend — kernel endpoints exist** |
| `useApproveGate / useRejectGate / useWaiveGate` | Gate mutations | **MISSING on frontend** |

### Components (frontend/src/components/)

| Component | Reuse as |
|---|---|
| `boards/cards/CardDetail.tsx` (302 LOC) | reference only — extract status badge, type-color tables; do NOT mount; replaced by CardDetailPage |
| `boards/IntentSpecForm.tsx` | inline-embed in Hero / KPI form |
| `boards/IntentSpecEditor.tsx` | inline-embed for KPI editing |
| `boards/cards/IntentSpecPicker.tsx` | unused for Phase 1 (Cards bind 1:1 to an IntentSpec) |
| `boards/cards/LinkedIntentSection.tsx` | reference for IntentSpec wiring |
| `boards/PlanGeneratorPanel.tsx` | inline-embed in `<AvailableMethodsTable>` initially |
| `boards/BoardAssistPanel.tsx` (DraftIntentSection) | extract shared `<AIAssistDraftIntent>` for Hero / draft state |
| `workflows/runs/*` (run progress UI) | reference for `<CardExecutionSequence>` live progress visuals |
| `dashboard/StatCard.tsx` | reuse pattern for the 4-stat row inside `<CardStatusPanel>` |
| `ui/ErrorBoundary` / `ui/PageSkeleton` / `ui/ErrorState` | wrap CardDetailPage with these |

### Routes / navigation

- `App.tsx` registers lazy-loaded routes per page. Add `/cards/:cardId` adjacent to `/boards/:boardId`.
- `constants/routes.ts` defines `ROUTES` constants and `pathFor*` helpers. Add `CARD_DETAIL` and `cardDetailPath(id)`.
- `BoardDetailPage` (`pages/BoardDetailPage.tsx`) currently renders Cards as rows that open a side-sheet (`CardDetail.tsx`). Phase 8 changes this to navigate.
- `AppShell` (`@airaie/shell`) handles the global top capsule + sidebar. Sidebar content is configurable via `useUiStore.setSidebarContentType()`.

### Backend endpoints (already shipped)

- `GET /v0/cards/{id}` — card detail
- `PATCH /v0/cards/{id}` — update title, config, kpis
- `DELETE /v0/cards/{id}`
- `GET /v0/cards/{id}/evidence` — evidence rows
- `POST /v0/cards/{id}/evidence` — add manual evidence (Explore only)
- `GET /v0/cards/{id}/plan` — current plan
- `POST /v0/cards/{id}/plan` — generate plan (with optional `force_agent`)
- `POST /v0/cards/{id}/run` — execute plan → run
- `GET /v0/boards/{id}/cards` — cards list (already used by BoardDetailPage)
- `GET /v0/boards/{id}/artifacts` — artifact pool (already used)
- `GET /v0/intent-types/{slug}/pipelines` — pipeline catalog by intent type
- `GET /v0/cards/{id}/gates` — gates list (per CLAUDE.md kernel reference; verify frontend hook exists)
- `POST /v0/gates/{id}/approve` / `/reject` / `/waive` — gate mutations

## Status enum mismatch (acknowledged, not solved here)

- Backend `Card.status`: `draft | ready | queued | running | completed | failed | blocked | skipped`
- Concept doc proposes: `draft | planned | running | evidence_pending | gated | passed | failed | released`
- **Phase 8 displays the existing backend statuses.** Reconciling the enum is a separate concern (concepts/03 §"Implementation phases").

## Card-type variants (Phase 8 covers `analysis` only)

- `analysis` — single Run, single Result rendering — Phase 8 ✓
- `comparison` — split-view rendering — deferred to Phase 5 of conceptual rollout
- `sweep` — parameter scan — deferred
- `agent` — Agent-driven — deferred
- `gate` — pure decision — deferred
- `milestone` — roll-up — deferred

For non-`analysis` types, Phase 8 renders a "this card type is coming soon — open in legacy view" state with a fallback link to the existing CardDetail side-sheet (kept as `?legacy=1` query param).

## Visual reference

- Sensor Manager screenshot from user (Apr 26, 2026): persistent sidebar with status panel at bottom, per-page top bar with Deploy CTA top-right, big hero with emoji + title + description, "Available X" tables with checkboxes, inline "+ Add Custom Y" CTA, two-column "Sequence | Status" at bottom.
- Dashboard layout (existing): hero card with sparkle pill, stats row of 4 metric cards, two-col content panels.
- Workflow Studio layout (existing): floating top capsule with version pill + tabs + utility chips, three-pane (left/canvas/right), floating bottom action bar with Run + Chat.

## Open questions resolved during design

| Question | Decision |
|---|---|
| Tabs at the top (Workflow-Studio-style)? | **No.** Card is a hub, not an editor. Sections render inline; "View All" links open sub-routes/drawers later. |
| Run Card button color? | **Charcoal/black** matching Workflow Studio's "Run Workflow." Not Execute-blue. |
| Hero gradient per Mode? | **No** for Phase 8. The Mode badge is the visual cue. Hero stays orange (Govern surface). |
| Comparison split-view? | **Out of scope.** `comparison` Card type defers to Phase 5 of rollout. |
| Notes blocks (Notion-style)? | **Plain textarea** in Phase 8. Block tree is Phase 4 of rollout. |
| Renderer registry? | **Out of scope.** Results section is artifact-list with download links. Phase 2a of rollout. |

## Wave breakdown

- **Wave 1 (08-01):** Foundation — route, navigation, shell, top bar, sidebar augmentation. Validates the chrome before building the body. ~3 dev-days.
- **Wave 2 (08-02):** Body composition — hero, configuration tables, KPI form, sequence + status, action bar, lifecycle, mode rules, tests. ~4 dev-days.

Total: ~7 dev-days, ~1.5 calendar weeks single-dev.

## Risks

| Risk | Mitigation |
|---|---|
| Existing `CardDetail.tsx` side-sheet has wiring (e.g., D7 IntentSpec linkage) we don't fully understand | **08-01-T-01 codebase audit task** explicitly reads CardDetail.tsx end-to-end before deleting any callers |
| `useGates` + gate-mutation hooks missing on frontend | **08-02-T-09** adds them with kernel endpoints already in place; if endpoints aren't wired we degrade gracefully (Gates panel shows "no data") |
| Mode promotion UX (Explore → Study → Release) is not in Phase 8 | Out of scope; promotion lives on the Board page, not a Card. Phase 8 only *reads* the Mode and applies affordances. |
| Card status enum mismatch surfaces as visual confusion | Acknowledged; Phase 8 displays existing statuses verbatim. Concept-vs-backend reconciliation is its own task. |
| `BoardDetailPage` Cards-tab UI assumes the side-sheet pattern; replacing the click-handler may break other features | **08-01-T-04** keeps the side-sheet code mounted behind `?legacy=1` query param fallback for one release |

## Acceptance for Phase 8 overall

- [ ] `/cards/:cardId` route renders for every existing Card without TypeError
- [ ] All 4 lifecycle stages (draft, configured, running, completed) render correctly
- [ ] Mode-aware affordances correctly apply (Explore allows everything; Study locks Inputs and Intent after first Run; Release hides manual Evidence add)
- [ ] BoardDetailPage Cards click navigates; legacy side-sheet behind `?legacy=1` fallback for one release
- [ ] `▶ Run Card` action invokes `useExecutePlan` and shows live progress in the Sequence panel
- [ ] `tsc --noEmit` clean (default + strict `tsconfig.app.json`)
- [ ] `vitest run` passes new tests for: page renders for each lifecycle stage, top-bar shows correct Mode badge, BoardDetailPage navigation, Run mutation
- [ ] No console errors on page load; no broken cross-doc links in `concepts/`
