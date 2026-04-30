# Workflow Surface Audit — 2026-04-30

> **Purpose.** Self-contained brief for the next session. Captures findings from a code-only audit of the Workflow stack (frontend + kernel) with verification against the canonical specs and existing planning artifacts.
> **Author.** Carry-over from session 2026-04-30 (post DB/MinIO/NATS reset).
> **Audit scope.** Frontend `src/pages/Workflow*` + `src/components/workflows/**`, kernel `internal/workflow/**` + `internal/handler/{workflows,runs}.go`, and routes registered in `internal/handler/handler.go`.

---

## Source-of-truth alignment

This audit cross-referenced findings against three layers of canonical docs.

| Layer | Doc | What it tells you |
|---|---|---|
| **Architecture target** | `doc/implementation/new_design/AIRAIE_TECHNICAL_ARCHITECTURE.md §2` | The target state: 6 unified canvas node types (Trigger / Tool / Agent / Gate / Logic / Data) plus StickyNote, all executable. |
| **Implementation status** | `doc/implementation/new_design/WORKFLOW_DSL.md` (lines 50–54) | Honest current state: kernel models only `tool` and `agent` natively; the other kinds round-trip but are scaffolding. |
| **Architecture deep-dive** | `doc/architecture/workflow-system.md §2` | Lists 10 node-type subdivisions (Trigger / Tool / Agent / Condition / Switch / Merge / Transform / Gate / Sub-Workflow / Delay) — the subtypes folded into the 6 canonical categories. |

**Key finding for the alignment story:** the architecture target and the implementation status are both honest and consistent — they describe different points in time. No spec is broken; the gap is in delivery, not in design.

---

## Findings, classified

### Verified regression (1) — fix-with-confidence

#### F1. Run retry regressed off the kernel endpoint
- **Where:**
  - Frontend stale comment: `airaie_platform/frontend/src/api/runs.ts:267`
  - Frontend Retry button calls `start` (a fresh start, not a retry): `RunActionBar.tsx:101–108`
  - Kernel endpoint exists: `airaie-kernel/internal/handler/handler.go:188` → handler at `runs.go:516–575`
- **Spec evidence:** `phases/04-workflow-runs/04-01-PLAN.md:180` and acceptance check at line 187 (*"`grep "export function retryRun" frontend/src/api/runs.ts` returns a match"*) shipped retry as a Phase-04 deliverable.
- **Status:** The phase deliverable was reverted at some point with a stale `// not registered (404)` comment. The kernel does not return 404 — it implements retry by loading the prior run's `workflow_id`/`tool_ref` and `inputs_json` and starting a new run with the same inputs. Loss of semantics: clicking Retry today drops the prior run's inputs.
- **Tracked as:** `PHASE_G_HARDENING_BACKLOG.md` G.4.12 [HIGH].
- **Effort:** ~30 minutes. Single-file changes (`api/runs.ts`, `hooks/useRuns.ts`, `RunActionBar.tsx`). No backend work.

### Tracked elsewhere — no new entry needed

#### F2. WorkflowEvalPage is a static mockup
- **Where:** `airaie_platform/frontend/src/pages/WorkflowEvalPage.tsx` — 412 lines, only imports `useNavigate` + `lucide-react` + `cn`. Hardcoded "87%" overall score on line 210. Zero `useQuery`/`useMutation`/fetch.
- **Tracked as:** `PHASE_G_HARDENING_BACKLOG.md` G.4.3 [MED].
- **Status:** Already in backlog; product decision still pending ("what does workflow evaluation mean?"). No new entry.

### Documented future work (1) — informational

#### F3. 4 of 6 advertised node types are frontend-only scaffolding
- **Where:**
  - Kernel: `airaie-kernel/internal/workflow/types.go:38–41` — `NodeType` only has `tool` and `agent`.
  - Frontend serializer emits 7 kinds: `airaie_platform/frontend/src/utils/workflowDsl.ts:152–188`.
  - Compiler dispatch only recognizes 2: `airaie-kernel/internal/workflow/compiler.go:66,99`.
