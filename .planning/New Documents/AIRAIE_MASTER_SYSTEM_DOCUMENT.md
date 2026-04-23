# AIRAIE — Master System Document

> The complete reference for what Airaie is, why it exists, how every feature works,
> and how the entire system flows end-to-end.
> Date: 2026-04-22

---

## PART 1 — THE PROBLEM AIRAIE SOLVES

### The Universal Gap

Engineers, scientists, analysts, and researchers all face the same situation:

> "I know what I want. I have data. I have methods. But I can't get consistent,
> trustworthy results — and I can't prove I got them."

They have a **problem** (detect defects in rubber, validate a structural design, classify
sensor anomalies, optimize a manufacturing process). They have **domain knowledge** (research
papers, algorithms, industry methods, years of experience). They have **inputs** (images, datasets,
CAD files, sensor readings, ground truth labels). They have a clear picture of the **desired
output** (detection accuracy ≥ 92%, passing stress simulation, classification confidence above
threshold).

But the path from inputs → desired output through their methods is never a straight line.

### Why the Gap Exists

| Struggle | What Happens Without Airaie |
|---|---|
| **Method comparison** | Try Approach A, then B, but no structured way to compare against the same ground truth |
| **Edge cases** | A method works 80% of the time — failures discovered late, undocumented |
| **Reproducibility** | Tuesday's results don't match Friday's. Which version ran? Nobody knows |
| **Institutional memory** | "We tried that 6 months ago" — knowledge lives in someone's head, not the system |
| **Informal "good enough"** | No declared acceptance criteria, so success is subjective |
| **Iteration without learning** | Teams reinvent failed approaches because nothing was captured |
| **Governance vacuum** | Nobody knows who decided this was acceptable, based on what evidence, and when |

### What Airaie Is

Airaie is a **governed experimentation platform** — not a Jupyter notebook, not a project tracker,
not an LLM chatbot. It is the infrastructure that takes a practitioner's full journey from
"I have a problem and some ideas" to "I have a validated, reproducible, approved result" and
makes that journey structured, traceable, and AI-assisted.

The system has five core layers that work together:

```
┌─────────────────────────────────────────────────────────┐
│  GOVERNANCE LAYER   (Boards, Gates, Records, Intents)    │
│  WHY: structure the problem, capture knowledge, enforce   │
│  quality thresholds before results are accepted           │
├─────────────────────────────────────────────────────────┤
│  INTELLIGENCE LAYER (Agents, AI Assist, Memory)          │
│  WHY: make smart decisions about which tools to use,     │
│  analyze failures, recommend next steps                   │
├─────────────────────────────────────────────────────────┤
│  EXECUTION LAYER    (Tools, Workflows, Plans)            │
│  WHY: run the actual computations in isolated,           │
│  versioned, reproducible containers                       │
├─────────────────────────────────────────────────────────┤
│  DATA LAYER         (Artifacts, Lineage, Evidence)       │
│  WHY: version-lock inputs, track provenance, link        │
│  results to the criteria they satisfy                     │
├─────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE     (PostgreSQL, NATS, MinIO, Docker)    │
│  WHY: durable state, async messaging, file storage,      │
│  container execution                                       │
└─────────────────────────────────────────────────────────┘
```

---

## PART 2 — THE BUILDING BLOCKS

### 2.1 BOARD — The Problem Workspace

A **Board** is the container for one problem. Everything related to solving that problem lives
in the board: the goal, the methods tried, the evidence collected, the decisions made, the
approvals given. Think of it as the experiment's permanent home.

**Board data:**
```
Board {
  id, project_id
  name        — "Rubber Plate Intrusion Detection"
  description — what problem this board is solving
  type        — engineering_validation | research_exploration | manufacturing_release | ...
  mode        — explore | study | release
  status      — DRAFT | ARCHIVED
  owner       — who created it
  metadata    — JSONB for custom data (e.g., { forked_from_id: "board_xyz" })
  created_at, updated_at
}
```

**The most important concept in boards is the mode.** Boards move through three governance modes
that mirror the user's journey:

```
EXPLORE MODE  →  STUDY MODE  →  RELEASE MODE
"Let's try things"  "Let's prove it works"  "Let's ship it"
```

| | Explore | Study | Release |
|---|---|---|---|
| **Gates auto-created** | None | Repro + peer review per card | Repro + approval per card |
| **Input pinning** | Not required | Required | Required |
| **Evidence standard** | Manual OK | Manual OK | Auto-only |
| **Approvals** | Not required | Not required | Multi-role required |
| **Auto-approve floor** | 50% confidence | 75% confidence | 90% confidence |
| **Repro pack** | Not generated | Generated | Generated |

The mode is not just a label — it drives automatic gate creation, agent confidence thresholds,
approval requirements, and input pinning. A board in Release mode is essentially in a compliance
state: everything is locked, signed, and traceable.

**What you do with boards:**
- Create boards (one per problem)
- Move between modes as confidence increases
- Fork a board to explore a parallel approach safely
- Build parent-child hierarchies for large programs (max 3 levels deep)
- View portfolio analytics across all boards

---

### 2.2 RECORDS — Institutional Memory

**Records** are the narrative backbone of a board. Before running a single analysis, a practitioner
captures everything they know as typed records. This prevents institutional memory loss — new team
members can read the board and understand the history in minutes.

**Record types:**

| Type | Purpose | Example |
|---|---|---|
| `hypothesis` | Unverified belief about the problem | "CLAHE normalization should separate intrusions because of their IR signature" |
| `requirement` | A stated constraint that must be met | "Recall ≥ 0.92 on the provided 400-image test set" |
| `protocol_step` | A step in the experimental protocol | "Step 1: Normalize. Step 2: Threshold. Step 3: Morphological closing" |
| `decision` | A choice made and why | "Selected 400-image test set as ground truth — approved by QA lead" |
| `note` | A general observation | "Dark-background samples (n=40) are the hardest edge case" |
| `claim` | An assertion the team believes to be true | "Our method outperforms the baseline on all test subsets" |
| `validation_result` | The outcome of a formal validation | "Validation passed on 2026-04-22 with recall 0.93" |
| `engineering_change` | A change made to the method | "Switched from global to adaptive threshold on 2026-04-15" |
| `acceptance_criteria` | The formal pass/fail bar | "Max stress < 300 MPa, safety factor > 1.2" |

**Records can be linked to runs and artifacts** — so a "validation_result" record can point to
the specific run that produced it and the artifact that contains the detailed output.

---

### 2.3 INTENT + ACCEPTANCE CRITERIA — Defining Success Formally

A critical step most teams skip: **formally declaring what done looks like before running anything**.

An **IntentSpec** is a declarative specification of what a card or board should accomplish. It pins
the inputs to specific versions, declares measurable acceptance criteria, and captures governance
requirements.

```
IntentSpec {
  intent_type     — "sim.fea_stress_analysis" | "ml.defect_detection" | ...
  goal            — "Detect foreign material intrusions with recall ≥ 0.92"
  
  inputs: [
    { name: "rubber_images", artifact_ref: "art_dataset_v3", type: "artifact", required: true },
    { name: "ground_truth",  artifact_ref: "art_gt_v3",      type: "artifact", required: true }
  ]
  
  acceptance_criteria: [
    { metric: "recall",    operator: "gte", threshold: 0.92, weight: 0.5 },
    { metric: "precision", operator: "gte", threshold: 0.85, weight: 0.3 },
    { metric: "fps",       operator: "gte", threshold: 10,   weight: 0.2 }
  ]
  
  constraints: { max_time_hours: 2 }
  
  governance: {
    approval_roles: ["qa_lead"],
    require_review: true,
    compliance_tags: ["ISO-9001"]
  }
  
  status: draft | locked | active | completed | failed
  locked_at: timestamp  ← set when inputs are version-pinned
}
```

