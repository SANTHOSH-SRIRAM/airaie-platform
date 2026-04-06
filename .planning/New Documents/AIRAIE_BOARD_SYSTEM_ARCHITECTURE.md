# AIRAIE BOARD SYSTEM — Complete Architecture & Implementation Guide

> How Boards work as the governance, context, and collaboration layer that ties everything together.
> Date: 2026-04-06

---

## 1. WHAT IS A BOARD?

### Definition

A **Board** in Airaie is a **governance workspace** that wraps workflows, agents, tools, and their outputs into a structured validation container with evidence tracking, approval gates, and release management.

```
A Board is NOT:
  - A folder for organizing files
  - A project management kanban board
  - A simple dashboard showing metrics
  - A file storage system

A Board IS:
  - A VALIDATION CASE — "Does this bracket design meet ISO 12345?"
  - A GOVERNANCE CONTAINER — gates, approvals, sign-offs, audit trails
  - A CONTEXT PROVIDER — shared data, goals, and constraints for workflows/agents
  - An EVIDENCE CHAIN — hypothesis → experiment → result → decision → release
  - A COLLABORATION SPACE — engineers, reviewers, and managers work together
  - A RELEASE VEHICLE — the path from "let's test this" to "ship to manufacturing"
```

### What Problem Does It Solve?

```
WITHOUT BOARDS:
  Engineer runs FEA workflow → gets stress results → saves file somewhere
  Runs CFD workflow → gets thermal results → saves another file
  Runs fatigue analysis → more files
  
  Problem 1: WHERE is all the evidence? Scattered across runs.
  Problem 2: WHO approved what? No audit trail.
  Problem 3: DID it pass? No structured pass/fail criteria.
  Problem 4: IS IT READY to ship? No governance checkpoint.
  Problem 5: WHAT was the hypothesis? No record of intent.

WITH BOARDS:
  Create "Structural Validation Study" board
  ├── Hypothesis: "Bracket meets ISO 12345 under 500N"
  ├── Run FEA workflow → results AUTO-ATTACHED to board
  ├── Run CFD workflow → results AUTO-ATTACHED
  ├── Gate: "Did FEA pass?" → auto-evaluated → YES
  ├── Gate: "Did lead engineer sign off?" → PENDING → engineer reviews → APPROVED
  ├── Decision record: "PASS — proceed to thermal validation"
  ├── All gates pass → escalate to Release mode
  └── Release Packet: locked artifacts + BOM + tolerances → manufacturing

  Now you have: traceable evidence, structured governance, clear pass/fail,
  audit trail, and a manufacturing-ready handoff package.
```

### Board vs Project vs Workspace

```
PROJECT:
  An organizational container for workflows, agents, tools.
  Purpose: access control and grouping (like a folder).
  Example: "Engineering Team A" project contains 10 workflows.
  A project does NOT validate anything.

WORKSPACE:
  The entire Airaie platform is the workspace.
  Contains all projects, tools, workflows, agents, boards.

BOARD:
  A VALIDATION CASE within a project.
  Purpose: prove that a specific design/product meets specific requirements.
  Example: "Structural Validation Study" board proves bracket meets ISO 12345.
  A board DOES validate — it tracks evidence and enforces governance.

HIERARCHY:
  Workspace (Airaie platform)
  └── Project ("Default Project")
      ├── Workflows (8)
      ├── Agents (3)
      ├── Tools (14)
      └── Boards (2)        ← Boards live INSIDE projects
          ├── "Structural Validation Study"
          └── "Thermal Analysis Board"
```

---

## 2. CORE CONCEPTS

### IntentSpec — The Bridge Between Intent and Execution

IntentSpec is the foundational concept that connects what the user wants (intent) to what the system does (execution). Every card has an IntentSpec. IntentSpec drives ToolShelf resolution, Pipeline selection, Plan generation, and Execution.

```
IntentSpec {
  id: uuid
  board_id: uuid
  card_id: uuid (optional — may be created before card assignment)
  intent_type: string          // hierarchical type, e.g. "sim.fea", "nde.srb_image_from_duplex"
  version: int                 // incremented on every edit; locked version is immutable
  goal: string                 // human-readable objective
  inputs: IntentInput[]        // what data the intent needs
  constraints: map             // domain rules, material, range, tolerance
  acceptance_criteria: AcceptanceCriterion[]   // how success is measured
  preferences: Preferences     // priority, max_time, max_cost
  governance: Governance        // risk_policy, approval requirements
  context: Context              // project, workspace, units
  status: "draft" | "locked" | "active" | "completed" | "failed"
  locked_at: timestamp          // once locked, version is immutable
}

IntentInput {
  name: string                  // e.g. "geometry", "material_properties"
  type: string                  // e.g. "artifact:step", "json:material", "scalar:float"
  artifact_ref: uuid (optional) // reference to an existing artifact
  description: string
}

AcceptanceCriterion {
  id: uuid
  metric: string                // e.g. "max_stress", "safety_factor", "cycle_count"
  operator: "lt" | "lte" | "gt" | "gte" | "eq" | "neq" | "in" | "between"
  threshold: any                // numeric value, list, or range
  unit: string                  // e.g. "MPa", "cycles", "mm"
  weight: float                 // relative importance (0.0–1.0), used in composite scoring
}

Preferences {
  priority: "accuracy" | "speed" | "cost"
  max_time: duration (optional)
  max_cost: float (optional)
}

Governance {
  risk_policy: string           // e.g. "standard", "high_risk", "critical"
  requires_approval: boolean
  approval_roles: string[]      // e.g. ["lead_engineer", "quality_manager"]
  release_target: string        // e.g. "manufacturing", "internal_review"
  compliance_standards: string[] // e.g. ["ISO 12345", "ASTM E466"]
}

Context {
  project_id: uuid
  workspace: string
  units_system: string          // "SI" | "imperial" | "custom"
}
```

```
HOW INTENTSPEC DRIVES EXECUTION:

  User defines WHAT they want:
    IntentSpec: "Validate bracket stress under 500N, max stress < 250 MPa"
    
  System determines HOW to do it:
    IntentSpec → ToolShelf (resolve matching tools)
              → Pipeline (compose tool chain)
              → ExecutionPlan (instantiate DAG with bindings)
              → Run (execute and collect evidence)
              → CardEvidence (evaluate acceptance criteria)

  The IntentSpec is the CONTRACT between user and system.
  It defines success criteria BEFORE execution begins.
  After execution, CardEvidence records prove whether criteria were met.
```

### IntentType Registry — Hierarchical Classification

```
INTENTTYPE REGISTRY:
  Intent types are hierarchical, organized by domain:

  sim/                              Simulation
    sim.fea                         Finite Element Analysis
    sim.cfd                         Computational Fluid Dynamics
    sim.thermal                     Thermal Analysis

  cad/                              Computer-Aided Design
    cad.geometry_check              Geometry Validation
    cad.dfm_analysis                Design for Manufacturing

  nde/                              Non-Destructive Evaluation
    nde.thickness_estimation        Wall Thickness Measurement
    nde.defect_detection            Defect Identification
    nde.srb_image_from_duplex       SRB Image Processing

  research/                         Research & Experimentation
    research.doe_study              Design of Experiments
    research.hypothesis_test        Hypothesis Testing

  ml/                               Machine Learning
    ml.training                     Model Training
    ml.inference                    Model Inference

  Each intent_type maps to:
    - A set of compatible Pipelines (ranked by trust_level)
    - A set of expected KPI metrics
    - Default acceptance criteria templates
    - Domain-specific constraints schema
```

---

## 3. BOARD STRUCTURE

### Board Status

```
BOARD STATUS (two values only):

  DRAFT     Board is being configured or actively used.
            Mode (explore/study/release) determines governance level.
            
  ARCHIVED  Board is completed and read-only.
            All data preserved permanently for audit/reference.

  Note: There is no "active" status. When a board is in DRAFT status,
  the board's MODE (explore/study/release) determines its active behavior.
  The mode is the governance level, not the status.
```

### What a Board Contains

```
+-----------------------------------------------------------------+
|                    BOARD: "Structural Validation Study"          |
|                    Status: DRAFT | Mode: Study                  |
|                    Readiness: 65%                                |
|                                                                  |
|  +---------------------------------------------+                |
|  |  VALIDATION CARDS (with IntentSpecs)         |                |
|  |  +-- FEA Stress Test [analysis] (Completed)  |                |
|  |  |   IntentSpec: sim.fea, max_stress < 250   |                |
|  |  +-- CFD Flow Analysis [analysis] (Running)  |                |
|  |  |   IntentSpec: sim.cfd, max_temp < 85      |                |
|  |  +-- Fatigue Analysis [analysis] (Completed) |                |
|  |  |   IntentSpec: sim.fea, cycles > 100000    |                |
|  |  +-- DFM Check [analysis] (Draft)            |                |
|  |      IntentSpec: cad.dfm_analysis            |                |
|  +---------------------------------------------+                |
|                                                                  |
|  +---------------------------------------------+                |
|  |  GATES                                       |                |
|  |  +-- Structural Evidence Gate (PASSED)       |                |
|  |  +-- Thermal Evidence Gate (PENDING)         |                |
|  |  +-- Fatigue Validation Gate (PASSED)        |                |
|  |  +-- Release Compliance Gate (PENDING)       |                |
|  +---------------------------------------------+                |
|                                                                  |
|  +---------------------------------------------+                |
|  |  CARD EVIDENCE (from runs)                   |                |
|  |  +-- max_stress: 187.3 MPa < 250 (PASS)     |                |
|  |  +-- safety_factor: 1.34 > 1.2 (PASS)       |                |
|  |  +-- cycle_count: 250K > 100K (PASS)         |                |
|  |  +-- max_temp: pending...                    |                |
|  +---------------------------------------------+                |
|                                                                  |
|  +---------------------------------------------+                |
|  |  EXECUTION PLANS                             |                |
|  |  +-- FEA Plan: mesh_gen -> fea_solver ->     |                |
|  |  |            postprocess -> evidence         |                |
|  |  +-- CFD Plan: preprocess -> cfd_engine ->   |                |
|  |  |            thermal_report -> evidence      |                |
|  +---------------------------------------------+                |
|                                                                  |
|  +---------------------------------------------+                |
|  |  ARTIFACTS                                    |                |
|  |  +-- stress_map_v2.vtk (8.2 MB, SHA:a1b2...) |                |
|  |  +-- mesh_output.stl (3.1 MB, SHA:b2c3...)   |                |
|  |  +-- fatigue_report.pdf (1.1 MB, SHA:c3d4...) |                |
|  +---------------------------------------------+                |
|                                                                  |
|  +---------------------------------------------+                |
|  |  RELEASE PACKET (locked when ready)          |                |
|  |  +-- Locked artifacts                         |                |
|  |  +-- Bill of Materials                        |                |
|  |  +-- Tolerance specifications                 |                |
|  |  +-- Proof bundle (gate evaluations)          |                |
|  |  +-- Sign-off records                         |                |
|  +---------------------------------------------+                |
|                                                                  |
+-----------------------------------------------------------------+
```

### Card Model

Cards are the primary work items on a board. Each card represents a specific validation activity and is driven by an IntentSpec.

