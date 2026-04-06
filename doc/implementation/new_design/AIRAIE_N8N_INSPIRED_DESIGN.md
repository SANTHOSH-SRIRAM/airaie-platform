# AIRAIE UNIFIED STUDIO -- n8n-Inspired System Design

> Complete UI + Architecture + Workflow Model Design
> Inspired by n8n, tailored for engineering tools, AI agents, and governance
> Date: 2026-03-31

---

## STEP 1: CONCEPT MAPPING (Airaie <-> n8n)

### Core Mapping Table

| # | Airaie Concept | n8n Equivalent | New Unified Design | Why Different |
|---|---------------|----------------|---------------------|---------------|
| 1 | **Tool** (FEA solver, CFD engine) | **Node** (Slack, HTTP Request) | **Tool Node** -- a canvas node backed by a versioned, containerized tool contract | Airaie tools run in Docker containers with resource limits; n8n nodes are in-process JS functions |
| 2 | **Agent** (LLM-powered decision maker) | **AI Agent Node** (LangChain wrapper) | **Agent Node** -- a special canvas node with sub-ports for model, memory, tools, policy | Airaie agents have built-in governance (policies, approval thresholds, budget limits) that n8n agents lack |
| 3 | **Workflow** (YAML DSL DAG) | **Workflow** (JSON nodes + connections) | **Workflow** -- visual canvas DAG that serializes to both JSON (canvas state) and YAML DSL (execution contract) | Same concept, but Airaie adds versioning lifecycle (draft -> compiled -> published) and compilation step |
| 4 | **Run / Execution** | **Execution** | **Run** -- async distributed execution via NATS + Rust runner, not in-process | Airaie runs in isolated Docker containers on separate workers; n8n runs in-process Node.js |
| 5 | **Board** (research/engineering) | *No equivalent* | **Board** -- a governance container that wraps workflows with evidence, gates, and release criteria | Entirely new concept -- n8n has nothing like structured evidence governance |
| 6 | **Gate** (approval checkpoint) | *No equivalent* (manual approval via Wait node) | **Gate Node** -- a canvas node that pauses execution until requirements are met (evidence, signatures, compliance) | n8n's Wait node is a simple pause; Airaie gates evaluate structured requirements |
| 7 | **Artifact** (immutable versioned file) | **Binary Data** (in-memory blob) | **Artifact** -- first-class entity with content hashing, lineage tracking, S3 storage | n8n binary data is ephemeral; Airaie artifacts are persistent, versioned, and traceable |
| 8 | **Tool Contract** (input/output JSON Schema) | **Node Description** (INodeTypeDescription) | **Tool Contract** -- defines inputs, outputs, resource limits, and execution adapter | Similar metadata role, but Airaie contracts include sandbox policies and cost estimates |
| 9 | **Workflow Version** | **Workflow History** (source control) | **Workflow Version** -- first-class entity with draft/compiled/published lifecycle | n8n versioning is basic save history; Airaie versions are publishable with compilation gates |
| 10 | **Policy** (confidence threshold, escalation rule) | *No equivalent* | **Policy** -- configurable rules governing agent behavior (auto-approve, require human review, budget cap) | Unique to Airaie's agent governance model |
| 11 | **Trigger** (cron, webhook, event) | **Trigger Node** (cron, webhook, polling) | **Trigger Node** -- same concept, but adds event-driven triggers from NATS streams | Direct parallel, extended with engineering event sources |
| 12 | **Credential** | **Credential** | **Credential** -- same concept (encrypted API keys, tokens) | Direct parallel |
| 13 | **Expression** (`{{ $json.field }}`) | **Expression** (`{{ $json.field }}`) | **Expression** -- template syntax for referencing upstream node outputs | Adopt n8n's expression system with Airaie-specific context variables (`$artifact`, `$gate`, `$board`) |
| 14 | **Node Creator Panel** | **Node Creator Panel** | **Node Palette** -- categorized panel with Tool nodes, Agent nodes, Logic nodes, Governance nodes | Extended with engineering-specific categories |
| 15 | **NDV (Node Detail View)** | **NDV** | **Node Inspector** -- right-side panel for configuring any node type | Same UX pattern, extended for agent/gate/artifact configuration |
| 16 | **Canvas** | **Canvas** (@vue-flow/core) | **Canvas** (@xyflow/react) | Same concept, Airaie uses React instead of Vue |
| 17 | **Project** | **Project** | **Project** -- same organizational container | Direct parallel |
| 18 | **Release Packet** | *No equivalent* | **Release Packet** -- locked bundle of artifacts, BOM, tolerances for manufacturing handoff | Unique to Airaie's engineering domain |
| 19 | **Sub-workflow** | **Execute Workflow Node** | **Sub-workflow Node** -- embeds another workflow as a single node | Direct parallel |
| 20 | **Cost Tracking** | *No equivalent* | **Cost Tracking** -- per-node and per-run compute cost estimation and actual tracking | Unique to Airaie's resource-intensive engineering workloads |

### Visual Mapping

```
n8n World                              Airaie World
==========                             ============

[Trigger] --> [Node] --> [Node]         [Trigger] --> [Tool Node] --> [Tool Node]
                                                           |
                                                      [Agent Node]
                                                       /    |    \
                                                  [Model] [Tools] [Policy]
                                                           |
                                                      [Gate Node] <-- evidence
                                                           |
                                                      [Tool Node] --> [Artifact]
                                                           |
                                                       [Board] <-- governance wrapper
```

---

## STEP 2: CORE BUILDING BLOCKS

### Entity 1: Tool Node

```
+--------------------------------------------------+
|  TOOL NODE                                        |
|                                                   |
|  What: A canvas node that executes a registered,  |
|        containerized engineering tool              |
|                                                   |
|  Backed by: Tool Registry (versioned contracts)   |
|  Runs in: Docker container via Rust runner         |
|  Has: Input ports, output ports, config panel      |
|  Produces: Artifacts (immutable outputs)           |
|                                                   |
|  Examples:                                        |
|   - FEA Solver (mesh -> stress analysis)          |
|   - CFD Engine (geometry -> flow simulation)      |
|   - Image Processor (image -> measurements)       |
|   - ML Training (dataset -> model)                |
|                                                   |
|  Config Panel:                                    |
|   - Tool version selector                         |
|   - Input parameter form (from tool contract)     |
|   - Resource limits (CPU, memory, timeout)        |
|   - Retry policy                                  |
|   - When condition (conditional execution)         |
+--------------------------------------------------+
```

### Entity 2: Agent Node

```
+--------------------------------------------------+
|  AGENT NODE                                       |
|                                                   |
|  What: A special node that uses an LLM to         |
|        dynamically select and execute tools        |
|                                                   |
|  Sub-ports (like n8n AI Agent node):              |
|   - Model port (LLM provider connection)          |
|   - Tools port (which tools agent can use)        |
|   - Memory port (conversation/context history)    |
|   - Policy port (governance rules)                |
|                                                   |
|  Unique to Airaie:                                |
|   - Confidence scoring (algorithmic + LLM blend)  |
|   - Auto-approve threshold                        |
|   - Budget constraints (max cost, max retries)    |
|   - Escalation rules (when to ask human)          |
|   - Decision tracing (full audit trail)           |
|                                                   |
|  Config Panel:                                    |
|   - Goal (natural language objective)             |
|   - Model selector (Anthropic, OpenAI, etc.)      |
|   - Tool permissions (read/write/execute per tool)|
|   - Scoring strategy (weighted, llm_weight)       |
|   - Policy rules (approval thresholds)            |
|   - Constraints (budget, timeout, max invocations)|
+--------------------------------------------------+
```

### Entity 3: Workflow

```
+--------------------------------------------------+
|  WORKFLOW                                         |
|                                                   |
|  What: A directed acyclic graph of nodes           |
|        defining an automation pipeline             |
|                                                   |
|  Stored as: JSON (canvas state) + YAML DSL        |
|  Lifecycle: draft -> compiled -> published         |
|                                                   |
|  Contains:                                        |
|   - Nodes[] (tools, agents, logic, governance)    |
|   - Connections{} (source -> destination edges)   |
|   - Settings (execution order, save policy)       |
|   - PinData{} (mocked test data per node)         |
|   - Triggers (how workflow is started)            |
|                                                   |
|  Versioned: Each save creates a new version       |
|  Publishable: Only published versions can run     |
|               in production                       |
+--------------------------------------------------+
```

### Entity 4: Run (Execution)