**Input pinning** (study/release mode) is the reproducibility mechanism. Once locked, the inputs are
version-frozen — every run uses exactly the same data. This is what makes results comparable across
methods and reproducible by others.

The acceptance criteria turn "good enough" from subjective to objective. The system automatically
evaluates every run's metrics against the criteria and records pass/fail per criterion.

**Intent types** are hierarchically named (e.g., `sim.fea_stress_analysis`, `ml.defect_detection`,
`analysis.safety_factor`) and registered per vertical (engineering, life-sciences, manufacturing).
They define what inputs are expected, what acceptance criteria are valid, and which pipeline
templates are applicable.

---

### 2.4 CARDS — Every Method Is a Trackable Experiment

A **Card** is a discrete unit of work inside a board. Every approach the practitioner wants to try
becomes a card. Cards have statuses, run against an intent, collect evidence, and form a dependency
graph.

**Card types:**

| Type | What It Does |
|---|---|
| `analysis` | Single analysis or simulation run |
| `comparison` | Compares results from multiple cards |
| `sweep` | Parametric sweep across input ranges |
| `agent` | An AI agent decides how to achieve the goal |
| `gate` | A governance checkpoint requiring approval |
| `milestone` | Marks a significant project milestone |

**Card lifecycle:**
```
draft → ready → queued → running → completed ✓
                       ↓ blocked (waiting on dependency) → ready
                       ↓ failed (execution error) → ready (retry)
                       ↓ skipped (manual override)
```

**Card KPIs** — each card can declare its own success metrics:
```
CardKPI { metric_key: "recall", target_value: 0.92, unit: "ratio", tolerance: 0.01 }
```

**Card Dependency Graph** — a directed acyclic graph (DAG) of card dependencies ensures logical
sequencing:
- `blocks`: prerequisite must complete before dependent can start
- `inputs_from`: dependent uses output data from prerequisite

The dependency graph is visible in the board UI as a DAG visualization. Cycle detection prevents
circular dependencies at creation time.

**Card Evidence** — when a card runs, metrics are automatically collected and compared against
acceptance criteria:
```
CardEvidence {
  card_id, run_id, criterion_id
  metric_key: "recall", metric_value: 0.93, metric_unit: "ratio"
  threshold: 0.92, operator: "gte", passed: true
  evaluation: "pass"
}
```

Evidence is the link between execution results and governance decisions. When a gate evaluates,
it queries the evidence to determine if requirements are satisfied.

---

### 2.5 TOOLS — Versioned, Trusted Capabilities

A **Tool** is a self-contained, versioned, executable unit that performs one well-defined
operation. It accepts typed inputs, runs in an isolated environment, and produces typed outputs.

**The Tool Equation:**
```
Tool = Contract (what it accepts/returns)
     + Logic    (how it computes — Docker image, Python script, API call, etc.)
     + Execution Config (where/how it runs)
     + Metadata (name, version, category, owner, domain tags)
     + Trust    (Bayesian trust score from execution history)
```

**Tool tiers:**

| Tier | Scope | Example |
|---|---|---|
| Tier 1 — Primitives | Small, reusable, single operation | Unit Converter, Format Validator, Hash Calculator |
| Tier 2 — Domain Operators | One engineering task, domain-specific | FEA Solver, Mesh Generator, Defect Detector |
| Tier 3 — Products | End-to-end pipelines | Full Structural Validation Pipeline, DFM Check Suite |

**The Tool Contract** is the single source of truth. It has 7 required sections:

```json
{
  "metadata":     { id, name, version, owner, domain_tags, tier },
  "interface":    { inputs: [...], outputs: [...], errors: [...] },
  "runtime":      { adapter, resources, timeout_sec },
  "capabilities": { supported_intents: [...], computes: [...] },
  "governance":   { sandbox: {...}, trust_level, quota },
  "observability":{ log_level, emit_metrics },
  "tests":        { sample_cases: [...] }
}
```

**The Port Type System** — every input/output is one of three types:

| Type | What It Is | How Passed |
|---|---|---|
| `artifact` | A file in MinIO (geometry, images, results) | Artifact ID → presigned URL downloaded into container |
| `parameter` | A typed value (number, string, boolean, object) | Direct value in job payload |
| `metric` | A structured measurement/result | Inline JSON in result payload |

**Nine Runtime Adapters** — tools can run as:

| Adapter | Use Case |
|---|---|
| `docker` | Heavy simulation, custom environments (80% of tools) |
| `python` | Lightweight transforms, simple calculations |
| `native` | WASM/compiled binaries, sandboxed |
| `remote_api` | External HTTP services, databases |
| `notebook` | Jupyter-based analysis |
| `workflow` | Composite tools running sub-workflows |
| `cli` | Command-line tools on runner host |
| `human_task` | Manual steps requiring human action |
| `hardware_device` | Physical instruments, test equipment |

**Trust levels** — tools earn trust through usage:

| Level | Requirements |
|---|---|
| `untested` | Default for new tools |
| `community` | Passes 12 lint checks, published |
| `tested` | Sample cases pass |
| `verified` | 10+ runs, >80% success rate (Bayesian) |
| `certified` | 50+ runs, >95% success rate + human review |

**Bayesian Trust Formula:**
```
trust_score = (successes + 5) / (total_runs + 10)
```
- 0 runs → 0.5 (neutral start, neither trusted nor untrusted)
- 10/10 successes → 0.75
- 100/100 successes → 0.955
- A single failure doesn't destroy trust; data accumulates over time

**Contract Validation — 12 Lint Checks** must pass before a tool can be published:
metadata complete, version is semver, inputs typed, outputs typed, constraints valid,
schema valid, adapter known, resources bounded, intents formatted, errors defined,
tests present, governance complete.

---

### 2.6 WORKFLOWS — Orchestrated Execution Pipelines

A **Workflow** is a directed acyclic graph (DAG) of tool nodes that executes as a coordinated
pipeline. Tools flow data between nodes via typed port connections.

**Workflow Definition (YAML DSL):**
```yaml
apiVersion: airaie.workflow/v1
kind: Workflow
metadata:
  name: rubber-intrusion-detection
  version: "1.0.0"
nodes:
  - id: preprocess
    tool: image-preprocessor@1.2.0
    inputs:
      images: "{{ workflow.inputs.rubber_images }}"
      method: "clahe+adaptive_threshold"
  - id: evaluate
    tool: metrics-evaluator@2.0.1
    depends_on: [preprocess]
    inputs:
      predictions: "{{ preprocess.outputs.masks }}"
      ground_truth: "{{ workflow.inputs.ground_truth }}"
outputs:
  recall:    "{{ evaluate.outputs.metrics.recall }}"
  precision: "{{ evaluate.outputs.metrics.precision }}"
```

