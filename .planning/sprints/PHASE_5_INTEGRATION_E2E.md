# PHASE 5: INTEGRATION & END-TO-END FLOWS

> Wire all four layers (Tools, Workflows, Agents, Boards) into cohesive cross-component chains and prove the complete lifecycle with a realistic FEA validation scenario.

**Phase Start Date:** 2026-05-26 (after Phase 4 completes)
**Phase End Date:** 2026-06-07 (target, 12 working days)
**Total Sprints:** 3
**Phase Owner:** Engineering Lead
**Dependencies:** Phase 4 complete (all individual components working end-to-end in isolation)

---

## Sprint 5.1: Cross-Component Integration

**Sprint Duration:** 4 days (2026-05-26 to 2026-05-29)
**Sprint Goal:** Wire Board-to-Workflow-to-Agent-to-Tool execution chains and build the three cross-cutting pages (Dashboard, Approvals, Artifacts).

---

### Section 1: Objectives

1. Prove the full chain: Board card -> IntentSpec -> ExecutionPlan -> Workflow -> Tool execution -> Artifact -> CardEvidence -> Gate evaluation -> Pass/Fail.
2. Prove agent-within-board: Board card (agent type) -> Agent runs with board context -> Board mode overrides agent threshold -> Evidence auto-attached.
3. Enable cross-studio navigation: Board Studio can navigate to Workflow Studio and Agent Studio within the same React Router app, passing board context via query params.
4. Replace all mock data on the Dashboard with real API-backed widgets.
5. Build the unified Approval Queue page aggregating gate approvals and agent escalations.
6. Build the Artifact Browser page with filtering, lineage graph, and download.

---

### Section 2: Task Breakdown

#### 2A. Backend Tasks

| # | Task | File(s) | What Exists | What to Do | Complexity | Estimate |
|---|------|---------|-------------|------------|------------|----------|
| B1 | E2E integration test: Board card -> Plan -> Workflow -> Tool -> Evidence -> Gate | `internal/service/integration_test.go` (new), touches `plan_generator.go`, `plan_compiler.go`, `scheduler.go`, `evidence_collector.go`, `gate.go` | Individual components tested in Phases 1-4 | Write a Go integration test that programmatically: (1) creates a board in Study mode, (2) creates a card with IntentSpec (sim.fea, max_stress < 250 MPa), (3) locks the IntentSpec, (4) triggers plan generation (9-step pipeline), (5) compiles plan to workflow YAML, (6) publishes workflow version, (7) starts run with board_id and card_id, (8) waits for NATS dispatch -> Rust runner -> completion, (9) verifies artifacts in MinIO, (10) verifies CardEvidence created with metric_key=max_stress, evaluation=pass, (11) verifies gate auto-evaluates to PASSED. Use testcontainers for PostgreSQL, NATS, MinIO. | L | 1.5 days |
| B2 | E2E integration test: Agent within board context | `internal/service/agent_board_integration_test.go` (new), touches `runtime.go`, `board_mode.go`, `evidence_collector.go` | Agent runtime works standalone (Phase 3), board mode override coded (Sprint 3.2) | Write integration test: (1) create board in Study mode, (2) create agent-type card, (3) link agent to card, (4) run agent via RunAgent with board_id, (5) verify board mode threshold (0.75) overrides agent threshold (0.5) via max(agent, board), (6) agent proposes tool, policy checks with Study threshold, (7) tool executes, (8) verify evidence auto-attached to card, (9) verify agent decision trace includes board context injection. | L | 1 day |
| B3 | Dashboard API: aggregate real stats | `internal/handler/dashboard.go` | GET /v0/dashboard/stats returns mock data | Wire to real queries: `SELECT count(*) FROM workflows` for total_workflows, `SELECT count(*) FROM runs WHERE status='running'` for active_runs, `SELECT count(*) FROM agents` for total_agents, `SELECT count(*) FROM boards` for total_boards, `SELECT count(*) FROM gate_approvals WHERE status='pending'` for pending_approvals. Add GET /v0/dashboard/recent-activity endpoint returning last 20 events (run completions, gate changes, agent decisions) ordered by timestamp. | M | 0.5 days |
| B4 | Unified approvals API | `internal/handler/approval.go`, `internal/service/approval.go` | Gate approvals exist in gate service, agent escalations exist in agent service | Create GET /v0/approvals?status=pending&type=all endpoint that unions: (1) gate approvals from `gate_approvals` table with gate name, board name, requirements, (2) agent escalations from `agent_approvals` table with agent name, proposal summary, confidence. Support filters: status (pending/approved/rejected/all), type (gate/agent/all), board_id, date range. Add POST /v0/approvals/{id}/approve and POST /v0/approvals/{id}/reject that dispatch to the correct service. | M | 0.5 days |
| B5 | Artifacts browse API | `internal/handler/artifact.go` | GET /v0/artifacts exists for single artifact, GET /v0/artifacts?run_id=X exists | Add query params: type (mesh/result/report/config), workflow_id, board_id, card_id, date_from, date_to, sort_by (created_at/size/name). Add GET /v0/artifacts/{id}/lineage returning upstream artifacts (parent_artifact_id chain) and downstream artifacts (produced by runs that consumed this artifact). Return artifact records with: id, name, kind, size_bytes, sha256, content_type, run_id, workflow_id, board_id, created_at, download_url (presigned). | M | 0.5 days |

#### 2B. Frontend Tasks

| # | Task | File(s) | What Exists | What to Do | Complexity | Estimate |
|---|------|---------|-------------|------------|------------|----------|
| F1 | Dashboard wired to real APIs | `frontend/src/pages/DashboardPage.tsx`, `frontend/src/hooks/useDashboard.ts`, `frontend/src/api/dashboard.ts` | DashboardPage exists with useStats, useActiveRuns, useGovernance hooks; StatsRow, ActiveRunsWidget, RecentWorkflowsWidget, AgentActivityWidget, GovernanceWidget all exist | Wire useDashboard hooks to real endpoints: useStats -> GET /v0/dashboard/stats, useActiveRuns -> GET /v0/runs?status=running&limit=10, useGovernance -> GET /v0/approvals?status=pending&limit=10. Replace any remaining hardcoded "mock" data. Add auto-refresh every 30s using React Query refetchInterval. Verify StatsRow shows real counts, ActiveRunsWidget shows real running workflows with progress, RecentWorkflowsWidget shows last 5 completed, AgentActivityWidget shows recent agent decisions, GovernanceWidget shows pending gate approvals. | M | 0.5 days |
| F2 | Approval Queue page | `frontend/src/pages/ApprovalsPage.tsx` (new) | Does not exist in main platform (exists partially in agent-studio) | Build unified approvals page: (1) Tab bar: All / Gate Approvals / Agent Escalations, (2) each row: approval type icon, resource name (gate or agent), board name, timestamp, status badge, action buttons. (3) Expand row to show details: for gates show requirement checklist with pass/fail indicators; for agents show proposal summary, confidence score, reasoning, alternatives. (4) Approve button -> POST /v0/approvals/{id}/approve, Reject button -> POST /v0/approvals/{id}/reject with reason textarea. (5) Filter sidebar: status, board, date range. (6) Empty state when no pending approvals. | L | 1 day |
| F3 | Artifact Browser page | `frontend/src/pages/ArtifactsPage.tsx` (new) | Does not exist | Build artifact browser: (1) Table view with columns: Name, Type, Size, SHA-256 (truncated), Source Run, Workflow, Board, Created. (2) Filter bar: type dropdown (mesh/result/report/config/all), workflow selector, board selector, date range. (3) Search by name. (4) Click row -> slide-out detail panel: full metadata, download button (presigned URL), lineage graph. (5) Lineage graph: simple vertical tree using SVG showing parent artifacts above and child artifacts below the selected artifact, connected by lines. (6) Batch download: checkbox selection + download ZIP button. Wire to GET /v0/artifacts with query params and GET /v0/artifacts/{id}/lineage. | L | 1 day |
| F4 | Board -> Workflow Studio navigation | `frontend/src/pages/BoardDetailPage.tsx` or `frontend/src/pages/BoardStudioPage.tsx`, `frontend/src/App.tsx` | Board detail shows linked workflows as cards/list items; WorkflowEditorPage accepts :workflowId param | Add onClick handler to workflow items in board detail: `navigate(`/workflow-studio/${workflowId}?from=board&boardId=${boardId}&cardId=${cardId}`)`. The navigation stays within React Router (no page reload, no iframe). WorkflowEditorPage should read these query params via useSearchParams() and store them so the back-navigation breadcrumb (Sprint 5.2) can use them. | M | 0.25 days |
| F5 | Board -> Agent Studio navigation | `frontend/src/pages/BoardDetailPage.tsx` or `frontend/src/pages/BoardStudioPage.tsx`, `frontend/src/App.tsx` | Board detail shows linked agents; AgentStudioPage accepts :agentId param | Add onClick handler to agent items in board detail: `navigate(`/agent-studio/${agentId}?from=board&boardId=${boardId}&cardId=${cardId}`)`. Same single-app React Router navigation as F4. AgentStudioPage should read query params. | M | 0.25 days |
| F6 | Register routes for new pages | `frontend/src/App.tsx`, `frontend/src/constants/routes.ts` | App.tsx has routes for all existing pages; routes.ts defines ROUTES constant | Add to ROUTES: APPROVALS: '/approvals', ARTIFACTS: '/artifacts'. Add lazy imports: `const ApprovalsPage = lazy(() => import('@pages/ApprovalsPage'))`, `const ArtifactsPage = lazy(() => import('@pages/ArtifactsPage'))`. Add Route elements inside AppShell: `<Route path={ROUTES.APPROVALS} element={<LazyPage><ApprovalsPage /></LazyPage>} />`, `<Route path={ROUTES.ARTIFACTS} element={<LazyPage><ArtifactsPage /></LazyPage>} />`. Add to PAGE_TABS if desired (Approvals, Artifacts). | S | 0.25 days |

---

### Section 3: API Contracts

#### New Endpoints

**GET /v0/dashboard/stats**
```json
// Response 200
{
  "total_workflows": 12,
  "active_runs": 3,
  "total_agents": 5,
  "total_boards": 4,
  "pending_approvals": 7,
  "tools_registered": 18,
  "artifacts_total": 142,
  "runs_last_24h": 8
}
```

**GET /v0/dashboard/recent-activity?limit=20**
```json
// Response 200
{
  "activities": [
    {
      "id": "act_001",
      "type": "run_completed",
      "resource_id": "run_abc123",
      "resource_name": "FEA Stress Analysis Run #42",
      "board_id": "board_s7v2k9",
      "board_name": "Structural Validation Study",
      "timestamp": "2026-05-27T14:32:00Z",
      "details": { "status": "succeeded", "duration_sec": 127 }
    },
    {
      "id": "act_002",
      "type": "gate_approval_needed",
      "resource_id": "gate_thermal_001",
      "resource_name": "Thermal Evidence Gate",
      "board_id": "board_s7v2k9",
      "board_name": "Structural Validation Study",
      "timestamp": "2026-05-27T14:30:00Z",
      "details": { "gate_type": "review", "required_role": "lead_engineer" }
    }
  ]
}
```

**GET /v0/approvals?status=pending&type=all&limit=50&offset=0**
```json
// Response 200
{
  "approvals": [
    {
      "id": "appr_001",
      "approval_type": "gate",
      "resource_id": "gate_thermal_001",
      "resource_name": "Thermal Evidence Gate",
      "board_id": "board_s7v2k9",
      "board_name": "Structural Validation Study",
      "status": "pending",
      "created_at": "2026-05-27T14:30:00Z",
      "details": {
        "gate_type": "review",
        "requirements": [
          { "type": "role_signed", "role": "lead_engineer", "met": false },
          { "type": "metric_threshold", "metric": "max_temp", "operator": "lt", "threshold": 85, "met": true }
        ]
      }
    },
    {
      "id": "appr_002",
      "approval_type": "agent_escalation",
      "resource_id": "proposal_xyz",
      "resource_name": "FEA Optimizer Agent — Tool Selection",
      "board_id": "board_s7v2k9",
      "board_name": "Structural Validation Study",
      "status": "pending",
      "created_at": "2026-05-27T14:28:00Z",
      "details": {
        "agent_id": "agent_fea_opt_001",
        "confidence": 0.68,
        "threshold": 0.75,
        "proposed_tool": "mesh_refiner_v2",
        "reasoning": "Mesh density insufficient for convergence, recommend refinement pass",
        "alternatives": ["mesh_refiner_v1", "adaptive_mesh_tool"]
      }
    }
  ],
  "total": 7,
  "offset": 0,
  "limit": 50
}
```

**POST /v0/approvals/{id}/approve**
```json
// Request
{
  "comment": "Results verified. Stress within acceptable limits.",
  "role": "lead_engineer"
}
// Response 200
{
  "id": "appr_001",
  "status": "approved",
  "approved_by": "user_santhosh",
  "approved_at": "2026-05-27T15:00:00Z"
}
```