```
+--------------------------------------------------+
|  RUN                                              |
|                                                   |
|  What: A single execution instance of a workflow  |
|                                                   |
|  Lifecycle: PENDING -> RUNNING -> SUCCEEDED       |
|                                  | FAILED          |
|                                  | CANCELED         |
|                                                   |
|  Contains:                                        |
|   - NodeRun[] (per-node execution state)          |
|   - Artifacts[] (produced outputs)                |
|   - Logs (streamed container stdout/stderr)       |
|   - Metrics (duration, memory, CPU, cost)         |
|   - Events[] (audit trail)                        |
|                                                   |
|  Distributed: Jobs dispatched via NATS,           |
|               executed in Rust runner,             |
|               artifacts stored in MinIO            |
+--------------------------------------------------+
```

### Entity 5: Gate Node (Governance)

```
+--------------------------------------------------+
|  GATE NODE                                        |
|                                                   |
|  What: A canvas node that pauses execution         |
|        until governance requirements are met        |
|                                                   |
|  Requirements (configurable list):                |
|   - run_succeeded: a specific run must pass       |
|   - artifact_exists: specific output must exist   |
|   - role_signed: specific role must approve        |
|   - threshold_met: metric exceeds threshold        |
|   - custom: arbitrary condition expression         |
|                                                   |
|  Behaviors:                                       |
|   - Auto-evaluate: check requirements on trigger  |
|   - Manual approval: pause for human review        |
|   - Waivable: can be bypassed with audit trail    |
|                                                   |
|  Config Panel:                                    |
|   - Gate type (evidence, review, compliance)      |
|   - Requirements list (add/remove)                |
|   - Required approvers (roles/users)              |
|   - Auto-evaluate toggle                          |
|   - Timeout (max wait time)                       |
+--------------------------------------------------+
```

### Entity 6: Artifact

```
+--------------------------------------------------+
|  ARTIFACT                                         |
|                                                   |
|  What: An immutable, content-hashed file           |
|        produced by tool execution                  |
|                                                   |
|  Properties:                                      |
|   - Content hash (SHA-256)                        |
|   - Storage URI (s3://bucket/path)                |
|   - Type (dataset, report, cad_model, image)      |
|   - Lineage (which run/node produced it)          |
|   - Metadata (custom key-value pairs)             |
|                                                   |
|  Flows between nodes as data references           |
|  (not in-memory blobs like n8n binary data)        |
|                                                   |
|  Can be:                                          |
|   - Uploaded (presigned URL)                      |
|   - Downloaded (presigned URL)                    |
|   - Converted (async format conversion)           |
|   - Attached to boards as evidence                |
|   - Locked in release packets                     |
+--------------------------------------------------+
```

---

## STEP 3: UI SCREENS DESIGN

### Screen 1: Workflow Editor (The Canvas)

```
+-----------------------------------------------------------------------+
|  [<] Back   My Workflow v3 [tags]    [Editor | Runs | Eval]   [Save] [Publish] |
+-----------------------------------------------------------------------+
|        |                                                        |     |
|  NODE  |                    CANVAS AREA                         | NODE|
|  PALETTE                                                        |INSP-|
|        |   +--------+     +--------+     +---------+           |ECTOR|
| Search |   |Webhook |---->|FEA     |---->|  Gate   |           |     |
| -----  |   |Trigger |     |Solver  |     |Evidence |           | [Node|
| Triggers   +--------+     +--------+     +---------+           |  config|
| Tools  |                       |              |                | form] |
| Agents |                  +--------+     +--------+            |     |
| Logic  |                  |CFD     |     |Release |            |     |
| Govern.|                  |Engine  |     |Builder |            |     |
| Data   |                  +--------+     +--------+            |     |
|        |                                                        |     |
|        |  [Zoom +/-] [Fit] [Tidy] [MiniMap]                    |     |
|        |                                                        |     |
|        |          [   Run Workflow   ] [Chat]                   |     |
+--------+--------------------------------------------------------+-----+
|  Status Bar: Last saved 2m ago | Version 3 (draft) | 5 nodes         |
+-----------------------------------------------------------------------+
```

**Purpose**: Build and edit workflow DAGs visually

**Components**:
- **Node Palette** (left): Categorized node browser (like n8n Node Creator)
- **Canvas** (center): XYFlow-powered DAG editor with drag/drop nodes and bezier edges
- **Node Inspector** (right): Configuration panel for selected node (like n8n NDV)
- **Header**: Workflow name, version, tabs (Editor/Runs/Eval), save/publish
- **Bottom bar**: Run button, chat button (for agent workflows), status

**User Actions**:
- Drag node from palette to canvas
- Connect nodes by dragging from output port to input port
- Double-click node to open inspector
- Click "Run Workflow" to execute
- Ctrl+S to save, Publish to make version production-ready
- Right-click for context menu (execute to here, disable, pin data)

---

### Screen 2: Run Monitor (Execution Screen)

```
+-----------------------------------------------------------------------+
|  [<] Back   My Workflow    [Editor | Runs | Eval]                     |
+-----------------------------------------------------------------------+
| RUN LIST         |              RUN DETAIL                            |
|                  |                                                     |
| Filter: All  v   |  Run #run_a1b2c3  Status: RUNNING                 |
| Date range       |  Started: 2 min ago  Cost: $1.24                   |
|                  |                                                     |
| #a1b2 RUNNING    |  +--------+     +--------+     +---------+         |
| #a1b1 SUCCEEDED  |  |Webhook | OK  |FEA     | ... |  Gate   | PENDING|
| #a1b0 FAILED     |  |Trigger |---->|Solver  |---->|Evidence |         |
| #a0f9 SUCCEEDED  |  +--------+     +--------+     +---------+         |
|                  |                                                     |
|                  |  NODE: FEA Solver                                   |
|                  |  +------------------+------------------+            |
|                  |  | INPUT            | OUTPUT           |            |
|                  |  | mesh_file: art_1 | result: art_2    |            |
|                  |  | threshold: 128   | metrics:         |            |
|                  |  |                  |  duration: 15s   |            |
|                  |  |                  |  peak_mem: 1GB   |            |
|                  |  +------------------+------------------+            |
|                  |                                                     |
|                  |  [Logs] [Artifacts] [Cost] [Timeline]              |
+------------------+-----------------------------------------------------+
```

**Purpose**: Monitor active and past workflow executions

**Components**:
- **Run List** (left sidebar): Filterable list of executions with status badges
- **Canvas Overlay** (top): Workflow with execution badges on each node (green/red/blue spinner)
- **Node Detail** (bottom): Input/output data for selected node
- **Tabs**: Logs (streamed), Artifacts (lineage), Cost (breakdown), Timeline (Gantt-like)

**User Actions**:
- Click run in list to preview
- Click node on canvas to see its input/output data
- View streaming logs
- Download artifacts
- Retry failed runs
- Cancel running executions

---

### Screen 3: Agent Builder

```
+-----------------------------------------------------------------------+
|  [<] Back   FEA Optimizer Agent v2    [Builder | Playground | Eval]   |
+-----------------------------------------------------------------------+
| AGENT GRAPH        |             AGENT CONFIGURATION                  |
|                    |                                                   |
|  +------+         |  Goal:                                            |
|  |Model |         |  [Optimize mesh density for FEA simulation    ]   |
|  |Claude |         |                                                   |
|  +---+--+         |  Model: [Anthropic Claude Sonnet v]               |
|      |            |  LLM Weight: [0.7 ----o---------]                 |
|  +---v--+         |                                                   |
|  |Agent |         |  Tools:                                           |
|  |Node  |         |  +---------------------------------------------+ |
|  +---+--+         |  | Tool          | Permissions | Max Invocations| |
|      |            |  | fea-solver@1  | read,exec   | 5              | |
|  +---v--+         |  | cfd-engine@2  | read,exec   | 3              | |
|  |Policy|         |  | mesh-gen@1    | read,exec   | 10             | |
|  |Engine|         |  +---------------------------------------------+ |
|  +------+         |                                                   |
|                    |  Policy:                                          |
|                    |  Auto-approve threshold: [0.85 ----o---]         |
|                    |  Require approval for: [x] write  [x] delete     |
|                    |  Max cost: [$10.00]  Timeout: [600s]             |
|                    |                                                   |
|                    |  [Save Draft]  [Validate]  [Publish v2]          |
+--------------------+---------------------------------------------------+
```

**Purpose**: Configure AI agent specifications visually