**Workflow Compilation Pipeline:**
1. Parse YAML → WorkflowDSL
2. Validate schema (API version, kind, required fields)
3. Resolve references (tool_id@version lookups, input bindings)
4. Type checking (input/output port compatibility using 3-type system)
5. Cycle detection (DAG validation)
6. Build AST with topological order for scheduling
7. Store compiled AST

**Workflow Version Lifecycle:**
```
draft → compiled → published
```
Only published versions can be executed. Once published, a workflow version is immutable.

**Data Flow — how data moves between nodes:**
- Artifact type: the file stays in MinIO; only the artifact ID passes through the DAG
- Parameter type: scalar values passed inline in the job payload
- Metric type: JSON objects passed inline
- Expressions: `{{ $('Node Name').artifacts.output_port }}` resolve at runtime

---

### 2.7 PIPELINE TEMPLATES — Reusable Method Templates

A **Pipeline** is a reusable template for how to achieve a particular intent type. It defines
a sequence of tool invocations that together accomplish a class of tasks.

**Pipeline data:**
```
Pipeline {
  slug             — "fea-standard-validation" (unique per vertical)
  vertical_id      — "engineering-mechanical"
  supported_intents — ["sim.fea_stress_analysis", "sim.structural_validation"]
  trust_level      — "tested"
  cost_estimate    — { total_base_credits: 150 }
  time_estimate    — { total_minutes: 18, human_readable: "~18 min" }
  steps: [
    { order: 1, tool_id: "mesh-generator", tool_version: "1.0", role: "mesh" },
    { order: 2, tool_id: "fea-solver",     tool_version: "2.1", role: "solve" },
    { order: 3, tool_id: "result-analyzer",tool_version: "1.0", role: "post_process" }
  ]
}
```

**Plan Generation** — when a user runs a card, the Plan Generator creates an ExecutionPlan
from the card's IntentSpec and the matching pipeline in 10 steps:

1. Load card → validate type (analysis/comparison/sweep)
2. Load IntentSpec
3. Load/auto-select pipeline (by intent type, pick highest trust)
4. Instantiate pipeline steps → PlanNodes with edges
5. Bind IntentSpec inputs → node input ports
6. Apply parameter overrides
7. Insert validation nodes (schema_validator, unit_checker — preflight markers)
8. Insert evidence nodes (metric_extractor after solve nodes)
9. Insert approval nodes (if governance.require_review + study/release mode)
10. Compute cost and time estimates

The resulting ExecutionPlan (a DAG of nodes) is compiled to a WorkflowDSL YAML and executed
as a standard workflow run.

---

### 2.8 ARTIFACTS — Versioned, Immutable Data

An **Artifact** is a versioned, immutable file stored in MinIO with full provenance tracking.
Artifacts are the currency of the data layer — they connect runs, tools, cards, boards, and
evidence together.

**Artifact data:**
```
Artifact {
  id           — "art_abc123"
  project_id
  name         — "rubber_test_images.tar.gz"
  type         — dataset | report | cad_model | sim_result | mesh | image | ...
  content_hash — "sha256:a1b2c3..." (immutable fingerprint)
  size_bytes
  storage_uri  — "minio://airaie-bucket/prj_001/dataset/2026/04/art_abc123/filename"
  created_by   — "run_xyz" or "user_santhosh"
}
```

**Key artifact properties:**
- **Immutable**: once an artifact has a content_hash, it cannot be overwritten
- **New version = new artifact**: changing the data creates a new artifact record, not a new version field
- **Upload process**: two-stage — (1) get presigned PUT URL, (2) upload directly to MinIO, (3) finalize to create the record
- **Download**: presigned GET URL, valid for up to 24 hours

**Artifact References in Intents:**
```
artifact://project_id/artifact_id
```
This format is used in IntentSpec inputs to pin specific artifact versions. When the intent
is locked, these references are frozen — the same exact files run every time.

**Artifact Lineage — the Provenance Graph:**
```
ArtifactLineage {
  input_artifact  — "art_rubber_images_v3"
  output_artifact — "art_detection_masks_001"
  run_id          — "run_clahe_run_1"
  node_id         — "preprocess_node"
  transform       — "image-preprocessor@1.2.0"
}
```

The lineage graph answers: "Where did this result come from? Which tool ran on which inputs to produce it?"

This enables:
- **Provenance queries**: trace any artifact back to its source
- **Cache detection**: if transform X already ran on input Y, return the cached output artifact
- **Reproducibility audit**: reconstruct the full data flow for any result

---

### 2.9 AGENTS — Autonomous Decision-Makers

An **Agent** is an autonomous AI-powered decision-maker that can be used as a card type
(card_type = "agent") or interactively via the Playground. Given a goal and a set of available
tools, the agent decides which tools to call, with what inputs, evaluates the results, and iterates.

**Agent ≠ Tool:**
```
TOOL:   Deterministic. Same inputs → same outputs. No reasoning. Single execution.
AGENT:  Non-deterministic. Decides WHICH tool to run based on context and reasoning.
        Evaluates results. Iterates. Learns from experience.
```

**Agent Architecture — 6 Components:**

```
1. MODEL (LLM)
   Provider: Anthropic (Claude), OpenAI (GPT-4), Google (Gemini), HuggingFace
   Configurable: provider, model_id, api_key, temperature, max_tokens
   Role: reason over goals and context, propose tool selections and inputs

2. AGENT CORE (13-step pipeline)
   ToolSearcher    → ToolShelf 5-stage resolution (DISCOVER→FILTER→RANK→EXPLAIN→ASSEMBLE)
   Scorer          → 5-dimension hybrid scoring (algorithmic + LLM blend)
   ProposalGenerator → deterministic or llm_augmented mode
   PolicyEnforcer  → 4 verdicts (APPROVED, NEEDS_APPROVAL, REJECTED, ESCALATE)
   ProposalExecutor → dispatches tools as Runs via the same infrastructure as workflows
   ResultEvaluator → LLM interprets result, determines if goal is achieved
   IterationController → manages the loop, triggers replanning on failure

3. TOOLS
   Agent sees its allowed tool list + each tool's full contract
   ToolShelf resolution runs at decision time to find + rank candidates

4. POLICIES
   4 verdicts based on confidence scores + board mode overrides
   Board mode TIGHTENS thresholds (can only restrict, never loosen):
   Explore: 50% floor | Study: 75% floor | Release: 90% floor

5. MEMORY (dual-layer, pgvector)
   Episodic: specific run outcomes, 30-day TTL
   Semantic: patterns extracted from multiple runs, persistent
   Retrieval: top-k cosine similarity before each decision
   Categories: fact | preference | lesson | error_pattern

6. CONTEXT
   Goal text (from AgentSpec — never from user input)
   Input data (structured summaries of artifacts + parameters)
   Iteration state (current, max, cost spent, budget remaining)
   Board context (mode, effective threshold)
   Relevant memories (retrieved via vector similarity)
```

**Agent Decision-Making — 5-Dimension Hybrid Scoring:**

```
ALGORITHMIC DIMENSIONS (100% objective):
  1. Compatibility (weight 0.4): match(inputs) × match(outputs) — can the tool use what we have?
  2. Trust (weight 0.3):         success_rate × test_coverage — how reliable is the tool?
  3. Cost (weight 0.2):          1 - normalize(cost/budget) — how expensive is it?
  4. Latency (weight 0.1):       1 - normalize(duration/deadline) — how slow is it?
  5. Risk Penalty (subtractive): side_effects + recent_failure_rate

LLM SCORE (subjective reasoning):
  LLM reads: goal, context, tool descriptions, iteration state
  Outputs: per-tool relevance score 0-1 + reasoning

FINAL SCORE = (1 - llm_weight) × algorithmic + llm_weight × llm_score
              (typical llm_weight = 0.7)
```

