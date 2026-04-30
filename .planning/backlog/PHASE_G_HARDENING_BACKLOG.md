# Phase G — Hardening Backlog

> Generated 2026-04-26 from items deferred during Phases A–F of the AirAIE feature-completion plan.
> Last updated: **2026-04-30** after workflow-surface audit (added G.4.12–G.4.16).
> Each item carries a severity (BLOCK | HIGH | MED | LOW), the surface it lives on, the file/line where the gap is, and a fix sketch.

## Progress at a glance

**9 of 35 items closed across Phase G Sprints 1+2:**
- ✅ G.1.1 CSRF middleware (Sprint 1A)
- ✅ G.1.2 RBAC roles (Sprint 1A)
- ✅ G.1.4 sanitizeBaseURL path-secret strip (Sprint 1A)
- ✅ G.1.5 RegisterUser auto-attach gating (Sprint 1A)
- ✅ G.4.1 Frontend strict tsconfig cleanup (Sprint 1C — 119 → 0 errors)
- ✅ G.5.1 Workflow-runs lineage write parity (Sprint 1B)
- ✅ G.3.1 Persist agent eval runs (Sprint 2A — migration 029)
- ✅ G.3.3 Session `last_active_at` (Sprint 2C — migration 030)
- ✅ G.4.2 WorkflowDetailPage real data (Sprint 2B)

**Item count, 2026-04-30 end of session:**
- Phase 4A trio (G.4.12 retry, G.4.13 alert→toast, G.4.16 palette) — shipped, partially UAT'd. G.4.13 acceptance blocked on G.4.17.
- Phase 4B triage closed G.4.14 (split into 14a/b/c) and G.4.15 (split into 15a–e, with one mislabel resolved).
- New entries: G.4.17 [HIGH] (actionError commit issue), G.4.14a/b/c, G.4.15a (P1 Resume button), G.4.15b/c/e (deferred to 999.x).
- Parked features: 999.1–999.4.

Completed items carry a `✅ [Sprint X]` tag at the top of their section.

This is a triage list, not a phase plan. The natural next groupings:
- **G.1 Security hardening** — CSRF ✅, RBAC roles ✅, WS auth, secret leakage ✅, registration ✅
- **G.2 Reliability + observability** — JetStream operator UX, idle-session metrics, peak memory
- **G.3 Schema completeness** — eval persistence ✅, last-active timestamps ✅, audit columns
- **G.4 Frontend completeness** — kill remaining hardcoded fixtures (WorkflowDetailPage ✅, ToolDetailPage pending), display bugs
- **G.5 Workflow-runs lineage parity** ✅ (closed in Sprint 1B)

---

## G.1 — Security hardening

### G.1.1 CSRF token middleware [HIGH] ✅ [Sprint 1A]

**Shipped:** New `internal/auth/csrf.go` (96 LOC) — double-submit cookie pattern. `airaie_csrf` cookie issued at login/refresh (NOT HttpOnly so SPA can read). Frontend `client.ts` attaches `X-CSRF-Token` on state-changing methods. Behind `AIRAIE_CSRF_REQUIRED=false` for staged rollout (warn-only when off). 7 backend tests + 9 frontend tests.

**Original status (resolved):** Not implemented. `SameSite=Lax` cookies (shipped in F-RBAC) mitigate most cross-site attacks but not subdomain attacks or top-level navigation forgery.

**Where:**
- `airaie-kernel/internal/auth/middleware.go` — add a `CSRFMiddleware` that validates `X-CSRF-Token` on state-changing methods (POST/PUT/PATCH/DELETE)
- `airaie-kernel/internal/handler/auth.go:setAuthCookies` — issue a paired `airaie_csrf` cookie (NOT HttpOnly so the SPA can read it) at login + refresh
- `airaie_platform/frontend/src/api/client.ts` — read the cookie and attach `X-CSRF-Token` on every state-changing request

**Fix sketch:** Double-submit cookie pattern. ~120 LOC across 3 files. Behind an `AIRAIE_CSRF_REQUIRED` env flag for staged rollout.

**Why now:** Demos are fine without it. A public deployment is not.

---

### G.1.2 Role-based authorization (RBAC roles) [HIGH] ✅ [Sprint 1A]

**Shipped:** New `internal/auth/role_routes.go` (130 LOC) — 16-rule route→min-role table, `RequireRoleMiddleware` reusing existing `RoleAtLeast()`. Wired innermost in chain so `identity.Role` is populated before the role check. Trust-level mutation gated to admin; gate waivers admin-only; gate approve/reject maintainer+. Behind `AIRAIE_RBAC_ROLES_ENFORCED=false`. 8 backend tests.

**Original status (resolved):** Membership is binary. F-RBAC enforces "is project member" but every member gets owner-level access to every endpoint.

**Where:**
- `airaie-kernel/internal/auth/membership.go:159` — `identity.Role = member.Role` is set but no handler checks it
- `airaie-kernel/internal/auth/rbac.go` — already has a 5-tier hybrid (`owner | admin | maintainer | engineer | viewer`) but isn't enforced on most routes
- `airaie-kernel/internal/handler/handler.go` — needs a `requireRole(...)` decorator on mutating routes

**Fix sketch:** Settle the role taxonomy first (the COMPLETION_PLAN flagged this as an open decision). Then either (a) enforce per-route via a decorator pattern, or (b) extend `RBACMiddleware` to consume a route→role table. ~200 LOC + a migration if roles change shape.

---

### G.1.3 WebSocket auth audit [HIGH]

**Status:** F-RBAC review explicitly flagged `/v0/ws` as not audited. Cookies will ride along on upgrade requests via `credentials: 'include'`, but the server-side WS handler hasn't been verified to validate them or check membership.

**Where:** `airaie-kernel/internal/handler/websocket.go` (~92 LOC).

**Fix sketch:** Read the handler, confirm it calls into `auth.AuthMiddleware` and `RequireProjectMembership` equivalents during the HTTP-to-WS upgrade. Add a smoke test that verifies an unauthenticated WS connection is refused.

---

### G.1.4 `sanitizeBaseURL` doesn't strip path-embedded secrets [MED] ✅ [Sprint 1A]

**Shipped:** `sanitizeBaseURL` now strips path segments matching `^[A-Za-z0-9_-]{20,}$`, replacing with `***`. URL-encoding gotcha solved by setting `RawPath` after mutation so `*` literals don't get percent-encoded. Always on. 10 sub-tests in `health_test.go`.

**Original status (resolved):** `airaie-kernel/internal/agent/health.go` — the function strips userinfo and query strings but not path segments.

**Risk:** Operators who paste a self-hosted vLLM URL like `https://api.example.com/v1/org/sk-abc123def456` (where the API key is in the path itself) would expose it via `GET /v0/agents/llm/health`.

