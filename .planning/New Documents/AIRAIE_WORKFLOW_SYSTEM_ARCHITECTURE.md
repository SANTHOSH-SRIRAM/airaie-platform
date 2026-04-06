# AIRAIE WORKFLOW SYSTEM — Complete Architecture & Implementation Guide

> How Workflows actually work at every layer: structure, execution, data flow, branching, error handling, and deployment.
> Date: 2026-04-06

---

## 1. WHAT IS A WORKFLOW?

### Definition

A **Workflow** in Airaie is a **directed acyclic graph (DAG)** of nodes connected by edges that defines an automation pipeline. Each node performs an operation (run a tool, make a decision, check a gate), and edges define how data flows from one node's output to another node's input.

```
A Workflow is:
  - A BLUEPRINT for automation (the definition)
  - Executed as RUNS (each execution is a separate run instance)
  - Composed of NODES (tools, agents, triggers, logic, governance)
  - Connected by EDGES (data flows along edges between nodes)
  - Versioned (draft → compiled → published lifecycle)
  - Triggered (webhook, schedule, event, or manual)
```

### DAG Rules

```
RULE 1: DIRECTED — data flows in ONE direction (left to right, parent to child)
RULE 2: ACYCLIC — NO cycles allowed. A node cannot depend on itself.
         The compiler checks for cycles at compile time and rejects them.
RULE 3: MULTIPLE ROOTS — a workflow can have multiple trigger/start nodes
RULE 4: MULTIPLE LEAVES — a workflow can have multiple end nodes
RULE 5: BRANCHING — a node can output to multiple downstream nodes (fan-out)
RULE 6: MERGING — a node can receive from multiple upstream nodes (fan-in)
```

### Can Workflows Have Loops?

```
NO — workflows are strictly DAGs. No cycles.

But you CAN achieve iteration through:
1. AGENT NODES — an agent internally iterates (calls tools multiple times)
   The agent is a single DAG node, but inside it runs a multi-step loop.
2. RE-TRIGGERING — a workflow's last step can webhook-trigger itself
   This creates a new run, not a cycle within the same run.
3. SUB-WORKFLOWS — a node can call another workflow (like a function call)
   The sub-workflow is a separate run with its own lifecycle.

WHY NO LOOPS:
  - Loops make execution unpredictable (infinite loops risk)
  - Loops complicate cost estimation (unknown number of iterations)
  - Loops break topological ordering (can't determine execution order)
  - Agent nodes provide controlled iteration with budget limits
```

### Core Elements

```
ELEMENT 1: NODE
  A single operation in the workflow.
  Has: id, type, name, position (x,y on canvas), parameters, tool_ref

ELEMENT 2: EDGE (Connection)
  A directed link from one node's output to another node's input.
  Has: source_node_id, source_output, target_node_id, target_input

ELEMENT 3: DATA ENVELOPE
  The data that flows along an edge between nodes.
  Has: json (structured data), artifacts (file references), metadata

ELEMENT 4: TRIGGER
  How the workflow starts (webhook, schedule, event, manual).
  The trigger node is the root of the DAG.

ELEMENT 5: VERSION
  An immutable snapshot of the workflow definition.
  Has: version number, status (draft/compiled/published), DSL, AST
```

---

## 2. WORKFLOW STRUCTURE

### Node Types

| Node Type | Icon Color | What It Does | Inputs | Outputs | Example |
|-----------|-----------|-------------|--------|---------|---------|
| **Trigger** | Green #4CAF50 | Starts the workflow when an event occurs | 0 (generates data) | 1+ | Webhook, Schedule, Event, Manual |
| **Tool** | Blue #2196F3 | Executes a registered tool in a container | 1+ | 1+ | FEA Solver, Mesh Generator |
| **Agent** | Purple #9C27B0 | AI decides which tools to use at runtime | 1 | 1 | FEA Optimizer, Design Advisor |
| **Condition (IF)** | Gray #6B6B6B | Routes data to different branches based on expression | 1 | 2+ (branches) | If stress > threshold → branch A, else → branch B |
| **Switch** | Gray #6B6B6B | Routes to one of N branches based on value | 1 | N (branches) | Switch on material type → different analysis paths |
| **Merge** | Gray #6B6B6B | Waits for multiple upstream nodes, combines data | N | 1 | Wait for FEA + CFD results, then merge |
| **Transform** | Gray #6B6B6B | Modifies data without external execution | 1 | 1 | Extract field, rename key, format conversion |
| **Gate** | Orange #FF9800 | Pauses until governance requirements are met | 1 | 1 | Evidence Gate, Approval Gate |
| **Sub-Workflow** | Gray #6B6B6B | Calls another workflow as a single node | matches sub-workflow | matches sub-workflow | Reusable validation pipeline |
| **Delay** | Gray #6B6B6B | Pauses execution for a specified duration | 1 | 1 | Wait 5 minutes before next step |

### How Connections Are Defined

```
STORED FORMAT (in workflow JSON):

{
  "connections": {
    "webhook_1": {
      "main": [
        [
          { "node": "mesh_gen_1", "type": "main", "index": 0 }
        ]
      ]
    },
    "mesh_gen_1": {
      "main": [
        [
          { "node": "fea_solver_1", "type": "main", "index": 0 }
        ]
      ]
    },
    "fea_solver_1": {
      "main": [
        [
          { "node": "condition_1", "type": "main", "index": 0 }
        ]
      ]
    },
    "condition_1": {
      "main": [
        [
          { "node": "result_analyzer_1", "type": "main", "index": 0 }
        ],
        [
          { "node": "optimizer_agent_1", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}

READING THIS:
  connections[SOURCE_NODE][OUTPUT_TYPE][OUTPUT_INDEX] = [
    { node: DEST_NODE, type: INPUT_TYPE, index: INPUT_INDEX }
  ]

  "webhook_1" output main[0] → "mesh_gen_1" input main[0]
  "condition_1" output main[0] → "result_analyzer_1" (TRUE branch)
  "condition_1" output main[1] → "optimizer_agent_1" (FALSE branch)
```

### How Execution Order Is Determined

```
TOPOLOGICAL SORT:

  The workflow compiler converts the DAG into a topological order.
  This is the ORDER in which nodes CAN execute (respecting dependencies).

  Example DAG:
    A → B → D
    A → C → D

  Topological order: [A, B, C, D]  (B and C can run in parallel)

  RULES:
  1. A node executes ONLY when ALL its upstream dependencies have completed
  2. Root nodes (no dependencies) execute first
  3. Nodes with satisfied dependencies are dispatched in parallel
  4. The scheduler continuously checks "what's ready now?" after each completion

ALGORITHM (in Go workflow scheduler):

  1. Build adjacency list from connections
  2. Compute in-degree for each node (number of incoming edges)
  3. Initialize queue with all nodes where in-degree = 0 (root nodes)
  4. While queue is not empty:
     a. Dequeue node
     b. Dispatch node for execution
     c. When node completes: for each child node:
        - Decrement child's in-degree
        - If child's in-degree = 0 → add to queue (ready to execute)
  5. When queue is empty and all nodes complete → workflow SUCCEEDED
```

---

## 3. INPUT TO WORKFLOW

### How a Workflow Starts

