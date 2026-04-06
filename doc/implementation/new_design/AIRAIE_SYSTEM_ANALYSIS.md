# AIRAIE PLATFORM — COMPLETE SYSTEM ANALYSIS

---

## STEP 1: SYSTEM OVERVIEW

### What is Airaie?

Airaie is an **AI-powered engineering workflow and automation platform** designed for parametric engineering, research validation, and manufacturing-grade governance. It enables engineers and researchers to:

- **Wrap external tools** (FEA solvers, CFD engines, CAD processors, ML models) into containerized, version-controlled units
- **Compose workflows** as DAGs that chain tool executions with dependency management
- **Deploy AI agents** that autonomously select and execute tools based on goals, policies, and scoring
- **Govern evidence** via research/engineering boards with gates, approvals, and release packets

### Architecture (3-Repo Structure)

```
+---------------------------------------------------------------------------+
|                        AIRAIE PLATFORM                                    |
|          React 19 + Vite (Port 3000)                                      |
|  Unified shell: sidebar, header, navigation                              |
|  Embeds studios via iframes with postMessage cross-frame control          |
+---------------+------------------+------------------+---------------------+
|               |                  |                  |                     |
|  +------------v--------+ +------v----------+ +-----v------------+       |
|  | WORKFLOW STUDIO      | | AGENT STUDIO    | | BOARD STUDIO     |       |
|  | React (Port 3001)    | | React (Port3002)| | React (Port 3003)|       |
|  | Visual DAG editor    | | Spec builder    | | Governance gates |       |
|  | DSL <-> Canvas       | | Playground chat | | Evidence boards  |       |
|  | Run monitoring       | | Policy engine   | | Release packets  |       |
|  +------------+---------+ +------+----------+ +------+-----------+       |
|               |                  |                    |                   |
|               +------------------+--------------------+                   |
|                                  |                                        |
|                            Axios + JWT                                    |
|                            SSE Streaming                                  |
|                                  |                                        |
|  +-------------------------------v-----------------------------------+    |
|  |                     AIRAIE KERNEL                                 |    |
|  |                                                                   |    |
|  |  +--- GO CONTROL PLANE (Port 8080) --------------------------+   |    |
|  |  |  API Gateway (100+ REST endpoints)                        |   |    |
|  |  |  30+ Services (Registry, Run, Workflow, Agent, Board)     |   |    |
|  |  |  27 PostgreSQL store adapters                             |   |    |
|  |  |  Auth (JWT + API Key + RBAC)                              |   |    |
|  |  |  Workflow Scheduler (DAG execution)                       |   |    |
|  |  |  Agent Runtime (LLM-powered proposals)                    |   |    |
|  |  +---------------------------+-------------------------------+   |    |
|  |                              | NATS JetStream                    |    |
|  |  +---------------------------v-------------------------------+   |    |
|  |  |  RUST DATA PLANE (Runner)                                 |   |    |
|  |  |  Job Consumer -> Docker Executor -> Result Publisher      |   |    |
|  |  |  Adapters: Docker, Python, WASM, Remote API               |   |    |
|  |  +-----------------------------------------------------------+   |    |
|  +-------------------------------------------------------------------+    |
|                                                                           |
|  Infrastructure:                                                          |
|  +------------+  +---------------+  +----------------+                    |
|  | PostgreSQL |  | NATS JetStream|  | MinIO (S3)     |                    |
|  |  (data)    |  |  (messaging)  |  | (artifacts)    |                    |
|  +------------+  +---------------+  +----------------+                    |
+---------------------------------------------------------------------------+
```

---

## STEP 2: COMPLETE FEATURE LIST

### A. Tool Management

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 1 | **Tool Registration** | Register external tools (FEA, CFD, CAD, ML) with versioned contracts | `internal/handler/tools.go`, `internal/service/registry.go`, `internal/store/postgres_tools.go` |
| 2 | **Tool Versioning** | Semantic versions with draft -> published -> deprecated lifecycle | `internal/service/registry.go` (PublishVersion, DeprecateVersion) |
| 3 | **Tool Contract Validation** | JSON Schema validation of tool input/output contracts | `internal/validator/`, `contracts/` |
| 4 | **Tool Discovery** | Capability-based search and resolution with constraint filtering | `internal/service/capability.go`, `internal/service/toolshelf.go` |

### B. Workflow Engine

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 5 | **Visual DAG Builder** | Drag-and-drop workflow canvas with XYFlow | `apps/workflow-studio/src/components/builder/` |
| 6 | **YAML DSL** | Declarative workflow definition language | `internal/workflow/compiler.go`, DSL editor in workflow-studio |
| 7 | **DSL Compilation** | YAML -> AST with ref resolution, cycle detection, type checking | `internal/workflow/compiler.go` |
| 8 | **DAG Scheduling** | Topological execution respecting dependencies, conditions, retries | `internal/workflow/scheduler.go` |
| 9 | **Workflow Versioning** | Draft -> compiled -> published lifecycle with diffs | `internal/handler/workflows.go`, `apps/workflow-studio/src/pages/VersionsPage.tsx` |
| 10 | **Conditional Execution** | `when` clauses on nodes for conditional branching | `internal/workflow/scheduler.go` |
| 11 | **Retry Policies** | Configurable retry with backoff per node | WorkflowNode.Retry config |
| 12 | **Execution Plan Generation** | Pre-execution plan visualization | `internal/service/plan.go` |
| 13 | **Triggers** | Cron, webhook, event-based workflow automation | `apps/workflow-studio/src/pages/TriggersPage.tsx` |

### C. Run Execution

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 14 | **Tool Run Dispatch** | Async job dispatch via NATS to Rust runner | `internal/service/run.go`, `runner/src/` |
| 15 | **Container Execution** | Docker-based sandboxed tool execution | `runner/src/adapters/docker.rs` |
| 16 | **Multi-Adapter Support** | Docker, Python, WASM, Remote API, Notebook adapters | `runner/src/adapters/` |
| 17 | **Real-Time Streaming** | SSE endpoint for live run status updates | `GET /v0/runs/{id}/stream`, `packages/shared/src/api/sse.ts` |
| 18 | **Run Cancellation** | Cancel running jobs mid-execution | `POST /v0/runs/{id}/cancel` |
| 19 | **Run Resume** | Resume from checkpoint after failure | `POST /v0/runs/{id}/resume` |
| 20 | **Execution Logs** | Streamed container stdout/stderr | `GET /v0/runs/{id}/logs` |
| 21 | **Cost Tracking** | Estimated and actual cost per node/run | `NodeRun.CostEstimate`, `NodeRun.CostActual` |
| 22 | **Run Explanation** | Root cause analysis for failed runs | `internal/service/explain.go` |

### D. Artifact Management

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 23 | **Presigned Upload/Download** | S3-compatible presigned URLs for artifacts | `internal/handler/artifacts.go`, MinIO integration |
| 24 | **Content-Hash Immutability** | SHA-256 content hashing for artifact integrity | `Artifact.ContentHash` |
| 25 | **Artifact Lineage** | Input -> transform -> output dependency graph | `GET /v0/artifacts/{id}/lineage`, `apps/workflow-studio/src/components/artifacts/` |
| 26 | **Format Conversion** | Async artifact format conversion | `POST /v0/artifacts/{id}/convert` |