**Components**:
- **Agent Graph** (left): Visual representation of agent pipeline (model -> agent -> policy)
- **Configuration Form** (right): Goal, model, tools, policy, constraints
- **Header Tabs**: Builder (config), Playground (chat test), Eval (regression tests)

**User Actions**:
- Set agent goal in natural language
- Select LLM model and configure weight
- Add/remove tools with permissions
- Configure policy rules (thresholds, approval requirements)
- Set budget and timeout constraints
- Validate spec, save draft, publish version

---

### Screen 4: Tool Registry

```
+-----------------------------------------------------------------------+
|  Tool Registry                              [+ Register Tool]         |
+-----------------------------------------------------------------------+
| Search tools...          Category: [All v]  Status: [Published v]    |
+-----------------------------------------------------------------------+
| TOOL LIST                                                             |
|                                                                       |
| +-------------------------------------------------------------------+ |
| | [icon] FEA Solver                              v2.1.0 | Published| |
| |        Finite element analysis for structural simulation            | |
| |        Inputs: mesh_file, load_config    Outputs: stress_map       | |
| |        Adapter: docker  Image: fea-solver:2.1   Cost: ~$0.50/run  | |
| +-------------------------------------------------------------------+ |
| | [icon] CFD Engine                              v3.0.0 | Published| |
| |        Computational fluid dynamics simulation                      | |
| |        Inputs: geometry, boundary_conditions  Outputs: flow_field  | |
| |        Adapter: docker  Image: cfd-engine:3.0   Cost: ~$2.00/run  | |
| +-------------------------------------------------------------------+ |
| | [icon] Mesh Generator                          v1.0.0 | Draft    | |
| |        Automatic mesh generation from CAD geometry                  | |
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

**Purpose**: Browse, register, and manage versioned engineering tools

**Components**:
- **Search and Filter**: Text search, category filter, status filter
- **Tool Cards**: Name, version, description, I/O summary, adapter info, cost estimate
- **Tool Detail** (on click): Full contract view, version history, usage stats
- **Register Tool** (modal): Name, description, contract JSON, Docker image, adapter type

---

### Screen 5: Governance Dashboard (Board Studio)

```
+-----------------------------------------------------------------------+
|  Board: Structural Validation Study     Mode: [Study]  Readiness: 72% |
+-----------------------------------------------------------------------+
| CARDS                |              GATE STATUS                        |
|                      |                                                 |
| +------------------+ | Gate 1: FEA Evidence        [PASSED]           |
| | FEA Stress Test  | |   [x] run_succeeded (run_abc)                  |
| | Status: Complete | |   [x] artifact_exists (stress_map)             |
| | KPIs: 3/3 pass   | |   [x] threshold_met (max_stress < 250 MPa)    |
| +------------------+ |                                                 |
| +------------------+ | Gate 2: CFD Validation      [PENDING]          |
| | CFD Flow Study   | |   [x] run_succeeded (run_def)                  |
| | Status: Running  | |   [ ] artifact_exists (flow_report)            |
| | KPIs: 1/3 pass   | |   [ ] role_signed (lead_engineer)              |
| +------------------+ |                                                 |
| +------------------+ | Gate 3: Release Approval    [BLOCKED]          |
| | DFM Check        | |   [ ] all_gates_passed                         |
| | Status: Pending  | |   [ ] role_signed (quality_manager)            |
| +------------------+ |                                                 |
|                      | [Evaluate All Gates]  [Escalate to Release]     |
+----------------------+-------------------------------------------------+
| EVIDENCE PANEL                                                         |
| +-------------------------------------------------------------------+ |
| | Hypothesis: "Bracket design meets ISO 12345 under 500N load"      | |
| | Result: FEA run_abc shows max stress 187 MPa (< 250 MPa limit)   | |
| | Decision: PASS -- proceed to CFD validation                        | |
| | Artifact: stress_map_v2.vtk (SHA: a1b2c3...)                      | |
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

**Purpose**: Manage research/engineering governance with evidence tracking

**Components**:
- **Cards Grid** (left): Domain-specific work items (FEA, CFD, DFM cards)
- **Gate Status** (right): Governance checkpoints with requirement checklists
- **Evidence Panel** (bottom): Hypothesis -> result -> decision records
- **Mode Indicator**: Current governance mode (explore/study/release)
- **Readiness Gauge**: Percentage of gates passed

---

### Screen 6: Evaluation Screen

```
+-----------------------------------------------------------------------+
|  My Workflow    [Editor | Runs | Eval]                                |
+-----------------------------------------------------------------------+
| TEST DEFINITION          |           TEST RESULTS                     |
|                          |                                             |
| Test Dataset:            | Test Run #eval_001        Score: 87%       |
| [Upload CSV] [Edit JSON] |                                             |
|                          | +------------------------------------------+|
| Metrics:                 | | Test Case | Input      | Expected | Pass ||
| [x] Output matches       | | TC-001    | mesh_a.stl | < 200MPa | YES  ||
| [x] Artifact produced    | | TC-002    | mesh_b.stl | < 150MPa | YES  ||
| [ ] Cost under budget    | | TC-003    | mesh_c.stl | < 300MPa | NO   ||
|                          | | TC-004    | mesh_d.stl | < 250MPa | YES  ||
| Agent Evals:             | +------------------------------------------+|
| [x] Correct tool selected|                                             |
| [x] Confidence > 0.8     | Failed Case Detail:                        |
| [ ] Under 3 tool calls   | TC-003: Expected < 300 MPa, Got 312 MPa   |
|                          | Root cause: Mesh too coarse for thin walls  |
| [Run All Tests]          |                                             |
+-----------------------------------------------------------------------+
```

**Purpose**: Systematic testing of workflows and agent accuracy

**Components**:
- **Test Definition** (left): Dataset upload, metric configuration, agent-specific criteria
- **Test Results** (right): Pass/fail table, score summary, failed case details
- **Agent Evals**: Specialized metrics for agent decision quality

---

## STEP 4: WORKFLOW EDITOR DESIGN (CRITICAL)

### Node Types on Canvas

```
+-------------------+-------------------+-------------------+
|   TOOL NODE       |   AGENT NODE      |   LOGIC NODE      |
|   [icon]          |   [brain icon]    |   [diamond]       |
|   "FEA Solver"    |   "Optimizer"     |   "IF Condition"  |
|   v2.1.0          |   v1.0            |                   |
|   o-->            |   o-->            |   o--> true       |
|                   |  [M][T][P] ports  |   o--> false      |
+-------------------+-------------------+-------------------+

+-------------------+-------------------+-------------------+
|   DATA NODE       |   GATE NODE       |   TRIGGER NODE    |
|   [file icon]     |   [shield icon]   |   [bolt icon]     |
|   "Upload CAD"    |   "Evidence Gate" |   "Webhook"       |
|   art_abc123      |   2/3 reqs met    |   POST /hook/abc  |
|   o-->            |   o--> (blocked)  |   -->o             |
+-------------------+-------------------+-------------------+
```

### Node Type Details

| Node Type | Icon | Ports | Canvas Appearance | Inspector Panel |
|-----------|------|-------|-------------------|-----------------|
| **Trigger** | Lightning bolt | 0 inputs, 1+ outputs | Green left border, "Listening..." badge | Trigger type, schedule config, webhook URL |
| **Tool** | Domain-specific (wrench, beaker, etc.) | 1+ inputs, 1+ outputs | Standard rectangle with version badge | Tool version, input params, resource limits, retry policy |
| **Agent** | Brain/robot | 1 main input, 1 main output, sub-ports (Model, Tools, Memory, Policy) | Larger rectangle with sub-port indicators | Goal, model, tools list, scoring, constraints, policy |
| **Logic (IF)** | Diamond | 1 input, 2+ outputs (branches) | Diamond shape with branch labels | Condition expression, branch names |
| **Logic (Switch)** | Routes | 1 input, N outputs | Rectangle with route indicators | Rules list, default route |
| **Logic (Merge)** | Join arrows | N inputs, 1 output | Rectangle with merge indicator | Merge mode (wait all, pass through) |
| **Data (Upload)** | Upload arrow | 0 inputs, 1 output | Rectangle with file type badge | File selector, artifact type |
| **Data (Transform)** | Edit icon | 1 input, 1 output | Standard rectangle | Field mapping, expression editor |
| **Gate** | Shield/lock | 1 input, 1 output | Rectangle with status badge (green/yellow/red) | Gate type, requirements list, approvers, timeout |
| **Sub-Workflow** | Nested squares | Matches sub-workflow I/O | Rectangle with workflow name | Workflow selector, input mapping |
| **Sticky Note** | Yellow rectangle | No ports | Floating yellow card | Text editor |