```
TRIGGER TYPE 1: WEBHOOK
  External system sends HTTP POST to a registered URL.
  The request body becomes the trigger node's output data.
  
  URL: https://api.airaie.io/v0/hooks/{webhook_id}
  Method: POST
  Body: { "geometry_file": <file>, "material": "Al6061-T6", "load": 500 }
  
  System:
  1. API Gateway receives request
  2. Uploads any files to MinIO → creates artifacts
  3. Creates Run record (status: PENDING)
  4. Trigger node outputs: { json: body_data, artifacts: uploaded_files }
  5. Scheduler dispatches downstream nodes

TRIGGER TYPE 2: SCHEDULE (Cron)
  Workflow runs automatically on a time schedule.
  
  Config: "0 9 * * MON-FRI"  (every weekday at 9:00 AM)
  
  System:
  1. Cron scheduler fires at scheduled time
  2. Creates Run record with empty trigger data (or configured defaults)
  3. Trigger node outputs configured default inputs
  4. Scheduler dispatches downstream nodes

TRIGGER TYPE 3: EVENT (NATS)
  Workflow triggers when a specific NATS event occurs.
  
  Config: "events.artifact.created" with filter: type = "vtk"
  
  System:
  1. NATS consumer listens on the configured subject
  2. When matching event arrives, creates Run
  3. Event payload becomes trigger output
  4. Scheduler dispatches

TRIGGER TYPE 4: MANUAL
  User clicks "Run Workflow" button in the UI.
  
  System:
  1. Frontend sends POST /v0/runs with workflow_id and optional inputs
  2. Creates Run record
  3. If workflow has input parameters → user fills them in a dialog
  4. Trigger node outputs the user-provided inputs
  5. Scheduler dispatches
```

### Workflow Input Parameters

```
A workflow can define TOP-LEVEL INPUT PARAMETERS that are
required when triggering a run:

{
  "workflow_inputs": [
    {
      "name": "geometry",
      "type": "artifact",
      "required": true,
      "description": "CAD geometry file to validate"
    },
    {
      "name": "material",
      "type": "string",
      "required": true,
      "description": "Material designation"
    },
    {
      "name": "load_newtons",
      "type": "number",
      "required": true,
      "description": "Applied load in Newtons"
    },
    {
      "name": "threshold_mpa",
      "type": "number",
      "required": false,
      "default": 250,
      "description": "Maximum allowable stress"
    }
  ]
}

VALIDATION:
  When a run is created (POST /v0/runs), the provided inputs are
  validated against this schema. Missing required inputs → immediate error.
  
  The trigger node's output is these validated inputs.
  Downstream nodes reference them via expressions:
    {{ $('Trigger').json.material }}
    {{ $('Trigger').artifacts.geometry }}
```

---

## 4. EXECUTION ENGINE (THE CRITICAL PIECE)

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                   WORKFLOW EXECUTION ENGINE                    │
│                                                                │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  WORKFLOW SCHEDULER (Go — internal/workflow/scheduler.go) │
│  │                                                       │      │
│  │  Responsibilities:                                    │      │
│  │  1. Compile YAML DSL → AST → DAG                     │      │
│  │  2. Topological sort to determine execution order     │      │
│  │  3. Track node dependencies (which nodes are "ready") │      │
│  │  4. Dispatch ready nodes as Jobs to NATS              │      │
│  │  5. Process Results from completed nodes              │      │
│  │  6. Resolve expressions ({{ }}) at dispatch time      │      │
│  │  7. Evaluate conditions (IF nodes)                    │      │
│  │  8. Handle Merge nodes (wait for all inputs)          │      │
│  │  9. Handle failures (retry, skip, abort)              │      │
│  │  10. Update Run/NodeRun status in PostgreSQL          │      │
│  └─────────────────────────────────────────────────────┘      │
│                          │                                     │
│                    NATS JetStream                              │
│     airaie.jobs.tool.execution ↓  ↑ airaie.results.completed  │
│                          │                                     │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  RUST RUNNER (runner/src/)                            │      │
│  │                                                       │      │
│  │  Responsibilities:                                    │      │
│  │  1. Consume Job from NATS                             │      │
│  │  2. Download input artifacts from MinIO               │      │
│  │  3. Execute tool in Docker container                  │      │
│  │  4. Monitor execution (timeout, OOM, logs)            │      │
│  │  5. Upload output artifacts to MinIO                  │      │
│  │  6. Publish Result to NATS                            │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Execution Engine Components

```
The execution engine is composed of six core components:

COMPONENT 1: SCHEDULER
  Manages per-run state, dispatches nodes by execution level.
  Tracks the in-degree map, maintains the ready queue, and
  orchestrates the event-driven dispatch loop.
  After each node completion, re-evaluates "what's ready now?"

COMPONENT 2: EXECUTIONPLANBUILDER
  Converts compiled AST → ExecutionPlan with parallelizable levels.
  Groups nodes into execution levels where all nodes in a level
  can run concurrently (all dependencies in prior levels).
  
  Level 0: [Trigger]
  Level 1: [Mesh Gen]
  Level 2: [FEA Solver]
  Level 3: [Condition]
  Level 4: [Analyzer, Optimizer]   ← parallel within level

COMPONENT 3: DISPATCHER
  Creates JobPayload from resolved node inputs, generates presigned
  artifact URLs, and publishes the job to the appropriate NATS subject
  (airaie.jobs.tool.execution or airaie.jobs.agent.execution).

COMPONENT 4: RESULTHANDLER
  Processes JobResult messages from NATS. Updates NodeRun status in
  PostgreSQL, stores output data in runData, creates artifact records,
  and triggers downstream node evaluation via the Scheduler.

COMPONENT 5: RETRYSCHEDULER
  Per-node retry with exponential backoff. Tracks attempt count against
  max_retries config. Transitions node to RETRYING between attempts.
  Backoff formula: wait_sec * 2^(attempt-1) with jitter.

COMPONENT 6: CONDITIONEVALUATOR
  Evaluates "when" expressions at runtime for IF, Switch, and Gate nodes.
  Uses the expression engine to resolve {{ }} expressions against current
  runData. Returns branch selection for routing downstream dispatch.
```

### NATS Subject Namespace

```
All NATS subjects use the "airaie." prefix for isolation:

  airaie.jobs.tool.execution     — tool job dispatch (Scheduler → Runner)
  airaie.jobs.agent.execution    — agent job dispatch (Scheduler → Agent Runtime)
  airaie.jobs.approval.wait      — gate requiring human approval (pauses run)
  airaie.events.{runId}          — real-time log/event streaming per run
  airaie.results.completed       — job completion callback (Runner → ResultHandler)
  airaie.execution.completed     — full run completion notification

SUBJECT USAGE:
  Tool dispatch:  Scheduler publishes to airaie.jobs.tool.execution
                  Rust Runner subscribes, executes container, publishes result
                  to airaie.results.completed
  
  Agent dispatch: Scheduler publishes to airaie.jobs.agent.execution
                  Agent Runtime subscribes, runs LLM loop, publishes result
                  to airaie.results.completed
  
  Approval gate:  Scheduler publishes to airaie.jobs.approval.wait
                  Run transitions to AWAITING_APPROVAL
                  Human approves via UI → approval event published
                  Scheduler resumes run
  
  Live streaming: Each run streams events to airaie.events.{runId}
                  Frontend SSE endpoint subscribes for real-time updates
  
  Run completion: When all nodes done, Scheduler publishes to
                  airaie.execution.completed for downstream consumers
                  (evidence collection, audit, notifications)
```

### Run Event Types

```
FULL LIST OF EVENTS streamed to airaie.events.{runId}:

  RUN-LEVEL EVENTS:
    RUN_CREATED       — run record created, status PENDING
    RUN_STARTED       — first node dispatched, status RUNNING
    RUN_COMPLETED     — all nodes done, status SUCCEEDED
    RUN_FAILED        — critical node failed, status FAILED
    RUN_CANCELED      — user or system canceled, status CANCELED

  NODE-LEVEL EVENTS:
    NODE_QUEUED       — job published to NATS, awaiting runner pickup
    NODE_STARTED      — runner began container execution
    NODE_LOG          — stdout/stderr line from running container
    NODE_PROGRESS     — progress update (percentage, step N of M)
    NODE_COMPLETED    — container exited successfully, outputs captured
    NODE_FAILED       — container exited non-zero, timeout, or OOM
    NODE_RETRYING     — retry scheduled, waiting for backoff interval

EVENT PAYLOAD:
  {
    "event_type": "NODE_COMPLETED",
    "run_id": "run_xyz789",
    "node_id": "fea_solver_1",
    "timestamp": "2026-04-06T10:42:22Z",
    "data": { ... event-specific payload ... }
  }
```

### Step-by-Step Execution

