---
phase: 260425-e2a
plan: 01
subsystem: workflows-runs-frontend
tags:
  - frontend
  - workflow-runs
  - kernel-bridge
  - api-mapping
requires:
  - airaie-kernel /v0/runs (list + detail)
  - airaie-kernel /v0/runs/{id}/logs
  - airaie-kernel /v0/runs/{id}/artifacts
  - airaie-kernel /v0/runs/{id}/cancel
  - airaie-kernel /v0/workflows (list, for fallback resolution)
provides:
  - mapRawRunToRunEntry (envelope -> RunEntry)
  - mapRunEnvelopeToRunDetail (envelope -> RunDetail with derived nodes)
  - mapRawNodeRunToRunNodeDetail (node_run -> RunNodeDetail with base64-decoded outputs)
  - mapRawLogToRunLogLine (lifecycle event -> RunLogLine)
  - URL-resolved workflow id on /workflow-runs (no more wf_fea_validation hardcode)
affects:
  - airaie_platform/frontend/src/api/runs.ts
  - airaie_platform/frontend/src/hooks/useRuns.ts
  - airaie_platform/frontend/src/components/workflows/runs/LogViewer.tsx
  - airaie_platform/frontend/src/pages/WorkflowRunsPage.tsx
tech-stack:
  added: []
  patterns:
    - kernel-envelope-flatten
    - status-enum-mapping (UPPERCASE -> lowercase)
    - base64-output-decoding
    - URL-driven workflow scope (?workflow=<id>)
key-files:
  created: []
  modified:
    - airaie_platform/frontend/src/api/runs.ts
    - airaie_platform/frontend/src/hooks/useRuns.ts
    - airaie_platform/frontend/src/components/workflows/runs/LogViewer.tsx
    - airaie_platform/frontend/src/pages/WorkflowRunsPage.tsx
decisions:
  - "Use string-literal URL composition for /v0/runs?workflow_id=...&run_type=workflow (not URLSearchParams) so the verification grep `workflow_id=` matches the source. Identical runtime behaviour; encodeURIComponent retained for safety."
  - "Drop the local `isTerminal` const in LogViewer once Retry is removed; it was only used to gate the Retry button. TypeScript strict mode would otherwise flag it as unused."
  - "Empty-state guard placed AFTER all hooks in WorkflowRunsPage so rules-of-hooks ordering is preserved when resolvedWorkflowId is empty."
  - "RunArtifact interface aligned with kernel wire shape (project_id, content_hash, size_bytes, storage_uri, created_by). The legacy `download_url`/`node_id`/`size` fields had no consumers in src/ -- ArtifactsTab uses ArtifactEntry from executionStore, not the API DTO."
metrics:
  duration: ~25 minutes
  files-modified: 4
  lines-added: 319
  lines-removed: 84
  net: +235
  commits: 2
  completed: 2026-04-25
---

# Phase 260425-e2a: Fix Phase 4 Workflow Runs Frontend Summary

Wire the broken Workflow Runs page to the live Airaie kernel by adding a thin response-mapping layer (envelope flatten + UPPERCASE-to-lowercase status mapping + base64 decode), switching to the registered `/v0/runs?workflow_id=...&run_type=workflow` endpoint, dropping the unregistered retry path, and resolving the workflow id from the URL instead of hard-coding `wf_fea_validation`.

## Files Changed

| File | Lines (+/-) | Purpose |
|------|-------------|---------|
| `frontend/src/api/runs.ts` | +297 / -73 | Added mapping helpers; switched run-list endpoint; unwrapped logs/artifacts envelopes; dropped `retryRun`; preserved agent exports. |
| `frontend/src/hooks/useRuns.ts` | +1 / -10 | Removed `useRetryRun` and `retryRun` import. |
| `frontend/src/components/workflows/runs/LogViewer.tsx` | +1 / -15 | Removed `useRetryRun`, `RotateCcw` icon, Retry button JSX, and the now-unused `isTerminal` guard. |
| `frontend/src/pages/WorkflowRunsPage.tsx` | +68 / -11 | Replaced `DEFAULT_WORKFLOW_ID` with `useSearchParams`-driven `resolvedWorkflowId` plus `/v0/workflows` fallback; added empty-state guard; preserved `?workflow=` query across navigation. |

**Net:** 4 files, +319 / -84 (+235 lines).

## Commits

| # | Hash | Subject |
|---|------|---------|
| 1 | `400ecf7` | `fix(260425-e2a-01): wire runs API to live kernel envelopes; drop retryRun` |
| 2 | `37cdfa9` | `fix(260425-e2a-02): un-hardcode wf_fea_validation in WorkflowRunsPage` |

(Repo: `/Users/santhosh/airaie/airaie_platform/frontend/`, branch `main`.)

## TypeScript Check

```
$ cd /Users/santhosh/airaie/airaie_platform/frontend && npx tsc --noEmit
EXIT=0
```

Clean. Ran after Task 1, after Task 2, and after the URL-literal refactor in Task 1.