**POST /v0/approvals/{id}/reject**
```json
// Request
{
  "reason": "Mesh quality insufficient. Recommend re-run with finer mesh.",
  "role": "lead_engineer"
}
// Response 200
{
  "id": "appr_001",
  "status": "rejected",
  "rejected_by": "user_santhosh",
  "rejected_at": "2026-05-27T15:00:00Z"
}
```

**GET /v0/artifacts?type=result&board_id=board_s7v2k9&sort_by=created_at&limit=50**
```json
// Response 200
{
  "artifacts": [
    {
      "id": "art_stress_map_001",
      "name": "stress_map_v2.vtk",
      "kind": "measurement.result",
      "content_type": "application/octet-stream",
      "size_bytes": 8601600,
      "sha256": "a1b2c3d4e5f6...",
      "run_id": "run_abc123",
      "workflow_id": "wf_fea_val_001",
      "board_id": "board_s7v2k9",
      "card_id": "card_fea_001",
      "created_at": "2026-05-27T14:31:00Z",
      "download_url": "https://minio.local/airaie/artifacts/art_stress_map_001?X-Amz-..."
    }
  ],
  "total": 42,
  "offset": 0,
  "limit": 50
}
```

**GET /v0/artifacts/{id}/lineage**
```json
// Response 200
{
  "artifact_id": "art_stress_map_001",
  "upstream": [
    {
      "artifact_id": "art_mesh_001",
      "name": "bracket_mesh.stl",
      "kind": "geometry.mesh",
      "run_id": "run_abc123",
      "node_id": "mesh_gen_1",
      "relationship": "input_to_run"
    }
  ],
  "downstream": [
    {
      "artifact_id": "art_report_001",
      "name": "stress_report.pdf",
      "kind": "report.pdf",
      "run_id": "run_def456",
      "node_id": "report_gen_1",
      "relationship": "produced_from"
    }
  ]
}
```

#### Existing Endpoints Used (No Changes)

- `GET /v0/runs?status=running&limit=10` — active runs for dashboard
- `GET /v0/runs/{id}` — run detail
- `GET /v0/boards/{id}` — board detail
- `GET /v0/workflows` — workflow list for dashboard

---

### Section 4: Data Models

No new database tables. This sprint wires existing models together:

- **Run** — already has `board_id` and `card_id` fields (wired in Phase 4)
- **CardEvidence** — already exists (Phase 4, Sprint 4.4)
- **Gate / GateApproval** — already exists (Phase 4, Sprint 4.4)
- **Artifact** — already has `run_id`, `workflow_id` fields

The unified approvals endpoint is a **read-time union** of `gate_approvals` and `agent_approvals` tables, not a new table.

---

### Section 5: NATS Subjects

No new NATS subjects. This sprint validates the existing flow:

| Subject | Direction | Purpose |
|---------|-----------|---------|
| `airaie.jobs.tool.execution` | Go -> Rust | Dispatch tool execution job |
| `airaie.results.completed` | Rust -> Go | Tool execution result |
| `airaie.events.{runId}` | Go -> Frontend (SSE bridge) | Real-time run status updates |
| `airaie.events.evidence.collected` | Go internal | Trigger evidence evaluation after run |
| `airaie.events.gate.evaluated` | Go internal | Trigger gate status update after evidence |

---

### Section 6: Dependencies

| This Sprint Needs | From Phase/Sprint | Status |
|---|---|---|
| Tool execution in Docker | Phase 1 (Sprint 1.2) | Must be complete |
| Workflow compilation and scheduling | Phase 2 (Sprint 2.1, 2.2) | Must be complete |
| Expression resolution with board context | Phase 2 (Sprint 2.3) | Must be complete |
| Agent runtime with board mode override | Phase 3 (Sprint 3.2) | Must be complete |
| IntentSpec, cards, plan generation | Phase 4 (Sprint 4.1-4.3) | Must be complete |
| Evidence collection and gate evaluation | Phase 4 (Sprint 4.4) | Must be complete |
| Release packet generation | Phase 4 (Sprint 4.5) | Must be complete |

---

### Section 7: Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Integration test flaky due to timing (NATS message ordering) | Test failures block sprint | Medium | Use deterministic waits with polling (check DB state every 500ms, timeout after 30s) instead of sleep-based waits. Use testcontainers for isolated infra. |
| Dashboard API queries slow on large datasets | Poor UX on dashboard load | Low | Add database indexes on runs.status, gate_approvals.status, artifacts.board_id. Use COUNT estimates for total counts. Cache stats for 10s. |
| Approval Queue conflation of gate/agent approvals confuses users | UX confusion | Medium | Clear type icons (shield icon for gates, brain icon for agents), separate tabs, different detail layouts for each type. |
| Artifact lineage graph complex for deep chains | Performance, rendering | Low | Limit lineage depth to 5 levels. Lazy-load deeper levels on demand. |

---

### Section 8: Testing Strategy

| Test Type | What | How |
|-----------|------|-----|
| Integration (Go) | B1: Full chain Board->Plan->Workflow->Tool->Evidence->Gate | Testcontainers (Postgres, NATS, MinIO, Docker-in-Docker). Programmatic test creating all entities and asserting final state. Timeout: 120s. |
| Integration (Go) | B2: Agent in board context | Same testcontainers setup. Assert board mode threshold override, evidence attachment, decision trace includes board context. |
| API (Go) | B3-B5: Dashboard stats, approvals API, artifacts API | HTTP test client against running server. Seed DB with known data, assert response shapes and counts. |
| Component (React) | F1: Dashboard widgets render with real data shapes | Vitest + React Testing Library. Mock API responses matching the contracts above. Assert no "mock" or "placeholder" text renders. |
| Component (React) | F2: ApprovalsPage renders, filters, approve/reject actions | Vitest + RTL. Mock /v0/approvals responses. Assert tabs switch, filter works, approve button calls correct endpoint. |
| Component (React) | F3: ArtifactsPage renders, filters, lineage panel | Vitest + RTL. Mock artifact list and lineage responses. Assert table renders, filter changes trigger new fetch, lineage panel opens. |
| E2E (Playwright) | F4-F5: Board->Workflow Studio and Board->Agent Studio navigation | Navigate to board detail, click a workflow link, assert URL matches /workflow-studio/:id?from=board&boardId=X. Assert page loads without error. Repeat for agent. |

---

### Section 9: Definition of Done

- [ ] Integration test B1 passes: Board card -> Plan -> Workflow -> Tool -> Evidence -> Gate (full chain, real execution, real evidence, real gate evaluation)
- [ ] Integration test B2 passes: Agent within board context (board mode override verified, evidence auto-attached)
- [ ] GET /v0/dashboard/stats returns real counts from database (no hardcoded values)
- [ ] GET /v0/dashboard/recent-activity returns real activity feed
- [ ] GET /v0/approvals returns unified list of gate + agent approvals with correct filtering
- [ ] POST /v0/approvals/{id}/approve and /reject dispatch to correct backend service
- [ ] GET /v0/artifacts supports type, board_id, workflow_id, date filters
- [ ] GET /v0/artifacts/{id}/lineage returns upstream and downstream artifacts
- [ ] DashboardPage renders with real data (verified: no "mock" strings in rendered output)
- [ ] ApprovalsPage renders with tabs (All / Gate / Agent), approve/reject actions work
- [ ] ArtifactsPage renders with filter bar, table, lineage slide-out panel
- [ ] Board -> Workflow Studio navigation works via React Router (URL: /workflow-studio/:id?from=board&boardId=X)
- [ ] Board -> Agent Studio navigation works via React Router (URL: /agent-studio/:id?from=board&boardId=X)
- [ ] New routes registered in App.tsx and routes.ts
- [ ] No console errors in browser during navigation between studios

---

### Section 10: Sprint Schedule

| Day | Tasks | Owner |
|-----|-------|-------|
| Day 1 (May 26) | B1: Begin E2E integration test (setup testcontainers, create board/card/intent programmatically) | Backend |
| Day 1 (May 26) | F6: Register new routes + F4/F5: Board->Studio navigation wiring | Frontend |
| Day 2 (May 27) | B1: Complete E2E test (workflow execution, evidence, gate) + B2: Agent board integration test | Backend |
| Day 2 (May 27) | F1: Wire Dashboard to real APIs | Frontend |
| Day 3 (May 28) | B3: Dashboard stats API + B4: Unified approvals API + B5: Artifacts browse API | Backend |
| Day 3 (May 28) | F2: Build ApprovalsPage | Frontend |
| Day 4 (May 29) | Backend: Fix integration test issues, review, polish API responses | Backend |
| Day 4 (May 29) | F3: Build ArtifactsPage with lineage panel | Frontend |

---

### Section 11: Rollback Plan

If integration tests reveal fundamental issues in the cross-component chain:
1. **Isolate the broken link**: Run each segment independently (board->plan, plan->workflow, workflow->tool, tool->evidence, evidence->gate) to identify which junction fails.
2. **Revert to Phase 4 scope**: Dashboard, Approvals, and Artifacts pages can launch with mock data if real API wiring is blocked by backend issues. Flag with `MOCK_DATA=true` env var.
3. **Navigation changes are low-risk**: Board->Studio navigation is purely frontend React Router changes with no backend dependency; these can ship regardless.

---

### Section 12: Notes & Decisions

- **No separate ports / no iframes**: Board-to-studio navigation is strictly React Router within the single frontend app on port 3000. The old multi-app architecture (workflow-studio on :3001, agent-studio on :3002) is deprecated. All studio pages are lazy-loaded routes in `App.tsx`.
- **Unified approvals is a virtual union**: We do NOT create a new `approvals` table. The GET /v0/approvals endpoint performs a SQL UNION of `gate_approvals` and `agent_approvals` at query time, applying shared filters. This avoids data duplication and keeps each domain's approval logic independent.
- **Artifact lineage is computed, not stored**: Lineage is derived at query time by following `parent_artifact_id` pointers (upstream) and finding runs that consumed the artifact (downstream). No separate lineage table.
- **Dashboard refresh interval**: 30 seconds via React Query's refetchInterval. Not using WebSocket/SSE for dashboard stats (overkill; SSE reserved for run monitoring).

---
---

## Sprint 5.2: Cross-Page Studio Navigation

**Sprint Duration:** 3 days (2026-05-30 to 2026-06-01)
**Sprint Goal:** Implement seamless cross-studio navigation with context preservation, back-navigation breadcrumbs, unified routing configuration, and a platform notification system.

---

### Section 1: Objectives

1. Standardize route-based context passing across all studio pages so that any page can receive and interpret `from`, `boardId`, `cardId`, `workflowId`, and `agentId` query parameters.
2. Add back-navigation breadcrumbs so that when a user navigates from Board Studio to Workflow Studio (or Agent Studio), they see a "Back to [Board Name]" breadcrumb and can return in one click.
3. Audit and consolidate the routing configuration in `App.tsx` to ensure all studios are proper nested routes under a single React Router with consistent layout hierarchy.
4. Build a toast notification system for asynchronous events: run completions, gate approvals needed, and agent escalations.

---

### Section 2: Task Breakdown

#### 2A. Backend Tasks

This is a frontend-focused sprint. The only backend work is a lightweight notification endpoint.

| # | Task | File(s) | What Exists | What to Do | Complexity | Estimate |
|---|------|---------|-------------|------------|------------|----------|
| B1 | Notification feed API | `internal/handler/notification.go` (new), `internal/service/notification.go` (new) | No notification service exists | Create in-memory notification buffer (ring buffer, last 100 per user). Notifications generated on: (1) run status change (completed/failed), (2) gate status change (passed/failed/needs_approval), (3) agent escalation created. Expose GET /v0/notifications?since={timestamp}&limit=20. Each notification: id, type, title, body, resource_id, resource_type, board_id, read, created_at. Add POST /v0/notifications/{id}/read to mark as read. Initial implementation stores in-memory (PostgreSQL persistence deferred to Phase 6). | M | 0.5 days |

#### 2B. Frontend Tasks