```
GIVEN WORKFLOW:
  [Webhook] → [Mesh Generator] → [FEA Solver] → [IF Condition] → [Result Analyzer] (true)
                                                                 → [AI Optimizer] (false)

EXECUTION TIMELINE:

T=0s  RUN CREATED
      ├── Run record created in PostgreSQL: status = PENDING
      ├── Webhook trigger processes incoming request
      ├── Trigger data: { geometry: art_001, material: "Al6061", load: 500, threshold: 250 }
      ├── NodeRun created for Webhook: status = SUCCEEDED (triggers execute instantly)
      ├── Scheduler computes dependency graph:
      │   Webhook: in-degree 0 (root) ← DONE
      │   Mesh Generator: in-degree 1 (needs Webhook) ← NOW READY
      │   FEA Solver: in-degree 1 (needs Mesh Gen) ← waiting
      │   IF Condition: in-degree 1 (needs FEA) ← waiting
      │   Result Analyzer: in-degree 1 (needs IF true) ← waiting
      │   AI Optimizer: in-degree 1 (needs IF false) ← waiting
      └── Dispatches Mesh Generator (only ready node)

T=0s  MESH GENERATOR DISPATCHED
      ├── Scheduler resolves input expressions:
      │   geometry = {{ $('Webhook').artifacts.geometry }} → "art_001"
      │   density = 0.8 (static value from node config)
      │   element_type = "hex8" (static)
      ├── PreflightService validates inputs against tool contract ✓
      ├── Generates presigned URLs for art_001 download
      ├── Generates presigned upload URL for mesh_output
      ├── Builds Job payload
      ├── Publishes to NATS: airaie.jobs.tool.execution
      ├── NodeRun for Mesh Generator: status = QUEUED → RUNNING
      └── Run status: RUNNING

T=7s  MESH GENERATOR COMPLETES
      ├── Rust Runner publishes Result to NATS: airaie.results.completed
      │   { status: SUCCEEDED, outputs: [{ name: "mesh_output", artifact_id: "art_002" }],
      │     metrics: { element_count: 45000, quality: 0.95 } }
      ├── ResultHandler processes Result:
      │   ├── Updates NodeRun: SUCCEEDED
      │   ├── Creates artifact record for art_002
      │   ├── Stores output data in runData["mesh_gen_1"]
      │   └── Checks children: FEA Solver needs [Mesh Gen] → satisfied!
      └── Dispatches FEA Solver

T=7s  FEA SOLVER DISPATCHED
      ├── Resolves expressions:
      │   mesh_file = {{ $('Mesh Generator').artifacts.mesh_output }} → "art_002"
      │   threshold = {{ $('Webhook').json.threshold }} → 250
      │   material = {{ $('Webhook').json.material }} → "Al6061"
      │   output_format = "vtk" (static)
      ├── Builds and dispatches Job
      └── NodeRun: QUEUED → RUNNING

T=22s FEA SOLVER COMPLETES
      ├── Result: SUCCEEDED
      │   outputs: [{ name: "result", artifact_id: "art_003" }]
      │   metrics_value: { max_stress: 187.3, safety_factor: 1.34, converged: true }
      ├── Updates NodeRun, creates artifact art_003
      ├── Checks children: IF Condition needs [FEA Solver] → satisfied!
      └── Processes IF Condition node

T=22s IF CONDITION EVALUATES (instant — no Job dispatch needed)
      ├── Condition expression: {{ $('FEA Solver').json.metrics.max_stress < $('Webhook').json.threshold }}
      ├── Evaluates: 187.3 < 250 → TRUE
      ├── NodeRun for IF Condition: SUCCEEDED
      ├── TRUE branch selected → Result Analyzer is next
      ├── FALSE branch → AI Optimizer SKIPPED (condition not met)
      ├── NodeRun for AI Optimizer: SKIPPED
      └── Dispatches Result Analyzer

T=22s RESULT ANALYZER DISPATCHED
      ├── Resolves expressions for Result Analyzer inputs
      ├── Dispatches Job
      └── NodeRun: RUNNING

T=28s RESULT ANALYZER COMPLETES
      ├── Result: SUCCEEDED
      │   outputs: [report artifact, contour image, summary JSON]
      ├── No more downstream nodes → this is a leaf node
      ├── All nodes complete (or SKIPPED): Webhook ✓, Mesh ✓, FEA ✓, IF ✓, Analyzer ✓, Optimizer SKIPPED
      ├── Run status: SUCCEEDED
      └── Total: 28 seconds, cost $1.30

T=28s POST-COMPLETION
      ├── Audit event emitted
      ├── Publishes to airaie.execution.completed
      ├── SSE event pushed to frontend: "executionFinished"
      ├── EvidenceCollectorService checks: is this workflow linked to a board?
      │   YES → auto-attaches results as evidence to Structural Validation Study
      └── Frontend updates: all nodes show green checkmarks
```

### Parallel Execution

```
EXAMPLE: PARALLEL DAG
  [Trigger] → [FEA Solver]  ──┐
                                ├── [Merge] → [Report Generator]
  [Trigger] → [CFD Engine]  ──┘

EXECUTION:
  T=0s:  Trigger completes
  T=0s:  FEA Solver dispatched (ready — depends only on Trigger ✓)
  T=0s:  CFD Engine dispatched (ready — depends only on Trigger ✓)
         Both run SIMULTANEOUSLY on separate Docker containers
  T=15s: FEA Solver completes → checks Merge: needs [FEA, CFD] → CFD not done yet → WAIT
  T=45s: CFD Engine completes → checks Merge: needs [FEA ✓, CFD ✓] → ALL SATISFIED
  T=45s: Merge node executes (combines both outputs)
  T=45s: Report Generator dispatched
  T=50s: Report Generator completes → Run SUCCEEDED

PARALLEL RULES:
  - Any nodes with ALL dependencies satisfied are dispatched simultaneously
  - No explicit "parallel" keyword needed — the DAG structure implies parallelism
  - The scheduler is EVENT-DRIVEN: every time a node completes, it checks
    "what new nodes are now ready?" and dispatches ALL of them
  - Rust Runner has N concurrent slots (default 4): multiple containers run at once
```

### State Management Between Nodes

```
STATE IS STORED IN runData:

  runData = {
    "webhook_1": {
      status: "SUCCEEDED",
      data: {
        json: { material: "Al6061", load: 500, threshold: 250 },
        artifacts: { geometry: "art_001" }
      },
      startTime: 1711792920000,
      executionTime: 100,
      cost: 0
    },
    "mesh_gen_1": {
      status: "SUCCEEDED",
      data: {
        json: { element_count: 45000, quality: 0.95 },
        artifacts: { mesh_output: "art_002" }
      },
      startTime: 1711792920100,
      executionTime: 7200,
      cost: 0.30
    },
    "fea_solver_1": {
      status: "SUCCEEDED",
      data: {
        json: { max_stress: 187.3, safety_factor: 1.34, converged: true },
        artifacts: { result: "art_003" }
      },
      executionTime: 15000,
      cost: 0.50
    }
  }

  WHERE IT LIVES:
  - During execution: in-memory in the Go scheduler process
  - After completion: persisted in PostgreSQL (runs.output_data, node_runs table)
  - Queryable via: GET /v0/runs/{id} and GET /v0/runs/{id}/trace
  
  HOW NODES ACCESS PREVIOUS DATA:
  - Expressions: {{ $('mesh_gen_1').json.element_count }} → 45000
  - Artifact refs: {{ $('mesh_gen_1').artifacts.mesh_output }} → "art_002"
  - The scheduler resolves these at DISPATCH TIME by looking up runData
```

---

## 5. DATA FLOW BETWEEN NODES

### The Data Envelope