### E. AI Agent System

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 27 | **Agent Spec Builder** | Visual editor for agent goals, tools, constraints, scoring | `apps/agent-studio/src/components/builder/` |
| 28 | **Agent Versioning** | Draft -> validated -> published with diffs and A/B eval | `apps/agent-studio/src/pages/VersionsPage.tsx` |
| 29 | **Playground Chat** | Interactive agent conversation with proposal inspection | `apps/agent-studio/src/components/playground/` |
| 30 | **LLM-Powered Proposals** | Tool selection via pluggable LLM (Anthropic, OpenAI, Gemini, HuggingFace) | `internal/agent/llm.go`, `internal/service/runtime.go` |
| 31 | **Algorithmic + LLM Scoring** | Blended compatibility/trust/cost scoring with configurable LLM weight | `internal/service/runtime.go` (Scorer) |
| 32 | **Policy Engine** | Confidence thresholds, escalation rules, auto-approve policies | `apps/agent-studio/src/components/policy/`, `internal/service/runtime.go` |
| 33 | **Human-in-the-Loop Approvals** | Escalation queue for low-confidence or high-risk proposals | `apps/agent-studio/src/pages/ApprovalsPage.tsx` |
| 34 | **Agent Sessions** | Multi-turn stateful conversations with context | `POST /v0/agents/{id}/sessions`, session management |
| 35 | **Agent Memory** | Persistent memory bank (facts, patterns, learned behaviors) | `apps/agent-studio/src/pages/MemoryPage.tsx` |
| 36 | **Agent Evaluations** | Golden dataset regression tests with accuracy metrics | `apps/agent-studio/src/pages/EvalsPage.tsx` |
| 37 | **Decision Tracing** | Full trace of agent reasoning: search -> score -> propose -> execute | `apps/agent-studio/src/components/runs/` |
| 38 | **Agent Graph Visualization** | Dynamic pipeline graph from agent spec | `apps/agent-studio/src/components/graph/` |

### F. Board & Governance System

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 39 | **Research/Engineering Boards** | Structured evidence containers (hypotheses, results, decisions) | `internal/handler/boards.go`, `apps/board-studio/` |
| 40 | **Board Modes** | Explore -> Study -> Release governance escalation | `internal/service/board_mode.go` |
| 41 | **Vertical-Aware Cards** | Domain-specific card types (FEA, CFD, DFM, ML training, lab protocol) | `apps/board-studio/` VERTICAL_CARD_SYSTEM |
| 42 | **Gate System** | Evidence, review, and compliance checkpoints | `internal/handler/gates.go`, `internal/service/gate.go` |
| 43 | **Gate Requirements** | `run_succeeded`, `artifact_exists`, `role_signed`, etc. | `model.GateRequirement` |
| 44 | **Automated Gate Evaluation** | Auto-evaluate requirements against run results | `POST /v0/gates/{id}/evaluate` |
| 45 | **Manual Approval/Reject/Waive** | Human gate approvals with audit trail | `POST /v0/gates/{id}/approve|reject|waive` |
| 46 | **Board Records** | Hypothesis, claim, protocol_step, result, note, decision | `internal/handler/boards.go` (records) |
| 47 | **Evidence Collection** | Auto-attach run metrics as evidence against thresholds | `internal/service/evidence.go` |
| 48 | **Board Intelligence** | Evidence diff analysis, gate failure triage, reproducibility checks | `GET /v0/boards/{id}/intelligence/*` |
| 49 | **Board Composition** | Hierarchical parent-child board structure | `internal/service/board_composition.go` |
| 50 | **Board Templates** | Pre-configured board structures for common use cases | `internal/service/board_template.go` |
| 51 | **Intent-Based Board Creation** | Natural language intent -> structured board | `POST /v0/boards/from-intent` |
| 52 | **Release Packets** | Manufacturing-ready locked artifact bundles with BOM/tolerances | `apps/board-studio/src/pages/ReleasePacketPage.tsx` |

### G. Authentication & Authorization

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 53 | **JWT Authentication** | 15-minute access tokens with 7-day refresh tokens | `internal/auth/jwt.go` |
| 54 | **API Key Auth** | Long-lived, scoped API keys | `internal/auth/apikey.go` |
| 55 | **RBAC** | Role-based access control with policies | `internal/auth/rbac.go` |
| 56 | **User Registration/Login** | User management endpoints | `POST /v0/auth/register|login` |

### H. Platform & Observability

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 57 | **Audit Events** | Async event emission for all state changes | `internal/service/audit.go` |
| 58 | **Quota Management** | Resource quota enforcement (daily/per-run limits) | `internal/service/quota.go` |
| 59 | **Governance Policies** | Security policy management and evaluation | `internal/service/governance_policy.go` |
| 60 | **Preflight Checks** | Pre-execution validation (artifacts, policy, quota) | `internal/service/preflight.go` |
| 61 | **Health Checks** | DB, NATS, MinIO health monitoring | `GET /v0/health` |
| 62 | **CLI Tool** | Cobra-based CLI for tool, workflow, agent management | `cli/main.go` |
| 63 | **Go SDK** | Programmatic client SDK for kernel API | `sdk/go/airaie/` |

### I. Platform UI (airaie-platform)

| # | Feature | Description | Implementation |
|---|---------|-------------|----------------|
| 64 | **Unified Dashboard** | System status, quick actions, recent workflows | `pages/DashboardPage.tsx` |
| 65 | **Tools Catalog** | Browse FEA, CFD, Materials, Generative Design tools | `pages/ToolsPage.tsx` |
| 66 | **Integration Hub** | 50+ third-party integrations (CAD, Simulation, Data, CI) | `pages/IntegrationsPage.tsx` |
| 67 | **Capabilities Page** | Platform capabilities with usage tracking | `pages/CapabilitiesPage.tsx` |
| 68 | **Studio Embedding** | Iframes for Board/Workflow/Agent studios with fullscreen toggle | `components/studio/StudioFrame.tsx` |
| 69 | **Theme System** | Light/dark mode with CSS variable design tokens | `contexts/ThemeContext.tsx`, `styles/tokens.ts` |
| 70 | **Command Search** | Cmd+K search bar | `Header.tsx` |

---

## STEP 3: MODULE BREAKDOWN

### Module 1: airaie-kernel (Go + Rust Backend)

| Layer | Responsibility | Key Files |
|-------|---------------|-----------|
| **HTTP Handlers** | Request validation, routing, response marshaling | `internal/handler/*.go` (40+ files) |
| **Services** | Business logic, orchestration, validation | `internal/service/*.go` (30+ services) |
| **Store** | PostgreSQL queries, transactions | `internal/store/postgres*.go` (27 files) |
| **Models** | Data structures, enums, types | `internal/model/*.go` |
| **Auth** | JWT, API Key, RBAC middleware | `internal/auth/*.go` |
| **Workflow Engine** | DSL parsing, compilation, DAG scheduling | `internal/workflow/*.go` |
| **Agent Runtime** | LLM integration, proposal generation, policy enforcement | `internal/agent/*.go` |
| **Rust Runner** | Job consumption, Docker execution, artifact I/O | `runner/src/**/*.rs` |
| **CLI** | Command-line interface (Cobra) | `cli/main.go`, `cli/client/` |
| **SDK** | Go client library | `sdk/go/airaie/` |
| **Contracts** | JSON Schema definitions for cross-plane communication | `contracts/*.schema.json` |
| **Migrations** | 34 SQL migration files | `infra/migrations/` |