- **Spec evidence:** `WORKFLOW_DSL.md:50–54` explicitly states the kernel models only `tool` + `agent`; the rest round-trip as scaffolding.
- **Status:** Documented future work, not a regression. Closure path: scheduler dispatch for in-process node types (gate evaluator, logic IF/Switch/Merge, data transform/store) + per-type result handlers + DSL validator updates. Multi-week effort.
- **Tracked as:** `PHASE_G_HARDENING_BACKLOG.md` G.4.16 [TRACKED — informational].
- **Pragmatic mitigation (1 hour, optional):** hide non-executable palette items in `NodePalette` until backend support lands, so users don't drop non-functional nodes on the canvas. Document them as "design-time annotations" with explicit chrome (matches StickyNote semantics).

### Genuinely uncovered (4) — not in any spec, plan, or backlog before today

#### F4. `window.alert` for run-start / delete errors
- **Where:** `WorkflowDetailPage.tsx:389,401`.
- **Status:** The codebase has a `Notification` toast primitive that isn't wired here.
- **Tracked as:** G.4.13 [LOW].
- **Effort:** ~20 minutes.

#### F5. Three workflow-detail affordances stubbed without plan
- **Where:**
  - `WorkflowDetailPage.tsx:514–520` — "Deactivate" hard-disabled with `title="not yet wired"`.
  - `VersionList.tsx:122–125` — "Compare with current (coming soon)" diff button hard-disabled.
  - `OutputPanel.tsx:14–17` — Pin output is `console.log(...)` only.
- **Status:** Three frontend affordances promise functionality that doesn't exist in the kernel, in any phase plan, or in the backlog.
- **Tracked as:** G.4.14 [MED — decision-first].
- **Recommendation:** 30-minute triage call. Drop affordances we don't intend to ship soon. Don't leak "coming soon" into shipped UI.

#### F6. Five kernel run endpoints with no UI consumer
- **Where:** `internal/handler/handler.go`:
  - L189 `POST /v0/runs/{id}/resume` — unused
  - L190 `GET /v0/runs/{id}/checkpoints` — unused
  - L194 `GET /v0/runs/{id}/trace` — unused
  - L192 `GET /v0/runs/{id}/events` — used by `useRunSSE` only, no separate Trace tab
  - L202 `POST /v0/workflows/plan` — unused
- **Spec relevance:** `AIRAIE_TECHNICAL_ARCHITECTURE.md §5.2` lists `PAUSED (gate waiting)` as a run state — but no UI exposes the resume action that would unpause it.
- **Tracked as:** G.4.15 [MED]. Sub-priority: `resume` is P1, others P2.

---

## Recommended next-session plan

### Sprint 4 — "Workflow surface honesty" (proposed)

Goal: ship the small wins that close known regressions and stop leaking "coming soon" UX, then make a decision on the bigger uncovered items.

**Phase 4A — quick wins (1 dev-day total):**

| # | Task | Effort | Risk |
|---|---|---|---|
| 1 | **G.4.12** Re-export `retryRun`, add `useRetryRun`, wire `RunActionBar` Retry to it. Delete stale comment. | ~30 min | low — kernel endpoint already exists and is implemented |
| 2 | **G.4.13** Replace `window.alert` × 2 in `WorkflowDetailPage` with the `Notification` toast primitive. | ~20 min | low |
| 3 | **G.4.16** (optional) Hide gate / logic / data palette items behind a `NEXT_BACKEND_RELEASE` feature flag, label as "design-time annotation". | ~1 hour | low — palette-only edit |

Acceptance for 4A:
- Trigger a failing workflow run → click Retry → kernel receives the same `inputs_json` (verifiable via `GET /v0/runs/{newId}` and comparing to original).
- Provoke a run-start error → toast appears (no `alert()` modal).
- (If 4A.3 done) Open the workflow editor → the palette shows Tool / Agent / Trigger / StickyNote only.