```
WHAT FLOWS ON EACH EDGE:

{
  "items": [
    {
      "json": {
        "max_stress": 187.3,
        "safety_factor": 1.34,
        "element_count": 45000,
        "converged": true
      },
      "artifacts": {
        "result": "art_003",
        "mesh_output": "art_002"
      },
      "metadata": {
        "source_node": "fea_solver_1",
        "run_id": "run_xyz789",
        "node_run_id": "nrun_003",
        "cost_usd": 0.50,
        "duration_ms": 15000
      }
    }
  ]
}

KEY PRINCIPLE:
  Artifacts (files) NEVER flow directly between nodes.
  Only REFERENCES (artifact IDs) flow.
  The actual files live in MinIO/S3.
  Each node downloads the artifacts it needs from S3 at execution time.
  
  This is critical because engineering files can be GIGABYTES.
  Passing them in-memory (like n8n does) would be impossible.
```

### Input/Output Mapping

```
MAPPING IS DEFINED IN THE WORKFLOW NODE CONFIG:

Node: "fea_solver_1"
Config:
{
  "parameters": {
    "mesh_file": "{{ $('mesh_gen_1').artifacts.mesh_output }}",
    "threshold": "{{ $('webhook_1').json.threshold }}",
    "material": "{{ $('webhook_1').json.material }}",
    "output_format": "vtk"
  }
}

HOW IT WORKS:
  1. User connects Mesh Generator output → FEA Solver input in the canvas
  2. User opens FEA Solver's Node Inspector
  3. For each input parameter, user defines WHERE the value comes from:
     - Static value: "vtk" (hardcoded)
     - Expression: {{ $('node_name').json.field }} (dynamic from upstream)
     - Default: not specified → uses tool contract default
  4. At runtime, scheduler RESOLVES all expressions before dispatching the Job
```

### Expression System

```
DUAL SYNTAX — Airaie supports two expression formats.
The compiler translates between them. Both are valid.

═══════════════════════════════════════════════════════════════
FORMAT 1: DSL (programmatic — used in YAML definitions)
═══════════════════════════════════════════════════════════════

  {{ $inputs.geometry }}                    — workflow-level input
  {{ $inputs.material }}                    — workflow-level input
  {{ $nodes.mesh_gen_1.outputs.mesh }}      — specific node output by ID
  {{ $nodes.fea_solver_1.outputs.result }}  — specific node output by ID

  USE WHEN: writing YAML DSL files, API calls, CI/CD pipelines,
            programmatic workflow construction

═══════════════════════════════════════════════════════════════
FORMAT 2: CANVAS (n8n-style — used in the visual editor)
═══════════════════════════════════════════════════════════════

  {{ $('Node Name').json.field }}           — upstream node's JSON output field
  {{ $('Node Name').artifacts.name }}       — upstream node's artifact reference
  {{ $('Node Name').json.nested.deep }}     — nested JSON field access

  USE WHEN: editing expressions in the Workflow Editor canvas UI,
            interacting with the visual node inspector

═══════════════════════════════════════════════════════════════
COMPILER TRANSLATION
═══════════════════════════════════════════════════════════════

  The compiler maintains a node-name ↔ node-id mapping and
  translates between formats during compilation:

  Canvas → DSL:
    {{ $('Mesh Generator').json.element_count }}
      → {{ $nodes.mesh_gen_1.outputs.element_count }}

  DSL → Canvas (for editor display):
    {{ $nodes.mesh_gen_1.outputs.element_count }}
      → {{ $('Mesh Generator').json.element_count }}

  Both formats compile to the same AST representation.

═══════════════════════════════════════════════════════════════
SHARED VARIABLES (available in both formats)
═══════════════════════════════════════════════════════════════

  {{ $trigger.json.field }}               — trigger/webhook data shortcut
  {{ $trigger.artifacts.name }}           — trigger artifact shortcut
  
  {{ $run.id }}                           — current run ID
  {{ $run.startedAt }}                    — run start timestamp
  {{ $workflow.name }}                    — workflow name
  {{ $workflow.version }}                 — workflow version number
  
  {{ $env.VARIABLE_NAME }}               — environment variable
  {{ $now }}                              — current timestamp (ISO)
  
  {{ $gate('Gate Name').status }}         — gate evaluation result
  {{ $gate('Gate Name').passed }}         — boolean: did gate pass?
  
  {{ $cost.total }}                       — accumulated run cost so far
  {{ $cost.remaining }}                   — remaining budget

EXPRESSIONS ARE EVALUATED:
  - At DISPATCH TIME for each node (not at compile time)
  - By the Go Workflow Scheduler
  - Using the current runData state
  - If an expression references a node that hasn't run yet → ERROR
```

### Handling Mismatched Schemas

```
SCENARIO:
  Tool A outputs: { "stress_results": { "max": 187.3, "unit": "MPa" } }
  Tool B expects: { "threshold_value": 187.3 }

SOLUTION: Use expressions to extract and transform:

  Tool B input config:
  {
    "threshold_value": "{{ $('Tool A').json.stress_results.max }}"
  }

  The expression $('Tool A').json.stress_results.max extracts 187.3
  and maps it to threshold_value.

SOLUTION 2: Use a Transform node between them:

  [Tool A] → [Transform] → [Tool B]
  
  Transform config:
  {
    "mode": "map_fields",
    "mapping": {
      "threshold_value": "{{ $json.stress_results.max }}",
      "material_name": "{{ $json.material_info.name }}",
      "is_valid": "{{ $json.stress_results.max < 250 }}"
    }
  }

COMPILE-TIME VALIDATION:
  The compiler checks:
  1. Every required input has a connection or static value
  2. Connected output TYPE matches input TYPE:
     - artifact → artifact ✓
     - number → number ✓
     - json.field → number ✓ (expression extracts the value)
     - number → artifact ✗ ERROR
  3. If types are incompatible → compile error with clear message
```

---

## 6. CONDITIONAL LOGIC & BRANCHING

### IF Condition Node

```
CONFIGURATION:
{
  "type": "condition",
  "name": "Check Stress Threshold",
  "parameters": {
    "condition": "{{ $('FEA Solver').json.metrics.max_stress < $('Webhook').json.threshold }}",
    "true_label": "Within Limit",
    "false_label": "Over Limit"
  }
}

EXECUTION:
  1. Scheduler evaluates the condition expression at runtime
  2. Result is boolean: true or false
  3. TRUE → data flows to output branch 0 (Result Analyzer)
  4. FALSE → data flows to output branch 1 (AI Optimizer)
  5. The branch NOT taken has its downstream nodes SKIPPED
  6. No Job dispatch needed — condition evaluates instantly in the scheduler

CANVAS REPRESENTATION:
  [FEA Solver] → [IF: stress < threshold?]
                     ├── TRUE → [Result Analyzer] → [Report]
                     └── FALSE → [AI Optimizer] → [Retry FEA]
```

### Switch Node

```
CONFIGURATION:
{
  "type": "switch",
  "name": "Route by Material Type",
  "parameters": {
    "switch_on": "{{ $('Webhook').json.material_category }}",
    "cases": [
      { "value": "metal", "label": "Metal Analysis" },
      { "value": "polymer", "label": "Polymer Analysis" },
      { "value": "composite", "label": "Composite Analysis" }
    ],
    "default": "Metal Analysis"
  }
}

EXECUTION:
  1. Evaluates switch_on expression
  2. Matches against cases
  3. Routes data to the matching output branch
  4. All other branches SKIPPED
  5. If no match → routes to default
```

### Merge Node

```
CONFIGURATION:
{
  "type": "merge",
  "name": "Combine FEA + CFD Results",
  "parameters": {
    "mode": "wait_all",
    "combine": "append"
  }
}

MODES:
  "wait_all" — waits for ALL upstream nodes to complete, then merges
  "first" — passes through data from whichever upstream completes first
  "append" — combines all upstream outputs into a single array

EXECUTION:
  1. Merge has N incoming edges (e.g., from FEA Solver and CFD Engine)
  2. When first upstream completes → Merge tracks it but doesn't execute yet
  3. When ALL upstreams complete → Merge executes
  4. Merge combines the data:
     {
       json: {
         fea_results: { max_stress: 187.3 },
         cfd_results: { max_temp: 78.2 }
       },
       artifacts: {
         stress_map: "art_003",
         flow_field: "art_007"
       }
     }
  5. Dispatches downstream nodes with merged data
```

---