| # | Task | File(s) | What Exists | What to Do | Complexity | Estimate |
|---|------|---------|-------------|------------|------------|----------|
| F1 | Route-based context passing (standardize) | `frontend/src/hooks/useStudioContext.ts` (new), all studio pages | Sprint 5.1 added query params for Board->Studio navigation; each page reads params independently | Create a shared hook `useStudioContext()` that extracts standard query params from the URL: `{ from, boardId, cardId, workflowId, agentId, runId }`. All studio pages import this hook instead of reading useSearchParams() directly. The hook also provides `buildStudioUrl(target, params)` helper for constructing links with context. Standardized param format: `/workflow-studio/:id?from=board&boardId=X&cardId=Y`, `/agent-studio/:id?from=board&boardId=X&cardId=Y`, `/agent-playground/:sessionId?from=agent-studio&agentId=X&boardId=Y`. | M | 0.5 days |
| F2 | Back-navigation breadcrumb | `frontend/src/components/navigation/StudioBreadcrumb.tsx` (new), all studio pages | No breadcrumb exists for cross-studio navigation | Build `<StudioBreadcrumb />` component: (1) reads `useStudioContext()`, (2) if `from` is set, fetches the source resource name (e.g., board name via GET /v0/boards/{boardId}), (3) renders: "Board: Structural Validation Study > Workflow Studio" with the board name as a clickable link back to `/boards/${boardId}`. (4) Use React Router's `navigate(-1)` as fallback if context is missing. (5) Style: small text above page title, left-arrow icon, muted color, hover highlight. Integrate into WorkflowEditorPage, AgentStudioPage, AgentPlaygroundPage by adding `<StudioBreadcrumb />` at the top of the page layout. | S | 0.5 days |
| F3 | Unified routing configuration audit | `frontend/src/App.tsx`, `frontend/src/constants/routes.ts` | App.tsx has flat route list; BoardDetailPage is outside AppShell; some routes use string literals | (1) Move BoardDetailPage inside AppShell (remove the standalone route, add as nested route with optional full-screen layout mode via a `fullScreen` prop or separate layout component). (2) Add any missing routes: `/boards/:boardId/studio` for Board Studio, `/tools/:toolId` for Tool Detail. (3) Replace all string literal paths with ROUTES constants. (4) Add ROUTES.BOARD_STUDIO, ROUTES.TOOL_DETAIL, ROUTES.AGENT_PLAYGROUND, ROUTES.WORKFLOW_RUNS to routes.ts. (5) Verify no duplicate routes (e.g., both `/workflow-studio` and `/workflow-studio/:workflowId` exist — consolidate to single parameterized route with optional param). (6) Add a catch-all redirect for unknown /studio paths. | S | 0.5 days |
| F4 | Notification system (toast) | `frontend/src/components/notifications/NotificationToast.tsx` (new), `frontend/src/components/notifications/NotificationCenter.tsx` (new), `frontend/src/hooks/useNotifications.ts` (new) | No notification system exists | (1) Create `useNotifications()` hook: polls GET /v0/notifications?since={lastTimestamp} every 10 seconds. Maintains local state of unread notifications. (2) `NotificationToast`: renders in bottom-right corner using a toast stack (max 3 visible). Each toast: icon (green check for run complete, orange bell for gate approval, purple brain for agent escalation), title, short body, dismiss button. Auto-dismiss after 8 seconds. Click navigates to the relevant resource. (3) `NotificationCenter`: bell icon in top nav bar with unread badge count. Click opens dropdown with notification list (last 20). Each item: icon, title, body, relative timestamp ("2 min ago"). Click marks as read and navigates. (4) Integrate NotificationToast in AppShell (rendered once, always visible). (5) Integrate NotificationCenter bell icon in the top navigation bar component. | M | 1 day |
| F5 | Update studio pages to use StudioBreadcrumb | `frontend/src/pages/WorkflowEditorPage.tsx`, `frontend/src/pages/AgentStudioPage.tsx`, `frontend/src/pages/AgentPlaygroundPage.tsx`, `frontend/src/pages/BoardStudioPage.tsx` | Pages render their own headers | Import and render `<StudioBreadcrumb />` at the top of each studio page, below the AppShell header and above the page-specific content. The breadcrumb only renders when `useStudioContext().from` is not null, so it is invisible during direct navigation. | S | 0.25 days |

---

### Section 3: API Contracts

#### New Endpoints

**GET /v0/notifications?since=2026-05-30T10:00:00Z&limit=20**
```json
// Response 200
{
  "notifications": [
    {
      "id": "notif_001",
      "type": "run_completed",
      "title": "Workflow Run Completed",
      "body": "FEA Stress Analysis Run #42 succeeded in 2m 7s",
      "resource_type": "run",
      "resource_id": "run_abc123",
      "board_id": "board_s7v2k9",
      "read": false,
      "created_at": "2026-05-30T14:32:00Z"
    },
    {
      "id": "notif_002",
      "type": "gate_approval_needed",
      "title": "Gate Approval Required",
      "body": "Thermal Evidence Gate needs lead_engineer sign-off",
      "resource_type": "gate",
      "resource_id": "gate_thermal_001",
      "board_id": "board_s7v2k9",
      "read": false,
      "created_at": "2026-05-30T14:30:00Z"
    },
    {
      "id": "notif_003",
      "type": "agent_escalation",
      "title": "Agent Escalation",
      "body": "FEA Optimizer Agent needs approval for mesh_refiner_v2 (confidence: 0.68)",
      "resource_type": "agent_proposal",
      "resource_id": "proposal_xyz",
      "board_id": "board_s7v2k9",
      "read": false,
      "created_at": "2026-05-30T14:28:00Z"
    }
  ],
  "unread_count": 3
}
```

**POST /v0/notifications/{id}/read**
```json
// Response 200
{
  "id": "notif_001",
  "read": true
}
```

#### Existing Endpoints Used

- `GET /v0/boards/{id}` — fetch board name for breadcrumb display
- `GET /v0/workflows/{id}` — fetch workflow name for breadcrumb display
- `GET /v0/agents/{id}` — fetch agent name for breadcrumb display

---

### Section 4: Data Models

**In-memory Notification Buffer (no database table yet):**

```go
type Notification struct {
    ID           string    `json:"id"`
    UserID       string    `json:"user_id"`       // future: per-user filtering
    Type         string    `json:"type"`           // run_completed, run_failed, gate_approval_needed, gate_passed, gate_failed, agent_escalation
    Title        string    `json:"title"`
    Body         string    `json:"body"`
    ResourceType string    `json:"resource_type"`  // run, gate, agent_proposal
    ResourceID   string    `json:"resource_id"`
    BoardID      string    `json:"board_id"`
    Read         bool      `json:"read"`
    CreatedAt    time.Time `json:"created_at"`
}

// Ring buffer: max 100 notifications per user, oldest evicted first
// Thread-safe with sync.RWMutex
// Notifications generated by event hooks in:
//   - scheduler.go: onRunCompleted/onRunFailed -> create notification
//   - gate.go: onGateEvaluated -> create notification if needs_approval or status changed
//   - runtime.go: onEscalation -> create notification
```

---

### Section 5: NATS Subjects

No new NATS subjects. Notification generation hooks into existing event handlers:

| Existing Event | New Side Effect |
|----------------|-----------------|
| Run completed (scheduler.onRunCompleted) | Generate `run_completed` notification |
| Run failed (scheduler.onRunFailed) | Generate `run_failed` notification |
| Gate needs approval (gate.onGateEvaluated where status=pending) | Generate `gate_approval_needed` notification |
| Agent escalation (runtime.onEscalation) | Generate `agent_escalation` notification |

---

### Section 6: Dependencies

| This Sprint Needs | From | Status |
|---|---|---|
| Board->Studio navigation (query params wired) | Sprint 5.1, tasks F4/F5 | Must be complete |
| New routes registered (ApprovalsPage, ArtifactsPage) | Sprint 5.1, task F6 | Must be complete |
| React Router setup in App.tsx | Existing (Phase 0 frontend) | Already exists |
| Board detail page with linked workflows/agents | Phase 4 frontend | Must be complete |

---

### Section 7: Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Polling every 10s for notifications creates unnecessary load | Server load, battery drain on client | Medium | Use ETag/If-None-Match for conditional responses (304 Not Modified when no new notifications). In Phase 7 (Sprint 7.9), upgrade to WebSocket for push notifications. |
| Breadcrumb board name fetch adds latency to page load | Visible loading state in breadcrumb | Low | Cache board/workflow/agent names in a Zustand store (populated on first fetch, stale after 5 minutes). Show "Loading..." placeholder only on first visit. |
| Route consolidation breaks existing bookmarks | Users lose saved URLs | Low | Keep all existing routes working. Add new routes alongside, do not remove old ones. Redirect deprecated routes to new canonical paths. |
| In-memory notification buffer lost on server restart | Notifications disappear | Medium | Acceptable for Phase 5 (development phase). Phase 6 adds PostgreSQL persistence for notifications. Document this limitation. |

---

### Section 8: Testing Strategy

| Test Type | What | How |
|-----------|------|-----|
| Unit (TypeScript) | useStudioContext hook parses query params correctly | Vitest: render hook with MemoryRouter providing various query strings. Assert extracted values match. |
| Unit (TypeScript) | buildStudioUrl constructs correct URLs | Vitest: call with various targets and params, assert URL strings. |
| Component (React) | StudioBreadcrumb renders correct text and link | Vitest + RTL: provide mock useStudioContext return value, mock board name API. Assert "Back to Structural Validation Study" renders. Assert click navigates correctly. |
| Component (React) | StudioBreadcrumb hidden when no `from` context | Vitest + RTL: provide empty context. Assert component renders nothing. |
| Component (React) | NotificationToast renders and auto-dismisses | Vitest + RTL: provide mock notification. Assert toast appears. Use fake timers, advance 8s, assert toast disappears. |
| Component (React) | NotificationCenter shows unread count, marks as read | Vitest + RTL: mock useNotifications with 3 unread. Assert badge shows "3". Click notification, assert POST /v0/notifications/{id}/read called. |
| Integration (Go) | Notification API returns correct notifications | Seed in-memory buffer with 5 notifications. GET /v0/notifications?since=T. Assert only notifications after T returned. POST /v0/notifications/{id}/read. GET again. Assert read=true. |
| E2E (Playwright) | Full navigation flow: Dashboard -> Board -> Workflow Studio -> Back to Board | Navigate to dashboard, click board, click workflow in board, assert breadcrumb shows board name, click breadcrumb, assert returned to board detail page. |

---

### Section 9: Definition of Done

- [ ] `useStudioContext()` hook exists and is used by all studio pages (WorkflowEditorPage, AgentStudioPage, AgentPlaygroundPage)
- [ ] `buildStudioUrl()` helper generates correct URLs with context params
- [ ] StudioBreadcrumb renders "Back to [Board Name]" when navigating from board context
- [ ] StudioBreadcrumb is invisible when navigating directly (no `from` param)
- [ ] Clicking breadcrumb navigates back to the source page
- [ ] All routes in App.tsx use ROUTES constants (no string literals)
- [ ] BoardDetailPage is nested inside AppShell (no standalone route)
- [ ] No duplicate routes exist for the same page
- [ ] ROUTES.BOARD_STUDIO, ROUTES.TOOL_DETAIL, ROUTES.AGENT_PLAYGROUND, ROUTES.WORKFLOW_RUNS added to routes.ts
- [ ] GET /v0/notifications returns notifications filtered by `since` timestamp
- [ ] POST /v0/notifications/{id}/read marks notification as read
- [ ] NotificationToast appears in bottom-right on new events (run complete, gate approval needed, agent escalation)
- [ ] NotificationToast auto-dismisses after 8 seconds
- [ ] NotificationCenter bell icon shows unread count badge
- [ ] NotificationCenter dropdown lists recent notifications
- [ ] Clicking a notification navigates to the relevant resource
- [ ] No console errors during cross-studio navigation flows

---

### Section 10: Sprint Schedule

| Day | Tasks | Owner |
|-----|-------|-------|
| Day 1 (May 30) | F1: useStudioContext hook + F3: Routing audit and consolidation + B1: Notification API (in-memory) | Frontend + Backend (parallel) |
| Day 2 (May 31) | F2: StudioBreadcrumb component + F5: Integrate breadcrumb into all studio pages + F4: Begin notification system (hook + toast) | Frontend |
| Day 3 (Jun 01) | F4: Complete notification system (NotificationCenter, integration into AppShell) + All testing + polish | Frontend + QA |

---

### Section 11: Rollback Plan

- **Breadcrumb**: If board name fetching proves problematic, fall back to showing "Back to Board" without the specific name. The navigation still works.
- **Notification system**: If the polling approach causes issues, disable polling and keep the NotificationCenter as a manual-refresh panel. Toast notifications can be deferred to Phase 7 when WebSocket is available.
- **Route consolidation**: If consolidation breaks existing pages, revert to the current flat route structure. The breadcrumb and context passing still work with the current routes.

---

### Section 12: Notes & Decisions

- **No WebSocket for notifications in Phase 5**: Polling every 10 seconds is sufficient for the development phase. Phase 7 (Sprint 7.9) upgrades SSE/polling to WebSocket for real-time push. The `useNotifications()` hook abstracts the transport, so switching from polling to WebSocket requires only changing the hook internals.
- **In-memory notification buffer is intentional**: We avoid adding a new database table in this sprint. The buffer is a ring buffer (last 100 per user, FIFO eviction). Server restart clears notifications. This is acceptable because Phase 6 adds proper persistence.
- **BoardDetailPage inside AppShell**: Moving BoardDetailPage inside AppShell means it gets the standard navigation bar and sidebar. If the board studio needs a full-screen mode (no sidebar), implement via a layout prop `<AppShell fullScreen={true}>` that hides the sidebar but keeps the top nav.
- **Breadcrumb fetches board name lazily**: The `<StudioBreadcrumb />` component triggers a GET /v0/boards/{boardId} on mount to get the board name. This is cached in Zustand after the first fetch. If the API call fails, the breadcrumb shows "Back to Board" as a generic fallback.