**Fix sketch:** Add a heuristic that strips path segments matching `[A-Za-z0-9_-]{20,}` and replaces them with `***`. ~10 LOC. Add a doc note that operators should use header-based auth, not URL-embedded keys.

---

### G.1.5 RegisterUser auto-grants `prj_default` owner role [MED] ✅ [Sprint 1A]

**Shipped:** Startup WARNING when `IsProd() && AllowRegistration` so operators are alerted at boot. New `AIRAIE_REGISTER_DEFAULT_ROLE` env (default `owner`) lets ops downgrade to `viewer` for stricter posture.

**Original status (resolved):** `airaie-kernel/internal/handler/auth.go:RegisterUser` — auto-attach to `prj_default` as `owner` was added in Phase A as a dev bootstrap.

**Risk:** In production, every new registrant becomes an owner of `prj_default`. Multi-tenant deployments would leak.

**Fix sketch:** Gate the auto-attach behind `cfg.Auth.AllowRegistration` (already present). When `AllowRegistration=false`, registration must be invite-driven and the project membership comes from the invite, not a default. ~20 LOC + admin invite flow.

---

## G.2 — Reliability + observability

### G.2.1 JetStream advisory listener should persist, not just log [MED]

**Where:** `airaie-kernel/services/api-gateway/main.go:93` — `SubscribeMaxDeliveriesAdvisory` currently writes to `log.Printf` only.

**Fix sketch:** Either (a) persist to `audit_events` with a `dlq.poison_message` event type, or (b) extend the existing `internal/workflow/DLQConsumer` to consume this advisory subject. Option (a) is cleaner — operators can query historical poison messages via the audit log viewer F-Observability shipped. ~30 LOC.

---

### G.2.2 JetStream stream/consumer names hardcoded [MED]

**Where:** `airaie-kernel/internal/service/jetstream.go:DefaultJetStreamConfig` — `AIRAIE_JOBS` and `airaie-runner` are constants.

**Why care:** A multi-tenant deployment with N runner pools needs N consumers per stream. Today every runner reads the same consumer offset.

**Fix sketch:** Read `AIRAIE_JS_STREAM` and `AIRAIE_JS_CONSUMER` env vars with the existing constants as defaults. ~10 LOC.

---

### G.2.3 AckWait × MaxDeliver poison-message latency [LOW]

**Where:** `airaie-kernel/internal/service/jetstream.go:DefaultJetStreamConfig` — `AckWait=5min × MaxDeliver=5 = 25min` worst-case before a poison message exits rotation.

**Decision:** If 25 min is too slow, lower `AckWait` (more sensitive to slow tools) or lower `MaxDeliver` (less retry budget). Or add an in-runner heuristic that ack_terms after 4 redeliveries. Currently fine for the demo.

---

### G.2.4 Cost rollup caps at 10,000 runs [MED]

**Where:** `airaie-kernel/internal/service/cost_tracking.go:99` — `store.ListRuns(... Limit: 10000)`.

**Risk:** High-volume projects silently lose older cost data from the dashboard. F-Observability didn't add a UI banner.

**Fix sketch:** Either (a) paginate the cost rollup server-side and aggregate across pages, or (b) add a UI banner when result count equals the cap. (a) is correct; (b) is a 5-line interim fix.

---

### G.2.5 AuthContext infinite-loop guard for backgrounded tabs [LOW]

**Where:** `airaie_platform/frontend/src/contexts/AuthContext.tsx:probeSession` — `whoami` probe fires every 12 min via `setInterval`.

**Risk:** A tab backgrounded for hours will eventually probe with expired access AND refresh cookies. The current refresh path calls `clearAuth()` on failure, which breaks the loop — so there's no actual infinite loop, but the user sees a hard logout instead of a "session expired, please log in" prompt.

**Fix sketch:** Add a `consecutiveFailures` counter; after 3 failures, suppress the probe interval and surface a "Reconnect" UI affordance. ~15 LOC.

---

### G.2.6 Runner CPU end-to-end test [MED]

**Status:** F-Resource verified memory enforcement; CPU translation has unit-test coverage but no end-to-end "rogue tool spins, gets throttled" test.

**Where:** `airaie-kernel/runner/tests/resource_enforcement.rs` — extend with a CPU-spin variant.

**Fix sketch:** ~80 LOC of stat-sampling. A rogue Python script in a tight loop, manifest declaring `cpu: 0.5`, sample `docker stats` for 5 seconds, assert observed CPU usage is ~50% ± 10%. Test gated by `#[ignore]` (Docker required). Doc'd as TODO in `runner-resource-limits.md`.

---

### G.2.7 `Metrics.peak_mem_mb` hardcoded to 0 [LOW]

**Where:** `airaie-kernel/runner/src/...` — F-Resource report flagged this; the field exists but isn't populated.

**Fix sketch:** Sample `/sys/fs/cgroup/memory/.../memory.max_usage_in_bytes` (cgroup v1) or `memory.peak` (cgroup v2) at container exit. ~30 LOC.

---

## G.3 — Schema completeness

### G.3.1 Persist agent eval runs [MED] ✅ [Sprint 2A]

**Shipped:** New `agent_eval_runs` table (migration 029) with FK to agents, JSONB summary/results, indexes by `(agent_id, started_at DESC)` and `(project_id, started_at DESC)`. `RunAgentEvals` persists every completed run (best-effort, log-and-continue). New routes `GET /v0/agents/{id}/eval-runs` (paginated) and `GET /v0/agents/{id}/eval-runs/{runId}`. Frontend `EvalRunnerPanel` dropped its in-memory history; uses `useEvalRuns(agentId, {limit: 20})` with auto-select of most-recent on mount. 3 backend tests.

**Status:** E-Evals shipped synchronous-only. Run history evaporates on tab unmount.

**Where:**
- New migration: `agent_eval_runs` table with `id`, `agent_id`, `agent_version`, `status`, `started_at`, `completed_at`, `summary_json`, `results_json`
- New backend handlers: `GET /v0/agents/{id}/eval-runs`, `GET /v0/agents/{id}/eval-runs/{runId}`
- Frontend: hook up `useEvalRuns` (currently in-memory) to the new endpoint

**Fix sketch:** ~1 sprint of backend work. Unblocks regression-tracking + trend charts.

---

### G.3.2 `agent_eval_cases` schema gaps [LOW]

**Where:** `airaie-kernel/internal/model/model.go:AgentEvalCase`.

**Missing columns:**
- `description` — referenced in original spec, dropped by E-Evals because no column exists
- `expected_outcome` — same

**Fix sketch:** Single migration adding two TEXT columns. Frontend types + form already shaped to consume them.

---

### G.3.3 `Session.last_active_at` for honest duration metric [MED] ✅ [Sprint 2C]