## 7. WORKFLOW RUNS

### What Is a Run?

```
A RUN is a single execution instance of a workflow.
You define a workflow ONCE, but run it MANY times.

Each run has:
  - run_id: "run_xyz789" (unique identifier)
  - workflow_id: "wf_fea_val_001" (which workflow)
  - workflow_version: 3 (which version of the workflow)
  - status: PENDING | RUNNING | SUCCEEDED | FAILED | CANCELED | AWAITING_APPROVAL
  - inputs: the trigger data that started this run
  - runData: per-node execution state and outputs
  - node_runs: list of per-node execution records
  - artifacts: all artifacts produced during this run
  - cost: total compute cost
  - timing: started_at, completed_at, duration
  - actor: who/what triggered this run (user_id, webhook, schedule)
```

### Run Lifecycle

```
┌─────────┐     ┌─────────┐     ┌───────────┐
│ PENDING  │ ──→ │ RUNNING │ ──→ │ SUCCEEDED │
└─────────┘     └────┬────┘     └───────────┘
                     │
                     ├──→ ┌────────┐
                     │    │ FAILED │
                     │    └────────┘
                     │
                     ├──→ ┌──────────┐
                     │    │ CANCELED │
                     │    └──────────┘
                     │
                     └──→ ┌────────────────────┐
                          │ AWAITING_APPROVAL  │ ──→ RUNNING (when approved)
                          └────────────────────┘

PENDING:            Run created, not yet started (momentary state)
RUNNING:            At least one node is executing or queued
SUCCEEDED:          All nodes completed (or skipped) without unrecoverable error
FAILED:             A critical node failed and the workflow could not continue
CANCELED:           User or system canceled the run mid-execution
AWAITING_APPROVAL:  Run paused at a Gate node or agent escalation requiring
                    human approval. Published to airaie.jobs.approval.wait.
                    Resumes to RUNNING when approval is granted via UI.
```

### NodeRun Lifecycle

```
Each node in a workflow has its own NodeRun record with 8 possible states:

  QUEUED | RUNNING | RETRYING | BLOCKED | SUCCEEDED | FAILED | SKIPPED | CANCELED

STATE MACHINE (full transitions):

  draft → ready, blocked, skipped
  ready → queued, blocked, skipped
  queued → running, blocked, skipped
  running → completed, failed, blocked, skipped
  failed → ready (retry), skipped
  completed → skipped (override)

DIAGRAM:

                     ┌────────────┐
                     │   BLOCKED  │ ←── (waiting for dependency or approval)
                     └──────┬─────┘
                            │ (dependency satisfied / approved)
                            ↓
  ┌────────┐     ┌─────────┐     ┌───────────┐
  │ QUEUED │ ──→ │ RUNNING │ ──→ │ SUCCEEDED │
  └────────┘     └────┬────┘     └───────────┘
                      │
                      ├──→ ┌────────┐     ┌──────────┐
                      │    │ FAILED │ ──→ │ RETRYING │ ──→ (back to QUEUED)
                      │    └────────┘     └──────────┘
                      │
                      ├──→ ┌─────────┐
                      │    │ SKIPPED │
                      │    └─────────┘
                      │
                      └──→ ┌──────────┐
                           │ CANCELED │
                           └──────────┘

STATE DESCRIPTIONS:
  QUEUED:     Job dispatched to NATS but not yet picked up by runner
  RUNNING:    Runner is executing the container
  RETRYING:   Between retry attempts (failed, waiting for backoff before re-queue)
  BLOCKED:    Waiting for upstream dependency or human approval to proceed
  SUCCEEDED:  Container exited with code 0, outputs captured
  FAILED:     Container exited non-zero, timeout, OOM, or retries exhausted
  SKIPPED:    Node was on a branch not taken (IF condition false path)
  CANCELED:   User canceled the run mid-execution, node was terminated
```

### What Data Is Stored Per Run

```
TABLE: runs
  id:           "run_xyz789"
  project_id:   "proj_default"
  workflow_id:  "wf_fea_val_001"
  run_type:     "workflow"
  status:       "SUCCEEDED"
  inputs_json:  { geometry: "art_001", material: "Al6061", ... }
  outputs_json: { report: "art_005", summary: { pass: true, ... } }
  actor:        "user_santhosh" (or "webhook" or "schedule")
  started_at:   "2026-03-30T10:42:00Z"
  completed_at: "2026-03-30T10:42:28Z"
  created_at:   "2026-03-30T10:42:00Z"

TABLE: node_runs
  id:              "nrun_001"
  run_id:          "run_xyz789"
  node_id:         "fea_solver_1"
  job_id:          "job_fea_001"
  tool_ref:        "fea-solver@2.1.0"
  status:          "SUCCEEDED"
  attempt:         1
  output_artifacts: ["art_003"]
  cost_estimate:   0.50
  cost_actual:     0.50
  started_at:      "2026-03-30T10:42:07Z"
  completed_at:    "2026-03-30T10:42:22Z"
```

---

## 8. ERROR HANDLING

### What Happens When a Node Fails

```
DECISION TREE:

  Node fails (exit code non-zero, timeout, or OOM)
       │
       ├── Has retry config?
       │   ├── YES: attempt < max_retries?
       │   │   ├── YES → NodeRun status: RETRYING → wait (backoff) → re-dispatch → try again
       │   │   └── NO → retries exhausted → go to failure handling
       │   └── NO → go to failure handling
       │
       └── Failure handling:
           │
           ├── Node has "critical: true" (default)?
           │   └── ABORT entire workflow → Run status = FAILED
           │       All pending/queued nodes → CANCELED
           │       Error details stored in Run record
           │
           ├── Node has "critical: false"?
           │   └── SKIP this node → mark as FAILED
           │       Continue with other branches
           │       Downstream nodes of this node → SKIPPED
           │       Workflow may still SUCCEED if other paths complete
           │
           └── Node has error output branch?
               └── Route error data to the error branch
                   Error branch handles the failure (e.g., notification, retry)
                   Main branch → SKIPPED
```

### Node Error Configuration

```
Each node in the workflow can configure error behavior:

{
  "node_id": "fea_solver_1",
  "error_handling": {
    "on_error": "abort",        // "abort" | "skip" | "continue" | "error_branch"
    "retry": {
      "max_retries": 3,
      "wait_between_sec": 10,
      "backoff": "exponential"  // "fixed" | "exponential"
    },
    "critical": true,           // if true and fails, entire workflow fails
    "timeout_sec": 300
  }
}

OPTIONS:
  "abort" (default):  Stop the entire workflow on failure
  "skip":             Mark this node as failed, skip downstream, continue other branches
  "continue":         Pass error info as output data, downstream sees error data
  "error_branch":     Route to a special error output (like IF false branch)
```

---

## 9. WORKFLOW VERSIONING

### Version Lifecycle

```
STATES:
  draft → compiled → published

  DRAFT:
    - Editable in the Workflow Editor canvas
    - Can be saved and modified
    - Cannot be triggered by webhooks/schedules in production
    - Can be manually run for testing (manual trigger only)

  COMPILED:
    - DSL has been validated and compiled to AST
    - All tool references resolved and validated
    - All expressions syntax-checked
    - All types validated (input/output compatibility)
    - Cycle detection passed
    - Ready to publish

  PUBLISHED:
    - Immutable — cannot be edited
    - Can be triggered by all trigger types (webhook, schedule, event)
    - Visible in production
    - Has a semantic version number (v1, v2, v3, ...)
    - Multiple versions can be published simultaneously
    - One version is "active" (the one that receives triggers)
```

### Compiler Pipeline