```
Card {
  id: uuid
  board_id: uuid
  intent_spec_id: uuid           // every card has an IntentSpec

  card_type: "analysis"          // standard validation activity (FEA, CFD, etc.)
           | "comparison"        // compare two or more results
           | "sweep"             // parameter sweep / DOE
           | "agent"             // autonomous agent task
           | "gate"              // governance checkpoint card
           | "milestone"         // tracking milestone

  intent_type: string            // e.g. "sim.fea" — copied from IntentSpec for quick access

  agent_id: uuid (optional)      // for card_type = "agent"
  agent_version: string (optional)

  title: string
  description: string
  status: string                 // see state machine below
  ordinal: int                   // ordering within the board

  config: map                    // card-type-specific configuration
  kpis: CardKPI[]                // key performance indicators to track

  depends_on: card_id[]          // DAG dependencies — cards that must complete first

  execution_plan_id: uuid        // current execution plan
  run_ids: uuid[]                // history of all runs

  started_at: timestamp
  completed_at: timestamp
  created_at: timestamp
  updated_at: timestamp
}

CardKPI {
  metric_key: string             // e.g. "max_stress", "safety_factor"
  target_value: any              // threshold value
  unit: string                   // e.g. "MPa", "cycles"
  tolerance: float (optional)    // acceptable deviation from target
}
```

```
CARD STATUS STATE MACHINE:

  draft ---------> ready          Card configured, IntentSpec locked
  draft ---------> blocked        Dependency not met
  draft ---------> skipped        User or system skips

  ready ---------> queued         Plan generated, waiting for execution
  ready ---------> blocked        Dependency became unavailable
  ready ---------> skipped        User or system skips

  queued --------> running        Execution started
  queued --------> blocked        Resource unavailable
  queued --------> skipped        User or system skips

  running -------> completed      All acceptance criteria met
  running -------> failed         Execution error or criteria not met
  running -------> blocked        External dependency failed mid-run
  running -------> skipped        User aborts

  failed --------> ready          Retry (re-enter plan generation)
  failed --------> skipped        User decides not to retry

  completed -----> skipped        Override (rare, user decision)

  Note: "blocked" is a VALID stored state for cards (unlike gates).
  A card is blocked when its depends_on cards have not completed.
```

### CardEvidence Entity

CardEvidence records capture the measurable outcomes of each run, evaluated against the IntentSpec acceptance criteria. This is the structured proof chain.

```
CardEvidence {
  id: uuid
  card_id: uuid
  run_id: uuid                   // which run produced this evidence
  artifact_id: uuid (optional)   // source artifact containing the metric
  criterion_id: uuid             // which AcceptanceCriterion this evaluates

  metric_key: string             // e.g. "max_stress"
  metric_value: any              // e.g. 187.3
  metric_unit: string            // e.g. "MPa"

  threshold: any                 // from AcceptanceCriterion
  operator: string               // from AcceptanceCriterion

  evaluation: "pass"             // metric satisfies criterion
            | "fail"             // metric violates criterion
            | "warning"          // metric within tolerance but borderline
            | "info"             // informational, no pass/fail judgment

  passed: boolean                // convenience flag
  metadata: JSONB                // additional context (solver version, mesh details, etc.)
  version: int                   // evidence version (re-runs increment this)
}

EXAMPLE:
  CardEvidence {
    card_id: "card_fea_001"
    run_id: "run_abc123"
    criterion_id: "crit_max_stress"
    metric_key: "max_stress"
    metric_value: 187.3
    metric_unit: "MPa"
    threshold: 250
    operator: "lt"
    evaluation: "pass"
    passed: true
    metadata: { solver: "fea-solver@3.1", mesh_elements: 45000 }
    version: 1
  }
```

### ExecutionPlan

An ExecutionPlan is the concrete workflow DAG that the system generates from an IntentSpec + Pipeline. It defines exactly what tools run, in what order, with what parameters.

```
ExecutionPlan {
  id: uuid
  card_id: uuid                  // which card this plan serves
  pipeline_id: uuid              // which pipeline template was used

  nodes: PlanNode[]              // the tool execution nodes
  edges: PlanEdge[]              // dependencies between nodes
  bindings: map                  // IntentSpec inputs → node ports
  expected_outputs: string[]     // what artifacts/metrics this plan should produce

  cost_estimate: float           // estimated cost in credits
  time_estimate: duration        // estimated execution time

  status: "draft"                // plan created, not yet validated
        | "validated"            // plan checked, ready to execute
        | "executing"            // currently running
        | "completed"            // all nodes finished successfully
        | "failed"               // one or more nodes failed

  workflow_id: uuid              // the instantiated workflow
  run_id: uuid                   // the current or most recent run
}

PlanNode {
  node_id: uuid
  tool_id: uuid                  // which tool to execute
  tool_version: string           // pinned version
  role: "validate_input"         // check inputs before processing
      | "preprocess"             // data transformation / preparation
      | "solve"                  // core computation (FEA, CFD, etc.)
      | "postprocess"            // result extraction / formatting
      | "report"                 // generate human-readable output
      | "evidence"               // extract metrics for CardEvidence
      | "approval"               // governance checkpoint node
  parameters: map                // tool configuration for this node
  is_editable: boolean           // can user modify parameters before run?
  is_required: boolean           // skip-safe or mandatory?
  status: string                 // pending, running, completed, failed, skipped
}

PlanEdge {
  from_node_id: uuid
  to_node_id: uuid
}

EXAMPLE PLAN (for sim.fea intent):

  [validate_input] → [preprocess/mesh_gen] → [solve/fea_solver] → [postprocess/extract]
                                                                        ↓
                                                              [evidence/metrics] → [report/pdf]
                                                                        ↓
                                                              [approval/gate_check]

  Bindings:
    IntentSpec.inputs.geometry → validate_input.geometry_file
    IntentSpec.inputs.material → solve/fea_solver.material
    IntentSpec.constraints.load → solve/fea_solver.load_case
```

### Pipeline Model

Pipelines are reusable tool-chain templates associated with intent types. They define the canonical sequence of tools for a given analysis type.

```
Pipeline {
  id: uuid
  project_id: uuid (optional)   // null = global/builtin pipeline
  name: string                   // e.g. "Standard FEA Validation Pipeline"

  intent_type: string            // e.g. "sim.fea" — what intent this pipeline serves

  trust_level: "untested"        // newly created, no track record
             | "community"       // shared by users, some usage
             | "tested"          // has passing test suite
             | "verified"        // reviewed by domain expert
             | "certified"       // formally certified for production use

  is_builtin: boolean            // true = shipped with Airaie, immutable

  steps: PipelineStep[]
}

PipelineStep {
  id: uuid
  ordinal: int                   // execution order
  tool_id: uuid                  // which tool
  tool_version: string           // version constraint (e.g. ">=3.0")
  role: string                   // same roles as PlanNode
  config_template: map           // default parameters (can be overridden)
  depends_on: step_id[]          // step-level dependencies
}

EXAMPLE PIPELINE (sim.fea):
  Pipeline: "Standard FEA Validation Pipeline" (trust_level: certified, is_builtin: true)
  
  Step 1: mesh-generator@3.x  (role: preprocess)
  Step 2: fea-solver@3.x      (role: solve, depends_on: [step1])
  Step 3: result-extractor@1.x (role: postprocess, depends_on: [step2])
  Step 4: metric-evaluator@1.x (role: evidence, depends_on: [step3])
  Step 5: report-builder@2.x  (role: report, depends_on: [step3])
```

### Entity Relationships

```
DATABASE RELATIONSHIPS:

  boards
    +-- cards (1:N) — validation work items
    |   +-- intent_specs (1:1) — intent driving the card
    |   +-- card_evidence (1:N) — measured outcomes per run
    |   +-- execution_plans (1:N) — plan history
    |       +-- plan_nodes (1:N) — tool nodes in the DAG
    |       +-- plan_edges (1:N) — dependencies between nodes
    +-- gates (1:N) — governance checkpoints
    |   +-- gate_requirements (1:N) — requirements per gate
    |   +-- gate_approvals (1:N) — approval history
    +-- board_records (1:N) — evidence records (hypothesis, result, decision, note)
    +-- board_attachments (1:N) — artifacts attached as evidence
    +-- board -> parent_board (self-referencing for composition, max 3 levels)

  pipelines (project-scoped or global)
    +-- pipeline_steps (1:N) — ordered tool chain

  LINKING (boards <-> external entities):
    boards <-> pipelines: via cards -> execution_plans -> pipeline_id
    boards <-> agents: via cards (card_type="agent") -> agent_id
    boards <-> artifacts: via board_attachments + card_evidence (N:M)
    boards <-> runs: via cards -> run_ids (direct)
    boards <-> tools: via execution_plans -> plan_nodes -> tool_id (indirect)
    
  IntentSpec is the JOIN POINT:
    Card has IntentSpec -> IntentSpec drives Pipeline selection
    Pipeline instantiates -> ExecutionPlan
    ExecutionPlan produces -> Runs
    Runs produce -> CardEvidence (evaluated against IntentSpec criteria)
```

### Board Types

```
TYPE 1: ENGINEERING BOARD
  Purpose: Validate a physical product or component
  Use case: "Does this bracket meet structural requirements?"
  Contains: FEA, CFD, fatigue, DFM validation cards
  Gates: evidence-based + human sign-off
  End state: Release Packet for manufacturing

TYPE 2: RESEARCH BOARD
  Purpose: Investigate a scientific hypothesis
  Use case: "Does increasing wall thickness reduce thermal stress?"
  Contains: experiment cards, observation records, analysis results
  Gates: reproducibility checks, peer review
  End state: Published findings or validated hypothesis

BOTH TYPES share the same data model. The difference is:
  - Engineering: structured toward manufacturing release
  - Research: structured toward knowledge validation
  - UI adapts card types and KPIs based on board type
```

### Verticals (Domain Specialization)

```
VERTICALS define domain-specific card templates and KPIs:

  Structural:  FEA stress, safety factor, convergence
  Thermal:     Max temperature, flow rate, pressure drop
  Fatigue:     Cycle count, crack initiation, S-N curve
  DFM:         Wall thickness, draft angles, undercuts
  Materials:   Yield strength, density, elastic modulus
  ML/AI:       Accuracy, precision, training loss

Each vertical provides:
  - Pre-configured card templates with relevant KPIs
  - Domain-specific gate requirements
  - Appropriate evidence record types
  - Industry-standard tolerance templates
  - Default IntentSpec templates with acceptance criteria
```

---

## 4. TOOLSHELF — Tool Resolution & Pipeline Selection

### How ToolShelf Works

When a card needs execution, the ToolShelf resolves which tools and pipelines can fulfill the card's IntentSpec. This is an automated resolution process, not a manual selection.

