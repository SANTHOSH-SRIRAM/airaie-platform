# 01 — Core Model: The Chain

> **Purpose:** define every primary noun and the relationships between them.
> **Audience:** anyone making product, design, or engineering decisions on AirAIE.
> **Read after:** [`00-OVERVIEW.md`](./00-OVERVIEW.md).

---

## The chain, fully

```
                     ┌───────────────────────────────────────┐
   Board ──┬──────── │ governance scope, Mode dial,          │
           │         │ shared Records pool, shared Artifacts │
           │         └───────────────────────────────────────┘
           │
           ├── IntentSpec (declarative success definition: goal, type, KPIs, pinned inputs)
           │       │
           │       └── instantiated as ──► Card (a page — see 03-CARDS-AS-PAGES)
           │                                  │
           │                                  ├── ExecutionPlan
           │                                  │       │
           │                                  │       └── compiles to ──► Workflow Version
           │                                  │                                │
           │                                  │                                ▼
           │                                  └── Run ──► NodeRun ──► Tool (via ATP)
           │                                              │             │
           │                                              ▼             ▼
           │                                          metrics      Artifact (immutable, content-hashed)
           │                                              │             │
           │                                              └─────┬───────┘
           │                                                    ▼
           │                                              CardEvidence
           │                                                    │
           │                                                    ▼
           ├── Gates ◄── evaluate ── CardEvidence + role signatures
           │       │
           │       └── all pass in Release mode ──► Release Packet (frozen, signed)
           │
           └── Records (hypothesis / requirement / protocol — written before compute)
```

Every entity below is defined precisely. Read top to bottom; each builds on the prior.

---

## Board

A **Board** is the workspace for one problem. It is the **governance boundary** — every Card, Gate, IntentSpec, Record, and Artifact is scoped to exactly one Board.

A Board has:
- A **Mode** (Explore / Study / Release) — the governance dial. See [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md).
- A **Vertical** (engineering / science / mathematics / technology / etc.) — drives default IntentTypes and renderers.
- A **Records pool** — persistent context (hypothesis, requirement, protocol notes), shared across all Cards on the Board.
- An **Artifacts pool** — uploaded reference data and run outputs, shared across all Cards on the Board.
- A list of **Cards**.
- A list of **IntentSpecs** (some not yet bound to a Card).

A Board has a **lifecycle**: created → active (in any Mode) → archived. Mode escalation is irreversible: once a Board has reached Study, it cannot return to Explore without forking; once Release, it cannot return to Study.

## IntentSpec

An **IntentSpec** is a **declarative success definition** — what we want to know, learn, or decide, with measurable acceptance criteria. It is the *contract* the Card commits to.

Structure:
```yaml
intent_spec:
  id: int_xyz
  board_id: brd_abc
  intent_type: cfd_analysis        # registry-defined; drives Pipeline + renderers
  vertical: engineering
  goal: "Lift coefficient of geometry v3 at Re=1e6"
  inputs:
    - port: geometry
      artifact_id: art_geom_v3     # version-pinned in Study/Release
    - port: inflow
      artifact_id: art_inflow_v1
  acceptance:
    - kpi: lift_coefficient
      operator: between
      value: [1.2, 1.4]
    - kpi: drag_coefficient
      operator: less_than
      value: 0.05
    - kpi: run_converged
      operator: eq
      value: true
  status: draft | locked | superseded
```

IntentSpecs are versioned. **Locking** an IntentSpec freezes its inputs and acceptance criteria; subsequent changes create a new version. Cards bind to specific IntentSpec versions.

The Plan generator uses `intent_type` to look up the **Pipeline** template that produces a Workflow capable of satisfying the IntentSpec.

## Card

A **Card** is one method tried for one IntentSpec. It is the **primary unit of work** in AirAIE — and the **primary unit of UI**: a Card is a *page*, not a row. See [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md) for the page anatomy.