**Shipped:** Migration 030 adds `last_active_at TIMESTAMPTZ` to `agent_sessions` (backfilled to `created_at` for existing rows). New `Store.TouchSession(ctx, sessionID)` for cheap activity bumps. 5 explicit call sites updated in `internal/agent/session.go` (`AppendResult`, `Close`, `LogDecisionTrace`, `ExtendSession`, `AddMessage`). `buildSessionMetrics` now computes duration as `LastActiveAt - CreatedAt` instead of `now() - CreatedAt`, with fall-through to `CreatedAt` for pre-backfill rows. New `TestSessionDuration_HonestActivity` (4 subcases). Existing tests pass unchanged.

**Where:** `airaie-kernel/internal/model/` `Session` model + `internal/handler/agent_sessions.go:buildSessionMetrics`.

**Risk:** `duration_seconds` for an active idle session counts wall-clock from `CreatedAt`. A session created 4 hours ago with zero messages reports 4h of "duration."

**Fix sketch:** Add a `last_active_at TIMESTAMPTZ` column, update on every message append + status transition, use it in the duration calc. ~50 LOC + migration.

---

### G.3.4 Trust-level rationale audit emit [LOW]

**Status:** Cleanup-A added the `rationale` field to `UpdateTrustLevelHandlerRequest` and the service request. Backend now accepts it. The audit emission referenced in the F-RBAC review still isn't writing it to a queryable audit column.

**Where:** `airaie-kernel/internal/service/registry.go:UpdateTrustLevel` — emits an audit event but the event payload's `rationale` field is just a JSON blob, not a first-class column.

**Decision:** Keep as JSON-blob-only (queryable via `payload->>'rationale'` in Postgres) or promote to a column? JSON blob is simpler; column is faster for filter queries. Lean toward leaving as-is until someone needs to filter audit log by rationale.

---

### G.3.5 `dry_run` forced to true server-side [LOW]

**Where:** `airaie-kernel/internal/handler/agent_evals.go:RunAgentEvals` — handler hardcodes `dry_run=true` regardless of client request.

**Decision:** Should evals ever run in non-dry-run mode (i.e., actually consume budget + dispatch to NATS)? Product call. If yes, lift the override; if no, document the constraint.

---

### G.3.6 `SearchCapabilities` N+1 over `tool_versions` [LOW]

**Where:** `airaie-kernel/internal/service/registry.go:532-583` — explicit per-tool `ListToolVersions` loop.

**Risk:** Not on the hot path today; will regress when capability search is wired into the UI.

**Fix sketch:** Replace with a single JOIN query (mirror the C5 pattern that fixed `ListTools`). ~30 LOC.

---

## G.4 — Frontend completeness

### G.4.1 130 pre-existing `tsconfig.app.json` errors [MED] ✅ [Sprint 1C]

**Shipped:** 119 → 0 errors across 26 files. 4 latent runtime bugs surfaced and fixed: `dashboard.ts` outage enum (`'down'` → `'outage'`), `useTools.ts` `useCreateToolVersion` was sending wrong field shape (`contract_json` vs `contract`), `AgentSpecForm` writing 5 fields the type didn't carry, `EvalTab` status enum drift (`'pass'` vs `'passed'`).

**Where:** `TriggerPanel`, `AgentSpecForm`, `ToolDetailPage`, `dashboard/*`, `CreateBoardPage`, `ProfilePage`, `ParameterForm`, `nodes/DataNode`, `useTools`, `useWorkflow`, etc. — 21 files total.

**Status:** The default `tsc --noEmit` returns clean (which is what every review gated against). The stricter `tsconfig.app.json` flags 130 errors that pre-date this entire run. They're real bugs (unused vars, undefined-not-string, missing properties) but shipping wasn't blocked because the team's CI uses the looser config.

**Fix sketch:** A focused cleanup pass. Probably 1-2 days. Each error is a 1-3 line fix. Worth doing before the next major refactor.

---

### G.4.2 WorkflowDetailPage still ships mock VERSIONS / RUNS / NODES arrays [MED] ✅ [Sprint 2B]

**Shipped:** All three hardcoded arrays removed. Wired to `useWorkflowVersions`, `useRunList(workflowId)`, and DSL-derived nodes via `decodeDsl` + `deriveNodeItems`. Three mappers + two derivers added in-page. DSL node summary handles both legacy `depends_on` and new `edges` array shapes; sticky notes filtered out. Loading/empty/error states for all three sections.

**Where:** `airaie_platform/frontend/src/pages/WorkflowDetailPage.tsx` — Phase A replaced the `WORKFLOW` const with `useWorkflow(id)` but the auxiliary arrays (`VERSIONS`, `RUNS`, `NODES`) are still hardcoded.

**Fix sketch:** Wire `useWorkflowVersions(id)` (already exists), `useRuns({ workflow_id: id })` (already exists), and derive `NODES` from the same DSL deserializer Phase B shipped. ~80 LOC.

---

### G.4.3 WorkflowEvalPage is a mock chart [MED]

**Where:** `airaie_platform/frontend/src/pages/WorkflowEvalPage.tsx:367` — comment admits "extremely rudimentary mockup chart via SVG/DOM."

**Fix sketch:** Define what "workflow evaluation" means as a product (likely: success rate over time, cost trend, gate-pass rate). Then wire to real run aggregation. ~1 sprint.

---

### G.4.4 ToolDetailPage hardcoded analytics + "Used In" sections [MED]

**Where:** `airaie_platform/frontend/src/pages/ToolDetailPage.tsx`:
- Lines 551-566: "47 runs / 96% / 15s / $23.50" hardcoded
- Lines around 770-790: "Used In" section with fake workflow / agent names

**Fix sketch:** The numbers are already on `tool` (`tool.usageCount`, `tool.successRate`, `tool.avgDurationSeconds`, `tool.costPerRun`). 5-line replacement. The "Used In" reverse-lookup needs `GET /v0/tools/{id}/agents` + `GET /v0/tools/{id}/workflows` (both missing today — flag in §G.3 if pursued).

---

### G.4.5 ToolDetailPage artifact-port test-run input is decorative [MED]

**Where:** `airaie_platform/frontend/src/pages/ToolDetailPage.tsx:683-686` — renders a dashed placeholder div for `artifact` type ports with no `<input>`.

**Risk:** Tools that require an artifact input (CalculiX, frd-summary) cannot be test-run from this UI.

**Fix sketch:** Replace the div with `<input type="text" placeholder="artifact_id (e.g. art_...)">` that sets `testInputs[port_name] = { artifact_id: value }`. ~10 LOC.

---

### G.4.6 Agent playground "Approve All" semantic gap [LOW]

**Where:** `airaie_platform/frontend/src/components/agents/PlaygroundActionBar.tsx:84` and the `InlineToolCallCard` mounted under it.

**Status:** Two disjoint approval mechanisms ship in production simultaneously:
- `POST /v0/agents/{id}/sessions/{sid}/approve` — sets `_approved=true` in session context (legacy)
- `POST /v0/approvals/{id}/approve` — per-pending-approval (the inline card)