**The 13-Step Execution Pipeline:**

```
THINK:    1. Load AgentSpec (published version)
          2. Assemble context (inputs + history + memories + board mode)

SELECT:   3. Resolve capabilities via ToolShelf 5-stage
          4. Score tools (5 dimensions + LLM blend)
          5. Filter by permissions + minimum threshold

PROPOSE:  6. Generate proposal (LLM proposes specific tool + inputs)

VALIDATE: 7. Enforce policy (4 verdicts, board mode override)
          8. Build RunPlan (DAG levels for parallel execution)
          9. Dispatch jobs to NATS (airaie.jobs.agent.execution)
          10. Execute levels sequentially (parallel within each level)
          11. Collect artifacts + metrics → evaluate result

LEARN:    12. Update trust scores (Bayesian, 60s TTL cache)
          13. Create episodic memory → extract semantic if pattern threshold met
```

**Policy Verdicts:**

| Verdict | Meaning | When |
|---|---|---|
| `APPROVED` | Execute immediately | confidence ≥ effective_threshold |
| `NEEDS_APPROVAL` | Human gate required | 0.5 ≤ confidence < threshold |
| `REJECTED` | Stop, don't execute | confidence < 0.5 or budget exhausted |
| `ESCALATE` | Route to escalation target | cost > limit, risk rule triggered |

**Replanning on Failure:**
When a tool fails, the agent:
1. Excludes the failed tool from candidates
2. Enriches the goal with the failure context
3. Regenerates a proposal with remaining tools
4. Enforces remaining budget

**Agent Versions:** integers (1, 2, 3...), lifecycle: draft → validated → published.
Only published versions can run. Specs are immutable once published.

**Agent Memory Schema:**
```sql
agent_memories {
  id, agent_id, memory_type (episodic|semantic), category (fact|preference|lesson|error_pattern),
  content TEXT, embedding vector(1536), expires_at TIMESTAMP (NULL for semantic), created_at
}
INDEX: IVFFlat on embedding for cosine similarity search
```

---

### 2.10 GATES — Quality Enforcement Checkpoints

A **Gate** is a blocking governance checkpoint on a board that must pass before work can
proceed to the next stage. Gates have typed requirements that must each be satisfied.

**Gate data:**
```
Gate {
  id, board_id, project_id
  name        — "Validation Accuracy Gate"
  gate_type   — evidence | review | compliance | manufacturing | exception
  status      — PENDING | EVALUATING | PASSED | FAILED | WAIVED
  description, metadata, evaluated_at
}
```

**Gate Requirements — the conditions that must be satisfied:**

| Requirement Type | What It Checks |
|---|---|
| `run_succeeded` | A specific run completed successfully |
| `artifact_exists` | An artifact with matching properties exists |
| `role_signed` | A human with a specific role approved |
| `metric_threshold` | A collected metric meets a threshold |

**Gate Evaluation Flow:**
```
PENDING → EVALUATING → PASSED ✓
                     → FAILED → (fix issues, re-evaluate)
                              → WAIVED (with rationale, requires approvals in release mode)
```

**Auto-created Gates by Board Mode:**
- **Explore**: no gates auto-created
- **Study**: repro gate per card ("Reproducibility: {CardTitle}")
- **Release**: repro gate + approval gate per card ("Approval: {CardTitle}")

**Gate Approvals:**
```
GateApproval {
  gate_id, action (approve|reject|waive), actor (user_id), role, rationale
}
```

Gates answer the governance question: **Who decided this was good enough, based on what evidence,
and when?** — with a full audit trail.

---

### 2.11 AI ASSIST — Intelligent Guidance at Every Step

The **AI Assist layer** provides LLM-powered guidance without requiring the user to manually
wire every step. It operates at the board level and surfaces four capabilities.

**1. Draft Intent (`POST /v0/boards/{id}/assist/draft-intent`)**

User describes their problem in plain text:
```
"I want to detect dark inclusions in bright rubber sheets using IR images,
targeting recall above 90% with real-time throughput"
```
The LLM generates a complete IntentSpec (intent_type, goal, inputs, acceptance_criteria, constraints).
User gets a fully-formed intent to review and accept — skipping the blank-page problem.

**2. Recommend Tools (`GET /v0/boards/{id}/assist/recommend-tools`)**

Given the board's primary intent, the LLM suggests the 3-5 best-matched tools from the registry
with confidence scores and reasoning:
```
{ tool_id: "image-preprocessor", score: 0.94, reason: "CLAHE is well-suited for IR image normalization" }
{ tool_id: "metrics-evaluator",  score: 0.91, reason: "Computes recall/precision directly" }
{ tool_id: "unet-segmentor",     score: 0.78, reason: "Deep learning approach for binary segmentation" }
```

**3. Analyze Failure (`GET /v0/boards/{id}/runs/{rid}/assist/analyze-failure`)**

When a card fails, the LLM analyzes run logs, error messages, and prior success history:
```
Root cause: "Dark-background samples (40 images) score 0.61 recall.
The threshold value is too aggressive for low-contrast regions."
Suggestions: ["Try multi-scale approach", "Class-weighted loss in DL model",
              "Apply separate preprocessing for dark-background samples"]
```

**4. Summarize Approvals (`GET /v0/boards/{id}/assist/summarize-approvals`)**

Aggregates gate statuses and pending approvals:
```
"3 of 5 gates passed. Blocking: Validation Accuracy Gate (precision 0.83 vs 0.85 required)
and Role Sign-Off Gate (QA Lead approval pending). Estimated 2 actions to clear."
```

**Graceful degradation:** all four methods return useful data aggregation even without LLM.
If LLM provider is not configured, the endpoints return 503 with a clear message — the
system never silently fails.

---

### 2.12 PORTFOLIO — Multi-Board Analytics

The **Portfolio Service** provides program-level visibility across all boards in a project.

**Three views:**

| View | What It Shows | Use Case |
|---|---|---|
| **Readiness Heatmap** | All boards ranked by gate passage rate (0–1) | See which experiments are closest to release |
| **Critical Path** | Boards sorted by least-ready (most gates remaining) | Identify where to focus effort next |
| **Bottlenecks** | Top 10 boards by open/failed gate count | Find what's blocking the whole program |

Portfolio data is computed live from the gate database — no caching needed at the data layer.

---

### 2.13 FORK & REPLAY — Parallel Exploration

**Fork:** creates a deep copy of a board with a new ID.
- Clones all cards (status reset to DRAFT)
- Copies board mode and settings
- Stores lineage in metadata (`{ forked_from_id: "board_original" }`)

Use case: try a radically different method without contaminating the current best result.
Both boards run in parallel; the portfolio view shows them side-by-side.

**Replay:** re-runs a board's execution with modified inputs.
- Re-runs cards with different parameters
- Preserves evidence linkage
- Enables parameter sensitivity analysis

---

### 2.14 BOARD COMPOSITION — Hierarchical Programs

Large programs decompose into parent-child board hierarchies (max 3 levels: root → child → grandchild).