```
TOOLSHELF RESOLUTION PROCESS:

  Input: IntentSpec (from card)
  Output: { recommended[], alternatives[], unavailable_with_reasons[] }

  STEP 1: FILTER
    - Tenant access: does the user/project have access to this tool?
    - Intent match: does the tool/pipeline support this intent_type?
    - Input compatibility: can the tool accept the IntentSpec's input types?
    - Governance: does the tool meet the IntentSpec's risk_policy?
    - Quota: does the tenant have remaining compute budget?

  STEP 2: COMPOSE PIPELINES
    - Find all registered Pipelines matching the intent_type
    - For each pipeline, verify all steps have available tools
    - Check tool version compatibility across pipeline steps
    - Build valid tool chains (may combine multiple pipelines)

  STEP 3: RANK
    Scoring factors (weighted):
    - trust_level: certified > verified > tested > community > untested
    - historical_success_rate: from tool_versions.success_rate
    - preference_match: how well does it match IntentSpec.preferences?
      (e.g., user prefers "speed" → fast solver ranked higher)
    - cost: estimated cost for this intent
    - time: estimated execution time

  STEP 4: EXPLAIN
    For each unavailable tool/pipeline, provide:
    - WHY it was filtered out (e.g., "no tenant access", "incompatible input")
    - SUGGEST actions to make it available (e.g., "request access", "convert input format")

  RESULT:
  {
    "recommended": [
      {
        "pipeline_id": "pipe_fea_certified",
        "name": "Standard FEA Validation Pipeline",
        "trust_level": "certified",
        "success_rate": 0.97,
        "cost_estimate": 4.50,
        "time_estimate": "12m"
      }
    ],
    "alternatives": [
      {
        "pipeline_id": "pipe_fea_fast",
        "name": "Quick FEA Pipeline (reduced mesh)",
        "trust_level": "tested",
        "success_rate": 0.91,
        "cost_estimate": 1.20,
        "time_estimate": "3m"
      }
    ],
    "unavailable_with_reasons": [
      {
        "pipeline_id": "pipe_fea_advanced",
        "name": "Advanced Nonlinear FEA Pipeline",
        "reason": "Requires tool 'nonlinear-solver@4.x' — no tenant access",
        "action": "Request access from project admin"
      }
    ]
  }
```

---

## 5. BOARD KERNEL — 8 Invariant Sections

Every card on a board, regardless of type, renders through the same 8 kernel sections. This is the universal card structure.

```
BOARD KERNEL SECTIONS:

  1. INTENT
     Goal + constraints + acceptance criteria
     Source: IntentSpec
     Shows: what the card is trying to prove, with measurable success criteria

  2. CONTEXT
     Project, workspace, policy, board mode
     Source: Board metadata + IntentSpec.context
     Shows: environmental context affecting execution

  3. INPUTS
     Artifact picker + compatibility check
     Source: IntentSpec.inputs + board artifacts
     Shows: what data feeds into this card, with type validation

  4. TOOLSHELF
     Resolved tools and pipelines, ranked
     Source: ToolShelf resolution against IntentSpec
     Shows: recommended, alternative, and unavailable pipelines with explanations

  5. PLAN
     Workflow DAG — previewable and editable
     Source: ExecutionPlan (generated from Pipeline + IntentSpec)
     Shows: node graph with tool versions, parameters, bindings
     User can: edit parameters on is_editable nodes before execution

  6. VALIDATION / GATES
     Preflight checks + approval requirements
     Source: Gates linked to card, IntentSpec.governance
     Shows: pre-run validation status, required approvals, compliance checks

  7. RUNS & OUTPUTS
     Execution history, KPIs, artifacts
     Source: Card.run_ids + CardEvidence + board_attachments
     Shows: run timeline, metric pass/fail dashboard, downloadable artifacts

  8. GOVERNANCE
     Board mode effects + gates + approvals + audit trail
     Source: Board mode, gate status, audit_events
     Shows: current governance level, approval queue, audit timeline
```

---

## 6. PLAN GENERATION — From IntentSpec to Execution

### 9-Step Plan Generation Process

When a card transitions from "ready" to "queued", the system generates an ExecutionPlan through these 9 steps.

```
PLAN GENERATION STEPS:

  1. VALIDATE CARD TYPE
     Check that card_type is compatible with the intent_type.
     e.g., card_type="analysis" + intent_type="sim.fea" → valid
     e.g., card_type="gate" + intent_type="sim.fea" → invalid

  2. LOAD INTENTSPEC
     Fetch the card's IntentSpec. Verify status is "locked".
     (IntentSpec must be locked before plan generation — no changes mid-execution.)

  3. AUTO-SELECT PIPELINE
     Query ToolShelf for the intent_type.
     Select the pipeline with highest trust_level from recommended[].
     User can override with an alternative pipeline.

  4. INSTANTIATE PIPELINE STEPS -> PlanNodes + PlanEdges
     For each PipelineStep, create a PlanNode:
       - Resolve tool_id to a specific tool version
       - Copy config_template as default parameters
       - Set role from PipelineStep
     Create PlanEdges from PipelineStep.depends_on relationships.

  5. BIND INTENTSPEC INPUTS -> NODE PORTS
     Map IntentSpec.inputs to PlanNode parameters:
       IntentSpec.inputs.geometry → preprocess_node.geometry_file
       IntentSpec.inputs.material → solve_node.material_id
     Store in ExecutionPlan.bindings.

  6. APPLY PARAMETER OVERRIDES
     If the user has edited parameters on is_editable nodes (via kernel section 5),
     apply those overrides to the PlanNode.parameters.

  7. INSERT VALIDATION NODES
     Add PlanNodes with role="validate_input" at the start of the DAG.
     These check input file formats, sizes, and compatibility before expensive
     compute runs. Fail-fast: if validation fails, no compute is wasted.

  8. INSERT EVIDENCE NODES
     Add PlanNodes with role="evidence" after solve/postprocess nodes.
     These extract metrics matching IntentSpec.acceptance_criteria
     and create CardEvidence records.

  9. INSERT GOVERNANCE NODES
     Based on IntentSpec.governance and board mode:
     - If requires_approval → add role="approval" node
     - If risk_policy="high_risk" and mode=study → add approval node
     - If mode=release → add approval node for medium_risk + side_effects

  OUTPUT: A fully instantiated ExecutionPlan with status="draft".
  The user can preview the plan in kernel section 5, edit parameters,
  then confirm to move status to "validated" and begin execution.
```

---

## 7. BOARD AS CONTEXT LAYER (THE CRITICAL CONCEPT)

### How Boards Provide Context

```
THE BIG IDEA:
  A board is not just a container — it's a CONTEXT LAYER that provides
  shared data, goals, and constraints to everything inside it.

  Without board context:
    Workflow runs in isolation. Agent has no history.
    Each run starts from scratch.

  With board context:
    Workflow knows WHY it's running (board goal + IntentSpec).
    Agent knows WHAT'S been tried before (board history + CardEvidence).
    Gates know WHAT to check (acceptance criteria from IntentSpec).
    Release knows WHAT to include (board artifacts with evidence chain).
```

### Context Components

```
BOARD CONTEXT consists of:

  1. GOAL CONTEXT (from IntentSpec)
     What are we trying to prove?
     "Validate that the Al6061 bracket meets ISO 12345 under 500N load"
     
     This goal is visible to:
     - Workflows: displayed in run metadata
     - Agents: included in LLM prompt as context
     - Gates: provides the validation standard reference
     - Users: displayed in board header

  2. SHARED DATA CONTEXT
     What data is common to all activities on this board?
     - Material: Al6061-T6
     - Geometry: bracket_v3.step (art_cad_001)
     - Load: 500N
     - Standard: ISO 12345
     - Threshold: 250 MPa
     
     Stored as board metadata (boards.meta_json).
     Also captured in IntentSpec.constraints and IntentSpec.inputs.
     Accessible by workflows and agents via board API.

  3. HISTORICAL CONTEXT (from CardEvidence)
     What has already happened on this board?
     - Previous runs and their results (CardEvidence records)
     - Gate evaluations (passed/failed/pending)
     - Evidence records (what's been observed)
     - Decisions made (what was concluded)
     
     This is critical for agents — they can see:
     "FEA already ran with density 0.8 and showed 187 MPa.
      CardEvidence: max_stress=187.3 PASS, safety_factor=1.34 PASS.
      CFD is still running. Fatigue passed."

  4. GOVERNANCE CONTEXT
     What rules apply to this board?
     - Current mode: Explore / Study / Release
     - Which gates exist and their status
     - Who needs to approve what (from IntentSpec.governance)
     - What evidence is required (from acceptance_criteria)
     
     This determines what actions are allowed:
     - Explore mode: everything is advisory, no gates enforced
     - Study mode: gates enforced, evidence required
     - Release mode: all gates must pass, artifacts locked

  5. ARTIFACT CONTEXT
     What files/results exist on this board?
     - stress_map_v2.vtk from FEA run
     - mesh_output.stl from mesh generation
     - fatigue_report.pdf from fatigue analysis
     
     Workflows can reference board artifacts as inputs.
     Agents can see what artifacts exist to inform decisions.
     ExecutionPlans bind IntentSpec inputs to available artifacts.
```

### How Workflows Access Board Context

```
MECHANISM 1: BOARD-LINKED RUNS (via ExecutionPlan)

  When a card's ExecutionPlan executes, the run is automatically
  linked to the board via the card:

  Card -> ExecutionPlan -> Run
  The run record stores: board_id, card_id, execution_plan_id

  After completion: Evidence collection auto-creates CardEvidence records

MECHANISM 2: BOARD DATA IN WORKFLOW EXPRESSIONS

  Workflow nodes can reference board data via expressions:
  
  {{ $board.meta.material }}           -> "Al6061-T6"
  {{ $board.meta.threshold }}          -> 250
  {{ $board.meta.standard }}           -> "ISO 12345"
  {{ $board.artifacts.geometry }}      -> "art_cad_001"
  {{ $board.mode }}                    -> "study"
  {{ $board.readiness }}               -> 0.65
  {{ $card.intent_spec.goal }}         -> "Validate bracket stress"
  {{ $card.intent_spec.constraints }}  -> { material: "Al6061-T6", load: 500 }

  These are resolved by the workflow scheduler at dispatch time.
  The scheduler queries the board API to get current board state.

MECHANISM 3: AUTO-EVIDENCE COLLECTION (10-step process)

  When a workflow run completes and is linked to a board:
  
  1. Run completes -> RunService emits event (NATS: airaie.results.completed)
  2. FireEvidenceCollection queues async handler
  3. Load all plan nodes with role = "evidence"
  4. For each tool output, extract metrics matching card KPIs
  5. Create CardEvidence records with evaluation (pass|fail|warning|info)
  6. Run TrustUpdater: update tool_versions.success_rate
  7. Check if any metric is borderline (within tolerance of threshold)
  8. If borderline -> auto-escalate approval gates
  9. Emit audit events for all evidence records
  10. Invalidate plan readiness cache

  This happens AUTOMATICALLY — no user action needed.
  The workflow doesn't explicitly "write to the board."
  The system does it based on the board <-> card <-> run link.
```

### How Agents Use Board Context

```
MECHANISM 1: BOARD CONTEXT IN AGENT PROMPT

  When an agent runs within a board-linked workflow:
  
  The agent's context includes board information:
  {
    "board": {
      "name": "Structural Validation Study",
      "goal": "Validate bracket meets ISO 12345",
      "mode": "study",
      "readiness": 0.65,
      "completed_cards": ["FEA Stress Test", "Fatigue Analysis"],
      "pending_cards": ["CFD Flow Analysis", "DFM Check"],
      "passed_gates": ["Structural Evidence", "Fatigue Validation"],
      "pending_gates": ["Thermal Evidence", "Release Compliance"],
      "recent_evidence": [
        { "card": "FEA", "metric": "max_stress", "value": 187.3, "eval": "pass" },
        { "card": "Fatigue", "metric": "cycle_count", "value": 250000, "eval": "pass" }
      ],
      "available_artifacts": ["art_cad_001", "art_mesh_002", "art_stress_003"]
    }
  }

  The agent's LLM sees this context and can reason:
  "FEA and fatigue already passed. CFD is the next needed analysis.
   I should focus on thermal validation to unblock the Thermal Evidence Gate."

MECHANISM 2: AGENT MEMORIES SCOPED TO BOARD

  Agent memories can be scoped to a specific board:
  
  agent_memories table:
    agent_id: "agent_fea_opt"
    board_id: "board_s7v2k9"    <- board-scoped memory
    content: "Al6061 bracket at 5mm thickness passed FEA with density 0.8"
  
  When the agent runs in the context of THIS board,
  board-scoped memories are prioritized in retrieval.

MECHANISM 3: AGENT CAN UPDATE BOARD

  After an agent makes a decision or produces results:
  
  1. Agent output artifacts -> attached to board automatically
  2. Agent can create evidence records:
     POST /v0/boards/{id}/records
     {
       "type": "note",
       "title": "Recommend finer mesh near stress concentrators",
       "content": "Based on FEA results, mesh density should be increased...",
       "created_by": "agent:fea-optimizer@2.0"
     }
  3. These notes appear in the board's Evidence Records panel
     with a purple brain icon indicating agent-generated content
```

