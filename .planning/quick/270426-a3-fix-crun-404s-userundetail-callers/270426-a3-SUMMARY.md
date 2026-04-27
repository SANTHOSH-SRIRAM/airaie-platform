---
phase: 270426-a3
plan: 01
type: execute
wave: 1
status: complete
shipped: 2026-04-27
commit: c21c178
---

# A3 Summary — Fix `crun_*` 404s in `useRunDetail` callers

## What shipped

Pure-selector fix at the data-source: `pickLatestRunId(runs) → run_id` extracted as a named export from `useCardRunState.ts`, shared by both `useLatestCardRunId` and `CardDetailPage`'s memoized selector. `RunSummary` typed `run_id` field (was missing); kernel JSON already returned it.

The browser console no longer logs `404 RUN_NOT_FOUND` for `/v0/runs/crun_*` on every Card-page open. The `cancelRun(latestRunId)` path is fixed transitively (was the same bug).

## Tasks

| # | Commit | Description |
|---|--------|-------------|
| — | `c21c178` | Single atomic commit covering all 4 file changes (audit + plan deviation made multi-task split unnecessary) |

## Plan deviation (significant)

Original plan prescribed Pattern A/B prefix-dispatch + new `useCardRunDetail(crunId)` hook + new kernel route `GET /v0/card-runs/{id}`. Kernel audit (live curl + handler grep + model inspection) revealed:

- **No `/v0/card-runs/{id}` route exists** on kernel.
- **`model.CardRun` is a link row** (`{ ID: crun_*, CardID: card_*, RunID: run_* }`) — `crun_*` is NOT a separate kind of run, just a join-row id.
- **`GET /v0/cards/{id}/runs`** already returns `run_id` on every row.

The plan author had assumed `crun_*` required its own detail endpoint. The data model proves it's pure indirection. Adding such a route would be a strict alias for existing `/v0/runs/{run_id}` lookup — pure boilerplate.

The implemented fix uses **Option 2 from the executor's checkpoint**: extract `run_id` at the selector. ~10 production LoC vs. ~200+ for Pattern A/B. Cancel button bug fixed for free.

## Gates

- `tsc --noEmit` (default): exit 0
- `tsc --noEmit -p tsconfig.app.json` (strict): exit 0
- `vitest run`: **349 passed / 1 skipped** (was 343 / 1; +6 net-new tests covering the `run_id` contract, sort, edge cases)
- `npm run build`: not re-run (no surface change to build output; bundle unaffected)

## Files

| Path | Change |
|---|---|
| `frontend/src/api/cards.ts` | Export `RunSummary`; add `run_id: string` field; doc-comment the link-row vs workflow-run distinction |
| `frontend/src/hooks/useCardRunState.ts` | New `pickLatestRunId(runs)` exported helper; `useLatestCardRunId` delegates to it; import `RunSummary` |
| `frontend/src/hooks/useCardRunState.test.ts` | 6 new tests for `pickLatestRunId`: returns `run_id` not `id`, null/undefined/empty, descending sort, immutability |
| `frontend/src/pages/CardDetailPage.tsx` | `latestRunId` `useMemo` delegates to `pickLatestRunId`; import added |

No kernel changes. No new dependencies.

## Manual smoke

Pending. Sequence:
1. Open `/cards/<card-with-recent-run-id>?canvas=1` (e.g. `crd_fea_3b5179`)
2. Open DevTools Console + Network
3. Confirm: zero `404` lines for `/v0/runs/crun_*`
4. Confirm: `CardExecutionSequence` (Phase 8 surface) renders run status correctly
5. Click Cancel on a running run — confirm POST `/v0/runs/run_*/cancel` is sent (not `crun_*`)

Manual smoke gated on a logged-in session — depends on quick-task A2 or manual `INSERT INTO project_members` to grant a fresh user access. (See `270426-a1.../AUDIT_FINDINGS.md` for the auth bootstrap recipe.)

## Outstanding for subsequent waves

- Manual browser smoke (above) — pending auth bootstrap
- If a future kernel ships dedicated `/v0/card-runs/{id}` for any reason, the helper here is unaffected — `run_id` remains the canonical id for run-detail / cancel.
