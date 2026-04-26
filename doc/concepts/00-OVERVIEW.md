# 00 — AirAIE Overview

> **Purpose:** the elevator pitch. Read this first. Five minutes.
> **Audience:** anyone — new joiner, partner, tool author, exec.

---

## In one sentence

**AirAIE is a governed experimentation platform that turns "I tried a thing and it seems to work" into a version-pinned, evidence-backed, gate-approved, reproducible release.**

## What we are

- A **single workspace** where engineers, scientists, and researchers run their actual work — simulations, analyses, sweeps, comparisons, reports — without leaving the platform.
- A **registry of contracted tools.** Every tool (CalculiX FEA, ngspice, OpenFOAM, an LLM, a Python script, a sklearn classifier) is wrapped in the same protocol (ATP) and runnable through the same interface.
- A **governance layer** that captures who decided what, on what evidence, and when — automatically, as a side-effect of doing the work.

## What we are not

- Not a notebook. Notebooks have no governance, no reproducibility guarantees, no audit trail.
- Not a project tracker. Trackers describe work; AirAIE *is* where the work happens.
- Not an LLM chatbot. LLMs are one of many tools we orchestrate, not the product.
- Not a workflow engine in the n8n / Airflow sense. Workflows are an implementation detail underneath the user-facing concept of a Card.

## Who it's for

Engineers, scientists, analysts, researchers — anyone who has data and methods but cannot reliably answer:

> *"Who decided this result was acceptable, based on what evidence, and when?"*

The pain we solve is the gap between **informal exploration** and **defensible conclusions**: methods compared inconsistently, edge cases discovered late, Tuesday's results not matching Friday's, knowledge living in someone's head, no audit trail.

## The core idea, in one diagram

```
Board ── IntentSpec ── Card ── ExecutionPlan ── Workflow
                          │                         │
                          ▼                         ▼
                       Notes                       Run ── NodeRun ── Tool (ATP)
                                                                       │
                                                                       ▼
                                                                    Artifact
                                                                       │
                                                                       ▼
                                                                  CardEvidence
                                                                       │
                                                                       ▼
                                                                     Gate
                                                                       │
                                                                       ▼
                                                                Release Packet
```

Read top to bottom: a **Board** (workspace) holds **IntentSpecs** (declarative success definitions) which become **Cards** (one method tried, rendered as a page). A Card generates an **ExecutionPlan**, compiled into a **Workflow** of **Tool** invocations. Running it produces **Artifacts** (immutable outputs), which become **CardEvidence** evaluated against the IntentSpec's acceptance criteria. **Gates** decide pass/fail. When all gates pass in Release mode, the Card emits a **Release Packet** — the frozen, signed bundle.

See [`01-CORE-MODEL.md`](./01-CORE-MODEL.md) for each entity in detail.

## What makes us different from "just a workflow tool"

1. **Evidence beats assertions.** Gates only accept four kinds of facts: `run_succeeded`, `artifact_exists`, `metric_threshold`, `role_signed`. Nobody can write "looks fine to me" into a Gate.
2. **Artifacts are immutable** and content-hashed. A new version is a new artifact. You cannot edit a result in place.
3. **Tool versions pin at compile time.** The Workflow that ran on Tuesday will run identically on Friday — same tool digests, same input artifact hashes.
4. **Trust is Bayesian and monotone non-decreasing.** A tool's trust score is `(successes + 5) / (total + 10)`. It cannot regress retroactively.
5. **Records capture context before compute.** Hypothesis, requirement, protocol — written down before the Card runs, so the why is preserved alongside the what.

## The Modes — a governance dial that only tightens

A Board sits in one of three Modes:

| Mode | "Let's…"           | Gates required           | Inputs        | Evidence      | Agent confidence |
|------|--------------------|--------------------------|---------------|---------------|------------------|
| **Explore** | …try things  | none                     | unpinned OK   | manual OK     | ≥ 0.50           |
| **Study**   | …prove it works | repro + peer-review      | pinned        | manual OK     | ≥ 0.75           |
| **Release** | …ship it        | repro + QA approval      | pinned        | auto-only     | ≥ 0.90           |

Mode is monotone: you can escalate but cannot regress. Going Study→Explore would invalidate every gate you'd already passed. See [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md).

## What the user does in a typical session

1. Open or create a **Board**. Pick a Mode (default: Explore).
2. Capture context: write **Records** (hypothesis, requirement, protocol step). Upload reference **Artifacts** (geometry, datasets).
3. Create a **Card** for each method to try. The Card is a **page** — Intent + Inputs + Method + Run + Results + Evidence + Gates + Notes. Use AI Assist to draft the IntentSpec from plain text.
4. Click **Run.** The Card's Method (auto-resolved Pipeline → Workflow, or hand-authored, or agent-picked) executes. **Live results stream into the page** — residuals chart, 3D field, metrics — rendered for *this Card's intent*, not the tool's UI.
5. Read the auto-collected **CardEvidence** against acceptance criteria. Iterate or hand off to an **Agent Card**.
6. When something works, **promote the Board to Study**. Inputs pin. Run **repro**, get **peer review**.
7. When you're ready to claim it, **promote to Release**. Get **QA approval**. The Card emits a **Release Packet** — a permalink that can be cited.

The user never opens the underlying tool's UI. The user never copies results into another app. The user never wonders which version of which input was used.

## Where to read next

- New to the model? → [`01-CORE-MODEL.md`](./01-CORE-MODEL.md)
- Curious about governance? → [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md)
- Designing the UI? → [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md)
- Visualizing outputs? → [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md)
- Writing a tool? → [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md)
- Walking through a session? → [`06-USER-JOURNEY.md`](./06-USER-JOURNEY.md)
- Looking up a term? → [`99-GLOSSARY.md`](./99-GLOSSARY.md)