---

## 8. BOARD MODE -> AGENT THRESHOLDS

### How Board Mode Controls Agent Behavior

Board mode auto-injects policy constraints into agent execution. These thresholds are ADDITIVE — the board mode can only tighten constraints, never loosen them.

```
MODE: EXPLORE
  confidence_threshold: 0.5
  Approval overrides: none
  Agent behavior: exploratory, can try multiple approaches
  Risk tolerance: high — agents can experiment freely
  
MODE: STUDY
  confidence_threshold: 0.75
  Approval overrides: requires_approval for high_risk actions
  Agent behavior: systematic, must document reasoning
  Risk tolerance: medium — agents need confidence before acting

MODE: RELEASE
  confidence_threshold: 0.90
  Approval overrides: requires_approval for medium_risk + side_effects
  Agent behavior: conservative, verify before every action
  Risk tolerance: low — agents must be highly confident

HOW IT WORKS:
  When an agent runs within a board context, the AgentRuntimeService
  injects board mode thresholds into the agent's policy:

  agent_policy = merge(
    agent.base_policy,           // agent's own confidence settings
    board_mode_overrides         // board mode thresholds (ADDITIVE)
  )

  ADDITIVE means:
    If agent.base_policy.confidence_threshold = 0.80
    And board mode = Explore (threshold = 0.50)
    Result: agent uses 0.80 (agent's own, already stricter)

    If agent.base_policy.confidence_threshold = 0.60
    And board mode = Release (threshold = 0.90)
    Result: agent uses 0.90 (board override, stricter)

  The board mode can ONLY tighten constraints, never loosen them.
  This ensures that Release mode is always the most conservative,
  regardless of how the agent is configured.
```

---

## 9. BOARD INPUTS

### What Data Can Be Added to a Board

```
INPUT TYPE 1: BOARD METADATA (key-value properties)
  Stored in: boards.meta_json
  
  {
    "material": "Al6061-T6",
    "geometry_type": "bracket",
    "dimensions": "160x80x5mm",
    "load_case": "500N axial",
    "standard": "ISO 12345",
    "threshold_stress_mpa": 250,
    "threshold_safety_factor": 1.2,
    "target_cycles": 100000,
    "environment": "ambient, 25C"
  }
  
  Set by: user during board creation or editing
  Used by: workflows (via expressions), agents (in context), gates (in requirements)
  Also used by: IntentSpec.constraints (structured version of these values)

INPUT TYPE 2: ARTIFACTS (files uploaded to the board)
  Stored in: MinIO (binary) + board_attachments (metadata)
  
  Examples:
  - CAD geometry file (bracket_v3.step)
  - Requirements document (ISO_12345_requirements.pdf)
  - Material data sheet (Al6061_properties.json)
  - Reference images or drawings
  
  Uploaded by: user via board UI
  Used by: IntentSpec.inputs (as artifact_ref), ExecutionPlan.bindings

INPUT TYPE 3: EVIDENCE RECORDS (structured observations)
  Stored in: board_records table
  
  Record types:
  - HYPOTHESIS: "Bracket meets ISO 12345 under 500N load"
  - RESULT: "FEA shows max stress 187 MPa"
  - DECISION: "PASS — proceed to thermal"
  - NOTE: "Consider mesh refinement near holes"
  - PROTOCOL_STEP: "Step 3: Apply boundary conditions"
  - CLAIM: "Design is optimized for weight"
  
  Created by: users (manual) or agents/workflows (automatic)

INPUT TYPE 4: VALIDATION CARDS (work items with IntentSpecs)
  Stored in: cards + intent_specs tables
  
  Each card represents a specific validation activity:
  {
    "title": "FEA Stress Test",
    "card_type": "analysis",
    "intent_type": "sim.fea",
    "intent_spec": {
      "goal": "Validate structural stress under 500N axial load",
      "inputs": [
        { "name": "geometry", "type": "artifact:step", "artifact_ref": "art_cad_001" },
        { "name": "material", "type": "json:material" }
      ],
      "constraints": { "load": 500, "unit": "N", "direction": "axial" },
      "acceptance_criteria": [
        { "metric": "max_stress", "operator": "lt", "threshold": 250, "unit": "MPa", "weight": 0.5 },
        { "metric": "safety_factor", "operator": "gt", "threshold": 1.2, "unit": "", "weight": 0.3 },
        { "metric": "convergence", "operator": "lt", "threshold": 50, "unit": "iterations", "weight": 0.2 }
      ]
    },
    "kpis": [
      { "metric_key": "max_stress", "target_value": 250, "unit": "MPa" },
      { "metric_key": "safety_factor", "target_value": 1.2, "unit": "" }
    ],
    "status": "completed"
  }

INPUT TYPE 5: GATE DEFINITIONS (governance checkpoints)
  Stored in: gates + gate_requirements tables
  
  {
    "name": "Structural Evidence Gate",
    "type": "evidence",
    "requirements": [
      { "type": "run_succeeded", "config": { "run_ref": "FEA card run" } },
      { "type": "artifact_exists", "config": { "artifact_name": "stress_map" } },
      { "type": "threshold_met", "config": { "metric": "max_stress", "operator": "<", "value": 250 } }
    ],
    "auto_evaluate": true,
    "waivable": true,
    "timeout_hours": 24
  }
```

### How Data Is Stored and Accessed

```
STORAGE ARCHITECTURE:

  +--------------------------------------+
  |  PostgreSQL (structured data)         |
  |                                       |
  |  boards: id, name, type, mode, meta  |
  |  intent_specs: id, board_id, card_id, |
  |       intent_type, version, goal,     |
  |       inputs, constraints, criteria,  |
  |       preferences, governance, status |
  |  cards: id, board_id, intent_spec_id, |
  |       card_type, status, ordinal,     |
  |       kpis, depends_on, config        |
  |  card_evidence: id, card_id, run_id,  |
  |       metric_key, metric_value,       |
  |       evaluation, passed, version     |
  |  execution_plans: id, card_id,        |
  |       pipeline_id, nodes, edges,      |
  |       bindings, status                |
  |  pipelines: id, intent_type,          |
  |       trust_level, is_builtin, steps  |
  |  board_records: id, board_id, type,   |
  |                 title, content_json    |
  |  board_attachments: id, board_id,     |
  |                     artifact_id        |
  |  gates: id, board_id, name, type,     |
  |         status                         |
  |  gate_requirements: id, gate_id,      |
  |         req_type, config, satisfied    |
  +--------------------------------------+
  
  +--------------------------------------+
  |  MinIO/S3 (binary files)              |
  |                                       |
  |  Artifacts: CAD files, results,       |
  |  reports, images, data files          |
  |  Referenced by: board_attachments,    |
  |  card_evidence, intent_spec inputs    |
  |  Accessed via: presigned URLs          |
  +--------------------------------------+

ACCESS PATTERNS:

  READ board data:
    GET /v0/boards/{id}                    -> board metadata + mode + readiness
    GET /v0/boards/{id}/cards              -> cards with IntentSpecs
    GET /v0/boards/{id}/cards/{cid}/evidence -> CardEvidence for a card
    GET /v0/boards/{id}/records            -> evidence records
    GET /v0/boards/{id}/attachments        -> linked artifacts
    GET /v0/boards/{id}/children           -> child boards (composition)
  
  WRITE board data:
    POST /v0/boards/{id}/records           -> add evidence record
    POST /v0/boards/{id}/attachments       -> attach artifact
    PATCH /v0/boards/{id}                  -> update metadata
    POST /v0/boards/{id}/escalate-mode     -> change governance mode
    POST /v0/cards/{id}/lock-intent        -> lock IntentSpec for execution
    POST /v0/cards/{id}/generate-plan      -> trigger plan generation
```

---

## 10. BOARD OUTPUTS (ARTIFACTS)

### What Outputs Are Stored

```
OUTPUT TYPE 1: TOOL EXECUTION ARTIFACTS
  Created by: tools running within ExecutionPlan nodes
  Examples:
    - stress_map_v2.vtk (FEA solver output)
    - mesh_output.stl (mesh generator output)
    - flow_field.vtk (CFD engine output)
  
  How they arrive:
    ExecutionPlan runs -> tool nodes produce artifacts ->
    Evidence collection creates CardEvidence + board_attachments

OUTPUT TYPE 2: CARD EVIDENCE RECORDS
  Created by: evidence nodes in ExecutionPlan (role="evidence")
  Examples:
    - CardEvidence: max_stress=187.3, eval=pass
    - CardEvidence: safety_factor=1.34, eval=pass
    - CardEvidence: convergence=8, eval=pass

OUTPUT TYPE 3: ANALYSIS REPORTS
  Created by: report nodes in ExecutionPlan (role="report")
  Examples:
    - fatigue_report.pdf (fatigue analysis summary)
    - validation_report.pdf (comprehensive validation document)
    - stress_contour.png (visualization image)

OUTPUT TYPE 4: AGENT DECISIONS
  Created by: agents during execution
  Examples:
    - optimization_recommendations.json (agent suggestions)
    - decision_trace.json (agent reasoning log)

OUTPUT TYPE 5: GATE EVALUATION RECORDS
  Created by: gate evaluation process
  Examples:
    - gate_proof_structural.json (proof that gate requirements were met)
    - approval_record.json (who approved, when, with what comment)

OUTPUT TYPE 6: RELEASE PACKET
  Created by: release packet builder (when all gates pass)
  Contents:
    - Locked artifact snapshots (frozen copies)
    - Bill of Materials (BOM)
    - Tolerance specifications
    - Proof bundle (all gate evaluations + CardEvidence summary)
    - Sign-off records (digital signatures)
    - Audit trail export
```

### How Outputs Are Organized