### Module 2: airaie-studios (TypeScript Monorepo)

| Sub-module | Port | Responsibility | Key Files |
|------------|------|---------------|-----------|
| **@airaie/shared** | -- | API client, types, auth, hooks, SSE | `packages/shared/src/` (23 files) |
| **@airaie/ui** | -- | Design system, 18 reusable components | `packages/ui/src/` (24 files) |
| **@airaie/shell** | -- | Navigation chrome (sidebar, header) | `packages/shell/src/` (7 files) |
| **@airaie/charts** | -- | Recharts wrappers | `packages/charts/src/` (1 file) |
| **workflow-studio** | 3001 | Visual DAG builder, run monitoring, artifacts | `apps/workflow-studio/src/` (65 files) |
| **agent-studio** | 3002 | Agent spec editor, playground, policy, evals | `apps/agent-studio/src/` (72 files) |
| **board-studio** | 3003 | Boards, cards, gates, evidence, release packets | `apps/board-studio/src/` (95 files) |

### Module 3: airaie-platform (React SPA)

| Sub-module | Responsibility | Key Files |
|------------|---------------|-----------|
| **Layout** | AppShell, Sidebar, Header, Breadcrumb | `src/components/layout/` |
| **Dashboard** | System overview, quick actions | `src/pages/DashboardPage.tsx`, `src/components/dashboard/` |
| **Studio Embedding** | Iframe containers for 3 studios | `src/components/studio/StudioFrame.tsx` |
| **Pages** | Tools, Integrations, Capabilities, Workflows, Agents | `src/pages/*.tsx` |
| **UI Components** | 15 reusable components (Button, Card, Modal, etc.) | `src/components/ui/` |
| **State** | Zustand (UI), React Query (server), Context (theme) | `src/store/`, `src/contexts/` |

---

## STEP 4: EXECUTION FLOW

### Flow 1: User Creates and Runs a Workflow

```
1. USER opens Workflow Studio (port 3001)
2. USER drags nodes onto XYFlow canvas, connects edges
3. Canvas state saved in Zustand canvasStore
4. USER clicks "Compile"
   a. serializeCanvasToDsl() converts canvas -> YAML DSL
   b. POST /v0/workflows/compile (YAML body)
   c. Kernel compiler.go: Parse YAML -> Resolve tool refs -> Build AST -> Check cycles
   d. Returns compiled AST (or validation errors)
5. USER saves as version
   a. POST /v0/workflows/{id}/versions (DSL + AST)
   b. Store creates workflow_version (status: draft)
6. USER publishes version
   a. POST /v0/workflows/{id}/versions/{v}/publish
   b. Status -> published
7. USER clicks "Run" with inputs
   a. POST /v0/runs { workflow_id, inputs }
   b. RunService creates Run (PENDING) in PostgreSQL
   c. WorkflowScheduler compiles DSL -> identifies root nodes
   d. For each root node: builds JobPayload, publishes to NATS (jobs.dispatch)
   e. Creates NodeRun records (QUEUED) in PostgreSQL
   f. Returns 202 Accepted with run_id
8. RUST RUNNER consumes Job from NATS
   a. Policy check (CPU, memory, timeout, network)
   b. Downloads input artifacts from MinIO via presigned URLs
   c. Creates Docker container with tool image
   d. Mounts inputs, executes tool
   e. Collects outputs, uploads to MinIO
   f. Publishes Result to NATS (results.completed)
9. GO RESULT CONSUMER processes Result
   a. Updates NodeRun status (SUCCEEDED/FAILED)
   b. Creates artifact records
   c. Identifies next ready nodes (all deps satisfied)
   d. Dispatches next nodes to NATS
   e. Repeats until all nodes complete
   f. Updates Run status (SUCCEEDED)
   g. Emits audit event
10. FRONTEND receives updates via SSE stream
    a. GET /v0/runs/{id}/stream (Server-Sent Events)
    b. React Query cache invalidation
    c. Timeline, logs, artifacts update in real-time
```

### Flow 2: Agent Makes a Decision

```
1. USER opens Agent Studio -> BuilderPage
2. USER defines agent spec (goal, tools, constraints, policy)
3. USER validates and publishes version
4. USER opens PlaygroundPage -> sends message/context
5. POST /v0/agents/{id}/versions/{v}/run { context }
6. AgentRuntimeService:
   a. ToolSearcher queries capability DB -> ranked tool list
   b. Scorer computes compatibility, trust, cost scores
   c. If LLM enabled: blend algorithmic + LLM scores (configurable weight)
   d. ProposalGenerator sends context + tools to LLM -> receives ActionProposal
   e. PolicyEnforcer checks:
      - Confidence >= auto_approve_threshold? -> auto-execute
      - In require_approval_for list? -> escalate
      - Budget/timeout exceeded? -> reject
   f. If approved: ProposalExecutor dispatches Run via RunService
   g. MemoryStore records outcome for future learning
7. FRONTEND displays proposal with reasoning, selected tool, confidence
8. If escalated: appears in ApprovalsPage for human review
```

### Flow 3: Board Governance Flow

```
1. USER creates board (POST /v0/boards) or from intent (POST /v0/boards/from-intent)
2. Board starts in "explore" mode
3. USER adds records (hypotheses, results, decisions)
4. USER creates gates with requirements:
   - run_succeeded: specific run must pass
   - artifact_exists: specific output must be produced
   - role_signed: specific role must approve
5. Workflow runs produce evidence (metrics, artifacts)
6. EvidenceCollectorService auto-attaches metrics to board
7. USER requests gate evaluation (POST /v0/gates/{id}/evaluate)
8. System checks each requirement against actual evidence
9. If all requirements satisfied -> gate PASSED
10. If not -> gate remains PENDING with specific failures
11. BoardIntelligenceService provides:
    - Evidence diff analysis
    - Gate failure triage with suggestions
    - Reproducibility checks
12. When all gates pass -> board can escalate to "release" mode
13. USER creates Release Packet with locked artifacts, BOM, tolerances
```

---

## STEP 5: DATA FLOW

### Input Formats

- **Tool contracts**: JSON Schema (draft 2020-12)
- **Workflow definitions**: YAML DSL (`airaie.workflow/v1`)
- **Agent specs**: YAML (`airaie.agent/v1`)
- **Run inputs**: JSON objects matching tool contract input schemas
- **Artifacts**: Any binary format (uploaded via presigned S3 URLs)

### Internal Data Transformations

```
YAML DSL -> JSON parse -> AST (resolved refs, typed) -> DAG (topological order)
                                                            |
                                                       Job payloads (JSON Schema validated)
                                                            |
                                                       Docker container I/O
                                                            |
                                                       Result (exit code, metrics, output refs)
                                                            |
                                                       NodeRun/Run status update + Artifact records
```

### Output Formats

- **API responses**: JSON with standard envelope
- **Run results**: JSON (status, metrics, artifact refs, logs ref)
- **SSE events**: `data: {json}\n\n` format
- **Artifacts**: Binary stored in MinIO, metadata in PostgreSQL

### Key JSON Structures

#### Job Contract (contracts/job.schema.json)