```
WHAT HAPPENS WHEN USER CLICKS "COMPILE":

  POST /v0/workflows/compile
  Body: { dsl_yaml: "..." }

  The compiler processes the YAML through a 5-stage pipeline:

  ┌──────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────┐
  │  PARSER  │ →  │ RESOLVER │ →  │ DAG BUILDER │ →  │ TYPE CHECKER │ →  │ AST OUTPUT │
  └──────────┘    └──────────┘    └─────────────┘    └──────────────┘    └────────────┘

  STAGE 1: PARSER (strict validation)
    Parse YAML DSL into structured JSON.
    Validates syntax, required fields, and structure.
    Rejects malformed YAML immediately with line/column errors.

  STAGE 2: RESOLVER (variable resolution)
    Resolves all variable references in expressions:
      $inputs.X        → maps to workflow-level input parameter X
      $nodes.X.outputs.Y → maps to node X's output port Y
    Validates that referenced nodes and ports exist.
    Translates canvas-format expressions to DSL-format for internal use.

  STAGE 3: DAG BUILDER (cycle detection + topological sort)
    Builds the directed acyclic graph from node connections.
    Cycle detection via Kahn's algorithm:
      1. Compute in-degree for every node
      2. Seed queue with in-degree-0 nodes
      3. Process queue, decrementing children's in-degree
      4. If processed count != total nodes → CYCLE DETECTED → reject
    Produces topological ordering for execution.

  STAGE 4: TYPE CHECKER (contract-based port compatibility)
    For each connection (edge) in the DAG:
      - Look up source node's output port type (from tool contract)
      - Look up target node's input port type (from tool contract)
      - Verify type compatibility (number→number ✓, artifact→artifact ✓, number→artifact ✗)
    For each required input without a connection:
      - Verify a default value or static parameter is provided
    Result: all type mismatches caught and reported with clear error messages.

  STAGE 5: AST OUTPUT (with execution levels for parallelism)
    Create Abstract Syntax Tree with:
      - Resolved references and validated types
      - Execution levels (groups of nodes that can run in parallel):
          Level 0: [trigger nodes]
          Level 1: [nodes depending only on level 0]
          Level 2: [nodes depending only on levels 0-1]
          ...
      - This enables the ExecutionPlanBuilder to dispatch entire levels concurrently
    
  OUTPUT:
    { status: "compiled", ast: {...}, warnings: [...], errors: [...] }
    If errors → compilation fails, user sees error messages in editor
    If only warnings → compilation succeeds with informational messages
```

### Workflow Validator

```
The validator runs 7 checks during compilation:

CHECK 1: STRUCTURE VALIDATION
  - api_version field present and supported
  - kind field matches expected workflow type
  - All identifiers match: ^[a-z][a-z0-9_-]{0,63}$
  - Required top-level fields present (name, nodes, connections)

CHECK 2: TOOL REFERENCE FORMAT
  - Every tool_ref follows name@version format (e.g., "fea-solver@2.1.0")
  - Version string is valid semver
  - No bare tool names without version pinning

CHECK 3: VARIABLE RESOLUTION
  - All {{ $inputs.X }} references map to declared workflow inputs
  - All {{ $nodes.X.outputs.Y }} references map to existing node IDs and output ports
  - No dangling references to non-existent nodes or ports

CHECK 4: DAG VALIDATION
  - No cycles in the graph (Kahn's algorithm)
  - All edge source/target node IDs exist in the nodes list
  - No self-referencing edges (node → same node)
  - At least one root node (in-degree 0)

CHECK 5: TOOL AVAILABILITY
  - Every referenced tool exists in the tool registry
  - Every referenced tool version has status "published"
  - Tool contracts are fetchable for type checking

CHECK 6: CONDITION SYNTAX
  - All {{ }} expressions parse without syntax errors
  - IF/Switch condition expressions return appropriate types (boolean for IF)
  - Nested field access paths are syntactically valid

CHECK 7: LINT WARNINGS (non-blocking)
  - Implicit dependencies (node references upstream data without explicit edge)
  - Unreachable nodes (no path from any root to this node)
  - Unused inputs (workflow input declared but never referenced)
  - Redundant edges (duplicate connections between same nodes)
```

---

## 10. WORKFLOW → TOOL INTERACTION

### How Workflow Calls a Tool

```
SEQUENCE:

  1. SCHEDULER determines Tool node is ready (all deps satisfied)
  
  2. RESOLVE INPUTS
     For each input in the tool contract:
       - Look up the value source (expression, static, default)
       - Evaluate expressions against current runData
       - Resolve artifact references to artifact IDs
     
  3. PREFLIGHT CHECK
     PreflightService validates (6 universal + domain-specific checks):
     
     UNIVERSAL CHECKS:
       1. Input schema validation — all inputs match tool contract JSON Schema
          (required fields present, types correct, enums valid)
       2. Artifact version pinning — all referenced artifacts have version IDs,
          no unversioned or dangling artifact references
       3. Unit consistency — physical units match across connected node ports
          (e.g., input expects MPa, upstream outputs MPa, not PSI)
       4. Quota availability — project has sufficient remaining credits
          for estimated execution cost
       5. Governance compliance — required approval roles are configured
          for any downstream Gate nodes that need them
       6. Tool version availability — all tool versions referenced in the
          workflow are in "published" status (not draft, deprecated, or archived)
     
     DOMAIN-SPECIFIC CHECKS:
       7. Domain validators — loaded from IntentTypeDefinition for the
          workflow's domain (e.g., structural, thermal, CFD).
          Examples:
            - Structural: mesh element quality > threshold, boundary conditions defined
            - Thermal: material thermal properties present, ambient temp specified
            - CFD: mesh is watertight, inlet/outlet boundary conditions set
          These validators are pluggable — each IntentType registers its own.
     
     Any check failure → NodeRun: FAILED with detailed preflight error message.
     The run does NOT dispatch the job — fast failure before compute spend.
     
  4. BUILD JOB PAYLOAD
     {
       job_id: generate_unique_id(),
       run_id: current_run_id,
       node_id: node_id,
       tool_ref: "fea-solver@2.1.0",
       image: "registry.airaie.io/fea-solver:2.1",
       adapter: "docker",
       inputs: [resolved_input_values],
       limits: { cpu: 4, memory_mb: 2048, timeout_sec: 300 },
       policy: { network: "deny", fs: "sandbox" },
       artifact_urls: { art_002: "presigned_download_url" },
       output_upload_urls: { result: "presigned_upload_url" }
     }
     
  5. PUBLISH to NATS: airaie.jobs.tool.execution
  
  6. CREATE NodeRun record: status = QUEUED
  
  7. WAIT for Result on NATS: airaie.results.completed (async)
  
  8. PROCESS RESULT when received:
     - Update NodeRun status
     - Store output data in runData
     - Create artifact records
     - Check what nodes are now ready
     - Dispatch next nodes
```

---

## 11. WORKFLOW → AGENT INTERACTION

### When an Agent Gets Invoked

```
An Agent Node is just another node in the DAG.
It is dispatched exactly like a Tool Node, BUT:

  - Instead of running a Docker container, it runs the Agent Runtime
  - The Agent Runtime is a Go service (internal/service/runtime.go)
  - It manages the LLM conversation loop internally
  - The Agent may call MULTIPLE tools during its execution
  - But to the workflow, it's a SINGLE node that eventually produces output
  - Job published to airaie.jobs.agent.execution (not tool.execution)

WORKFLOW PERSPECTIVE:
  [Mesh Gen] → [AI Optimizer Agent] → [Gate]
  
  The workflow scheduler treats the agent like any other node:
  1. Mesh Gen completes → Agent's deps satisfied → dispatch Agent
  2. Agent runs (internally may call 3 tools over 30 seconds)
  3. Agent produces final output
  4. Scheduler receives result → dispatches Gate

INSIDE THE AGENT (invisible to workflow):
  Iteration 1: Agent selects mesh-generator → runs → gets result
  Iteration 2: Agent selects fea-solver → runs → gets result
  Iteration 3: Agent evaluates → goal achieved → returns final output
  
  All 3 iterations happen within the Agent node's single execution.
  The workflow doesn't know about the internal iterations.
```

### Does the Agent Decide the Next Workflow Step?