```
ORGANIZATION 1: BY CARD (validation activity + evidence)
  Each card groups related outputs:
  
  FEA Stress Test card:
    +-- IntentSpec: sim.fea, goal="Validate stress under 500N"
    +-- ExecutionPlan: mesh_gen -> fea_solver -> extract -> evidence
    +-- Run: run_abc123
    +-- CardEvidence:
    |   +-- max_stress: 187.3 MPa, threshold < 250, PASS
    |   +-- safety_factor: 1.34, threshold > 1.2, PASS
    |   +-- convergence: 8 iterations, threshold < 50, PASS
    +-- Artifacts:
        +-- stress_map_v2.vtk (primary result)
        +-- mesh_output.stl (intermediate)
        +-- analysis_metrics.json (raw metrics)

ORGANIZATION 2: BY TIMELINE (chronological)
  All board activities in time order:
  Mar 28: Board created
  Mar 28: Hypothesis added: "Bracket meets ISO 12345"
  Mar 28: FEA card created with IntentSpec (sim.fea)
  Mar 30: FEA IntentSpec locked, plan generated
  Mar 30: FEA run completed -> CardEvidence: 3 pass, 0 fail
  Mar 30: Structural Evidence Gate auto-passed
  Mar 30: Decision: "PASS — proceed to thermal"
  Mar 31: CFD run started
  Mar 31: Fatigue run completed -> CardEvidence: pass
  Apr 01: Thermal Evidence Gate — engineer approved

ORGANIZATION 3: BY EVIDENCE CHAIN (logical flow)
  IntentSpec -> Experiment -> Evidence -> Decision:
  
  INTENT: "Bracket meets ISO 12345 under 500N" (IntentSpec)
    +-- EXPERIMENT: FEA Stress Test (run_abc123)
        +-- EVIDENCE: CardEvidence { max_stress: 187.3 < 250, PASS }
        +-- EVIDENCE: CardEvidence { safety_factor: 1.34 > 1.2, PASS }
            +-- DECISION: "PASS — structural criteria met"
  
  INTENT: "Design has adequate fatigue life" (IntentSpec)
    +-- EXPERIMENT: Fatigue Analysis (run_ghi789)
        +-- EVIDENCE: CardEvidence { cycle_count: 250000 > 100000, PASS }
            +-- DECISION: "PASS — fatigue criteria met"

ORGANIZATION 4: BY ARTIFACT LINEAGE (data flow)
  Input -> Processing -> Output chain:
  
  bracket_v3.step (uploaded by user, referenced in IntentSpec.inputs)
    -> mesh_output.stl (produced by preprocess/mesh_gen PlanNode)
      -> stress_map_v2.vtk (produced by solve/fea_solver PlanNode)
        -> stress_contour.png (produced by postprocess PlanNode)
          -> validation_report.pdf (produced by report PlanNode)
```

---

## 11. GATES

### Gate Types

```
GATE TYPES (3 types):

  "evidence"     Automatically evaluated based on CardEvidence metrics.
                 Passes when all linked acceptance criteria are met.
                 Example: "All FEA metrics pass thresholds"

  "review"       Requires human review and sign-off.
                 A qualified reviewer must inspect evidence and approve.
                 Example: "Lead engineer reviews CFD results"

  "compliance"   Checks regulatory/standard compliance.
                 May combine auto-evaluation with mandatory sign-off.
                 Example: "ISO 12345 compliance verified by quality manager"
```

### Gate Status

```
GATE STATUS (5 values — no BLOCKED):

  PENDING       Gate not yet evaluated. Requirements incomplete.
  EVALUATING    Gate currently being evaluated (auto or manual in progress).
  PASSED        All requirements satisfied.
  FAILED        One or more requirements not met.
  WAIVED        Gate bypassed with documented justification.

  Note: BLOCKED is NOT a stored gate status. A gate that cannot be evaluated
  because its dependencies haven't completed is PENDING. The "blocked" state
  is a COMPUTED property derived from checking if prerequisite cards/gates
  have completed. The UI may display a gate as "blocked" but the stored
  status remains PENDING.
```

---

## 12. BOARD -> WORKFLOW INTERACTION

### How Workflows Get Attached to a Board

```
ATTACHMENT METHOD 1: VIA CARD CREATION
  When a card is created with an IntentSpec, plan generation
  automatically selects a Pipeline and creates an ExecutionPlan.
  The ExecutionPlan references specific tools and workflows.

ATTACHMENT METHOD 2: DURING BOARD CREATION
  User creates board and selects workflows to link:
  
  POST /v0/boards
  {
    "name": "Structural Validation Study",
    "type": "engineering",
    "vertical": "structural",
    "linked_workflows": ["wf_fea_val_001", "wf_cfd_flow_002"]
  }

ATTACHMENT METHOD 3: AFTER BOARD CREATION
  User links an existing workflow to an existing board:
  
  POST /v0/boards/{board_id}/link
  {
    "resource_type": "workflow",
    "resource_id": "wf_fea_val_001"
  }

WHAT THE LINK MEANS:
  - The workflow is REFERENCED by the board (not copied)
  - Multiple boards can link to the same workflow
  - The workflow continues to exist independently
  - Runs of that workflow CAN be associated with the board (but don't have to be)
  - The link enables: context sharing, evidence collection, gate evaluation
```

### Does Workflow Run Within Board Context?

```
YES — when a run is board-linked (via card ExecutionPlan or explicit board_id):

  POST /v0/runs
  {
    "workflow_id": "wf_fea_val_001",
    "board_id": "board_s7v2k9",      <- this makes it board-context
    "card_id": "card_fea_001",        <- links to specific card
    "execution_plan_id": "plan_001",  <- links to specific plan
    "inputs": { ... }
  }

WHAT BOARD CONTEXT PROVIDES TO THE RUN:

  1. Board metadata available in expressions:
     {{ $board.meta.material }} -> "Al6061-T6"
     {{ $board.meta.threshold }} -> 250
  
  2. IntentSpec data available:
     {{ $card.intent_spec.goal }} -> "Validate bracket stress"
     {{ $card.intent_spec.constraints.load }} -> 500
  
  3. Board artifacts available as inputs:
     {{ $board.artifacts.geometry }} -> "art_cad_001"
  
  4. Auto-evidence collection enabled:
     When run completes -> CardEvidence records auto-created
  
  5. Gate triggers:
     When run completes -> relevant gates re-evaluated

WITHOUT board_id:
  The workflow runs in standalone mode.
  No board context, no auto-evidence, no gate triggers.
  The run still works — it just isn't connected to governance.
```

### Can Workflows Read/Write Board Data?

```
READ: YES — via expressions and API
  Workflow nodes can reference board data:
  {{ $board.meta.material }}
  {{ $board.artifacts.geometry }}
  {{ $board.records[0].content }}
  {{ $board.gates.structural_evidence.status }}

  These are resolved by the scheduler at node dispatch time.
  The scheduler calls: GET /v0/boards/{board_id} internally.

WRITE: INDIRECTLY — via auto-evidence collection
  Workflows don't directly write to boards.
  Instead, the evidence collection process watches for run completions
  and automatically creates CardEvidence records and board attachments.

  The workflow PRODUCES outputs.
  The SYSTEM evaluates them against IntentSpec criteria.
  This separation keeps workflows clean and reusable.

  Exception: Agent nodes CAN directly create board records
  via the board API (POST /v0/boards/{id}/records).
  This is for agents to add notes, recommendations, etc.
```

---

## 13. BOARD -> AGENT INTERACTION

### How Agents Use Board Data

```
SCENARIO: Agent runs within a board-linked workflow (card_type="agent")

CONTEXT INJECTION:
  The AgentRuntimeService detects that the run has a board_id.
  It queries the board API to get current board state.
  Board mode thresholds are injected into agent policy.
  This state is included in the agent's context:

  {
    "board_context": {
      "board_name": "Structural Validation Study",
      "board_goal": "Validate bracket meets ISO 12345",
      "board_mode": "study",
      "board_readiness": 0.65,
      "confidence_threshold": 0.75,     // from board mode (study)
      
      "completed_validations": [
        { "card": "FEA Stress Test", "result": "PASS",
          "evidence": [
            { "metric": "max_stress", "value": 187.3, "eval": "pass" },
            { "metric": "safety_factor", "value": 1.34, "eval": "pass" }
          ]
        },
        { "card": "Fatigue Analysis", "result": "PASS",
          "evidence": [
            { "metric": "cycle_count", "value": 250000, "eval": "pass" }
          ]
        }
      ],
      
      "pending_validations": [
        { "card": "CFD Flow Analysis", "status": "running",
          "intent_type": "sim.cfd" },
        { "card": "DFM Check", "status": "draft",
          "intent_type": "cad.dfm_analysis", "depends_on": "CFD" }
      ],
      
      "gate_status": {
        "structural_evidence": "PASSED",
        "thermal_evidence": "PENDING (1/3 requirements)",
        "fatigue_validation": "PASSED",
        "release_compliance": "PENDING"
      },
      
      "board_artifacts": [
        { "name": "bracket_v3.step", "id": "art_cad_001", "type": "input" },
        { "name": "stress_map.vtk", "id": "art_stress_003", "type": "result" }
      ],
      
      "recent_decisions": [
        "Mar 30: PASS — structural criteria met",
        "Mar 30: PASS — fatigue criteria met"
      ]
    }
  }

HOW THE AGENT USES THIS:
  LLM receives board context and can reason:
  
  "I can see that FEA and fatigue validation already passed.
   CFD is currently running — I should wait for those results
   before making any thermal-related decisions.
   The DFM check depends on CFD completion.
   My confidence threshold is 0.75 (study mode).
   My focus should be on ensuring the CFD analysis is set up correctly
   for the thermal evidence gate requirements."
```

### Can Agents Update the Board?

```
YES — agents can create evidence records and add notes:

AUTOMATIC (via standard execution):
  Agent tool calls produce artifacts -> auto-attached to board
  Same mechanism as workflow auto-evidence collection

EXPLICIT (via API call during agent execution):
  The agent runtime can call board APIs:
  
  POST /v0/boards/{board_id}/records
  {
    "type": "note",
    "title": "Mesh refinement recommendation",
    "content": "Based on FEA results showing stress concentration near
                mounting holes, recommend mesh density 0.6 (from 0.8)
                in those regions for production-grade analysis.",
    "created_by": "agent:fea-optimizer@2.0",
    "confidence": 0.88,
    "linked_run": "run_xyz789"
  }

  This creates a board record with:
  - Type: NOTE
  - Purple brain icon (agent-generated indicator)
  - Confidence score
  - Link to the agent run that produced it

AGENTS CANNOT:
  - Change board mode (only users/admins can escalate)
  - Approve gates (agents can inform, humans decide)
  - Delete records (append-only for audit trail)
  - Modify board metadata (only users can edit)
  - Lock or unlock artifacts (only release process does this)
```

---

## 14. BOARD AS COLLABORATION LAYER

### Multi-User Collaboration

```
WHO INTERACTS WITH A BOARD:

  ROLE 1: BOARD OWNER (creator)
    Can: create/edit/delete board, manage all settings
    Can: escalate mode, configure gates, edit metadata
    Can: build release packet
    Typically: the lead engineer running the validation

  ROLE 2: CONTRIBUTOR (team member)
    Can: add evidence records, attach artifacts
    Can: run linked workflows, trigger tool executions
    Can: create cards, define IntentSpecs, generate plans
    Can: view all board data
    Cannot: change mode, delete board, modify gates
    Typically: engineers running specific analyses

  ROLE 3: REVIEWER (approver)
    Can: approve/reject/waive gates that require their role
    Can: add comments to approval records
    Can: view all board data, CardEvidence, and artifacts
    Cannot: run workflows, modify board structure
    Typically: lead engineer, quality manager, project lead

  ROLE 4: VIEWER (observer)
    Can: view all board data (read-only)
    Cannot: modify anything
    Typically: management, regulatory observers

PERMISSIONS MODEL:
  Inherited from project RBAC:
  - Project Admin -> Board Owner
  - Project Editor -> Board Contributor
  - Project Viewer -> Board Viewer
  - Gate-specific roles -> Board Reviewer (for specific gates)
```

### Activity Tracking