```json
{
    "job_id": "job_abc123",
    "run_id": "run_xyz789",
    "node_id": "step_1",
    "tool_ref": "imagej-macro@2.1.0",
    "image": "imagej:2.1",
    "adapter": "docker",
    "inputs": [
        {"name": "image_file", "artifact_id": "art_001"},
        {"name": "threshold", "value": 128}
    ],
    "limits": {
        "cpu": 4,
        "memory_mb": 2048,
        "timeout_sec": 300,
        "disk_mb": 5000
    },
    "policy": {
        "network": "deny",
        "fs": "sandbox",
        "max_cpu_per_job": 8,
        "max_memory_mb_per_job": 4096,
        "max_timeout_s_per_job": 600
    },
    "artifact_urls": {
        "art_001": "https://minio:9000/bucket/...?token=..."
    },
    "output_upload_urls": {
        "result": "https://minio:9000/bucket/...?token=..."
    }
}
```

#### Result Contract (contracts/result.schema.json)

```json
{
    "job_id": "job_abc123",
    "status": "SUCCEEDED",
    "exit_code": 0,
    "outputs": [
        {"name": "result", "artifact_id": "art_002"}
    ],
    "metrics": {
        "duration_ms": 15000,
        "peak_mem_mb": 1024,
        "cpu_time_ms": 45000
    },
    "errors": [],
    "logs_ref": "logs/run_xyz789/job_abc123"
}
```

#### Agent Spec (contracts/agentspec.schema.json)

```json
{
    "apiVersion": "airaie.agent/v1",
    "kind": "Agent",
    "metadata": { "name": "fea-optimizer", "description": "..." },
    "goal": "Optimize mesh density for FEA simulation",
    "tools": [
        {
            "tool_ref": "fea-solver@1.0",
            "permissions": ["read", "execute"],
            "max_invocations": 5
        }
    ],
    "scoring": { "strategy": "weighted", "llm_weight": 0.7 },
    "constraints": { "max_cost_usd": 10, "timeout_sec": 600 },
    "policy": { "auto_approve_threshold": 0.85, "require_approval_for": ["write"] }
}
```

#### Action Proposal (contracts/actionproposal.schema.json)

```json
{
    "selected_tool": "fea-solver@1.0",
    "reasoning": "FEA solver best matches the mesh optimization goal...",
    "confidence": 0.92,
    "inputs": { "mesh_file": "art_001", "density": 0.8 },
    "estimated_cost": 2.50,
    "alternatives": [
        { "tool": "cfd-engine@2.0", "score": 0.45, "reason": "Wrong domain" }
    ]
}
```

---

## STEP 6: API & INTEGRATIONS

### External Integrations

| Integration | Protocol | Purpose |
|-------------|----------|---------|
| **PostgreSQL 16** | TCP (pgx/v5) | Primary data storage (34 migration tables) |
| **NATS JetStream 2.10** | TCP | Async job dispatch + result consumption + event streaming |
| **MinIO (S3)** | HTTP (S3 API) | Artifact storage with presigned URLs |
| **Docker** | Unix socket | Sandboxed tool container execution |
| **LLM Providers** | HTTP | Agent proposal generation (Anthropic, OpenAI, Gemini, HuggingFace) |

### Internal API Endpoints — Full Inventory

#### Tool Management (9 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/tools` | POST | Create new tool |
| `/v0/tools` | GET | List tools |
| `/v0/tools/{id}` | GET | Get tool details |
| `/v0/tools/{id}/versions` | GET | List versions |
| `/v0/tools/{id}/versions` | POST | Create version (with contract JSON) |
| `/v0/tools/{id}/versions/{version}` | GET | Get specific version |
| `/v0/tools/{id}/versions/{version}/publish` | POST | Publish version |
| `/v0/tools/{id}/versions/{version}/deprecate` | POST | Deprecate version |
| `/v0/validate/contract` | POST | Validate tool contract JSON schema |

#### Run Execution (11 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/runs` | POST | Start new run (tool or workflow) |
| `/v0/runs` | GET | List runs with filtering |
| `/v0/runs/{id}` | GET | Get run status and details |
| `/v0/runs/{id}/cancel` | POST | Cancel running job |
| `/v0/runs/{id}/resume` | POST | Resume from checkpoint |
| `/v0/runs/{id}/logs` | GET | Stream execution logs |
| `/v0/runs/{id}/events` | GET | List run events |
| `/v0/runs/{id}/artifacts` | GET | List output artifacts |
| `/v0/runs/{id}/trace` | GET | Get execution trace (DAG) |
| `/v0/runs/{id}/stream` | GET | SSE stream for real-time events |

#### Workflow Management (12 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/workflows` | POST | Create workflow |
| `/v0/workflows` | GET | List workflows |
| `/v0/workflows/{id}` | GET | Get workflow |
| `/v0/workflows/{id}` | DELETE | Delete workflow |
| `/v0/workflows/{id}/versions` | POST | Create new version (with DSL) |
| `/v0/workflows/{id}/versions` | GET | List versions |
| `/v0/workflows/{id}/versions/{version}` | GET | Get version |
| `/v0/workflows/{id}/versions/{version}/publish` | POST | Publish version |
| `/v0/workflows/{id}/run` | POST | Run workflow by ID |
| `/v0/workflows/compile` | POST | Validate and compile DSL |
| `/v0/workflows/validate` | POST | Validate DSL only |
| `/v0/workflows/plan` | POST | Generate execution plan |

#### Agent Management (15 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/agents` | POST | Create agent |
| `/v0/agents` | GET | List agents |
| `/v0/agents/{id}` | GET | Get agent |
| `/v0/agents/{id}` | DELETE | Delete agent |
| `/v0/agents/{id}/versions` | POST | Create version (with spec) |
| `/v0/agents/{id}/versions` | GET | List versions |
| `/v0/agents/{id}/versions/{version}` | GET | Get version |
| `/v0/agents/{id}/versions/{version}/validate` | POST | Validate spec |
| `/v0/agents/{id}/versions/{version}/publish` | POST | Publish version |
| `/v0/agents/{id}/versions/{version}/run` | POST | Execute agent |

#### Agent Sessions (6 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/agents/{id}/sessions` | POST | Create session |
| `/v0/agents/{id}/sessions/{sid}` | GET | Get session state |
| `/v0/agents/{id}/sessions/{sid}/run` | POST | Run agent in session |
| `/v0/agents/{id}/sessions/{sid}/messages` | POST | Send message |
| `/v0/agents/{id}/sessions/{sid}/approve` | POST | Approve action |
| `/v0/agents/{id}/sessions/{sid}` | DELETE | Close session |

#### Agent Memory and Learning (4 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/agents/{id}/memories` | POST | Create memory entry |
| `/v0/agents/{id}/memories` | GET | List memories |
| `/v0/agents/{id}/memories/{mid}` | GET | Get memory |
| `/v0/agents/{id}/memories/{mid}` | DELETE | Delete memory |

#### Agent Evaluation (6 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/agents/{id}/evals` | POST | Create eval case |
| `/v0/agents/{id}/evals` | GET | List eval cases |
| `/v0/agents/{id}/evals/{evalId}` | GET | Get eval case |
| `/v0/agents/{id}/evals/{evalId}` | PUT | Update eval case |
| `/v0/agents/{id}/evals/{evalId}` | DELETE | Delete eval case |
| `/v0/agents/{id}/evals/run` | POST | Run all evals |