**CreateChildBoard:** child inherits project_id and type from parent; mode and owner can be overridden.

**AggregateChildEvidence:** parent board collects evidence from all child boards.
Enables hierarchical readiness rollup — a parent board's gates can require child boards to pass first.

**ListChildBoards:** list all direct children of a board.

---

### 2.15 INFRASTRUCTURE — What Everything Runs On

```
PostgreSQL 16 (primary data store)
  - All boards, cards, gates, records, intents, agents, tools, runs, artifacts, sessions
  - pgvector extension for agent memory embeddings
  - GIN indexes on JSONB for intent resolution
  - Full audit trail in audit_events table

NATS JetStream 2.10 (async messaging)
  - airaie.jobs.tool.execution   → control plane to runner (job dispatch)
  - airaie.results.completed     → runner to control plane (execution results)
  - airaie.events.{runId}        → runner to frontend (real-time progress)
  - airaie.events.audit          → all services to audit log

MinIO (S3-compatible artifact storage)
  - Artifact upload/download via presigned URLs
  - Content-hash verification for immutability
  - Object key: {project_id}/{type}/{year}/{month}/{artifact_id}/{filename}

Docker Engine (tool container execution)
  - Containers pulled from registry.airaie.io
  - Resource limits: --cpus, --memory, --pids-limit
  - Network isolation: --network=none for sandboxed tools
  - Filesystem isolation: read-only inputs, write-only outputs

Rust Runner (job executor)
  - Consumes jobs from NATS
  - Downloads inputs from MinIO
  - Executes containers via 9 adapters
  - Uploads outputs to MinIO
  - Publishes results to NATS
  - Streams progress events to frontend

Go API Gateway (control plane)
  - All business logic, service orchestration
  - Internal services: Board, Card, Gate, Record, Intent, Agent, Tool, Run, Artifact, ...
  - Routes: /v0/boards, /v0/agents, /v0/tools, /v0/runs, /v0/artifacts, ...
  - Auth via project_id header
  - Audit event emission for every significant operation
```

---

## PART 3 — THE COMPLETE SYSTEM FLOW

This section shows exactly how all the pieces connect, from the moment a user has a problem
to the moment a result is validated, approved, and released.

### Phase 1: Problem Setup (Explore Mode)

```
USER: "I want to detect intrusions in rubber plates"
                          ↓
┌─────────────────────────────────────────────┐
│  1. CREATE BOARD                             │
│     Name: "Rubber Plate Intrusion Detection" │
│     Type: research_exploration               │
│     Mode: explore (start here)               │
│     → Board ID: board_rubber_001             │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  2. ADD RECORDS (institutional memory)       │
│     Hypothesis: "CLAHE separates intrusions" │
│     Requirement: "Recall ≥ 0.92"            │
│     Note: "Dark samples are hardest cases"   │
│     Decision: "Using 400-image test set"     │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  3. UPLOAD ARTIFACTS                         │
│     POST /v0/artifacts/upload-url            │
│     → Presigned PUT URL                      │
│     Upload test images → MinIO               │
│     POST /v0/artifacts/{id}/finalize         │
│     → art_rubber_images_v3 (content_hash set)│
│     → art_ground_truth_v3                    │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  4. DRAFT INTENT (optional AI assist)        │
│     POST /v0/boards/{id}/assist/draft-intent │
│     Input: "Detect intrusions, recall ≥ 0.92"│
│     LLM generates: IntentSpec with inputs,   │
│     criteria (recall ≥ 0.92, precision ≥ 0.85│
│     fps ≥ 10), constraints (max 2h)          │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  5. REGISTER INTENT                          │
│     POST /v0/boards/{id}/intents             │
│     IntentSpec saved with:                   │
│       inputs: [rubber_images_v3, gt_v3]      │
│       criteria: [recall≥0.92, precision≥0.85]│
│       status: draft (not yet locked)         │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  6. REGISTER TOOLS (if not already in shelf) │
│     POST /v0/tools → image-preprocessor@1.2  │
│     POST /v0/tools → metrics-evaluator@2.0   │
│     POST /v0/tools → unet-segmentor@1.0      │
│     Each: contract validated (12 lint checks)│
│     Trust starts at: untested → community    │
└─────────────────────────────────────────────┘
```

### Phase 2: Experimentation (Cards + Runs)

```
┌─────────────────────────────────────────────┐
│  7. CREATE EXPERIMENT CARDS                  │
│     Card 1: "Global Otsu Threshold"          │
│     Card 2: "CLAHE + Adaptive Threshold"     │
│     Card 3: "U-Net Segmentation"             │
│     Card 4: "Ensemble (CLAHE + U-Net)"       │
│       → status: draft for all                │
│       → Dependencies: Card 4 depends_on      │
│         Card 2 AND Card 3 (inputs_from)      │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  8. GENERATE EXECUTION PLAN                  │
│     POST /v0/cards/{id}/plan                 │
│     Plan Generator:                          │
│     1. Loads Card + IntentSpec               │
│     2. Finds pipeline: "ml-detection-pipeline"│
│     3. Instantiates nodes:                   │
│        [preprocess] → [segment] → [evaluate] │
│     4. Binds intent inputs to node ports     │
│     5. Inserts metric_extractor node         │
│     6. Computes cost/time estimates          │
│     → ExecutionPlan saved                    │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  9. LOCK INTENT (for reproducibility)        │
│     POST /v0/intents/{id}/lock               │
│     → All inputs version-pinned              │
│     → status: locked                         │
│     → locked_at: timestamp                   │
│     Now: same data runs every time           │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  10. RUN CARD (execute the plan)             │
│                                              │
│  Go Control Plane:                           │
│    a. Validates inputs via PreflightService  │
│    b. Generates presigned artifact URLs      │
│    c. Builds Job payload                     │
│    d. Publishes to NATS:                     │
│       airaie.jobs.tool.execution             │
│                                              │
│  Rust Runner:                                │
│    a. Downloads rubber_images_v3 from MinIO  │
│    b. Starts container: image-preprocessor   │
│       --cpus=2 --memory=1024m --network=none │
│    c. Container applies CLAHE + threshold    │
│    d. Produces: masks/ directory             │
│    e. Uploads masks → art_masks_clahe_001    │
│    f. Writes metrics.json                    │
│    g. Publishes Result to NATS:              │
│       airaie.results.completed               │
│                                              │
│  Go Control Plane (result consumer):         │
│    a. Updates NodeRun status: SUCCEEDED      │
│    b. Creates artifact record                │
│    c. Updates tool trust stats               │
│    d. Dispatches next node (metrics-evaluator)│
│       → runs on art_masks_clahe_001 + gt     │
│    e. Evaluator produces:                    │
│       { recall: 0.88, precision: 0.83 }     │
│    f. CardEvidence auto-created:             │
│       recall: 0.88 vs 0.92 → FAILED ✗       │
│       precision: 0.83 vs 0.85 → FAILED ✗    │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  11. AI ASSIST — ANALYZE FAILURE             │
│     GET /v0/boards/{id}/runs/{rid}/           │
│         assist/analyze-failure               │
│     LLM response:                            │
│     "Dark-background samples score 0.61.     │
│      Threshold too aggressive for low contrast│
│      Try: CLAHE with higher clip limit +     │
│      morphological closing before threshold" │
│     → Record this as a board Record (note)   │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  12. ITERATE — run other cards               │
│     Card 3 "U-Net": recall 0.91 → FAILED ✗  │
│     Card 2 improved (after fix): recall 0.93 │
│       → precision: 0.87                      │
│       → fps: 12.4                            │
│       → CardEvidence: ALL PASSED ✓           │
└─────────────────────────────────────────────┘
```