---
---

## Sprint 5.3: End-to-End Validation

**Sprint Duration:** 5 days (2026-06-02 to 2026-06-07)
**Sprint Goal:** Execute the complete FEA validation scenario end-to-end: register 3 mock tools with full ToolContracts, build an FEA workflow, create a validation board with cards and gates, trigger execution, and verify every component in the chain produces correct results.

---

### Section 1: Objectives

1. Register 3 mock tools (`mesh_generator`, `fea_solver`, `result_analyzer`) with complete 7-section ToolContracts, each backed by a real Docker image that produces deterministic outputs.
2. Build the "FEA Structural Validation" workflow: Webhook trigger -> Mesh Generator -> FEA Solver -> IF Condition (stress pass/fail) -> Result Analyzer (true branch) / AI Optimizer agent (false branch).
3. Create the "Structural Validation Study" board with IntentSpec, 4 validation cards, and 3 governance gates.
4. Execute the complete E2E flow: trigger workflow -> tools run in Docker -> artifacts uploaded to MinIO -> CardEvidence auto-collected -> gates auto-evaluate -> human approval -> mode escalation to Release -> release packet generated.
5. Verify every subsystem: ToolShelf resolution, expression resolution, agent scoring, evidence evaluation, gate pass/fail, board readiness calculation, release packet contents.

---

### Section 2: Task Breakdown

#### Task 1: Register 3 Mock Tools with Full ToolContracts

Each mock tool is backed by a minimal Docker image that reads inputs from `/workspace/input/`, performs a deterministic computation, and writes outputs to `/workspace/output/`.

##### Tool 1: mesh_generator

**ToolContract:**
```json
{
  "metadata": {
    "id": "tool_mesh_generator",
    "name": "Mesh Generator",
    "version": "1.0.0",
    "owner": "structural-team",
    "domain_tags": ["structural", "meshing", "preprocessing"],
    "license": "MIT",
    "source": "registry.airaie.io/mock-mesh-gen:1.0",
    "tier": 2,
    "description": "Generates a tetrahedral finite element mesh from CAD geometry. Supports STL and STEP input formats. Outputs VTK mesh with configurable element size."
  },
  "interface": {
    "inputs": [
      {
        "name": "geometry_file",
        "type": "artifact",
        "required": true,
        "description": "CAD geometry file in STL or STEP format",
        "constraints": {
          "accepted_formats": [".stl", ".step"],
          "max_size_mb": 200
        }
      },
      {
        "name": "element_size",
        "type": "parameter",
        "required": false,
        "description": "Target element edge length in mm",
        "schema": { "type": "number" },
        "constraints": { "min": 0.1, "max": 50.0 },
        "default": 5.0,
        "unit": "mm"
      },
      {
        "name": "mesh_order",
        "type": "parameter",
        "required": false,
        "description": "Element order: 1 for linear, 2 for quadratic",
        "schema": { "type": "integer" },
        "constraints": { "enum": [1, 2] },
        "default": 1
      }
    ],
    "outputs": [
      {
        "name": "mesh_file",
        "type": "artifact",
        "description": "Generated tetrahedral mesh in VTK format",
        "artifact_kind": "geometry.mesh",
        "constraints": { "format_hint": "vtk" }
      },
      {
        "name": "metrics",
        "type": "metric",
        "description": "Mesh generation metrics",
        "value_schema": {
          "type": "object",
          "properties": {
            "element_count": { "type": "integer" },
            "node_count": { "type": "integer" },
            "min_quality": { "type": "number" },
            "avg_quality": { "type": "number" },
            "generation_time_sec": { "type": "number" }
          }
        }
      }
    ],
    "errors": [
      { "code": "GEOMETRY_INVALID", "description": "Input geometry is malformed or unreadable" },
      { "code": "ELEMENT_SIZE_TOO_SMALL", "description": "Element size produces too many elements for available memory" }
    ]
  },
  "runtime": {
    "adapter": "docker",
    "image": "registry.airaie.io/mock-mesh-gen:1.0",
    "resources": {
      "cpu_cores": 2,
      "memory_mb": 2048,
      "timeout_sec": 300,
      "gpu": false
    },
    "sandbox": {
      "network": "none",
      "filesystem": "read-write",
      "pids_limit": 100
    }
  },
  "capabilities": {
    "supported_intents": ["sim.fea", "sim.cfd", "sim.thermal"],
    "pipeline_roles": ["preprocess"],
    "composable": true,
    "deterministic": true
  },
  "governance": {
    "trust_level": "tested",
    "requires_approval": false,
    "audit_log": true,
    "data_classification": "internal"
  },
  "testing": {
    "test_cases": [
      {
        "name": "basic_stl_mesh",
        "inputs": { "geometry_file": "test_bracket.stl", "element_size": 5.0, "mesh_order": 1 },
        "expected_outputs": { "element_count_range": [40000, 60000], "min_quality_gte": 0.3 }
      }
    ]
  },
  "documentation": {
    "usage_guide": "Upload a CAD geometry file (.stl or .step) and specify target element size. Smaller element sizes produce higher fidelity meshes but require more computation time.",
    "changelog": "1.0.0: Initial release with STL and STEP support"
  }
}
```

**Mock Docker Image Behavior (`mock-mesh-gen:1.0`):**
```bash
#!/bin/bash
# /workspace/entrypoint.sh
# Reads: /workspace/input/geometry_file (any file)
# Reads: /workspace/input/params.json (element_size, mesh_order)
# Writes: /workspace/output/mesh_file.vtk (dummy VTK with deterministic content)
# Writes: /workspace/output/metrics.json

ELEMENT_SIZE=$(cat /workspace/input/params.json | jq -r '.element_size // 5.0')
MESH_ORDER=$(cat /workspace/input/params.json | jq -r '.mesh_order // 1')

# Deterministic element count based on element_size
ELEMENT_COUNT=$(echo "50000 / $ELEMENT_SIZE" | bc)
NODE_COUNT=$(echo "$ELEMENT_COUNT * 1.2" | bc | cut -d. -f1)

# Generate dummy VTK file (valid VTK header + minimal data)
cat > /workspace/output/mesh_file.vtk << VTKEOF
# vtk DataFile Version 3.0
Mock Mesh Generator Output
ASCII
DATASET UNSTRUCTURED_GRID
POINTS $NODE_COUNT float
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
CELLS $ELEMENT_COUNT 4
4 0 1 2 3
CELL_TYPES $ELEMENT_COUNT
10
VTKEOF

# Generate metrics
cat > /workspace/output/metrics.json << EOF
{
  "element_count": $ELEMENT_COUNT,
  "node_count": $NODE_COUNT,
  "min_quality": 0.42,
  "avg_quality": 0.78,
  "generation_time_sec": 3.2
}
EOF

echo "Mesh generation complete: $ELEMENT_COUNT elements"
exit 0
```

##### Tool 2: fea_solver

**ToolContract:**
```json
{
  "metadata": {
    "id": "tool_fea_solver",
    "name": "FEA Stress Solver",
    "version": "3.1.0",
    "owner": "structural-team",
    "domain_tags": ["structural", "fea", "stress-analysis"],
    "license": "proprietary",
    "source": "registry.airaie.io/mock-fea-solver:3.1",
    "tier": 2,
    "description": "Performs linear static finite element stress analysis on a meshed geometry. Computes von Mises stress, displacement, and safety factor for a given material and loading condition."
  },
  "interface": {
    "inputs": [
      {
        "name": "mesh_file",
        "type": "artifact",
        "required": true,
        "description": "Input mesh file in VTK format (output from Mesh Generator)",
        "constraints": {
          "accepted_formats": [".vtk"],
          "max_size_mb": 500
        }
      },
      {
        "name": "material",
        "type": "parameter",
        "required": true,
        "description": "Material designation (e.g., Al6061-T6, Steel-304, Ti-6Al-4V)",
        "schema": { "type": "string" },
        "constraints": { "pattern": "^[A-Za-z0-9\\-]+$" }
      },
      {
        "name": "load_newtons",
        "type": "parameter",
        "required": true,
        "description": "Applied load magnitude in Newtons",
        "schema": { "type": "number" },
        "constraints": { "min": 0.1, "max": 1000000 },
        "unit": "N"
      },
      {
        "name": "threshold_mpa",
        "type": "parameter",
        "required": false,
        "description": "Maximum allowable von Mises stress in MPa (for pass/fail evaluation)",
        "schema": { "type": "number" },
        "constraints": { "min": 1, "max": 10000 },
        "default": 250,
        "unit": "MPa"
      },
      {
        "name": "solver_config",
        "type": "parameter",
        "required": false,
        "description": "Advanced solver configuration",
        "schema": { "type": "object" },
        "value_schema": {
          "type": "object",
          "properties": {
            "solver_type": { "type": "string", "enum": ["linear", "nonlinear"], "default": "linear" },
            "convergence_tol": { "type": "number", "default": 1e-6 },
            "max_iterations": { "type": "integer", "default": 100 }
          }
        }
      }
    ],
    "outputs": [
      {
        "name": "result_file",
        "type": "artifact",
        "description": "Stress analysis result file with von Mises stress field",
        "artifact_kind": "measurement.result",
        "constraints": { "format_hint": "vtk" }
      },
      {
        "name": "metrics",
        "type": "metric",
        "description": "Solver output metrics",
        "value_schema": {
          "type": "object",
          "properties": {
            "max_stress_mpa": { "type": "number", "unit": "MPa" },
            "min_stress_mpa": { "type": "number", "unit": "MPa" },
            "max_displacement_mm": { "type": "number", "unit": "mm" },
            "safety_factor": { "type": "number" },
            "yield_strength_mpa": { "type": "number", "unit": "MPa" },
            "element_count": { "type": "integer" },
            "solver_iterations": { "type": "integer" },
            "converged": { "type": "boolean" },
            "solve_time_sec": { "type": "number" }
          }
        }
      }
    ],
    "errors": [
      { "code": "MESH_INVALID", "description": "Input mesh is malformed or has zero elements" },
      { "code": "MATERIAL_UNKNOWN", "description": "Material designation not found in material database" },
      { "code": "DIVERGED", "description": "Solver failed to converge within max_iterations" },
      { "code": "SINGULAR_MATRIX", "description": "Stiffness matrix is singular (insufficient boundary conditions)" }
    ]
  },
  "runtime": {
    "adapter": "docker",
    "image": "registry.airaie.io/mock-fea-solver:3.1",
    "resources": {
      "cpu_cores": 4,
      "memory_mb": 8192,
      "timeout_sec": 600,
      "gpu": false
    },
    "sandbox": {
      "network": "none",
      "filesystem": "read-write",
      "pids_limit": 200
    }
  },
  "capabilities": {
    "supported_intents": ["sim.fea"],
    "pipeline_roles": ["solve"],
    "composable": true,
    "deterministic": true
  },
  "governance": {
    "trust_level": "verified",
    "requires_approval": false,
    "audit_log": true,
    "data_classification": "internal"
  },
  "testing": {
    "test_cases": [
      {
        "name": "bracket_500n_al6061",
        "inputs": { "mesh_file": "bracket_mesh.vtk", "material": "Al6061-T6", "load_newtons": 500, "threshold_mpa": 250 },
        "expected_outputs": { "max_stress_range": [150, 300], "converged": true, "safety_factor_gte": 0.8 }
      }
    ]
  },
  "documentation": {
    "usage_guide": "Provide a VTK mesh file, material designation, and applied load. The solver computes the stress field and returns max stress, displacement, safety factor, and convergence status.",
    "changelog": "3.1.0: Added safety_factor output, improved convergence for thin-walled structures\n3.0.0: Initial public release"
  }
}
```