**Phase 4B — product triage (30 minutes, no code):**

| # | Task | Output |
|---|---|---|
| 4 | **G.4.14** Triage Deactivate / Compare versions / Pin output. Per item: ship / hide / document. | One-line decision per affordance, captured in backlog. |
| 5 | **G.4.15** Triage the 5 unused run endpoints. Decide which surface in UI vs document as API-only. | Same — captured in backlog. |

**Phase 4C — implementation of Phase-4B decisions** (effort depends on triage outcome — not pre-scoped).

### What 4A does NOT need

- No kernel changes (G.4.12 reuses the existing `/v0/runs/{id}/retry` handler).
- No new tests beyond exercising the new hook.
- No migrations.
- No ROADMAP changes — Phase 04 is already marked shipped; this just closes a regression that crept in afterward.

### Sprint 5 — closure of carry-over (if 4A capacity remains)

Pick from existing backlog §G.4 cleanup batch (G.4.6 through G.4.11) — small UX/correctness items, each ~20–60 minutes. Already triaged in the original backlog.

---

## Cross-reference: where each finding lives

| Finding | Backlog entry | Phase plan | Spec doc |
|---|---|---|---|
| F1 retry regression | **G.4.12** (new, 2026-04-30) | `phases/04-workflow-runs/04-01-PLAN.md:180,187` | n/a |
| F2 eval mock | G.4.3 (existing) | n/a | n/a |
| F3 6-vs-2 nodes | **G.4.16** (new, informational) | n/a | `WORKFLOW_DSL.md:50–54` + `AIRAIE_TECHNICAL_ARCHITECTURE.md §2` |
| F4 alert→toast | **G.4.13** (new) | n/a | n/a |
| F5 three stubs | **G.4.14** (new) | n/a | n/a |
| F6 unused endpoints | **G.4.15** (new) | n/a | `AIRAIE_TECHNICAL_ARCHITECTURE.md §5.2` (PAUSED state) |

---

## Operational reminders for the next session

These carry over from the 2026-04-30 session and are not workflow-audit items per se, but blocking for any meaningful UAT:

1. **Restart gateway** — Plan A kernel changes (sweep fan-out + tool-name fallback resolver) are committed but the running gateway predates them. Rebuild + restart `airaie-kernel/bin/api-gateway` before the next live test.
2. **Database is fresh** — wiped 2026-04-30. 24 tools, 2 users, 1 project, 3 pipelines, 11 intent types, 4 board templates, 27 user sessions retained. No boards / cards / runs / artifacts / agents.
3. **MinIO empty** — both buckets flushed; bucket shells preserved.
4. **NATS clean** — `AIRAIE_JOBS` stream pristine, runner consumer at seq 0.
5. **Frontend HMR** — running on port 3000 against a stack that hasn't been restarted; React Query in-memory cache may have stale references. Hard reload (Cmd-Shift-R) on first visit.
6. **Uncommitted ROADMAP.md** — Phase 1–7 + Phase 11 box flips are still uncommitted because the file bundles pre-existing prose. Commit when ready.

---

## Files changed in this audit (so the planning doc is self-documenting)

- `.planning/backlog/PHASE_G_HARDENING_BACKLOG.md` — added G.4.12, G.4.13, G.4.14, G.4.15, G.4.16; updated header date + progress count (21 → 26 remaining); added Sprint 4 "Workflow surface honesty" to triage recommendations.
- `.planning/research/workflow-audit-2026-04-30.md` — this file (new).

---

## How to consume this in the next session

```bash
# Quick read order:
1. cat .planning/research/workflow-audit-2026-04-30.md   # this file — full picture
2. open in IDE: .planning/backlog/PHASE_G_HARDENING_BACKLOG.md  # entries G.4.12–G.4.16
3. Read the "Sprint 4" section in the backlog's Triage recommendation
4. Pick the 4A trio (~1 day) and ship them; then triage 4B
```

Or, if shortcut: run `/gsd:resume-work` and point it at this doc.
