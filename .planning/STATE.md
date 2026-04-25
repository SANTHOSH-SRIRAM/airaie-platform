# Project State

Last activity: 2026-04-25 - Completed quick task 260425-f10: Polish 3 visible bugs in Agent Playground

## Active Milestone

v1 unified-platform frontend — Phases 1–4 closed; Phase 5 (Agent Playground) next per `ROADMAP.md`.

## Recent Activity

- **2026-04-25** — Quick task `260425-f10` polished three Agent Playground UX bugs: reload no longer auto-creates a duplicate session (gated `useSessionList.isLoading`), assistant byline reads the real agent name (threaded `agentName` prop through `ChatInterface` → `ChatMessage`, killed the hardcoded `'FEA Optimizer'` constant), and the Inspector "Messages" counter uses `extractMessages(activeSession).length` instead of the byte length of the base64 history string. Single commit `fe67e4f`, 4 files, tsc clean.
- **2026-04-25** — Audit of `/workflow-runs` against live kernel surfaced backend route gaps (`/v0/workflows/{id}/runs` 404, `/retry` 404, SSE 500, `cancel` 500 on terminal runs) and ~6 frontend shape mismatches. Quick task `260425-e2a` shipped frontend mapper layer, un-hardcoded workflow id, fixed envelope unwrap and empty-id hook guards. Page now renders 37 real runs against `wf_737cd510` with 0 console errors.

## Blockers/Concerns

- 4 remaining `wf_fea_validation` hardcodes in unrelated pages (`WorkflowEditorPage`, `WorkflowDetailPage`, `WorkflowsPage`, `GlobalSearch`) — same bug class, separate fix-it.
- New users registered through `/v0/auth/register` have zero project memberships → 403 on every API call. Either auto-attach to default project or have registration accept a project id.
- DSL parsing (`workflow.versions[0].dsl` base64 JSON → `steps[]`) not yet implemented; the editor and DAG viewer can't show graph structure until that lands.
- Backend gaps tracked in `260425-e2a-SUMMARY.md` "Backend Gaps Surfaced" section.

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260425-f10 | Polish 3 Agent Playground UX bugs (reload session reuse + agent byline + Inspector Messages count) | 2026-04-25 | fe67e4f | [260425-f10-polish-3-visible-bugs-in-agent-playgroun](./quick/260425-f10-polish-3-visible-bugs-in-agent-playgroun/) |
| 260425-e2a | Fix Phase 4 workflow-runs frontend (mapper + un-hardcode + envelope unwrap) | 2026-04-25 | 72e52f1 | [260425-e2a-fix-phase-4-workflow-runs-frontend-to-wo](./quick/260425-e2a-fix-phase-4-workflow-runs-frontend-to-wo/) |