### How Connections Work

```
CONNECTION MODEL:
=================

  Source Node                    Destination Node
  +----------+                  +----------+
  |          |  main/0          |          |
  |       (o)==================>(o)        |
  |          |  ---- edge ----> |          |
  +----------+                  +----------+

EDGE DATA:
{
  "source": "node_1",
  "sourceHandle": "main/0",      // output type / output index
  "target": "node_2",
  "targetHandle": "main/0"       // input type / input index
}

AGENT SUB-PORTS:
  +------------------+
  |   Agent Node     |
  |                  |
  (o) main input     |
  |                  |
  |  [M] model  -----(o)---- [LLM Model Node]
  |  [T] tools  -----(o)---- [Tool Node 1]
  |              -----(o)---- [Tool Node 2]
  |  [P] policy -----(o)---- [Policy Config]
  |  [Mem] memory ---(o)---- [Memory Store]
  |                  |
  |       (o) main output
  +------------------+

CONNECTION TYPES:
  "main"       -- standard data flow (JSON + artifact refs)
  "ai_model"   -- LLM model connection
  "ai_tool"    -- tool available to agent
  "ai_memory"  -- memory/context store
  "ai_policy"  -- governance policy config
```

### How Data Flows Between Nodes

```
DATA ENVELOPE (what flows on each edge):
{
  "items": [
    {
      "json": {                    // structured data
        "mesh_quality": 0.95,
        "element_count": 45000,
        "max_stress": 187.3
      },
      "artifacts": {               // artifact references (NOT binary blobs)
        "mesh_file": "art_abc123",
        "stress_map": "art_def456"
      },
      "metadata": {
        "source_node": "fea_solver_1",
        "run_id": "run_xyz789",
        "cost": 0.50,
        "duration_ms": 15000
      }
    }
  ]
}

KEY DIFFERENCE FROM n8n:
  n8n: Binary data flows in-memory as base64 blobs
  Airaie: Artifacts flow as REFERENCES (IDs) -- actual files live in MinIO/S3
          This enables multi-GB engineering files without memory pressure
```

### What Happens When User Adds a Tool Node

```
1. User opens Node Palette (click "+" or press Tab)
2. Searches for "FEA Solver" in palette
3. Clicks the tool -> node placed on canvas at cursor position
4. Canvas store adds node:
   {
     id: "node_1",
     type: "tool",
     name: "FEA Solver",
     tool_ref: "fea-solver@2.1.0",
     position: [480, 300],
     parameters: {}          // empty until configured
   }
5. Node Inspector opens automatically
6. Inspector shows:
   a. Tool version selector (dropdown of published versions)
   b. Input parameter form (generated from tool contract JSON Schema):
      - mesh_file: [Artifact selector / expression]
      - threshold: [Number input: 128]
      - output_format: [Dropdown: vtk, csv, json]
   c. Resource limits:
      - CPU: [4 cores]  Memory: [2048 MB]  Timeout: [300s]
   d. Retry policy:
      - Max retries: [3]  Wait between: [10s]
   e. Conditional:
      - When: [expression field, e.g. "{{ $json.quality > 0.9 }}"]
7. User configures parameters, presses Escape to close inspector
8. Node appears on canvas with configured state badge
```

### What Happens When User Adds an Agent Node

```
1. User drags "Agent" from palette to canvas
2. Agent node appears with 4 sub-port indicators: [M] [T] [P] [Mem]
3. Node Inspector opens with agent-specific form:
   a. Goal: "Optimize mesh density for structural analysis"
   b. Model: [Anthropic Claude Sonnet v] -> creates Model sub-node
   c. Tools section:
      - [+ Add Tool] -> opens tool picker
      - Each tool gets permissions (read/write/execute) and limits
   d. Policy section:
      - Auto-approve threshold: 0.85
      - Require approval for: [write, delete]
      - Max cost: $10.00
      - Max iterations: 5
   e. Scoring:
      - Strategy: weighted
      - LLM weight: 0.7 (blend of algorithmic + LLM scoring)
4. As user adds tools, sub-nodes appear connected to agent's [T] port
5. Model selection creates a sub-node connected to agent's [M] port
6. Policy config creates a sub-node connected to agent's [P] port
```

### How Agent Selects Tools Dynamically

```
STATIC WORKFLOW:
  [Trigger] --> [Tool A] --> [Tool B] --> [Output]
  (predetermined path, always runs A then B)

AGENT-DRIVEN WORKFLOW:
  [Trigger] --> [Agent Node] --> [Output]
                    |
              On execution:
              1. Agent receives context from trigger
              2. ToolSearcher queries capability DB for matching tools
              3. Scorer ranks tools by compatibility/trust/cost
              4. LLM (if enabled) proposes which tool to use and why
              5. PolicyEnforcer checks:
                 - Confidence >= threshold? -> auto-execute
                 - Below threshold? -> pause for human approval
              6. ProposalExecutor dispatches the chosen tool as a Run
              7. Result flows back through agent to downstream nodes
              8. Agent may iterate (call another tool based on result)

  The key difference:
  - Static workflows: user defines the path at design time
  - Agent workflows: LLM decides the path at runtime
  - Both visible on canvas, but agent path is determined during execution
```

---

## STEP 5: AGENT SYSTEM DESIGN

### What is an Agent in Airaie

An **Agent** is an autonomous decision-making entity that:
1. Receives a **goal** (what to achieve) and **context** (current state)
2. Uses an **LLM** to reason about which tools to invoke
3. Is constrained by **policies** (budget, confidence thresholds, approval rules)
4. Produces **proposals** (structured action plans with reasoning and confidence scores)
5. Can **learn** from outcomes via persistent memory

### How an Agent Differs from a Tool Node

```
TOOL NODE:                          AGENT NODE:
- Deterministic                     - Non-deterministic (LLM-driven)
- Fixed inputs/outputs              - Dynamic tool selection
- Always runs the same tool         - Chooses tools based on context
- No reasoning                      - Full reasoning trace
- No policy constraints             - Budget, confidence, approval rules
- No memory                         - Persistent memory bank
- Simple config form                - Complex spec (goal, tools, policy)
- Runs once                         - May iterate (multi-step reasoning)
```

### Agent Configuration Model

```yaml
# Agent Spec (what users configure in the Agent Builder)
apiVersion: airaie.agent/v1
kind: Agent
metadata:
  name: fea-optimizer
  description: Optimizes mesh parameters for FEA simulations

goal: "Given a CAD geometry, determine optimal mesh density and run FEA 
       simulation to meet stress requirements under specified loads"

model:
  provider: anthropic
  model: claude-sonnet-4-6
  
tools:
  - tool_ref: mesh-generator@1.0
    permissions: [read, execute]
    max_invocations: 10
  - tool_ref: fea-solver@2.1
    permissions: [read, execute]
    max_invocations: 5
  - tool_ref: result-analyzer@1.0
    permissions: [read]
    max_invocations: 3

scoring:
  strategy: weighted
  llm_weight: 0.7           # 70% LLM judgment, 30% algorithmic

constraints:
  max_cost_usd: 10.00
  timeout_sec: 600
  max_retries: 3

policy:
  auto_approve_threshold: 0.85
  require_approval_for: [write, delete]
  escalation_rules:
    - condition: "confidence < 0.5"
      action: reject
    - condition: "cost > 5.00"
      action: escalate
```

### How Agent Executes Inside a Workflow

