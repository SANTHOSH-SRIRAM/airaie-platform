# AIRAIE Unified Platform — Technical Architecture

> Single-app, n8n-inspired engineering automation platform.
> This document is the authoritative technical reference for mechanism, data flow, state machines, and end-to-end system design.

---

## 1. System Overview

AIRAIE is a **single unified React application** (not separate studios) that connects parametric design intent to manufacturing readiness through:

- **Visual DAG Editor** — n8n-inspired canvas with 6 node types
- **Deterministic Workflow Runtime** — Go control plane + Rust data plane
- **AI Agent System** — LLM-powered decision-making with governance policies
- **Board Governance** — Evidence-based quality gates with mode escalation
- **Artifact Lineage** — Immutable, content-hashed, traceable engineering files

```
┌─────────────────────────────────────────────────────────┐
│                 AIRAIE UNIFIED STUDIO                    │
│              (Single React 19 App :3000)                │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Workflow  │ │  Agent   │ │  Board   │ │   Tool    │  │
│  │  Editor   │ │ Builder  │ │Governance│ │ Registry  │  │
│  └─────┬────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│        └────────────┼───────────┼──────────────┘        │
│                     │  Single Router / Single Store      │
└─────────────────────┼───────────────────────────────────┘
                      │ REST + SSE
┌─────────────────────┼───────────────────────────────────┐
│              GO CONTROL PLANE (:8080)                    │
│  Scheduler · PolicyEngine · EvidenceCollector · Gates    │
└─────────────────────┼───────────────────────────────────┘
                      │ NATS JetStream
┌─────────────────────┼───────────────────────────────────┐
│             RUST DATA PLANE (Workers)                    │
│   Docker Container Execution · Artifact I/O · Streaming  │
└─────────────────────┼───────────────────────────────────┘
                      │
           ┌──────────┼──────────┐
           │ PostgreSQL│  MinIO   │
           │   (state) │(artifacts)│
           └──────────┴──────────┘
```

### Why Unified (Not 3 Studios)

| Old (v1) | New (Unified) |
|----------|---------------|
| 3 separate React apps (ports 3001-3003) | 1 React app (port 3000) |
| Iframe embedding with postMessage | Single router, shared context |
| Separate state per studio | Single Zustand store hierarchy |
| Context lost crossing studio boundaries | Seamless navigation with preserved state |

---

## 2. The Unified Canvas — 6 Node Types

All node types live on **one @xyflow/react canvas**. Engineers build hybrid workflows mixing tools, agents, governance, and logic.

| Node Type | Visual | Execution | Ports |
|-----------|--------|-----------|-------|
| **Trigger** | Lightning bolt, green border | No execution — activates on external event | 0 in, 1+ out |
| **Tool** | Wrench icon, orange border | Docker container via NATS → Rust runner | 1+ in, 1+ out |
| **Agent** | Brain icon, purple border | Go orchestration → LLM + delegated tool runs | 1 main + `[M][T][P][Mem]` sub-ports |
| **Gate** | Shield icon, green/red border | In-process Go evaluation against DB state | 1 in, 1 out |
| **Logic** | Diamond (IF/Switch/Merge) | In-process Go conditional branching | 1+ in, 1+ out |
| **Data** | File icon (Upload/Transform) | In-process Go artifact staging | 0-1 in, 1 out |

### Agent Sub-Ports

```
┌────────────────────────────────┐
│         Agent Node              │
│  ┌───┐ ┌───┐ ┌───┐ ┌─────┐   │
│  │ M │ │ T │ │ P │ │ Mem │   │
│  └───┘ └───┘ └───┘ └─────┘   │
│  Model  Tools Policy Memory    │
└────────────────────────────────┘
```

- **[M]** Model — LLM provider + model (e.g., Claude Sonnet)
- **[T]** Tools — Which tools this agent can invoke
- **[P]** Policy — Confidence threshold, cost limits, escalation rules
- **[Mem]** Memory — Persistent facts/patterns (pgvector)

---

## 3. Expression System

Extended from n8n's `{{ }}` syntax with AIRAIE-specific variables:

```javascript
// n8n-standard
{{ $json.max_stress }}                     // Current item data
{{ $('FEA Solver').json.converged }}        // Specific node output

// AIRAIE extensions
{{ $artifacts.mesh_file }}                  // Artifact reference (S3 ID)
{{ $run.id }}                              // Current run metadata
{{ $gate('Evidence').status }}              // Gate evaluation result
{{ $board.mode }}                           // Board mode (explore/study/release)
{{ $cost.total }}                           // Accumulated run cost
{{ $metadata.source_node }}                 // Execution metadata
```

Expressions are evaluated by the Go control plane **at run time** before dispatching node jobs.

---

## 4. Data Flow — Edge Envelope

Between nodes, data flows as **item arrays** with structured JSON + artifact references:

```json
{
  "items": [
    {
      "json": {
        "mesh_quality": 0.95,
        "converged": true,
        "max_stress_mpa": 187.3
      },
      "artifacts": {
        "mesh_file": "art_abc123_sha256...",
        "stress_map": "art_def456_sha256..."
      },
      "metadata": {
        "source_node": "fea_solver_1",
        "run_id": "run_xyz789",
        "cost_usd": 0.50,
        "duration_ms": 15000
      }
    }
  ]
}
```

**Critical difference from n8n:** Artifacts flow as **S3 references (IDs)**, not in-memory blobs. Engineering files (multi-GB CAD, simulation results) never fit in memory.

---

## 5. State Machines

### 5.1 Workflow Version Lifecycle

```
DRAFT ──→ COMPILED ──→ PUBLISHED ──→ (deprecated)
  │          │              │
 Auto-    Validated      Immutable
 saved    AST + DAG      production
 on edit  cycle-free     snapshot
```

- **DRAFT**: Editable on canvas. Auto-saved via `PUT /v0/workflows/:id`
- **COMPILED**: YAML DSL parsed → AST → topological sort → cycle detection → type checking
- **PUBLISHED**: Frozen. New changes require a new version row.

### 5.2 Run Lifecycle (Global)

```
PENDING ──→ RUNNING ──→ SUCCEEDED
                    ├──→ FAILED
                    ├──→ CANCELED
                    └──→ PAUSED (gate waiting)
```

### 5.3 NodeRun Lifecycle (Per Node)

```
QUEUED → ACQUIRED → PRE-FLIGHT → I/O_PREP → EXECUTING →
STREAMING → I/O_TEARDOWN → COMPLETED
                                    ├── SUCCEEDED
                                    ├── FAILED (+ retry?)
                                    └── SKIPPED (conditional)
```

**Retry logic:** If `retry_policy.max_retries > 0` and node failed, re-enqueue to NATS with incremented attempt counter. If `critical: true`, abort entire workflow on failure.

### 5.4 Agent Execution Loop

```
CONTEXT_GATHER → CAPABILITY_SEARCH → SCORING → PROPOSAL_GEN
       ↑                                            │
       │                                     POLICY_CHECK
       │                                      ├── AUTO_APPROVE → DISPATCH_TOOL
       │                                      ├── ESCALATE → wait human
       │                                      └── REJECT → abort
       │                                            │
       └──────────── ITERATE? ◄──────── RESULT_EVAL
                        │
                      DONE → output to next node
```

**Scoring formula:**
```
final_score = (1 - llm_weight) × algo_score + llm_weight × llm_score
```

Where `algo_score = 0.4 × compatibility + 0.3 × trust + 0.2 × cost + 0.1 × latency`

### 5.5 Gate Lifecycle

```
PENDING → EVALUATING ──→ PASSED
                     ├──→ BLOCKED
                     └──→ WAIVED (with audit trail)
```

**Requirement types:**
| Type | Checks | Example |
|------|--------|---------|
| `run_succeeded` | Upstream run completed | "FEA run must succeed" |
| `artifact_exists` | Specific artifact produced | "Mesh file must exist" |
| `threshold_met` | Metric within bounds | `max_stress < 250 MPa` |
| `role_signed` | Human signature required | "Lead engineer approved" |

### 5.6 Board Lifecycle (Mode Escalation)

