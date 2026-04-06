# AIRAIE MVP — Backend & Frontend Flow Reference

> Comprehensive domain-by-domain mapping of every endpoint, service, model, store, hook, component, and data flow.
> Generated: 2026-04-05

---

## Table of Contents

1. [Workflows](#1-workflows)
2. [Agents](#2-agents)
3. [Tools](#3-tools)
4. [Boards & Governance](#4-boards--governance)
5. [Cross-Cutting: Runs, Logs, SSE](#5-cross-cutting-runs-logs-sse)
6. [Gap Analysis & MVP Readiness](#6-gap-analysis--mvp-readiness)

---

## 1. WORKFLOWS

### 1.1 Backend — Endpoints (12)

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/workflows` | `CreateWorkflow` | Create workflow (name, description) |
| GET | `/v0/workflows` | `ListWorkflows` | List workflows (pagination, status filter) |
| GET | `/v0/workflows/{id}` | `GetWorkflow` | Get workflow with versions |
| DELETE | `/v0/workflows/{id}` | `DeleteWorkflow` | Delete (only if no published versions) |
| POST | `/v0/workflows/{id}/versions` | `CreateWorkflowVersion` | Create version with DSL YAML |
| GET | `/v0/workflows/{id}/versions` | `ListWorkflowVersions` | List all versions |
| GET | `/v0/workflows/{id}/versions/{v}` | `GetWorkflowVersion` | Get specific version |
| POST | `/v0/workflows/{id}/versions/{v}/publish` | `PublishWorkflowVersion` | Publish compiled version |
| POST | `/v0/workflows/compile` | `CompileWorkflow` | Compile YAML → AST |
| POST | `/v0/workflows/validate` | `ValidateWorkflow` | Validate YAML without saving |
| POST | `/v0/workflows/plan` | `PlanWorkflow` | Preview execution plan |
| POST | `/v0/workflows/{id}/run` | `StartWorkflowRunByID` | Execute with inputs |

### 1.2 Backend — Models

```
Workflow
├── id, project_id, name, description
├── created_at, updated_at
└── WorkflowVersion[]
    ├── id, workflow_id, version (int)
    ├── dsl_json (parsed YAML), ast_json (compiled AST)
    └── status: draft → compiled → published

WorkflowDSL (YAML input)
├── api_version: "airaie.workflow/v1"
├── metadata: { name, description, version }
├── inputs[]: { name, type, required, default }
├── nodes[]: { id, tool/agent, type, inputs, depends_on, when, retry, timeout, critical }
└── outputs: { key: expression }

WorkflowAST (compiled output)
├── metadata, inputs, config
├── nodes{}: ASTNode { id, type, tool_ref, tool_id, tool_version, inputs, outputs, condition, dependencies, critical }
├── edges[]: { from, to, type }
└── top_order[]: topological execution order
```

### 1.3 Backend — Services

**WorkflowService** — CRUD + version management:
- `CreateWorkflow` → duplicate name check → insert
- `CreateVersion` → parse YAML → validate → store (draft)
- `CompileWorkflow` → resolve variables → build edges → load contracts → type-check → store AST (compiled)
- `PublishWorkflow` → verify compiled → update status (published)
- `StartWorkflowRun` → find latest published → validate inputs → create Run → call WorkflowRunner

**Workflow Compiler Pipeline** (`internal/workflow/`):
```
YAML → Parser (strict validation)
     → Resolver (variables: $inputs.X, $nodes.X.outputs.Y)
     → DAG Builder (cycle detection, topological sort via Kahn's algorithm)
     → Type Checker (contract-based port compatibility)
     → AST Output (with execution levels for parallelism)
```

**Workflow Validator** — 7 checks:
1. Structure (api_version, kind, identifiers `^[a-z][a-z0-9_-]{0,63}$`)
2. Tool ref format (`name@version`)
3. Variable resolution
4. DAG validation (cycles, valid references)
5. Tool availability (exist, published)
6. Condition syntax
7. Lint warnings (implicit deps, unreachable nodes, unused inputs)

**Execution Engine** (`internal/workflow/`):

| Component | Purpose |
|-----------|---------|
| `Scheduler` | Manages per-run execution state, dispatches nodes by level |
| `ExecutionPlanBuilder` | AST → ExecutionPlan with parallelizable levels |
| `Dispatcher` | Creates JobPayload, publishes to NATS `jobs.dispatch` |
| `ResultHandler` | Processes JobResult, updates node status, triggers downstream |
| `RetryScheduler` | Per-node retry with exponential backoff |
| `ConditionEvaluator` | Evaluates `when` expressions at runtime |

**ExecutionPlan**:
```
ExecutionPlan
├── run_id, project_id, workflow_id, version
├── nodes{}: ExecutionNode { id, tool_ref, status, attempt, max_attempts, inputs, outputs, job_id }
├── levels[][]: parallelizable groups (topological levels)
├── config: { parallelism, timeout_seconds, max_retries, continue_on_error }
└── inputs{}, policy{}
```

**JobPayload** (dispatched to NATS):
```
{ job_id, run_id, node_id, tool_ref, image, adapter, inputs[], limits, policy, artifact_urls{} }
```

### 1.4 Frontend — Data Layer

**Types** (`types/workflow.ts`):
```typescript
Workflow {
  id, name, description, status, projectId, ownerId, ownerName,
  createdAt, updatedAt, lastRunAt, runCount, avgDuration,
  steps: WorkflowStep[], triggers: WorkflowTrigger[]
}

WorkflowStep { id, name, type, status, action, config, position, connections, duration, error }
WorkflowTrigger { id, type: 'manual'|'schedule'|'webhook'|'event', config, isEnabled }

WorkflowEditorNode = Node<WorkflowNodeData>  // ReactFlow node
WorkflowNodeData {
  label, subtype, nodeType, version, status,
  inputs{}, resourceLimits?, retryPolicy?, metadata?
}
WorkflowEditorMetadata { id, name, version, versionStatus, createdAt, updatedAt }
```

**API** (`api/workflows.ts`):
| Function | Endpoint | Mock Fallback |
|----------|----------|---------------|
| `fetchWorkflow(id)` | `GET /v0/workflows/{id}` | MOCK_WORKFLOW (FEA pipeline) |
| `saveWorkflow(id, data)` | `PUT /v0/workflows/{id}` | Returns mock |
| `runWorkflow(id)` | `POST /v0/workflows/{id}/run` | Returns `{ runId }` |

**Store** (`store/workflowStore.ts` — Zustand):
```typescript
WorkflowEditorState {
  nodes[], edges[], selectedNodeId, metadata, isDirty
  // Actions:
  setNodes, setEdges, onNodesChange, onEdgesChange, onConnect,
  addNode, updateNodeData, removeNode, selectNode,
  setMetadata, markClean, loadWorkflow
}
```

**Hooks** (`hooks/useWorkflow.ts` — React Query):
| Hook | Key | Polling | Purpose |
|------|-----|---------|---------|
| `useWorkflow(id)` | `['workflows', id]` | staleTime 60s | Fetch workflow |
| `useSaveWorkflow(id)` | mutation | — | Save changes |
| `useRunWorkflow(id)` | mutation | — | Execute workflow |

### 1.5 Frontend — Pages & Components

**Pages (4)**:

| Page | Route | Layout |
|------|-------|--------|
| `WorkflowsPage` | `/workflows` | Grid/list of workflows, search, filter (status/sort), create modal |
| `WorkflowDetailPage` | `/workflows/:id` | Metadata, versions table, runs history, node definitions |
| `WorkflowEditorPage` | `/workflow-studio` | 3-panel: NodePalette (left) + Canvas (center) + Inspector (right) |
| `WorkflowRunsPage` | `/workflow-runs` | 4-panel: RunList + DAG overlay + LogViewer + NodeDetail |

**Editor Components**:
| Component | Purpose |
|-----------|---------|
| `WorkflowCanvas` | @xyflow/react wrapper, drag-drop, node types (trigger/tool/agent/logic/governance/data) |
| `NodePalette` | Categorized node browser with search, draggable items |
| `NodePropertiesPanel` | Selected node config: version, inputs, limits, retry, metadata |
| `WorkflowEditorTopBar` | Name, version badge, tabs (Editor/Runs/Eval), Save/Publish |
| `WorkflowEditorBottomBar` | Run button |
| `CreateWorkflowModal` | Blank/Template/Import, name, description, trigger, tags |

**Node Components** (`nodes/`):
| Component | Visual | Details |
|-----------|--------|---------|
| `TriggerNode` | Lightning bolt, green border | Webhook, schedule, event, manual |
| `ToolNode` | Wrench, orange border | Tool ref, version badge, I/O ports |
| `AgentNode` | Brain, purple border | Sub-ports [M][T][P][Mem] |
| `LogicNode` | Diamond | IF/Switch/Merge branching |

**Run Monitor Components** (`runs/`):
| Component | Purpose |
|-----------|---------|
| `ExecutionList` | Run list sidebar with status filters |
| `RunDAGViewer` | Canvas overlay with execution badges (green/red/spinner) |
| `LogViewer` | Auto-scroll log display with export |
| `LogLine` | Individual log entry (timestamp, nodeId, level, message) |
| `LogToolbar` | Filter and export controls |
| `RunNodeDetailPanel` | Selected node input/output/metrics |
| `ArtifactsTab` | Generated artifact list |
| `CostTab` | Per-node cost breakdown |
| `TimelineTab` | Gantt-style execution timeline |

### 1.6 Workflow Data Flow

```
┌─ USER CREATES WORKFLOW ───────────────────────────────────────────────┐
│                                                                        │
│  WorkflowsPage → CreateWorkflowModal                                  │
│       ↓                                                                │
│  POST /v0/workflows { name, description }                             │
│       ↓                                                                │
│  WorkflowService.CreateWorkflow → Store.CreateWorkflow                │
│       ↓                                                                │
│  Redirect → WorkflowEditorPage                                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ USER EDITS ON CANVAS ────────────────────────────────────────────────┐
│                                                                        │
│  NodePalette (drag) → WorkflowCanvas (drop) → workflowStore.addNode  │
│  Connect ports → workflowStore.onConnect → edges updated              │
│  Select node → NodePropertiesPanel → workflowStore.updateNodeData     │
│  isDirty = true                                                        │
│       ↓                                                                │
│  Save → PUT /v0/workflows/{id} (canvas state)                        │
│  Publish → POST /v0/workflows/{id}/versions/{v}/publish              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ USER RUNS WORKFLOW ──────────────────────────────────────────────────┐
│                                                                        │
│  WorkflowEditorBottomBar → "Run Workflow"                             │
│       ↓                                                                │
│  POST /v0/workflows/{id}/run { version, inputs, actor }              │
│       ↓                                                                │
│  Service: find published → validate inputs → create Run (PENDING)     │
│       ↓                                                                │
│  Scheduler: AST → ExecutionPlan → levels → dispatch root nodes        │
│       ↓                                                                │
│  Dispatcher: for each ready node → NATS "jobs.dispatch" (JobPayload) │
│       ↓                                                                │
│  [Rust Worker]: NATS consume → Docker exec → artifacts → NATS result │
│       ↓                                                                │
│  ResultHandler: update node status → trigger downstream → update Run  │
│       ↓                                                                │
│  SSE "events.{runId}" → Frontend EventSource (or polling today)       │
│       ↓                                                                │
│  WorkflowRunsPage: RunDAGViewer (badges) + LogViewer (live logs)     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.7 Workflow Gaps

| Area | What Exists | What's Missing |
|------|-------------|----------------|
| **YAML Editing** | Backend compiler/validator/parser complete | Frontend has no YAML editor (CodeMirror planned but not wired) |
| **Compile/Publish** | Backend endpoints ready | Frontend Save/Publish buttons are stubs (no API calls) |
| **Run Execution** | Full scheduler + NATS dispatch coded | Rust worker not built; no actual Docker execution |
| **SSE Streaming** | Backend SSE endpoints coded + tested | Frontend polls every 2-3s instead of using EventSource |
| **Expression Editor** | Backend evaluates `{{ }}` at runtime | Frontend has no expression editor (CodeMirror 6 planned) |
| **Version Management** | Backend CRUD + lifecycle complete | Frontend version selector is static mock data |
| **Triggers** | Backend trigger CRUD endpoints exist | Frontend trigger config is a form stub |
| **Evaluation Tab** | Route/tab exists | No eval components or API integration |

---

## 2. AGENTS

### 2.1 Backend — Endpoints (25)

**Agent CRUD (4)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/agents` | `CreateAgent` | Create agent (name, description, owner) |
| GET | `/v0/agents` | `ListAgents` | List with pagination |
| GET | `/v0/agents/{id}` | `GetAgent` | Get agent detail |
| DELETE | `/v0/agents/{id}` | `DeleteAgent` | Delete agent + all versions |

**Versions (5)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/agents/{id}/versions` | `CreateAgentVersion` | Create version with spec JSON |
| GET | `/v0/agents/{id}/versions` | `ListAgentVersions` | List versions |
| GET | `/v0/agents/{id}/versions/{v}` | `GetAgentVersion` | Get specific version |
| POST | `/v0/agents/{id}/versions/{v}/validate` | `ValidateAgentVersion` | Validate spec |
| POST | `/v0/agents/{id}/versions/{v}/publish` | `PublishAgentVersion` | Publish version |

**Execution (1)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/agents/{id}/versions/{v}/run` | `RunAgent` | Execute (supports `?dry_run=true`) |

**Sessions (6)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/agents/{id}/sessions` | `CreateSession` | Create 1-hour session |
| GET | `/v0/agents/{id}/sessions/{sid}` | `GetSession` | Get session state |
| POST | `/v0/agents/{id}/sessions/{sid}/run` | `RunInSession` | Run within session context |
| POST | `/v0/agents/{id}/sessions/{sid}/messages` | `SendMessage` | Multi-turn message |
| POST | `/v0/agents/{id}/sessions/{sid}/approve` | `ApproveSessionAction` | Approve pending action |
| DELETE | `/v0/agents/{id}/sessions/{sid}` | `CloseSession` | Close session |

**Memory (3)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/agents/{id}/memories` | `CreateMemory` | Store memory (fact/preference/lesson/error_pattern) |
| GET | `/v0/agents/{id}/memories` | `ListMemories` | List by type filter |
| DELETE | `/v0/agents/{id}/memories/{mid}` | `DeleteMemory` | Remove memory |

**Evals (1)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/agents/{id}/evals/run` | `RunAgentEvals` | Execute eval cases, returns per-case results + summary |

**Approvals (4)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| GET | `/v0/approvals` | `ListApprovals` | List pending/completed |
| GET | `/v0/approvals/{id}` | `GetApproval` | Get approval request |
| POST | `/v0/approvals/{id}/approve` | `ApproveRequest` | Approve with rationale |
| POST | `/v0/approvals/{id}/reject` | `RejectRequest` | Reject with rationale |

### 2.2 Backend — Models

```
Agent
├── id, project_id, name, description, owner
└── AgentVersion[]
    ├── id, agent_id, version (int), spec_json, status (draft→validated→published)
    └── AgentSpec (parsed from spec_json)
        ├── goal (natural language)
        ├── tools[]: { tool_ref, permissions[], max_invocations }
        ├── context_schema: required/optional inputs with types
        ├── scoring: { strategy: weighted|priority|cost_optimized, weights }
        ├── constraints: { max_tools_per_run, timeout_seconds, max_retries, budget_limit }
        └── policy: { auto_approve_threshold, require_approval_for[], escalation_rules[] }

Session
├── id, agent_id, project_id, status (active|closed|expired)
├── context_json, history_json (SessionEntry[])
└── expires_at (1 hour default)

AgentMemory
├── id, agent_id, project_id
├── memory_type: fact | preference | lesson | error_pattern
├── content, tags[], relevance (0.0-1.0)
└── source_run_id (auto-linked from LearnFromRun)

ApprovalRequest
├── id, run_id, agent_id, project_id
├── proposal_json, status (pending|approved|rejected|escalated|expired)
└── decided_by, decided_at, rationale
```

### 2.3 Backend — Agent Runtime (`internal/agent/`)

**Execution Pipeline**:
```
Goal + Context + Tools
      ↓
  ProposalGenerator
  ├── ToolSearcher → find matching tools
  ├── Scorer → compatibility(0.4) + trust(0.3) + cost(0.2) + latency(0.1)
  ├── LLM Scorer (optional) → blended: (1-llm_weight) × algo + llm_weight × llm
  ├── InputMapper → map user inputs to tool contract ports
  └── DependencyBuilder → analyze capability chains
      ↓
  ActionProposal { actions[], dependencies[], total_score, estimated_cost }
      ↓
  PolicyEngine.Evaluate
  ├── Rule: score >= auto_approve_threshold → APPROVED
  ├── Rule: permission in require_approval_for → NEEDS_APPROVAL
  └── Rule: escalation_rules match → ESCALATE or BLOCK
      ↓
  PolicyDecision { overall_verdict, action_decisions[], trace[] }
      ↓
  RunPlanBuilder.BuildRunPlan (if approved)
  ├── ProposedActions → PlannedExecutions with node IDs
  ├── DAG from dependencies → topological sort → execution levels
  └── RunPlan { actions[], levels[][], node_deps{}, config }
      ↓
  Dispatch to NATS (same as workflow execution)
```

**Replanning on Failure**:
```
ProposalGenerator.GenerateWithFailureContext(agentCtx, failCtx)
├── Excludes failed tool
├── Enriches goal with failure context
└── Regenerates proposal with remaining tools
```

**Session Manager** — Multi-turn conversations:
```
Create → Session { context, history[], expires_at }
AddMessage → Append message, merge context updates
ProcessMessage → Build LLM prompt with history + memories → response
BuildRunContext → Merge session context + history + user inputs
AppendResult → Record run result in history
```

**Memory Learning** — Auto-extracts from completed runs:
```
LearnFromRun(agent, run, nodeRuns)
├── NodeFailed → error_pattern memory
├── NodeSucceeded → fact memory (key metrics)
└── NodeRetrying → lesson memory (retry patterns)
```

### 2.4 Frontend — Data Layer

**Types** (`types/agent.ts` + `types/agentPlayground.ts`):
```typescript
Agent {
  id, name, description,
  type: 'design'|'analysis'|'optimization'|'automation'|'custom',
  status: 'active'|'inactive'|'error',
  config: AgentConfig { model, temperature, maxTokens, systemPrompt, tools[], parameters{} },
  capabilities[], isPublic
}

AgentSession { id, name, agentId, agentName, messageCount, toolCallCount, status, createdAt }
ChatMessage { id, role: 'user'|'agent', content, timestamp, toolCallProposal? }
ToolCallProposal { toolName, toolVersion, confidence, reasoning, inputs, estimatedCost, alternatives[] }
DecisionTraceEntry { id, label, status, detail, timestamp }
AgentMetrics { iterations, totalCost, budgetRemaining, duration, timeout }
PolicyStatus { autoApproveThreshold, autoApproveEnabled }
```

**API** (`api/agentPlayground.ts`):
| Function | Endpoint | Mock |
|----------|----------|------|
| `fetchSessions(agentId)` | `GET /agents/{id}/sessions` | 3 sessions |
| `fetchMessages(sessionId)` | `GET /sessions/{sid}/messages` | Chat with proposals |
| `fetchDecisionTrace(sessionId)` | `GET /sessions/{sid}/trace` | 7-step trace |
| `fetchAgentMetrics(sessionId)` | `GET /sessions/{sid}/metrics` | Live metrics |
| `fetchPolicyStatus(agentId)` | `GET /agents/{id}/policy` | Threshold + toggle |
| `sendMessage(sessionId, content)` | `POST /sessions/{sid}/messages` | Echo response |
| `stopAgent(sessionId)` | `POST /sessions/{sid}/stop` | void |
| `approveAll(sessionId)` | `POST /sessions/{sid}/approve-all` | void |

**Store** (`store/agentPlaygroundStore.ts` — Zustand):
```typescript
AgentPlaygroundState {
  sessions[], activeSessionId, messages[], decisionTrace[],
  metrics, policyStatus, isAgentRunning, isSending
  // Actions:
  setSessions, setActiveSession, setMessages, addMessage,
  setDecisionTrace, setMetrics, setPolicyStatus,
  setAgentRunning, setSending, clearSession
}
```

**Hooks** (`hooks/useAgentPlayground.ts` — React Query):
| Hook | Key | Polling | Purpose |
|------|-----|---------|---------|
| `useSessions(agentId)` | `agentKeys.sessions()` | staleTime 30s | List sessions |
| `useMessages(sessionId)` | `agentKeys.messages()` | 3s refetch | Chat messages |
| `useDecisionTrace(sessionId)` | `agentKeys.trace()` | 3s refetch | Decision timeline |
| `useAgentMetrics(sessionId)` | `agentKeys.metrics()` | 5s refetch | Live cost/iterations |
| `usePolicyStatus(agentId)` | `agentKeys.policy()` | staleTime 60s | Policy config |
| `useSendMessage(sessionId)` | mutation | — | Send message |
| `useStopAgent(sessionId)` | mutation | — | Stop agent |
| `useApproveAll(sessionId)` | mutation | — | Approve all pending |

### 2.5 Frontend — Pages & Components

**Pages (3)**:

| Page | Route | Layout |
|------|-------|--------|
| `AgentsPage` | `/agents` | Agent cards grid (3 mock agents), recent decisions panel, bottom stats |
| `AgentStudioPage` | `/agent-studio` | 3-col: Pipeline sidebar + Builder/Playground/Evals tabs + Summary panel |
| `AgentPlaygroundPage` | `/agent-studio/:agentId` | 3-pane: SessionList + ChatInterface + InspectorPanel |

**Playground Components**:
| Component | Purpose |
|-----------|---------|
| `ChatInterface` | Message list with auto-scroll, empty states |
| `ChatMessage` | User/agent message rendering with optional ToolCallProposalCard |
| `SessionList` | Session browser with search, status badges, stats footer |
| `ToolCallProposalCard` | Tool proposal: confidence badge, reasoning, inputs, cost, alternatives |
| `DecisionTraceTimeline` | Step-by-step decision visualization |
| `LiveMetrics` | Iterations, cost, budget bar, duration/timeout |
| `InspectorPanel` | Session info + trace + metrics + policy |
| `PolicyStatusCard` | Auto-approve threshold and toggle |
| `PlaygroundActionBar` | Stop, Approve All buttons |

**Builder Components** (in AgentStudioPage):
| Section | Content |
|---------|---------|
| Agent Pipeline | Visual: Provider → Agent → Tools → Policy → Memory (expandable cards) |
| Goal | Textarea (500 char limit) |
| Model Config | Provider selector, model selector, LLM weight slider |
| Tool Permissions | Table: Tool, Version, Permissions, Max Calls |
| Scoring | Strategy selector, weight configuration |
| Policy | Auto-approve threshold slider, approval requirements |
| Summary | Health check, performance metrics, recent decisions |

### 2.6 Agent Data Flow

```
┌─ AGENT CREATION ──────────────────────────────────────────────────────┐
│                                                                        │
│  AgentsPage → CreateAgentModal                                         │
│       ↓                                                                │
│  POST /v0/agents { name, description, owner }                         │
│       ↓                                                                │
│  AgentStudioPage → Builder tab                                         │
│  Configure: goal, model, tools, policy, scoring                       │
│       ↓                                                                │
│  POST /v0/agents/{id}/versions { spec_json }                          │
│  POST /v0/agents/{id}/versions/{v}/validate                           │
│  POST /v0/agents/{id}/versions/{v}/publish                            │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ AGENT PLAYGROUND SESSION ────────────────────────────────────────────┐
│                                                                        │
│  AgentPlaygroundPage → SessionList → create/select session            │
│       ↓                                                                │
│  ChatInterface → user types message                                    │
│       ↓                                                                │
│  POST /v0/agents/{id}/sessions/{sid}/messages { content }             │
│       ↓                                                                │
│  SessionManager.ProcessMessage:                                        │
│  ├── Recall memories → build LLM context                              │
│  ├── LLM generates response (or basic ack if no LLM wired)           │
│  └── Return ChatMessage                                                │
│       ↓                                                                │
│  POST /v0/agents/{id}/versions/{v}/run { inputs }                     │
│       ↓                                                                │
│  ProposalGenerator.Generate → ActionProposal                          │
│  PolicyEngine.Evaluate → PolicyDecision                                │
│  ├── APPROVED → RunPlanBuilder → dispatch to NATS                     │
│  ├── NEEDS_APPROVAL → ApprovalRequest created → UI shows "Approve"   │
│  └── BLOCKED → 403 returned                                           │
│       ↓                                                                │
│  InspectorPanel updates: DecisionTrace (3s poll), Metrics (5s poll)   │
│  ChatInterface updates: agent response + ToolCallProposalCard         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.7 Agent Gaps

| Area | What Exists | What's Missing |
|------|-------------|----------------|
| **LLM Integration** | Agent runtime structure, scoring, proposals | No LLM provider actually wired (Claude/OpenAI) |
| **Agent CRUD UI** | Pages exist with mock data | No real API calls for create/list/get |
| **Version Management** | Backend complete | Frontend builder doesn't call version APIs |
| **Memory UI** | Backend CRUD + auto-learning | No frontend for viewing/managing memories |
| **Eval Runner** | Backend complete with scoring | Frontend eval tab is empty |
| **Approval Flow** | Backend ApprovalRequest + endpoints | Frontend "Approve" button is a stub |
| **SSE for Sessions** | Backend can stream events | Frontend polls every 3-5s |
| **Trigger Config** | Backend trigger CRUD | No frontend trigger management |

---

## 3. TOOLS

### 3.1 Backend — Endpoints (16)

**Tool CRUD (3)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/tools` | `CreateTool` | Register tool (name, description, owner) |
| GET | `/v0/tools` | `ListTools` | List with pagination, status filter |
| GET | `/v0/tools/{id}` | `GetTool` | Get tool with versions |

**Versions (5)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/tools/{id}/versions` | `CreateVersion` | Create version with contract JSON |
| GET | `/v0/tools/{id}/versions` | `ListVersions` | List versions |
| GET | `/v0/tools/{id}/versions/{v}` | `GetVersion` | Get specific version |
| POST | `/v0/tools/{id}/versions/{v}/publish` | `PublishVersion` | Publish + auto-sync capabilities |
| POST | `/v0/tools/{id}/versions/{v}/deprecate` | `DeprecateVersion` | Deprecate with message |

**Testing & Validation (3)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/tools/{id}/versions/{v}/tests` | `SubmitTestResults` | Store test results |
| GET | `/v0/tools/{id}/versions/{v}/tests` | `GetTestResults` | Get test results |
| POST | `/v0/tools/{id}/versions/{v}/validate-inputs` | `ValidateInputs` | Validate inputs vs contract |

**ToolShelf Resolution (3)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/toolshelf/resolve` | `resolveToolShelf` | Resolve best tool for intent |
| POST | `/v0/toolshelf/resolve/v2` | `resolveToolShelfV2` | Resolve tools + pipelines |
| GET | `/v0/toolshelf/tools/{toolID}` | `getToolDetail` | Extended tool metadata |

**Contract Validation (1)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/validate/contract` | `ValidateContract` | Validate contract without saving |

### 3.2 Backend — Models

```
Tool
├── id, project_id, name, description, owner
└── ToolVersion[]
    ├── id, tool_id, version (semver), status (draft→published→deprecated)
    ├── contract_json: ToolContract { inputs: ToolPort[], outputs: ToolPort[] }
    ├── run_count, success_rate (computed by TrustUpdater)
    └── deprecate_message

ToolPort { name, type: "artifact"|"parameter"|"metric", required, schema (JSONSchema), description }

ToolVersionExtended (ToolShelf-specific)
├── supported_intents[]: { intent_type, confidence, notes }
├── trust_level: "certified"|"verified"|"experimental"
├── cost_model: { base_credits, per_minute, per_core_hour }
├── success_rate, avg_execution_time
└── name, description (from joined tools table)

ToolTestResult { id, tool_id, tool_version, test_name, status, duration_ms, message, inputs_json, outputs_json }
BuildJob { id, tool_id, status, image_ref, image_digest, build_log }
ContainerRegistry { id, project_id, hostname, auth_type, credentials_enc }

Pipeline
├── id, vertical_id, slug, name, description
├── supported_intents[], trust_level, is_builtin
├── cost_estimate: { total_base_credits, breakdown[] }
├── time_estimate: { total_minutes, human_readable, breakdown[] }
└── steps[]: PipelineStep { tool_id, tool_version, role, config_template, input_mapping, output_mapping, order }
```

### 3.3 Backend — ToolShelf Resolution Algorithm (5 Stages)

```
Stage 1: DISCOVER
└── Query tool_versions by intent_type (GIN index on JSONB)

Stage 2: FILTER (ordered cheap → expensive)
├── Tenant access (ToolAccessChecker)
├── Governance policy (TrustLevelPolicy)
├── Quota availability (CreditQuotaChecker)
├── Schema compatibility (input requirements)
└── Hard constraints (max_credits, max_compute_hours)

Stage 3: RANK (composite score)
├── Trust level: certified=100, verified=70, experimental=30
├── Success rate: 0-80 points
├── Intent confidence: 0-40 points
├── Preference match: +50 bonus
├── Cost penalty: -0.1 × base_credits
└── Time penalty: -0.05 × minutes

Stage 4: EXPLAIN
└── Per-filtered-tool diagnostics: reason, action, filter_stage

Stage 5: ASSEMBLE
├── tools[0] → Recommended (ToolShelfEntry)
├── tools[1..N] → Alternatives[]
└── filtered → Unavailable[] (with diagnostics)
```

**Pipeline Resolution (V2)** adds:
- `resolvePipelines` — discover, filter, rank pipelines
- `ValidateChainCompatibility` — step-to-step schema validation
- Pipeline scoring: trust + pipeline_bonus + builtin_bonus - cost - time

### 3.4 Frontend — Data Layer

**Types** (`types/tool.ts`):
```typescript
Tool {
  id, name, description, detailDescription, icon, status, category, adapter,
  currentVersion, versions: ToolVersion[], contract: ToolContract,
  costPerRun, usageCount, image, registry,
  limits: { cpu, memoryMb, timeoutSeconds },
  sandboxNetwork: 'deny'|'allow', filesystemMode?,
  successRate?, avgDurationSeconds?, tags[]
}

ToolStatus = 'published' | 'draft' | 'deprecated'
ToolCategory = 'simulation' | 'meshing' | 'analysis' | 'materials' | 'ml-ai' | 'utilities'
ToolAdapter = 'docker' | 'python' | 'wasm' | 'remote-api'
```

**API** (`api/tools.ts`):
| Function | Endpoint | Mock |
|----------|----------|------|
| `fetchTools()` | `GET /v0/tools` | 15 mock tools (FEA, CFD, Mesh, etc.) |
| `fetchTool(id)` | `GET /v0/tools/{id}` | Single tool detail |

**Store** (`store/toolRegistryStore.ts` — Zustand):
```typescript
ToolRegistryState {
  selectedToolId, filterStatus[], filterCategory[], filterAdapter[],
  search, sortBy
  // Actions:
  selectTool, toggleStatus, toggleCategory, toggleAdapter,
  setSearch, setSortBy, clearFilters
}
```

**Hooks** (`hooks/useTools.ts` — React Query):
| Hook | Key | Polling | Purpose |
|------|-----|---------|---------|
| `useToolList()` | `['tools', 'list']` | staleTime 60s | All tools |
| `useToolDetail(id)` | `['tools', id]` | staleTime 60s | Single tool |

### 3.5 Frontend — Pages & Components

**Page (1)**:

| Page | Route | Layout |
|------|-------|--------|
| `ToolRegistryPage` | `/tools` | 2-col: Table (left) + Quick View panel (right) |

**Components**:
| Component | Purpose |
|-----------|---------|
| `ToolRegistryPage` | Main page: search, filters (category/status/adapter), table + detail panel |
| `ToolCard` | Grid view card: icon, name, version, tags, stats |
| `ToolCardGrid` | Grid layout with filtering/sorting logic |
| `FilterSidebar` | Filter panel with checkboxes, counts per filter option |
| `ToolPropertiesPanel` | Detail: version history, contract I/O, execution config, limits, sandbox |
| `ToolRegistryTopBar` | Title, count badge, search, "Register Tool" button |
| `ToolRegistryActionBar` | "Use in Workflow", "View Contract", "Test Run" buttons |

**Table Columns**: Tool Name | Version | Status | Category | Adapter | I/O

**Quick View Panel Sections**: Description, Contract (Inputs/Outputs), Execution (Adapter/Image/Network), Limits (CPU/Memory/Timeout), Usage (Runs/Success rate/Avg duration)

### 3.6 Tool Data Flow

```
┌─ TOOL REGISTRATION ───────────────────────────────────────────────────┐
│                                                                        │
│  ToolRegistryPage → "Register Tool" (currently button stub)           │
│       ↓                                                                │
│  POST /v0/tools { name, description, owner }                          │
│  POST /v0/tools/{id}/versions { version, contract_json }              │
│  POST /v0/tools/{id}/versions/{v}/publish                             │
│       ↓                                                                │
│  Auto-sync: PublishVersion → CapabilityService.SyncCapabilities       │
│  Tool now discoverable by ToolShelf resolution                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ TOOL RESOLUTION (used by Plan Generator & Agent Runtime) ────────────┐
│                                                                        │
│  POST /v0/toolshelf/resolve { intent_type, inputs, constraints }      │
│       ↓                                                                │
│  ToolShelfService:                                                     │
│  1. DISCOVER → GIN index query for intent_type                        │
│  2. FILTER → access, trust, quota, schema, constraints                │
│  3. RANK → trust(100/70/30) + success + confidence + pref - cost      │
│  4. EXPLAIN → diagnostics for filtered tools                          │
│  5. ASSEMBLE → { recommended, alternatives[], unavailable[] }         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ TOOL IN WORKFLOW EXECUTION ──────────────────────────────────────────┐
│                                                                        │
│  Workflow Dispatcher creates JobPayload:                               │
│  { tool_ref: "fea-solver@2.1.0", image: "fea-solver:2.1",           │
│    inputs[], limits, artifact_urls{} }                                │
│       ↓                                                                │
│  NATS "jobs.dispatch" → Rust Worker → Docker container                │
│  ├── Mount /in (inputs), /out (outputs)                               │
│  ├── stdout/stderr → NATS "events.{runId}"                           │
│  └── /out files → SHA-256 hash → MinIO upload                        │
│       ↓                                                                │
│  NATS "results.completed" → ResultHandler                              │
│  TrustUpdater: update tool_versions.success_rate                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.7 Tool Gaps

| Area | What Exists | What's Missing |
|------|-------------|----------------|
| **Tool Registration UI** | "Register Tool" button | No modal/form for creating tools via frontend |
| **Contract Editor** | Backend validates JSON Schema contracts | No frontend contract editor |
| **Version Management** | Backend CRUD + publish + deprecate | Frontend shows versions but can't manage them |
| **Test Runner UI** | Backend stores/retrieves test results | No frontend for viewing test results |
| **Resolution UI** | Backend resolution engine complete | No frontend for testing tool resolution |
| **Docker Images** | Model + store for BuildJob | No build pipeline or image registry management |
| **"Use in Workflow"** | Button navigates to `/workflow-studio?tool={id}` | Doesn't actually wire tool into canvas |
| **Pipeline Management** | Backend CRUD for pipelines | No frontend for creating/editing pipelines |

---

## 4. BOARDS & GOVERNANCE

### 4.1 Backend — Endpoints (58)

**Board CRUD (6)**:
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/boards` | `CreateBoard` | Create board (type, mode, vertical) |
| GET | `/v0/boards` | `ListBoards` | List with type/status filter |
| GET | `/v0/boards/{id}` | `GetBoard` | Get board detail |
| PATCH | `/v0/boards/{id}` | `UpdateBoard` | Update name, desc, status, metadata |
| DELETE | `/v0/boards/{id}` | `DeleteBoard` | Delete board |
| GET | `/v0/boards/{id}/children` | `ListChildBoards` | Sub-board hierarchy |

**Board Records & Attachments (6)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v0/boards/{id}/records` | Add record (hypothesis, claim, note, decision, etc.) |
| GET | `/v0/boards/{id}/records` | List records (type filter) |
| GET | `/v0/boards/{id}/records/{rid}` | Get record |
| POST | `/v0/boards/{id}/attachments` | Add attachment (evidence, input, output, report) |
| GET | `/v0/boards/{id}/attachments` | List attachments |
| GET | `/v0/boards/{id}/attachments/{aid}` | Get attachment |

**Board Composition (1)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v0/boards/{id}/children` | Create sub-board with inheritance (max depth 3) |

**Board Mode & Governance (2)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v0/boards/{id}/mode-config` | Get mode config (gates, pinning, approvals) |
| POST | `/v0/boards/{id}/mode-escalate` | Escalate mode with gate generation |

**Board Summary & Intelligence (4)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v0/boards/{id}/summary` | Readiness scores, card/gate stats, next actions |
| GET | `/v0/boards/{id}/evidence-diff` | Compare evidence between boards |
| GET | `/v0/boards/{id}/triage` | Categorize card failures |
| GET | `/v0/boards/{id}/reproducibility` | Evaluate result reproducibility |

**Board Intent & Templates (5)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v0/boards/from-intent` | Create board from intent (auto-generates gates) |
| POST | `/v0/boards/{id}/escalate` | Escalate board mode |
| POST | `/v0/boards/from-template` | Create from template |
| GET | `/v0/board-templates` | List templates |
| GET | `/v0/board-templates/{id}` | Get template |

**Cards (13)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v0/boards/{bid}/cards` | Create card (analysis/comparison/sweep/agent/gate/milestone) |
| GET | `/v0/boards/{bid}/cards` | List cards (ordered by ordinal) |
| GET | `/v0/cards/{id}` | Get card |
| PATCH | `/v0/cards/{id}` | Update card (with status transition validation) |
| DELETE | `/v0/cards/{id}` | Delete card (cascade deps, runs, evidence) |
| POST | `/v0/cards/{id}/dependencies/{depId}` | Add dependency (cycle detection) |
| DELETE | `/v0/cards/{id}/dependencies/{depId}` | Remove dependency |
| POST | `/v0/cards/{id}/runs` | Link run to card |
| GET | `/v0/cards/{id}/runs` | List card runs |
| POST | `/v0/cards/{id}/evidence` | Record evidence (metric, value, evaluation) |
| GET | `/v0/cards/{id}/evidence` | List evidence (run filter, latest flag) |
| GET | `/v0/boards/{bid}/cards/ready` | Get unblocked ready cards |
| GET | `/v0/boards/{bid}/cards/graph` | Dependency graph (topological sort) |

**Gates (11)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v0/gates` | Create gate (board_id, name, gate_type) |
| GET | `/v0/gates?board_id=X` | List gates for board |
| GET | `/v0/gates/{id}` | Get gate detail |
| POST | `/v0/gates/{id}/requirements` | Add requirement (run_succeeded, artifact_exists, role_signed, metric_threshold) |
| GET | `/v0/gates/{id}/requirements` | List requirements |
| POST | `/v0/gates/{id}/evaluate` | Run preflight evaluation |
| POST | `/v0/gates/{id}/approve` | Approve (with role) |
| POST | `/v0/gates/{id}/reject` | Reject (with rationale) |
| POST | `/v0/gates/{id}/waive` | Waive (requires rationale, audit trail) |
| GET | `/v0/gates/{id}/approvals` | List approval records |

**Intents (6)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v0/boards/{bid}/intents` | Create intent spec |
| GET | `/v0/boards/{bid}/intents` | List intents |
| GET | `/v0/intents/{id}` | Get intent detail |
| PATCH | `/v0/intents/{id}` | Update draft intent |
| POST | `/v0/intents/{id}/lock` | Lock intent (validates, transitions) |
| DELETE | `/v0/intents/{id}` | Delete intent |

**Intent Types (4)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v0/verticals/{slug}/intent-types` | List intent types for vertical |
| GET | `/v0/intent-types/{slug}` | Get intent type definition (with inheritance) |
| GET | `/v0/intent-types/{slug}/inputs` | Merged required inputs |
| GET | `/v0/intent-types/{slug}/pipelines` | Merged default pipelines |

**Plans (6)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v0/cards/{id}/plan/generate` | Generate plan from intent + pipeline |
| GET | `/v0/cards/{id}/plan` | Get active plan |
| PATCH | `/v0/cards/{id}/plan` | Edit plan (update_params, insert/remove/skip node) |
| POST | `/v0/cards/{id}/plan/compile` | Compile plan → workflow YAML (preview) |
| POST | `/v0/cards/{id}/plan/validate` | Preflight validation (blockers/suggestions) |
| POST | `/v0/cards/{id}/plan/execute` | Compile → start run → link to card |

**Verticals (7)**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v0/verticals` | List all STEM verticals |
| POST | `/v0/verticals` | Create custom vertical |
| GET | `/v0/verticals/{slug}` | Get vertical with types |
| GET | `/v0/verticals/{slug}/board-types` | Board types for vertical |
| GET | `/v0/verticals/{slug}/gate-types` | Gate types for vertical |
| GET | `/v0/verticals/{slug}/req-types` | Requirement types |
| GET | `/v0/board-types/{slug}/statuses` | Board type statuses |

### 4.2 Backend — Models

```
Board
├── id, project_id, type, vertical_id, name, description
├── mode: explore → study → release (one-way escalation)
├── parent_board_id (max depth 3)
├── status: DRAFT | ARCHIVED
└── owner, metadata, archived_at

Card
├── id, board_id, intent_spec_id, card_type, intent_type
├── agent_id, agent_version (for "agent" card type)
├── title, description, status, ordinal, config
├── kpis[]: { metric_key, target_value, unit, tolerance }
└── Status machine:
    draft → ready|blocked|skipped
    ready → queued|blocked|skipped
    queued → running|blocked|skipped
    running → completed|failed|blocked|skipped
    failed → ready (retry)|skipped
    completed → skipped (override)

CardEvidence
├── id, card_id, artifact_id, run_id, criterion_id
├── metric_key, metric_value, metric_unit
├── operator, threshold, passed (bool)
└── evaluation: pass | fail | warning | info

IntentSpec
├── id, board_id, card_id, intent_type, version, goal
├── inputs[]: { name, artifact_ref, type, version, required, schema, value }
├── constraints{}, acceptance_criteria[]: { metric, operator, threshold, unit, weight }
├── preferences: { preferred_tools, compute_profile, timeout, retry_policy }
├── governance: { level: none|light|full, approval_roles, audit_level, compliance_tags }
└── status: draft → locked → active → completed|failed

ExecutionPlan
├── id, card_id, pipeline_id
├── nodes[]: PlanNode { node_id, tool_id, tool_version, role, parameters, is_editable, is_required }
├── edges[]: PlanEdge { from, to }
├── bindings{}, expected_outputs[], cost_estimate, time_estimate
├── status: draft → validated → executing → completed|failed
└── workflow_id, run_id (linked after compile+execute)

Gate
├── id, board_id, project_id, name, gate_type (evidence|review|compliance)
├── status: pending → evaluating → passed|failed → (failed can be waived)
├── requirements[]: { req_type, description, config, satisfied, evidence }
└── approvals[]: { role, action: approve|reject, rationale }

BoardRecord { id, board_id, record_type (10 types), title, content, run_id, artifact_id, actor }
BoardAttachment { id, board_id, artifact_id, record_id, kind (5 types), label }
```

### 4.3 Backend — Key Services

**BoardModeService** — Mode-driven governance:

| Setting | Explore | Study | Release |
|---------|---------|-------|---------|
| Gate generation | none | repro_peer | full |
| Input pinning | false | true | true |
| Auto evidence | false | false | true |
| Reproducibility pack | false | true | true |
| Require approvals | false | false | true |
| Auto-approve floor | 0.50 | 0.75 | 0.90 |

**BoardSummaryService** — Readiness scoring:
```
Overall = Σ (category_weight × category_pass_rate)
├── design:        0.30
├── validation:    0.30
├── compliance:    0.15
├── manufacturing: 0.10
└── approvals:     0.15
```

**PlanGeneratorService** — 9-step plan generation:
```
1. Validate card type (analysis|comparison|sweep only)
2. Load IntentSpec via card FK
3. Auto-select pipeline (highest trust_level for intent_type)
4. Instantiate pipeline steps → PlanNodes + PlanEdges
5. Bind IntentSpec.inputs → node ports
6. Apply parameter overrides (validate against tool contract)
7. Insert validation nodes (schema + unit checks)
8. Insert evidence nodes (metric extraction matching card KPIs)
9. Insert governance nodes (approval gates if board mode = study|release)
```

**EvidenceCollectorService** — 10-step collection:
```
1.  Run completes → event
2.  Queue async handler
3.  Load plan nodes with role = "evidence"
4.  For each output, extract metrics matching card KPIs
5.  Create CardEvidence records (pass|fail|warning|info)
6.  TrustUpdater: update tool_versions.success_rate
7.  Check borderline metrics (within tolerance)
8.  Auto-escalate approval gates if borderline
9.  Emit audit events
10. Invalidate plan readiness cache
```

**BoardIntelligenceService**:
- `EvidenceDiff(boardA, boardB)` → improved|degraded|unchanged|new|removed per metric
- `FailureTriage(board)` → CRITICAL (>50% overshoot) | WARNING (10-50%) | INFO (<10%)
- `ReproducibilityScore(card)` → CV-based consistency score across runs

### 4.4 Frontend — Data Layer

**No dedicated board API module** — Board data comes through:
- `api/dashboard.ts` → `fetchGovernance()` returns governance stats (mock data)
- Direct mock data in page components

**No dedicated board hooks** — Uses dashboard hooks:
- `useGovernance()` → 30s polling

**No dedicated board store** — UI state managed by `uiStore`

### 4.5 Frontend — Pages & Components

**Pages (3)**:

| Page | Route | Layout |
|------|-------|--------|
| `BoardsPage` | `/boards` | Board cards with mode filters (explore/study/release) |
| `CreateBoardPage` | `/boards/create` | Type, mode, vertical, gates, cards configuration form |
| `BoardDetailPage` | `/boards/:boardId` | Header (readiness%) + validation cards + gates + evidence panel |

**BoardsPage** — Board card shows:
- Type badge, mode tag, card count, gate status icons, readiness %, evidence metric

**CreateBoardPage** — Sections:
- Board type (engineering/research)
- Governance mode (explore/study/release)
- Gate types configuration
- Vertical domain selection
- Linked workflows/agents
- Validation card setup

**BoardDetailPage** — Sections:
- Header: name, vertical, domain, mode, readiness %, owner, dates
- Validation cards: title, status, KPIs (pass/pending/fail), linked run, progress bar
- Gates: name, status (passed/pending/blocked), requirements checklist, action buttons
- Evidence panel: hypothesis, result, decision, artifact reference

### 4.6 Board Data Flow

```
┌─ BOARD CREATION ──────────────────────────────────────────────────────┐
│                                                                        │
│  OPTION A: Manual                                                      │
│  BoardsPage → CreateBoardPage                                          │
│  POST /v0/boards { name, type, mode, vertical_id }                    │
│       ↓                                                                │
│  BoardService.CreateBoard → initial status via TypeRegistry            │
│                                                                        │
│  OPTION B: From Intent                                                 │
│  POST /v0/boards/from-intent { intent_type, goal, governance }        │
│       ↓                                                                │
│  BoardIntentService:                                                   │
│  ├── Derive board type from intent category                           │
│  ├── Derive mode from governance spec                                 │
│  ├── Create board + intent spec                                       │
│  └── Auto-generate gates from intent acceptance_criteria              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ CARD → PLAN → RUN → EVIDENCE FLOW ──────────────────────────────────┐
│                                                                        │
│  1. CREATE CARD                                                        │
│     POST /v0/boards/{bid}/cards { card_type, intent_type, title, kpis }│
│                                                                        │
│  2. CREATE INTENT SPEC                                                 │
│     POST /v0/boards/{bid}/intents { intent_type, goal, inputs,        │
│           acceptance_criteria, governance }                             │
│     POST /v0/intents/{id}/lock                                        │
│                                                                        │
│  3. GENERATE PLAN                                                      │
│     POST /v0/cards/{id}/plan/generate                                 │
│     PlanGenerator: load intent → select pipeline → instantiate nodes  │
│     → bind inputs → insert validation/evidence/governance nodes       │
│                                                                        │
│  4. VALIDATE PLAN                                                      │
│     POST /v0/cards/{id}/plan/validate                                 │
│     Preflight: schema, artifacts, units, quotas, governance, tools    │
│                                                                        │
│  5. EXECUTE PLAN                                                       │
│     POST /v0/cards/{id}/plan/execute                                  │
│     Plan → compile to workflow → start run → link to card             │
│                                                                        │
│  6. EVIDENCE COLLECTION (automatic)                                    │
│     Run completes → EvidenceCollector:                                 │
│     ├── Extract metrics matching card KPIs                            │
│     ├── Create CardEvidence records                                   │
│     ├── Update tool trust scores                                      │
│     └── Auto-escalate if borderline                                   │
│                                                                        │
│  7. GATE EVALUATION                                                    │
│     POST /v0/gates/{id}/evaluate                                      │
│     Check: run_succeeded? artifact_exists? threshold_met? role_signed?│
│     Result: PASSED | FAILED | BLOCKED                                  │
│                                                                        │
│  8. MODE ESCALATION                                                    │
│     POST /v0/boards/{id}/mode-escalate { next_mode: "release" }       │
│     All gates passed → board transitions to release mode              │
│     Release packet generated → manufacturing can proceed              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.7 Board Gaps

| Area | What Exists | What's Missing |
|------|-------------|----------------|
| **Board CRUD API calls** | Backend 58 endpoints ready | Frontend pages use hardcoded mock data, no API integration |
| **Card Management** | Backend CRUD + dependencies + graph | No frontend card creation/management UI wired to API |
| **Intent Spec UI** | Backend CRUD + lock + validation | No frontend intent spec editor |
| **Plan Generation UI** | Backend 9-step generator | No frontend plan viewer/editor |
| **Plan Execute** | Backend compile + run + link | No frontend "execute plan" flow |
| **Evidence Viewer** | Backend auto-collection + manual | Frontend shows mock evidence panel |
| **Gate Management** | Backend CRUD + evaluate + approve/reject/waive | Frontend shows mock gates, no real gate interaction |
| **Mode Escalation** | Backend ModeService with additive gates | No frontend escalation flow |
| **Board Summary** | Backend readiness scoring (5 categories) | Frontend shows mock readiness % |
| **Board Intelligence** | Backend diff, triage, reproducibility | No frontend visualization |
| **Vertical Browser** | Backend 7 introspection endpoints | Frontend has static vertical selector |
| **Board API Module** | — | No `api/boards.ts` file exists |
| **Board Hooks** | — | No `useBoards.ts` hooks exist |
| **Board Store** | — | No dedicated board Zustand store |

---

## 5. CROSS-CUTTING: RUNS, LOGS, SSE

### 5.1 Run Endpoints (12)

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/v0/runs` | `StartRun` | Create and start run |
| GET | `/v0/runs` | `ListRuns` | List runs with filters |
| GET | `/v0/runs/{id}` | `GetRun` | Get run detail |
| POST | `/v0/runs/{id}/cancel` | `CancelRun` | Cancel active run |
| POST | `/v0/runs/{id}/resume` | `ResumeRun` | Resume paused run |
| GET | `/v0/runs/{id}/logs` | `GetRunLogs` | Historical logs (JSON, paginated) |
| GET | `/v0/runs/{id}/events` | `GetRunEvents` | **Full SSE: replay + live stream** |
| GET | `/v0/runs/{id}/stream` | `StreamRunEvents` | Raw NATS SSE (no replay, 15s heartbeat) |
| GET | `/v0/runs/{id}/artifacts` | `GetRunArtifacts` | Output artifacts |
| GET | `/v0/runs/{id}/trace` | `GetRunTrace` | Unified timeline (minimal/normal/verbose) |
| GET | `/v0/runs/{id}/explain` | `ExplainRun` | Run explanation |
| GET | `/v0/runs/{id}/checkpoints` | `GetRunCheckpoints` | Resumable checkpoints |

### 5.2 Event Architecture

```
                    PERSISTENT PATH                    REAL-TIME PATH
                    ──────────────                     ─────────────
Runner (Docker)                                  Runner (Docker)
      │                                                │
      ├── stdout/stderr                                ├── status changes
      ↓                                                ↓
NATS "events.{runId}"                            NATS "events.{runId}"
      │                                                │
      ↓                                                ↓
StartEventConsumer()                             SubscribeRunEvents()
(subscribes "events.>")                          (subscribes "events.{runId}")
      │                                                │
      ├── Map: NODE_STARTED → node.started             ├── Buffer: channel(100)
      ├── Map: NODE_COMPLETED → node.completed         ├── Backpressure: drop if full
      ├── Map: NODE_FAILED → node.failed               │
      ├── Map: NODE_LOG → node.log                     │
      ├── Map: NODE_PROGRESS → node.progress           │
      ↓                                                ↓
AuditService.Emit()                              SSE Response
      │                                          event: node.started
      ↓                                          data: {"node_id":"..."}
PostgreSQL audit_events                          
(immutable, queryable)                           GetRunEvents:
      │                                          1. Replay ≤1000 from DB
      ↓                                          2. If terminal → done
GetRunLogs (JSON)                                3. Else → live stream
GetRunTrace (timeline)                           
```

### 5.3 SSE Event Types

```
event: node_started        data: { node_id, timestamp }
event: node_progress       data: { node_id, percent }
event: log_line            data: { node_id, level, message }
event: node_completed      data: { node_id, status, outputs }
event: artifact_produced   data: { artifact_id, type }
event: evidence_collected  data: { metric_key, value }
event: gate_evaluated      data: { gate_id, status }
event: run_completed       data: { status, duration_ms, cost_usd }
event: done                data: { status }  ← terminal event
```

### 5.4 NATS Subjects

```
airaie.jobs.dispatch              → Tool job to Rust worker
airaie.jobs.agent.execution       → Agent reasoning task
airaie.jobs.approval.wait         → Gate requiring human approval
airaie.events.{runId}             → Real-time events per run
airaie.results.completed          → Job completion from worker
airaie.execution.completed        → Full run completion
```

### 5.5 Frontend Run Implementation

**API** (`api/runs.ts`):
| Function | Endpoint | Mock |
|----------|----------|------|
| `fetchRunList(workflowId)` | `GET /v0/runs?workflow_id=X` | MOCK_RUNS |
| `fetchRunDetail(runId)` | `GET /v0/runs/{id}` | MOCK_DETAIL |
| `fetchRunLogs(runId)` | `GET /v0/runs/{id}/logs` | MOCK_LOGS |
| `cancelRun(runId)` | `POST /v0/runs/{id}/cancel` | void |
| `retryRun(runId)` | `POST /v0/runs/{id}/retry` | void |

**Store** (`store/runStore.ts`):
```typescript
RunState {
  selectedRunId, selectedRunNodeId, statusFilter,
  logAutoScroll, activeLogTab: 'logs'|'artifacts'|'cost'|'timeline'
}
```

**Hooks** (`hooks/useRuns.ts`):
| Hook | Polling | Purpose |
|------|---------|---------|
| `useRunList(workflowId)` | 15s refetch | List runs |
| `useRunDetail(runId)` | 3s refetch | Run state |
| `useRunLogs(runId)` | 2s refetch | Log lines |
| `useCancelRun()` | mutation | Cancel |
| `useRetryRun()` | mutation | Retry |

### 5.6 Run/Log Gaps

| Area | What Exists | What's Missing |
|------|-------------|----------------|
| **SSE Client** | Backend SSE endpoints coded + tested | Frontend uses HTTP polling (2-3s), no EventSource |
| **executionStore** | Architecture doc defines it | Not implemented (runStore is UI selection only) |
| **Rich Events** | Backend sends typed events (node/artifact/evidence/gate) | Frontend RunLogLine only has flat text |
| **DAG Animation** | RunDAGViewer exists | Not receiving live SSE to animate node badges |
| **Rust Worker** | NATS dispatch ready | Docker execution not built |
| **Container Logs** | Architecture: stdout → NATS | No actual container log streaming |

---

## 6. GAP ANALYSIS & MVP READINESS

### 6.1 Backend Readiness

| Domain | Endpoints | Services | Models | Store | Tests | Status |
|--------|-----------|----------|--------|-------|-------|--------|
| **Workflows** | 12 | Complete (compiler, scheduler, dispatcher) | Complete | Complete | Integration tests | **Ready** |
| **Agents** | 25 | Complete (runtime, scoring, policy, memory) | Complete | Complete | Integration tests | **Ready** (minus LLM) |
| **Tools** | 16 | Complete (registry, ToolShelf 5-stage) | Complete | Complete + GIN indexes | Integration tests | **Ready** |
| **Boards** | 58 | Complete (8 services) | Complete | Complete | Integration tests | **Ready** |
| **Runs/SSE** | 12 | Complete (consumer, streaming) | Complete | Complete | Integration tests | **Ready** |

**Backend blockers**:
- Rust worker not built (no Docker container execution)
- No LLM provider wired for agents
- JWT/API Key auth stubs exist but not enforced

### 6.2 Frontend Readiness

| Domain | Pages | API Calls | Store | Hooks | Components | Real API | Status |
|--------|-------|-----------|-------|-------|------------|----------|--------|
| **Workflows** | 4 | 3 (mock fallback) | workflowStore | 3 | 20+ | Stubs | **UI Shell Ready** |
| **Agents** | 3 | 8 (mock fallback) | agentPlaygroundStore | 8 | 10+ | Stubs | **UI Shell Ready** |
| **Tools** | 1 | 2 (mock fallback) | toolRegistryStore | 2 | 7 | Stubs | **UI Shell Ready** |
| **Boards** | 3 | 0 | None | 0 | Inline | None | **Mock Only** |
| **Runs/SSE** | 1 (shared) | 5 (mock fallback) | runStore | 5 | 12 | Stubs | **Polling Only** |

### 6.3 Priority Actions for MVP

**P0 — Must Have (connects frontend to backend)**:

| # | Action | Domain | Impact |
|---|--------|--------|--------|
| 1 | Wire real API calls (remove mock fallback where backend is ready) | All | Unblocks real data flow |
| 2 | Create `api/boards.ts` + `hooks/useBoards.ts` + `store/boardStore.ts` | Boards | Board domain has zero API integration |
| 3 | Replace polling with SSE EventSource on `/v0/runs/{id}/events` | Runs | Real-time UX for run monitoring |
| 4 | Build `executionStore` (Zustand) to ingest SSE events | Runs | Feed DAG overlay + LogViewer |
| 5 | Wire Save/Publish/Run buttons to real API endpoints | Workflows | Core editor functionality |

**P1 — Should Have (key features)**:

| # | Action | Domain | Impact |
|---|--------|--------|--------|
| 6 | Add YAML/CodeMirror editor for workflow DSL | Workflows | Power users need YAML editing |
| 7 | Wire agent CRUD + version management to API | Agents | Builder needs real data |
| 8 | Wire tool registration modal to API | Tools | Can't register new tools |
| 9 | Wire card/gate/intent management to board APIs | Boards | Core governance flow |
| 10 | Build mock runner (Go emits simulated events to NATS) | Runs | Demo full flow without Rust |

**P2 — Nice to Have (completeness)**:

| # | Action | Domain | Impact |
|---|--------|--------|--------|
| 11 | Expression editor (CodeMirror 6) for `{{ }}` syntax | Workflows | Advanced workflow config |
| 12 | Memory management UI for agents | Agents | Agent learning visibility |
| 13 | Eval runner UI | Agents/Workflows | Systematic testing |
| 14 | Pipeline editor/viewer | Tools | Multi-tool chain management |
| 15 | Board intelligence dashboards (diff, triage, repro) | Boards | Advanced governance |

---

## Appendix: File Reference

### Backend (`airaie-kernel/`)
```
internal/
├── handler/
│   ├── boards.go, board_composition.go, board_mode.go
│   ├── board_summary.go, board_intelligence.go, board_intent.go
│   ├── card.go, gates.go, intents.go, intent_types.go
│   ├── plan.go, evidence.go, verticals.go
│   ├── workflows.go, runs.go, sse.go, run_trace.go
│   ├── agents.go, agent_runs.go, agent_memory.go, agent_eval_runner.go
│   ├── tools.go, tool_sdk.go, toolshelf.go
│   ├── approvals.go, triggers.go
│   └── handler.go (route registration)
├── service/
│   ├── board.go, card.go, gate.go, intent.go
│   ├── plan_generator.go, evidence_collector.go
│   ├── board_composition.go, board_mode.go, board_summary.go
│   ├── board_intelligence.go, board_intent.go
│   ├── workflow.go, run.go, audit.go
│   ├── agent.go, registry.go, toolshelf.go
│   └── capability.go, template.go, quota.go
├── model/
│   ├── model.go (Board, Card, Gate, Run, Tool, Agent, Workflow, AuditEvent)
│   ├── intent.go, plan.go, pipeline.go
│   ├── tool_version_ext.go, tool_sdk.go
│   └── registry.go
├── store/
│   ├── store.go (interface), postgres.go (implementation)
│   ├── postgres_toolshelf.go, postgres_tool_sdk.go
│   ├── postgres_memory.go, postgres_sessions.go
│   └── postgres_agent_triggers.go
├── agent/
│   ├── types.go, proposal.go, session.go
│   ├── memory.go, policy.go, planner.go
│   └── scorer.go, task_decomposer.go
└── workflow/
    ├── types.go, parser.go, compiler.go, validator.go
    ├── dag.go, typecheck.go, condition.go
    ├── scheduler.go, execution.go, dispatcher.go
    ├── result_handler.go, retry.go
    └── expression.go
```

### Frontend (`airaie_platform/frontend/src/`)
```
├── pages/
│   ├── WorkflowsPage.tsx, WorkflowDetailPage.tsx
│   ├── WorkflowEditorPage.tsx, WorkflowRunsPage.tsx
│   ├── AgentsPage.tsx, AgentStudioPage.tsx, AgentPlaygroundPage.tsx
│   ├── ToolRegistryPage.tsx
│   ├── BoardsPage.tsx, CreateBoardPage.tsx, BoardDetailPage.tsx
│   └── DashboardPage.tsx, ...
├── api/
│   ├── workflows.ts, runs.ts, tools.ts
│   ├── agentPlayground.ts, dashboard.ts
│   └── (missing: boards.ts, agents.ts)
├── hooks/
│   ├── useWorkflow.ts, useRuns.ts, useTools.ts
│   ├── useAgentPlayground.ts, useDashboard.ts
│   └── (missing: useBoards.ts, useAgents.ts)
├── store/
│   ├── workflowStore.ts, runStore.ts, toolRegistryStore.ts
│   ├── agentPlaygroundStore.ts, uiStore.ts
│   └── (missing: boardStore.ts, executionStore.ts)
├── types/
│   ├── workflow.ts, run.ts, tool.ts
│   ├── agent.ts, agentPlayground.ts, dashboard.ts
│   └── (missing: board.ts, gate.ts, intent.ts, plan.ts)
├── components/
│   ├── workflows/ (canvas, nodes/, runs/)
│   ├── agents/ (chat, sessions, inspector)
│   ├── tools/ (registry, cards, filters, properties)
│   └── (missing: boards/, gates/, evidence/, plans/)
└── utils/
    ├── workflowGraph.ts, format.ts, cn.ts
    ├── storage.ts, validation.ts
    └── (missing: sse.ts, eventSource.ts)
```

---

*This document is the authoritative reference for understanding what exists, what's connected, and what's missing across all four domains of the AIRAIE MVP.*