#### Artifacts (7 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/artifacts/upload-url` | POST | Get presigned upload URL |
| `/v0/artifacts/{id}/finalize` | POST | Finalize upload |
| `/v0/artifacts` | GET | List artifacts |
| `/v0/artifacts/{id}` | GET | Get artifact metadata |
| `/v0/artifacts/{id}/download-url` | GET | Get presigned download URL |
| `/v0/artifacts/{id}/lineage` | GET | Get input/output lineage |
| `/v0/artifacts/{id}/convert` | POST | Convert artifact format |

#### Boards (6 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/boards` | POST | Create board |
| `/v0/boards` | GET | List boards |
| `/v0/boards/{id}` | GET | Get board |
| `/v0/boards/{id}` | PATCH | Update board |
| `/v0/boards/{id}` | DELETE | Delete board |
| `/v0/boards/{id}/children` | GET | List child boards |

#### Board Records and Attachments (6 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/boards/{id}/records` | POST | Add record (hypothesis, result, decision, etc.) |
| `/v0/boards/{id}/records` | GET | List records |
| `/v0/boards/{id}/records/{recordId}` | GET | Get record |
| `/v0/boards/{id}/attachments` | POST | Attach artifact to board |
| `/v0/boards/{id}/attachments` | GET | List attachments |
| `/v0/boards/{id}/attachments/{attachmentId}` | GET | Get attachment |

#### Gates / Governance (9 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/gates` | POST | Create gate |
| `/v0/gates` | GET | List gates |
| `/v0/gates/{id}` | GET | Get gate |
| `/v0/gates/{id}/requirements` | POST | Add requirement |
| `/v0/gates/{id}/requirements` | GET | List requirements |
| `/v0/gates/{id}/evaluate` | POST | Evaluate all requirements |
| `/v0/gates/{id}/approve` | POST | Manual approval |
| `/v0/gates/{id}/reject` | POST | Reject gate |
| `/v0/gates/{id}/waive` | POST | Waive gate |

#### Board Templates and Intent (4 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/templates` | GET | List templates |
| `/v0/templates/{id}` | GET | Get template |
| `/v0/boards/from-intent` | POST | Create board from intent spec |
| `/v0/boards/{id}/escalate-mode` | POST | Escalate board governance mode |

#### Board Intelligence (3 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/boards/{id}/intelligence/diff` | GET | Analyze evidence delta |
| `/v0/boards/{id}/intelligence/triage` | GET | Auto-triage gate failures |
| `/v0/boards/{id}/intelligence/reproducibility` | GET | Check run reproducibility |

#### Auth (4 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/auth/register` | POST | Register new user |
| `/v0/auth/login` | POST | OAuth login |
| `/v0/auth/whoami` | GET | Get current user |
| `/v0/auth/logout` | POST | Logout |

#### System (2 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/health` | GET | Health check (DB, NATS, MinIO) |
| `/v0/version` | GET | API version |

### Total: ~103 REST endpoints

---

## STEP 7: STATE & STORAGE

### Data Storage

| Storage | Technology | What is Stored |
|---------|-----------|----------------|
| **Relational DB** | PostgreSQL 16 | Tools, versions, workflows, agents, runs, node_runs, boards, cards, gates, gate_requirements, artifacts (metadata), audit_events, users, projects, quotas, templates, sessions, memories, triggers |
| **Object Store** | MinIO (S3-compatible) | Artifact binary blobs (CAD files, simulation outputs, images, datasets) |
| **Message Queue** | NATS JetStream | Job payloads (transient), results (transient), events (persisted in streams) |
| **Browser** | localStorage | JWT tokens (access + refresh), theme preference, sidebar state |
| **In-Memory** | Zustand stores | UI state (sidebar collapsed, active route, canvas nodes, spec editor, playground messages) |
| **Server Cache** | React Query | API response cache (5-minute stale time, 1 retry) |

### Database Tables (34 migrations)

```
-- Core entities
tools, tool_versions
workflows, workflow_versions
agents, agent_versions
runs, node_runs
artifacts

-- Board system
boards, board_records, board_attachments
cards, pipelines, plan_steps

-- Governance
gates, gate_requirements, gate_approvals

-- Type system
verticals, board_types, gate_types

-- Templates and intent
board_templates, intent_specs

-- Auth and access
projects, users, roles, rbac_policies

-- Observability
audit_events, quotas, quota_usage_daily

-- Agent runtime
sessions, agent_memories

-- Automation
triggers, toolshelf
```

### State Transitions

```
Tool:     draft -> published -> deprecated
Workflow: draft -> compiled -> published
Agent:    draft -> validated -> published
Run:      PENDING -> RUNNING -> SUCCEEDED | FAILED | CANCELED
NodeRun:  QUEUED -> RUNNING -> SUCCEEDED | FAILED | SKIPPED
Gate:     PENDING -> EVALUATING -> PASSED | FAILED | WAIVED
Board:    DRAFT -> ARCHIVED (mode: explore -> study -> release)
```

### Logging and Audit

- **Audit events**: Stored in `audit_events` PostgreSQL table via async `AuditService.Emit()`
- **Run logs**: Container stdout/stderr stored via MinIO reference (`logs_ref`)
- **Tracing**: OpenTelemetry + tracing_subscriber (Rust runner)
- **Network interceptor**: Frontend captures axios requests for debugging (`networkInterceptor.ts`)

---

## STEP 8: UI BEHAVIOR

### Screens and Navigation

| Screen | Route | User Actions |
|--------|-------|-------------|
| **Dashboard** | `/dashboard` | View system status, start new project, view recent workflows |
| **Workflows** | `/workflows` | List workflows, open Workflow Studio, view stats |
| **Agents** | `/agents` | List agents, open Agent Studio, view stats |
| **Boards** | `/boards` | Opens Board Studio in iframe |
| **Workflow Studio** | `/workflow-studio` | Opens Workflow Studio in iframe (fullscreen mode) |
| **Agent Studio** | `/agent-studio` | Opens Agent Studio in iframe (fullscreen mode) |
| **Tools** | `/tools` | Browse engineering tools catalog |
| **Integrations** | `/integrations` | Search/filter 50+ third-party integrations |
| **Capabilities** | `/capabilities` | View platform capabilities with usage meters |

### Studio-Specific Screens

#### Workflow Studio (port 3001)

| Page | Features |
|------|----------|
| Dashboard | Workflow stats, recent runs, KPIs |
| Builder | XYFlow canvas, node palette, DSL editor, input inspector, diagnostics |
| Runs | Real-time timeline, streaming logs, cost breakdown, artifact list |
| Artifacts | Immutable output catalog, lineage graph visualization |
| Versions | Version history, side-by-side diffs, publish/rollback |
| Triggers | Cron schedule editor, webhook URL config, event binding |
| Approvals | Gate review queue, requirement status, approve/reject |

#### Agent Studio (port 3002)

| Page | Features |
|------|----------|
| Dashboard | Agent overview, recent runs, performance KPIs |
| Builder | Name, goal, tools (permissions), constraints, scoring config, policy rules |
| Playground | Chat interface, proposal card inspection, session history, step debugger |
| Runs | Execution history, decision trace, logs, artifacts, cost |
| Approvals | Escalated proposals, approve/reject with comments |
| Evals | Golden dataset editor, run all evals, accuracy/regression metrics |
| Versions | Version diffs, A/B evaluation panel, publish/rollback |
| Policy | Confidence thresholds, escalation rules, mandatory validations |
| Memory | Fact browser, pattern viewer, context memory management |
| Analytics | Performance charts, cost trends, approval rates |