**Mock Docker Image Behavior (`mock-fea-solver:3.1`):**
```bash
#!/bin/bash
# /workspace/entrypoint.sh
# Reads: /workspace/input/mesh_file.vtk
# Reads: /workspace/input/params.json (material, load_newtons, threshold_mpa, solver_config)
# Writes: /workspace/output/result_file.vtk
# Writes: /workspace/output/metrics.json

MATERIAL=$(cat /workspace/input/params.json | jq -r '.material // "Al6061-T6"')
LOAD=$(cat /workspace/input/params.json | jq -r '.load_newtons // 500')
THRESHOLD=$(cat /workspace/input/params.json | jq -r '.threshold_mpa // 250')

# Deterministic material database (yield strength in MPa)
case "$MATERIAL" in
  "Al6061-T6") YIELD=276 ;;
  "Steel-304") YIELD=215 ;;
  "Ti-6Al-4V") YIELD=880 ;;
  *) YIELD=250 ;;
esac

# Deterministic stress calculation: max_stress = load / 2.67 (mock formula)
# For 500N load: max_stress = 187.3 MPa
MAX_STRESS=$(echo "scale=1; $LOAD / 2.67" | bc)
MIN_STRESS=$(echo "scale=1; $MAX_STRESS * 0.05" | bc)
MAX_DISP=$(echo "scale=3; $LOAD / 5000" | bc)
SAFETY_FACTOR=$(echo "scale=2; $YIELD / $MAX_STRESS" | bc)

# Read element count from input mesh metrics if available, else default
ELEMENT_COUNT=10000

# Generate dummy VTK result file
cat > /workspace/output/result_file.vtk << VTKEOF
# vtk DataFile Version 3.0
FEA Solver Stress Result
ASCII
DATASET UNSTRUCTURED_GRID
POINTS 3 float
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
POINT_DATA 3
SCALARS von_mises_stress float 1
LOOKUP_TABLE default
${MAX_STRESS}
$(echo "scale=1; $MAX_STRESS * 0.7" | bc)
${MIN_STRESS}
VTKEOF

# Generate metrics JSON
cat > /workspace/output/metrics.json << EOF
{
  "max_stress_mpa": ${MAX_STRESS},
  "min_stress_mpa": ${MIN_STRESS},
  "max_displacement_mm": ${MAX_DISP},
  "safety_factor": ${SAFETY_FACTOR},
  "yield_strength_mpa": ${YIELD},
  "element_count": ${ELEMENT_COUNT},
  "solver_iterations": 42,
  "converged": true,
  "solve_time_sec": 8.7
}
EOF

echo "FEA solve complete: max_stress=${MAX_STRESS} MPa, safety_factor=${SAFETY_FACTOR}"
exit 0
```

##### Tool 3: result_analyzer

**ToolContract:**
```json
{
  "metadata": {
    "id": "tool_result_analyzer",
    "name": "Result Analyzer",
    "version": "1.2.0",
    "owner": "structural-team",
    "domain_tags": ["structural", "post-processing", "analysis", "reporting"],
    "license": "MIT",
    "source": "registry.airaie.io/mock-result-analyzer:1.2",
    "tier": 2,
    "description": "Analyzes FEA simulation results, generates compliance assessment against thresholds, produces a structured report with pass/fail summary and detailed findings."
  },
  "interface": {
    "inputs": [
      {
        "name": "result_file",
        "type": "artifact",
        "required": true,
        "description": "FEA result file in VTK format (output from FEA Solver)",
        "constraints": {
          "accepted_formats": [".vtk"],
          "max_size_mb": 500
        }
      },
      {
        "name": "solver_metrics",
        "type": "parameter",
        "required": true,
        "description": "Metrics JSON from FEA Solver output",
        "schema": { "type": "object" }
      },
      {
        "name": "threshold_mpa",
        "type": "parameter",
        "required": true,
        "description": "Maximum allowable stress threshold in MPa",
        "schema": { "type": "number" },
        "unit": "MPa"
      },
      {
        "name": "safety_factor_min",
        "type": "parameter",
        "required": false,
        "description": "Minimum acceptable safety factor",
        "schema": { "type": "number" },
        "constraints": { "min": 1.0, "max": 10.0 },
        "default": 1.2
      },
      {
        "name": "report_format",
        "type": "parameter",
        "required": false,
        "description": "Output report format",
        "schema": { "type": "string" },
        "constraints": { "enum": ["json", "pdf", "html"] },
        "default": "json"
      }
    ],
    "outputs": [
      {
        "name": "report",
        "type": "artifact",
        "description": "Analysis report with compliance assessment",
        "artifact_kind": "report.analysis",
        "constraints": { "format_hint": "json" }
      },
      {
        "name": "metrics",
        "type": "metric",
        "description": "Analysis summary metrics",
        "value_schema": {
          "type": "object",
          "properties": {
            "overall_pass": { "type": "boolean" },
            "stress_pass": { "type": "boolean" },
            "safety_factor_pass": { "type": "boolean" },
            "max_stress_mpa": { "type": "number" },
            "safety_factor": { "type": "number" },
            "stress_margin_pct": { "type": "number" },
            "safety_margin_pct": { "type": "number" },
            "risk_level": { "type": "string" },
            "analysis_time_sec": { "type": "number" }
          }
        }
      }
    ],
    "errors": [
      { "code": "RESULT_INVALID", "description": "Input result file is malformed or missing stress data" },
      { "code": "METRICS_MISSING", "description": "Required metrics fields are missing from solver_metrics input" }
    ]
  },
  "runtime": {
    "adapter": "docker",
    "image": "registry.airaie.io/mock-result-analyzer:1.2",
    "resources": {
      "cpu_cores": 1,
      "memory_mb": 1024,
      "timeout_sec": 120,
      "gpu": false
    },
    "sandbox": {
      "network": "none",
      "filesystem": "read-write",
      "pids_limit": 50
    }
  },
  "capabilities": {
    "supported_intents": ["sim.fea"],
    "pipeline_roles": ["postprocess", "evidence"],
    "composable": true,
    "deterministic": true
  },
  "governance": {
    "trust_level": "tested",
    "requires_approval": false,
    "audit_log": true,
    "data_classification": "internal"
  },
  "testing": {
    "test_cases": [
      {
        "name": "passing_analysis",
        "inputs": {
          "result_file": "stress_result.vtk",
          "solver_metrics": { "max_stress_mpa": 187.3, "safety_factor": 1.47 },
          "threshold_mpa": 250,
          "safety_factor_min": 1.2
        },
        "expected_outputs": { "overall_pass": true, "stress_pass": true, "safety_factor_pass": true }
      },
      {
        "name": "failing_analysis",
        "inputs": {
          "result_file": "stress_result.vtk",
          "solver_metrics": { "max_stress_mpa": 312.5, "safety_factor": 0.88 },
          "threshold_mpa": 250,
          "safety_factor_min": 1.2
        },
        "expected_outputs": { "overall_pass": false, "stress_pass": false, "safety_factor_pass": false }
      }
    ]
  },
  "documentation": {
    "usage_guide": "Provide the FEA result file and solver metrics from a preceding FEA Solver step. The analyzer evaluates stress and safety factor against thresholds and produces a compliance report.",
    "changelog": "1.2.0: Added risk_level classification and margin percentage outputs\n1.1.0: Added PDF report format\n1.0.0: Initial release"
  }
}
```

**Mock Docker Image Behavior (`mock-result-analyzer:1.2`):**
```bash
#!/bin/bash
# /workspace/entrypoint.sh
# Reads: /workspace/input/result_file.vtk
# Reads: /workspace/input/params.json (solver_metrics, threshold_mpa, safety_factor_min, report_format)
# Writes: /workspace/output/report.json
# Writes: /workspace/output/metrics.json

THRESHOLD=$(cat /workspace/input/params.json | jq -r '.threshold_mpa // 250')
SF_MIN=$(cat /workspace/input/params.json | jq -r '.safety_factor_min // 1.2')
MAX_STRESS=$(cat /workspace/input/params.json | jq -r '.solver_metrics.max_stress_mpa // 187.3')
SAFETY_FACTOR=$(cat /workspace/input/params.json | jq -r '.solver_metrics.safety_factor // 1.47')

# Evaluate pass/fail
STRESS_PASS=$(echo "$MAX_STRESS < $THRESHOLD" | bc -l)
SF_PASS=$(echo "$SAFETY_FACTOR > $SF_MIN" | bc -l)

if [ "$STRESS_PASS" -eq 1 ] && [ "$SF_PASS" -eq 1 ]; then
  OVERALL_PASS=true
else
  OVERALL_PASS=false
fi

# Calculate margins
STRESS_MARGIN=$(echo "scale=1; (($THRESHOLD - $MAX_STRESS) / $THRESHOLD) * 100" | bc)
SF_MARGIN=$(echo "scale=1; (($SAFETY_FACTOR - $SF_MIN) / $SF_MIN) * 100" | bc)

# Determine risk level
if [ "$OVERALL_PASS" = "true" ]; then
  if (( $(echo "$STRESS_MARGIN > 30" | bc -l) )); then
    RISK_LEVEL="low"
  elif (( $(echo "$STRESS_MARGIN > 10" | bc -l) )); then
    RISK_LEVEL="medium"
  else
    RISK_LEVEL="high"
  fi
else
  RISK_LEVEL="critical"
fi

# Generate report artifact
cat > /workspace/output/report.json << EOF
{
  "title": "FEA Stress Analysis Compliance Report",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "overall_verdict": "$OVERALL_PASS",
    "risk_level": "$RISK_LEVEL"
  },
  "criteria": [
    {
      "name": "Maximum Von Mises Stress",
      "metric": "max_stress_mpa",
      "value": $MAX_STRESS,
      "threshold": $THRESHOLD,
      "operator": "lt",
      "unit": "MPa",
      "pass": $([ "$STRESS_PASS" -eq 1 ] && echo "true" || echo "false"),
      "margin_pct": $STRESS_MARGIN
    },
    {
      "name": "Minimum Safety Factor",
      "metric": "safety_factor",
      "value": $SAFETY_FACTOR,
      "threshold": $SF_MIN,
      "operator": "gt",
      "unit": "",
      "pass": $([ "$SF_PASS" -eq 1 ] && echo "true" || echo "false"),
      "margin_pct": $SF_MARGIN
    }
  ],
  "findings": [
    "Peak stress of ${MAX_STRESS} MPa observed (threshold: ${THRESHOLD} MPa, margin: ${STRESS_MARGIN}%)",
    "Safety factor of ${SAFETY_FACTOR} (minimum: ${SF_MIN}, margin: ${SF_MARGIN}%)",
    "Risk classification: ${RISK_LEVEL}"
  ],
  "recommendation": "$([ "$OVERALL_PASS" = "true" ] && echo "PROCEED — all criteria met. Recommend gate approval." || echo "HOLD — criteria not met. Recommend design revision or parameter adjustment.")"
}
EOF

# Generate metrics
cat > /workspace/output/metrics.json << EOF
{
  "overall_pass": $OVERALL_PASS,
  "stress_pass": $([ "$STRESS_PASS" -eq 1 ] && echo "true" || echo "false"),
  "safety_factor_pass": $([ "$SF_PASS" -eq 1 ] && echo "true" || echo "false"),
  "max_stress_mpa": $MAX_STRESS,
  "safety_factor": $SAFETY_FACTOR,
  "stress_margin_pct": $STRESS_MARGIN,
  "safety_margin_pct": $SF_MARGIN,
  "risk_level": "$RISK_LEVEL",
  "analysis_time_sec": 1.4
}
EOF

echo "Analysis complete: overall_pass=$OVERALL_PASS, risk=$RISK_LEVEL"
exit 0
```

| # | Subtask | File(s) | What to Do | Complexity | Estimate |
|---|---------|---------|------------|------------|----------|
| T1a | Build mock-mesh-gen Docker image | `e2e/mock-tools/mesh-generator/Dockerfile`, `e2e/mock-tools/mesh-generator/entrypoint.sh` | Create Dockerfile (FROM alpine:3.18, install jq bc, COPY entrypoint.sh, ENTRYPOINT). Build and tag as registry.airaie.io/mock-mesh-gen:1.0. Push to local registry or load into Docker daemon. | S | 0.25 days |
| T1b | Build mock-fea-solver Docker image | `e2e/mock-tools/fea-solver/Dockerfile`, `e2e/mock-tools/fea-solver/entrypoint.sh` | Same pattern as T1a. Tag as registry.airaie.io/mock-fea-solver:3.1. | S | 0.25 days |
| T1c | Build mock-result-analyzer Docker image | `e2e/mock-tools/result-analyzer/Dockerfile`, `e2e/mock-tools/result-analyzer/entrypoint.sh` | Same pattern as T1a. Tag as registry.airaie.io/mock-result-analyzer:1.2. | S | 0.25 days |
| T1d | Register all 3 tools via API | `e2e/scripts/register_tools.sh` or `e2e/setup_test.go` | POST /v0/tools with each ToolContract. POST /v0/tools/{id}/versions with version details. POST /v0/tools/{id}/versions/{v}/publish to make them available. Verify: GET /v0/tools returns all 3, GET /v0/toolshelf/resolve with intent_type=sim.fea returns all 3 ranked. | M | 0.25 days |

#### Task 2: Build FEA Workflow

