# AirAIE Platform — Interaction Model & Strategic Reference

> Companion to `USER_JOURNEY.md`. This document captures the *interaction model* between subsystems (Workflows, Agents, Tools, Boards/Cards, Artifacts), the approval mechanisms, ExecutionPlan preparation paths, and the strategic state of the platform as of 2026-04-25.

---

## Table of Contents

1. [Strategic Overview](#1-strategic-overview)
2. [The Three Planes](#2-the-three-planes)
3. [Subsystem Interaction Model](#3-subsystem-interaction-model)
4. [Are Workflows and Agents Separate?](#4-are-workflows-and-agents-separate)
5. [What Agents Actually Do (Beyond Tool Picking)](#5-what-agents-actually-do-beyond-tool-picking)
6. [Approval Mechanisms](#6-approval-mechanisms)
7. [ExecutionPlan Preparation — Three Paths](#7-executionplan-preparation--three-paths)
8. [Path C Deep Dive — Agent-Generated Cards](#8-path-c-deep-dive--agent-generated-cards)
9. [Subsystem Contracts](#9-subsystem-contracts)
10. [Robustness Gaps & Improvement Areas](#10-robustness-gaps--improvement-areas)
11. [Open Questions](#11-open-questions)
12. [Glossary](#12-glossary)

---

## 1. Strategic Overview

AirAIE is a unified React 19 single-page application replacing three abandoned studios (board / workflow / agent). It is an **n8n-inspired visual DAG canvas for governed engineering workflows** spanning CAD, FEA, CFD, DOE, and ML.

### Architecture Stack

```
React 19 Frontend (single app, port 3000)
   ↓ REST + SSE
Go Kernel (port 8080) — scheduler, agents, boards, gates, evidence
   ↓ NATS JetStream
Rust Runner (workers) — Docker execution, artifact I/O
   ↓ S3 protocol
PostgreSQL 16 + MinIO + pgvector
```

### Key Architectural Bets

| Bet | Why |
|---|---|
| Artifacts immutable | New version = new artifact, never overwrite |
| Three port types: artifact / parameter / metric | Enables type-checking, schema generation, auto-UI |
| Bayesian trust never decreases | (successes + 5) / (total + 10), monotone non-decreasing |
| Expression resolution at dispatch time | Go evaluates `{{ $('Node').json.field }}` before NATS |
| Board-mode policy escalation only tightens | Explore → Study → Release; never loosens thresholds |
| ATP contract is single source of truth | Manifest drives registry, ToolShelf, scheduler, governance |

### Current State (Phases per ROADMAP)

| Phase | Status |
|---|---|
| 1. Centralized UI Controller | Done |
| 2. Dashboard | Done |
| 3. Workflow Editor | Done |
| 4. Workflow Runs | Done — mocks fully removed 2026-04-25 |
| 5. Agent Playground | In flight |
| 6. Production readiness (auth, monitoring, K8s) | Deferred |
| 7. Board governance UI (Cards, Gates, Evidence) | Deferred |

### Backend Coverage

| Subsystem | Coverage | Notes |
|---|---|---|
| Tool System | 95% | Registry, contracts, validation, execution complete |
| Workflow System | 95% | Compiler, validator, scheduler, dispatcher complete |
| Agent System | 90% | Runtime, scoring, policy, memory coded; LLM provider not yet wired in production |
| Board System | 85% | Services coded; UI is Phase 7 |
| Infrastructure | 90% | PostgreSQL, NATS, MinIO, Docker Compose, migrations done |
| Auth / RBAC | 30% | Stubs exist, JWT/API key handlers not enforced |
| Testing | 60% | Backend integration tests; no E2E on unified frontend |

---

## 2. The Three Planes

AirAIE separates concerns into three planes. Understanding which plane an action belongs to clarifies who owns it.

| Plane | Owns | Primary objects |
|---|---|---|
| **Governance plane** | Why and whether work happens, evidence trail | Project, Board, Card, IntentSpec, Gate, Evidence, Record, Release Packet |
| **Orchestration plane** | How work is composed, sequenced, dispatched | Workflow, Workflow Version, ExecutionPlan, Run, NodeRun, Agent |
| **Capability plane** | What can be invoked, with what data | Tool, Tool Contract (ATP manifest), Tool Registry, ToolShelf, Artifact, Artifact Lineage |

The 6 canvas node types each map to a plane:

| Node | Plane | Role |
|---|---|---|
| Trigger | Orchestration | Entry point (manual, webhook, cron, NATS) |
| Tool | Capability | Containerized computation |
| Agent | Orchestration | Runtime tool selector with memory |
| Gate | Governance | Approval / evidence checkpoint |
| Logic | Orchestration | IF / Switch / Merge branching |
| Data | Capability | Artifact upload / transform |

---

## 3. Subsystem Interaction Model

### Top-down wiring

```
Project
  └─ Board (mode: Explore | Study | Release)
       └─ Card (analysis | comparison | sweep | agent | gate | milestone)
            ├─ IntentSpec (goal + acceptance criteria)
            └─ ExecutionPlan
                 └─ Workflow Version (compiled DAG)
                      └─ Nodes
                           ├─ Tool ─► Tool Contract (ATP) ─► Registry
                           ├─ Agent ─► Agent Spec ─► ToolShelf ─► Tool
                           ├─ Gate ─► Evidence ─► Acceptance Criteria
                           └─ Logic / Data
                                │
                                ▼
                      Run → NodeRun(s) → Artifacts → Lineage
                                │
                                ▼
                      Evidence collected → Gate evaluated → Card status
                                │
                                ▼
                      Release Packet (signed bundle)
```

### Cross-cutting flows

- **Trust feedback**: every Tool invocation result updates that Tool's Bayesian trust score, which feeds back into ToolShelf ranking, which influences future Agent decisions.
- **Memory feedback**: every Agent decision and outcome writes to episodic memory; recurring patterns extract to semantic memory; both retrieved via pgvector before the next decision.
- **Mode escalation**: Board mode change (Explore → Study → Release) auto-injects Gate nodes into all child workflows and tightens Agent confidence thresholds globally.
- **Evidence bubbling**: Run outputs → Evidence records → Card status → Board readiness percentage.

---

## 4. Are Workflows and Agents Separate?

**No. They share one execution spine.** The split between "workflow run" and "agent run" is a UI convenience, not an architectural one.

### Three ways the same machinery is invoked

| Mode | UI surface | What runs underneath |
|---|---|---|
| **Pure workflow** | Visual DAG with Tool/Logic/Data nodes only | Scheduler walks topological order, dispatches each Tool node to NATS |
| **Agent inside workflow** | DAG with Agent nodes mixed with Tool nodes | Scheduler hits Agent node → 5-phase reasoning → picks Tool → dispatches via *same* NATS pipeline |
| **Pure agent (Playground)** | Chat interface, no canvas | Agent runtime in a loop → uses ToolShelf + NATS + runner. Effectively a workflow of length 1 the agent extends turn by turn |

### Why this matters

- **Determinism vs autonomy is a slider, not a switch.** Real-world cases are hybrid: deterministic preprocessing → agent-decided solver → deterministic postprocess.
- **Governance applies uniformly.** A Gate doesn't care whether the upstream node was an Agent or a Tool — it evaluates evidence the same way.
- **Tools are the atomic unit.** Whether selected by a human, an agent, or a card-bound pipeline, execution is identical: ATP contract → NATS job → Rust runner → Docker → artifact.

### Concrete contrast

Same Card, two different DAGs — same Board, same Gate, same evidence collection:

**Pure-deterministic version:**
```
Trigger → Mesh(Gmsh) → Solver(CalculiX) → Postprocess(frd-summary) → Gate
```

**Agent-augmented version:**
```
Trigger → Mesh(Gmsh) → Agent[goal: pick best solver for nonlinear rubber] → Postprocess → Gate
                            └─ runtime: agent picks CalculiX vs Code_Aster vs FEniCS
                               based on mesh size, material model, trust scores
```

The only difference is whether the solver was hard-coded at design time or chosen at run time.

---

## 5. What Agents Actually Do (Beyond Tool Picking)

Tool selection is one phase of five. The full job is **autonomous decision-making with persistent memory**.

### The 5-phase reasoning loop

| Phase | What the agent decides |
|---|---|
| **THINK** | Current state, applicable context. Pulls from episodic + semantic memory via pgvector retrieval. |
| **SELECT** | Which tool (the visible output). |
| **VALIDATE** | Are parameters legal? Policy permits this? Cost/risk in budget? |
| **PROPOSE** | Parameters to pass — not just "use CalculiX" but "use CalculiX with mesh density X, nonlinear material Y, time step Z". |
| **EXECUTE & LEARN** | Dispatch, observe, update trust scores, write episodic memory, extract semantic patterns. |

### Beyond tool picking

- **Replan on failure** — exclude the failed tool, regenerate with remaining budget.
- **Multi-step composition** — chain tools, not just pick one.
- **Goal + constraint reasoning** — "minimize compute cost while meeting accuracy ≥ 95%".
- **Confidence negotiation** — emit a confidence score that drives auto-run vs human approval.
- **Institutional memory** — "last time we used Code_Aster on rubber, it diverged at 30% strain — try CalculiX instead".

### Memory model

| Type | Lifetime | Content | Retrieval |
|---|---|---|---|
| Episodic | 30-day TTL | Specific run outcomes, parameters used, results | pgvector cosine similarity, top-k=5 |
| Semantic | Persistent | Extracted patterns: facts, preferences, lessons, error_patterns | pgvector cosine similarity, top-k=5 |

### Scoring (5-dimensional, blended)

```
algorithmic_score = 0.4·compatibility + 0.3·trust + 0.2·cost + 0.1·latency − risk_penalty
final_score = 0.7·LLM_score + 0.3·algorithmic_score   (typical blend)
```

---

## 6. Approval Mechanisms

There are **two independent approval mechanisms**, often coexisting.

### A. Agent policy verdicts (per-action, runtime)

Every agent proposal gets a verdict from its policy module *before* dispatch:

| Verdict | Trigger | What user sees |
|---|---|---|
| **APPROVED** | confidence ≥ board threshold AND cost ≤ budget AND no risk rule hit | Auto-executes, action shows in trace |
| **NEEDS_APPROVAL** | confidence below threshold | Workflow pauses; reviewer notified via Approvals bell; sees proposal + reasoning + score breakdown; clicks Approve / Reject |
| **REJECTED** | confidence < 0.5 OR hard policy violation | Action killed, agent must replan |
| **ESCALATE** | cost over budget OR risk_level rule hit | Notifies higher role (e.g. lead_engineer) |

Board mode tightens — never loosens — the threshold:

| Mode | Confidence floor |
|---|---|
| Explore | 0.50 |
| Study | 0.75 |
| Release | 0.90 |

### B. Gate nodes (per-workflow, structural)

Gates are **explicit nodes in the DAG**, not runtime guards. Each Gate has **requirements** that must all evaluate true before downstream nodes execute.

| Requirement type | Example |
|---|---|
| `run_succeeded` | Upstream solver run must have status=COMPLETED |
| `artifact_exists` | A specific output file must be present |
| `metric_threshold` | `max_displacement < 10µm` from upstream evidence |
| `role_signed` | A human with role `qa_lead` must sign |

When workflow execution hits a Gate node:

1. Evaluator checks each requirement against accumulated evidence.
2. If any fail → workflow status = `BLOCKED_AT_GATE`, downstream nodes never dispatch.
3. Reviewer opens gate in UI, sees evidence dashboard, signs (or rejects).
4. On signature, downstream nodes dispatch; signed evidence becomes part of the audit trail.

### Auto-injection by board mode

| Mode | Gates auto-added |
|---|---|
| Explore | None |
| Study | Repro + peer-review gate per card |
| Release | Repro + approval gate per card; all must pass before Release Packet generation |

### How they interact

| Scenario | Approval surfaces |
|---|---|
| Pure workflow, Explore mode | None |
| Pure workflow, Release mode | Gates at end; signatures required |
| Workflow + Agent node, Study mode | Agent proposals over 0.75 auto-run; under 0.75 hit NEEDS_APPROVAL; *also* end-of-workflow gates |
| Workflow + Agent node, Release mode | Both: every agent action below 0.90 needs approval, AND structural gates require role-signed |

Both surfaces share the same UI: the **Approvals bell** in the header, plus inline indicators in the run/canvas view.

---

## 7. ExecutionPlan Preparation — Three Paths

The ExecutionPlan is the **compiled binding from a Card to a runnable Workflow Version**. Three preparation paths exist depending on card type and user choice.

### Path A — Pipeline template (default, deterministic)

1. User creates a Card with `intent_type` (e.g. `fea_validation`, `cfd_quick`).
2. **PipelineRegistry** has predefined recipes keyed by intent type:
   - `pipe_fea_standard` — Mesh → CalculiX → Postprocess
   - `pipe_cfd_quick` — Mesh → OpenFOAM cavity → frd-summary
3. On Run, the **Card service** auto-selects the matching pipeline and compiles it into an ExecutionPlan, version-pinning IntentSpec inputs.
4. User can preview/override before dispatching.

### Path B — Custom workflow (user-authored)

1. User builds a Workflow in the Workflow Editor and publishes a version.
2. User creates a Card with `workflow_ref` pointing at that published version.
3. ExecutionPlan compiles that specific workflow version with the card's input bindings.
4. Human is the author; the system is just the binder.

### Path C — Agent-generated (card type = agent)

1. User creates an **agent-type Card** with a goal (not a pre-chosen workflow).
2. Agent runtime takes the goal and generates a plan: tools, order, parameters.
3. That generated plan becomes the ExecutionPlan.
4. Plan goes through policy verdict before dispatching — typically NEEDS_APPROVAL on first run, then auto-runs once a similar plan has succeeded.

### Actor responsibilities

| Actor | Role |
|---|---|
| **User** | Picks card type, defines IntentSpec, optionally authors workflow or overrides pipeline |
| **PipelineRegistry** | Templates by intent type — covers ~80% of cases |
| **Card service (Go kernel)** | Compiles Card + IntentSpec + Pipeline/Workflow → ExecutionPlan; version-pins inputs |
| **Workflow compiler** | 5-stage validation: parse → resolver → DAG builder → type checker → AST |
| **Agent runtime** | Generates plan when card is agent-type |
| **Policy engine** | Reviews plan before dispatch — board mode + budget + risk rules |

### Known gotcha

Demo board cards have **no `intent_spec_id`** — plan generation fails until IntentSpecs are linked. Available pipeline templates today: `pipe_fea_standard`, `pipe_cfd_quick`. APIs:

- `POST /v0/boards/{boardId}/intents` — create intent
- `GET /v0/intent-types/{slug}/pipelines` — list candidate pipelines

---

## 8. Path C Deep Dive — Agent-Generated Cards

### What an "agent card" means

A normal card answers *what to run* (a workflow ref or pipeline template). An **agent card** answers *what outcome you want*, and lets the agent figure out the rest.

The user creates a card with:

- A **goal statement** ("validate this gasket holds 50 N with displacement < 10 µm")
- An **IntentSpec** with acceptance criteria (the measurable success condition)
- An **agent_ref** pointing to a configured Agent (model, allowed tools, policy, memory)
- A **budget** (cost ceiling, max wall time, max tool invocations)

No pre-built workflow. No pipeline template. Just a goal and a guard rail.

### Stage 1 — Plan generation (before any tool runs)

When the user hits Run, the agent enters its **planning loop** — not the execution loop. The output is a draft DAG, not artifacts.

```
1. Gather context: card goal, IntentSpec, board mode, prior runs in same board
2. Retrieve memory: pgvector cosine similarity → past plans for similar goals
3. Query ToolShelf: filter tools by intent type + permissions + status
4. Score candidates: 0.4·compat + 0.3·trust + 0.2·cost + 0.1·latency − risk
5. LLM reasoning: blend (0.7·LLM + 0.3·algo) to choose tools AND order
6. Synthesize a DAG: Mesh → Solver → Postprocess (or whatever shape fits)
7. Decide parameters per node (mesh density, solver options, etc.)
8. Self-check: total estimated cost vs budget; latency vs deadline
9. Compute confidence score for the whole plan
10. Emit ActionProposal { dag, params, cost_est, confidence, reasoning }
```

The output is an **ActionProposal** — a structured plan, not yet a workflow.

### Stage 2 — Plan → Workflow conversion

The agent's proposal goes through the **same compiler** that user-authored workflows go through:

```
ActionProposal (agent output)
   │
   ▼
ExecutionPlan compiler
   ├─ Validate every tool ref exists in registry
   ├─ Type-check ports between nodes
   ├─ Inject Gate nodes per board mode
   ├─ Resolve expressions
   └─ Build AST
   │
   ▼
Workflow Version (ephemeral, agent-authored)
   │
   ▼
Same scheduler as any other workflow
```

Consequences:

- **Agent-generated plans are real Workflows.** Version ID, run history, inspectable in editor (read-only), forkable.
- **Type safety still applies.** If the agent wires `mesh.outputs.frd` into a node expecting `text/plain`, the compiler rejects it before any tool runs.
- **Gates still get auto-injected.** Even though the agent built the plan, board mode adds the same governance checkpoints.

### Stage 3 — Policy verdict on the whole plan

Before dispatch, the entire plan is gated:

| Verdict | Trigger |
|---|---|
| **APPROVED** | Plan confidence ≥ board threshold AND est. cost ≤ budget AND no risk rules hit |
| **NEEDS_APPROVAL** | Confidence below threshold; user reviews proposal in Approvals bell |
| **REJECTED** | Plan violates a hard policy (uses tool with trust < 0.3, exceeds project budget) |
| **ESCALATE** | Plan exceeds card budget but might be allowed at lead_engineer level |

The reviewer, when approval is needed, sees the **proposed DAG** with each node annotated:

- *Why this tool?* — score breakdown (compat / trust / cost / latency)
- *Why these parameters?* — agent's reasoning text from LLM
- *What's the alternative?* — second-best tool that scored close

They approve, modify (swap a tool, tweak a parameter), or reject.

### Stage 4 — Execution

Once approved, the plan executes **exactly like a human-authored workflow**:

```
Workflow Version (agent-authored)
    │
    ▼
Scheduler walks topological order
    │
    ▼
For each Tool node:
    ├─ Resolve expressions (bind upstream outputs)
    ├─ Dispatch to NATS subject airaie.jobs.tool.execution
    └─ Rust runner pulls job, downloads artifacts, runs Docker, uploads outputs
    │
    ▼
Result envelope back via NATS
    │
    ▼
Go kernel: update DB, write artifact lineage, emit SSE
    │
    ▼
Next node fires
```

Tools have **no idea** they were chosen by an agent vs. a human. ATP contract in, ATP envelope out. Same NATS subjects, same runner, same artifact lifecycle, same trust score updates.

### Stage 5 — Adaptive replanning

If a node fails — say CalculiX diverges on a nonlinear material — the agent is **re-invoked mid-run**:

1. Failure event publishes to `airaie.events.run.node_failed`.
2. Agent runtime catches it, enters replan mode.
3. Inputs to replan: original goal, what's already produced, what failed and why, remaining budget.
4. Agent excludes failed tool, regenerates the *remaining* DAG (not whole plan); new sub-plan goes through compile + policy gate again.
5. New nodes appended to same Workflow Version (or new version forked).
6. Execution resumes.

The failure is also written to semantic memory as an `error_pattern`, so the next similar card avoids the same failure mode from the start.

> **Doc-gap callout:** source docs describe the planning + replanning loop conceptually but do not fully spec the *replan-into-existing-workflow* mechanic — whether replanning forks a new Workflow Version or appends nodes to the running one. Worth pinning down before Phase 5 implementation.

### Stage 6 — Evidence and close-out

Same path as any workflow:

- Outputs become artifacts.
- Evidence collector matches outputs against IntentSpec acceptance criteria.
- Gate nodes evaluate evidence.
- If all gates pass and acceptance criteria met → card status = COMPLETED.
- The **agent's plan + reasoning + decisions** are stored alongside the run as part of the audit trail.

### Worked example

**Card:** "Validate gasket design under 50 N. Pass if max displacement < 10 µm."
**Agent allowed tools:** `mesh-gmsh`, `mesh-tetgen`, `solver-calculix`, `solver-codeaster`, `post-frd-summary`.

**Planning phase (no tools run):**
```
Agent thinks → ToolShelf returns 5 candidates
Scoring picks: gmsh (trust 0.92) + calculix (trust 0.88) + frd-summary (trust 0.95)
Plan: Trigger → mesh-gmsh(density=fine) → solver-calculix(nonlinear=true) → post-frd-summary
Confidence: 0.84
Cost estimate: $0.42, 4min wall time
```

**Policy check (Study mode, threshold 0.75):** 0.84 > 0.75 → APPROVED, no human gate.

**Execution:**
```
mesh-gmsh runs → produces art_a1b2 (mesh.msh) → SUCCESS
solver-calculix runs → DIVERGES at 30% strain → FAILED
```

**Replan triggered:**
```
Agent: "calculix failed on nonlinear at high strain; check memory →
  past lesson: code_aster handles rubber better"
New sub-plan: solver-codeaster(nonlinear=true) → post-frd-summary
Confidence: 0.79 → APPROVED
```

**Resumed execution:**
```
solver-codeaster runs → produces art_c3d4 (results.frd) → SUCCESS
post-frd-summary runs → max_displacement = 7.2µm → SUCCESS
```

**Evidence:** `max_displacement (7.2 µm) < threshold (10 µm)` → criterion PASS.
**Gate (Study-mode peer-review gate):** waiting on QA reviewer signature.
**Memory updated:** semantic memory now holds `pattern: rubber_nonlinear → prefer code_aster, avoid calculix`.

### The interaction model in one diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USER                                                        │
│    creates Card { goal, intent_spec, agent_ref, budget }    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AGENT RUNTIME (planning)                                    │
│    THINK → SELECT (ToolShelf) → PROPOSE → ActionProposal    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  WORKFLOW COMPILER                                           │
│    validate · type-check · inject gates · build AST          │
│    output: Workflow Version (agent-authored)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  POLICY ENGINE                                               │
│    APPROVED / NEEDS_APPROVAL / REJECTED / ESCALATE          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SCHEDULER (same one used for all workflows)                 │
│    dispatch each Tool node via NATS                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  RUST RUNNER → DOCKER → TOOL → ARTIFACTS                     │
└─────────────────────────────────────────────────────────────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
                  ▼ success           ▼ failure
            next node fires    AGENT REPLANS
                                      │
                                      └─→ (back to compiler)
```

---

## 9. Subsystem Contracts

Boundary contracts between major subsystems.

| Boundary | Contract |
|---|---|
| **Frontend ↔ Go kernel** | REST `/v0/*` + SSE event stream |
| **Go kernel ↔ Rust runner** | NATS JetStream subjects: `airaie.jobs.tool.execution`, `airaie.events.run.*` |
| **Runner ↔ MinIO** | Presigned URL upload/download, content-hashed paths |
| **Agent ↔ ToolShelf** | Scoring API (compat 0.4 + trust 0.3 + cost 0.2 + latency 0.1 − risk) |
| **Workflow ↔ Tool Registry** | Contract resolution at compile time |
| **Board ↔ Workflow** | Card → ExecutionPlan → Workflow Version |
| **Gate ↔ Evidence** | Requirement types: `run_succeeded`, `artifact_exists`, `metric_threshold`, `role_signed` |
| **Card → Agent** | `{ goal, intent_spec, budget, allowed_tools, board_mode }` |
| **Agent → Compiler** | `ActionProposal { dag, node_params, confidence, cost_est, reasoning }` |
| **Compiler → Scheduler** | `Workflow Version` (identical shape regardless of author) |
| **Scheduler → Tool** | NATS job envelope (ATP-spec'd) |
| **Tool → Agent (failure path)** | `RunFailedEvent { node_id, error, partial_outputs, remaining_budget }` |
| **Run → Memory** | `MemoryEntry { episodic / semantic, pattern, outcome }` |

### NodeRun state machine

```
QUEUED → ACQUIRED → PRE-FLIGHT → I/O_PREP → EXECUTING → STREAMING → I/O_TEARDOWN → COMPLETED
                                                                   │
                                                          (with FAILED / SKIPPED / RETRYING branches)
```

### Runtime invariants

- Artifact inputs staged at `/in/<port_name>` (no extension); tools probe both `/in/<port_name>` and `/in/<port_name>.<ext>`.
- `/v0/artifacts/{id}/finalize` requires `content_hash: "sha256:<hex>"` (prefix required).
- Run `inputs`/`outputs` serialize as base64-encoded JSON; decode with `json.loads(base64.b64decode(s))`.
- Output artifact IDs are now resolved post-run (runner sends sha256 + size on PortValue, kernel finalizes uploads).

---

## 10. Robustness Gaps & Improvement Areas

### Gaps explicitly flagged in source docs

| Gap | Severity | Detail |
|---|---|---|
| NATS JetStream durability | M | Runner crash can orphan jobs; `outputUploads` only half-solves it; full durable consumer pattern not yet applied |
| Mock-removal exposure | M | Frontend hits real backend for the first time as of 2026-04-25; expect endpoint shape mismatches and 404s |
| DSL → canvas deserialization | M | Saved workflow DSL is base64 JSON; can't render saved DAG until deserialized |
| Artifact lineage table never populated | M | Endpoint exists but writes are missing; provenance graph blocked |
| Evidence auto-collection incomplete | M | 10-step process designed but not fully implemented in kernel |
| New users get 0 project memberships | S | Registered users hit 403 on every API call until manually attached |
| Expression resolution + board context | S | `{{ $board.mode }}`, `{{ $board.artifacts.* }}` not yet wired in scheduler |
| Agent memory at scale | M | pgvector untested at 100+ agents × 1000s of memories |
| Schema validation + error propagation | M | 12 lint checks on tools, 7 validator checks on workflows; user-facing feedback patchy |
| Zero observability | M | No Prometheus, Grafana, alerting, SLOs; production-readiness risk |
| Gateway restart → orphaned jobs | M | NATS in-flight jobs can hang on gateway restart |

### High-leverage improvement areas (ranked by impact / effort)

1. **Audit Phase 4 against live backend** (1–2d/page) — quickest wins, unblocks Phase 5
2. **DSL → canvas deserialization** (2–3d) — unblocks visual editing of saved workflows
3. **Artifact lineage + evidence auto-collection** (3–5d) — unlocks reproducibility, governance, release packets
4. **Wire LLM provider + agent memory at scale** (3–4d) — turns agents from deterministic to actually intelligent
5. **NATS JetStream durable consumer + DLQ** (5–7d) — production-grade reliability
6. **RBAC enforcement + project auto-membership** (5–7d) — multi-user, production deploy
7. **Frontend E2E test suite (Playwright)** (5–7d) — currently zero coverage on unified app
8. **Observability spine** (4–6d) — Prometheus metrics, Grafana dashboards, alerts

---

## 11. Open Questions

1. **Phase 5 (Agent Playground) scope?** IDE-shell pattern (activity bar + multi-panel + cmd palette), or simpler chat-only?
2. **RBAC model?** Owner/editor/viewer + gate-specific roles enough, or do we need security_reviewer, manufacturing_lead?
3. **Production timeline?** Front-load auth/observability/K8s before Agent Playground, or after?
4. **LLM provider strategy?** Claude primary with OpenAI/Google fallback — confirmed? Cost ceilings?
5. **Agent memory at scale?** Prove pgvector first, or abstract for Pinecone/Weaviate upfront?
6. **Replan-into-workflow mechanic?** Fork a new Workflow Version, or append nodes to running one?
7. **Board composition depth?** 3 levels designed — binding, or open?
8. **Governance at scale?** Pagination / batching for 100+ cards/gates per board?

---

## 12. Glossary

| Term | Definition |
|---|---|
| **ActionProposal** | Agent output: structured plan with DAG, params, confidence, cost estimate, reasoning |
| **Agent** | Autonomous decision-maker with goal, policy, memory; one of 6 canvas node types |
| **Agent Spec** | YAML declaration: id, name, goal, tools, model, policy, memory |
| **Approvals bell** | UI surface in header for both agent NEEDS_APPROVAL verdicts and Gate sign-offs |
| **Artifact** | Immutable file in MinIO, content-hashed, version-pinned |
| **Artifact Lineage** | Provenance graph: which run produced which artifact from which inputs |
| **ATP** | Airaie Tool Protocol — transport-agnostic manifest spec for tools (v0.2) |
| **Board** | Problem workspace containing Cards, Gates, Records |
| **Board Mode** | Explore / Study / Release — escalation lever for governance strictness |
| **Card** | Atomic experiment unit; types: analysis, comparison, sweep, agent, gate, milestone |
| **Card Status** | draft → ready → queued → running → completed / failed / skipped |
| **Episodic Memory** | 30-day TTL agent memory: specific run outcomes |
| **Evidence** | Auto-collected metric or output proof against acceptance criteria |
| **ExecutionPlan** | Compiled binding from Card → runnable Workflow Version |
| **Gate** | Governance checkpoint node with requirement evaluation |
| **IntentSpec** | Formal goal definition with version-pinned inputs and acceptance criteria |
| **NodeRun** | Per-node execution state inside a Run |
| **Pipeline** | Predefined workflow template keyed by intent type |
| **Policy** | Agent's verdict module: APPROVED / NEEDS_APPROVAL / REJECTED / ESCALATE |
| **Port Type** | artifact (file ref) / parameter (scalar) / metric (inline JSON) |
| **Project** | Top-level tenant; contains Boards, Workflows, Tools, Agents |
| **Record** | Institutional memory entry on a Board |
| **Release Packet** | Signed bundle of artifacts + evidence at Release-mode card completion |
| **Run** | Execution instance of a Workflow Version |
| **Semantic Memory** | Persistent agent memory: extracted patterns (fact, preference, lesson, error_pattern) |
| **Tool** | Containerized capability with ATP contract |
| **Tool Contract** | ATP manifest defining metadata, interface, runtime, capabilities, governance, observability, tests |
| **Tool Registry** | Storage + validation + versioning of Tool Contracts |
| **ToolShelf** | 5-stage tool resolution pipeline: discover → filter → rank → explain → assemble |
| **Trust Score** | Bayesian (successes + 5) / (total + 10); monotone non-decreasing |
| **Workflow** | DAG of nodes; YAML DSL + canvas representation |
| **Workflow Version** | Immutable published workflow snapshot (draft → compiled → published) |

---

## Companion Documents

| Doc | Purpose |
|---|---|
| `USER_JOURNEY.md` | Step-by-step user journeys end-to-end |
| `.planning/New Documents/AIRAIE_MASTER_SYSTEM_DOCUMENT.md` | Canonical end-to-end reference with rubber-plate worked example |
| `.planning/New Documents/AIRAIE_BOARD_SYSTEM_ARCHITECTURE.md` | Boards / Cards / Gates / Records deep-dive |
| `.planning/New Documents/AIRAIE_WORKFLOW_SYSTEM_ARCHITECTURE.md` | Workflow compiler, scheduler, expression system |
| `.planning/New Documents/AIRAIE_AGENT_SYSTEM_ARCHITECTURE.md` | 5-phase reasoning, scoring, policy, memory |
| `.planning/New Documents/AIRAIE_TOOL_SYSTEM_ARCHITECTURE.md` | Tool contracts, registry, ToolShelf |
| `.planning/New Documents/ATP-SPEC-v0.2.md` | Tool manifest specification |
| `doc/implementation/new_design/AIRAIE_TECHNICAL_ARCHITECTURE.md` | Go/Rust split, state machines, execution pipeline |
| `doc/implementation/new_design/AIRAIE_UNIFIED_STATE_AND_DATA_FLOW.md` | Edge envelope, expression resolution, infrastructure I/O |
| `doc/implementation/new_design/AIRAIE_USER_SYSTEMS_GUIDE.md` | Per-system end-to-end user perspective |