#### Board Studio (port 3003)

| Page | Features |
|------|----------|
| Dashboard | Board activity, recent updates |
| Boards | List with mode/status/type filters |
| Board Detail | 4 canvas views (cards, DAG, table, timeline), gate list, evidence panel |
| Card Detail | Simulation results, KPIs, metadata, linked runs |
| Release Packet | Locked artifacts, BOM, tolerances, proof bundle export |
| Approvals | Gate approval queue |
| Workflows | Browse workflows mapped to cards |
| Agents | Browse agents for proposal generation |
| Memory | Board context memory |

### Cross-Frame Communication

- Studios embedded via `<iframe src="http://localhost:300X?embedded=true">`
- Fullscreen toggle: `window.postMessage({ type: 'airaie:studio:fullscreen', fullscreen: true })`
- Platform `StudioFrame.tsx` listens and updates Zustand store
- `useEmbedded()` hook in studios detects `?embedded=true` to hide chrome

### Design System

| Element | Details |
|---------|---------|
| **Framework** | Tailwind CSS 3.4 with CSS custom properties |
| **Theme** | Light/dark mode via `[data-theme="dark"]` attribute |
| **Colors** | brand, surface, card, sidebar, content, status (6 semantic groups) |
| **Typography** | Inter (sans), monospace; scale: xs through 4xl |
| **Components** | Button (6 variants), Card (4 variants), Badge, Modal, Input, Select, Tabs, Toggle, Tooltip, DataTable, ProgressBar, Skeleton, Toast, ErrorBoundary, ConfirmDialog, CodeEditor, JsonViewer |
| **Spacing** | 4px-based scale (Tailwind default) |
| **Animations** | fade-in, slide-in, slide-up, skeleton pulse |
| **Responsive** | Grid system (1/2/3/5 columns) |

---

## STEP 9: HIDDEN / IMPLICIT LOGIC

### Assumptions

1. **Single-tenant by default**: `project_id` scoping exists but multi-tenancy is not enforced at infrastructure level
2. **Tool images pre-built**: The system assumes Docker images for tools already exist and are accessible
3. **NATS durability**: JetStream configured for at-least-once delivery; duplicate handling relies on idempotent result processing
4. **LLM availability optional**: Agent system works without LLM (algorithmic scoring only) when `AIRAIE_LLM_PROVIDER` is unset
5. **Local development assumed**: Vite proxy, hardcoded localhost ports — no production deployment config exists

### Hardcoded Logic

| Item | Value | Location |
|------|-------|----------|
| JWT access token expiry | 15 minutes | `internal/auth/jwt.go` |
| JWT refresh token expiry | 7 days | `internal/auth/jwt.go` |
| React Query stale time | 5 minutes | `main.tsx` |
| React Query retry count | 1 | `main.tsx` |
| Workflow Studio port | 3001 | Platform iframe URLs |
| Agent Studio port | 3002 | Platform iframe URLs |
| Board Studio port | 3003 | Platform iframe URLs |
| NATS job subject | `jobs.dispatch` | Runner config |
| NATS result subject | `results.completed` | Runner config |
| NATS event subject | `events.*` | Runner config |
| MinIO default bucket | `airaie-artifacts` | Environment config |
| API version prefix | `/v0/` | All endpoints |
| HTTP timeout | 30 seconds | Frontend API client |
| Max concurrent runner jobs | 4 | Runner default |
| Runner work directory | `/tmp/airaie-runner` | Runner default |
| PostgreSQL port | 5433 | Docker compose |

### Edge Case Handling

- **Workflow cycle detection**: Compiler checks for DAG cycles at compile time, rejects cyclic graphs
- **Runner policy enforcement**: Network denied by default (`"network": "deny"`), filesystem sandboxed
- **Gate waiver**: Gates can be waived (bypassed) with full audit trail — allows proceeding past failed checks
- **Agent budget limits**: Constraints include `max_cost_usd`, `max_retries`, `timeout_sec` to prevent runaway execution
- **Artifact content hashing**: SHA-256 prevents duplicate storage and ensures integrity
- **Token refresh**: Frontend axios interceptor catches 401, refreshes token, retries original request
- **Presigned URL expiry**: S3 URLs have time-limited access (prevents stale links)

### Known Limitations

1. **Test coverage**: Studios at ~5.3% test coverage (89 tests total across all studios)
2. **41 `as any` TypeScript casts** in studios (type safety debt)
3. **1 known XSS vulnerability** in board-studio `ExportDialog.tsx` (PDF export)
4. **No WebSocket support**: Real-time updates use SSE only (no bidirectional streaming)
5. **No offline support**: Frontend requires live backend connection
6. **Legacy Go worker**: `cmd/worker/main.go` still exists alongside Rust runner (being deprecated)
7. **No CI/CD pipeline**: GitHub Actions only for tool SDK publish/test, not full deployment
8. **Frontend proxy-only**: Vite dev proxy handles CORS; production deployment needs separate config
9. **Static integrations page**: 50+ integrations listed are UI-only with no backend connections
10. **Some dashboard data is mocked**: Recent workflows, system load values are hardcoded in components
11. **Bundle duplication**: Version mismatches in monorepo packages cause duplicate dependencies

---

## STEP 10: FINAL OUTPUT

### 1. Feature List (Complete — 70 Features)

| Domain | Count | Key Features |
|--------|-------|-------------|
| Tool Management | 4 | Registration, versioning, contract validation, capability discovery |
| Workflow Engine | 9 | Visual DAG builder, YAML DSL, compilation, scheduling, triggers |
| Run Execution | 9 | Dispatch, Docker sandbox, SSE streaming, cancellation, cost tracking |
| Artifact Management | 4 | Presigned URLs, content hashing, lineage, conversion |
| AI Agent System | 12 | Spec builder, LLM proposals, policy engine, memory, evaluations |
| Board and Governance | 14 | Boards, cards, gates, evidence, intelligence, release packets |
| Auth and Security | 4 | JWT, API keys, RBAC, user management |
| Platform and Observability | 7 | Audit, quotas, governance policies, health, CLI, SDK |
| Platform UI | 7 | Dashboard, tools catalog, integrations, studio embedding, theming |
| **TOTAL** | **70** | |

### 2. Architecture Diagram