```
WORKFLOW: [Webhook] --> [Agent: FEA Optimizer] --> [Gate: Evidence] --> [Output]

EXECUTION SEQUENCE:

1. Webhook trigger fires with CAD geometry input
   Data: { geometry: "art_001", load: 500, material: "steel" }

2. Agent node receives data:
   a. Context assembled: goal + input data + available tools
   
3. TOOL SEARCH PHASE:
   b. ToolSearcher queries: "tools matching FEA optimization"
   c. Returns ranked list: [mesh-generator, fea-solver, result-analyzer]
   
4. SCORING PHASE:
   d. Algorithmic scorer: compatibility=0.92, trust=0.88, cost=$0.50
   e. LLM scorer (if enabled): "mesh-generator is the right first step"
   f. Blended score: 0.7 * LLM + 0.3 * algorithmic = 0.90

5. PROPOSAL PHASE:
   g. ProposalGenerator creates ActionProposal:
      {
        selected_tool: "mesh-generator@1.0",
        reasoning: "Need to generate mesh before FEA analysis",
        confidence: 0.90,
        inputs: { geometry: "art_001", density: 0.8 },
        estimated_cost: 0.50
      }

6. POLICY CHECK:
   h. 0.90 >= 0.85 (auto_approve_threshold) -> AUTO-APPROVED

7. EXECUTION:
   i. ProposalExecutor dispatches Run for mesh-generator
   j. Run completes: mesh artifact produced (art_002)
   
8. ITERATION (agent may continue):
   k. Agent reviews mesh result
   l. Proposes next step: fea-solver with mesh art_002
   m. Policy check passes -> execute FEA
   n. FEA completes: stress_map artifact (art_003)
   
9. COMPLETION:
   o. Agent determines goal achieved (stress < threshold)
   p. Returns final output to downstream Gate node
   q. MemoryStore records: "mesh density 0.8 optimal for this geometry type"

10. GATE NODE evaluates:
    - run_succeeded: YES (FEA run passed)
    - artifact_exists: YES (stress_map exists)
    - threshold_met: YES (max_stress 187 < 250 MPa)
    -> GATE PASSED, execution continues
```

---

## STEP 6: EXECUTION MODEL

### Execution Architecture

```
+-------------------------------------------------------------------+
|                    EXECUTION ENGINE                                 |
+-------------------------------------------------------------------+
|                                                                     |
|  1. WORKFLOW SCHEDULER (Go)                                        |
|     +----------------------------------------------------------+   |
|     | Receives: Run request (workflow_id + inputs)              |   |
|     | Compiles: YAML DSL -> AST -> DAG (topological order)      |   |
|     | Identifies: Root nodes (no dependencies)                   |   |
|     | Dispatches: Root nodes as Jobs to NATS                     |   |
|     | Monitors: Result consumer processes completed jobs         |   |
|     | Advances: Dispatches next-ready nodes when deps satisfied  |   |
|     +----------------------------------------------------------+   |
|                           |                                         |
|  2. NATS JETSTREAM (Message Queue)                                 |
|     +----------------------------------------------------------+   |
|     | Subject: jobs.dispatch     (control -> data plane)        |   |
|     | Subject: results.completed (data plane -> control)         |   |
|     | Subject: events.*          (audit streaming)               |   |
|     | Delivery: at-least-once with idempotent processing        |   |
|     +----------------------------------------------------------+   |
|                           |                                         |
|  3. RUST RUNNER (Data Plane)                                       |
|     +----------------------------------------------------------+   |
|     | Consumes: Job from NATS                                   |   |
|     | Validates: Policy (CPU, memory, timeout, network)         |   |
|     | Downloads: Input artifacts from MinIO                      |   |
|     | Executes: Docker container (or Python/WASM/RemoteAPI)      |   |
|     | Uploads: Output artifacts to MinIO                         |   |
|     | Publishes: Result to NATS (status, metrics, artifact refs) |   |
|     +----------------------------------------------------------+   |
|                                                                     |
+-------------------------------------------------------------------+
```

### DAG Execution (Static Workflows)

```
Given DAG:
  A --> B --> D
  A --> C --> D
  
Execution order:
  1. Scheduler identifies root: A (no deps)
  2. Dispatch A as Job to NATS
  3. Runner executes A, publishes Result
  4. Result consumer updates A status = SUCCEEDED
  5. Check A's children: B needs [A], C needs [A]
  6. Both B and C have all deps satisfied -> dispatch BOTH (parallel)
  7. Runner executes B and C concurrently on separate workers
  8. B completes first -> check D: needs [B, C] -> C not done yet, wait
  9. C completes -> check D: needs [B, C] -> both done -> dispatch D
  10. D completes -> all nodes done -> Run = SUCCEEDED
```

### Agent-Driven Execution (Dynamic)

```
Given workflow: [Trigger] --> [Agent] --> [Gate] --> [Output]

Agent execution is ITERATIVE, not DAG-based:
  1. Agent receives trigger data
  2. Agent proposes Tool A -> dispatched as Run
  3. Tool A completes -> result returned to Agent
  4. Agent evaluates result, proposes Tool B -> dispatched as Run
  5. Tool B completes -> result returned to Agent
  6. Agent determines goal achieved -> passes data to Gate
  7. Total agent execution = 1 agent node, but N tool invocations

KEY: Agent node is a single DAG node that internally
     manages a multi-step execution loop
```

### Parallel Execution

```
EXPLICIT PARALLELISM (DAG-based):
  [Trigger] --> [FEA Solver]  --\
                                 --> [Merge] --> [Report]
  [Trigger] --> [CFD Engine]  --/
  
  FEA and CFD run in parallel (separate Docker containers)
  Merge node waits for both to complete

AGENT PARALLELISM (future):
  Agent could propose multiple tools simultaneously
  (not yet implemented -- sequential by default)
```

### Failure Handling

```
NODE FAILURE MODES:
  1. Tool execution fails (non-zero exit code):
     a. Check retry policy: max_retries > 0?
        -> YES: re-dispatch with incremented attempt counter
        -> NO: mark NodeRun as FAILED
     b. Check critical flag:
        -> critical=true: abort entire workflow (Run = FAILED)
        -> critical=false: skip node, continue with dependents
     c. Check continueOnError:
        -> true: pass error data to downstream nodes
        -> false: downstream nodes get SKIPPED

  2. Agent proposal rejected by policy:
     a. Confidence too low -> escalate to human approval queue
     b. Budget exceeded -> reject proposal, mark agent as FAILED
     c. Timeout -> cancel agent execution

  3. Gate requirement not met:
     a. Gate stays PENDING (workflow paused)
     b. User can: approve manually, waive gate, or reject
     c. Gate timeout: configurable max wait period

  4. Infrastructure failure:
     a. NATS unavailable -> retry connection with backoff
     b. Docker container crash -> detected by runner, reported as FAILED
     c. MinIO unavailable -> artifact download fails, job fails
```

---

## STEP 7: GOVERNANCE SYSTEM (UNIQUE TO AIRAIE)

### How Governance Integrates into Workflows

```
GOVERNANCE ON CANVAS:

  [Trigger] --> [FEA Solver] --> [Gate: Evidence] --> [CFD Engine] --> [Gate: Review] --> [Release Builder]
                                      |                                     |
                                 Auto-evaluate                         Human approval
                                 (3 requirements)                      (lead engineer sign-off)

THREE GOVERNANCE MECHANISMS:

1. GATE NODES (inline in workflow):
   - Pause execution until requirements met
   - Can auto-evaluate (check run results, artifact existence)
   - Can require human approval (specific roles)
   - Visible on canvas as nodes with status badges

2. BOARD WRAPPER (external governance):
   - A Board wraps one or more workflows
   - Tracks evidence across multiple workflow runs
   - Manages mode escalation (explore -> study -> release)
   - Provides intelligence (diff analysis, triage, reproducibility)
   - NOT on canvas -- separate Board Studio screen

3. AGENT POLICIES (per-agent governance):
   - Confidence thresholds for auto-approve
   - Escalation rules for human review
   - Budget and timeout caps
   - Built into Agent node configuration
```

### Gate Node Design

```
GATE NODE on Canvas:
  +----------------------------+
  |  [shield icon]             |
  |  Evidence Gate             |
  |  Status: 2/3 requirements  |
  |                            |
  | (o)-->     -->(o)          |
  |  input       output        |
  | (blocked until passed)     |
  +----------------------------+

GATE NODE Inspector:
  +----------------------------+
  | Gate Configuration         |
  |                            |
  | Type: [Evidence v]         |
  |                            |
  | Requirements:              |
  | [x] Run succeeded          |
  |     Run ref: [expression]  |
  | [x] Artifact exists        |
  |     Artifact: stress_map   |
  | [ ] Role signed            |
  |     Role: lead_engineer    |
  | [+ Add Requirement]        |
  |                            |
  | Auto-evaluate: [ON]        |
  | Timeout: [24h]             |
  | Waivable: [YES]            |
  +----------------------------+
```

### Board Governance Model