```
EVERY ACTION ON A BOARD IS TRACKED:

  audit_events table:
  {
    "event_id": "evt_001",
    "board_id": "board_s7v2k9",
    "event_type": "gate.approved",
    "actor": "user:santhosh",
    "timestamp": "2026-03-31T14:20:00Z",
    "details": {
      "gate": "Thermal Evidence Gate",
      "requirement": "role_signed (lead_engineer)",
      "comment": "CFD results confirm thermal compliance"
    }
  }

TRACKED EVENTS:
  - board.created, board.updated, board.mode_escalated
  - record.created (hypothesis, result, decision, note)
  - attachment.added, attachment.removed
  - card.created, card.updated, card.status_changed
  - intent_spec.created, intent_spec.locked, intent_spec.updated
  - execution_plan.generated, execution_plan.validated, execution_plan.completed
  - card_evidence.created (metric evaluation recorded)
  - gate.created, gate.evaluated, gate.approved, gate.rejected, gate.waived
  - run.linked (workflow run associated with board)
  - artifact.auto_attached (evidence collector attached output)
  - release_packet.created, release_packet.exported
  - member.added, member.role_changed

ACTIVITY FEED:
  The board detail page shows a timeline of all events.
  Users can filter by type, actor, and date range.
  This provides a complete audit trail for compliance.
```

---

## 15. BOARD STATE & HISTORY

### What Is Tracked

```
STATE 1: BOARD STATUS + MODE
  Status: DRAFT | ARCHIVED
  Mode (when DRAFT): Explore, Study, or Release
  
  Explore -> Study -> Release (one-way escalation, never goes back)
  
  Explore: free experimentation, gates advisory
  Study: gates enforced, evidence required for progression
  Release: all gates must pass, artifacts locked, release packet created

STATE 2: READINESS PERCENTAGE (weighted 5-category formula)
  
  Readiness is NOT simply "passed gates / total gates".
  It uses a weighted 5-category formula:

  CATEGORY WEIGHTS:
    design:        0.30    (structural/functional validation)
    validation:    0.30    (test evidence completeness)
    compliance:    0.15    (regulatory/standard compliance)
    manufacturing: 0.10    (DFM/producibility checks)
    approvals:     0.15    (human sign-offs obtained)

  CALCULATION:
    Score = SUM(category_weight * category_pass_rate)

  WHERE category_pass_rate = passed_items / total_items in that category

  EXAMPLE:
    design:        3/4 cards passed   = 0.75   * 0.30 = 0.225
    validation:    2/3 evidence gates = 0.67   * 0.30 = 0.200
    compliance:    1/1 compliance gate = 1.00  * 0.15 = 0.150
    manufacturing: 0/1 DFM card       = 0.00   * 0.10 = 0.000
    approvals:     1/2 sign-offs      = 0.50   * 0.15 = 0.075
    
    TOTAL READINESS = 0.225 + 0.200 + 0.150 + 0.000 + 0.075 = 0.650 (65%)

  This is a COMPUTED value, recalculated on query.
  The evidence collection process invalidates the readiness cache (step 10).

STATE 3: CARD STATUS
  Each card: draft -> ready -> queued -> running -> completed / failed
  Tracks: IntentSpec, ExecutionPlan, CardEvidence, KPI pass/fail, linked runs

STATE 4: GATE STATUS
  Each gate: PENDING -> EVALUATING -> PASSED / FAILED / WAIVED
  (No BLOCKED status — blocked is computed from dependencies)
  Each requirement within a gate: satisfied (true/false)
  Approval records: who approved, when, with what comment

STATE 5: EVIDENCE CHAIN
  All CardEvidence records + board_records in chronological order
  Immutable: records can be added but not deleted (audit trail)
  Each CardEvidence links to: card, run, criterion, artifact

STATE 6: ARTIFACT INVENTORY
  All artifacts attached to the board
  Each with: SHA-256 hash, size, type, source run, timestamp
  Cross-referenced with: IntentSpec inputs, CardEvidence, PlanNode outputs
```

### Can Users Go Back in Time?

```
AUDIT TRAIL: YES — you can SEE what happened at any point
  The audit_events table provides a complete chronological record.
  Users can browse the timeline and see every event.
  
  GET /v0/boards/{id}/audit?from=2026-03-28&to=2026-03-31
  Returns: all events in that date range

UNDO/ROLLBACK: NO — boards are append-only
  You cannot undo a gate approval.
  You cannot delete an evidence record.
  You cannot un-attach an artifact.
  You cannot delete a CardEvidence record.
  
  This is BY DESIGN for compliance:
  - Regulatory bodies require immutable audit trails
  - If something was wrong, you add a CORRECTION record
  - You never erase history

WAIVE: YES — you can bypass a gate
  If a gate requirement can't be met, you can WAIVE it.
  A waiver creates an audit record explaining why.
  The gate shows as WAIVED (not PASSED or FAILED).
  This is transparent — the waiver is visible in the audit trail.

RE-EVALUATE: YES — you can re-check gates
  POST /v0/gates/{id}/evaluate
  This re-runs all requirement checks against current CardEvidence.
  If new runs have completed, the gate may now pass.
  The previous evaluation is preserved in history.
```

---

## 16. BOARD LIFECYCLE

### Full Lifecycle

```
+-----------------------------------------------------------------+
|                    BOARD LIFECYCLE                                |
|                                                                  |
|  +----------+                                                   |
|  | CREATED   | User creates board (name, type, vertical)        |
|  |           | Status: DRAFT                                     |
|  |           | Mode: Explore (default)                           |
|  +----+------+                                                   |
|       |                                                          |
|  +----v------+                                                   |
|  | SETUP     | User configures:                                 |
|  |           | - Creates cards with IntentSpecs                 |
|  |           | - Defines acceptance criteria                    |
|  |           | - Defines gates with requirements                |
|  |           | - Uploads initial artifacts (CAD files, specs)   |
|  |           | - Sets board metadata (material, loads, etc.)    |
|  |           | - Adds initial hypothesis records                |
|  +----+------+                                                   |
|       |                                                          |
|  +----v----------------------------------------------+          |
|  | EXPLORE MODE (active usage — phase 1)              |          |
|  |                                                     |          |
|  | Gates: ADVISORY (shown but not enforced)            |          |
|  | Agent threshold: 0.5 (exploratory)                  |          |
|  | User runs workflows freely                          |          |
|  | IntentSpecs can be edited (draft status)            |          |
|  | Results collected as CardEvidence                   |          |
|  | User can experiment without governance friction     |          |
|  | Purpose: initial exploration and iteration          |          |
|  |                                                     |          |
|  | Exit: User clicks "Escalate to Study"               |          |
|  |       (requires at least 1 card and 1 gate)         |          |
|  +----+----------------------------------------------+          |
|       |                                                          |
|  +----v----------------------------------------------+          |
|  | STUDY MODE (active usage — phase 2)                |          |
|  |                                                     |          |
|  | Gates: ENFORCED (must pass to progress)             |          |
|  | Agent threshold: 0.75 (systematic)                  |          |
|  | IntentSpecs LOCKED before execution                 |          |
|  | Evidence records REQUIRED for decisions             |          |
|  | Auto-evaluation enabled for evidence gates          |          |
|  | Human approvals required for review gates           |          |
|  | Purpose: rigorous validation with governance        |          |
|  |                                                     |          |
|  | Activities:                                         |          |
|  | - Lock IntentSpecs -> generate ExecutionPlans       |          |
|  | - Execute plans -> collect CardEvidence             |          |
|  | - Evaluate gates (auto + manual)                    |          |
|  | - Record decisions (pass/fail/note)                 |          |
|  | - Get approvals from reviewers                      |          |
|  |                                                     |          |
|  | Exit: User clicks "Escalate to Release"             |          |
|  |       (requires ALL gates passed)                   |          |
|  +----+----------------------------------------------+          |
|       |                                                          |
|  +----v----------------------------------------------+          |
|  | RELEASE MODE (finalization — phase 3)              |          |
|  |                                                     |          |
|  | Agent threshold: 0.90 (conservative)                |          |
|  | All gates: PASSED                                   |          |
|  | Artifacts: can be LOCKED (frozen snapshots)         |          |
|  | Release packet: can now be BUILT                    |          |
|  | No new validation runs (board is finalized)         |          |
|  | Purpose: assemble manufacturing handoff             |          |
|  |                                                     |          |
|  | Activities:                                         |          |
|  | - Lock artifacts (create immutable snapshots)       |          |
|  | - Generate BOM                                      |          |
|  | - Attach tolerance specifications                   |          |
|  | - Compile proof bundle (gates + CardEvidence)       |          |
|  | - Collect sign-off records                          |          |
|  | - Export release packet                             |          |
|  |                                                     |          |
|  | Exit: Release packet exported                       |          |
|  +----+----------------------------------------------+          |
|       |                                                          |
|  +----v------+                                                   |
|  | ARCHIVED   | Board status changes DRAFT -> ARCHIVED          |
|  |            | All data preserved (immutable)                  |
|  |            | Read-only access for audit/reference            |
|  |            | Release packet available for download           |
|  +------------+                                                  |
|                                                                  |
|  MODE ESCALATION RULES:                                         |
|  - Explore -> Study: requires >= 1 card and >= 1 gate defined  |
|  - Study -> Release: requires ALL gates status = PASSED         |
|  - NEVER goes backward (Study -> Explore is NOT allowed)        |
|  - Each escalation is logged in the audit trail                  |
|                                                                  |
+-----------------------------------------------------------------+
```

### Board Composition (Parent-Child)

```
BOARDS CAN HAVE CHILD BOARDS (max 3 levels deep):

  Board: "Product Validation" (parent — level 1)
  +-- Child Board: "Structural Analysis" (level 2)
  |   +-- Card: FEA Stress Test (IntentSpec: sim.fea)
  |   +-- Card: Fatigue Analysis (IntentSpec: sim.fea)
  |   +-- Gate: Structural Evidence
  +-- Child Board: "Thermal Analysis" (level 2)
  |   +-- Card: CFD Flow Study (IntentSpec: sim.cfd)
  |   +-- Card: Heat Transfer (IntentSpec: sim.thermal)
  |   +-- Gate: Thermal Evidence
  +-- Gate: Overall Validation (requires ALL child board gates)

  COMPOSITION DEPTH: Maximum 3 levels
    Level 1: Product board (aggregates domain boards)
    Level 2: Domain board (aggregates analysis cards)
    Level 3: Sub-domain board (specialized analyses)
    
  Deeper nesting is NOT allowed. If you need more granularity,
  use cards with depends_on within a single board.

  The parent board's "Overall Validation" gate has:
  requirement: "all_child_boards_passed"
  This gate only passes when ALL child boards' gates pass.

  Readiness aggregation: parent board readiness is computed from
  child board readiness values using the weighted 5-category formula.

  USE CASE:
  Complex products need multiple validation domains.
  Each domain gets its own board with its own experts.
  The parent board tracks overall readiness across all domains.
```

---

## 17. NATS SUBJECTS — Event Messaging

```
NATS SUBJECT NAMESPACE:

  airaie.results.completed
    Published when: a tool run completes with output artifacts
    Payload: { run_id, card_id, board_id, outputs, metrics, status }
    Consumed by: Evidence collection (triggers 10-step process)
    
  airaie.events.{runId}
    Published during: active run execution
    Payload: { event_type, timestamp, data }
    Consumed by: UI for real-time streaming (progress, logs, partial results)
    
  airaie.execution.completed
    Published when: full ExecutionPlan completes (all nodes done)
    Payload: { execution_plan_id, card_id, board_id, status, duration }
    Consumed by: Card status updater, gate re-evaluation trigger

FLOW:
  ExecutionPlan starts
    -> each PlanNode emits airaie.events.{runId} (streaming)
    -> each tool completion emits airaie.results.completed (evidence trigger)
    -> all nodes done emits airaie.execution.completed (plan-level)
```

---

## 18. REAL EXAMPLE: STRUCTURAL VALIDATION BOARD