```
EXPLORE ──→ STUDY ──→ RELEASE ──→ (ARCHIVED)
   │          │          │
  No       Gates       All gates
  gates    enforced    must pass
  free     block on    immutable
  form     failure     locked
```

**Policy overrides by mode:**

| Setting | Explore | Study | Release |
|---------|---------|-------|---------|
| Agent confidence threshold | 0.60 | 0.75 | 0.90 |
| Auto-approve proposals | Yes | If high confidence | Never |
| Gate enforcement | Optional | Required | Strict |
| Evidence required | No | Automated | Automated + manual |
| Release packet | N/A | N/A | Generated + locked |

---

## 6. Execution Pipeline — End to End

### Step-by-Step: User Click → Release Packet

```
┌─ STEP 1: USER CLICKS "Run Workflow" ─────────────────────────────┐
│                                                                    │
│  Frontend: POST /v0/runs { workflowId, version, inputs }         │
│  Response: { run_id, status: "PENDING" }                          │
│  Frontend: Opens SSE stream GET /v0/runs/{id}/stream              │
│                                                                    │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────┐
│ STEP 2: GO CONTROL PLANE                                           │
│                                                                    │
│  1. Validate workflow is PUBLISHED                                 │
│  2. Create Run entity (status: PENDING → RUNNING)                 │
│  3. Workflow Compiler:                                             │
│     - Parse nodes/edges from definition                            │
│     - Kahn's algorithm: detect cycles                              │
│     - Type-check node connections against ToolContracts            │
│     - Generate ExecutionPlan (DAG)                                 │
│  4. DAG Scheduler:                                                 │
│     - Find root nodes (zero dependencies)                          │
│     - For each root:                                               │
│       a. Resolve {{ }} expressions                                 │
│       b. Gate/Logic? → execute in-process                          │
│       c. Tool/Agent? → enqueue to NATS                             │
│                                                                    │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────┐
│ STEP 3: NATS DISPATCH                                              │
│                                                                    │
│  Subject: airaie.jobs.{category}                                   │
│  Payload:                                                          │
│  {                                                                 │
│    job_id, run_id, node_id,                                        │
│    tool_ref: "mesh-generator@1.0.0",                              │
│    inputs: { geometry: "art_cad_001", density: 0.8 },             │
│    artifact_presigned_urls: { geometry: "s3://..." },             │
│    resource_limits: { cpu: 4, memory_mb: 2048, timeout_s: 300 }, │
│    container_image: "mesh-gen:1.0"                                │
│  }                                                                 │
│                                                                    │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────┐
│ STEP 4: RUST DATA PLANE                                            │
│                                                                    │
│  1. NATS consumer receives job                                     │
│  2. I/O PREP: Download input artifacts from S3 → /in volume       │
│  3. EXECUTING: Boot Docker container with tool image               │
│     - Mount /in (inputs), /out (outputs)                           │
│     - Tool reads /in, writes /out (completely cloud-agnostic)     │
│     - stdout/stderr streamed to NATS "events.{runId}"             │
│  4. I/O TEARDOWN:                                                  │
│     - Collect /out files                                           │
│     - SHA-256 hash each output (immutable lineage)                │
│     - Upload to MinIO with presigned URLs                         │
│     - Publish JobResult to NATS "results.completed"               │
│                                                                    │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────┐
│ STEP 5: GO RESULT HANDLER                                          │
│                                                                    │
│  1. Consume from "results.completed"                               │
│  2. Update NodeRun in DB (status, outputs, metrics)               │
│  3. Store artifact metadata in artifacts table                     │
│  4. Check downstream dependencies:                                 │
│     - All upstream done? → enqueue next nodes to NATS             │
│  5. If all leaf nodes complete → Run status: SUCCEEDED/FAILED     │
│  6. Emit SSE events to frontend:                                   │
│     data: { type: "node_completed", node_id, status, outputs }    │
│     data: { type: "artifact_produced", artifact_id, type }        │
│                                                                    │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────┐
│ STEP 6: EVIDENCE COLLECTION (if run linked to board)               │
│                                                                    │
│  1. EvidenceCollectorService extracts metrics from tool outputs    │
│     { metric: "factor_of_safety", value: 1.67, passed: true }    │
│     { metric: "max_stress_mpa", value: 142.3, passed: true }     │
│  2. Create CardEvidence records in DB                              │
│  3. Emit SSE: { type: "evidence_collected", metric_key, value }   │
│                                                                    │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────┐
│ STEP 7: GATE EVALUATION                                            │
│                                                                    │
│  GateEvaluator checks requirements against evidence:               │
│  ├─ factor_of_safety >= 1.5 ? → 1.67 >= 1.5 → PASS ✓            │
│  ├─ max_stress_mpa <= 200 ?   → 142.3 <= 200 → PASS ✓           │
│  └─ lead_engineer_signed ?    → pending → BLOCKED                  │
│                                                                    │
│  Emit SSE: { type: "gate_evaluated", gate_id, status }            │
│                                                                    │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────┐
│ STEP 8: BOARD STATE TRANSITION                                     │
│                                                                    │
│  If all gates passed + all evidence collected:                     │
│    POST /v0/boards/{id}/escalate { next_mode: "release" }         │
│    Board transitions: study → release                              │
│                                                                    │
│  POST /v0/boards/{id}/release-packet                              │
│    → Frozen artifact bundle + BOM + approval chain + audit trail  │
│    → Board locked. Manufacturing can proceed.                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 7. Agent System — Deep Dive

### ActionProposal (Agent Output Contract)

```json
{
  "proposal_id": "prop_abc123",
  "agent_id": "agent_fea_optimizer@2.0.0",
  "status": "PENDING_APPROVAL",
  "goal": "Minimize mass while maintaining SF >= 1.5",
  "proposed_tools": [
    {
      "tool_ref": "mesh-generator@1.0",
      "inputs": { "geometry_id": "art_001", "refinement": 3 },
      "confidence": 0.92,
      "rationale": "High-quality mesh required for accuracy",
      "cost_estimate": 0.25
    },
    {
      "tool_ref": "fea-solver@2.1",
      "inputs": { "mesh_id": "{{ mesh-generator.output }}" },
      "confidence": 0.90,
      "rationale": "Industry-standard solver with proven convergence"
    }
  ],
  "total_cost_estimate": 0.75,
  "risk_level": "low",
  "required_validations": ["convergence_check", "mesh_quality_check"]
}
```

### Policy Engine Rules

```yaml
decision_policy:
  confidence_threshold: 0.85    # Below this → require human approval

  require_human_approval_when:
    - risk: "high"
    - confidence: "< 0.8"
    - tool_has_side_effects: true
    - cost_exceeds: 5.00

  escalation_rules:
    - condition: "3 consecutive failures"
      action: "pause_and_notify_lead_engineer"
    - condition: "cost > budget_limit * 0.9"
      action: "require_lead_approval"

  fallback_strategy: "retry" | "alternative_tool" | "escalate" | "abort"