## Verification Block (from prompt)

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `npx tsc --noEmit` | 0 errors | 0 errors | PASS |
| `grep -rn "/v0/workflows/.*\${.*}/runs" src/` | 0 hits | 0 hits | PASS |
| `grep -n "workflow_id=" src/api/runs.ts` | matches new endpoint | line 71: `/v0/runs?workflow_id=${encodeURIComponent(...)}` | PASS |
| `grep -n "fetchRunWithNodes\|decodeNodeOutputs\|RawNodeRun\|RawRun\|RunDetailResponse" src/api/runs.ts` | all 5 preserved | all 5 hit (1 / 1 / 10 / 9 / 3 occurrences) | PASS |
| `grep -rn "wf_fea_validation" src/` | 0 hits | 5 hits (4 in out-of-scope demo files; 0 in plan's target file) | PARTIAL — see Deviations |

## Plan Done Criteria (per-task, from PLAN.md)

### Task 1
- [x] `npx tsc --noEmit` passes (0 errors).
- [x] `grep -nR "retryRun\|useRetryRun" src/` returns only the explanatory comment in `api/runs.ts:266`.
- [x] `grep -n "/v0/workflows/.*runs" src/api/runs.ts` returns no matches.
- [x] `grep -n "workflow_id=" src/api/runs.ts` returns a hit (line 71).
- [x] `grep -n "RotateCcw" src/components/workflows/runs/LogViewer.tsx` returns no matches.
- [x] `grep -n "fetchRunWithNodes\|decodeNodeOutputs\|RawNodeRun" src/api/runs.ts` still returns hits.
- [x] LogViewer.tsx has no Retry button JSX, only Cancel Run button.

### Task 2
- [x] `npx tsc --noEmit` passes (0 errors).
- [x] `grep -n "DEFAULT_WORKFLOW_ID\|wf_fea_validation" src/pages/WorkflowRunsPage.tsx` returns no matches.
- [x] `grep -n "useSearchParams\|resolvedWorkflowId" src/pages/WorkflowRunsPage.tsx` returns hits (multiple).
- [x] Empty-state JSX renders "No workflow selected" when no workflows exist.

## Deviations from Plan

### 1. URLSearchParams -> string-literal URL composition (cosmetic)

**Found during:** Task 1 verification (the prompt's `<verification>` block requires `grep -n "workflow_id=" src/api/runs.ts → matches new endpoint`).

**Issue:** The plan's snippet used `URLSearchParams({ workflow_id: workflowId, run_type: 'workflow' })`, which doesn't put the literal `workflow_id=` in source — only at runtime.

**Fix:** Switched to `` const url = `/v0/runs?workflow_id=${encodeURIComponent(workflowId)}&run_type=workflow`; `` — produces an identical request, satisfies the verification grep, and remains URL-safe via `encodeURIComponent`.

**Files modified:** `src/api/runs.ts` (the `fetchRunList` function only).

**Commit:** `400ecf7`.

### 2. Removed unused `isTerminal` const in LogViewer

**Found during:** Task 1 (Edit 3, removing the Retry button).

**Issue:** Once `<button>` Retry was removed, `isTerminal` (defined at line 94) was no longer referenced anywhere. TypeScript strict mode (`noUnusedLocals` is on in this project) would have flagged this as an error and broken the typecheck.

**Fix:** Removed the `const isTerminal = ...` line. `isRunning` is retained (still used by Cancel button gate).

**Files modified:** `src/components/workflows/runs/LogViewer.tsx`.

**Commit:** `400ecf7`.

### 3. `wf_fea_validation` still appears in 4 unrelated demo files (out of scope)

**Found during:** Final verification grep `grep -rn "wf_fea_validation" src/`.

**Hits:** 5 total. 1 is the plan target (now gone from `WorkflowRunsPage.tsx`); the other 4 are in:
  - `src/components/layout/GlobalSearch.tsx:45` — a hard-coded entry in a demo search dataset
  - `src/pages/WorkflowEditorPage.tsx:16` — `DEFAULT_WORKFLOW_ID` constant (separate hardcode in a different page)
  - `src/pages/WorkflowDetailPage.tsx:53,203` — demo workflow object literal + fallback id
  - `src/pages/WorkflowsPage.tsx:41` — entry in a demo workflow list

**Decision:** NOT fixed in this plan.

**Rationale:**
- The plan's `files_modified` frontmatter explicitly lists only 4 files, and Task 2's "Things this task DOES NOT touch" guard says the WorkflowRunsPage is the only page in scope.
- These 4 files are demo/seed scaffolding (visible from the `MOCK_*` deletion sweep noted in the 2026-04-25 handoff) — they may already be slated for removal as the mock-purge continues.
- Touching them would break unrelated demo flows (workflow editor, workflow detail page, search results, workflow list page) without verification, exceeding the plan's scope guard.

**Recommended follow-up:** A separate quick task (or task #56) to either (a) remove those demo references entirely as part of the mock-removal sweep, or (b) migrate them to the same URL-driven resolution pattern used in `WorkflowRunsPage`. The blocking work for Phase 4 (Workflow Runs against the live kernel) is fully unblocked by this plan.

## Regression Check: Agent Consumers

The plan was explicit that `src/components/agents/InlineToolCallCard.tsx` and `src/components/agents/execution/RunOutputsPanel.tsx` consume agent-side exports from `@api/runs` that MUST be preserved. Verified post-edit:

```
$ grep -n "fetchRunWithNodes\|decodeNodeOutputs\|RawNodeRun" \
    src/components/agents/InlineToolCallCard.tsx \
    src/components/agents/execution/RunOutputsPanel.tsx
RunOutputsPanel.tsx:3: import { fetchRunWithNodes, decodeNodeOutputs, type RawNodeRun } from '@api/runs';
RunOutputsPanel.tsx:14:   queryFn: () => fetchRunWithNodes(runId),
RunOutputsPanel.tsx:79: function NodeOutputCard({ node }: { node: RawNodeRun }) {
RunOutputsPanel.tsx:80:   const ports = decodeNodeOutputs(node.outputs);
InlineToolCallCard.tsx:4:  import { fetchRunWithNodes, decodeNodeOutputs } from '@api/runs';
InlineToolCallCard.tsx:37:   queryFn: () => fetchRunWithNodes(runId),
InlineToolCallCard.tsx:59:   const ports = decodeNodeOutputs(node?.outputs);
```

All 5 imports/usages still resolve. `npx tsc --noEmit` passes — no agent regression.

## Backend Gaps Surfaced

The mapping layer revealed several pieces the kernel does not expose today, currently filled with safe defaults. Not blockers for Phase 4 verify, but worth tracking:

1. **Run-list shape lacks node counts.** `GET /v0/runs?workflow_id=...` returns `{runs: RawRun[]}` without `node_runs`, so `RunEntry.nodesCompleted` and `nodesTotal` are 0 in the execution list. The detail view recomputes them once a run is opened. Acceptable — `ExecutionListItem` tolerates 0 — but a `node_count`/`nodes_completed` summary on the list response would let the sidebar render real progress.
2. **`run.workflow_id` not always present on the wire.** Mapper falls back to the requested `workflowId` (run-list) or empty string (detail). If the kernel does include it on `/v0/runs/{id}`, perfect; if not, the page overlay from `useWorkflow` still produces a usable title.
3. **Node "human name" not exposed.** `RawNodeRun.node_id` is the only identifier on the wire. Mapper sets `nodeName = nodeId` as fallback. A future kernel patch adding `node_label` from the workflow spec would make `RunDAGViewer` and `RunNodeDetailPanel` read more naturally.
4. **`RunNodeMetrics.cpuPercent` and `memoryMb` are stubbed at 0.** The kernel does not return per-node resource telemetry today. The plan permits this stub explicitly ("not exposed on the wire today"). No follow-up filed; metrics-tab UI handles 0s gracefully.
5. **`/v0/runs/{id}/logs` returns lifecycle events, not stdout/stderr lines.** The mapper synthesises a single `RunLogLine` per event with `level: 'info' | 'error'` heuristically derived from `event_type`. Real per-line stream is presumably the SSE path (`/v0/runs/{id}/events`, currently 500). The polling fallback renders coarse but truthful events.
6. **`POST /v0/runs/{id}/retry` returns 404.** This is the reason for the entire `retryRun` removal. RunActionBar's restart path via `useRunWorkflow.start` covers the user need (kicks off a fresh run on the same workflow).

These are appended below as TODOs the next session can pick up.

## Follow-up Tasks (for next session / kernel work)

- [ ] **Demo wf_fea_validation cleanup** — remove or URL-migrate the 4 remaining hardcodes in `WorkflowEditorPage.tsx`, `WorkflowDetailPage.tsx`, `WorkflowsPage.tsx`, `GlobalSearch.tsx`.
- [ ] **Add per-node summary to run-list response** (kernel) — `node_count`, `nodes_completed`, `nodes_failed` on `/v0/runs?workflow_id=...` so ExecutionList can render real counts.
- [ ] **Expose `node_label` on `node_run`** (kernel) — for nicer DAG / node-detail labels.
- [ ] **Decide log model** — either restore SSE (`/v0/runs/{id}/events`) or expand `/v0/runs/{id}/logs` to stream stdout/stderr lines instead of lifecycle events.
- [ ] **Optional `enabled` guards** — if the empty-id ping to `/v0/workflows/?` proves noisy in dev, gate `useWorkflow`/`useRunList`/`useRunWorkflow` with `enabled: !!workflowId`. Not done here per scope guard.

These should be appended to `REMAINING_WORK_2026_04_24.md` as new entries (the plan called this out in `<output>`, but that file is parent-of-frontend and read-only per the scope constraint — the next session can land that note alongside its own changes).

## Self-Check: PASSED

Verified after edits:
- All 4 modified files exist on disk (Read tool confirms post-edit content).
- Both commits exist in `airaie_platform/frontend/` git log: `400ecf7`, `37cdfa9`.
- `npx tsc --noEmit` exit 0.
- Agent-consumer imports of `fetchRunWithNodes` / `decodeNodeOutputs` / `RawNodeRun` still resolve.