### Step-by-Step Walkthrough

```
===================================================================
PHASE 1: BOARD CREATION
===================================================================

DAY 1: Engineer creates the board

  POST /v0/boards
  {
    "name": "Structural Validation Study",
    "type": "engineering",
    "vertical_id": "structural",
    "status": "draft",
    "meta_json": {
      "material": "Al6061-T6",
      "geometry": "bracket mounting plate",
      "dimensions": "160x80x5mm",
      "load_case": "500N axial",
      "standard": "ISO 12345"
    }
  }

  Board starts in: status=DRAFT, mode=explore

  Engineer creates cards with IntentSpecs:
  
  Card 1: "FEA Stress Test"
    card_type: "analysis"
    intent_type: "sim.fea"
    IntentSpec:
      goal: "Validate structural stress under 500N axial load"
      inputs: [
        { name: "geometry", type: "artifact:step", artifact_ref: "art_cad_001" },
        { name: "material", type: "json:material" }
      ]
      constraints: { load: 500, unit: "N", direction: "axial" }
      acceptance_criteria: [
        { metric: "max_stress", operator: "lt", threshold: 250, unit: "MPa", weight: 0.5 },
        { metric: "safety_factor", operator: "gt", threshold: 1.2, weight: 0.3 },
        { metric: "convergence", operator: "lt", threshold: 50, unit: "iterations", weight: 0.2 }
      ]
      preferences: { priority: "accuracy" }
      governance: { risk_policy: "standard", compliance_standards: ["ISO 12345"] }

  Card 2: "CFD Flow Analysis"
    card_type: "analysis", intent_type: "sim.cfd"
    IntentSpec: goal="Thermal flow analysis", criteria: max_temp < 85C

  Card 3: "Fatigue Analysis"
    card_type: "analysis", intent_type: "sim.fea"
    IntentSpec: goal="Fatigue life validation", criteria: cycles > 100000

  Card 4: "DFM Check"
    card_type: "analysis", intent_type: "cad.dfm_analysis"
    IntentSpec: goal="Manufacturability check"
    depends_on: [card_2]  (needs CFD results first)

  Engineer adds gates:
  - Structural Evidence Gate (type: "evidence", auto-evaluate)
  - Thermal Evidence Gate (type: "review", requires lead_engineer sign-off)
  - Fatigue Validation Gate (type: "evidence", auto-evaluate)
  - Release Compliance Gate (type: "compliance", requires quality_manager + project_lead)

  Engineer uploads initial artifact:
  - bracket_v3.step -> art_cad_001 (CAD geometry, referenced in IntentSpec inputs)

  Engineer adds hypothesis record:
  "Bracket design meets ISO 12345 structural requirements under 500N axial load
   with Aluminum 6061-T6 material at 160x80x5mm dimensions."

  Board state: status=DRAFT, mode=explore, Readiness=0%, 4 cards (draft), 4 gates (PENDING)

===================================================================
PHASE 2: EXPLORATION (Explore Mode)
===================================================================

DAY 2: Engineer locks FEA IntentSpec and generates plan

  POST /v0/cards/card_fea_001/lock-intent
  IntentSpec status: draft -> locked (version 1, locked_at: timestamp)

  POST /v0/cards/card_fea_001/generate-plan
  
  Plan generation (9 steps):
  1. Validate: card_type="analysis" + intent_type="sim.fea" -> valid
  2. Load IntentSpec (locked, version 1)
  3. ToolShelf resolves: "Standard FEA Validation Pipeline" (certified, 0.97 success rate)
  4. Instantiate: 5 PlanNodes + 4 PlanEdges
  5. Bind: geometry -> validate_input.geometry_file, material -> fea_solver.material
  6. No parameter overrides
  7. Insert validate_input node at start
  8. Insert evidence node after postprocess
  9. No governance nodes needed (explore mode)

  ExecutionPlan created:
    [validate_input] -> [preprocess/mesh_gen] -> [solve/fea_solver] -> [postprocess/extract]
                                                                            |
                                                                    [evidence/metrics]

  Card status: draft -> ready -> queued
  
  Execution begins:
  - validate_input: geometry file valid, format OK
  - preprocess/mesh_gen: 45,000 elements, quality 0.95 -> art_mesh_002
  - solve/fea_solver: max_stress 187.3 MPa, safety_factor 1.34 -> art_stress_003
  - postprocess/extract: metrics extracted
  - evidence/metrics: evaluates against acceptance criteria

  EVIDENCE COLLECTION (10-step process):
  1. Run completes -> RunService emits airaie.results.completed
  2. FireEvidenceCollection queues async handler
  3. Load evidence PlanNode
  4. Extract metrics: max_stress=187.3, safety_factor=1.34, convergence=8
  5. Create CardEvidence records:
     - { metric: "max_stress", value: 187.3, threshold: 250, op: "lt", eval: "pass" }
     - { metric: "safety_factor", value: 1.34, threshold: 1.2, op: "gt", eval: "pass" }
     - { metric: "convergence", value: 8, threshold: 50, op: "lt", eval: "pass" }
  6. TrustUpdater: fea_solver success_rate updated
  7. Check borderline: none (187.3 is well below 250)
  8. No escalation needed
  9. Audit events emitted for 3 CardEvidence records
  10. Readiness cache invalidated

  Card status: queued -> running -> completed (3/3 criteria pass)
  
  Board records auto-created:
  - RESULT: "FEA: max stress 187.3 MPa, SF 1.34"
  - Artifacts: art_mesh_002, art_stress_003 attached to board

  Gates advisory evaluation:
  -> Structural Evidence Gate: would pass (all CardEvidence pass)
  -> But mode=explore, so gates are advisory only

DAY 3: Engineer runs fatigue analysis

  Same flow: lock IntentSpec -> generate plan -> execute -> collect evidence
  Result: 250,000 cycles to failure, no crack initiation
  CardEvidence: { metric: "cycle_count", value: 250000, threshold: 100000, op: "gt", eval: "pass" }
  Fatigue card: completed, Fatigue gate: would pass (advisory)

DAY 3: Engineer decides to escalate to Study mode

  All initial analyses complete. Ready for formal governance.
  POST /v0/boards/{id}/escalate-mode
  { "target_mode": "study" }
  
  Validation: has >= 1 card, has >= 1 gate -> ESCALATED
  Board state: status=DRAFT, mode=study, gates now ENFORCED

===================================================================
PHASE 3: STUDY MODE (Governance Active)
===================================================================

DAY 3: Gates auto-evaluated (now enforced)

  System triggers: POST /v0/gates/{structural_gate_id}/evaluate
  
  Structural Evidence Gate (type: evidence):
    Checks CardEvidence for FEA card:
    - max_stress: 187.3 < 250 -> PASS
    - safety_factor: 1.34 > 1.2 -> PASS
    - convergence: 8 < 50 -> PASS
    -> STATUS: PASSED
  
  Fatigue Validation Gate (type: evidence):
    Checks CardEvidence for Fatigue card:
    - cycle_count: 250000 > 100000 -> PASS
    -> STATUS: PASSED
  
  Thermal Evidence Gate (type: review):
    - CardEvidence for CFD card: none yet (not run)
    -> STATUS: PENDING
  
  Release Compliance Gate (type: compliance):
    - all_prior_gates_passed: Thermal gate pending -> NO
    - role_signed (quality_manager): -> NO
    - role_signed (project_lead): -> NO
    -> STATUS: PENDING
  
  Board readiness (weighted):
    design: 2/4 cards = 0.50 * 0.30 = 0.150
    validation: 2/3 evidence gates = 0.67 * 0.30 = 0.200
    compliance: 0/1 = 0.00 * 0.15 = 0.000
    manufacturing: 0/1 DFM = 0.00 * 0.10 = 0.000
    approvals: 0/2 sign-offs = 0.00 * 0.15 = 0.000
    READINESS = 35%

  Engineer adds decision record:
  "PASS — Structural and fatigue criteria met. Proceeding to thermal validation."

DAY 4: Engineer runs CFD analysis

  Lock CFD IntentSpec -> generate plan -> execute
  CFD Engine runs: 45 minutes, produces flow field data
  CardEvidence: { metric: "max_temp", value: 78, threshold: 85, op: "lt", eval: "pass" }
  art_flow_007 attached to board
  CFD card: completed

  Thermal Evidence Gate re-evaluated:
    CardEvidence for CFD: max_temp PASS
    role_signed (lead_engineer): not yet -> NO
    -> STATUS: PENDING (evidence OK, awaiting review)
  
  System sends notification: "Gate requires your approval"
  Approval appears in Approval Queue.

DAY 4: Lead engineer reviews and approves

  Engineer opens Approval Queue:
  - Reviews CardEvidence: max_temp=78C < 85C PASS
  - Reviews artifacts (flow_field.vtk, thermal_report.pdf)
  - Adds comment: "CFD results confirm thermal compliance. 
                    Max temperature 78C well within 85C limit."
  - Clicks APPROVE
  
  POST /v0/gates/{thermal_gate_id}/approve
  {
    "requirement_id": "req_role_signed_lead",
    "actor": "user:santhosh",
    "comment": "CFD results confirm thermal compliance."
  }
  
  Thermal Evidence Gate:
    CardEvidence: PASS
    role_signed (lead_engineer): YES (just approved)
    -> STATUS: PASSED

DAY 5: DFM check completes (depends_on CFD now satisfied)

  DFM card: draft -> ready (CFD card completed, dependency met)
  Lock IntentSpec -> generate plan -> execute
  CardEvidence: all DFM criteria pass
  DFM card: completed

DAY 5: Quality manager and project lead sign off

  Release Compliance Gate re-evaluated:
    all_prior_gates_passed: all 3 other gates PASSED -> YES
    role_signed (quality_manager): pending
    role_signed (project_lead): pending
    -> STATUS: PENDING
  
  Quality Manager reviews all CardEvidence on the board:
  - FEA: max_stress 187.3 < 250 PASS, safety_factor 1.34 > 1.2 PASS
  - Fatigue: 250K > 100K PASS
  - CFD: 78C < 85C PASS
  - DFM: all criteria PASS
  - Comments: "All criteria met. Design approved for release."
  -> APPROVES
  
  Project Lead reviews:
  - Comments: "Approved for manufacturing release."
  -> APPROVES
  
  Release Compliance Gate:
    all_prior_gates_passed -> YES
    role_signed (quality_manager) -> YES
    role_signed (project_lead) -> YES
    -> STATUS: PASSED
  
  Board readiness (weighted):
    design: 4/4 = 1.00 * 0.30 = 0.300
    validation: 3/3 = 1.00 * 0.30 = 0.300
    compliance: 1/1 = 1.00 * 0.15 = 0.150
    manufacturing: 1/1 = 1.00 * 0.10 = 0.100
    approvals: 2/2 = 1.00 * 0.15 = 0.150
    READINESS = 100%

  System notification: "All gates passed. Board eligible for Release mode."

===================================================================
PHASE 4: RELEASE
===================================================================

DAY 5: Engineer escalates to Release mode

  POST /v0/boards/{id}/escalate-mode
  { "target_mode": "release" }
  
  Validation: all gates passed -> ESCALATED
  Board state: status=DRAFT, mode=release

DAY 5: Engineer builds release packet

  Opens Release Packet Builder page:
  
  1. SELECT ARTIFACTS (auto-populated from board attachments):
     - stress_map_v2.vtk (8.2 MB) -> LOCK
     - mesh_output.stl (3.1 MB) -> LOCK
     - fatigue_report.pdf (1.1 MB) -> LOCK
     - flow_field.vtk (12.4 MB) -> LOCK
     - thermal_report.pdf (2.3 MB) -> LOCK
     
     LOCKING creates frozen copies with SHA-256 verification.
     Locked artifacts cannot be modified or replaced.
  
  2. GENERATE BOM:
     Auto-populated from board metadata + card results:
     | Component    | Material   | Dimensions    | Qty | Spec     |
     | Base Plate   | Al6061-T6  | 160x80x5 mm  | 1   | ISO 12345|
     | Bracket L    | Al6061-T6  | 120x40x3 mm  | 2   | ASTM B209|
     | Fastener M6  | Steel 8.8  | M6x20        | 8   | ISO 4762 |
  
  3. ATTACH TOLERANCES:
     Upload GD&T drawing: GDT_drawing_rev3.pdf
     Enter tolerance specs: length +/-0.10, width +/-0.10, etc.
  
  4. COMPILE PROOF BUNDLE:
     Auto-generated from gate evaluations + CardEvidence:
     - Structural Evidence Gate: PASSED, auto-evaluated, Mar 30
       - CardEvidence: max_stress=187.3 PASS, safety_factor=1.34 PASS
     - Thermal Evidence Gate: PASSED, reviewed by Santhosh, Mar 31
       - CardEvidence: max_temp=78 PASS
     - Fatigue Validation Gate: PASSED, auto-evaluated, Mar 30
       - CardEvidence: cycle_count=250000 PASS
     - Release Compliance Gate: PASSED, multi-signer, Apr 1
  
  5. COLLECT SIGN-OFFS:
     Auto-populated from gate approvals:
     - Santhosh (Lead Engineer): signed Thermal gate
     - Maria Chen (Quality Manager): signed Release gate
     - James Wilson (Project Lead): signed Release gate
  
  6. EXPORT AUDIT TRAIL:
     35+ events from board creation to release
     (includes IntentSpec locks, plan generation, CardEvidence creation)
  
  7. EXPORT RELEASE PACKET:
     structural-validation-release-v1.zip (25 MB)
     Contains: all locked artifacts + BOM + tolerances + 
               proof bundle + sign-offs + audit trail
     
     Timestamped and sealed. Cannot be modified after export.

DAY 5: Release packet handed to manufacturing

  The ZIP file is the complete manufacturing handoff.
  Manufacturing has everything they need:
  - What to build (CAD files + BOM)
  - To what tolerances (GD&T + specs)
  - Proof that it's safe (CardEvidence from FEA, CFD, fatigue)
  - Who approved it (sign-off records)
  - How it was validated (complete audit trail with IntentSpecs)

===================================================================
PHASE 5: ARCHIVAL
===================================================================

Board status: DRAFT -> ARCHIVED
All data preserved permanently.
Read-only access for future reference and regulatory audits.
Release packet available for re-download at any time.

TOTAL TIMELINE: 5 days
TOTAL COST: ~$15 (across all workflow runs)
ARTIFACTS: 5 locked, SHA-256 verified
CARDS: 4/4 completed with CardEvidence
GATES: 4/4 passed (2 evidence, 1 review, 1 compliance)
INTENTSPECS: 4 locked at version 1
EXECUTION PLANS: 4 completed
CARD EVIDENCE RECORDS: 8+ metric evaluations
APPROVALS: 3 human sign-offs
BOARD RECORDS: 6+ evidence records
AUDIT EVENTS: 35+ tracked
```