```

### Tool Scoring (3 Dimensions)

| Dimension | Formula | Range |
|-----------|---------|-------|
| **Compatibility** | matched_capabilities / total_requested | 0.0 – 1.0 |
| **Trust** | historical success_rate per tool | 0.0 – 1.0 |
| **Cost** | 1.0 / (1.0 + cpu + mem/1000 + timeout/300) | 0.0 – 1.0 |

---

## 8. Frontend Architecture

### 8.1 Single App Structure

```
airaie_platform/frontend/
├── src/
│   ├── pages/              # Route pages (WorkflowsPage, AgentsPage, BoardsPage, etc.)
│   ├── components/
│   │   ├── layout/         # AppShell, Sidebar, Header, RightPanel
│   │   ├── ui/             # Button, Card, Badge, Modal, Input, Tag, etc.
│   │   ├── workflows/      # Canvas, NodePalette, NodeInspector, CreateWorkflowModal
│   │   ├── agents/         # CreateAgentModal, ChatInterface, PolicyCard
│   │   └── studio/         # StudioFrame (legacy iframe wrapper)
│   ├── store/              # Zustand stores
│   ├── api/                # API client functions
│   ├── hooks/              # React Query hooks
│   ├── types/              # TypeScript interfaces
│   ├── constants/          # Routes, API config
│   ├── utils/              # cn(), format, validation
│   └── styles/             # tokens.css, globals.css
```

### 8.2 State Management (Zustand Stores)

```typescript
// workflowStore — DAG editor state
{
  nodes: WorkflowEditorNode[],
  edges: WorkflowEditorEdge[],
  selectedNodeId?: string,
  metadata: WorkflowEditorMetadata,
  isDirty: boolean,
  setNodes(), addNode(), updateNodeData(), onConnect()
}