```
BOARD LIFECYCLE:

  +----------+     +---------+     +---------+
  | EXPLORE  | --> | STUDY   | --> | RELEASE |
  | mode     |     | mode    |     | mode    |
  +----------+     +---------+     +---------+
  
  Explore: Free experimentation, no gates required
  Study:   Evidence gates enforced, structured records
  Release: All gates must pass, release packet created

BOARD COMPOSITION:

  Board: "Product Validation"
  +-- Child Board: "Structural Analysis"
  |   +-- Card: FEA Stress Test
  |   +-- Card: Fatigue Analysis
  |   +-- Gate: Structural Evidence
  +-- Child Board: "Thermal Analysis"
  |   +-- Card: CFD Flow Study
  |   +-- Card: Heat Transfer
  |   +-- Gate: Thermal Evidence
  +-- Gate: Overall Validation (requires all child gates)
  +-- Release Packet: manufacturing-ready bundle
```

### Release Pipeline

```
RELEASE PIPELINE (end-to-end):

  1. [Workflow runs] produce artifacts and evidence
           |
  2. [EvidenceCollector] auto-attaches metrics to board
           |
  3. [Gates evaluate] requirements against evidence
           |
  4. [Human reviewers] approve gates requiring sign-off
           |
  5. [All gates pass] -> board escalates to "release" mode
           |
  6. [Release Packet created]:
     - Locked artifacts (immutable snapshots)
     - Bill of Materials (BOM)
     - Tolerances and specifications
     - Proof bundle (audit trail of all gate evaluations)
     - Sign-off records
           |
  7. [Release Packet exported] for manufacturing handoff
```

---

## STEP 8: DATA FLOW DESIGN

### What Flows Between Nodes

```
INTER-NODE DATA FORMAT:

{
  "items": [                         // Array of data items (like n8n)
    {
      "json": {                      // Structured data payload
        "max_stress": 187.3,
        "element_count": 45000,
        "converged": true
      },
      "artifacts": {                 // Artifact REFERENCES (not blobs)
        "mesh": "art_abc123",        // MinIO storage reference
        "stress_map": "art_def456"
      },
      "metadata": {                  // Execution metadata
        "source_node": "fea_solver",
        "run_id": "run_xyz789",
        "node_run_id": "nrun_001",
        "cost_usd": 0.50,
        "duration_ms": 15000,
        "peak_mem_mb": 1024
      }
    }
  ]
}

EXPRESSION ACCESS (in node parameters):
  {{ $json.max_stress }}              // Current item's data
  {{ $artifacts.mesh }}               // Current item's artifact ref
  {{ $('FEA Solver').json.converged }} // Specific node's output
  {{ $run.id }}                       // Current run metadata
  {{ $gate('Evidence').status }}       // Gate evaluation result
  {{ $board.mode }}                   // Board governance mode
  {{ $cost.total }}                   // Accumulated run cost
```

### Tool Node Input/Output

```
TOOL CONTRACT defines the schema:

  Input Contract (from tool registry):
  {
    "inputs": [
      { "name": "mesh_file", "type": "artifact", "required": true },
      { "name": "threshold", "type": "number", "default": 128 },
      { "name": "output_format", "type": "enum", "values": ["vtk","csv"] }
    ],
    "outputs": [
      { "name": "result", "type": "artifact" },
      { "name": "metrics", "type": "json" }
    ]
  }

  When tool executes:
  1. Input artifacts downloaded from MinIO to container
  2. Input parameters passed as environment variables / config file
  3. Tool runs in Docker container
  4. Output files uploaded to MinIO as new artifacts
  5. Output JSON returned as node output data
```

### Agent Node Input/Output

```
AGENT INPUT:
  Receives context from upstream node:
  {
    "items": [{
      "json": { "geometry": "bracket_v2", "load": 500, "material": "steel" },
      "artifacts": { "cad_file": "art_001" }
    }]
  }

AGENT INTERNAL FLOW:
  1. Context + Goal -> ToolSearcher -> ranked tools
  2. Ranked tools + Context -> Scorer -> scored list
  3. Scored list + Context -> ProposalGenerator (LLM) -> ActionProposal
  4. ActionProposal -> PolicyEnforcer -> approve/reject/escalate
  5. If approved: dispatch tool Run, collect result
  6. Result -> Agent evaluates: goal achieved? iterate?

AGENT OUTPUT:
  {
    "items": [{
      "json": {
        "goal_achieved": true,
        "final_result": { "max_stress": 187.3, "safety_factor": 1.34 },
        "reasoning": "Mesh density 0.8 with steel material meets criteria",
        "tools_used": ["mesh-generator@1.0", "fea-solver@2.1"],
        "total_cost": 1.50,
        "confidence": 0.92
      },
      "artifacts": {
        "mesh": "art_002",
        "stress_map": "art_003"
      },
      "metadata": {
        "iterations": 2,
        "proposals": [
          { "tool": "mesh-generator@1.0", "confidence": 0.90, "status": "executed" },
          { "tool": "fea-solver@2.1", "confidence": 0.92, "status": "executed" }
        ]
      }
    }]
  }
```

---

## STEP 9: COMPONENT HIERARCHY

```
AIRAIE UNIFIED STUDIO
|
+-- AUTH
|   +-- LoginPage
|   +-- RegisterPage
|   +-- ForgotPasswordPage
|
+-- PLATFORM SHELL (AppShell)
|   +-- Sidebar (navigation)
|   +-- Header (breadcrumb, search, user)
|   +-- CommandPalette (Cmd+K)
|
+-- DASHBOARD (Home)
|   +-- RecentWorkflows
|   +-- SystemStatus
|   +-- QuickActions (New Workflow, New Agent, New Board)
|   +-- InsightsSummary (execution metrics)
|
+-- WORKFLOW EDITOR (core screen)
|   +-- Header
|   |   +-- WorkflowName (editable)
|   |   +-- VersionBadge
|   |   +-- TabBar (Editor | Runs | Eval)
|   |   +-- SaveButton + PublishToggle
|   |
|   +-- NodePalette (left panel)
|   |   +-- SearchBar
|   |   +-- CategoryList
|   |   |   +-- Triggers (Webhook, Cron, Event)
|   |   |   +-- Tools (FEA, CFD, Materials, ML, ...)
|   |   |   +-- Agents (pre-built agent templates)
|   |   |   +-- Logic (IF, Switch, Merge, Loop)
|   |   |   +-- Governance (Gate, Approval, Board Link)
|   |   |   +-- Data (Upload, Transform, Convert)
|   |   |   +-- Utilities (Wait, Delay, Notify)
|   |   +-- NodeItem (icon, name, description)
|   |
|   +-- Canvas (center)
|   |   +-- XYFlow (React Flow)
|   |   |   +-- CanvasNode[] (per node type)
|   |   |   |   +-- NodeIcon
|   |   |   |   +-- NodeName
|   |   |   |   +-- VersionBadge
|   |   |   |   +-- StatusBadge (during execution)
|   |   |   |   +-- HandlePorts (input/output circles)
|   |   |   |   +-- SubPorts (agent: model/tools/policy/memory)
|   |   |   |   +-- HoverToolbar (execute, disable, delete)
|   |   |   +-- CanvasEdge[] (bezier curves)
|   |   |   |   +-- EdgeLabel (item count during execution)
|   |   |   |   +-- DeleteButton (on hover)
|   |   |   +-- CanvasBackground (grid)
|   |   |   +-- MiniMap
|   |   +-- CanvasControls (zoom, fit, tidy)
|   |   +-- RunButton ("Run Workflow" / "Listening...")
|   |   +-- ChatButton (for agent workflows)
|   |
|   +-- NodeInspector (right panel, like n8n NDV)
|   |   +-- InspectorHeader (node icon, name, close button)
|   |   +-- InputPanel
|   |   |   +-- DataView (Table | JSON | Schema | Artifact)
|   |   +-- ParameterPanel
|   |   |   +-- ParameterForm (dynamic per node type)
|   |   |   |   +-- StringInput, NumberInput, BooleanToggle
|   |   |   |   +-- DropdownSelect, MultiSelect
|   |   |   |   +-- ArtifactSelector
|   |   |   |   +-- ExpressionEditor (CodeMirror)
|   |   |   |   +-- JSONEditor
|   |   |   |   +-- ResourceLimitsForm (CPU, memory, timeout)
|   |   |   +-- CredentialSelector
|   |   |   +-- RetryPolicy
|   |   |   +-- ConditionalExpression (when clause)
|   |   +-- OutputPanel
|   |       +-- DataView (Table | JSON | Schema | Artifact)
|   |       +-- ErrorView (if node failed)
|   |       +-- PinDataToggle
|   |
|   +-- ExecutionOverlay (during run)
|       +-- NodeStatusBadges (green/red/spinner)
|       +-- EdgeAnimations (flowing dots)
|       +-- ProgressBar
|
+-- RUN MONITOR
|   +-- RunList (sidebar)
|   |   +-- Filters (status, date, cost)
|   |   +-- RunCard[] (status badge, duration, cost)
|   +-- RunDetail
|   |   +-- CanvasPreview (workflow with execution badges)
|   |   +-- NodeDetail (input/output/logs per node)
|   |   +-- Tabs: Logs | Artifacts | Cost | Timeline
|   +-- StreamingLogs
|   +-- ArtifactBrowser (with lineage graph)
|
+-- AGENT BUILDER
|   +-- AgentGraph (visual spec representation)
|   +-- AgentConfig (goal, model, tools, policy, constraints)
|   +-- Playground (chat interface for testing)
|   |   +-- MessageHistory
|   |   +-- ProposalCards (tool selection reasoning)
|   |   +-- StepDebugger
|   +-- EvalRunner (golden dataset tests)
|   +-- VersionManager (draft/validated/published)
|   +-- MemoryBrowser (facts, patterns, learned)
|
+-- TOOL REGISTRY
|   +-- ToolList (search, filter, cards)
|   +-- ToolDetail (contract, versions, usage stats)
|   +-- RegisterTool (wizard: name, contract, image, adapter)
|   +-- ContractValidator
|
+-- BOARD STUDIO (Governance)
|   +-- BoardList (filter by mode, status, type)
|   +-- BoardDetail
|   |   +-- CardGrid (domain-specific cards)
|   |   +-- GatePanel (requirement checklists)
|   |   +-- EvidencePanel (hypothesis/result/decision records)
|   |   +-- IntelligencePanel (diff, triage, reproducibility)
|   +-- ReleasePacket (locked artifacts, BOM, tolerances)
|   +-- ApprovalQueue (gates requiring human sign-off)
|
+-- SETTINGS
|   +-- PersonalSettings
|   +-- UserManagement
|   +-- APIKeys
|   +-- LLMProviders (model configuration)
|   +-- Quotas (resource limits)
|   +-- AuditLog (event browser)
|
+-- SHARED COMPONENTS
    +-- @airaie/ui (Button, Card, Badge, Modal, Input, ...)
    +-- @airaie/charts (Recharts wrappers)
    +-- @airaie/shared (API client, types, auth, hooks, SSE)
```

