# 03 — Cards as Pages

> **Purpose:** define the user-facing surface of the platform. The Card is *the* primary unit of UI. Get this right and everything else falls into place.
> **Audience:** product, design, frontend engineering.
> **Read after:** [`01-CORE-MODEL.md`](./01-CORE-MODEL.md).

---

## The mental shift

Today's UI treats a Card as a **row in a table** with a side-sheet for detail. That mental model came from project-tracker apps (Jira, Linear, Asana) and it's wrong for AirAIE. A Card in AirAIE is **the entire chain instance** — Intent + Plan + Run + Results + Evidence + Gates — and it should be rendered as one place where the user actually does the work.

> **The shift in one line:** *A Card is not a row that describes a piece of work. A Card is the IntentSpec authoring surface, the run launcher, the results canvas, the evidence ledger, and the gate state — composed on one page, rendered per intent type.*

The user never opens a separate "Workflow Editor" to inspect what will run. Never opens a separate "Artifacts" list to see results. Never opens a separate "Gates" tab to see what's blocking promotion. **Everything for one Card is on the Card's page.** That is the platform's value over a notebook + a tracker + a tool registry.

## Page anatomy

A Card-page has **structured sections** (governance-readable, schema-typed) and a **free-form Notes body** (Notion-style typed blocks) at the bottom. The sections appear top-to-bottom in the order the chain produces them — Intent first, Release last.