A Card holds:
- A reference to its **IntentSpec** (which can be drafted on the Card itself in Explore mode).
- A **Method** binding — Pipeline + Workflow Version, or Agent reference, or hand-authored Workflow.
- A list of **Runs** (each Run is one execution attempt).
- The **CardEvidence** rows derived from those Runs.
- A list of **Gates** required by the Board's current Mode.
- A free-form **Notes** body (typed Notion-style blocks for narrative / discussion / AI-Assist responses).
- Status: `draft | planned | running | evidence_pending | gated | passed | failed | released`.

Cards have **types** that map to UI shape:
- `analysis` — single intent, single run, single result
- `comparison` — multiple runs of the same Workflow on different inputs (split-view results)
- `sweep` — parameter scan; result is a Pareto front or table
- `agent` — an Agent picks the tools at runtime
- `gate` — a pure-decision Card (no Run, just sign-offs against linked Cards)
- `milestone` — a roll-up Card that tracks the readiness of a set of dependent Cards

Cards can **depend on** other Cards: a `milestone` Card lists its prerequisites; a `comparison` Card references the analysis Cards it compares.

## ExecutionPlan

An **ExecutionPlan** is the result of running the Plan generator on a Card's IntentSpec. It is a **10-step pipeline** internally:

1. Resolve `intent_type` → matching `Pipeline` template (or fall through to user-authored Workflow / Agent).
2. Validate that the IntentSpec's `inputs` satisfy the Pipeline's required input ports.
3. Instantiate the Pipeline as a draft Workflow (DSL) with the input artifacts bound.
4. Resolve each `tool_ref` in the Workflow to a specific `tool_version` (subject to Mode's trust-level minimum).
5. Validate input/output schema compatibility across edges.
6. Compute resource estimates (CPU, memory, wall-time, cost).
7. Estimate the Pipeline's outputs vs. the IntentSpec's KPIs (warn if a KPI cannot be derived).
8. Compile to an immutable **Workflow Version**.
9. Pin the input artifact hashes (Study/Release) or note them as floating (Explore).
10. Return the compiled Workflow + estimated metrics + warnings.

The output of step 10 is what gets shown to the user in the Card's **Method** section. They click Run; we execute.

## Workflow / Workflow Version

A **Workflow** is a DAG of nodes. Each node is one of:
- **Trigger** — entry point (manual, schedule, webhook).
- **Tool** — one ATP tool invocation. The vast majority of nodes.
- **Agent** — invokes an Agent that picks tools at runtime, returning an ActionProposal that the same compiler turns back into Tool nodes.
- **Gate** — pauses for human evidence (signature, approval).
- **Logic** — control flow (branch, merge, loop).
- **Data** — transformation node (slice, join, derive).

A **Workflow Version** is the immutable, compiled form. Once published, never edited. Edits create v+1.

Workflows are created two ways:
- **Generated** by the Plan generator from an IntentSpec + Pipeline.
- **Hand-authored** in the Workflow Editor (an n8n-style DAG canvas).

Both paths produce the same artifact: a Workflow Version that runs identically.

## Run / NodeRun

A **Run** is one execution of a Workflow Version. A **NodeRun** is the execution of one node within that Run.

Both are persisted with timestamps, status, and result data. NodeRuns hold:
- Resolved input artifacts (by ID + content hash).
- Output artifacts produced (by ID + content hash + size).
- Metrics emitted by the Tool (NDJSON event stream).
- stdout/stderr captured.
- Resource consumption (CPU/memory/wall-time samples).

A Run's status is the AND of its NodeRuns' statuses. A failed NodeRun fails the Run.

## Tool

A **Tool** is the atomic invocable unit. It is a containerized capability with an **ATP manifest** — see [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md) for the contract.

A Tool has:
- A **name** (e.g., `tool_calculix`) and **description**.
- Versioned **manifests** declaring inputs, outputs, resource requirements, and renderer hints.
- A **trust level** (untested / community / tested / verified / certified).
- A **trust score** computed from run history: `(successes + 5) / (total + 10)`. Bayesian, monotone non-decreasing.
- One or more **bindings** (Docker / CLI / HTTP / MCP) — how the runner invokes it.

The Workflow's nodes don't reference Tools by name directly; they reference a `tool_ref` that the compiler resolves to a specific `tool_version` based on:
- Available versions whose trust level meets the Board Mode's minimum.
- The IntentSpec's preference (if any).
- Latest semver-compatible if not pinned.

## Artifact

An **Artifact** is an immutable, content-hashed blob produced or consumed by a Tool. Artifacts are stored in the object store (MinIO/S3-compatible) keyed by `(artifact_id, content_hash)`.

Properties:
- **Immutable.** A new version is a new Artifact with a new ID and hash.
- **Content-hashed.** SHA-256 of the bytes. Two Artifacts with the same hash are byte-identical.
- **Typed by `kind`** (e.g., `csv`, `frd`, `gltf`, `step`, `vtu`, `json`, `pdf`, `png`).
- **Optionally version-pinned in Cards.** In Study/Release mode, an IntentSpec's input must reference a specific `(artifact_id, content_hash)` pair.

The **artifact_lineage** table captures parent→child relationships: every Artifact produced by a Run records which input Artifacts it descended from. This is the audit trail.

## CardEvidence

**CardEvidence** is the structured ledger of what a Card has demonstrated. Rows are auto-collected from Run metrics and from human signatures.

A CardEvidence row contains:
- `metric_key` — a KPI from the IntentSpec's `acceptance` list.
- `metric_value` — the observed value (numeric, boolean, or string).
- `evaluation` — `passed | failed | inconclusive`, derived by comparing `metric_value` against the IntentSpec's threshold.
- `source` — which Run / NodeRun / Artifact produced it; or which user signed it.
- `evidence_kind` — `run_succeeded | artifact_exists | metric_threshold | role_signed`.
- `timestamp`, `attribution`.

The Card's status (`evidence_pending`, `passed`, `failed`) is derived from its CardEvidence vs. the IntentSpec's acceptance.

## Gate

A **Gate** is a pre-condition for advancing a Card's lifecycle. Gates are required by Board Mode (Study adds repro + peer-review gates; Release adds QA approval).

A Gate has:
- A **type** corresponding to one of the four evidence kinds.
- A **status**: `pending | passed | failed | waived`.
- A **condition** — what evidence proves it.
- A **decision** — who passed/failed/waived it, when, with what rationale.

Gates can be **waived** by an admin with rationale, but the waiver is a first-class audit row — a future reviewer sees both the unmet condition and the explicit override.

## Release Packet

A **Release Packet** is the frozen, signed bundle emitted when a Card on a Release-mode Board has all Gates passed.

It contains:
- The IntentSpec (locked).
- The Workflow Version (immutable).
- All Run records and NodeRun records.
- All Artifact references with content hashes.
- All CardEvidence rows.
- All Gate decisions with attributions.
- All linked Records.
- A permalink (URL + signed manifest).

A Release Packet is what someone cites when they say "this result is approved." It is the unit of trust outside the platform.

---

## A worked example (5-line pseudocode)

```
board       = Board(mode=Explore, vertical=engineering)
intent      = IntentSpec(type=cfd_analysis, goal="cl @ Re=1e6", inputs=[geom, inflow], kpis=[cl in [1.2,1.4]])
card        = Card(intent=intent, type=analysis)
plan        = generate_plan(card.intent)         # → Workflow Version, pipe_cfd_quick
run         = execute(plan.workflow_version)     # → Artifacts(pressure.vtu, residuals.csv, metrics.json)
evidence    = collect(run, intent.kpis)          # → cl=1.28, run_succeeded
card.status = "passed"                           # in Explore: no gates required
```

Promote the Board to Study, and the same `card` now has gates `repro` + `peer_review` blocking `card.status="passed"` until satisfied. Promote to Release, add `qa_approval`. Each promotion only adds gates — never removes them.

---

## Cross-references

- The user-facing surface for all of this → [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md)
- How Modes change what's required → [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md)
- How Artifacts get rendered into UI → [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md)
- What a Tool author must commit to → [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md)
- Where each term is defined → [`99-GLOSSARY.md`](./99-GLOSSARY.md)