// executionStore — active run
{
  activeRunId?: string,
  nodeRunStates: Map<nodeId, { status, output, error }>,
  logs: LogEntry[],
  streamConnected: boolean
}

// uiStore — UI chrome
{
  sidebarCollapsed: boolean,
  sidebarContentType: 'navigation' | 'nodePalette' | 'sessions' | 'filters',
  rightPanel: { open, contentType, width, data },
  bottomBar: { visible, contentType },
  modals: ModalEntry[],
  studioFullscreen: boolean
}
```

### 8.3 Routes

```typescript
ROUTES = {
  DASHBOARD:       '/dashboard',
  WORKFLOWS:       '/workflows',
  WORKFLOW_DETAIL:  '/workflows/:id',
  WORKFLOW_STUDIO:  '/workflow-studio',
  AGENTS:          '/agents',
  AGENT_DETAIL:    '/agents/:id',
  TOOLS:           '/tools',
  BOARDS:          '/boards',
}
```

### 8.4 API Client Pattern

```typescript
// Try real API, fall back to mock data
async function tryApiOrMock<T>(url, options, mockData): Promise<T> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return mockData;
  }
}
```

---

## 9. Backend API Surface (86 Endpoints)

### Boards
```
POST   /v0/boards                    Create board
GET    /v0/boards                    List boards
GET    /v0/boards/:id                Get board detail
PATCH  /v0/boards/:id                Update board
DELETE /v0/boards/:id                Delete board
GET    /v0/boards/:id/summary        Readiness score + gates
POST   /v0/boards/:id/escalate       Mode transition (explore→study→release)
POST   /v0/boards/:id/release-packet Generate locked release bundle
```

### Cards
```
GET    /v0/boards/:boardId/cards     List cards
POST   /v0/boards/:boardId/cards     Create card
GET    /v0/cards/:id                 Get card detail
PATCH  /v0/cards/:id                 Update card
GET    /v0/cards/:id/evidence        Get all evidence
POST   /v0/cards/:id/evidence        Record manual evidence
POST   /v0/cards/:id/plan/generate   Generate execution plan
POST   /v0/cards/:id/plan/execute    Start execution
```

### Gates
```
GET    /v0/gates?board_id=X          List gates for board
GET    /v0/gates/:id                 Get gate detail
POST   /v0/gates/:id/evaluate        Trigger evaluation
POST   /v0/gates/:id/approve         Human approval
POST   /v0/gates/:id/waive           Waive with rationale
```

### Workflows
```
POST   /v0/workflows                 Create workflow
GET    /v0/workflows                 List workflows
GET    /v0/workflows/:id             Get workflow detail
PUT    /v0/workflows/:id             Update (save draft)
DELETE /v0/workflows/:id             Delete workflow
POST   /v0/workflows/:id/compile     Compile YAML → AST
POST   /v0/workflows/:id/publish     Publish version
GET    /v0/workflows/:id/versions    List versions
```

### Runs
```
POST   /v0/runs                      Create run (execute workflow)
GET    /v0/runs                      List runs
GET    /v0/runs/:id                  Get run detail
GET    /v0/runs/:id/stream           SSE real-time events
POST   /v0/runs/:id/cancel           Cancel run
POST   /v0/runs/:id/retry            Retry failed run
```

### Agents
```
POST   /v0/agents                    Create agent spec
GET    /v0/agents                    List agents
GET    /v0/agents/:id                Get agent detail
PUT    /v0/agents/:id                Update agent spec
POST   /v0/agents/:id/propose        Generate ActionProposal
POST   /v0/agents/:id/proposals/:pid/approve   Approve proposal
POST   /v0/agents/:id/proposals/:pid/reject    Reject proposal
```

### Tools
```
GET    /v0/tools                     List tools
POST   /v0/tools                     Register tool
GET    /v0/tools/:id                 Get tool detail
GET    /v0/tools/:id/contract        Get I/O contract (JSON Schema)
GET    /v0/tools/:id/versions        List versions
POST   /v0/tools/resolve             ToolShelf capability resolution
```

### Unified Studio
```
GET    /v0/node-types                List available node types (palette)
POST   /v0/expressions/eval          Validate {{ }} expression syntax
GET    /v0/workflows/:id/canvas      Get canvas state (positions)
PUT    /v0/workflows/:id/canvas      Save canvas viewport/positions
```

---

## 10. SSE Event Types (Real-Time Streaming)

```
GET /v0/runs/{runId}/stream