### Phase 3: Agent-Assisted Iteration (optional)

```
┌─────────────────────────────────────────────┐
│  ALTERNATIVE TO MANUAL CARDS:                │
│  Use an Agent Card for autonomous search     │
│                                              │
│  Card 5: "AI Optimization Agent" (agent type)│
│  Agent Spec:                                 │
│    goal: "Find method with recall ≥ 0.92"   │
│    tools: [image-preprocessor, metrics-eval] │
│    policy: auto_approve >= 0.80              │
│    constraints: max_iterations 8, budget $10 │
│    memory: recall past successful approaches │
│                                              │
│  Agent Execution (13 steps):                 │
│  Iter 1: Scores tools → proposes CLAHE run  │
│           confidence 0.88 → APPROVED         │
│           runs → recall 0.88 → not done      │
│  Iter 2: Reanalyzes → tries higher clip limit│
│           confidence 0.82 → APPROVED         │
│           runs → recall 0.91 → not done      │
│  Iter 3: Tries morphological closing         │
│           confidence 0.76 < 0.80 → NEEDS_APPROVAL
│           [User reviews proposal in UI]      │
│           User: APPROVE                      │
│           runs → recall 0.93 → GOAL ACHIEVED!│
│  Creates memory: "CLAHE clip=2, morph=close  │
│  works for rubber IR with dark backgrounds"  │
└─────────────────────────────────────────────┘
```

### Phase 4: Validation (Study Mode)

```
┌─────────────────────────────────────────────┐
│  13. ESCALATE TO STUDY MODE                  │
│     POST /v0/boards/{id}/mode-escalate       │
│     { next_mode: "study" }                   │
│                                              │
│     System auto-creates gates per card:      │
│     Gate: "Reproducibility: CLAHE Method"   │
│       Req: run_succeeded (3 independent runs)│
│       Req: metric_threshold recall ≥ 0.92   │
│     Gate: "Peer Review: CLAHE Method"       │
│       Req: role_signed (reviewer role)       │
│                                              │
│     Input pinning now REQUIRED before runs  │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  14. REPRODUCE — run the winning method 3x   │
│     Same intent, same pinned inputs          │
│     Run 1: recall 0.931 → ✓                 │
│     Run 2: recall 0.929 → ✓                 │
│     Run 3: recall 0.933 → ✓                 │
│     → "Reproducibility" gate: PASSED ✓      │
│                                              │
│  15. PEER REVIEW                             │
│     POST /v0/gates/{id}/approvals            │
│     { action: "approve", role: "reviewer",  │
│       rationale: "Method verified on 3 runs" }
│     → "Peer Review" gate: PASSED ✓          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  16. PORTFOLIO CHECK                         │
│     GET /v0/portfolio/heatmap                │
│     "Rubber Detection board: 4/5 gates       │
│      passed. Readiness: 0.80"               │
│     GET /v0/portfolio/bottlenecks            │
│     "One gate remaining: QA Lead sign-off"  │
└─────────────────────────────────────────────┘
```

### Phase 5: Release (Release Mode)

```
┌─────────────────────────────────────────────┐
│  17. ESCALATE TO RELEASE MODE                │
│     POST /v0/boards/{id}/mode-escalate       │
│     { next_mode: "release" }                 │
│                                              │
│     Gates now require:                       │
│     - Auto-evidence only (no manual evidence)│
│     - Multi-role approvals                   │
│     - 90% confidence floor for agents        │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  18. FINAL APPROVAL                          │
│     POST /v0/gates/{id}/approvals            │
│     { action: "approve", role: "qa_lead",   │
│       rationale: "Reviewed evidence package" }│
│     → All gates PASSED ✓                    │
│     → Board status: ready for release        │
└─────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────┐
│  19. RELEASE PACKAGE                         │
│     Contains:                                │
│     • Full audit trail (every event logged)  │
│     • Input artifact versions (pinned)       │
│     • Tool versions used (locked at run time)│
│     • All evidence (metrics + artifacts)     │
│     • All gate approvals (who, when, why)    │
│     • All board records (decisions, hypotheses)
│     • Reproducibility pack                   │
└─────────────────────────────────────────────┘
```

---

## PART 4 — HOW EVERYTHING CONNECTS

### The Connection Map

```
                    BOARD (problem workspace)
                        │
         ┌──────────────┼──────────────┐
         │              │              │
      RECORDS        INTENTS        GATES
   (what we know)  (what success   (pass/fail
      hypothesis,   looks like)     checkpoints)
      decision,        │                │
      requirement       │                │
                    CARDS               │
                (experiment units)       │
                     │    │             │
              ARTIFACTS  EVIDENCE──────→│
              (versioned  (metrics vs    │
               data files) criteria)    │
                     │                  │
              WORKFLOWS / PLANS         │
               (execution DAGs)         │
                     │                  │
                   TOOLS                │
              (containerized           │
               computations)           │
                     │                  │
              RUNS / NODE RUNS          │
               (execution records)      │
                     │                  │
              ARTIFACT LINEAGE          │
              (provenance graph)        │
                                       │
              AI ASSIST ──────────────→ GATES
              (LLM guidance)
                     │
              AGENTS (autonomous
               decision-making)
                     │
              MEMORY (episodic
               + semantic learning)
```

### How Data Flows Through a Run

```
User uploads files
        │
        ▼
   ARTIFACTS (stored in MinIO, immutable, content-hashed)
        │
        ▼
   INTENT (pins artifact versions, declares acceptance criteria)
        │
        ▼
   CARD (unit of work, references the intent)
        │
        ▼
   PLAN (generated from intent + pipeline template, creates workflow DAG)
        │
        ▼
   WORKFLOW RUN (dispatched via Go → NATS → Rust Runner → Docker)
        │
        ├──────────────────────────────┐
        ▼                              ▼
   INPUT ARTIFACTS              TOOL EXECUTION
   (downloaded from MinIO        (in isolated container)
    into container workspace)            │
                                         ▼
                                 OUTPUT ARTIFACTS
                                  (uploaded to MinIO)
                                 OUTPUT METRICS
                                  (inline JSON)
                                         │
                                         ▼
                                   CARD EVIDENCE
                                  (metric vs threshold,
                                   pass/fail per criterion)
                                         │
                                         ▼
                                    GATE EVALUATION
                                  (is this gate's requirement
                                   now satisfied?)
                                         │
                                         ▼
                                 AUDIT EVENT
                                 (immutable record of what
                                  happened and who did it)
```

### The Role of Each Feature in the Flow