```
                              +----------------------------+
                              |      AIRAIE PLATFORM       |
                              |     React SPA (:3000)      |
                              | Dashboard | Tools | Search |
                              +-----+------+------+--------+
                                    |      |      |
                          +---------+      |      +---------+
                          v                v                v
                   +--------------+ +--------------+ +--------------+
                   |  WORKFLOW    | |  AGENT       | |  BOARD       |
                   |  STUDIO     | |  STUDIO      | |  STUDIO      |
                   |  (:3001)    | |  (:3002)     | |  (:3003)     |
                   |  65 files   | |  72 files    | |  95 files    |
                   +---------+---+ +------+-------+ +------+-------+
                             |            |                |
                             +------------+----------------+
                                          |
                                  @airaie/shared
                                  (API client, types,
                                   auth, hooks, SSE)
                                          |
                                    Axios + JWT
                                    SSE streaming
                                          |
                   +----------------------v-----------------------+
                   |            GO CONTROL PLANE (:8080)          |
                   |                                              |
                   |  +--------+   +---------+   +-------+       |
                   |  |Handler |-->| Service |-->| Store |       |
                   |  | (HTTP) |   | (Logic) |   | (SQL) |       |
                   |  +--------+   +---------+   +---+---+       |
                   |  40+ files    30+ svcs       27 files       |
                   |                                              |
                   |  Special subsystems:                         |
                   |  +-- Workflow Engine (DSL -> AST -> DAG)     |
                   |  +-- Agent Runtime (LLM + scoring + policy)  |
                   |  +-- Board Intelligence (evidence analytics) |
                   |  +-- Auth (JWT + API Key + RBAC)             |
                   +---+----------------+----------------+--------+
                       |                |                |
              +--------v---+   +-------v-------+  +-----v--------+
              | PostgreSQL |   | NATS JetStream|  |    MinIO      |
              |   16       |   |     2.10      |  | (S3-compat)   |
              | 34 tables  |   | jobs.dispatch |  | Artifacts     |
              +------------+   | results.*     |  | Presigned URLs|
                               | events.*      |  +--------------+
                               +-------+-------+
                                       |
                               +-------v--------------+
                               | RUST DATA PLANE      |
                               | (Runner)             |
                               |                      |
                               | NATS -> Executor     |
                               | Docker Adapter       |
                               | Python / WASM        |
                               | S3 Artifact I/O      |
                               | Policy Enforcement   |
                               +----------------------+
```

### 3. Execution Flow (Step-by-Step Summary)

```
Request Lifecycle:
  1. User interacts with Studio UI (React)
  2. Studio makes HTTP call via @airaie/shared API client (Axios + JWT)
  3. Request hits Go API Gateway (port 8080)
  4. Handler validates request, extracts auth context
  5. Service layer executes business logic
  6. Store layer queries/writes PostgreSQL
  7. For execution requests:
     a. Service builds Job payload (JSON Schema validated)
     b. Publishes to NATS (jobs.dispatch)
     c. Returns 202 Accepted immediately
  8. Rust Runner consumes Job from NATS
  9. Runner enforces policy, executes in Docker container
  10. Runner uploads outputs to MinIO, publishes Result to NATS
  11. Go Result Consumer updates PostgreSQL, triggers next nodes
  12. Frontend receives updates via SSE stream
  13. React Query cache invalidation refreshes UI
```

### 4. Module Summary

| Module | Language | Estimated LOC | Responsibility |
|--------|----------|---------------|---------------|
| airaie-kernel/Go | Go 1.25 | ~15,000 | API gateway, 30+ services, auth, workflow engine, agent runtime |
| airaie-kernel/Rust | Rust 1.75 | ~3,000 | Job execution, Docker containers, policy enforcement |
| airaie-kernel/SQL | SQL | ~2,000 | 34 migrations, 30+ tables |
| airaie-studios/workflow | TypeScript/React | ~4,500 | Visual DAG builder, run monitoring |
| airaie-studios/agent | TypeScript/React | ~4,500 | Agent spec editor, playground, policy |
| airaie-studios/board | TypeScript/React | ~6,500 | Board governance, cards, gates, release |
| airaie-studios/shared | TypeScript | ~1,200 | API client, types, auth, hooks |
| airaie-studios/ui | TypeScript/React | ~900 | Design system, 18 components |
| airaie-platform | TypeScript/React | ~3,000 | Unified platform shell, dashboard |
| **TOTAL** | | **~40,600** | |

### 5. Data Flow Summary

```
INPUT:
  YAML DSL (workflows) | YAML Spec (agents) | JSON (tool contracts) | Binary (artifacts)
       |                       |                       |                     |
       v                       v                       v                     v
  +-----------+          +-----------+           +-----------+         +-----------+
  | Compiler  |          | Validator |           | Registry  |         |   MinIO   |
  | YAML->AST |          | Spec->OK  |           | Schema OK |         | S3 store  |
  +-----------+          +-----------+           +-----------+         +-----------+
       |                       |                       |                     |
       v                       v                       v                     v
  +------------------------------------------------------------------------+
  |                         PostgreSQL (persistent state)                    |
  |  workflows, agents, tools, runs, boards, gates, artifacts (metadata)   |
  +------------------------------------------------------------------------+
       |
       v (on execution)
  +-----------+        +-----------+        +-----------+
  | Job Build |  --->  |   NATS    |  --->  |   Rust    |
  | (Go svc)  |        | JetStream |        |  Runner   |
  +-----------+        +-----------+        +-----------+
                                                  |
                                                  v
                                            +-----------+
                                            |  Docker   |
                                            | Container |
                                            +-----------+
                                                  |
                                                  v
                                            +-----------+
                                            |  Result   | --> NATS --> Go Consumer --> PostgreSQL
                                            |  + Artifacts| --> MinIO (binary outputs)
                                            +-----------+
                                                  |
                                                  v
OUTPUT:
  JSON (API responses) | SSE (real-time events) | Binary (artifact downloads)

STATE TRANSITIONS:
  Tool:     draft -> published -> deprecated
  Workflow: draft -> compiled  -> published
  Agent:    draft -> validated -> published
  Run:      PENDING -> RUNNING -> SUCCEEDED | FAILED | CANCELED
  NodeRun:  QUEUED  -> RUNNING -> SUCCEEDED | FAILED | SKIPPED
  Gate:     PENDING -> EVALUATING -> PASSED | FAILED | WAIVED
  Board:    mode: explore -> study -> release
```

### 6. Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| **Backend Languages** | Go 1.25, Rust 1.75 |
| **Frontend Language** | TypeScript 5.8/5.9, React 19 |
| **Build Tools** | Vite 6/7, Turbo 2.5, Cargo |
| **Database** | PostgreSQL 16 (pgx/v5) |
| **Message Queue** | NATS JetStream 2.10 |
| **Object Storage** | MinIO (S3-compatible) |
| **Container Runtime** | Docker |
| **HTTP Framework** | Go stdlib net/http |
| **CLI Framework** | Cobra (spf13) |
| **State Management** | Zustand 5 (client), React Query 5 (server) |
| **Styling** | Tailwind CSS 3.4 with design tokens |
| **Auth** | JWT (golang-jwt/v5) + API Keys + RBAC |
| **LLM Integration** | Anthropic, OpenAI, Gemini, HuggingFace (pluggable) |
| **Validation** | JSON Schema (gojsonschema), Zod (frontend) |
| **Testing** | Vitest, Testing Library, Playwright, testcontainers-go |
| **Visualization** | XYFlow (DAGs), Recharts (charts), Three.js/VTK.js (3D) |
| **Logging** | OpenTelemetry, tracing_subscriber |
| **Infrastructure** | Docker Compose (dev), Kubernetes manifests (deploy) |

---

## APPENDIX A: CORE DATA MODELS

### Run

```
Run {
    ID:          string    // run_XXXXXXXX
    ProjectID:   string    // Project scope
    RunType:     string    // "tool", "workflow", "agent"
    ToolRef:     string?   // tool_id@version
    WorkflowID:  string?   // workflow_id
    AgentID:     string?   // agent_id
    Status:      RunStatus // PENDING -> RUNNING -> SUCCEEDED/FAILED/CANCELED
    InputsJSON:  bytes     // Serialized inputs
    OutputsJSON: bytes     // Serialized outputs (on completion)
    Actor:       string    // user_id or agent_id
    StartedAt:   time?
    CompletedAt: time?
    CreatedAt:   time
}
```