Events:
  data: { type: "node_started",       node_id, timestamp }
  data: { type: "node_progress",      node_id, percent }
  data: { type: "log_line",           node_id, level, message }
  data: { type: "node_completed",     node_id, status, outputs }
  data: { type: "artifact_produced",  artifact_id, type }
  data: { type: "evidence_collected", metric_key, value }
  data: { type: "gate_evaluated",     gate_id, status }
  data: { type: "run_completed",      status, duration_ms, cost_usd }
```

---

## 11. NATS Message Subjects

```
airaie.jobs.tool.execution      # Tool node dispatch
airaie.jobs.agent.execution     # Agent node dispatch
airaie.jobs.approval.wait       # Gate requiring human approval
airaie.events.{runId}           # Real-time log streaming per run
airaie.results.completed        # Job completion callback
airaie.execution.completed      # Full run completion event
```

---

## 12. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, TypeScript 5.8, Vite | Single unified app |
| **Canvas** | @xyflow/react | Visual DAG editor |
| **Client State** | Zustand 5 | Canvas, execution, UI state |
| **Server State** | TanStack React Query 5 | API caching, pagination |
| **Styling** | Tailwind CSS 3.4 | Design system |
| **Expression Editor** | CodeMirror 6 | `{{ }}` editing |
| **Charts** | Recharts | Analytics dashboards |
| **Control Plane** | Go 1.25 | API gateway, scheduler, policy engine |
| **Data Plane** | Rust 1.75 | Container execution, artifact I/O |
| **Database** | PostgreSQL 16 | State, models, audit log |
| **Message Queue** | NATS JetStream 2.10 | Job dispatch, event streaming |
| **Object Storage** | MinIO (S3-compatible) | Artifacts, engineering files |
| **Containers** | Docker | Sandboxed tool execution |
| **Vector DB** | pgvector (PostgreSQL) | Agent memory embeddings |

---

## 13. Key Architectural Principles

1. **Everything is an Artifact** — Versioned, content-addressed (SHA-256), immutable, traceable
2. **Workflows are the Only State Mutators** — All execution through Workflow Runtime for determinism
3. **Agents Propose; Runtime Executes** — Agents output structured proposals, never directly mutate
4. **Contracts Everywhere** — Tools declare typed I/O via JSON Schema enabling validation + auto-UI
5. **Traceability by Default** — Every result links to inputs, tool versions, workflow version, user/agent
6. **Boards Govern, Don't Execute** — Boards track evidence; workflows execute; agents decide
7. **Distributed Container Execution** — Each tool runs in isolated Docker via NATS + Rust (not in-process JS like n8n)
8. **Artifact References, Not Blobs** — Multi-GB engineering files flow as S3 IDs, never in memory

---

## 14. Core Concept Hierarchy

```
Artifact (immutable, versioned, content-addressed)
  ↑ produced by
Run (execution instance of workflow)
  ↑ composed of
ExecutionPlan (DAG of nodes, compiled from YAML)
  ↑ derived from
Card (atomic unit of work: intent + tool + evidence + gate)
  ↑ collected in
Board (governance container: cards + gates + readiness score)
  ↑ with mode
[ explore | study | release ] (state machine)
  ↑ produces
Release Packet (manufacturing-ready, locked, auditable proof)
```

Every engineering decision is traceable, every execution is reproducible, and nothing falls through cracks between tools.