| Feature | Role in the Flow | When It Activates |
|---|---|---|
| **Board** | Container for the entire problem | Created at start; persists throughout |
| **Records** | Capture domain knowledge before experiments start | Written by user anytime |
| **Intent** | Define inputs + success criteria formally | Defined before running cards |
| **Artifact** | Version-lock data; carry data between tools | Uploaded before first run; produced by every tool |
| **Lineage** | Track which tool transformed which input into which output | Recorded automatically on every node completion |
| **Card** | Track each method as an experiment | Created for each approach; status follows execution |
| **Plan** | Turn intent + pipeline into a workflow DAG | Generated before a card run |
| **Tool** | Execute the actual computation | Invoked by every node in the workflow |
| **Workflow** | Orchestrate multi-tool pipelines | Compiled from plan; executed as a run |
| **Run / NodeRun** | Record what executed, when, and with what result | Created automatically on dispatch |
| **Evidence** | Link tool output metrics to acceptance criteria | Auto-collected from tool output JSON |
| **Gate** | Block progression until quality is proven | Auto-created on mode escalation; evaluated after evidence collection |
| **Approval** | Record human sign-off | Given by users in the gate review flow |
| **Agent** | Autonomously decide tool sequence and inputs | Used as card_type="agent" or via Playground |
| **Memory** | Let agents learn from past runs | Written after each agent iteration; recalled before next |
| **AI Assist** | Draft intents, recommend tools, analyze failures, summarize status | Called by user on-demand at any point |
| **Portfolio** | Cross-board visibility | Queried by program managers anytime |
| **Fork** | Parallel hypothesis exploration without risk | Created when user wants a clean branch |

---

## PART 5 — END-TO-END EXAMPLE: RUBBER PLATE INTRUSION DETECTION

This walkthrough shows exactly what a practitioner sees and does, and what the system does
internally, for the rubber plate intrusion detection example.

### The Situation

An engineer has 400 infrared images of rubber sheets. 60 images contain embedded metal shards
or air bubbles. They want to detect these intrusions automatically with recall ≥ 0.92 (can't
miss intrusions) and precision ≥ 0.85 (minimize false alarms) at real-time throughput (≥ 10 fps).

They have three methods to try:
1. Global Otsu thresholding (fast, simple baseline)
2. CLAHE normalization + adaptive threshold (domain-expert approach)
3. U-Net semantic segmentation (deep learning approach)

### What They Do in Airaie

**Day 1 — Setup**

```
1. Create board: "Rubber Plate Intrusion Detection" (explore mode)
2. Write records:
   - Hypothesis: "CLAHE separates intrusions because their IR signature differs"
   - Requirement: "Recall ≥ 0.92 on 400-image test set v3"
   - Note: "Dark-background samples (n=40) are consistently the hardest"
   - Protocol Step: "Normalize → Threshold → Morphological closing → Evaluate"
3. Upload artifacts: rubber_images_v3 (400 images), ground_truth_v3 (400 labels)
4. Ask AI Assist to draft intent → review and save IntentSpec
5. Register tools: image-preprocessor@1.2, metrics-evaluator@2.0, unet-segmentor@1.0
```

**Day 1 — First Experiment**

```
6. Create Card 1: "Global Otsu" (analysis type, uses intent)
7. Generate plan → [preprocess (otsu)] → [evaluate]
8. Lock intent (pin art_rubber_images_v3 + art_ground_truth_v3)
9. Run card

   System internally:
   - Go builds Job, publishes to NATS
   - Rust Runner downloads 400 images (1.2 GB) from MinIO
   - Starts container: image-preprocessor:1.2 with method="global_otsu"
   - Container produces binary masks (400 .png files, 18 MB)
   - Uploads masks → art_masks_otsu_001
   - Starts container: metrics-evaluator:2.0 with masks + ground_truth
   - Produces: { recall: 0.71, precision: 0.88, fps: 47.3 }
   - CardEvidence: recall 0.71 < 0.92 → FAILED ✗

10. Ask AI Assist to analyze failure
    → "Global threshold fails on dark-background samples. CLAHE
       normalization would equalize contrast before thresholding."
11. Record this analysis as a board note
```

**Day 2 — CLAHE Approach**

```
12. Create Card 2: "CLAHE + Adaptive Threshold"
13. Run card

    Produces: { recall: 0.88, precision: 0.87, fps: 31.4 }
    CardEvidence: recall 0.88 < 0.92 → FAILED ✗ (but closer)

14. Analyze failure: "Dark samples still scoring 0.63.
    Try clip_limit=3 (stronger CLAHE) + morphological closing"
15. Record updated protocol step

16. Run improved CLAHE card
    Produces: { recall: 0.93, precision: 0.87, fps: 28.6 }
    CardEvidence: recall 0.93 ≥ 0.92 → PASSED ✓
                  precision 0.87 ≥ 0.85 → PASSED ✓
                  fps 28.6 ≥ 10 → PASSED ✓
    → ALL CRITERIA PASSED
```

**Day 3 — Escalate and Validate**

```
17. Escalate board to STUDY MODE
    System auto-creates:
    Gate: "Reproducibility: CLAHE Method"
      Req: run_succeeded × 3
      Req: metric_threshold recall ≥ 0.92
    Gate: "Peer Review: CLAHE Method"
      Req: role_signed (role: "reviewer")

18. Run CLAHE card 3 more times (reproducibility)
    Run 1: recall 0.931 ✓  Run 2: recall 0.929 ✓  Run 3: recall 0.933 ✓
    → "Reproducibility" gate auto-evaluates: PASSED ✓

19. Peer reviewer approves:
    POST /v0/gates/{id}/approvals
    { action: "approve", role: "reviewer", rationale: "3-run reproducibility confirmed" }
    → Gate: PASSED ✓

20. Record decision: "CLAHE + adaptive threshold selected as primary method
    based on recall 0.93, precision 0.87, reproducibility across 3 runs"
```

**Day 4 — Fork to Compare Deep Learning**

```
21. Fork board → "Rubber Detection - U-Net Approach"
22. Run U-Net card on forked board: recall 0.94, precision 0.91, fps 8.2
    → fps 8.2 < 10 fps → FAILED ✗ (fails throughput criterion)
23. Portfolio view:
    - Original board (CLAHE): readiness 0.80, 2/2 study gates passed
    - Forked board (U-Net): readiness 0.40, 0/2 study gates passed
24. Decision: CLAHE wins (U-Net fails fps requirement)
    Record decision on original board
```

**Day 5 — Release**

```
25. Escalate to RELEASE MODE
    New gate auto-created: "QA Approval: CLAHE Method"
    Req: role_signed (role: "qa_lead")
    Req: run_succeeded × 5 (higher bar for release)

26. Run 5 validation runs
    All pass → gate satisfied

27. QA Lead approves:
    { action: "approve", role: "qa_lead",
      rationale: "Evidence package reviewed. Method validated on 400-image test set.
                  Reproducibility confirmed. Meets recall and precision requirements." }
    → ALL GATES PASSED ✓

28. RELEASE PACKAGE:
    ┌────────────────────────────────────────────────┐
    │  INPUT ARTIFACTS:                              │
    │    art_rubber_images_v3 (SHA256: a1b2c3...)    │
    │    art_ground_truth_v3  (SHA256: d4e5f6...)    │
    │                                                │
    │  TOOL VERSIONS USED:                           │
    │    image-preprocessor@1.2.0 (trust: verified) │
    │    metrics-evaluator@2.0.1  (trust: certified) │
    │                                                │
    │  EVIDENCE:                                     │
    │    recall: 0.93 ≥ 0.92 ✓ (8 runs confirmed)   │
    │    precision: 0.87 ≥ 0.85 ✓                   │
    │    fps: 28.6 ≥ 10 ✓                            │
    │                                                │
    │  GATE APPROVALS:                               │
    │    reviewer@review_team: approved 2026-04-23   │
    │    qa_lead@qa_dept: approved 2026-04-25        │
    │                                                │
    │  AUDIT TRAIL: 247 events                       │
    │  BOARD RECORDS: 14 records                     │
    └────────────────────────────────────────────────┘
```