Clicking "Approve All" doesn't clear the inline card's pending approvals, and vice versa.

**Decision:** Either (a) reroute "Approve All" to bulk-approve every pending approval id on the session, or (b) document the two paths and let users learn the distinction. Lean toward (a).

---

### G.4.7 `InlineToolCallCard` doesn't eager-invalidate session query [LOW]

**Where:** `airaie_platform/frontend/src/components/agents/InlineToolCallCard.tsx`.

**Status:** Approve/reject mutations only invalidate `['run-detail', runId]`. Session catches up via 3s poll.

**Fix sketch:** Pass `agentId` + `sessionId` props through `ChatMessage`, invalidate `agentSessionKeys.session(agentId, sessionId)` on success. ~20 LOC.

---

### G.4.8 `data-testid` propagation on shared `Button` component [LOW]

**Where:** `airaie_platform/frontend/src/components/ui/Button.tsx`.

**Status:** F-Playwright relies on `<Button data-testid="new-workflow-button" ... />` — works today (smoke is green) but only because Button forwards `...rest` props. A defensive review hasn't confirmed this is an explicit contract.

**Fix sketch:** Add an explicit `testId?: string` prop on Button + a vitest test that asserts it lands on the underlying DOM. ~5 LOC.

---

### G.4.9 AuditEventDrawer subject-link auto-derivation [LOW]

**Where:** `airaie_platform/frontend/src/components/admin/AuditEventDrawer.tsx`.

**Status:** Subject column shows the first non-empty of `run_id | gate_id | board_id | node_id` but isn't a clickable link. F-Observability deferred this because deriving the right URL per event_type is non-trivial.

**Fix sketch:** A small `eventSubjectUrl(event)` mapper that branches on `event_type` prefix (`tool.*` → `/tools/{id}`, `gate.*` → `/boards/{boardId}#gate-{gateId}`, etc.). ~50 LOC + tests.

---

### G.4.10 `decodeBase64Json<T>` returns `[]` on error regardless of `T` [LOW]

**Where:** `airaie_platform/frontend/src/api/agentPlayground.ts:181-186`.

**Pre-existing:** Returns `[] as unknown as T`. When `T` is `BackendSessionMessage[]` it's correct; when `T` is the context object shape, accessing properties returns `undefined` which the optional-chaining catches but is leaky.

**Fix sketch:** Generic on a `fallback: T` parameter so callers control the shape. ~5 LOC.

---

### G.4.11 `shouldKeepPolling` is dead utility code [LOW]

**Where:** `airaie_platform/frontend/src/utils/evalRun.ts`.

**Status:** Eval runs are synchronous; the polling helper isn't wired anywhere. Kept for future async migration.

**Fix sketch:** Mark `// @internal future-async` or delete. Cosmetic.

---

### G.4.12 RunActionBar retry regressed off the kernel endpoint [HIGH]

**Where:**
- `airaie_platform/frontend/src/api/runs.ts:267` — comment claims *"retryRun is intentionally NOT exported. Kernel /v0/runs/{id}/retry is not registered (404)."*
- `airaie_platform/frontend/src/components/workflows/runs/RunActionBar.tsx:101–108` — Retry button currently calls `start` (a fresh start), not retry semantics.
- `airaie-kernel/internal/handler/handler.go:188` — `POST /v0/runs/{id}/retry` IS registered.
- `airaie-kernel/internal/handler/runs.go:516–575` — handler is implemented, loads prior run's `workflow_id`/`tool_ref` + `inputs_json` and starts a new run with the same inputs.

**Status:** Phase 04 regression. `phases/04-workflow-runs/04-01-PLAN.md:180,187` shipped `retryRun` as a deliverable + acceptance check (`grep "export function retryRun"`). The current code regressed away from this — the comment justifying removal cites a 404 that the kernel does not actually return. Result: the Retry button drops the prior run's inputs and prompts for fresh ones from the form, breaking the user's mental model ("retry this failed run with the same inputs").

**Fix sketch:** Re-add `retryRun(runId)` → `POST /v0/runs/{id}/retry`; add `useRetryRun` hook; wire `RunActionBar` Retry button to `retryMutation.mutate(runId)` instead of `start()`. Delete the stale "intentionally NOT exported" comment. ~30 LOC + 1 hook + 1 component swap. **~30 minutes.** Acceptance: trigger a failing run → click Retry → kernel receives the same `inputs_json` the original run had.

---

### G.4.13 `window.alert` for run-start / delete errors [LOW]

**Where:** `airaie_platform/frontend/src/pages/WorkflowDetailPage.tsx:389,401`.

**Status:** Two `window.alert(msg)` calls for run-start failure and delete failure. The codebase has a `Notification` toast primitive (`src/components/ui/Notification.tsx`) but it isn't wired here.

**Fix sketch:** Replace both `window.alert(msg)` calls with the toast primitive. Match the pattern used by other pages (e.g., where ToolDetailPage surfaces test-run errors). ~15 LOC. **~20 minutes.**

---

### G.4.14 Three workflow-detail affordances stubbed without plan [RESOLVED — 2026-04-30, split into G.4.14a/b/c]

**Triage outcome (Phase 4B, 2026-04-30):** Three sub-decisions, each filed below with concrete scope.

#### G.4.14a Hide "Deactivate" button [LOW] ✅ SHIPPED 2026-04-30 (commit `def07a9`)
Removed the disabled `<Deactivate>` button and its "not yet wired to the backend" title chrome from `WorkflowDetailPage.tsx`.

#### G.4.14b Hide "Compare with current" version-diff button [LOW] ✅ SHIPPED 2026-04-30 (commit `dc56621`)
Removed the disabled "(coming soon)" button + the now-unused GitCompare lucide import from `VersionList.tsx`. Real feature parked as 999.1.

#### G.4.14c Kill "Pin output" stub [LOW] ✅ SHIPPED 2026-04-30 (commit `42ad6a2`)
Removed the console.log-only Pin Output button and unused useCallback/Pin imports from `OutputPanel.tsx`.

**G.4.14 closed.** All three sub-items shipped in three atomic commits.

---

**Where:**
- `airaie_platform/frontend/src/pages/WorkflowDetailPage.tsx:514–520` — "Deactivate" button hard-disabled with `title="Deactivate is not yet wired to the backend"`.
- `airaie_platform/frontend/src/components/workflows/VersionList.tsx:122–125` — "Compare with current (coming soon)" diff button hard-disabled.
- `airaie_platform/frontend/src/components/workflows/ndv/OutputPanel.tsx:14–17` — "Pin output" handler is `console.log(...)` only (no API, no UI feedback).

**Status:** Three frontend affordances promise functionality that doesn't exist anywhere — no kernel endpoint, no phase plan, no backlog entry. Each leaks "coming soon" UX into shipped UI.