**Workflow YAML DSL:**
```yaml
api_version: "1"
name: "FEA Structural Validation Workflow"
description: "End-to-end FEA validation: mesh generation, stress analysis, conditional branching, result analysis or AI optimization"
tags: ["structural", "fea", "validation", "e2e"]

workflow_inputs:
  - name: geometry_file
    type: artifact
    required: true
    description: "CAD geometry file (.stl or .step)"
  - name: material
    type: string
    required: true
    description: "Material designation (e.g., Al6061-T6)"
  - name: load_newtons
    type: number
    required: true
    description: "Applied load in Newtons"
  - name: threshold_mpa
    type: number
    required: false
    default: 250
    description: "Maximum allowable stress in MPa"
  - name: safety_factor_min
    type: number
    required: false
    default: 1.2
    description: "Minimum acceptable safety factor"

nodes:
  - id: webhook_trigger
    type: trigger
    trigger_type: webhook
    name: "Webhook Trigger"
    position: { x: 100, y: 300 }

  - id: mesh_gen_1
    type: tool
    name: "Mesh Generator"
    tool_ref: "tool_mesh_generator@1.0.0"
    position: { x: 350, y: 300 }
    parameters:
      geometry_file: "{{ $('webhook_trigger').artifacts.geometry_file }}"
      element_size: 5.0
      mesh_order: 1

  - id: fea_solver_1
    type: tool
    name: "FEA Solver"
    tool_ref: "tool_fea_solver@3.1.0"
    position: { x: 600, y: 300 }
    parameters:
      mesh_file: "{{ $('mesh_gen_1').artifacts.mesh_file }}"
      material: "{{ $('webhook_trigger').json.material }}"
      load_newtons: "{{ $('webhook_trigger').json.load_newtons }}"
      threshold_mpa: "{{ $('webhook_trigger').json.threshold_mpa }}"
      solver_config:
        solver_type: "linear"
        convergence_tol: 0.000001
        max_iterations: 100

  - id: stress_check
    type: condition
    name: "Stress Pass/Fail Check"
    position: { x: 850, y: 300 }
    condition:
      expression: "{{ $('fea_solver_1').json.metrics.max_stress_mpa < $('webhook_trigger').json.threshold_mpa }}"
      true_branch: result_analyzer_1
      false_branch: ai_optimizer_1

  - id: result_analyzer_1
    type: tool
    name: "Result Analyzer"
    tool_ref: "tool_result_analyzer@1.2.0"
    position: { x: 1100, y: 200 }
    parameters:
      result_file: "{{ $('fea_solver_1').artifacts.result_file }}"
      solver_metrics: "{{ $('fea_solver_1').json.metrics }}"
      threshold_mpa: "{{ $('webhook_trigger').json.threshold_mpa }}"
      safety_factor_min: "{{ $('webhook_trigger').json.safety_factor_min }}"
      report_format: "json"

  - id: ai_optimizer_1
    type: agent
    name: "AI Optimizer Agent"
    agent_ref: "agent_fea_optimizer@1.0"
    position: { x: 1100, y: 400 }
    parameters:
      goal: "The FEA analysis shows stress exceeding the threshold. Recommend parameter adjustments (element size, material, or load) to achieve compliance."
      context:
        max_stress: "{{ $('fea_solver_1').json.metrics.max_stress_mpa }}"
        threshold: "{{ $('webhook_trigger').json.threshold_mpa }}"
        material: "{{ $('webhook_trigger').json.material }}"
        safety_factor: "{{ $('fea_solver_1').json.metrics.safety_factor }}"

connections:
  webhook_trigger:
    main:
      - - { node: mesh_gen_1, type: main, index: 0 }
  mesh_gen_1:
    main:
      - - { node: fea_solver_1, type: main, index: 0 }
  fea_solver_1:
    main:
      - - { node: stress_check, type: main, index: 0 }
  stress_check:
    main:
      - - { node: result_analyzer_1, type: main, index: 0 }
      - - { node: ai_optimizer_1, type: main, index: 0 }

error_handling:
  default_mode: abort
  retry:
    max_retries: 2
    wait_between_sec: 5
    backoff_multiplier: 2
```

| # | Subtask | File(s) | What to Do | Complexity | Estimate |
|---|---------|---------|------------|------------|----------|
| T2a | Create workflow via API | `e2e/scripts/create_workflow.sh` or `e2e/setup_test.go` | POST /v0/workflows with name and description. POST /v0/workflows/{id}/versions with the YAML DSL above. POST /v0/workflows/compile to compile (verify 5-stage pipeline succeeds). POST /v0/workflows/{id}/versions/{v}/publish. Verify: GET /v0/workflows/{id} returns published workflow with correct node count (6 nodes). | M | 0.25 days |
| T2b | Create webhook trigger | `e2e/scripts/create_workflow.sh` | POST /v0/triggers with type=webhook, workflow_id={id}, version={v}. Verify: GET /v0/triggers/{id} returns webhook_url. Store webhook_url for execution step. | S | 0.1 days |

#### Task 3: Create Validation Board

**Board Configuration:**

```json
{
  "name": "Structural Validation Study",
  "description": "End-to-end validation board for bracket stress analysis under 500N load. Proves that the bracket design meets structural requirements per ISO 12345.",
  "type": "engineering",
  "vertical": "structural",
  "mode": "study",
  "linked_workflows": ["wf_fea_structural_validation"],
  "metadata": {
    "material": "Al6061-T6",
    "load_case": "static_500N",
    "standard": "ISO 12345",
    "component": "Bracket Assembly Rev.C"
  }
}
```

**4 Validation Cards:**

Card 1: FEA Stress Analysis
```json
{
  "title": "FEA Stress Analysis",
  "card_type": "analysis",
  "intent_type": "sim.fea",
  "description": "Run finite element stress analysis on bracket geometry under 500N static load. Verify max von Mises stress is below 250 MPa.",
  "intent_spec": {
    "goal": "Validate bracket stress under 500N static load, maximum von Mises stress must be below 250 MPa",
    "inputs": [
      { "name": "geometry", "type": "artifact:stl", "description": "Bracket CAD geometry" },
      { "name": "material", "type": "json:string", "description": "Material designation" }
    ],
    "constraints": {
      "load_newtons": 500,
      "solver_type": "linear",
      "material": "Al6061-T6"
    },
    "acceptance_criteria": [
      { "metric": "max_stress_mpa", "operator": "lt", "threshold": 250, "unit": "MPa", "weight": 0.6 },
      { "metric": "safety_factor", "operator": "gt", "threshold": 1.2, "unit": "", "weight": 0.3 },
      { "metric": "converged", "operator": "eq", "threshold": true, "unit": "", "weight": 0.1 }
    ],
    "preferences": { "priority": "accuracy", "max_time": "10m", "max_cost": 5.0 },
    "governance": {
      "risk_policy": "standard",
      "requires_approval": false,
      "approval_roles": [],
      "compliance_standards": ["ISO 12345"]
    }
  },
  "kpis": [
    { "metric_key": "max_stress_mpa", "target_value": 250, "unit": "MPa", "tolerance": 10 },
    { "metric_key": "safety_factor", "target_value": 1.2, "unit": "", "tolerance": 0.05 }
  ],
  "depends_on": [],
  "ordinal": 1
}
```

Card 2: Mesh Quality Verification
```json
{
  "title": "Mesh Quality Verification",
  "card_type": "analysis",
  "intent_type": "sim.fea",
  "description": "Verify that the generated mesh meets quality standards: minimum element quality > 0.3, average quality > 0.6, element count within expected range.",
  "intent_spec": {
    "goal": "Verify mesh quality metrics meet minimum standards for reliable FEA analysis",
    "inputs": [
      { "name": "geometry", "type": "artifact:stl", "description": "Bracket CAD geometry" }
    ],
    "constraints": {
      "element_size": 5.0,
      "mesh_order": 1
    },
    "acceptance_criteria": [
      { "metric": "min_quality", "operator": "gt", "threshold": 0.3, "unit": "", "weight": 0.5 },
      { "metric": "avg_quality", "operator": "gt", "threshold": 0.6, "unit": "", "weight": 0.3 },
      { "metric": "element_count", "operator": "gt", "threshold": 5000, "unit": "", "weight": 0.2 }
    ],
    "preferences": { "priority": "accuracy" },
    "governance": { "risk_policy": "standard", "requires_approval": false }
  },
  "kpis": [
    { "metric_key": "min_quality", "target_value": 0.3, "unit": "" },
    { "metric_key": "avg_quality", "target_value": 0.6, "unit": "" }
  ],
  "depends_on": [],
  "ordinal": 2
}
```

Card 3: Compliance Report Generation
```json
{
  "title": "Compliance Report Generation",
  "card_type": "analysis",
  "intent_type": "sim.fea",
  "description": "Generate a compliance report that documents all FEA findings, pass/fail assessments, and risk classification for the structural validation case.",
  "intent_spec": {
    "goal": "Generate compliance report documenting stress analysis results, pass/fail status, and risk assessment",
    "inputs": [
      { "name": "fea_result", "type": "artifact:vtk", "description": "FEA solver result file" },
      { "name": "solver_metrics", "type": "json:object", "description": "FEA solver metrics" }
    ],
    "constraints": {
      "threshold_mpa": 250,
      "safety_factor_min": 1.2
    },
    "acceptance_criteria": [
      { "metric": "overall_pass", "operator": "eq", "threshold": true, "unit": "", "weight": 0.7 },
      { "metric": "risk_level", "operator": "in", "threshold": ["low", "medium"], "unit": "", "weight": 0.3 }
    ],
    "preferences": { "priority": "accuracy" },
    "governance": { "risk_policy": "standard", "requires_approval": false }
  },
  "kpis": [
    { "metric_key": "overall_pass", "target_value": true, "unit": "" },
    { "metric_key": "risk_level", "target_value": "low", "unit": "" }
  ],
  "depends_on": ["card_fea_stress_analysis"],
  "ordinal": 3
}
```

Card 4: Lead Engineer Review (Agent Card)
```json
{
  "title": "Lead Engineer Review",
  "card_type": "agent",
  "intent_type": "sim.fea",
  "description": "AI agent reviews all structural validation evidence, scores the results, and provides a recommendation for gate approval or further investigation.",
  "agent_id": "agent_fea_reviewer",
  "agent_version": "1.0",
  "intent_spec": {
    "goal": "Review all structural validation evidence and provide an expert recommendation on whether the bracket design passes structural requirements",
    "inputs": [
      { "name": "stress_results", "type": "json:object", "description": "FEA solver metrics" },
      { "name": "analysis_report", "type": "artifact:json", "description": "Compliance report" }
    ],
    "constraints": {},
    "acceptance_criteria": [
      { "metric": "recommendation_confidence", "operator": "gt", "threshold": 0.75, "unit": "", "weight": 1.0 }
    ],
    "preferences": { "priority": "accuracy" },
    "governance": {
      "risk_policy": "standard",
      "requires_approval": true,
      "approval_roles": ["lead_engineer"]
    }
  },
  "kpis": [
    { "metric_key": "recommendation_confidence", "target_value": 0.75, "unit": "" }
  ],
  "depends_on": ["card_fea_stress_analysis", "card_compliance_report"],
  "ordinal": 4
}
```

**3 Governance Gates:**

Gate 1: Structural Evidence Gate (evidence type, auto-evaluated)
```json
{
  "name": "Structural Evidence Gate",
  "gate_type": "evidence",
  "description": "Auto-evaluated gate that checks whether all FEA stress analysis acceptance criteria are met. Passes when max_stress < 250 MPa and safety_factor > 1.2.",
  "requirements": [
    {
      "type": "metric_threshold",
      "card_id": "card_fea_stress_analysis",
      "metric": "max_stress_mpa",
      "operator": "lt",
      "threshold": 250,
      "description": "Max von Mises stress must be below 250 MPa"
    },
    {
      "type": "metric_threshold",
      "card_id": "card_fea_stress_analysis",
      "metric": "safety_factor",
      "operator": "gt",
      "threshold": 1.2,
      "description": "Safety factor must exceed 1.2"
    },
    {
      "type": "run_succeeded",
      "card_id": "card_fea_stress_analysis",
      "description": "FEA run must have completed successfully"
    },
    {
      "type": "artifact_exists",
      "artifact_kind": "measurement.result",
      "description": "Stress result artifact must be present in MinIO"
    }
  ],
  "ordinal": 1
}
```

Gate 2: Quality Review Gate (review type, requires human sign-off)
```json
{
  "name": "Quality Review Gate",
  "gate_type": "review",
  "description": "Manual review gate requiring lead engineer sign-off after inspecting the compliance report and mesh quality data.",
  "requirements": [
    {
      "type": "role_signed",
      "role": "lead_engineer",
      "description": "Lead engineer must sign off on structural validation results"
    },
    {
      "type": "metric_threshold",
      "card_id": "card_compliance_report",
      "metric": "overall_pass",
      "operator": "eq",
      "threshold": true,
      "description": "Compliance report must show overall pass"
    }
  ],
  "ordinal": 2
}
```

