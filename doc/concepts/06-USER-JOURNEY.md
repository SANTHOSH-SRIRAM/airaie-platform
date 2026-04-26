# 06 — User Journey

> **Purpose:** make the model concrete by walking through one engineer's week. Every concept defined elsewhere appears here in context.
> **Audience:** anyone who learns better from a story than from a model spec.
> **Read after:** [`00-OVERVIEW.md`](./00-OVERVIEW.md). Refer back to [`01-CORE-MODEL.md`](./01-CORE-MODEL.md) and [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md) as needed.

---

## Persona

**Asha** is a CFD engineer at a mid-size aerospace firm. She works on wing-root flow studies. She has data (geometries, inflow profiles, prior result decks). She has methods (OpenFOAM, ParaView for post-processing, a Python sweep harness someone wrote two years ago). She has deadlines.

What Asha does NOT have today:
- A reliable way to re-run last week's study and get bit-identical results.
- A way to attach her results to her manager's design-review meeting that her manager can verify without calling her.
- A workflow that survives her switching laptops, getting onboarded into a new project, or onboarding a junior engineer.

She has been told to evaluate AirAIE. This is her week.

---

## Day 1 (Monday) — Explore

### 09:12 — A new Board

Asha logs in. Lands on the Dashboard. Clicks **+ New Board**, fills in:

- Title: *Wing root design study*
- Vertical: *Engineering*
- Mode: *Explore* (the default)

The Board page opens. Empty. Top right: a Mode badge reading **Explore**. Right rail: an empty Records pool, an empty Artifacts pool.

She drags `geometry_v3.step` and `inflow.csv` from her Finder onto the Artifacts pool. Two rows appear with content hashes; the kernel emits an `art_xxx` ID for each. She clicks **+ Record** on the Records pool and writes:

> Hypothesis: Geometry v3 is a 4% chord scale-up of v2. We expect lift_coefficient to increase ~4% over v2's 1.22 → ~1.27 at Re=1e6.

The Record is saved to the Board, timestamped and attributed to her. Two more Records: a *Requirement* ("cl must fall within [1.2, 1.4] for design intent compliance") and a *Protocol step* ("use pipe_cfd_quick with default mesh density; AoA = 4°").

### 09:35 — First Card

Asha clicks **+ Card**. A new Card-page opens at `/cards/<new-id>`. The page is the eight-section anatomy from [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md), most sections empty.

In the Intent section, she clicks **AI Assist: refine** and types:

> What lift coefficient does geometry v3 give at Re=1e6, AoA=4°?

AI Assist responds with a draft IntentSpec:

```yaml
intent_type: cfd_analysis
goal: "Lift coefficient of geometry v3 at Re=1e6, AoA=4°"
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
```

She accepts. The Intent section fills in. The Inputs section auto-suggests `geometry_v3.step` (matched by name); she pins it. She manually pins `inflow.csv`.

The Method section auto-resolves: **Pipeline `pipe_cfd_quick` → Workflow `wf_cfd_xyz` v4 (published)**. Tools listed: `tool_openfoam` v8.1 (`tested`), `tool_frd-summary` v0.1 (`tested`). She clicks **Inspect compiled DAG** and sees a 5-node graph — mesh → solve → post → summary → export. Looks right.

### 09:42 — First Run

She clicks **▶ Run**.

The Run section animates. NodeRuns appear one by one:
- `mesh` ✓ (8 s)
- `solve` (running, residuals chart updating live in the Results section underneath)
- `post`, `summary`, `export` queued

The Results section has already mounted: a residuals chart streaming live values, a placeholder for the pressure-field viewer, an empty Metrics card.

2m18s later, the Run completes. The pressure field appears in the 3D viewer (loaded from `pressure_field_preview.vtu`, 4.8 MB, decimated by the Tool). The residuals chart freezes. The Metrics card reads:

> cl = 1.276
> cd = 0.043
> converged = true

Evidence section auto-fills:
- ✓ `lift_coefficient = 1.276` in [1.2, 1.4]
- ✓ `drag_coefficient = 0.043` < 0.05
- ✓ `run_converged = true`
- ✓ `run_succeeded`

Card status: **passed** (Explore mode has no required Gates).

### 10:05 — Notes

Asha drops into the Notes section, writes:

> Matches expectation (predicted ~1.27, got 1.276). Try AoA sweep next to map the polar.

She uses the slash menu to embed `residuals.csv` as a small inline table. The Card is saved. She closes the laptop, gets coffee.

---

## Day 2 (Tuesday) — Sweep

### 09:00 — A second Card

Back on the Board, Asha clicks **+ Card** again. This time she picks Card type **sweep** in the type chooser. The page renders with the sweep-specific layout: Method has a parameter-grid input ("vary AoA from 0° to 12° in 1° steps"); Results section reserves a 12-column slot for a Pareto chart.

She refines the IntentSpec via AI Assist; pins the same geometry; runs. The Run launches 13 NodeRun groups in parallel (one per AoA value). Live progress shows 13 small bars filling.

5 minutes later: 13 succeeded. The Results section renders a polar plot (cl vs AoA) and below it a samples table (one row per AoA, columns for cl/cd/converged).

She writes a Note:

> Stall onset at AoA=10°. Polar matches v2 within 5%. Geometry v3 is behaving.

### 11:30 — A `comparison` Card

Asha clicks **+ Card**, type **comparison**. The page asks her to pick two source Cards. She picks the v3 analysis Card (yesterday's) and adds a v2 analysis Card from another Board (linkable cross-Board because both belong to the same project).

Results renders side-by-side: pressure contour on v3 left, v2 right, axis-locked. Diff metrics card shows: `Δcl = +4.6%`, `Δcd = +5.2%`. Asha screenshots — well, she would have, but she doesn't need to: the Card itself is the artifact she'll show in the design review.

She drops a Note:

> The +4.6% lift comes with a +5.2% drag penalty. L/D nearly flat. Worth a discussion.

---

## Day 3 (Wednesday) — Promote to Study

The design review is Friday. Asha needs the v3 analysis Card to be **defensible**. She promotes the Board: **Mode: Explore → Study**.

A confirmation modal:

> Promoting to Study locks all pinned inputs and adds the following required Gates to existing Cards:
> - `reproducibility` — re-run with identical inputs, metrics must match.
> - `peer_review` — `role_signed` by another engineer.
>
> This change cannot be reversed. Are you sure?

She confirms. The Card pages update: the Intent section is now read-only (locked badge); Inputs show "pinned, read-only"; the Method section's "Use Agent instead" button has vanished. The Gates section now lists `reproducibility ⚪` and `peer_review ⚪` as pending.

### 09:30 — Reproducibility

Asha clicks **▶ Re-run** on the v3 analysis Card. Same inputs (still pinned), same Workflow Version (v4 unchanged), same Tool digests (Tools haven't been edited). 2m21s later, results match — metric values byte-identical. The `reproducibility` Gate passes automatically.

### 10:15 — Peer review

Asha pings her colleague Dev in Slack: "Look at /cards/<v3-analysis-id>?"

Dev opens the link. Reads the Intent. Inspects the compiled DAG. Scrolls to Results — sees the same pressure field, residuals, polar Asha sees. Reads the Notes. Clicks the **Sign peer_review** button. A modal asks for an optional rationale; Dev writes:

> Reviewed inputs, method, metrics. Matches the prior v2 trend. LGTM.

Dev signs. The `peer_review` Gate flips to ✓ and shows Dev's name + timestamp + rationale.

Card status: **passed** (Study mode, all required Gates passed).

---

## Day 4 (Thursday) — Promote to Release

QA's design review is tomorrow. Asha promotes: **Mode: Study → Release**.

Another confirmation modal:

> Promoting to Release adds the following required Gates:
> - `qa_approval` — `role_signed` by a user with role ≥ maintainer.
>
> All Tools used must be at trust level ≥ verified. Tools currently below: tool_openfoam v8.1 (`tested`).
>
> Promotion will fail until all Tools meet the minimum. Promote anyway? (Will fail.)

Asha pauses. The OpenFOAM tool is at `tested`, not `verified`. She clicks the link to the Tool detail page; sees that an admin can promote it.

She pings the AirAIE platform admin: "Can we promote `tool_openfoam` v8.1 to Verified? Trust score is 0.91 over 47 runs."

The admin reviews: trust score is good; the Tool has run deterministic across all checked runs; the manifest validates. Signs `tool.verify` with rationale "47 deterministic runs, manifest reviewed, security scan clean." Trust level → `verified`.

Asha retries the Mode promotion. Succeeds. The Card pages update: `qa_approval ⚪` appears as the third required Gate. Manual KPI entry is now greyed out — Release mode is **auto-only Evidence**.

She writes a Note (allowed in any mode):

> All Gates green except QA approval. Pinging Mira (QA Maintainer).

### 16:00 — QA approval

Mira (QA, role: maintainer) opens the Card. Reads everything — Asha's Notes, Dev's review rationale, the auto-collected metrics, the locked IntentSpec, the immutable Workflow Version. Spot-checks: opens the Method section's compiled DAG, confirms the Tool versions and digests match the Verified set. Clicks **Sign qa_approval**:

> Reviewed metrics, peer review, repro, and tool digests. Approved for design-review citation.

Gate flips ✓. Card status: **released**.

A toast slides in: **"Release Packet emitted: aip://wing-root-study/cards/<id>/v1"**. Click → opens the Release Packet detail page. URL Asha can paste.

---

## Day 5 (Friday) — Design review

Asha presents at the design review. Her slide deck cites:

> *Geometry v3 lift analysis — AirAIE Release Packet `aip://wing-root-study/cards/<id>/v1`*

The senior reviewer asks how she validated. Asha clicks the link from her browser, lands on the Release Packet page, walks through:

- The locked IntentSpec.
- The compiled Workflow Version (immutable, with Tool digests).
- The Run records (Run + repro Run, both passing).
- Auto-collected Evidence (cl, cd, convergence, run_succeeded).
- Gate signatures (Dev's peer review, Mira's QA approval, with rationales).
- The full audit trail (Mode escalations, who, when).

The reviewer nods. "Cite this method for the rest of the wing studies."

Asha closes her laptop. She has not opened ParaView, OpenFOAM's CLI, Excel, PowerPoint, or her email all week. She has not screenshotted anything. She has not had to remember which version of which input was used.

This is the contract AirAIE makes with Asha.

---

## What never happened

By design:

- **No tool UI.** Asha never saw OpenFOAM's case-file editor, never opened ParaView. The Card-page rendered everything she needed.
- **No copy-paste.** Results were never moved between apps. Even her Slack message to Dev was a link, not a screenshot.
- **No versioning panic.** Pinned inputs locked at Study promotion. The repro Run on Wednesday used the same bytes as Monday's first Run.
- **No "Tuesday's results don't match Friday's."** Two repro Runs were byte-identical. Mira saw the same metrics Asha did.
- **No "I'll explain in chat why this is fine."** Every Gate decision had typed Evidence (run_succeeded, metric_threshold, role_signed). Future readers of the Release Packet see what was decided and why.
- **No silent governance regression.** Mode escalations were one-way. Asha could not have gone Study → Explore even if she'd wanted to.

---

## Variations on the journey

The same shape applies for other personas; sections shift weight.

- **A scientist running an ML experiment.** IntentType = `ml_classifier_eval`. Inputs are dataset Artifacts. Tool is sklearn or torch. Metrics are accuracy / F1 / confusion matrix. Renderer is a confusion-matrix heatmap + ROC curve. Repro Gate is meaningful only for fixed-seed runs (the Tool declares `governance.determinism = stochastic` and accepts a `seed`).
- **An analyst running a parameter sweep over a regulatory model.** IntentType = `regulatory_sweep`. Card type = `sweep`. Renderer is a Pareto chart + samples table. QA approval Gate is critical here; the Release Packet is the regulatory submission artifact.
- **A researcher running an LLM-driven literature review.** Card type = `agent`. Method = an Agent with a curated tool budget (web-search, PDF-extract, summarize). The Run section shows the agent's chain-of-thought (governed visibility — full in Explore, redacted in Release). Outputs are summary documents + citation tables.

In every case, the shape is identical: Intent → Method → Run → Results → Evidence → Gate → Release. What varies is the IntentType, the Tools chosen, the renderers mounted. The Card-page absorbs all of it.

---

## Cross-references

- The page that hosts every section in this story → [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md)
- Why Mode promotions feel like they do → [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md)
- How the Results section rendered the right thing → [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md)
- How the Tools made it possible → [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md)
- Term lookups → [`99-GLOSSARY.md`](./99-GLOSSARY.md)