**Decision needed:** For each one — implement, hide, or document as not-promised. Not a single-author fix; needs product call.
- **Deactivate:** kernel has no `POST /v0/workflows/{id}/deactivate` endpoint. Product question: should an unpublished workflow be "deactivated", or is that handled by deleting + re-publishing? If the former, design the endpoint + state machine first.
- **Version compare:** non-trivial — version-diff requires a structural diff over the workflow DSL graph. Probably worth its own ~3-day effort if pursued.
- **Pin output:** unclear UX intent. Pin-to-where? The Card-canvas era had pin semantics (pin an output to a Card's input); Phase 11 may have removed the original intent.

**Fix sketch:** Schedule a 30-minute triage call. Drop affordances we don't intend to ship soon (cleanest); spawn focused tasks for the ones we do.

---

### G.4.15 Five kernel run endpoints with no UI consumer [RESOLVED — 2026-04-30, split into G.4.15a–e]

**Triage outcome (Phase 4B, 2026-04-30):** Per-endpoint decisions below. One mislabel correction (`/events` is in fact consumed). One real feature gap (`/resume`). Three "keep backend, defer UI to P2." One investigated this session, kept.

#### G.4.15a `POST /v0/runs/{id}/resume` — surface in UI [P1] ✅ SHIPPED 2026-05-01 (commit `872cd6a`)
- New `resumeRun(runId, checkpointId?)` API + `useResumeRun()` mutation hook
- `RunActionBar` PAUSED branch now renders a Resume button (existing chip stays alongside)
- Endpoint verified live: POST → 404 RUN_NOT_FOUND for missing run; GET → 405 confirms route registered
- Live click-test deferred — needs a paused run in dev DB. Wiring shape mirrors G.4.12 retry; risk is low.

#### G.4.15b `GET /v0/runs/{id}/checkpoints` — keep backend, defer UI [P2 — backlog] ⏳
- **Where:** `handler.go:190`.
- **Decision:** Backend stays. No immediate UI work. File a 999.x "Run checkpoint timeline UI" entry for future debug-tooling work. Useful for time-travel debugging, no day-one user need.

#### G.4.15c `GET /v0/runs/{id}/trace` — keep backend, defer UI [P2 — backlog] ⏳
- **Where:** `handler.go:194`.
- **Decision:** Same as 15b. Backend useful for ops/debug; user-facing UI not needed yet. File 999.x "Run trace tab" entry for future.

#### G.4.15d `GET /v0/runs/{id}/events` — already consumed; drop "missing UI" framing [NO ACTION] ✓
- **Where:** `handler.go:192`.
- **Decision:** **Mislabeled in original entry.** This is the SSE stream consumed by `useRunSSE`. RunLogs already surfaces the stream content. A separate "Trace tab" UI would be duplicative. Closing this sub-item.

#### G.4.15e `POST /v0/workflows/plan` — keep backend, defer UI [P2 — backlog] ⏳
- **Where:** `handler.go:202` → `internal/handler/workflows.go:313` (`PlanWorkflow`).
- **Investigation result (2026-04-30):** Real, useful endpoint — returns workflow AST as a structured plan summary (`{node_count, execution_order, nodes[id, tool_ref, dependencies, priority, critical, timeout], inputs, config}`). NOT an AI planner; pure introspection. Good fit for a "Plan preview" UI before Run, or a Plan-vs-Plan diff view paired with G.4.14b.
- **Decision:** Backend stays. File a 999.x "Workflow plan preview UI" entry (likely paired with the version-diff feature in G.4.14b — both want the same DSL/AST structural reasoning).

**Net actionable from G.4.15:** one P1 (Resume button) + three 999.x backlog entries (checkpoints UI, trace UI, plan preview UI). The /events sub-item was a mislabel.

---

**Where (kernel):** `airaie-kernel/internal/handler/handler.go`:
- L189 `POST /v0/runs/{id}/resume` — unused
- L190 `GET /v0/runs/{id}/checkpoints` — unused
- L194 `GET /v0/runs/{id}/trace` — unused
- L192 `GET /v0/runs/{id}/events` — used internally by `useRunSSE` but no separate Trace tab
- L202 `POST /v0/workflows/plan` — unused (workflow planner endpoint)

**Status:** Backend capability shipped without frontend surfaces. Either the UI promised these (and regressed) or the backend over-built. Worth verifying intent before either deleting or surfacing.

**Fix sketch:** Read each handler to confirm it's real (not a stub). For the real ones, decide whether to surface in the Run detail tabs (Trace tab, Checkpoints sidebar) or document as API-only and move on. The `resume` path looks particularly load-bearing for paused gate-waiting runs — concept doc `AIRAIE_TECHNICAL_ARCHITECTURE.md §5.2` explicitly lists `PAUSED (gate waiting)` as a run state, but no UI exists to resume it. **Suggest treating `resume` as P1, others as P2.**

---

### G.4.16 6-node-type architecture vs 2-node-type kernel runtime [TRACKED — informational]

**Where:**
- `airaie-kernel/internal/workflow/types.go:38–41` — kernel `NodeType` only has `tool` and `agent`.
- `airaie_platform/frontend/src/utils/workflowDsl.ts:152–188` — frontend serializes 7 kinds (trigger, tool, agent, gate, logic, data, stickyNote).

**Status:** Architecture target in `doc/implementation/new_design/AIRAIE_TECHNICAL_ARCHITECTURE.md §2 "The Unified Canvas — 6 Node Types"` describes all 6 as executable. Implementation status in `doc/implementation/new_design/WORKFLOW_DSL.md:50–54` is honest: *"The kernel today only models tool and agent natively… The remaining frontend-only kinds (trigger, gate, logic, data, stickyNote) are persisted in the DSL and round-trip through edits; the compiler treats them as scaffolding until backend support lands."*

**Not a regression — documented future work.** Listed here so future maintainers don't re-flag it as a defect. Closure path is a substantial multi-week effort: scheduler dispatch for in-process nodes (gate evaluator, logic IF/Switch/Merge, data transform/store) + per-type result handlers + DSL validator updates. Not bite-sized.

**Until then:** consider hiding non-functional palette items in the WorkflowEditor `NodePalette` and exposing them as "design-time annotations" with explicit chrome (matches StickyNote's existing semantics), so users don't drop them on the canvas expecting execution. ~1 hour palette edit if pursued before backend implementation.

---

### G.4.17 React commit phase blocked across multiple components in dev [HIGH — broader than initial diagnosis]

**Surfaced:** Live UAT of G.4.13 trio fix on 2026-04-30 (Phase 4A). Documented in `.planning/research/phase-4a-uat-2026-04-30.md`.

**Symptom:** On `/workflows/wf_*`, clicking Start Run when the kernel returns 500 leaves the user with no UI feedback. The `Notification` component never appears.

**Where:** `airaie_platform/frontend/src/pages/WorkflowDetailPage.tsx:385–400, 495–507` (the G.4.13 patch in commit `1135893`).

**What's verified working:**
- `window.alert` is correctly removed and never fires (Playwright `__alertFired` always `false`)
- The mutation reaches error state (`status: "error"`, `error.message: "Internal server error"`)
- The component's `handleStartRun.onError` callback fires (verified by replacing per-call `onError` from a fiber-walked handle)
- `setActionError({title, subtitle})` is being called — verified via React fiber inspection: after click, `WorkflowDetailPage.alternate.memoizedState[74]` holds the correct error object

**What's broken:**
- `WorkflowDetailPage.memoizedState[74]` (current tree) stays `null` forever
- The render-with-actionError-set never commits, so JSX never re-evaluates the `{actionError ? <Notification/> : null}` branch
- `alternate.lanes: 32` indicates a pending update React hasn't flushed
- Reproduces on a clean Vite dev server (PID 69199, started 23:14, no HMR thrash) → not a Fast Refresh issue
- Reproduces with both Playwright synthetic and real clicks → not an event-dispatch issue
- Forced direct `queue.dispatch({...})` on the useState's queue also does not commit → not an event-handler scoping issue

**Hypotheses ranked:**
1. **Re-render storm preempting commit** — runWorkflowMutation transitioning to error triggers a parent or sibling component to re-render at higher priority and starve the WorkflowDetailPage commit. Candidate: RunActionBar or the Inspector panel reading shared store state. ⏳ untested
2. **Suspense boundary above WorkflowDetailPage suspending on a separate query that errors** — would explain why workInProgress fiber accumulates but commit never happens. Candidate: parent has `<Suspense>` and a child query throws. ⏳ untested
3. **`api/client.ts` 401 path on `/v0/tools` dispatching `auth:unauthorized` mid-render** — possibly scheduling a redirect that gets cancelled but corrupts the render queue. The 401 IS happening throughout the session. ⏳ untested
4. **React 19 + React Query 5 concurrent-mode interaction** in onError batching — least likely; would have surfaced in many other repos by now. ⏳ untested

**Fix sketch (debugging path, not a code change yet):**
- Wrap `setActionError` in `flushSync()` from `react-dom` to force a synchronous commit, see if Notification appears. If yes → the value is fine, just being deprioritized; root cause is in the lane scheduler.
- If `flushSync` doesn't help → set a `componentDidCatch`-style error boundary around WorkflowDetailPage and inspect what's thrown during render.
- If still nothing → bisect by removing parent wrappers (Suspense, ErrorBoundary, etc) one by one.

**Severity HIGH** because the trio's headline acceptance ("inline notification on run-start failure") is unverifiable until this resolves. The user-visible regression risk is **LOW** because `window.alert` is removed; users see nothing on failure rather than a blocking modal — silent failure is still strictly better UX than the prior baseline.

---

#### Update — 2026-04-30 18:24Z (post-commit `842eb93`):

**Architectural fix did NOT resolve the issue, but sharpened the diagnosis.**

Migrated `actionError` from `WorkflowDetailPage` local `useState` to a `uiStore.globalNotification` zustand slot rendered by a new `<GlobalNotification/>` mounted at AppShell root. Goal: decouple the notification render from this one page.

**Result:** Same exact commit pattern reproduces in the new `GlobalNotification` component:
- Direct probe via `store.getState().setGlobalNotification({...})` updates the store correctly (verified by reading `store.getState().globalNotification` after — value is set)
- `<GlobalNotification/>` re-renders on the workInProgress (alternate) fiber: `alternate.lanes: 2`, `alternate.memoizedState[2]` holds the new value
- `current` fiber stays at `null` forever — render never commits
- DOM never updates; user never sees the toast

**This rules out:**
- ~~Vite Fast Refresh corruption~~ (rejected earlier)
- ~~WorkflowDetailPage-specific issue~~ (NEW — reproduces in GlobalNotification mounted at AppShell root)
- ~~Hook scoping / per-call onError microtask issue~~ (also reproduces with synchronous direct dispatch)
- ~~Lane priority / scheduling~~ (`flushSync` and `setTimeout(0)` both failed earlier)

**This implicates the entire dev-mode render pipeline** — multiple unrelated components cannot complete a commit. The render phase succeeds, the alternate fiber holds the new value, but commit never promotes alternate → current.

**Refined hypotheses:**
1. **Some always-running render somewhere is preempting commit** — a query auto-refetching, an SSE stream pumping a useState, a useEffect with bad deps causing infinite render. The one component we know mounts on every page is `AppShell` itself or one of its children (`Header`, `Sidebar`, `BottomBar`, `StatusBar`). Likely candidate: the `/v0/tools` 401 retry loop (we see the 401 throughout every session) might be triggering React Query's retry-with-backoff in a tight loop.
2. **An ErrorBoundary is silently catching renders and rolling back** — getDerivedStateFromError + componentDidCatch could swallow render errors. Less likely because no React error logs.
3. **Production build works but dev build is broken** — needs `npm run build && npm run preview` test to rule in/out.

**Next debug steps (not for this session):**
- Pause Vite, run `npm run build && npm run preview`, click Start Run on the production build. If the toast renders → it's a dev-mode issue (Strict Mode, HMR, or some dev-only middleware).
- If still broken → instrument React's commit phase by patching `performWorkOnRoot` or using React DevTools Profiler to see what's blocking commits.
- Check whether the `/v0/tools` 401 is causing a tight retry loop in React Query (look for default retries on `useTools` hooks). If yes, fix the auth issue first; the commit blocker may evaporate.

**The trio's `window.alert` removal still stands.** Code is correct; only the render side is unverifiable. Architecture (global toast) is now in place for whenever the commit issue is resolved.

---

### G.4.18 ToolRegistry "Use in Workflow" navigates to broken URL [MED] ✅ SHIPPED 2026-05-01 (commit `891646e` — HIDE)

**Surfaced:** Phase 5/6 acceptance audit on 2026-05-01.

**What was broken:** `ToolRegistryActionBar.tsx:32` navigated to `/workflow-studio?tool=${selectedToolId}`, but the editor route is `/workflow-studio/:workflowId` (positional) and `WorkflowEditorPage.tsx` has no `useSearchParams` — the `?tool=` query param was silently dropped. Live click landed on a generic "Untitled Pipeline" with no tool placed on the canvas. Phase 6 SC4 ("navigates to editor with tool pre-selected") was not actually delivered, despite the SUMMARY claiming complete.

**Decision:** Hide the button (matches the G.4.14a Deactivate / G.4.14b Compare / G.4.14c Pin Output pattern). The promise is undeliverable without backend/UX work that doesn't exist. Park the real feature as 999.5 below.

**Shipped:** Removed button + `Workflow` lucide import from `ToolRegistryActionBar.tsx`. Action bar now exposes only View Contract + Test Run.

---

### G.4.19 ToolRegistry "Test Run" was a console.log stub [MED] ✅ SHIPPED 2026-05-01 (commit `891646e` — WIRE)

**Surfaced:** Phase 5/6 acceptance audit on 2026-05-01.

**What was broken:** `ToolRegistryActionBar.tsx:54-58` was a `console.log('Test Run:', selectedToolId)` no-op. Identical pattern to the G.4.14c Pin Output stub.

**Discovery:** `ToolDetailPage.tsx:131,668-755` already has a complete working Test Run section — dynamic input form generated from the tool contract (text/number/boolean/json/artifact field types), `createRunMutation.mutateAsync()` wiring, testResult/testRunning/testError states, output panel. The work just wasn't reachable from the registry-level action bar.

**Shipped:**
- `ToolRegistryActionBar`: replaced `console.log` with `navigate(\`/tools/${id}#test-run\`)`
- `ToolDetailPage`: added `useEffect` reading `location.hash` on mount, scrolls to matching anchor via `requestAnimationFrame` after `tool` data resolves (so the target section exists before scroll fires)

**Live UAT (Playwright, 2026-05-01):** Navigated to `/tools/tool_7a5e6263#test-run` (OpenFOAM Cavity CFD). Test Run section scrolled into viewport (`rect.top=330` vs `viewport=724`). Dynamic input form rendered with `case_tar` + `end_time` + `start_time` + `mesh_quality` fields from contract; Test Output placeholder visible on right. Screenshot at `airaie_platform/phase4b-uat-test-run-deeplink.png`.

---

## G.5 — Workflow-runs lineage parity

### G.5.1 Workflow runs short-circuit before `recordRunLineage` [HIGH] ✅ [Sprint 1B]

**Shipped:** Finding was narrower than feared — `recordLineage` already fired in `result_handler.go` but had real bugs. Replaced with `recordLineageBulk` (~85 LOC) that handles both `RefTypeNodeOutput` AND `RefTypeWorkflowInput` (top-level workflow input artifacts), uses bulk `CreateArtifactLineageEdges` instead of per-row, dedupes parents, skips `uploaded:` placeholders, slog.Warn on failure. 6 new tests in `result_handler_lineage_test.go`.

**Where:** `airaie-kernel/internal/service/run.go:825-828` — the workflow-run path returns early before `resolveOutputArtifacts` and `recordRunLineage` are called. Comment at 898-900 says "Workflow runs already returned above and are handled by `internal/workflow/result_handler.go`."

**Status:** D6 wired lineage for tool-run completions. Workflow runs (the more common path) currently produce **zero lineage edges**. `GET /v0/artifacts/{id}/lineage` returns empty for any artifact produced by a workflow.

**Fix sketch:** Add a `recordRunLineage` call in `internal/workflow/result_handler.go` mirroring the tool-run path. The tool's parent artifact set lives on `prior.InputsJSON` for tool runs — for workflow runs it lives on `node_run_outputs` (the per-node input/output map). Read the result handler to see what's available. ~80 LOC.

**Why HIGH:** Without this, the entire artifact provenance story for workflow-driven runs is broken. Cleanup-A added the read endpoint composition; this closes the write side.

---

## Triage recommendation

**Sprints 1+2 closed (9 items):** ✅ G.1.1, G.1.2, G.1.4, G.1.5, G.4.1, G.5.1, G.3.1, G.3.3, G.4.2

**Suggested Sprint 3 (next session — three parallel agents, distinct file scopes):**
1. **G.1.3** WebSocket auth audit — `/v0/ws` not yet verified to enforce auth + membership during the HTTP→WS upgrade
2. **G.2.1 + G.2.2** JetStream operator UX — persist advisory subscriber output to `audit_events`; make stream/consumer names env-driven
3. **G.4.4 + G.4.5** ToolDetailPage real data — replace hardcoded "47 runs / 96% / 15s / $23.50" analytics block with `tool.usageCount` etc.; replace decorative dashed div for artifact-port test-run with a working `<input type="text">`

**Suggested Sprint 4 — Workflow surface honesty (next session priority — small, high-leverage):**
1. **G.4.12** [HIGH, ~30 min] Retry regression — re-export `retryRun`, add `useRetryRun`, wire `RunActionBar` Retry button to it. Phase-04 acceptance regression. Single-file scope.
2. **G.4.13** [LOW, ~20 min] Replace `window.alert` calls in `WorkflowDetailPage.tsx:389,401` with the existing `Notification` toast.
3. **G.4.15** [P1 of MED] Surface `POST /v0/runs/{id}/resume` in the Run detail UI for paused gate-waiting runs (concept doc explicitly lists `PAUSED` as a run state). The other unused endpoints (`/checkpoints`, `/trace`, `/workflows/plan`) — decide separately whether to surface or document as API-only.
4. **G.4.14** [MED, decision-first] 30-min triage on Deactivate / Compare versions / Pin output stubs. Drop the affordances we don't intend to ship soon.
5. **G.4.16** [informational] Optional 1-hour palette edit to hide non-executable node types (gate / logic / data) until kernel runtime support lands — prevents users from dropping non-functional nodes on the canvas.

**Suggested Sprint 5 (cleanup batch — 1-2 small agents):**
- **G.2.3** AckWait × MaxDeliver poison-message latency tuning
- **G.2.4** Cost rollup 10000-run cap UI banner / pagination
- **G.2.5** AuthContext consecutive-failure guard for backgrounded tabs
- **G.3.2** `agent_eval_cases.description` + `expected_outcome` columns
- **G.3.4** Trust-rationale audit column (or document JSON-blob query path)
- **G.3.5** `dry_run` UI toggle (or document the override)
- **G.3.6** SearchCapabilities N+1 fix
- **G.4.6** "Approve All" semantic gap (unify or document)
- **G.4.7** InlineToolCallCard eager session invalidation
- **G.4.8** Button `data-testid` propagation contract
- **G.4.9** AuditEventDrawer subject-link auto-derivation
- **G.4.10** `decodeBase64Json` typed-fallback
- **G.4.11** Delete dead `shouldKeepPolling`

**Phase F.2 / production-readiness (separate effort):**
- **G.2.6** Runner CPU end-to-end test (~80 LOC stat-sampling, Docker-required)
- **G.2.7** `Metrics.peak_mem_mb` cgroup sampling
- **G.4.3** WorkflowEvalPage real chart (product decision needed: what does "workflow evaluation" mean?)

Everything else is acceptable as ongoing maintenance.

---

## What's NOT in this backlog

The following items were resolved either before this backlog existed (during Phase A–F reviews) or in Phase G Sprints 1+2 (since this doc was first written). Included here so future maintainers don't re-flag them:

### Closed in Phase G Sprints 1+2

- ✅ G.1.1 CSRF middleware — Sprint 1A — `internal/auth/csrf.go`, `airaie_csrf` cookie, frontend `X-CSRF-Token` header. Behind `AIRAIE_CSRF_REQUIRED` flag.
- ✅ G.1.2 RBAC roles — Sprint 1A — `internal/auth/role_routes.go`, 16-rule route→role table, `RequireRoleMiddleware`. Behind `AIRAIE_RBAC_ROLES_ENFORCED` flag.
- ✅ G.1.4 sanitizeBaseURL path-secret strip — Sprint 1A — regex `^[A-Za-z0-9_-]{20,}$` strips API-key-shaped path segments.
- ✅ G.1.5 RegisterUser auto-attach — Sprint 1A — startup WARNING in prod + `AIRAIE_REGISTER_DEFAULT_ROLE` env override.
- ✅ G.3.1 Persist agent eval runs — Sprint 2A — migration 029 + GET endpoints + frontend rewire.
- ✅ G.3.3 Session `last_active_at` — Sprint 2C — migration 030 + 5 touch-paths + honest duration calc.
- ✅ G.4.1 strict tsconfig cleanup — Sprint 1C — 119 → 0 errors; surfaced 4 latent runtime bugs.
- ✅ G.4.2 WorkflowDetailPage real data — Sprint 2B — VERSIONS/RUNS/NODES arrays gone, all wired to live hooks.
- ✅ G.5.1 Workflow lineage parity — Sprint 1B — `recordLineageBulk` rewrites the workflow result handler with workflow-input artifact support.

### Resolved during Phase A–F reviews

- ✅ Silent envelope unwrap on `listGates` / `listGateRequirements` / `listCardEvidence` — fixed in Cleanup-B
- ✅ `expires_at` on waivers — added column + handler read in Cleanup-A
- ✅ `rationale` on approve — service now persists in Cleanup-A
- ✅ `rationale` accepted on trust-level update — handler change in wave 2 review
- ✅ Iterations as `*int` (absent ≠ zero) — Phase E review fix
- ✅ HealthChecker mutex held during 5s probe — Phase E review fix
- ✅ Inline trust mutation conflict in publish handler — wave 1 review fix
- ✅ Hardcoded `prj_default` header in client.ts — Phase A
- ✅ Mock token short-circuits — Phase A
- ✅ DSL deserialization missing — Phase B (B1 + B3)
- ✅ Workflow editor save/compile/publish/run wiring — Phase B
- ✅ Tool registry detail/manifest/test-run UI — Phase C
- ✅ Boards/Cards/Gates governance loop UI — Phase D end-to-end
- ✅ artifact_lineage write for tool runs — D6 (workflow-run path is G.5.1)
- ✅ Agent playground LLM round-trip — Phase E
- ✅ Eval runner UI — E-Evals
- ✅ HttpOnly cookie auth + cookie-first refresh — F-RBAC
- ✅ JetStream durable consumer — F-NATS
- ✅ Runner memory-limit enforcement test — F-Resource

---

## 999.x — Deferred features (parked from Phase 4B triage 2026-04-30)

These are real-value features that surfaced during Phase 4B triage but don't justify near-term execution. Each is a candidate for a future phase or milestone.

### 999.1 Workflow version structural diff [DEFERRED — ~3-day phase]

**Source:** Phase 4B triage of G.4.14b (2026-04-30).

**What:** "Compare with current" version-diff UI on the workflow detail page. Compares two workflow versions by walking the DSL graph (nodes, edges, config diffs, port changes) and rendering a structural diff.

**Why parked:** Real value (helps users understand what changed between draft and published). Non-trivial — needs DSL graph diff algorithm, layout for added/removed/changed nodes, edge-change detection. ~3-day effort. Not blocking near-term work.

**Pairs with:** 999.3 (plan preview UI) — both want similar AST/DSL structural reasoning.

### 999.2 Run checkpoint timeline UI [DEFERRED — debug tooling]

**Source:** Phase 4B triage of G.4.15b (2026-04-30).

**What:** Surface `GET /v0/runs/{id}/checkpoints` as a timeline / step-back debug UI on the Run detail page. Lets users inspect intermediate run state.

**Why parked:** Backend is real and useful for ops/debug. No day-one user need. Pursue when debug tooling becomes a focus.

### 999.3 Run trace tab UI [DEFERRED — debug tooling]

**Source:** Phase 4B triage of G.4.15c (2026-04-30).

**What:** Surface `GET /v0/runs/{id}/trace` as a structured trace tab on Run detail. Distinct from the existing RunLogs (which consumes `/events` SSE) — trace is post-hoc, structured, queryable.

**Why parked:** Same as 999.2.

### 999.4 Workflow plan preview UI [DEFERRED — pairs with 999.1]

**Source:** Phase 4B triage of G.4.15e (2026-04-30).

**What:** "Preview plan" affordance before Start Run that calls `POST /v0/workflows/plan` and shows the AST summary (node count, execution order, dependency graph, declared inputs). Useful as both a pre-run sanity check and a building block for the version-diff in 999.1.

**Why parked:** Backend already returns useful structured data; UI work is bite-sized once 999.1's DSL-rendering primitives exist. Treat as a follow-on.

### 999.5 Tool Registry → Workflow Editor handoff [DEFERRED — design needed]

**Source:** G.4.18 (2026-05-01). The "Use in Workflow" button was hidden because the destination wasn't designed.

**What:** When a user is browsing the tool registry and clicks "Use in Workflow", they should land in a workflow editor with the chosen tool ready to place on the canvas. The current implementation navigated to a malformed URL (`/workflow-studio?tool=${id}`) that the editor route didn't accept and that the editor component didn't read.

**Design questions to resolve before implementation:**
1. **Target workflow** — does "Use in Workflow" mean (a) open an existing workflow they pick from a list, (b) create a new draft workflow with this tool pre-placed, or (c) drop the tool into whichever workflow they last had open?
2. **Placement semantics** — does the tool auto-place as a node on the canvas (where? what default port wiring?), or just highlight in the palette so the user drags it manually?
3. **Pre-selection state** — if (b) "new draft", how is the workflow named/saved? Implicit name like `Workflow with {ToolName}`? Save-on-first-edit?

**Implementation sketch (after design lands):**
- Add a "+ Use this tool" entry-point on `ToolRegistryActionBar` that opens a small picker modal: "New workflow" or list of existing workflows
- For "New workflow": call `POST /v0/workflows` with a default name, then navigate to `/workflow-studio/${newId}?tool=${toolId}`
- Modify `WorkflowEditorPage` to consume `?tool=` via `useSearchParams` and either auto-place a node or scroll/highlight the tool in the `NodePalette`
- ~1-2 days of work depending on placement semantics

**Why parked:** Real product question, not a code-only fix. Cleaner to surface the design conversation than to ship one wrong default.

---

End of backlog.