---

## STEP 10: IMPLEMENTATION ARCHITECTURE

### Frontend Architecture

```
TECHNOLOGY STACK:
  - React 19 + TypeScript 5.8
  - @xyflow/react (canvas rendering -- React equivalent of @vue-flow/core)
  - Zustand (client state -- equivalent of Pinia)
  - TanStack React Query (server state)
  - Tailwind CSS 3.4 (styling)
  - CodeMirror 6 (expression/code editor)
  - Recharts (analytics charts)
  - React Hook Form + Zod (form validation)
  - Vite (build tool)

MONOREPO STRUCTURE:
  airaie-studio/                    # UNIFIED (no more 3 separate studios)
  +-- packages/
  |   +-- @airaie/ui/              # Design system components
  |   +-- @airaie/shared/          # API client, types, auth, hooks
  |   +-- @airaie/canvas/          # Canvas components (nodes, edges, handles)
  |   +-- @airaie/charts/          # Chart wrappers
  |
  +-- src/
  |   +-- app/
  |   |   +-- App.tsx              # Router + layout
  |   |   +-- layouts/             # Shell, Auth, Settings layouts
  |   |   +-- stores/              # Zustand stores
  |   |   |   +-- workflow.store.ts    # Current workflow nodes/connections
  |   |   |   +-- canvas.store.ts      # Viewport, selection, zoom
  |   |   |   +-- execution.store.ts   # Active run state
  |   |   |   +-- ui.store.ts          # Panels, modals, theme
  |   |   |   +-- nodeTypes.store.ts   # Available node types from registry
  |   |   +-- hooks/               # Shared hooks
  |   |
  |   +-- features/
  |   |   +-- editor/              # Workflow editor (THE core feature)
  |   |   |   +-- canvas/          # Canvas components
  |   |   |   +-- palette/         # Node palette (node creator)
  |   |   |   +-- inspector/       # Node inspector (NDV equivalent)
  |   |   |   +-- execution/       # Execution overlay
  |   |   |
  |   |   +-- runs/                # Run monitoring
  |   |   +-- agents/              # Agent builder
  |   |   +-- tools/               # Tool registry
  |   |   +-- boards/              # Board governance
  |   |   +-- evaluation/          # Testing/eval
  |   |   +-- settings/            # Platform settings
  |   |
  |   +-- pages/                   # Route pages
  |
  +-- turbo.json                   # Build orchestration
  +-- vite.config.ts
```

### Backend Architecture (Keep Existing)

```
KEEP: airaie-kernel (Go + Rust)

The existing kernel is well-architected. No need to rewrite.

EXTEND for unified studio:
  1. Add WebSocket push service (complement SSE with bidirectional)
  2. Add canvas state persistence (save node positions to workflow)
  3. Add expression evaluation endpoint (validate {{ }} syntax)
  4. Add node type registry endpoint (list available nodes for palette)

ARCHITECTURE:
  +-- Go Control Plane (:8080)
  |   +-- Handler layer (HTTP + WebSocket)
  |   +-- Service layer (business logic)
  |   +-- Store layer (PostgreSQL)
  |   +-- Workflow Engine (compiler, scheduler)
  |   +-- Agent Runtime (LLM, scoring, policy)
  |
  +-- Rust Data Plane (Runner)
  |   +-- NATS consumer
  |   +-- Docker executor
  |   +-- S3 artifact I/O
  |
  +-- Infrastructure
      +-- PostgreSQL 16 (data)
      +-- NATS JetStream (messaging)
      +-- MinIO (artifacts)
```

### Execution Engine Design

```
EXECUTION ENGINE COMPARISON:

  n8n: In-process Node.js execution
  +-- All nodes run in the same process
  +-- Data passes in memory
  +-- Fast for lightweight operations
  +-- Limited by single-process resources

  Airaie: Distributed container execution
  +-- Each node dispatched as a NATS job
  +-- Executed in isolated Docker containers
  +-- Artifacts stored in S3 (not in memory)
  +-- Horizontal scaling via multiple runners
  +-- Required for heavy engineering workloads (multi-GB files, GPU, etc.)

HYBRID MODEL (best of both):
  +-- Lightweight nodes (IF, Set, Merge): in-process in Go control plane
  +-- Heavy tool nodes (FEA, CFD): dispatched to Rust runner
  +-- Agent nodes: orchestrated by Go with LLM calls + delegated tool runs
  +-- Gate nodes: evaluated in Go control plane (check DB state)
```

### Storage Design

```
STORAGE LAYER:

  PostgreSQL 16 (relational data):
  +-- workflows (id, name, project_id)
  +-- workflow_versions (id, workflow_id, version, nodes_json, connections_json, dsl_yaml, status)
  +-- tools, tool_versions (registry)
  +-- agents, agent_versions (agent specs)
  +-- runs, node_runs (execution state)
  +-- artifacts (metadata: id, name, type, hash, storage_uri)
  +-- boards, board_records, board_attachments
  +-- gates, gate_requirements, gate_approvals
  +-- audit_events
  +-- users, projects, roles, rbac_policies
  +-- sessions, agent_memories
  +-- triggers, credentials

  MinIO / S3 (binary data):
  +-- Artifact blobs (CAD files, simulation outputs, images)
  +-- Run logs (container stdout/stderr)
  +-- Release packets (locked bundles)

  NATS JetStream (messaging):
  +-- jobs.dispatch (job payloads)
  +-- results.completed (execution results)
  +-- events.* (audit stream)

  Browser (client):
  +-- JWT tokens (localStorage)
  +-- Theme preference (localStorage)
  +-- Canvas viewport state (Zustand, in-memory)
  +-- Workflow draft (Zustand, in-memory until saved)
```

---

## STEP 11: DIFFERENCES FROM n8n

### What is the Same