### NodeRun

```
NodeRun {
    ID:              string        // node_run_XXXXXXXX
    RunID:           string        // Parent run
    NodeID:          string        // DAG node identifier
    JobID:           string        // Dispatched job_id
    ToolRef:         string        // tool_id@version
    Status:          NodeRunStatus // QUEUED -> RUNNING -> SUCCEEDED/FAILED/SKIPPED
    Attempt:         int           // Retry count
    OutputArtifacts: []string      // Output artifact IDs
    CostEstimate:    float64
    CostActual:      float64
}
```

### Board

```
Board {
    ID:            string      // board_XXXXXXXX
    ProjectID:     string
    Type:          BoardType   // "research", "engineering"
    VerticalID:    string?     // Domain vertical
    Name:          string
    Mode:          string      // "explore", "study", "release"
    ParentBoardID: string?     // Hierarchical composition
    Status:        BoardStatus // "DRAFT", "ARCHIVED"
    MetaJSON:      bytes       // Custom metadata
}
```

### Gate

```
Gate {
    ID:       string     // gate_XXXXXXXX
    BoardID:  string
    Name:     string
    GateType: GateType   // "evidence", "review", "compliance"
    Status:   GateStatus // PENDING -> EVALUATING -> PASSED/FAILED/WAIVED
    MetaJSON: bytes
}

GateRequirement {
    ID:           string      // requirement_XXXXXXXX
    GateID:       string
    ReqType:      GateReqType // "run_succeeded", "artifact_exists", "role_signed"
    ConfigJSON:   bytes       // Type-specific config
    Satisfied:    bool
    EvidenceJSON: bytes       // Evaluation result
}
```

### Workflow

```
Workflow {
    ID:          string // workflow_XXXXXXXX
    ProjectID:   string
    Name:        string
    Description: string
}

WorkflowVersion {
    ID:         string // version_XXXXXXXX
    WorkflowID: string
    Version:    int    // Auto-incrementing
    DSLJSON:    bytes  // YAML DSL as JSON
    ASTJSON:    bytes  // Compiled AST
    Status:     string // "draft", "compiled", "published"
}
```

### Agent

```
Agent {
    ID:        string // agent_XXXXXXXX
    ProjectID: string
    Name:      string
    Owner:     string
}

AgentVersion {
    ID:       string // agent_ver_XXXXXXXX
    AgentID:  string
    Version:  int
    SpecJSON: bytes  // AgentSpec YAML as JSON
    Status:   string // "draft", "validated", "published"
}
```

### Artifact

```
Artifact {
    ID:          string  // art_XXXXXXXX
    ProjectID:   string
    Name:        string  // e.g., "simulation_output.csv"
    Type:        string  // "dataset", "report", "cad_model", "image"
    ContentHash: string  // SHA-256
    SizeBytes:   int64
    StorageURI:  string  // s3://bucket/path/to/file
    MetaJSON:    bytes   // Custom metadata
    CreatedBy:   string  // run_id or user_id
    CreatedAt:   time
}
```

---

## APPENDIX B: ENVIRONMENT CONFIGURATION

### API Gateway

```
DATABASE_URL=postgres://airaie:airaie_dev@localhost:5433/airaie
NATS_URL=nats://localhost:4222
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=airaie
MINIO_SECRET_KEY=airaie_dev
MINIO_BUCKET=airaie-artifacts
MINIO_REGION=us-east-1
API_PORT=8080

# Optional LLM integration
AIRAIE_LLM_PROVIDER=anthropic
AIRAIE_LLM_MODEL=claude-3-sonnet-20240229
AIRAIE_LLM_API_KEY=sk-ant-...
AIRAIE_LLM_WEIGHT=0.7
```

### Rust Runner

```
AIRAIE_NATS_URL=nats://localhost:4222
AIRAIE_JOB_SUBJECT=jobs.dispatch
AIRAIE_RESULT_SUBJECT=results.completed
AIRAIE_QUEUE_GROUP=runners
AIRAIE_MAX_CONCURRENT=4
AIRAIE_WORK_DIR=/tmp/airaie-runner
AIRAIE_MINIO_ENDPOINT=http://localhost:9000
```

### Docker Compose Services

```
PostgreSQL:  port 5433
NATS:        port 4222 (client), 8222 (monitoring)
MinIO:       port 9000 (API), 9001 (console)
Worker:      port 8082 (health)
```

### Frontend Dev Servers

```
airaie-platform:       port 3000
workflow-studio:       port 3001
agent-studio:          port 3002
board-studio:          port 3003
API proxy:             /api/* and /v0/* -> localhost:8080
```

---

## APPENDIX C: SERVICE LAYER COMPLETE LIST (30+ SERVICES)

| Service | File | Purpose |
|---------|------|---------|
| RegistryService | `service/registry.go` | Tool registration and resolution |
| RunService | `service/run.go` | Tool execution orchestration |
| WorkflowService | `service/workflow.go` | Workflow CRUD and versioning |
| WorkflowScheduler | `workflow/scheduler.go` | DAG execution and node dispatch |
| AgentService | `service/agent.go` | Agent CRUD and versioning |
| AgentRuntimeService | `service/runtime.go` | Agent execution and planning |
| BoardService | `service/board.go` | Research/engineering boards |
| GateService | `service/gate.go` | Governance gates and approval |
| ArtifactService | `service/artifact.go` | Artifact upload/download |
| AuditService | `service/audit.go` | Event logging and compliance |
| CapabilityService | `service/capability.go` | Capability resolution |
| ToolShelfService | `service/toolshelf.go` | Tool discovery and curation |
| PlanGeneratorService | `service/plan.go` | DAG plan generation |
| PreflightService | `service/preflight.go` | Pre-execution validation |
| QuotaService | `service/quota.go` | Resource quota enforcement |
| GovernancePolicyService | `service/governance_policy.go` | Security policy management |
| TemplateService | `service/template.go` | Template management |
| ExplainService | `service/explain.go` | Run explanation and analysis |
| BoardCompositionService | `service/board_composition.go` | Sub-board hierarchy |
| BoardModeService | `service/board_mode.go` | Board governance modes |
| BoardIntentService | `service/board_intent.go` | Intent to board creation |
| BoardTemplateService | `service/board_template.go` | Board templates and presets |
| CardService | `service/card.go` | Card entity management |
| EvidenceCollectorService | `service/evidence.go` | Auto evidence collection |
| BoardIntelligenceService | `service/board_intelligence.go` | Evidence analytics |
| TypeRegistry | `service/type_registry.go` | Domain type definitions |
| IntentService | `service/intent.go` | Intent spec management |
| TriggerService | `service/trigger.go` | Automated triggers |
| CapabilityResolutionService | `service/capability_resolution.go` | Constraint-aware search |
| JWTService | `auth/jwt.go` | Token generation/validation |
| APIKeyService | `auth/apikey.go` | API key management |
| RBACService | `auth/rbac.go` | Role-based access control |

---

*Generated: 2026-03-31*
*Based on: Complete source code analysis of airaie-kernel, airaie-studios, and airaie-platform repositories*