---

## 19. MINIMUM SYSTEM REQUIRED

### Backend Components

```
+---------------------------------------------------------------+
|              MINIMUM VIABLE BOARD SYSTEM                       |
|                                                                |
|  1. BOARD SERVICE (Go)                                        |
|     File: internal/service/board.go                            |
|     Does: CRUD for boards (status: DRAFT/ARCHIVED)            |
|     Database: boards table                                    |
|                                                                |
|  2. INTENTSPEC SERVICE (Go)                                   |
|     File: internal/service/intent_spec.go                      |
|     Does: CRUD for IntentSpecs, version management             |
|     Does: Lock IntentSpec (draft -> locked, immutable)         |
|     Does: Validate acceptance criteria schema                  |
|     Database: intent_specs table                               |
|                                                                |
|  3. CARD SERVICE (Go)                                         |
|     File: internal/service/card.go                             |
|     Does: CRUD for cards, status state machine                 |
|     Does: DAG dependency tracking (depends_on)                 |
|     Does: KPI tracking from CardEvidence                       |
|     Database: cards table                                     |
|                                                                |
|  4. CARD EVIDENCE SERVICE (Go)                                |
|     File: internal/service/card_evidence.go                    |
|     Does: Create/query CardEvidence records                    |
|     Does: Evaluate metrics against acceptance criteria         |
|     Does: Borderline detection (within tolerance)              |
|     Database: card_evidence table                              |
|                                                                |
|  5. EXECUTION PLAN SERVICE (Go)                               |
|     File: internal/service/execution_plan.go                   |
|     Does: Generate plans from IntentSpec + Pipeline            |
|     Does: 9-step plan generation process                       |
|     Does: Bind IntentSpec inputs to node ports                 |
|     Database: execution_plans, plan_nodes, plan_edges          |
|                                                                |
|  6. PIPELINE SERVICE (Go)                                     |
|     File: internal/service/pipeline.go                         |
|     Does: CRUD for pipelines and pipeline steps                |
|     Does: Trust level management                               |
|     Database: pipelines, pipeline_steps                        |
|                                                                |
|  7. TOOLSHELF SERVICE (Go)                                    |
|     File: internal/service/toolshelf.go                        |
|     Does: 4-step resolution (filter, compose, rank, explain)   |
|     Does: Match intent_type to available pipelines             |
|     Returns: recommended, alternatives, unavailable            |
|                                                                |
|  8. GATE SERVICE (Go)                                         |
|     File: internal/service/gate.go                             |
|     Does: CRUD for gates (types: evidence, review, compliance) |
|     Does: Evaluate requirements against CardEvidence           |
|     Does: Process approvals/rejections/waivers                 |
|     Status: PENDING | EVALUATING | PASSED | FAILED | WAIVED   |
|     Database: gates, gate_requirements, gate_approvals         |
|                                                                |
|  9. EVIDENCE COLLECTOR SERVICE (Go)                           |
|     File: internal/service/evidence_collector.go               |
|     Does: 10-step evidence collection process                  |
|     Does: Watches run completions for board-linked runs        |
|     Does: Creates CardEvidence records                         |
|     Does: Updates tool trust via TrustUpdater                  |
|     Does: Borderline detection + auto-escalation               |
|     Trigger: NATS subscriber on airaie.results.completed       |
|                                                                |
|  10. BOARD MODE SERVICE (Go)                                  |
|      File: internal/service/board_mode.go                      |
|      Does: Manage mode escalation (Explore->Study->Release)    |
|      Does: Validate escalation prerequisites                   |
|      Does: Inject agent thresholds per mode                    |
|      Does: Enforce mode-specific rules                         |
|                                                                |
|  11. BOARD INTELLIGENCE SERVICE (Go)                          |
|      File: internal/service/board_intelligence.go              |
|      Does: Evidence diff analysis                              |
|      Does: Gate failure triage                                 |
|      Does: Readiness calculation (weighted 5-category)         |
|      Does: Reproducibility checks                              |
|      Optional but valuable for user experience                 |
|                                                                |
|  12. BOARD TEMPLATE SERVICE (Go)                              |
|      File: internal/service/board_template.go                  |
|      Does: Manage pre-built board templates                    |
|      Does: Instantiate boards from templates (with IntentSpecs)|
|      Database: board_templates table                           |
|                                                                |
|  13. BOARD COMPOSITION SERVICE (Go)                           |
|      File: internal/service/board_composition.go               |
|      Does: Manage parent-child board hierarchies (max 3 levels)|
|      Does: Aggregate readiness across child boards             |
|                                                                |
|  14. RELEASE PACKET SERVICE (Go)                              |
|      File: internal/service/release.go                         |
|      Does: Lock artifacts, generate BOM, compile proof         |
|      Does: Include CardEvidence summary in proof bundle        |
|      Does: Export release packet as ZIP                        |
|      Uses: MinIO for artifact snapshots                        |
|                                                                |
|  15. INFRASTRUCTURE (shared with workflow/tool/agent)         |
|      PostgreSQL: boards, intent_specs, cards, card_evidence,  |
|                  execution_plans, plan_nodes, plan_edges,      |
|                  pipelines, pipeline_steps, gates,             |
|                  gate_requirements, gate_approvals,            |
|                  board_records, board_attachments,             |
|                  board_templates, audit_events                 |
|      MinIO: artifact storage (shared bucket)                  |
|      NATS subjects:                                           |
|        airaie.results.completed (evidence collection trigger)  |
|        airaie.events.{runId} (real-time streaming)            |
|        airaie.execution.completed (plan completion)            |
|                                                                |
+---------------------------------------------------------------+
```

### The Key Insight: IntentSpec Is the Bridge

```
THE INTENTSPEC TIES EVERYTHING TOGETHER:

  +--------------------------------------------------+
  |                    BOARD                          |
  |            (governance + context)                  |
  |                                                    |
  |   Cards define WHAT via:                          |
  |   +-- IntentSpec (goal + criteria + constraints)  |
  |                                                    |
  |   ToolShelf resolves HOW via:                     |
  |   +-- Pipeline (ranked tool chains)               |
  |                                                    |
  |   Plans define EXACTLY HOW via:                   |
  |   +-- ExecutionPlan (DAG with bindings)            |
  |                                                    |
  |   Evidence proves WHETHER via:                    |
  |   +-- CardEvidence (metrics vs criteria)           |
  |                                                    |
  |   Gates enforce GOVERNANCE via:                   |
  |   +-- evidence + review + compliance checks       |
  |                                                    |
  |   Modes control RIGOR via:                        |
  |   +-- Agent thresholds (0.5/0.75/0.90)            |
  |                                                    |
  |   Releases package PROOF via:                     |
  |   +-- Locked artifacts + CardEvidence + sign-offs  |
  |                                                    |
  +--------------------------------------------------+

  THE FLOW:
    User Intent (IntentSpec)
      -> Tool Resolution (ToolShelf)
        -> Pipeline Selection (ranked by trust)
          -> Plan Generation (9-step process)
            -> Execution (PlanNodes run tools)
              -> Evidence Collection (10-step process)
                -> Gate Evaluation (auto/review/compliance)
                  -> Readiness Calculation (weighted 5-category)
                    -> Release (proof bundle + sign-offs)

  WITHOUT boards: Tools run, workflows execute, agents decide.
                  But nothing is VALIDATED, GOVERNED, or RELEASED.
  
  WITH boards:    Everything feeds into a structured validation case
                  that progresses from hypothesis to manufacturing release
                  with full traceability and governance.

  Boards are WHERE engineering confidence is built.
  IntentSpecs are WHAT needs to be proven.
  ToolShelf is HOW tools are selected.
  Pipelines are HOW tools are composed.
  ExecutionPlans are HOW tools are executed.
  CardEvidence is WHETHER criteria were met.
  Tools are WHAT does the work.
  Workflows are HOW the work is organized.
  Agents are WHO makes the decisions.
  Gates are WHEN governance is enforced.
  Boards are WHY it all matters — proving the design is safe.
```

---

*Generated: 2026-04-06*
*Based on: Airaie System Analysis, Board Kernel Architecture, and Implementation Patterns*
