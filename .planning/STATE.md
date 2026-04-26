# Project State

Last activity: 2026-04-26 - Completed Phase 8 plan 08-02: Card-as-page Body Composition (Wave 2)

## Active Milestone

v1 unified-platform frontend — Phases 1–4 closed; **Phase 8 fully complete (Waves 1+2)**. Card-as-page is functional from day one: `/cards/:cardId` renders a Hero, configuration tables (Inputs/Methods/KPIs), live two-column Sequence+Status, and a floating CardActionBar. CardTopBar and CardActionBar share a single `useCardRunState` hook so Run actions sync across surfaces within one render cycle.

## Recent Activity

- **2026-04-26** — Phase 8 plan `08-02` complete: full body composition for the Card-as-page route. The Run state machine that lived inline in CardTopBar (Wave 1) was promoted to a shared `useCardRunState` hook with a 7-stage discriminated union (no-intent / no-inputs / no-plan / ready / running / completed / failed); CardTopBar was refactored to consume it and CardActionBar was built on top. Cross-surface sync invariant verified by pure-function tests of the shared `deriveCardRunStage` helper. 12 tasks shipped as 14 atomic commits (T7 split into 7a/7b/7c). 251 vitest tests passing (37 net-new), both typechecks clean. New components: CardHero, AvailableInputsTable, AvailableMethodsTable, AddCustomKpiForm, ConfigSection, CardExecutionSequence, CardStatusPanel, CardActionBar, EmptyDraftIntent, UnsupportedCardTypeFallback. New hooks: useCardModeRules, useCardRunState, useCardGates, useArtifactList, useIntentTypePipelines. SUMMARY at `.planning/phases/08-card-as-page/08-02-SUMMARY.md`.
- **2026-04-26** — Phase 8 plan `08-01` complete: per-card route `/cards/:cardId` shipped with a fully functional Run state machine (Draft → Generate → Run → Cancel — no `console.info` stubs), inline title editing, breadcrumb navigation, sidebar context blocks (`ThisBoardNav` + `ThisCardStatusPill`), and `BoardDetailPage` legacy fallback behind `?legacy=1`. 9 atomic commits (T1 `9872ea0` through T8 `db380a7` plus T4 follow-up `34523da`). All gates green (default + strict typecheck, 214 vitest tests passing — 13 net-new across 2 new test files using pure-helper style since `@testing-library/react` is not yet installed). 8 files created, 6 modified. SUMMARY at `.planning/phases/08-card-as-page/08-01-SUMMARY.md`.
- **2026-04-25** — Quick task `260425-f10` polished three Agent Playground UX bugs: reload no longer auto-creates a duplicate session (gated `useSessionList.isLoading`), assistant byline reads the real agent name (threaded `agentName` prop through `ChatInterface` → `ChatMessage`, killed the hardcoded `'FEA Optimizer'` constant), and the Inspector "Messages" counter uses `extractMessages(activeSession).length` instead of the byte length of the base64 history string. Single commit `fe67e4f`, 4 files, tsc clean.
- **2026-04-25** — Audit of `/workflow-runs` against live kernel surfaced backend route gaps (`/v0/workflows/{id}/runs` 404, `/retry` 404, SSE 500, `cancel` 500 on terminal runs) and ~6 frontend shape mismatches. Quick task `260425-e2a` shipped frontend mapper layer, un-hardcoded workflow id, fixed envelope unwrap and empty-id hook guards. Page now renders 37 real runs against `wf_737cd510` with 0 console errors.

## Blockers/Concerns

- 4 remaining `wf_fea_validation` hardcodes in unrelated pages (`WorkflowEditorPage`, `WorkflowDetailPage`, `WorkflowsPage`, `GlobalSearch`) — same bug class, separate fix-it.
- New users registered through `/v0/auth/register` have zero project memberships → 403 on every API call. Either auto-attach to default project or have registration accept a project id.
- DSL parsing (`workflow.versions[0].dsl` base64 JSON → `steps[]`) not yet implemented; the editor and DAG viewer can't show graph structure until that lands.
- Backend gaps tracked in `260425-e2a-SUMMARY.md` "Backend Gaps Surfaced" section.
- **Frontend testing infra:** `@testing-library/react` is not installed and vitest env=node, so DOM-render tests can't be written. Unit tests follow a "pure-helper" pattern (extract logic, test in isolation). A post-MVP infra task should wire jsdom + testing-library so future plans can write actual JSX tests. 08-02 added 37 net-new tests using this pattern, including the load-bearing `deriveCardRunStage` and `computeLifecycleStage` helpers.
- **`useGates` and gate-mutation hooks** — landed in 08-01; gate-id-scoped versions (`useApproveGate / useRejectGate / useWaiveGate`) exist. 08-02 added card-scoped `useCardGates(cardId, boardId)` that walks the Board's gates and filters by `requirement.config.card_id`. Backend has no `/v0/cards/{id}/gates` route; the join is client-side and degrades to `[]` on 404.
- **`/v0/cards/{id}/gates` not present on kernel** — composed client-side via `listCardGates(boardId, cardId)` walking gate requirements. If a future kernel ships the dedicated route, swap the API function and remove the client-side join.
- **`@airaie/shell` AppShell does not yet provide a CardActionBar slot** — Phase 8 mounts CardActionBar directly via `position: fixed` on the page. If a unified bottom-bar slot ships in a later phase, refactor to consume it.

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260425-f10 | Polish 3 Agent Playground UX bugs (reload session reuse + agent byline + Inspector Messages count) | 2026-04-25 | fe67e4f | [260425-f10-polish-3-visible-bugs-in-agent-playgroun](./quick/260425-f10-polish-3-visible-bugs-in-agent-playgroun/) |
| 260425-e2a | Fix Phase 4 workflow-runs frontend (mapper + un-hardcode + envelope unwrap) | 2026-04-25 | 72e52f1 | [260425-e2a-fix-phase-4-workflow-runs-frontend-to-wo](./quick/260425-e2a-fix-phase-4-workflow-runs-frontend-to-wo/) |