| Aspect | n8n | Airaie | Similarity |
|--------|-----|--------|-----------|
| **Visual canvas** | @vue-flow/core DAG editor | @xyflow/react DAG editor | Same concept, different framework |
| **Node-based model** | Nodes with inputs/outputs | Nodes with inputs/outputs | Identical concept |
| **Connection model** | Source -> Destination edges | Source -> Destination edges | Same data structure |
| **Node Creator/Palette** | Right-side panel with search and categories | Left-side panel with search and categories | Same UX pattern |
| **Node Detail View** | Right-side panel for configuration | Right-side panel (Inspector) | Same UX pattern |
| **Expression system** | `{{ $json.field }}` templates | `{{ $json.field }}` templates (extended) | Same core, Airaie adds `$artifact`, `$gate`, `$board` |
| **Workflow versioning** | Save history, source control | Draft/compiled/published lifecycle | Similar concept, Airaie adds compilation |
| **Trigger system** | Webhook, cron, polling, event | Webhook, cron, event, NATS | Same types, different implementations |
| **Execution display** | Status badges on nodes during run | Status badges on nodes during run | Same visual pattern |
| **Pin data** | Mock data for testing | Mock data for testing | Same concept |
| **Keyboard shortcuts** | Ctrl+S, Tab, Delete, etc. | Same shortcuts | Direct adoption |
| **Credentials** | Encrypted API keys/tokens | Encrypted API keys/tokens | Same concept |

### What is Different

| Aspect | n8n | Airaie | Why Different |
|--------|-----|--------|---------------|
| **Execution model** | In-process Node.js | Distributed Docker containers via NATS | Engineering tools need isolated environments, GPU, multi-GB memory |
| **Data flow** | In-memory JSON blobs + base64 binary | Artifact references (IDs) + S3 storage | Engineering files are too large for in-memory transfer |
| **Node source** | 400+ built-in JS integrations | User-registered containerized tools | Airaie wraps arbitrary engineering software, not web APIs |
| **Frontend framework** | Vue 3 + Pinia | React 19 + Zustand | Different technology choice |
| **Backend language** | Node.js + Express | Go + Rust | Go for control plane performance, Rust for data plane safety |
| **Database** | SQLite/PostgreSQL via TypeORM | PostgreSQL via pgx (direct SQL) | Direct SQL for performance with complex queries |
| **Compilation step** | None (JSON is executable) | YAML DSL -> AST -> DAG (with validation) | Engineering workflows need rigorous validation before execution |
| **Cost tracking** | None | Per-node and per-run cost estimation/actual | Engineering workloads have real compute costs |
| **Resource limits** | None (JS sandbox only) | CPU, memory, timeout, network, disk per node | Container isolation requires explicit resource policies |
| **Real-time updates** | WebSocket (Push service) | SSE (with planned WebSocket upgrade) | SSE is simpler; WebSocket planned for bidirectional |

### What is New (Airaie Innovation)

| Innovation | Description | Why It Matters |
|-----------|-------------|----------------|
| **Agent Nodes with Governance** | AI agents constrained by policies, confidence thresholds, and budget limits | Prevents runaway AI decisions in safety-critical engineering contexts |
| **Gate Nodes** | Governance checkpoints that pause workflow until structured requirements are met | Enables compliance and evidence-based validation in regulated industries |
| **Board System** | Research/engineering boards that wrap workflows with evidence tracking and mode escalation | Provides structured governance lifecycle (explore -> study -> release) |
| **Vertical-Aware Cards** | Domain-specific UI cards (FEA, CFD, DFM, ML) with auto-adapted forms and KPIs | Engineering workflows need domain-specific visualization |
| **Release Packets** | Locked artifact bundles with BOM, tolerances, and proof bundles for manufacturing handoff | Bridges the gap between engineering validation and manufacturing |
| **Artifact Lineage** | Full dependency graph from input through transformations to output, with content hashing | Critical for reproducibility and audit in engineering workflows |
| **Tool Contracts** | Versioned, validated JSON Schema contracts for tool inputs/outputs with adapter specifications | Enables wrapping arbitrary engineering software as reusable nodes |
| **Agent Memory** | Persistent fact/pattern storage that agents use to improve over time | Enables learning across multiple engineering design iterations |
| **Board Intelligence** | Automated evidence diff analysis, gate failure triage, reproducibility checks | Reduces manual governance overhead with AI-assisted analysis |
| **Control Plane + Data Plane** | Go for orchestration, Rust for execution -- separated by NATS message queue | Enables horizontal scaling of compute-intensive tool execution |
| **Multi-Adapter Execution** | Docker, Python, WASM, Remote API, Notebook adapters for tool execution | Supports diverse engineering tool ecosystems |
| **Blended Scoring** | Configurable algorithmic + LLM blend for agent tool selection | Balances deterministic reliability with AI flexibility |

### Architecture Comparison Diagram

```
n8n ARCHITECTURE:                    AIRAIE ARCHITECTURE:
================                     ====================

+-------------------+                +---------------------+
| Vue 3 Frontend    |                | React 19 Frontend   |
| @vue-flow canvas  |                | @xyflow/react canvas|
| Pinia stores      |                | Zustand stores      |
+--------+----------+                +--------+------------+
         |                                    |
    REST + WebSocket                    REST + SSE (+ WS planned)
         |                                    |
+--------v----------+                +--------v------------+
| Node.js Backend   |                | Go Control Plane    |
| Express server    |                | 100+ REST endpoints |
| In-process exec   |                | 30+ services        |
| TypeORM           |                | pgx (direct SQL)    |
+--------+----------+                +--------+------------+
         |                                    |
+--------v----------+                +--------v------------+
| SQLite/PostgreSQL |                | NATS JetStream      |
| (single DB)       |                | (message queue)     |
+-------------------+                +--------+------------+
                                              |
                                     +--------v------------+
                                     | Rust Data Plane     |
                                     | Docker containers   |
                                     | S3 artifact I/O     |
                                     +--------+------------+
                                              |
                                     +--------v------------+
                                     | PostgreSQL + MinIO  |
                                     | (data + artifacts)  |
                                     +---------------------+

KEY INSIGHT:
  n8n is a MONOLITH (everything in one Node.js process)
  Airaie is a DISTRIBUTED SYSTEM (Go + Rust + NATS + Docker)

  This is necessary because:
  - n8n nodes are lightweight API calls (milliseconds, KB data)
  - Airaie tools are heavy simulations (minutes/hours, GB data)
```

---

## SUMMARY

### The Vision

Airaie Unified Studio combines the intuitive visual workflow builder UX pioneered by n8n with the engineering-specific capabilities of containerized tool execution, AI agent governance, and evidence-based release management.

### Key Design Decisions

1. **Unified single app** (not 3 separate iframe studios) -- inspired by n8n's cohesive single-app experience
2. **n8n-style canvas** with extended node types (Tool, Agent, Gate, Data)
3. **n8n-style NDV** (Node Inspector) with engineering-specific parameter forms
4. **n8n-style palette** with engineering-specific categories
5. **Keep the Go+Rust backend** -- it's well-suited for distributed engineering workloads
6. **Add governance as first-class canvas nodes** (Gates) not just external systems
7. **Artifact references** (not in-memory blobs) for engineering-scale data
8. **Agent nodes with sub-ports** inspired by n8n's AI Agent node architecture
9. **Expression system** extended with Airaie-specific variables ($artifact, $gate, $board)
10. **Compilation step** before execution (unlike n8n's direct JSON execution)

### What to Build First (Priority Order)

```
Phase 1: Core Canvas Experience
  [x] Existing: Go kernel, Rust runner, PostgreSQL, NATS, MinIO
  [ ] Build: Unified React app with XYFlow canvas
  [ ] Build: Node palette with Tool and Logic nodes
  [ ] Build: Node inspector (NDV equivalent)
  [ ] Build: Basic workflow save/load/version
  [ ] Build: Execute workflow with real-time status badges

Phase 2: Agent Integration
  [ ] Build: Agent node type with sub-ports
  [ ] Build: Agent playground (chat panel on canvas)
  [ ] Build: Agent policy configuration in inspector
  [ ] Build: Decision tracing UI

Phase 3: Governance on Canvas
  [ ] Build: Gate node type
  [ ] Build: Gate evaluation in workflow execution
  [ ] Build: Approval queue UI
  [ ] Build: Board integration (link workflows to boards)

Phase 4: Polish
  [ ] Build: Expression editor (CodeMirror)
  [ ] Build: Artifact lineage visualization
  [ ] Build: Evaluation/testing screen
  [ ] Build: Keyboard shortcuts, context menus
  [ ] Build: Dark mode, responsive design
```

---

*Generated: 2026-03-31*
*Based on: Airaie System Analysis + n8n Architecture Analysis + n8n Product UI Analysis*