Gate 3: Release Compliance Gate (compliance type, combines auto + human)
```json
{
  "name": "Release Compliance Gate",
  "gate_type": "compliance",
  "description": "Final compliance gate before release. Requires all evidence gates passed, quality review complete, and quality manager sign-off.",
  "requirements": [
    {
      "type": "gate_passed",
      "gate_ref": "structural_evidence_gate",
      "description": "Structural Evidence Gate must be PASSED"
    },
    {
      "type": "gate_passed",
      "gate_ref": "quality_review_gate",
      "description": "Quality Review Gate must be PASSED"
    },
    {
      "type": "role_signed",
      "role": "quality_manager",
      "description": "Quality manager must sign off for release"
    },
    {
      "type": "all_cards_completed",
      "description": "All validation cards must be in completed status"
    }
  ],
  "ordinal": 3
}
```

| # | Subtask | File(s) | What to Do | Complexity | Estimate |
|---|---------|---------|------------|------------|----------|
| T3a | Create board via API | `e2e/scripts/create_board.sh` or `e2e/setup_test.go` | POST /v0/boards with the board configuration above. Verify: GET /v0/boards/{id} returns board in Study mode. | S | 0.1 days |
| T3b | Create 4 cards with IntentSpecs | Same | For each card: POST /v0/boards/{id}/cards with card config. POST /v0/intents with IntentSpec, then POST /v0/intents/{id}/lock to lock. Verify: GET /v0/boards/{id}/cards returns 4 cards. Verify card dependencies are correct. | M | 0.25 days |
| T3c | Create 3 gates with requirements | Same | For each gate: POST /v0/boards/{id}/gates with gate config and requirements array. Verify: GET /v0/boards/{id}/gates returns 3 gates, all in PENDING status. | M | 0.25 days |
| T3d | Upload test geometry artifact | Same | Upload a test STL file (can be a minimal valid STL binary) to MinIO via POST /v0/artifacts/upload-url -> upload -> POST /v0/artifacts/{id}/finalize. This is the input geometry for the workflow. | S | 0.1 days |

#### Task 4: Execute End-to-End

| # | Subtask | What to Do | Complexity | Estimate |
|---|---------|------------|------------|----------|
| T4a | Trigger the workflow | POST to the webhook URL with: `{ "geometry_file": "<artifact_ref>", "material": "Al6061-T6", "load_newtons": 500, "threshold_mpa": 250, "safety_factor_min": 1.2 }`. The run must include `board_id` and `card_id` linking it to the FEA Stress Analysis card. Verify: Run created with status PENDING -> RUNNING. | M | 0.1 days |
| T4b | Monitor tool execution | Poll GET /v0/runs/{id} until status is SUCCEEDED or FAILED. Verify node execution order: (1) webhook_trigger completes, (2) mesh_gen_1 starts and completes, (3) fea_solver_1 starts and completes, (4) stress_check evaluates condition, (5) result_analyzer_1 starts and completes (because 187.3 < 250, the true branch fires). Verify ai_optimizer_1 has status SKIPPED (false branch not taken). Verify total 5 nodes completed, 1 skipped. | M | 0.25 days |
| T4c | Verify artifacts in MinIO | GET /v0/runs/{id}/artifacts. Verify 3 artifacts created: (1) mesh_file.vtk from mesh_gen_1 (kind: geometry.mesh), (2) result_file.vtk from fea_solver_1 (kind: measurement.result), (3) report.json from result_analyzer_1 (kind: report.analysis). Each artifact has SHA-256 hash and valid download URL. Download each artifact and verify content is non-empty and matches expected format. | M | 0.25 days |
| T4d | Verify evidence auto-collected | GET /v0/boards/{boardId}/cards/{cardId}/evidence. Verify CardEvidence records created: (1) max_stress_mpa = 187.3, operator=lt, threshold=250, evaluation=pass, (2) safety_factor = 1.47, operator=gt, threshold=1.2, evaluation=pass, (3) converged = true, operator=eq, threshold=true, evaluation=pass. All passed=true. | M | 0.25 days |
| T4e | Verify gate auto-evaluation | GET /v0/boards/{boardId}/gates. Verify: (1) Structural Evidence Gate status = PASSED (all evidence requirements met: run_succeeded=true, max_stress<250, safety_factor>1.2, result artifact exists). (2) Quality Review Gate status = PENDING (requires human sign-off). (3) Release Compliance Gate status = PENDING (depends on Quality Review Gate). | M | 0.1 days |
| T4f | Human approval on Quality Review Gate | POST /v0/approvals/{quality_review_approval_id}/approve with role=lead_engineer, comment="Reviewed stress analysis results. Max stress 187.3 MPa is well within 250 MPa threshold. Safety factor 1.47 exceeds minimum 1.2. Mesh quality acceptable. Recommend proceeding." Verify: Quality Review Gate status changes to PASSED. | S | 0.1 days |
| T4g | Quality manager sign-off for Release Compliance Gate | POST /v0/approvals/{release_compliance_approval_id}/approve with role=quality_manager, comment="All structural validation evidence reviewed and approved. Bracket meets ISO 12345 requirements. Approved for release." Verify: Release Compliance Gate status changes to PASSED. | S | 0.1 days |
| T4h | Escalate board mode to Release | POST /v0/boards/{boardId}/mode with mode=release. Verify: (1) Validation succeeds (board has completed cards, all gates passed). (2) Board mode changes to "release". (3) Board mode escalation is one-way (cannot go back to Study). | S | 0.1 days |
| T4i | Build release packet | POST /v0/boards/{boardId}/release-packet. Verify: (1) Artifacts locked (frozen snapshots in MinIO, cannot be overwritten). (2) BOM generated from board metadata (material, component, standard). (3) Proof bundle compiled (all gate evaluations with timestamps and approver identities). (4) Sign-off records included (lead_engineer and quality_manager approvals). (5) Release packet downloadable as ZIP. Verify ZIP contents: /artifacts/ (locked VTK and JSON files), /bom.json, /proof_bundle.json, /sign_offs.json, /manifest.json. | L | 0.25 days |

#### Task 5: Verify All Components

| # | Verification | What to Check | Expected Result | How to Check |
|---|-------------|---------------|-----------------|-------------- |
| V1 | ToolShelf resolution | POST /v0/toolshelf/resolve with intent_type=sim.fea | Returns all 3 tools ranked: fea_solver (highest, verified trust), mesh_generator (tested trust), result_analyzer (tested trust). Explain endpoint shows trust_level and intent_confidence factors. | API call + assert response structure and ordering |
| V2 | Expression resolution | Inspect run NodeRun records for resolved parameter values | mesh_gen_1.geometry_file resolved to actual artifact ref. fea_solver_1.material resolved to "Al6061-T6". fea_solver_1.mesh_file resolved to mesh_gen_1's output artifact. result_analyzer_1.solver_metrics resolved to fea_solver_1's metrics output. stress_check.expression resolved "187.3 < 250" to true. | GET /v0/runs/{id}/nodes, inspect resolved_parameters on each NodeRun |
| V3 | Agent scoring (for agent card if exercised) | If the false branch were taken (stress > threshold), the AI Optimizer agent would score tools using 5-dimension scoring | Not directly exercised in the pass scenario. Verify via a separate sub-test: create a second run with load_newtons=1000 (producing max_stress=374.5 MPa, exceeding 250). The false branch fires, ai_optimizer_1 activates. Verify agent decision trace shows 5-dimension scores. | Second E2E run with high load + GET /v0/runs/{id}/trace |
| V4 | Evidence matches criteria | Compare CardEvidence records against IntentSpec acceptance_criteria | Each criterion in the IntentSpec has a corresponding CardEvidence record. metric_key matches, operator matches, threshold matches. evaluation is correct (pass for criteria that are met, fail for criteria that are not). | GET /v0/boards/{boardId}/cards/{cardId}/evidence + programmatic comparison |
| V5 | Gates passed correctly | Check all 3 gates' final status | Structural Evidence Gate: PASSED (auto). Quality Review Gate: PASSED (human). Release Compliance Gate: PASSED (all prerequisites met + human). No gate in FAILED or EVALUATING state. | GET /v0/boards/{boardId}/gates |
| V6 | Board readiness calculation | GET /v0/boards/{boardId}/readiness | Readiness should be 100% (or near 100%) after all cards completed and all gates passed. Breakdown: design category, validation category (3/3 evidence criteria pass), compliance category (1/1 compliance gate pass), manufacturing category, approvals category (all signed). | GET /v0/boards/{boardId} and check readiness field |
| V7 | Release packet validity | Download and inspect ZIP | Contains: manifest.json (board name, mode, timestamp, artifact count), bom.json (material: Al6061-T6, component: Bracket Assembly Rev.C, standard: ISO 12345), proof_bundle.json (3 gate evaluations with timestamps, criteria, and outcomes), sign_offs.json (2 sign-offs: lead_engineer, quality_manager), artifacts/ directory (3 files: mesh, result, report). Total ZIP structure is valid and all referenced files are present. | Download ZIP + programmatic inspection |
| V8 | Notification generation | GET /v0/notifications | Should contain notifications for: run_completed (FEA workflow), gate_approval_needed (Quality Review Gate, Release Compliance Gate), gate_passed (Structural Evidence Gate). | GET /v0/notifications and assert type counts |
| V9 | Cross-studio navigation | Manual or Playwright test | From Dashboard, navigate to Boards -> click "Structural Validation Study" -> board detail shows 4 cards, 3 gates, readiness gauge. Click FEA Stress Analysis card -> click linked workflow -> navigated to /workflow-studio/{id}?from=board&boardId=X. Breadcrumb shows "Back to Structural Validation Study". Click breadcrumb -> returned to board. | Playwright E2E or manual test script |

| # | Subtask | File(s) | What to Do | Complexity | Estimate |
|---|---------|---------|------------|------------|----------|
| T5a | Write comprehensive E2E test | `e2e/full_e2e_test.go` or `e2e/full_e2e_test.sh` | Orchestrate T4a through T4i programmatically with assertions at each step. This is the master test that proves the entire platform works end-to-end. Must run in CI (GitHub Actions) with Docker Compose providing Postgres, NATS, MinIO, and Docker-in-Docker. | L | 1 day |
| T5b | Write verification checks (V1-V8) | `e2e/verify_components_test.go` | Separate test file that runs after T5a completes. Performs all 9 verification checks. Produces a structured report: pass/fail for each check with details. | L | 0.5 days |
| T5c | Playwright E2E for navigation (V9) | `e2e/playwright/navigation.spec.ts` | Playwright test: seed data from T5a, then navigate Dashboard->Board->Card->Workflow Studio->Back. Assert URLs, breadcrumbs, and page content at each step. | M | 0.5 days |
| T5d | Failure scenario: high load (V3) | `e2e/failure_scenario_test.go` | Create a second run with load_newtons=1000. Expected: max_stress=374.5 MPa > 250, condition routes to false branch, ai_optimizer_1 activates. Verify: agent decision trace present, evidence shows max_stress evaluation=fail. Gate does NOT auto-pass. Demonstrates the system correctly handles failure cases. | M | 0.5 days |

---

### Section 3: API Contracts

No new endpoints in this sprint. All APIs were built in Phases 1-4 and Sprints 5.1-5.2. This sprint exercises them end-to-end.

**APIs exercised (complete list):**

| Endpoint | Sprint Used | Purpose in E2E |
|----------|-------------|---------------|
| POST /v0/tools | Phase 1 | Register 3 mock tools |
| POST /v0/tools/{id}/versions | Phase 1 | Create tool versions |
| POST /v0/tools/{id}/versions/{v}/publish | Phase 1 | Publish tool versions |
| POST /v0/toolshelf/resolve | Phase 1 (Sprint 1.3) | Verify tool resolution (V1) |
| POST /v0/workflows | Phase 2 | Create FEA workflow |
| POST /v0/workflows/{id}/versions | Phase 2 | Create workflow version with YAML |
| POST /v0/workflows/compile | Phase 2 | Compile workflow |
| POST /v0/workflows/{id}/versions/{v}/publish | Phase 2 | Publish workflow |
| POST /v0/triggers | Phase 2 (Sprint 2.4) | Create webhook trigger |
| POST /v0/hooks/{webhook_id} | Phase 2 | Trigger workflow via webhook |
| POST /v0/runs | Phase 2 | Create run (alternative to webhook) |
| GET /v0/runs/{id} | Phase 2 | Poll run status |
| GET /v0/runs/{id}/nodes | Phase 2 | Inspect node execution details |
| GET /v0/runs/{id}/artifacts | Phase 2 | List run artifacts |
| GET /v0/runs/{id}/trace | Phase 3 | Agent decision trace (failure scenario) |
| POST /v0/boards | Phase 4 | Create validation board |
| GET /v0/boards/{id} | Phase 4 | Read board state and readiness |
| POST /v0/boards/{id}/cards | Phase 4 | Create 4 cards |
| POST /v0/boards/{id}/gates | Phase 4 | Create 3 gates |
| POST /v0/boards/{id}/mode | Phase 4 | Escalate to Release mode |
| POST /v0/boards/{id}/release-packet | Phase 4 (Sprint 4.5) | Generate release packet |
| POST /v0/intents | Phase 4 | Create IntentSpecs |
| POST /v0/intents/{id}/lock | Phase 4 | Lock IntentSpecs |
| GET /v0/boards/{id}/cards/{cardId}/evidence | Phase 4 | Read card evidence |
| GET /v0/boards/{id}/gates | Phase 4 | Read gate status |
| POST /v0/approvals/{id}/approve | Sprint 5.1 | Approve gates |
| GET /v0/notifications | Sprint 5.2 | Verify notifications generated |
| POST /v0/artifacts/upload-url | Phase 1 | Upload test geometry |
| POST /v0/artifacts/{id}/finalize | Phase 1 | Finalize uploaded artifact |
| GET /v0/artifacts/{id}/download-url | Phase 1 | Download artifacts for verification |