```
NO — the workflow DAG is FIXED at design time.
The agent does NOT change the workflow graph.

WHAT THE AGENT DECIDES:
  - WHICH tools to call (from its allowed tools list)
  - WHAT inputs to pass to those tools
  - HOW MANY iterations to run (within its max_iterations limit)
  - WHAT to output as its final result

WHAT THE WORKFLOW DECIDES:
  - WHERE the agent sits in the DAG (between which nodes)
  - WHAT data the agent receives as input (from upstream nodes)
  - WHAT happens AFTER the agent (downstream nodes)
  - WHETHER the agent's output meets conditions (IF/Gate nodes after agent)

THIS IS THE HYBRID MODEL:
  - Workflow provides STRUCTURE (static DAG)
  - Agent provides INTELLIGENCE (dynamic decisions within its node)
  - Best of both worlds: predictable pipeline with smart decision points
```

---

## 12. EXECUTION PLAN

### What Is an ExecutionPlan?

```
An ExecutionPlan is the INTERMEDIARY between a workflow definition and
a live execution. It is created after compilation but before a run starts.

PURPOSE:
  - Gives users a preview of WHAT will execute before it runs
  - Enables cost/time estimation before committing compute
  - Allows editing of parameters without changing the workflow definition
  - Tracks the lifecycle from plan → validation → execution → completion
  - Links intent cards to concrete workflow runs

WHEN IT'S CREATED:
  1. User triggers a workflow (or an IntentCard generates a plan)
  2. The compiled AST is used to build an ExecutionPlan
  3. The plan is presented for review (editable parameters, cost estimate)
  4. User confirms → plan transitions to "executing" → Run is created
```

### ExecutionPlan Structure

```
ExecutionPlan {
  id:               "plan_abc123"          // unique plan identifier
  card_id:          "card_intent_456"      // optional: linked IntentCard
  pipeline_id:      "pipe_fea_val"         // optional: linked Pipeline

  nodes: PlanNode[]
    PlanNode {
      node_id:      "mesh_gen_1"           // matches workflow node ID
      tool_id:      "tool_mesh_gen"        // resolved tool ID
      tool_version: "1.0.0"               // pinned tool version
      role:         "preprocess"           // semantic role in the plan
      parameters:   { density: 0.8, ... } // resolved parameters (editable)
      is_editable:  true                   // can user change params before run?
      is_required:  true                   // can this node be skipped?
      status:       "pending"              // per-node plan status
    }

  edges: PlanEdge[]
    PlanEdge {
      from_node_id: "mesh_gen_1"
      to_node_id:   "fea_solver_1"
    }

  bindings: map
    Maps intent-level inputs to concrete node input ports:
    {
      "geometry":      "mesh_gen_1.inputs.geometry",
      "material":      "fea_solver_1.inputs.material",
      "load_newtons":  "fea_solver_1.inputs.load"
    }

  expected_outputs: ["stress_report", "contour_image", "pass_fail_summary"]
  cost_estimate:    130                    // estimated credits
  time_estimate:    "2h30m"                // estimated wall-clock time
  
  status:           "draft" | "validated" | "executing" | "completed" | "failed"
  workflow_id:      "wf_fea_val_001"       // linked after compilation
  run_id:           "run_xyz789"           // linked after execution starts
}

PLANNODE ROLES:
  validate_input  — validates incoming data/files before processing
  preprocess      — prepares data for the main computation (meshing, formatting)
  solve           — primary computation (FEA, CFD, optimization)
  postprocess     — transforms raw results into usable outputs
  report          — generates human-readable reports, visualizations
  evidence        — collects artifacts for governance/compliance boards
  approval        — gate requiring human sign-off before proceeding

LIFECYCLE:
  draft       — plan created, parameters editable, awaiting user confirmation
  validated   — preflight checks passed, cost estimated, ready to execute
  executing   — run created and in progress, workflow_id and run_id linked
  completed   — run finished successfully, all expected outputs produced
  failed      — run failed or was canceled
```

---

## 13. REAL EXECUTION EXAMPLE

### FEA Validation Workflow — Complete Walkthrough

```
WORKFLOW DEFINITION:

  Name: "FEA Validation Pipeline"
  Version: 3 (Published)
  Trigger: Webhook (POST /validate)
  
  Nodes:
    1. webhook_1 (Trigger — Webhook)
    2. mesh_gen_1 (Tool — mesh-generator@1.0)
    3. fea_solver_1 (Tool — fea-solver@2.1)
    4. condition_1 (Condition — stress check)
    5. result_analyzer_1 (Tool — result-analyzer@1.0) [TRUE branch]
    6. optimizer_agent_1 (Agent — fea-optimizer@2.0) [FALSE branch]
    7. evidence_gate_1 (Gate — evidence gate) [after TRUE branch]
  
  Connections:
    webhook_1 → mesh_gen_1
    mesh_gen_1 → fea_solver_1
    fea_solver_1 → condition_1
    condition_1 [true] → result_analyzer_1
    condition_1 [false] → optimizer_agent_1
    result_analyzer_1 → evidence_gate_1

  DAG visualization:
    [Webhook] → [Mesh Gen] → [FEA Solver] → [IF stress OK?]
                                                 ├── YES → [Analyzer] → [Gate]
                                                 └── NO  → [AI Optimizer]
```

```
═══════════════════════════════════════════════════════════════
EXECUTION: HAPPY PATH (stress within limits)
═══════════════════════════════════════════════════════════════

INCOMING REQUEST:
  POST https://api.airaie.io/v0/hooks/fea-validate-abc123
  {
    "geometry": <bracket_v3.step>,
    "material": "Al6061-T6",
    "load_newtons": 500,
    "threshold_mpa": 250
  }

T=0.0s  WEBHOOK TRIGGER
  ├── File uploaded → art_cad_001
  ├── Run created: run_xyz789, status: PENDING → RUNNING
  ├── NodeRun webhook_1: SUCCEEDED (instant)
  ├── Output: { json: {material:"Al6061-T6", load:500, threshold:250}, artifacts: {geometry:"art_cad_001"} }
  └── Ready nodes: [mesh_gen_1]

T=0.1s  MESH GENERATOR
  ├── Inputs resolved: geometry="art_cad_001", density=0.8, element_type="hex8"
  ├── Job dispatched → NATS (airaie.jobs.tool.execution) → Rust Runner
  ├── Docker: mesh-generator:1.0 starts
  ├── Downloads bracket_v3.step from MinIO
  ├── Generates mesh: 45,000 hex8 elements, quality 0.95
  ├── Uploads mesh_output.stl → art_mesh_002
  ├── Duration: 7.2s, Cost: $0.30
  ├── NodeRun: SUCCEEDED
  └── Ready nodes: [fea_solver_1]

T=7.3s  FEA SOLVER
  ├── Inputs: mesh_file="art_mesh_002", threshold=250, material="Al6061-T6", format="vtk"
  ├── Docker: fea-solver:2.1 starts
  ├── Downloads mesh from MinIO
  ├── Runs analysis: 8 iterations, converged
  ├── Result: max_stress=187.3 MPa, safety_factor=1.34
  ├── Uploads stress_map.vtk → art_stress_003
  ├── Duration: 15s, Cost: $0.50
  ├── NodeRun: SUCCEEDED
  └── Ready nodes: [condition_1]

T=22.3s CONDITION: STRESS CHECK
  ├── Expression: 187.3 < 250 → TRUE
  ├── NodeRun: SUCCEEDED (instant)
  ├── TRUE branch → result_analyzer_1 READY
  ├── FALSE branch → optimizer_agent_1 SKIPPED
  └── Ready nodes: [result_analyzer_1]

T=22.4s RESULT ANALYZER
  ├── Inputs: result="art_stress_003", metrics={max_stress:187.3,...}, threshold=250
  ├── Docker: result-analyzer:1.0
  ├── Generates report PDF, contour PNG, summary JSON
  ├── Uploads → art_report_004, art_contour_005
  ├── Summary: { pass: true, margin: 25.1%, recommendation: "PASS" }
  ├── Duration: 6s, Cost: $0.10
  ├── NodeRun: SUCCEEDED
  └── Ready nodes: [evidence_gate_1]

T=28.4s EVIDENCE GATE
  ├── Requirements check:
  │   [✓] run_succeeded: FEA run completed → YES
  │   [✓] artifact_exists: stress_map.vtk → YES (art_stress_003 exists)
  │   [✓] threshold_met: 187.3 < 250 → YES
  ├── All 3 requirements met → GATE PASSED
  ├── NodeRun: SUCCEEDED (auto-evaluated, instant)
  └── No downstream nodes → leaf node

T=28.4s RUN COMPLETE
  ├── All nodes: webhook ✓, mesh ✓, fea ✓, condition ✓, analyzer ✓, gate ✓
  │              optimizer SKIPPED (false branch not taken)
  ├── Run status: SUCCEEDED
  ├── Total duration: 28.4 seconds
  ├── Total cost: $0.90
  ├── Artifacts produced: 5 (cad, mesh, stress, report, contour)
  ├── Audit event emitted
  ├── Evidence auto-attached to board
  └── SSE pushed to frontend → all green checkmarks
```