---

## PART 6 — KEY DESIGN PRINCIPLES

### Why Each Principle Exists

**1. Contract-first tools**
The ToolContract is the API for everything — registry UI, ToolShelf resolution, workflow editor,
agent runtime, job dispatcher, runner, evidence collection, governance. Changing tool behavior
requires a new version, which creates a new immutable record. Nothing can silently change.

**2. Immutable artifacts**
Artifacts cannot be overwritten after a content_hash is set. A "new version" is a new artifact
record. This prevents data drift: the same artifact ID always refers to the same bytes.

**3. Evidence over assertions**
Gates don't accept "we say it works." They require either run execution records, artifact existence
proofs, measured metric thresholds, or human role signatures — all with timestamps and actor IDs.

**4. Mode as governance dial**
The board mode (explore → study → release) automatically tunes every governance parameter:
gates, agent confidence floors, approval requirements, evidence standards. Users don't need to
manually configure governance — they escalate the mode.

**5. Hybrid agent intelligence**
Agents blend algorithmic scoring (compatibility, trust, cost, latency — objective, grounded in data)
with LLM reasoning (contextual, goal-aware). Neither alone is sufficient: pure LLM hallucinates
tool names; pure algorithmic is rigid. The hybrid grounds creativity in reality.

**6. Memory as institutional learning**
Agents don't start fresh each run. Episodic memories capture specific run outcomes; semantic
memories capture extracted patterns. Over time, agents get smarter about a domain — they know
that CLAHE clip=3 works well for rubber IR images, so they propose it before the user tells them.

**7. Board as the unit of governance**
Everything — agents, tools, evidence, gates, records, artifacts, runs — is connected to a board.
The board is the governance boundary. Escalation mode changes apply uniformly to everything in
the board. This is what makes the audit trail complete: every entity traces back to the board.

---

## PART 7 — FEATURE CAPABILITY MATRIX

| Feature | API Endpoints | Frontend Page | Backend Service | DB Tables |
|---|---|---|---|---|
| **Boards** | `/v0/boards` (CRUD) | BoardsPage, BoardDetailPage | BoardService | boards |
| **Board Records** | `/v0/boards/{id}/records` | RecordsTab | BoardService | board_records |
| **Board Attachments** | `/v0/boards/{id}/attachments` | EvidencePanel | BoardService | board_attachments |
| **Intents** | `/v0/boards/{boardId}/intents` | IntentPanel | IntentService | intent_specs |
| **Cards** | `/v0/boards/{boardId}/cards` | CardList, CardDetail | CardService | cards, card_evidence |
| **Gates** | `/v0/boards/{id}/gates` | GatePanel | GateService | gates, gate_requirements, gate_approvals |
| **Tools** | `/v0/tools` (CRUD + versions) | ToolRegistryPage | RegistryService | tools, tool_versions |
| **Workflows** | `/v0/workflows` | WorkflowPage | WorkflowService | workflows, workflow_versions |
| **Plans** | `/v0/cards/{id}/plan` | PlanViewer | PlanGeneratorService | card_plans |
| **Artifacts** | `/v0/artifacts` | ArtifactPanel | ArtifactService | artifacts, artifact_lineage |
| **Runs** | `/v0/runs` | RunMonitor | RunService | runs, node_runs |
| **Agents** | `/v0/agents` (CRUD + versions) | AgentStudioPage | AgentService | agents, agent_versions |
| **Agent Sessions** | `/v0/agents/{id}/sessions` | AgentPlaygroundPage | SessionService | agent_sessions |
| **Agent Memory** | `/v0/agents/{id}/memory` | MemoryPage | MemoryService | agent_memories |
| **AI Assist** | `/v0/boards/{id}/assist/*` | BoardAssistPanel | BoardAssistService | — (LLM calls) |
| **Portfolio** | `/v0/portfolio/*` | PortfolioPage | PortfolioService | — (queries existing tables) |
| **Fork** | `/v0/boards/{id}/fork` | BoardDetailPage | BoardForkService | boards (forked) |
| **Replay** | `/v0/boards/{id}/replay` | BoardDetailPage | BoardReplayService | runs (new) |
| **Composition** | `/v0/boards/{id}/children` | CompositionPanel | BoardCompositionService | boards (parent_id) |

---

## PART 8 — NATS SUBJECT REFERENCE

| Subject | Publisher | Consumer | Payload | Purpose |
|---|---|---|---|---|
| `airaie.jobs.tool.execution` | Go control plane | Rust runner | Job payload | Dispatch tool execution |
| `airaie.jobs.agent.execution` | Go agent runtime | Rust runner | Job payload | Dispatch agent-initiated tool |
| `airaie.results.completed` | Rust runner | Go result consumer | Result payload | Report execution results |
| `airaie.events.{runId}` | Rust runner | Frontend via SSE | Progress event | Real-time UI updates |
| `airaie.events.audit` | All services | Audit log consumer | Audit event | Governance trail |

---

## PART 9 — ANTI-PATTERNS (WHAT TO AVOID)

```
1. AGENT CALLS TOOLS DIRECTLY
   Wrong: Agent imports tool library and calls functions
   Right: Agent dispatches via Job → NATS → Runner pipeline
   Why: Bypasses auditing, cost tracking, artifact management, policy enforcement

2. LLM GENERATES ARBITRARY CODE
   Wrong: Agent asks LLM to write Python and execute it
   Right: Agent selects from pre-registered tools with validated contracts
   Why: Arbitrary code execution is a security risk and unauditable

3. USING MANUAL EVIDENCE IN RELEASE MODE
   Wrong: User manually creates evidence records for release gates
   Right: Evidence is auto-collected from tool output metrics
   Why: Manual evidence can't be traced back to a specific run; auto-evidence has full provenance

4. COMPARING RESULTS ACROSS DIFFERENT INPUT VERSIONS
   Wrong: Card A uses images_v2, Card B uses images_v3 — then comparing their recalls
   Right: Lock the intent with one artifact version; all cards use the same pinned inputs
   Why: Different inputs make comparison meaningless

5. SKIPPING RECORDS
   Wrong: Running experiments without capturing hypotheses and decisions as records
   Right: Write records before and after each major experiment
   Why: Records are the only way new team members (and future you) understand why decisions were made

6. HARD-CODING TOOL VERSIONS IN AGENTS
   Wrong: AgentSpec lists tools without versions: "use fea-solver"
   Right: AgentSpec references specific versions: "fea-solver@2.1.0"
   Why: Without version lock, a tool upgrade can silently change agent behavior

7. USING EXPLORE MODE FOR COMPLIANCE WORK
   Wrong: Running validation for a regulatory submission in explore mode
   Right: Escalate to study or release mode before starting compliance runs
   Why: Explore mode does not generate gates, reproducibility packs, or approval trails
```

---

*Last updated: 2026-04-22*
*Coverage: Boards, Records, Intents, Cards, Tools, Workflows, Pipelines, Artifacts, Lineage,
Agents, Memory, Gates, AI Assist, Portfolio, Fork, Replay, Composition, Infrastructure*