---

### Section 4: Data Models

No new data models. This sprint creates instances of existing models:

| Model | Count Created | Source |
|-------|---------------|--------|
| Tool | 3 | Phase 1 model |
| ToolVersion | 3 (one per tool) | Phase 1 model |
| Workflow | 1 | Phase 2 model |
| WorkflowVersion | 1 | Phase 2 model |
| Trigger | 1 (webhook) | Phase 2 model |
| Board | 1 | Phase 4 model |
| Card | 4 | Phase 4 model |
| IntentSpec | 4 (one per card) | Phase 4 model |
| Gate | 3 | Phase 4 model |
| GateRequirement | 10 (across 3 gates) | Phase 4 model |
| Run | 1-2 (success + failure scenario) | Phase 2 model |
| NodeRun | 6 per run | Phase 2 model |
| Artifact | 3-4 per run | Phase 1 model |
| CardEvidence | 3+ per card | Phase 4 model |
| GateApproval | 3 (2 human + 1 auto) | Phase 4 model |
| ReleasePacket | 1 | Phase 4 model |
| Notification | 5-8 | Sprint 5.2 model |

---

### Section 5: NATS Subjects

Same subjects as all previous phases. Exercised in sequence:

| Step | Subject | Direction | Payload |
|------|---------|-----------|---------|
| Webhook fires | `airaie.events.trigger.{triggerId}` | API -> Scheduler | `{ run_id, inputs }` |
| mesh_gen_1 dispatched | `airaie.jobs.tool.execution` | Scheduler -> Runner | `{ job_id, tool_ref, inputs, presigned_urls }` |
| mesh_gen_1 completes | `airaie.results.completed` | Runner -> Scheduler | `{ job_id, status, outputs, metrics }` |
| fea_solver_1 dispatched | `airaie.jobs.tool.execution` | Scheduler -> Runner | `{ job_id, tool_ref, inputs, presigned_urls }` |
| fea_solver_1 completes | `airaie.results.completed` | Runner -> Scheduler | `{ job_id, status, outputs, metrics }` |
| stress_check evaluates | (internal, no NATS) | Scheduler | Evaluates condition, selects branch |
| result_analyzer_1 dispatched | `airaie.jobs.tool.execution` | Scheduler -> Runner | `{ job_id, tool_ref, inputs, presigned_urls }` |
| result_analyzer_1 completes | `airaie.results.completed` | Runner -> Scheduler | `{ job_id, status, outputs, metrics }` |
| Run completes | `airaie.events.{runId}` | Scheduler -> SSE bridge | `{ type: "run_completed", status: "succeeded" }` |
| Evidence collected | `airaie.events.evidence.collected` | EvidenceCollector -> GateService | `{ card_id, evidence_ids }` |
| Gate evaluated | `airaie.events.gate.evaluated` | GateService -> NotificationService | `{ gate_id, status }` |

---

### Section 6: Dependencies

| This Sprint Needs | From | Status |
|---|---|---|
| All Sprint 5.1 tasks complete | Sprint 5.1 | Must be complete |
| All Sprint 5.2 tasks complete | Sprint 5.2 | Must be complete |
| Docker available on CI runners | Infrastructure | Must be configured |
| Docker Compose for test infrastructure | `docker-compose.test.yml` | Must exist with Postgres, NATS, MinIO |
| Local Docker registry or pre-built images | Infrastructure | Mock images must be buildable |

---

### Section 7: Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Docker-in-Docker not available in CI | Cannot run E2E test in CI pipeline | Medium | Use GitHub Actions with `services` for Postgres/NATS/MinIO and pre-built mock tool images. Alternatively, use testcontainers with Docker socket mounting. |
| NATS message ordering causes race conditions | Evidence collected before run marked complete | Medium | Use deterministic wait loops: poll run status until SUCCEEDED, then check evidence. Evidence collector has its own completion signal. |
| Mock tools produce invalid output format | Downstream tools fail to parse input | Low | Test each mock tool independently before the chain test. Validate output against ToolContract output schema. |
| Release packet ZIP generation fails | Cannot complete final E2E step | Low | Test release packet generation independently with seeded data first. Have a fallback that generates the packet from database records without needing artifacts to be present in MinIO. |
| Failure scenario (V3) triggers agent with no LLM configured | Agent fails instead of running deterministic fallback | Medium | Ensure LLM provider env var is set to "deterministic" mode for E2E tests. The agent should use algorithmic-only scoring when LLM is unavailable. |

---

### Section 8: Testing Strategy

This entire sprint IS the test. The deliverable is a comprehensive E2E test suite.

| Test | Type | Description | Pass Criteria |
|------|------|-------------|---------------|
| Mock tool image build | Build | Each of the 3 Docker images builds successfully | `docker build` exits 0 for all 3 |
| Mock tool standalone execution | Integration | Run each tool independently with known inputs, verify outputs | metrics.json matches expected values; output artifacts are valid |
| Tool registration | API | Register 3 tools, verify ToolShelf resolves them | GET /v0/toolshelf/resolve returns 3 tools for intent_type=sim.fea |
| Workflow compilation | API | Compile the FEA workflow YAML, verify AST | POST /v0/workflows/compile returns success, 6 nodes, 5 edges |
| Success scenario E2E | E2E | Full chain with load=500N (pass case) | Run succeeds, 5/6 nodes complete, 1 skipped, 3 artifacts, 3+ evidence records, Structural Evidence Gate PASSED |
| Failure scenario E2E | E2E | Full chain with load=1000N (fail case) | Run completes but with different branch, AI optimizer activates, evidence shows fail, gate does NOT pass |
| Human approval flow | API | Approve Quality Review and Release Compliance gates | Gate statuses change to PASSED |
| Board mode escalation | API | Escalate board from Study to Release | Board mode = "release", validation passes (all gates passed) |
| Release packet generation | API | Generate and download release packet | ZIP contains manifest, BOM, proof bundle, sign-offs, artifacts |
| Component verification V1-V8 | Verification | All 8 automated verification checks pass | Pass/fail report shows 8/8 pass |
| Navigation E2E (V9) | Playwright | Dashboard -> Board -> Workflow Studio -> Back navigation | All URLs correct, breadcrumbs render, no console errors |

---

### Section 9: Definition of Done

- [ ] 3 mock Docker images built and tagged (mock-mesh-gen:1.0, mock-fea-solver:3.1, mock-result-analyzer:1.2)
- [ ] Each mock tool runs independently and produces correct deterministic outputs
- [ ] 3 tools registered via API with full 7-section ToolContracts
- [ ] ToolShelf resolves all 3 tools for intent_type=sim.fea with correct ranking
- [ ] FEA workflow compiled and published with 6 nodes (webhook, mesh_gen, fea_solver, condition, result_analyzer, ai_optimizer)
- [ ] Webhook trigger created and returns webhook_url
- [ ] Validation board created in Study mode with correct metadata
- [ ] 4 cards created with locked IntentSpecs and correct dependencies
- [ ] 3 gates created with correct requirements (4 + 2 + 4 = 10 requirements total)
- [ ] Test geometry artifact uploaded to MinIO
- [ ] Success scenario: Workflow triggered via webhook -> all tools execute in correct order -> mesh_gen_1 -> fea_solver_1 -> stress_check (true) -> result_analyzer_1 completes, ai_optimizer_1 SKIPPED
- [ ] 3 artifacts produced and stored in MinIO with SHA-256 hashes
- [ ] CardEvidence auto-collected: max_stress_mpa=187.3 (pass), safety_factor=1.47 (pass), converged=true (pass)
- [ ] Structural Evidence Gate auto-evaluates to PASSED
- [ ] Quality Review Gate approved by lead_engineer -> PASSED
- [ ] Release Compliance Gate approved by quality_manager -> PASSED
- [ ] Board mode escalated to Release (validated: all gates passed, all cards completed)
- [ ] Release packet generated as ZIP with: manifest.json, bom.json, proof_bundle.json, sign_offs.json, artifacts/
- [ ] Failure scenario: load=1000N -> max_stress=374.5 MPa -> condition routes to ai_optimizer_1 -> evidence shows fail -> gate does NOT pass
- [ ] All 8 automated verification checks (V1-V8) pass
- [ ] Playwright navigation test (V9) passes
- [ ] Board readiness = 100% after all approvals complete
- [ ] Notifications generated for run completion, gate approval requests, and gate pass events

---

### Section 10: Sprint Schedule

| Day | Tasks | Owner |
|-----|-------|-------|
| Day 1 (Jun 02) | T1a-T1c: Build 3 mock Docker images. T1d: Register tools via API. T3d: Upload test geometry. | Backend + DevOps |
| Day 2 (Jun 03) | T2a-T2b: Create and compile FEA workflow, create webhook trigger. T3a-T3c: Create board, 4 cards, 3 gates. | Backend |
| Day 3 (Jun 04) | T4a-T4e: Execute success scenario — trigger webhook, monitor execution, verify artifacts, evidence, and gate auto-evaluation. | Backend |
| Day 4 (Jun 05) | T4f-T4i: Human approvals, board escalation, release packet. T5d: Failure scenario (high load). T5a: Write master E2E test script. | Backend + QA |
| Day 5 (Jun 06-07) | T5b: Verification checks V1-V8. T5c: Playwright navigation test. Final documentation. Bug fixes from test runs. | Full team |

---

### Section 11: Rollback Plan

- **Mock tool issues**: If Docker images fail, replace with Python adapter tools (no Docker required). The ToolContract stays the same; only `runtime.adapter` changes from "docker" to "python".
- **Workflow execution fails**: Isolate failure to specific node. Run that node's tool independently to verify. Check NATS message delivery. Check scheduler logs for dispatch errors.
- **Evidence collection fails**: Manually trigger evidence collection via POST /v0/boards/{boardId}/cards/{cardId}/collect-evidence (if available) or trace the onRunCompleted callback chain.
- **Gate evaluation incorrect**: Manually evaluate gate via POST /v0/boards/{boardId}/gates/{gateId}/evaluate. Check requirement evaluation logic for each requirement type.
- **Release packet incomplete**: Generate packet components individually (artifacts, BOM, proof bundle, sign-offs) and assemble manually if the automated ZIP generation fails.
- **CI cannot run Docker**: Run E2E tests locally only. Document CI blockers for Phase 6 resolution.

---

### Section 12: Notes & Decisions

- **Deterministic mock tools**: All mock tools use deterministic formulas so that expected outputs can be hardcoded in test assertions. The mesh generator produces element_count = 50000/element_size. The FEA solver produces max_stress = load/2.67. The result analyzer evaluates against provided thresholds. No randomness, no external dependencies.
- **Two E2E scenarios**: The success scenario (500N load, stress passes) exercises the "true" branch. The failure scenario (1000N load, stress fails) exercises the "false" branch and the AI optimizer agent. Together they cover both branches of the condition node.
- **Mock tool images are minimal**: Alpine-based with bash, jq, and bc. No real simulation software. The goal is to prove the platform orchestration, not the engineering computation. Real tools will replace these in production.
- **Board mode escalation validation**: The system validates that all gates must be PASSED before allowing escalation from Study to Release. If any gate is PENDING or FAILED, the escalation is rejected with a clear error message listing the blocking gates.
- **Release packet structure is the deliverable**: The final proof that the platform works is a valid release packet ZIP. This ZIP is the artifact that engineering teams hand to manufacturing. It contains: all evidence (artifacts), the proof chain (gate evaluations), the sign-off records, and the bill of materials. If this ZIP is correct and complete, the platform is working end-to-end.
- **Agent fallback in E2E**: For the failure scenario, the AI optimizer agent runs in deterministic mode (no LLM). It selects tools algorithmically and produces a proposal. The test verifies that the agent decision trace exists and contains valid scoring, not that the LLM produces a specific recommendation.
- **This sprint is the "acceptance test" for Phases 1-5**: If Sprint 5.3 passes, it proves that all previous 18 sprints across 5 phases produced a working, integrated system. The verification checks (V1-V9) map to acceptance criteria from earlier phases.