```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Board]  Card title (editable)                  [Mode: Study]     │
│ Status: evidence_pending                  [▶ Run]  [⋯ Actions]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ INTENT                                                              │
│   Goal:  "Lift coefficient of geometry v3 at Re=1e6"                │
│   Type:  cfd_analysis    Vertical: engineering                      │
│   Acceptance:                                                       │
│     • lift_coefficient ∈ [1.2, 1.4]                                  │
│     • drag_coefficient < 0.05                                        │
│     • run_converged == true                                          │
│   Status: locked  (cannot edit in Study)                            │
│   [AI Assist: refine]                                               │
│                                                                     │
│ INPUTS                                                              │
│   • geometry_v3.step    art_abc123  v3   pinned 2026-04-26          │
│   • inflow.csv          art_def456  v1   pinned 2026-04-26          │
│   [+ Pin artifact]                                                   │
│                                                                     │
│ METHOD                                                              │
│   Pipeline: pipe_cfd_quick                                          │
│   Workflow: wf_cfd_xyz v4 (published)                               │
│   Tools:    calculix v2.20 (verified) → frd-summary v0.1 (tested)   │
│   [Inspect compiled DAG]  [Use Agent instead]                       │
│                                                                     │
│ RUN                                                                 │
│   ▶ Start                  Last:  succeeded · 2m18s · run_xyz123    │
│   Progress: mesh ✓ → solver ✓ → post ✓                              │
│   Cost:     $0.04 · CPU: 1.2 core-min · peak mem: 412 MB            │
│                                                                     │
│ RESULTS                  (renderer chosen by intent type + outputs) │
│ ┌──────────────────────────────────────┐  ┌────────────────────┐    │
│ │  ContourPlot · pressure on geometry  │  │  Chart · residuals │    │
│ │   [3D viewer, lazy-loaded]           │  │  vs iteration      │    │
│ └──────────────────────────────────────┘  └────────────────────┘    │
│ ┌──────────────────────────────────────────────────────────────┐    │
│ │  Metrics · cl=1.28  cd=0.041  converged=true                 │    │
│ └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
│ EVIDENCE                                                            │
│   ✓ lift_coefficient = 1.28   in [1.2, 1.4]                          │
│   ✓ drag_coefficient = 0.041  < 0.05                                 │
│   ✓ run_converged = true                                             │
│   ✓ run_succeeded                                                    │
│   ⚠ peer_review (role_signed)  — pending in Study mode               │
│                                                                     │
│ GATES                                                               │
│   ✓ run_passes        (auto, Run completed)                          │
│   ✓ metrics_meet      (auto, all KPIs in range)                      │
│   ⚪ reproducibility   (re-run required for Study)                   │
│   ⚪ peer_review       (sign-off required for Study)                  │
│                                                                     │
│ NOTES                                                               │
│   [Free-form Notion-style blocks: text, embeds, callouts]           │
│   • "Matches expectation. Try AoA sweep next, see /cards/abc"        │
│   • [Embedded artifact: residuals.csv as table]                     │
│                                                                     │
│ ACTIVITY                                                            │
│   Asha created the Card · 2026-04-26 09:12                          │
│   Run xyz123 succeeded     · 2026-04-26 09:14                       │
│   Asha promoted Board → Study · 2026-04-26 11:30                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Section reference

Each structured section is a **typed component** that reads from the Card's data model. Order is fixed; visibility is conditional on Card type and run state.

### Header
- Title (editable in Explore; locked once IntentSpec is locked).
- Status badge (`draft | planned | running | evidence_pending | gated | passed | failed | released`).
- Mode badge (the Board's current Mode, displayed for context).
- Primary action (`▶ Run` or `▶ Re-run` depending on state).
- Overflow actions (Duplicate Card, Archive, Export, Compare with…).

### Intent
- Goal (plain text).
- Type + Vertical (registry-driven; not free-text).
- Acceptance criteria (list of KPIs with operator + threshold).
- Status (draft / locked / superseded).
- AI Assist drawer to refine via natural language (Explore mode only).

### Inputs
- Pinned Artifacts referenced by the IntentSpec, one row per input port.
- Each row shows: `port_name | artifact_name | artifact_id | version | pinned_at`.
- Pin/unpin button (Explore only); read-only in Study/Release.
- "+ Pin artifact" picker (Explore).

### Method
- Pipeline name + Workflow Version (compiled artifact).
- Resolved Tools list with versions and trust levels.
- "Inspect compiled DAG" opens an inline graph viewer (the same one used by the Workflow Editor, read-only here).
- "Use Agent instead" toggle visible only in Explore mode (and when the IntentType has an agent-capable Pipeline alternative). Picking Agent re-runs the Plan generator with `force_agent=true`.

### Run
- Big primary `▶ Run` button when no run in progress.
- During run: live progress (NodeRun-by-NodeRun), elapsed time, current step.
- Last run summary: status, duration, cost, peak memory.
- Run history dropdown (last N runs, click to switch which Run's results render in the Results section).

### Results
- The intent-driven layout — see [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md) for how renderers are picked and arranged.
- Layout chosen per `intent_type` (e.g., `cfd_analysis` → 3D field + residuals chart + metrics card).
- Empty state when no Run yet: hides the section entirely. We don't show "no results yet" — the Run section already says "no runs."

### Evidence
- One row per CardEvidence record, grouped by `evidence_kind`.
- Each row: metric/criterion · observed value · evaluation (✓ / ✗ / ⚠) · source link (Run, NodeRun, or signature).
- Pending criteria (no row yet) shown as ⚠ with explanation.
- Full audit on hover: timestamp, attribution, evidence_kind.

### Gates
- One row per required Gate (Mode-driven).
- ✓ passed / ✗ failed / ⚪ pending / ⊝ waived.
- Click to open Gate detail: condition, current evidence, sign-off action (if user has the role).
- Waive action visible only to admin, requires rationale.

### Notes
- Free-form. Typed blocks: `text`, `heading`, `callout`, `code`, `quote`, `artifact_embed`, `run_embed`, `card_link`, `image`.
- Notion-like behavior (slash menu, block-level drag, simple keyboard shortcuts). Deliberately **narrow** — not full Notion. We don't need bidirectional links, multi-column layouts, or database views.
- Stored as JSON (`notes_blocks` field on Card). Versioned with the Card.

### Activity
- Append-only feed of audit events scoped to this Card.
- Created · runs · gate decisions · IntentSpec lock · Mode change · evidence collected · Release.
- Each entry: who, when, what changed, what evidence was attached.

## Mode-aware sections

The page renders the same eight sections in all Modes, but **affordances change**:

| Section   | Explore                              | Study                                 | Release                                      |
|-----------|--------------------------------------|---------------------------------------|----------------------------------------------|
| Intent    | editable                             | locked once first run                 | locked                                       |
| Inputs    | pin/unpin freely                     | pinned, read-only                     | pinned, read-only                            |
| Method    | "Use Agent instead" available        | hidden                                | hidden                                       |
| Run       | always                               | always                                | always                                       |
| Results   | always                               | always                                | always                                       |
| Evidence  | manual + auto                        | manual + auto                         | **auto only** (manual rows greyed/forbidden) |
| Gates     | only if user added                   | repro + peer_review required          | + qa_approval                                |
| Notes     | always                               | always                                | always                                       |
| Activity  | always                               | always                                | always                                       |

The user shouldn't have to remember these rules — the page enforces them visually. A read-only field is greyed with a tooltip explaining the Mode rule. An "Add manual KPI" button vanishes in Release.

## Card-type variants

Card type changes the **layout of the Results section** and adds/removes sections.

| Type          | Special section behavior                                                                  |
|---------------|-------------------------------------------------------------------------------------------|
| `analysis`    | Default. Single Run, results rendered for the Run's outputs. (Anatomy above.)             |
| `comparison`  | Method/Run sections are **per-baseline** (a list of Runs); Results uses split-view renderers, axis-locked. Inputs section shows the differing inputs. |
| `sweep`       | Method drives a parameterized Workflow; Run produces a sample table; Results renders Pareto / parallel coordinates / table. Evidence is per-sample. |
| `agent`       | Method shows the Agent + tool budget; Run shows the agent's chain-of-thought (governed by Mode); Results renders the agent's final ActionProposal output(s). |
| `gate`        | No Run section. Method = "human decision." Results section renders the dependent Cards' evidence summary. Gates section is the primary surface. |
| `milestone`   | No Run section. Body shows the readiness of dependent Cards (a tree). Used to track when "Wing root design study is ready for Release." |

## Card relationships

A Card can:
- **Depend on** other Cards (it cannot be promoted until they pass).
- **Compare** other Cards (a `comparison` Card pulls Runs from its sources).
- **Be a sub-card of** a `milestone` (one-to-many).

Relationships render as small links in a "Related" sidebar on the page. Clicking navigates to the related Card. The graph is also visible on the Board's Cards-graph view.

## How a Card is created

Three paths, all producing the same Card model:

1. **Manual.** User clicks "+ Card" on the Board. A blank Card-page opens. They write the Goal, pick the IntentType, pin Inputs, and the page auto-resolves the Method.
2. **AI-Assist Draft.** User opens AI Assist on the Board, types a question, accepts the proposed IntentSpec. A Card is created with that IntentSpec already locked or draft.
3. **From Pipeline catalog.** User browses Pipelines, picks one, fills in inputs. The Card is created with that Pipeline pre-selected.

In all three, the user lands on the same page. The user never sees a "Card creation modal" with twenty fields — fields are filled in-place on the page.

## What this page replaces

The current frontend has these **separate surfaces** that the Card-page replaces or absorbs:

| Today | Tomorrow |
|---|---|
| `/boards/:id` Cards tab → click row → side-sheet | `/cards/:id` full page (the Cards tab becomes a list of links to pages) |
| `/workflow-studio/:id` Workflow Editor (when invoked from a Card) | "Inspect compiled DAG" inline pane in Method section |
| `/workflow-runs/:runId` Run Detail | "Run history" dropdown → in-page Run section |
| `/artifacts` for a Card's outputs | Renderers in Results section + free-form embeds in Notes |
| Board's Evidence tab | per-Card Evidence section + a Board-level rollup |
| Board's Gates tab | per-Card Gates section + a Board-level rollup |
| Board's Records tab | unchanged at Board level (Records are Board-shared); Cards can pin Records into Notes |

The Workflow Editor still exists for **hand-authoring** Workflows that users want as Pipelines. It's not where Card runs are inspected.

## Implementation phases (UX)

Recommended order:

1. **Phase 1** — Replace the side-sheet with a route `/cards/:id` rendering the eight sections from current data. No backend changes. (~1 week)
2. **Phase 2** — Renderer Registry MVP — see [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md). Results section becomes useful.
3. **Phase 3** — Per-`intent_type` Results layout (driven by registry config, not hardcoded).
4. **Phase 4** — Notes free-form blocks.
5. **Phase 5** — Card-type variants (`comparison`, `sweep`, `agent`, `gate`, `milestone`).
6. **Phase 6** — Board redesign (Cards-list-as-primary, drawers for Records / Artifacts / Gates rollups).

Phase 1 is the keystone. It validates the mental model cheaply. If Phase 1 doesn't *feel* like a leap, the renderers won't save it.

---

## Cross-references

- The data model behind these sections → [`01-CORE-MODEL.md`](./01-CORE-MODEL.md)
- Mode rules that drive section affordances → [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md)
- How Results renders → [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md)
- Tool authorship for Results to be useful → [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md)
- A walkthrough of a Card-page over an Asha session → [`06-USER-JOURNEY.md`](./06-USER-JOURNEY.md)
