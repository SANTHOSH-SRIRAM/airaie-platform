# AIRAIE Platform — Systems Guide

> How each system works end-to-end: where the user starts, what they input, how data flows through the kernel, and where they see results.

---

## Table of Contents

1. [Platform Entry Points](#1-platform-entry-points)
2. [Workflow System](#2-workflow-system)
3. [Agent System](#3-agent-system)
4. [Tool System](#4-tool-system)
5. [Board (Governance) System](#5-board-governance-system)
6. [How The Four Systems Connect](#6-how-the-four-systems-connect)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [State Machines](#8-state-machines)
9. [API Contract Reference](#9-api-contract-reference)
10. [Frontend Screen Map](#10-frontend-screen-map)
11. [Implementation Status](#11-implementation-status)

---

## 1. Platform Entry Points

### 1.1 The Single App Shell

Everything lives in one React 19 application at `localhost:3000`. The user sees:

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                         │
│  AIRAIE │ Dashboard  Workflows  Agents  Tools  Boards │ Search │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  SIDE  │              MAIN CONTENT AREA                         │
│  BAR   │                                                        │
│        │  (changes based on route)                              │
│ Work-  │                                                        │
│ space  │                                                        │
│ Quick  │                                                        │
│ Actions│                                                        │
│ Recent │                                                        │
│        │                                                        │
├────────┴────────────────────────────────────────────────────────┤
│  STATUS BAR                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Who Starts Where

| Role | First Screen | Primary Action | Goal |
|------|-------------|----------------|------|
| **Design Engineer** | Dashboard → Workflows | Build workflow, run simulation | Get FEA/CFD results |
| **Team Lead** | Dashboard → Boards | Review gates, approve evidence | Release to manufacturing |
| **AI/ML Engineer** | Dashboard → Agents | Configure agent, test in playground | Automate tool selection |
| **Platform Admin** | Dashboard → Tools | Register tools, manage contracts | Expand tool catalog |

### 1.3 Navigation Map

```
Dashboard (/dashboard)
├── Workflows (/workflows)
│   ├── + New Workflow → CreateWorkflowModal
│   ├── Click card → Workflow Detail (/workflows/:id)
│   │   ├── Open Editor → Workflow Canvas (/workflow-studio/:id)
│   │   ├── View Runs → Run Monitor (/workflow-runs)
│   │   │   └── Click run → Run Detail (/workflow-runs/:runId)
│   │   └── Start Run → Creates run, opens monitor
│   └── Workflow Canvas (/workflow-studio/:id)
│       ├── Drag nodes from palette
│       ├── Connect edges
│       ├── Configure node params (right panel)
│       ├── Save / Publish
│       └── Run → Run Monitor
│
├── Agents (/agents)
│   ├── + New Agent → CreateAgentModal
│   └── Click agent → Agent Studio (/agent-studio/:id)
│       ├── Builder tab → Configure goal, model, tools, policy
│       ├── Playground tab → Chat: test proposals
│       ├── Evals tab → Run golden dataset tests
│       └── Runs tab → Execution history
│
├── Tools (/tools)
│   ├── Search/filter tool registry
│   ├── Click tool → Quick View (contract, limits, stats)
│   └── Register Tool → Wizard (name, contract, adapter, image)
│
└── Boards (/boards)
    ├── + New Board → Create Board
    ├── Click board → Board Detail
    │   ├── Cards (work units with intent + tools)
    │   ├── Gates (quality checkpoints)
    │   ├── Evidence (auto-collected from runs)
    │   └── Release Packet (locked proof bundle)
    └── Review Now → Gate approval
```

---

## 2. Workflow System

### 2.1 What Is a Workflow

A workflow is a **directed acyclic graph (DAG)** of nodes that execute engineering computations in sequence. Think of it as a pipeline: data flows from left to right through connected nodes.

```
[Webhook] → [Mesh Generator] → [FEA Solver] → [AI Optimizer] → [Evidence Gate]
 trigger      tool (Docker)     tool (Docker)   agent (LLM)      governance
```

### 2.2 User Journey — Step by Step

#### Step 1: Create Workflow

**Screen:** WorkflowsPage → Click "+ New Workflow"
**Modal:** CreateWorkflowModal

**User provides:**
```
┌─────────────────────────────────────────────────┐
│  New Workflow                              [X]   │
│                                                  │
│  NAME                                            │
│  ┌──────────────────────────────────────────┐   │
│  │ e.g. FEA Validation Pipeline             │   │
│  └──────────────────────────────────────────┘   │
│  Use a descriptive name for your workflow        │
│                                                  │
│  DESCRIPTION  Optional                           │
│  ┌──────────────────────────────────────────┐   │
│  │ What does this workflow do?               │   │
│  └──────────────────────────────────────────┘   │
│                                            0/300 │
│                                                  │
│  START FROM                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Blank Canvas│ │From Template│ │Import YAML│ │
│  │   (●)       │ │   ( )      │ │   ( )     │ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
│                                                  │
│  INITIAL TRIGGER                                 │
│  [Webhook●] [Schedule] [Event] [Manual]          │
│                                                  │
│  TAGS  Optional                                  │
│  [simulation ×] Add tags...                      │
│                                                  │
│  PROJECT                                         │
│  ┌──────────────────────────────────────┐       │
│  │ 📁 Default Project                 ∨ │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  ⓘ Workflow will be created as v1 draft         │
│                           Cancel [Create Workflow→]│
└─────────────────────────────────────────────────┘
```

**Data created:**
```json
{
  "name": "FEA Validation Pipeline",
  "description": "End-to-end stress validation with mesh generation",
  "startFrom": "blank",
  "trigger": "webhook",
  "tags": ["simulation"],
  "project": "Default Project"
}
```

**API call:** `POST /v0/workflows` → returns `{ id: "wf_abc123", status: "draft", version: "v1" }`

**Where it goes:** User is navigated to `/workflow-studio/wf_abc123`

---

#### Step 2: Build on Canvas

**Screen:** WorkflowEditorPage (`/workflow-studio/:id`)

**Layout:**
```
┌──────────┬──────────────────────────────────┬──────────────┐
│ NODE     │         CANVAS                    │  NODE        │
│ PALETTE  │                                   │  INSPECTOR   │
│          │  [Webhook]──→[Mesh Gen]──→[FEA]  │              │
│ Triggers │                              │    │  Name: FEA   │
│  Webhook │              [AI Opt]←───────┘    │  Tool: v2.1  │
│  Cron    │                │                  │  Inputs:     │
│  Event   │          [Evidence Gate]           │   mesh: {{}} │
│          │                                   │   load: 500  │
│ Tools    │                                   │  Timeout: 300│
│  FEA     │                                   │              │
│  CFD     │                                   │              │
│  Mesh    │  ┌────────────────────────────┐   │              │
│          │  │     ▶ Run Workflow          │   │              │
│ Agents   │  └────────────────────────────┘   │              │
│ Logic    │                                   │              │
│ Gates    │                                   │              │
└──────────┴──────────────────────────────────┴──────────────┘
```

**User actions on canvas:**
1. **Drag node** from left palette → drops on canvas
2. **Connect** by dragging from output handle to input handle → creates edge
3. **Click node** → right panel shows configuration form
4. **Configure** each node's parameters:

**Per node type, user provides:**

| Node Type | User Configures | Example |
|-----------|----------------|---------|
| **Trigger** | Type (webhook/cron/event), endpoint config | `POST /webhook/fea-validation` |
| **Tool** | Tool version, input parameters (from contract), resource limits | `mesh_density: 0.8, element_type: "hex8"` |
| **Agent** | Goal text, model selection, LLM weight, tools to grant, policy | `"Optimize weight while SF >= 1.5"` |
| **Gate** | Requirements list (metric thresholds, required signatures) | `max_stress < 250 MPa AND lead_signed` |
| **Logic** | Condition expression, branch mapping | `{{ $json.converged }} === true` |

**Expression system for wiring nodes:**
```
Node B input "mesh" = {{ $('Mesh Generator').artifacts.output }}
Node C input "load" = {{ $json.load_cases }}
```

**Save:** Auto-saves on edit → `PUT /v0/workflows/:id` (draft state)
**Publish:** Click "Publish" → `POST /v0/workflows/:id/publish` (freezes version, immutable)

---

#### Step 3: Run Workflow

**User clicks:** "Run Workflow" button (bottom bar) or "Start Run" on detail page

**What happens (invisible to user, visible as status badges):**

```
User clicks "Run"
  │
  ▼
POST /v0/runs { workflowId: "wf_abc123", version: "v3" }
  │
  ▼ Go Control Plane
  │
  ├─ 1. Validate: Is workflow PUBLISHED? ✓
  ├─ 2. Create Run record (status: PENDING → RUNNING)
  ├─ 3. Compile: Parse nodes → Kahn's algorithm → topological sort
  ├─ 4. Find root nodes (Webhook trigger — no dependencies)
  ├─ 5. Resolve {{ }} expressions for root inputs
  └─ 6. Dispatch root jobs to NATS
         │
         ▼ NATS JetStream
         │
         Subject: airaie.jobs.tool.execution
         Payload: {
           job_id: "job_001",
           run_id: "run_xyz",
           node_id: "mesh_gen_1",
           tool_ref: "mesh-generator@1.0",
           inputs: { geometry: "art_cad_001", density: 0.8 },
           container_image: "mesh-gen:1.0",
           resource_limits: { cpu: 4, memory_mb: 2048, timeout_s: 300 }
         }
         │
         ▼ Rust Data Plane
         │
         ├─ 7. Download input artifacts from S3 → /in volume
         ├─ 8. Boot Docker container: mesh-gen:1.0
         ├─ 9. Container reads /in, writes to /out
         ├─ 10. Stream stdout/stderr → NATS "events.{runId}"
         ├─ 11. Collect /out files, SHA-256 hash each
         ├─ 12. Upload to MinIO (S3), publish artifact metadata
         └─ 13. Publish JobResult to NATS "results.completed"
                │
                ▼ Go Result Handler
                │
                ├─ 14. Update NodeRun in DB (status: SUCCEEDED)
                ├─ 15. Check downstream deps: Mesh Gen done → FEA Solver ready
                ├─ 16. Dispatch FEA Solver job to NATS
                ├─ 17. ... repeat for each subsequent node ...
                └─ 18. All leaf nodes done → Run status: SUCCEEDED
                       │
                       ▼ SSE to Frontend
                       │
                       Events streamed to user's browser:
                       data: { type: "node_started", node_id: "mesh_gen_1" }
                       data: { type: "node_completed", node_id: "mesh_gen_1", status: "succeeded" }
                       data: { type: "artifact_produced", artifact_id: "art_mesh_001" }
                       data: { type: "node_started", node_id: "fea_solver_1" }
                       ...
                       data: { type: "run_completed", status: "succeeded", duration_ms: 42000 }
```

---

#### Step 4: Monitor Run

**Screen:** WorkflowRunsPage (`/workflow-runs/:runId`)

**What user sees in real-time:**
```
┌────────────┬──────────────────────────────────────┬─────────────┐
│ RUNS LIST  │  DAG VISUALIZATION                    │ NODE DETAIL │
│            │                                       │             │
│ ● run_a1b2 │  [Webhook]──✓──[Mesh Gen]──✓──[FEA] │ FEA Solver  │
│   Running  │                              ●running │ Status: ●   │
│            │            [AI Opt]◀──────────┘       │ Duration:   │
│ ✓ run_x4k9 │              ○queued                  │   14.2s     │
│   Succeeded│        [Evidence Gate]                │ Inputs:     │
│            │              ○queued                  │  mesh: art_ │
│ ✗ run_d3f5 │                                       │  load: 500  │
│   Failed   │  LOGS                                 │ Outputs:    │
│            │  [14:32:01] Mesh Gen: Starting...     │  stress_map │
│            │  [14:32:08] Mesh Gen: Complete (7.2s) │  max: 187MPa│
│            │  [14:32:08] FEA Solver: Starting...   │ Cost: $0.50 │
│            │  [14:32:09] FEA Solver: Iteration 1   │             │
│            │  [14:32:15] FEA Solver: Converged ✓   │ Artifacts:  │
│            │  [14:32:22] FEA Solver: Complete       │  stress.vtk │
│            │                                       │  report.json│
└────────────┴──────────────────────────────────────┴─────────────┘
```

**Color-coded node badges:**
- ○ Gray = Queued (waiting for upstream)
- ● Blue = Running (spinner)
- ✓ Green = Succeeded
- ✗ Red = Failed
- ⊘ Gray = Skipped (conditional branch not taken)

---

#### Step 5: Inspect Results

**Screen:** WorkflowDetailPage (`/workflows/:id`)

**What user sees:**
```
Quick Stats                          Recent Runs
┌──────────┬──────────┬────────┬──────────┐  ┌────────────────────────────────┐
│   156    │   94%    │  42s   │ $288.60  │  │ run_a1b2c3  Running   ████░░ │
│   runs   │ success  │avg dur │total cost│  │ run_x4k9d8  Succeeded  $1.24 │
└──────────┴──────────┴────────┴──────────┘  │ run_d3f5g6  Failed     $1.05 │
                                              └────────────────────────────────┘
Version History                      Node Breakdown
┌───────────────────────────────┐   ┌──────────────────────────────────┐
│ ● v3 Published Active         │   │ ⚡ Webhook    trigger   4,200ms  │
│   Added Evidence Gate + AI Opt│   │ 🔧 Mesh Gen   tool     7,200ms  │
│ ○ v2 Published                │   │ 🔧 FEA Solver tool    14,000ms  │
│   Upgraded FEA Solver to v2.1 │   │ 🤖 AI Opt     agent    1,790ms  │
│ ○ v1 Deprecated               │   │ 🛡 Gate       gate         —    │
│   Initial 3-node pipeline     │   └──────────────────────────────────┘
└───────────────────────────────┘

Trigger                              Linked Resources
┌───────────────────────────────┐   ┌──────────────────────────────────┐
│ ⚡ Webhook                     │   │ Boards: Structural Validation    │
│ POST https://api.airaie.io/.. │   │ Agents: FEA Optimizer Agent      │
│ Last: 2 min ago · 156 times   │   │ Tools:  Mesh Gen, FEA Solver     │
└───────────────────────────────┘   └──────────────────────────────────┘
```

---

### 2.3 Workflow Data Model

```
Workflow
├── id: "wf_fea_validation"
├── name: "FEA Validation Pipeline"
├── status: "published"
├── versions[]
│   └── Version
│       ├── version: "v3"
│       ├── status: "published" (immutable)
│       ├── nodes_json: [...node definitions...]
│       ├── connections_json: [...edge definitions...]
│       └── dsl_yaml: "api_version: airaie.workflow/v1\n..."
├── triggers[]
│   └── Trigger { type: "webhook", config: { endpoint }, isEnabled: true }
└── runs[] → see Run model below
```

---

## 3. Agent System

### 3.1 What Is an Agent

An agent is a **goal-driven AI decision-maker** that autonomously selects and configures engineering tools. Instead of the user manually choosing "use FEA Solver with these params," the agent does it based on context.

**The key difference from a tool:** A tool is a fixed algorithm. An agent *decides which tool to use and how*.

### 3.2 User Journey — Step by Step

#### Step 1: Create Agent

**Screen:** AgentsPage → Click "New Agent"
**Modal:** CreateAgentModal

**User provides (full form):**
```
┌───────────────────────────────────────────────────────┐
│ 🧠 Create New Agent                             [X]   │
│ Create an AI agent that autonomously selects and       │
│ executes engineering tools                             │
│                                                        │
│ AGENT NAME                                             │
│ ┌────────────────────────────────────────────────┐    │
│ │ e.g. FEA Optimizer Agent                       │    │
│ └────────────────────────────────────────────────┘    │
│                                                        │
│ GOAL *                                                 │
│ ┌────────────────────────────────────────────────┐    │
│ │ Describe what this agent should achieve.       │    │
│ │ Be specific about inputs, tools, and success   │    │
│ │ criteria...                                    │    │
│ └────────────────────────────────────────────────┘    │
│ 💡 Tip: A good goal describes the desired outcome     │
│                                                        │
│ MODEL                                                  │
│ Provider                                               │
│ ┌────────────┐┌──────────┐┌────────┐┌────────────┐   │
│ │● Anthropic ││  OpenAI  ││ Google ││ HuggingFace│   │
│ │ Cl. Sonnet ││  GPT-4o  ││Gem Pro ││Custom Model│   │
│ └────────────┘└──────────┘└────────┘└────────────┘   │
│                                                        │
│ Model                    LLM Weight                    │
│ ┌──────────────────┐    0.0 Algorithmic ───●── 1.0 LLM│
│ │claude-sonnet-4-6 ∨│                   0.7            │
│ └──────────────────┘                                   │
│                                                        │
│ INITIAL TOOLS  Optional — add more later in Builder    │
│ ┌──────────────────────────────────────────────┐      │
│ │ [●FEA Solver✓] [CFD Engine] [●Mesh Gen✓]    │      │
│ │ [Material DB ] [●Result An✓] [Topology..Draft]│      │
│ │ [Tolerance An] [Thermal Sol] [Cost Estimator] │      │
│ └──────────────────────────────────────────────┘      │
│ 3 tools selected · Permissions configured in Builder   │
│                                                        │
│ POLICY  Optional — fine-tune in Builder                │
│                                                        │
│ Auto-approve    Max cost/run     Timeout               │
│  ┌──────┐       ┌──────────┐    ┌──────┐             │
│  │ 0.85 │       │ $ 10.00  │    │  600 │             │
│  └──────┘       └──────────┘    └──────┘             │
│  ───●────       USD              seconds              │
│                                                        │
│ Requires approval for:                                 │
│ [read] [write■] [execute] [delete■]                    │
│                                                        │
│ Escalation rules:                                      │
│ If [confidence] [<] [0.5]  → [Reject]    🗑           │
│ If [cost]       [>] [$5.00] → [Escalate] 🗑           │
│ + Add rule                                             │
│                                                        │
│ CONSTRAINTS                                            │
│ Max Retries  Max Iterations  Max Tool Calls            │
│    (3)           (5)             (15)                   │
│                                                        │
│ TAGS & PROJECT                                         │
│ [optimization ×] Add tags...  [Default Project ∨]      │
│                                                        │
│ ┌──────────────────────────────────────────────┐      │
│ │ 🧠 Agent Summary                             │      │
│ │ [Anthropic Claude][3 tools][LLM 0.7]         │      │
│ │ [Threshold 0.85][Budget $10][Timeout 600s]    │      │
│ │ Agent will be created as v1 draft              │      │
│ └──────────────────────────────────────────────┘      │
│                                                        │
│ 🧠 3 tools · Anthropic Claude · Threshold 0.85        │
│                    Cancel  Save Draft [Create Agent ✓]  │
└───────────────────────────────────────────────────────┘
```

**API call:** `POST /v0/agents` with full AgentSpec

---

#### Step 2: Configure in Builder

**Screen:** AgentStudioPage (`/agent-studio/:id`) → Builder tab

**User configures:**

| Section | User Input | Effect |
|---------|-----------|--------|
| **Goal** | Natural language text (500 chars) | Defines what agent tries to achieve |
| **Model** | Provider + model dropdown | Which LLM reasons about tool selection |
| **LLM Weight** | Slider 0.0 – 1.0 | Balance: algorithmic scoring vs LLM judgment |
| **Tools** | Checkbox list + permissions per tool | Which tools agent can invoke |
| **Scoring** | Strategy dropdown (weighted/priority/cost_optimized) | How tools are ranked |
| **Policy** | Confidence threshold, cost limit, escalation rules | When to auto-approve vs escalate |
| **Constraints** | Max retries, max iterations, max tool calls | Safety limits |

---

#### Step 3: Test in Playground

**Screen:** AgentStudioPage → Playground tab

**What happens when user sends a message:**

```
User types: "Optimize this bracket for weight while maintaining SF >= 1.5"
  │
  ▼ POST /v0/agents/:id/propose
  │
  ▼ Agent Execution Pipeline (13 steps):
  │
  ├── 1. CONTEXT GATHER
  │      Merge: user goal + input artifacts + constraints + agent memory
  │
  ├── 2. CAPABILITY SEARCH
  │      Query tool registry: "tools that can do structural optimization"
  │      Result: [fea-solver, mesh-gen, topology-opt, material-db, cost-est]
  │
  ├── 3. ALGORITHMIC SCORING
  │      Per tool:
  │      ├── Compatibility: matched_capabilities / requested = 0.85
  │      ├── Trust: historical success_rate = 0.91
  │      └── Cost: 1/(1 + cpu + mem/1000 + timeout/300) = 0.72
  │
  ├── 4. LLM REASONING (if llm_weight > 0)
  │      Prompt: "Given goal X and tools [A, B, C], which should I use and why?"
  │      LLM: "Use mesh-gen first for refined mesh, then fea-solver for analysis"
  │
  ├── 5. BLENDED SCORING
  │      final = (1 - 0.7) × algo_score + 0.7 × llm_score
  │      Rank: mesh-gen (0.92), fea-solver (0.90), topology-opt (0.78)
  │
  ├── 6. PROPOSAL GENERATION
  │      ActionProposal:
  │      {
  │        proposed_tools: [
  │          { tool: "mesh-gen@1.0", confidence: 0.92, cost: $0.25 },
  │          { tool: "fea-solver@2.1", confidence: 0.90, cost: $0.50 }
  │        ],
  │        total_cost: $0.75,
  │        risk: "low",
  │        rationale: "High-quality mesh + proven solver for convergence"
  │      }
  │
  ├── 7. POLICY CHECK
  │      confidence (0.90) >= threshold (0.85)? → YES
  │      cost ($0.75) <= limit ($10)? → YES
  │      risk ("low") acceptable? → YES
  │      → Decision: AUTO_APPROVE
  │
  ├── 8. DISPATCH (if approved)
  │      Convert proposal → workflow nodes → NATS jobs → Docker execution
  │
  └── 9. RESULT EVAL
         Tool outputs: { weight: 2.8kg, safety_factor: 1.78 }
         Goal met? SF 1.78 >= 1.5 → YES
         → Output to next workflow node
```

**What user sees in playground:**

```
┌────────────────────────────────────────────────────────┐
│ Playground                                              │
│                                                         │
│ You: Optimize this bracket for weight, SF >= 1.5       │
│                                                         │
│ Agent: I'll use mesh-generator for a refined mesh,      │
│ then fea-solver for structural analysis.                │
│                                                         │
│ ┌─ Proposal ──────────────────────────────────────┐    │
│ │ mesh-generator@1.0  confidence: 0.92  $0.25     │    │
│ │ fea-solver@2.1      confidence: 0.90  $0.50     │    │
│ │ Total: $0.75  Risk: low  AUTO-APPROVED ✓        │    │
│ └─────────────────────────────────────────────────┘    │
│                                                         │
│ ┌─ Decision Trace ────────────────────────────────┐    │
│ │ 1. Context: bracket geometry + load 500N        │    │
│ │ 2. Search: 5 tools found                        │    │
│ │ 3. Scoring: mesh-gen 0.92, fea-solver 0.90     │    │
│ │ 4. Policy: Auto-approved (0.90 >= 0.85)        │    │
│ │ 5. Executing mesh-gen... ✓ Complete (7.2s)      │    │
│ │ 6. Executing fea-solver... ✓ Complete (14.0s)   │    │
│ │ 7. Result: weight 2.8kg, SF 1.78 — Goal met ✓  │    │
│ └─────────────────────────────────────────────────┘    │
│                                                         │
│ ┌────────────────────────────────────────────┐         │
│ │ Type a goal or follow-up...          Send  │         │
│ └────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────┘
```

---

#### Step 4: Deploy on Workflow Canvas

The agent becomes a **node on the workflow canvas**:

```
[Webhook] → [Mesh Gen] → [FEA Solver] → [AI Optimizer Agent] → [Evidence Gate]
                                              │
                                         ┌────┴────┐
                                         │ [M] Model│
                                         │ [T] Tools│
                                         │ [P] Policy│
                                         │[Mem]Memory│
                                         └──────────┘
```

When the workflow runs, the agent node:
1. Receives upstream data (FEA results)
2. Runs the 13-step pipeline
3. Outputs ActionProposal
4. If approved, spawns sub-runs for proposed tools
5. Results pass to the next node (Evidence Gate)

---

### 3.3 Agent Data Model

```
AgentSpec
├── id: "agent_fea_optimizer"
├── name: "FEA Optimizer Agent"
├── version: "v2.0.0"
├── status: "published"
├── goal: "Minimize mass while maintaining SF >= 1.5"
├── model: { provider: "anthropic", model: "claude-sonnet-4-6" }
├── llm_weight: 0.7
├── tools: ["mesh-gen@1.0", "fea-solver@2.1", "result-analyzer@1.0"]
├── policy:
│   ├── confidence_threshold: 0.85
│   ├── max_cost_per_run: 10.00
│   ├── timeout: 600
│   ├── require_approval_for: ["write", "delete"]
│   └── escalation_rules: [
│         { field: "confidence", op: "<", value: 0.5, action: "reject" },
│         { field: "cost", op: ">", value: 5.00, action: "escalate" }
│       ]
├── constraints: { max_retries: 3, max_iterations: 5, max_tool_calls: 15 }
└── memory: pgvector embeddings (facts, patterns, learned outcomes)
```

---

## 4. Tool System

### 4.1 What Is a Tool

A tool is a **containerized engineering algorithm** with a typed I/O contract. Tools are the atomic execution units — they take inputs, run computations in Docker, and produce outputs.

Examples:
- **FEA Solver** — Takes mesh + loads → produces stress maps
- **Mesh Generator** — Takes CAD geometry → produces finite element mesh
- **CFD Engine** — Takes geometry + boundary conditions → produces flow fields
- **Material Database** — Takes query → returns material properties

### 4.2 User Journey

#### Browse & Inspect

**Screen:** ToolRegistryPage (`/tools`)

```
┌────────────────────────────────────────┬────────────────────────────┐
│ TOOL REGISTRY                          │ QUICK VIEW                 │
│ Search: [____________]                 │                            │
│ Category: [All ∨] Status: [All ∨]     │ FEA Solver v2.1            │
│                                        │ Status: Published          │
│ ┌────┬────────┬──────┬────────┬────┐  │                            │
│ │Name│Version │Status│Category│Adpt│  │ CONTRACT                   │
│ ├────┼────────┼──────┼────────┼────┤  │ Inputs:                    │
│ │●FEA│ v2.1   │Pub   │Sim     │🐳 │  │  mesh_file: artifact       │
│ │CFD │ v3.0   │Pub   │Sim     │🐳 │  │  load_cases: json          │
│ │Mesh│ v1.0   │Pub   │Mesh    │🐳 │  │  threshold: number (128)   │
│ │MatD│ v1.2   │Pub   │Matrl   │🌐 │  │ Outputs:                   │
│ │ResA│ v1.0   │Pub   │Analy   │🐍 │  │  stress_map: artifact      │
│ │Topo│ v0.1   │Draft │Sim     │🐳 │  │  metrics: json             │
│ │TolA│ v1.1   │Pub   │Analy   │🐳 │  │                            │
│ │Thrm│ v2.0   │Pub   │Sim     │🐳 │  │ EXECUTION                  │
│ │Cost│ v1.0   │Pub   │Analy   │🌐 │  │ Adapter: Docker            │
│ │Unit│ v1.0   │Pub   │Util    │⚡ │  │ Image: fea-solver:2.1      │
│ │Surr│ v0.3   │Draft │ML-AI   │🐍 │  │ Network: deny              │
│ │LegM│ v1.0   │Depr  │Mesh    │🐳 │  │ Filesystem: sandbox        │
│ │CADR│ v1.0   │Pub   │Mesh    │⚡ │  │                            │
│ │Comp│ v1.0   │Pub   │Util    │🐍 │  │ LIMITS                     │
│ └────┴────────┴──────┴────────┴────┘  │ CPU: 4 cores               │
│                                        │ Memory: 2048 MB            │
│ 14 tools · 11 published · 2 draft     │ Timeout: 300s              │
│            · 1 deprecated              │                            │
└────────────────────────────────────────┴────────────────────────────┘
```

**Adapter types:**
| Icon | Adapter | How It Runs |
|------|---------|-------------|
| 🐳 | Docker | Full container isolation with /in, /out volumes |
| 🐍 | Python | Python script in sandbox |
| ⚡ | WASM | WebAssembly module (fast, lightweight) |
| 🌐 | Remote API | HTTP call to external service |

#### Register New Tool

**User provides:**
1. **Name + description** — Human-readable
2. **Category** — Simulation / Meshing / Analysis / Materials / ML-AI / Utilities
3. **Adapter** — Docker / Python / WASM / Remote API
4. **Container image** — e.g., `registry.airaie.io/fea-solver:2.1`
5. **I/O Contract** (JSON Schema):
   ```json
   {
     "inputs": [
       { "name": "mesh_file", "type": "artifact", "required": true },
       { "name": "load_cases", "type": "json", "required": true },
       { "name": "threshold", "type": "number", "default": 128 }
     ],
     "outputs": [
       { "name": "stress_map", "type": "artifact" },
       { "name": "metrics", "type": "json" }
     ]
   }
   ```
6. **Resource limits** — CPU cores, memory MB, timeout seconds
7. **Network/filesystem policy** — allow/deny network, sandbox/readonly filesystem

### 4.3 Tool Data Model

```
Tool
├── id: "tool_fea_solver"
├── name: "FEA Solver"
├── version: "v2.1"
├── status: "published" (draft → published → deprecated)
├── category: "simulation"
├── adapter: "docker"
├── container_image: "fea-solver:2.1"
├── contract:
│   ├── inputs: [{ name, type, required, default }]
│   ├── outputs: [{ name, type }]
│   └── errors: [{ code, description }]
├── resource_limits: { cpu: 4, memory_mb: 2048, timeout_s: 300 }
├── capabilities: ["structural_analysis", "nonlinear", "convergence_check"]
└── usage_stats: { total_runs: 1240, success_rate: 0.96, avg_duration_ms: 14000 }
```

---

## 5. Board (Governance) System

### 5.1 What Is a Board

A board is a **governance container** that wraps engineering work with quality checkpoints. It ensures that before anything goes to manufacturing, all evidence is collected, all gates are passed, and all required signatures are obtained.

**Real-world analogy:** A board is like a design review process — but automated, traceable, and integrated with workflow execution.

### 5.2 User Journey — Step by Step

#### Step 1: Create Board

**User provides:**
- Board name: "Turbine Blade Rev C Validation"
- Board type/mode: Explore → Study → Release (user picks initial mode)
- Tags: Engineering, Structural
- Project assignment

#### Step 2: Add Cards (Work Units)

Each card represents one piece of work that needs evidence:

```
Board: Structural Validation Study
├── Card: FEA Stress Test
│   ├── Intent: sim.fea (structural simulation)
│   ├── Tool: FEA Solver v2.1
│   ├── Acceptance: max_stress < 250 MPa, SF >= 1.5
│   └── Status: Complete ✓ (evidence collected)
│
├── Card: CFD Flow Analysis
│   ├── Intent: sim.cfd (thermal flow)
│   ├── Tool: CFD Engine v3.0
│   ├── Acceptance: max_temp < 150°C
│   └── Status: Running ● (workflow executing)
│
├── Card: Fatigue Analysis
│   ├── Intent: sim.fatigue
│   ├── Tool: Fatigue Life Estimator v2.0
│   ├── Acceptance: cycles > 1M at operating load
│   └── Status: Complete ✓
│
└── Card: DFM Check
    ├── Intent: manufacturing.dfm
    ├── Tool: Compliance Checker v1.0
    ├── Acceptance: no walls < 1.2mm, draft angles > 1°
    └── Status: Pending ○ (not yet run)
```

#### Step 3: Run Card Workflows → Evidence Auto-Collected

When the engineer runs a card's workflow:

```
Card "FEA Stress Test" → Run workflow
  │
  ▼ Workflow executes (Mesh Gen → FEA Solver → Result Analyzer)
  │
  ▼ FEA Solver produces outputs:
    {
      stress_map: "art_stress_001",
      metrics: {
        max_stress_mpa: 187.3,
        factor_of_safety: 1.67,
        mass_kg: 3.42,
        convergence_reached: true
      }
    }
  │
  ▼ EvidenceCollectorService auto-extracts:
    Evidence[0]: { metric: "max_stress_mpa", value: 187.3, threshold: "< 250", passed: true }
    Evidence[1]: { metric: "factor_of_safety", value: 1.67, threshold: ">= 1.5", passed: true }
    Evidence[2]: { metric: "mass_kg", value: 3.42, threshold: null, informational: true }
  │
  ▼ Evidence attached to Card → Gates re-evaluate
```

#### Step 4: Gates Auto-Evaluate

```
Board: Structural Validation Study

GATE: "Structural Evidence"
├── Requirement: factor_of_safety >= 1.5
│   └── Evidence: 1.67 >= 1.5 → PASS ✓
├── Requirement: max_stress < 250
│   └── Evidence: 187.3 < 250 → PASS ✓
├── Requirement: convergence_reached == true
│   └── Evidence: true == true → PASS ✓
└── Status: PASSED (3/3 requirements) ✅

GATE: "Thermal Evidence"
├── Requirement: max_temp < 150
│   └── Evidence: 142.3 < 150 → PASS ✓
├── Requirement: thermal_cycling_passed == true
│   └── Evidence: NOT YET COLLECTED → PENDING
└── Status: PENDING (1/3 requirements) ⏸

GATE: "Release Approval" (ReviewGate)
├── Requirement: Lead Engineer signed
│   └── Status: NOT SIGNED → BLOCKED
├── Requirement: QA Lead signed
│   └── Status: NOT SIGNED → BLOCKED
└── Status: BLOCKED 🚫
```

**What user sees on BoardsPage:**

```
┌─────────────────────┬──────────────────────┬─────────────────┐
│ Board Info           │ Gate Status           │ Readiness       │
│                      │                       │                 │
│ Structural           │ ✅ Structural Evidence│     65%         │
│ Validation Study     │    3/3 requirements   │                 │
│ [Study] [...]        │ ⏸ Thermal Evidence   │  2 of 4 gates   │
│                      │    1/3 requirements   │                 │
│ Tags:                │ ✅ Fatigue Validation │ EVIDENCE        │
│ [Engineering]        │    2/2 requirements   │ Records: 6      │
│ [Structural]         │ 🚫 Release Approval  │ Artifacts: 12MB │
│                      │    Blocked            │ Approvals: 1    │
│ Cards:               │                       │    pending      │
│ ● FEA Stress  ✓Done │                       │                 │
│ ● CFD Flow    ●Run  │                       │ METADATA        │
│ ● Fatigue     ✓Done │                       │ Created: Mar 25 │
│ ● DFM Check   ○Pend │                       │                 │
└─────────────────────┴──────────────────────┴─────────────────┘
```

#### Step 5: Approve & Escalate

```
Engineer: All automated gates passed. Click "Request Review"
  │
  ▼ Notification sent to Lead Engineer + QA Lead
  │
Lead Engineer: Opens gate → Reviews evidence → Clicks "Approve"
  │
  ▼ POST /v0/gates/:id/approve { rationale: "Evidence satisfactory" }
  │
QA Lead: Reviews → Approves
  │
  ▼ All gates now PASSED
  │
  ▼ Board mode transition: Study → Release
     POST /v0/boards/:id/escalate { next_mode: "release" }
```

#### Step 6: Generate Release Packet

```
POST /v0/boards/:id/release-packet
  │
  ▼ Response:
  {
    release_packet_id: "rp_xyz",
    board_state: "FROZEN",
    cards: [{ id, status: "complete", evidence_summary }],
    gates: [{ id, status: "passed", approved_by, timestamp }],
    artifacts: [{ id, sha256_hash, lineage }],
    approval_chain: [
      { user: "Santhosh", role: "engineer", timestamp, signature },
      { user: "Lead Engineer", role: "reviewer", timestamp, signature },
      { user: "QA Lead", role: "qa", timestamp, signature }
    ],
    exports: {
      pdf_url: "s3://release-packets/rp_xyz.pdf",
      json_url: "s3://release-packets/rp_xyz.json",
      bom_url: "s3://release-packets/rp_xyz_bom.csv"
    }
  }
```

**Board is now locked.** No edits. Manufacturing can proceed with full traceability.

### 5.3 Readiness Calculation

```
readiness_score = (gates_passed / total_gates) × 100

Example:
  4 gates total
  2 passed, 1 pending, 1 blocked
  readiness = (2 / 4) × 100 = 50%
```

---

## 6. How The Four Systems Connect

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│    BOARD creates Cards (units of work with acceptance criteria) │
│         │                                                        │
│         ▼                                                        │
│    Each Card has an intent → resolved to TOOLS via ToolShelf    │
│         │                                                        │
│         ▼                                                        │
│    Tools assembled into WORKFLOW (DAG on canvas)                │
│         │                                                        │
│         ▼                                                        │
│    AGENT optionally proposes tool selection + parameters        │
│         │                                                        │
│         ▼                                                        │
│    Workflow RUNS → artifacts produced                            │
│         │                                                        │
│         ▼                                                        │
│    EVIDENCE auto-collected from run metrics                     │
│         │                                                        │
│         ▼                                                        │
│    GATES evaluate evidence against thresholds                   │
│         │                                                        │
│         ▼                                                        │
│    All gates pass → Board escalates → RELEASE PACKET            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Cross-system data flow:**

| From | To | What Flows | How |
|------|----|-----------|-----|
| Board → Workflow | Card intent → workflow creation | Card defines what to execute | User creates workflow for card |
| Tool → Workflow | Tool contract → canvas node | Tool becomes a workflow node | Drag from palette |
| Agent → Workflow | ActionProposal → workflow nodes | Agent proposes tool configuration | Agent node on canvas |
| Workflow → Board | Run artifacts → card evidence | Metrics extracted from outputs | EvidenceCollectorService |
| Evidence → Gate | Metric values → requirement checks | Auto-evaluate thresholds | GateEvaluatorService |
| Gate → Board | Gate status → readiness score | Board tracks overall progress | State machine |

---

## 7. Data Flow Diagrams

### 7.1 Workflow Execution Data Flow

```
User Input                    Kernel Processing              Output to User
─────────                     ──────────────────              ──────────────
                                                              
Click "Run"  ───────────►  Validate workflow                  
                           Create Run (PENDING)                
                           Compile DAG                         
                           Find root nodes                     
                                │                              
                                ▼                              
                           Dispatch to NATS  ─────►  Rust Worker
                                                     │ Download /in
                                                     │ Boot Docker
                                                     │ Execute tool
                                                     │ Upload /out
                                                     │ Publish result
                                ◄────────────────────┘
                           Update NodeRun                     
                           Store artifacts                    SSE: node_completed
                           Unblock next nodes ──────►         SSE: node_started
                                │                              
                           (repeat per node)                   
                                │                              
                           All done                           SSE: run_completed
                           Extract evidence ─────────────►    SSE: evidence_collected
                           Evaluate gates   ─────────────►    SSE: gate_evaluated
```

### 7.2 Agent Decision Data Flow

```
User Goal                     Agent Pipeline                   Output to User
─────────                     ──────────────                   ──────────────

"Optimize for              Context assembly
 weight, SF>=1.5"   ──►   (goal + artifacts + memory)
                                │
                           Capability search
                           (query tool registry)
                                │
                           Algorithmic scoring
                           (compat × trust × cost)
                                │
                           LLM reasoning
                           (prompt with context + tools)
                                │
                           Blended scoring                   
                           (algo × 0.3 + llm × 0.7)          Ranked tool list
                                │
                           Proposal generation                ActionProposal
                                │                             (tools, confidence,
                           Policy check                        rationale, cost)
                           ┌────┴────┐
                      Auto-approve  Escalate                  Decision badge:
                           │           │                      green/orange/red
                      Dispatch      Wait for
                      tools         human                     Approval queue
                           │           │
                      Execute       Approve/Reject
                           │           │
                      Results ◄────────┘
                           │
                      Goal evaluation                         "SUCCESS: 2.8kg, SF 1.78"
                      ┌────┴────┐
                   Goal met   Iterate
                      │           │
                   Output      Back to
                   to next     Context
                   node        assembly
```

---

## 8. State Machines

### Complete State Machine Reference

```
WORKFLOW VERSION:    draft ──► compiled ──► published ──► (deprecated)

RUN:                pending ──► running ──► succeeded
                                       ├──► failed
                                       ├──► canceled
                                       └──► paused (gate)

NODE RUN:           queued ──► acquired ──► pre-flight ──► io-prep ──►
                    executing ──► streaming ──► io-teardown ──► completed
                                                                 ├── succeeded
                                                                 ├── failed
                                                                 └── skipped

AGENT:              context ──► search ──► score ──► propose ──►
                    policy-check ──► dispatch ──► result-eval ──► done/iterate

GATE:               pending ──► evaluating ──► passed
                                           ├──► blocked
                                           └──► waived

BOARD MODE:         explore ──► study ──► release ──► (archived)

TOOL VERSION:       draft ──► published ──► deprecated

AGENT VERSION:      draft ──► validated ──► published ──► deprecated
```

---

## 9. API Contract Reference

### 9.1 Key Request/Response Shapes

**Create Workflow:**
```
POST /v0/workflows
Request:  { name, description?, project_id?, trigger_type? }
Response: { id, status: "draft", version: "v1", created_at }
```

**Run Workflow:**
```
POST /v0/runs
Request:  { workflow_id, version?, inputs? }
Response: { run_id, status: "PENDING" }
```

**Stream Run (SSE):**
```
GET /v0/runs/:id/stream
Events:
  { type: "node_started",       node_id, timestamp }
  { type: "node_progress",      node_id, percent }
  { type: "node_completed",     node_id, status, outputs }
  { type: "artifact_produced",  artifact_id, type }
  { type: "evidence_collected", metric_key, value }
  { type: "gate_evaluated",     gate_id, status }
  { type: "run_completed",      status, duration_ms, cost_usd }
```

**Agent Propose:**
```
POST /v0/agents/:id/propose
Request:  { context, goal, tool_preferences? }
Response: {
  proposal_id, status: "PENDING_APPROVAL",
  proposed_tools: [{ tool_ref, inputs, confidence, rationale, cost_estimate }],
  total_cost_estimate, risk_level,
  approval_decision: "auto_approved" | "pending_review" | "rejected"
}
```

**Board Escalate:**
```
POST /v0/boards/:id/escalate
Request:  { next_mode: "study" | "release" }
Response: { status, transition_valid, blocking_gates? }
```

**Gate Approve:**
```
POST /v0/gates/:id/approve
Request:  { rationale }
Response: { gate_status: "PASSED", evaluations }
```

---

## 10. Frontend Screen Map

### Existing Screens (Built)

| Route | Page | System | Status |
|-------|------|--------|--------|
| `/dashboard` | DashboardPage | All | Built (mock data) |
| `/workflows` | WorkflowsPage | Workflow | Built (mock, cards clickable) |
| `/workflows/:id` | WorkflowDetailPage | Workflow | Built (mock, full detail) |
| `/workflow-studio/:id` | WorkflowEditorPage | Workflow | Built (canvas + palette + inspector) |
| `/workflow-runs/:runId` | WorkflowRunsPage | Workflow | Built (DAG + logs + detail) |
| `/agents` | AgentsPage | Agent | Built (mock, cards + stats) |
| `/agent-studio/:id` | AgentStudioPage | Agent | Built (builder + playground) |
| `/tools` | ToolRegistryPage | Tool | Built (table + quick view) |
| `/boards` | BoardsPage | Board | Built (cards + gates + readiness) |

### Modals (Built)

| Modal | Opens From | System |
|-------|-----------|--------|
| CreateWorkflowModal | WorkflowsPage "+ New Workflow" | Workflow |
| CreateAgentModal | AgentsPage "+ New Agent" | Agent |

### Screens Not Yet Built

| Screen | System | What It Needs |
|--------|--------|---------------|
| Board Detail Page | Board | Card management, gate config, evidence panel |
| Board Create Modal | Board | Name, type, tags, project |
| Tool Register Wizard | Tool | Name, contract editor, adapter config, image |
| Tool Detail Page | Tool | Full contract view, version history, usage charts |
| Agent Detail Page | Agent | Spec overview, run history, decision analytics |
| Settings Page | Platform | User prefs, API keys, LLM providers, quotas |
| Gate Approval Page | Board | Evidence review, sign-off form, rationale |
| Release Packet View | Board | Frozen artifacts, BOM, approval chain, export |

---

## 11. Implementation Status

### What's Wired to APIs (with Mock Fallback)

| Feature | API Called | Mock Fallback |
|---------|----------|---------------|
| Fetch workflow by ID | `GET /v0/workflows/:id` | Yes |
| Save workflow | `PUT /v0/workflows/:id` | Yes |
| Run workflow | `POST /v0/workflows/:id/run` | Yes |
| Dashboard stats | `GET /dashboard/stats` | Yes |
| Tool list | `GET /tools` | Yes |
| Run list/detail | `GET /runs` | Yes |

### What's Fully Mock (No API Calls Yet)

| Feature | Data Source |
|---------|------------|
| Workflow list | Hardcoded `WORKFLOWS` array (8 items) |
| Agent list | Hardcoded `AGENTS_DATA` array (3 items) |
| Board list | Hardcoded `BOARDS` array (2 items) |
| Integration list | Hardcoded array (31 items) |
| Community projects | Hardcoded arrays |
| All modal submissions | `console.log()` only |

### What Backend Endpoints Exist But Frontend Doesn't Call

| Endpoint | Status |
|----------|--------|
| `POST /v0/boards` | Backend ready, no frontend create form |
| `POST /v0/boards/:id/escalate` | Backend ready, no frontend trigger |
| `POST /v0/boards/:id/release-packet` | Backend ready, no frontend view |
| `POST /v0/agents/:id/propose` | Backend ready, playground partially wired |
| `POST /v0/gates/:id/approve` | Backend ready, no frontend approval UI |
| `GET /v0/runs/:id/stream` (SSE) | Backend ready, frontend uses polling |
| `POST /v0/workflows/:id/compile` | Backend ready, editor doesn't call |
| `POST /v0/workflows/:id/publish` | Backend ready, editor doesn't call |

---

*This document reflects the unified single-app architecture as of 2026-04-04. All references to the old 3-studio model have been removed.*