```
═══════════════════════════════════════════════════════════════
EXECUTION: FAILURE PATH (stress exceeds threshold)
═══════════════════════════════════════════════════════════════

Same workflow, but with a different geometry that produces high stress.

T=0-22s  Same as above, but FEA result: max_stress = 312 MPa

T=22.3s CONDITION: STRESS CHECK
  ├── Expression: 312 < 250 → FALSE
  ├── TRUE branch → result_analyzer_1 SKIPPED
  ├── FALSE branch → optimizer_agent_1 READY
  └── Ready nodes: [optimizer_agent_1]

T=22.4s AI OPTIMIZER AGENT
  ├── Receives: { max_stress: 312, threshold: 250, geometry: art_cad_001 }
  ├── Job dispatched → NATS (airaie.jobs.agent.execution) → Agent Runtime
  ├── Agent internally:
  │   Iteration 1: "Stress 312 > 250. Need to optimize mesh density."
  │                 Selects mesh-generator with density=0.6 (finer mesh)
  │                 Runs mesh-gen → new mesh with 72,000 elements
  │   Iteration 2: "Re-running FEA with finer mesh"
  │                 Selects fea-solver with new mesh
  │                 Runs FEA → max_stress = 285 MPa (still over)
  │   Iteration 3: "Still over. Suggesting design modification."
  │                 Returns: { recommendation: "increase_thickness", current: 5mm, suggested: 7mm }
  ├── Agent output: optimization recommendations + artifacts
  ├── Duration: 45s (3 internal tool calls), Cost: $2.10
  ├── NodeRun: SUCCEEDED
  └── No downstream nodes (leaf) → workflow continues

T=67.4s RUN COMPLETE
  ├── Status: SUCCEEDED (workflow completed, even though stress was over — 
  │   the agent handled it by providing recommendations)
  ├── Total cost: $3.00
  └── Agent's recommendations available for review
```

---

## 14. MINIMUM SYSTEM REQUIRED

### Components Needed

```
┌───────────────────────────────────────────────────────────────┐
│              MINIMUM VIABLE WORKFLOW SYSTEM                    │
│                                                                │
│  1. WORKFLOW COMPILER (Go)                                    │
│     File: internal/workflow/compiler.go                        │
│     Does: YAML → Parser → Resolver → DAG Builder →           │
│           Type Checker → AST Output (5-stage pipeline)        │
│     Input: YAML DSL text                                      │
│     Output: Compiled AST with execution levels (JSON)         │
│                                                                │
│  2. WORKFLOW VALIDATOR (Go)                                   │
│     File: internal/workflow/validator.go                       │
│     Does: 7 validation checks (structure, tool refs,          │
│           variable resolution, DAG, tool availability,        │
│           condition syntax, lint warnings)                     │
│                                                                │
│  3. WORKFLOW SCHEDULER (Go)                                   │
│     File: internal/workflow/scheduler.go                       │
│     Does: DAG execution, dependency tracking, node dispatch,  │
│           expression resolution, condition evaluation,         │
│           merge handling, failure handling                      │
│     Input: Compiled AST + trigger data                        │
│     Output: Dispatched Jobs + updated Run state               │
│     Components: Scheduler, ExecutionPlanBuilder, Dispatcher,  │
│                 ResultHandler, RetryScheduler,                 │
│                 ConditionEvaluator                             │
│                                                                │
│  4. JOB DISPATCHER (Go)                                       │
│     File: internal/service/run.go                              │
│     Does: Build Job payload, generate presigned URLs,         │
│           publish to NATS, create NodeRun records              │
│                                                                │
│  5. RESULT CONSUMER (Go)                                      │
│     File: internal/service/run.go (StartResultConsumer)        │
│     Does: Consume Results from NATS, update NodeRun status,   │
│           create artifacts, notify scheduler of completion     │
│                                                                │
│  6. PREFLIGHT SERVICE (Go)                                    │
│     File: internal/workflow/preflight.go                       │
│     Does: 6 universal checks + domain-specific validators     │
│           (schema, artifacts, units, quota, governance, tools) │
│                                                                │
│  7. TOOL RUNNER (Rust)                                        │
│     File: runner/src/                                          │
│     Does: Execute Docker containers, manage I/O, enforce      │
│           policies, stream logs, report results                │
│                                                                │
│  8. INFRASTRUCTURE                                            │
│     PostgreSQL: workflows, workflow_versions, runs, node_runs, │
│                 artifacts, tools, tool_versions,               │
│                 execution_plans                                 │
│     NATS JetStream:                                           │
│       airaie.jobs.tool.execution                              │
│       airaie.jobs.agent.execution                             │
│       airaie.jobs.approval.wait                               │
│       airaie.events.{runId}                                   │
│       airaie.results.completed                                │
│       airaie.execution.completed                              │
│     MinIO: artifact storage with presigned URLs                │
│     Docker: container runtime for tool execution               │
│                                                                │
│  9. API ENDPOINTS                                             │
│     POST /v0/workflows — create workflow                      │
│     POST /v0/workflows/compile — compile DSL                  │
│     POST /v0/workflows/{id}/versions/{v}/publish — publish    │
│     POST /v0/runs — start workflow run                        │
│     GET  /v0/runs/{id} — get run status                       │
│     GET  /v0/runs/{id}/stream — SSE real-time updates         │
│     POST /v0/runs/{id}/cancel — cancel run                    │
│                                                                │
│  ALL OF THIS ALREADY EXISTS IN YOUR CODEBASE.                 │
│  The architecture is implemented. The system works.            │
│  This document describes HOW it works.                        │
└───────────────────────────────────────────────────────────────┘
```

### System Flow Summary

```
THE COMPLETE FLOW:

  USER designs workflow on canvas
       ↓
  Canvas state serialized to YAML DSL
       ↓
  COMPILER validates and compiles to AST (5-stage pipeline)
       ↓
  VALIDATOR runs 7 checks (structure, refs, DAG, types, availability, syntax, lint)
       ↓
  User PUBLISHES version
       ↓
  TRIGGER fires (webhook / schedule / manual)
       ↓
  EXECUTIONPLANBUILDER creates ExecutionPlan from AST
       ↓
  PREFLIGHT SERVICE runs 6 universal + domain checks
       ↓
  SCHEDULER creates Run, identifies root nodes
       ↓
  For each ready node:
    SCHEDULER resolves expressions → DISPATCHER builds Job → publishes to NATS
       ↓
  RUNNER consumes Job → downloads artifacts → runs container → uploads outputs → publishes Result
       ↓
  RESULTHANDLER updates status → checks what's ready next → loops back to scheduler
       ↓
  If retry needed → RETRYSCHEDULER handles backoff → re-dispatches
       ↓
  If gate/approval needed → Run status: AWAITING_APPROVAL → waits for human
       ↓
  When all nodes complete → Run = SUCCEEDED
       ↓
  Publishes to airaie.execution.completed
  SSE pushes updates to frontend
  Evidence collected for boards
  Audit trail recorded
```

---

*Generated: 2026-04-06*
*Based on: Airaie System Analysis, existing codebase architecture, and implementation patterns*
