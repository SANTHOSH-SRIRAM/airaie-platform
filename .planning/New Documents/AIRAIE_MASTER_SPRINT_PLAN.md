    # AIRAIE — MASTER SPRINT PLAN & IMPLEMENTATION ROADMAP

> Complete implementation roadmap converting architecture documents into actionable sprints.
> Current state: Backend ~85%, Frontend ~70%, Studios ~75%
> Date: 2026-04-06

---

## 1. SYSTEM OVERVIEW

### What Airaie Is

Airaie is an AI-powered engineering workflow automation platform with four core layers:

```
LAYER 1: TOOLS — Containerized engineering software with versioned contracts
LAYER 2: WORKFLOWS — DAG orchestration of tools with topological execution
LAYER 3: AGENTS — LLM+algorithmic decision makers that select/execute tools
LAYER 4: BOARDS — Governance containers tracking evidence → gates → release
```

### Final Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND: airaie-platform (:3000) — Unified Single App     │
│  ├── /dashboard          — Platform home                    │
│  ├── /workflows          — Workflow list                    │
│  ├── /workflow-studio    — DAG editor + run monitor         │
│  ├── /agents             — Agent list                       │
│  ├── /agent-studio       — Spec builder + playground        │
│  ├── /boards             — Board list                       │
│  ├── /board-studio       — Governance + evidence + release  │
│  ├── /tools              — Tool registry                    │
│  ├── /artifacts          — Artifact browser                 │
│  └── /approvals          — Cross-cutting approval queue     │
├─────────────────────────────────────────────────────────────┤
│  BACKEND: airaie-kernel                                      │
│  ├── Go Control Plane (:8080) — 100+ REST endpoints         │
│  │   ├── 63 Handlers → 60+ Services → 27 Stores             │
│  │   ├── Workflow Engine (compiler, scheduler, dispatcher)   │
│  │   ├── Agent Runtime (scorer, policy, proposer, memory)    │
│  │   ├── Board System (intent, cards, gates, evidence)       │
│  │   └── ToolShelf (5-stage resolution)                      │
│  ├── Rust Data Plane (runner)                                │
│  │   ├── Docker adapter (primary)                            │
│  │   ├── Python adapter                                      │
│  │   └── NATS consumer → Docker exec → S3 I/O               │
│  └── Infrastructure                                          │
│      ├── PostgreSQL 16 (19 migrations, 30+ tables)           │
│      ├── NATS JetStream (6 namespaced subjects)              │
│      ├── MinIO (S3-compatible artifact storage)              │
│      └── pgvector (agent memory embeddings)                  │
└─────────────────────────────────────────────────────────────┘
```

### Core Execution Flow (End-to-End)

```
1. INTENT: User creates Board → defines IntentSpec (goal + constraints + criteria)
2. RESOLVE: ToolShelf resolves matching tools → Pipeline selected → Plan generated
3. BUILD: ExecutionPlan compiled to Workflow DAG → validated → published
4. EXECUTE: Scheduler dispatches nodes → NATS → Rust Runner → Docker containers
5. COLLECT: Artifacts uploaded to MinIO → CardEvidence created → trust updated
6. GOVERN: Gates auto-evaluate → human approvals → mode escalation
7. RELEASE: All gates pass → artifacts locked → BOM + tolerances → release packet
```

---

## 2. CURRENT STATE ASSESSMENT

### What Already Exists (Starting Point)

| Component | Backend | Frontend | Overall |
|-----------|---------|----------|---------|
| **Tool System** | 95% — Registry, contracts, validation, execution all coded | 60% — Tool list page, basic cards, no detail page | 78% |
| **Workflow System** | 95% — Compiler, validator, scheduler, dispatcher all coded | 65% — Canvas editor exists, runs page functional, some stubs | 80% |
| **Agent System** | 90% — Runtime, scoring, policy, memory, sessions all coded | 70% — Builder, playground, evals pages functional | 80% |
| **Board System** | 85% — Board, card, gate, evidence, intent, plan services coded | 75% — Board studio with cards, gates, evidence panels | 80% |
| **Infrastructure** | 90% — PostgreSQL, NATS, MinIO, Docker compose, migrations | N/A | 90% |
| **Auth/RBAC** | 30% — Stubs exist, JWT/API key handlers coded, not enforced | 20% — Login page exists, no real auth flow | 25% |
| **Testing** | 60% — Backend integration tests, some unit tests | 20% — Playwright in studios only, no main platform E2E | 40% |
| **DevOps** | 40% — Docker Compose only, no K8s, no monitoring | N/A | 40% |

### Critical Blockers (Must Fix First)

| # | Blocker | Impact | Effort |
|---|---------|--------|--------|
| B1 | Plan compiler node ID sanitization (dots in IDs) | Blocks real workflow execution from board cards | S (1-2 days) |
| B2 | Real workflow execution path unreachable (stub fallback) | Blocks end-to-end execution | S (1 day) |
| B3 | Rust runner not fully tested with real tools | Blocks production tool execution | M (3-5 days) |
| B4 | LLM provider not wired in production config | Blocks agent intelligence | S (1-2 days) |
| B5 | Auth/RBAC not enforced | Blocks multi-user scenarios | L (5-7 days) |

---

## 3. DEPENDENCY GRAPH

```
PHASE 0: Fix Blockers (B1-B4)
    │
    ▼
PHASE 1: Tool Execution Golden Path
    │   (register tool → run in container → get artifacts)
    │
    ├──────────────────────┐
    ▼                      ▼
PHASE 2: Workflow Engine   PHASE 3: Agent Intelligence
    │   (compile → schedule │   (score → propose → execute
    │    → execute → stream)│    → learn → replan)
    │                      │
    ├──────────────────────┘
    ▼
PHASE 4: Board Governance
    │   (intent → resolve → plan → execute → evidence → gate → release)
    │
    ▼
PHASE 5: Integration & E2E Flows
    │   (cross-page navigation, board→workflow→agent chains)
    │
    ▼
PHASE 6: Production Readiness
    │   (auth, monitoring, testing, deployment)
    │
    ▼
PHASE 7: Advanced Features
        (composition, marketplace, analytics, multi-agent)
```

### Why This Order

1. **Tools first**: Everything depends on tools executing correctly in containers
2. **Workflow + Agent in parallel**: Both use tools, independent of each other
3. **Boards after both**: Boards orchestrate workflows AND agents
4. **Integration after components**: Can't integrate until parts work individually
5. **Production last**: Polish after functionality is proven

---

## 4. PHASE BREAKDOWN

---

### PHASE 0: UNBLOCK — Fix Critical Blockers

**Objective:** Remove blockers preventing end-to-end execution
**Duration:** 3-5 days
**Why this phase:** Nothing else can be properly tested until these are fixed

**Features:**
- B1: Fix plan compiler node ID sanitization
- B2: Remove stub fallback, enable real workflow execution path
- B3: Verify Rust runner with real Docker containers
- B4: Wire LLM provider configuration (env vars)

**Dependencies:** None (this is the starting point)

---

### PHASE 1: TOOL EXECUTION GOLDEN PATH

**Objective:** Prove that a tool can be registered, executed in Docker, and produce artifacts
**Duration:** 8-12 days (2-3 sprints)
**Why this phase:** Tools are the atomic unit — everything else builds on tool execution

**Features:**
- Tool registration with full ToolContract (7 sections)
- Tool contract validation (12 lint checks)
- Tool version lifecycle (draft → published)
- Docker execution with resource limits and sandbox
- Artifact upload/download via MinIO presigned URLs
- Trust score tracking (Bayesian formula)
- ToolShelf resolution (5-stage algorithm)
- Tool Detail page (frontend)
- Register Tool wizard (frontend)
- Test Run interface (frontend)

**Dependencies:** Phase 0 (blockers fixed)

---

### PHASE 2: WORKFLOW ENGINE COMPLETION

**Objective:** Complete the workflow compilation, execution, and monitoring pipeline
**Duration:** 10-15 days (3-4 sprints)
**Why this phase:** Workflows orchestrate tools into pipelines — the primary execution model

**Features:**
- YAML DSL compilation (5-stage pipeline)
- Workflow validation (7 checks)
- DAG execution with topological scheduling
- Parallel node dispatch via NATS
- Preflight validation (6 universal + domain checks)
- Expression system (dual syntax: DSL + canvas)
- Run lifecycle (6 states including AWAITING_APPROVAL)
- NodeRun lifecycle (8 states with full state machine)
- SSE real-time streaming to frontend
- Error handling (4 modes: abort/skip/continue/error_branch)
- Retry with exponential backoff
- Workflow Editor canvas (XYFlow)
- Run Monitor with live logs
- Artifacts + lineage visualization

**Dependencies:** Phase 1 (tools execute correctly)

---

### PHASE 3: AGENT INTELLIGENCE LAYER

**Objective:** Enable autonomous AI agents that select and execute tools based on goals
**Duration:** 10-15 days (3-4 sprints)
**Why this phase:** Agents add intelligence — deciding WHICH tool to run and WHY

**Features:**
- AgentSpec (7 mandatory + 3 optional sections)
- 5-phase reasoning cycle (THINK-SELECT-VALIDATE-PROPOSE-EXPLAIN)
- 13-step execution pipeline
- 5-dimension hybrid scoring (compat, trust, cost, latency, risk)
- Bayesian trust formula integration
- LLM provider wiring (Anthropic Claude primary)
- Policy engine (4 verdicts: APPROVED, NEEDS_APPROVAL, REJECTED, ESCALATE)
- pgvector memory (episodic + semantic, 4 sub-types)
- Multi-turn sessions
- Replanning on failure
- Agent Builder (frontend)
- Agent Playground with chat (frontend)
- Decision trace visualization (frontend)

**Dependencies:** Phase 1 (agent executes tools via same pipeline)

---

### PHASE 4: BOARD GOVERNANCE LAYER

**Objective:** Build the governance system that tracks validation evidence and enforces gates
**Duration:** 12-18 days (4-5 sprints)
**Why this phase:** Boards tie everything together — intent → execution → evidence → release

**Features:**
- IntentSpec (lifecycle: draft → locked → active → completed)
- IntentType registry (hierarchical: sim/cad/nde/research/ml)
- Card system (6 types, 8-status state machine, dependency DAG)
- Pipeline model (reusable tool chains)
- ExecutionPlan (9-step generation from IntentSpec → Pipeline)
- CardEvidence (criterion evaluation with pass/fail/warning/info)
- Gate system (evidence/review/compliance, 5 statuses)
- Board modes (Explore → Study → Release with agent threshold override)
- Evidence collection (10-step auto-process)
- Readiness calculation (weighted 5-category)
- ToolShelf integration for card execution
- Board mode → agent policy injection
- Board Detail workspace (frontend)
- Card execution lifecycle UI (frontend)
- Gate review and approval UI (frontend)
- Release Packet builder (frontend)

**Dependencies:** Phase 2 (workflows execute) + Phase 3 (agents make decisions)

---

### PHASE 5: INTEGRATION & END-TO-END FLOWS

**Objective:** Wire all components together and prove the complete lifecycle
**Duration:** 8-12 days (2-3 sprints)
**Why this phase:** Individual components work; now verify they work TOGETHER

**Features:**
- Board → Workflow → Tool execution chain
- Board → Agent → Tool execution chain
- Auto-evidence collection from workflow runs
- Board context injection into workflow expressions
- Board context injection into agent prompts
- Cross-page navigation within single app (Board Studio ↔ Workflow Studio ↔ Agent Studio via React Router)
- End-to-end FEA validation scenario (register tools → build workflow → run → evidence → gate → release)
- Dashboard with real data
- Approval queue (cross-cutting)
- Artifact browser (cross-cutting)
- Notification system

**Dependencies:** Phase 4 (all individual components working)

---

### PHASE 6: PRODUCTION READINESS

**Objective:** Make the system deployable, secure, observable, and testable
**Duration:** 10-15 days (3-4 sprints)
**Why this phase:** Can't ship without auth, monitoring, and testing

**Features:**
- JWT authentication (login, refresh, logout)
- API key management
- RBAC (owner/editor/viewer per project)
- E2E test suite (Playwright for frontend, Go integration for backend)
- Prometheus metrics + Grafana dashboards
- Error tracking and alerting
- Rate limiting
- Security hardening (CORS, CSP, input sanitization)
- Kubernetes manifests + Helm charts
- CI/CD pipeline
- Documentation (API docs, user guide)

**Dependencies:** Phase 5 (system works end-to-end)

---

### PHASE 7: ADVANCED FEATURES

**Objective:** Extend the platform with power-user and ecosystem features
**Duration:** Ongoing (per-feature sprints)
**Why this phase:** These add value but aren't required for initial launch

**Features:**
- Board composition (parent-child, max 3 levels)
- Board replay (re-execute from IntentSpec)
- Board fork (branch for experimentation)
- Multi-agent coordination
- Workflow templates marketplace
- Agent template library (16 STEM templates)
- Tool SDK + CLI (airaie tool init/test/build/publish)
- Advanced analytics dashboards
- WebSocket real-time (upgrade from SSE)
- Audit log viewer
- Cost tracking dashboard
- YAML import/export
- Offline mode

**Dependencies:** Phase 6 (production-ready baseline)

---

## 5. SPRINT BREAKDOWN

---

### PHASE 0: UNBLOCK (1 sprint, 3-5 days)

#### Sprint 0.1: Fix Blockers

**Goal:** Remove all critical blockers preventing E2E execution

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Fix node ID sanitization in plan compiler | `internal/service/plan_compiler.go` | Compiler generates node IDs with dots (e.g., `node_000_cad.geometry_check`) | Replace dots with underscores in node ID generation. Regex: `[^a-z0-9_-]` → `_` | S |
| Remove stub fallback in ExecutePlan | `internal/service/plan_generator.go` | Stub fallback bypasses real workflow creation, real code unreachable | Remove early-return stub, test real path: CreateWorkflow → CreateVersion → Compile → Publish → Run | S |
| Verify Rust runner Docker execution | `runner/src/` | Docker adapter exists, Python adapter exists | Run integration test: dispatch job via NATS → verify container executes → verify artifacts in MinIO | M |
| Wire LLM provider env config | `internal/agent/llm.go` + `services/api-gateway/main.go` | LLM provider interface exists, env vars defined but not always loaded | Verify AIRAIE_LLM_PROVIDER, AIRAIE_LLM_API_KEY, AIRAIE_LLM_MODEL loaded at startup. Add fallback to deterministic mode if missing. | S |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| None | — | Phase 0 is backend-only | — |

**APIs:** No new APIs
**NATS:** Verify airaie.jobs.tool.execution → airaie.results.completed flow
**Acceptance Criteria:**
- [ ] Plan compiler generates valid node IDs (no dots)
- [ ] ExecutePlan follows real path: create workflow → version → compile → publish → run
- [ ] Rust runner executes a Docker container and uploads artifacts to MinIO
- [ ] LLM provider loads from env (or falls back to deterministic)

---

### PHASE 1: TOOL EXECUTION GOLDEN PATH (3 sprints)

#### Sprint 1.1: Tool Registration & Contract Validation

**Goal:** Register a tool with a full 7-section ToolContract, validate it with 12 checks

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Validate ToolContract 7 sections on registration | `internal/service/registry.go` | Basic contract validation exists | Add validation for all 7 sections: metadata (ID format, semver, domain_tags), interface (port names unique, types valid), runtime (adapter known, resources bounded), capabilities (intents formatted), governance (sandbox complete). Use `contracts/toolcontract.schema.json` | M |
| Add 12 lint checks | `internal/validator/` | Some validation exists | Implement all 12: metadata_complete, version_semver, inputs_typed, outputs_typed, constraints_valid, schema_valid, adapter_known, resources_bounded, intents_formatted, errors_defined, tests_present, governance_complete | M |
| Add trust_level to tool versions | `internal/model/tool.go` + migration | `trust_level` column exists in DB | Add to Go model, expose in API response, validate on publish (untested → community → tested → verified → certified) | S |
| Add supported_intents to capabilities | `internal/model/tool.go` | Column exists in DB (tool_versions.supported_intents) | Add to ToolContract schema, validate intent_type format (e.g., `sim.fea`), expose in API | S |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Register Tool wizard — Step 1 (Details) | `src/pages/RegisterToolPage.tsx` | Build name, description, category, adapter selector form | M |
| Register Tool wizard — Step 2 (Contract) | Same | Build input/output parameter editor with 3 port types, JSONSchema editor | L |
| Register Tool wizard — Step 3 (Execution) | Same | Docker image, resource limits, sandbox policy form | M |
| Register Tool wizard — Step 4 (Review) | Same | Summary view, JSON preview, publish button | S |

**APIs:**
- `POST /v0/tools` — exists, add full contract validation
- `POST /v0/tools/{id}/versions` — exists, add 12 lint checks
- `POST /v0/tools/{id}/versions/{v}/publish` — exists, add trust_level check
- `POST /v0/validate/contract` — exists, wire to new validator

**Data Models:** Tool, ToolVersion (add trust_level exposure), ToolContract (7-section schema)
**NATS:** None yet
**Acceptance Criteria:**
- [ ] Can register a tool with all 7 ToolContract sections
- [ ] 12 lint checks run on registration and block invalid contracts
- [ ] Trust level tracked per version
- [ ] Supported intents declared and queryable
- [ ] Frontend wizard completes end-to-end

---

#### Sprint 1.2: Tool Execution & Artifact Management

**Goal:** Execute a registered tool in Docker, collect artifacts, track cost

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Job dispatch with presigned URLs | `internal/service/run.go` | Job dispatch exists | Verify presigned URL generation for input artifacts (download) and output artifacts (upload). Test with MinIO. | M |
| Verify sandbox enforcement | `runner/src/adapters/docker.rs` | Docker adapter exists with CPU/memory limits | Verify: --cpus, --memory, --network=none, --pids-limit all applied. Test OOM kill and timeout kill. | M |
| Artifact finalization with SHA-256 | `internal/service/artifact.go` | Upload URL and finalize endpoints exist | Verify SHA-256 hash computed on finalize, stored in artifact record. Test content-hash immutability. | S |
| Cost tracking per run | `internal/service/run.go` | cost_estimate and cost_actual fields exist | Wire actual cost calculation: cpu_cores × duration_sec × rate + memory_gb × duration_sec × rate. Update on run completion. | S |
| Trust score update on completion | `internal/service/registry.go` or metrics | success_rate field exists but always 1.0 | Implement Bayesian update: new_rate = (old_rate × run_count + outcome) / (run_count + 1). Update on each run completion. | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Tool Detail page (full page) | `src/pages/ToolDetailPage.tsx` | Build: overview, version history, contract viewer (inputs/outputs), execution config, usage stats, test run panel | L |
| Tool test run interface | Part of ToolDetailPage | Input form generated from contract, run button, output preview | M |
| Tools List — table view with quick inspector | `src/pages/ToolsPage.tsx` | Exists as card view | Add table view with sortable columns, right-side quick inspector panel | M |

**APIs:**
- `POST /v0/runs` — exists, verify tool run dispatch
- `GET /v0/runs/{id}` — exists, add cost_actual in response
- `GET /v0/artifacts/{id}` — exists, verify SHA-256 in response
- `GET /v0/artifacts/{id}/download-url` — exists, test presigned URL

**Data Models:** Run (cost tracking), Artifact (SHA-256), ToolVersion (trust update)
**NATS:** airaie.jobs.tool.execution → airaie.results.completed
**Acceptance Criteria:**
- [ ] Can execute a tool in Docker via NATS dispatch
- [ ] Artifacts uploaded to MinIO with SHA-256 hash
- [ ] Cost tracked per run (estimated + actual)
- [ ] Trust score updates with Bayesian formula after each run
- [ ] Frontend shows tool detail with contract, versions, and test run

---

#### Sprint 1.3: ToolShelf Resolution Engine

**Goal:** Implement the 5-stage tool resolution algorithm

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| ToolShelf DISCOVER stage | `internal/service/toolshelf.go` | Basic resolution exists | Implement GIN index query on tool_versions.supported_intents JSONB. Filter by intent_type match. | M |
| ToolShelf FILTER stage | Same | Some filtering exists | Add: trust_level filter, adapter compatibility, version status (published only), tenant access check, quota availability | M |
| ToolShelf RANK stage | Same | Basic scoring exists | Implement composite score: trust_weight(100/70/30/10/0) + success_rate×80 + intent_confidence×40 + preference(+50) - cost×0.1 - time×0.05 | M |
| ToolShelf EXPLAIN stage | Same | Explain endpoint exists | Return attribution breakdown: for each tool, show which factors contributed to score. For filtered-out tools, explain WHY with suggested actions. | M |
| ToolShelf ASSEMBLE stage | Same | Return list exists | Return ranked list with: recommended[], alternatives[], unavailable_with_reasons[] | S |
| 3 resolution strategies | Same | Weighted exists | Add Priority (highest compat, tiebreak trust) and CostOptimized (0.2 compat + 0.2 trust + 0.6 cost) | S |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| ToolShelf panel component | `src/components/toolshelf/ToolShelfPanel.tsx` | Build: recommended tools with score breakdown, alternatives, unavailable with reasons and action buttons | L |

**APIs:**
- `POST /v0/toolshelf/resolve` — exists, wire 5-stage algorithm
- `POST /v0/toolshelf/resolve/v2` — exists, wire pipeline-aware resolution
- `GET /v0/toolshelf/resolve/{id}/explain` — exists, wire explanation

**Acceptance Criteria:**
- [ ] ToolShelf resolves tools by intent_type with 5-stage pipeline
- [ ] 3 scoring strategies produce different rankings
- [ ] Explanation shows per-factor attribution
- [ ] Unavailable tools show reason and suggested action
- [ ] Frontend ToolShelf panel renders ranked recommendations

---

### PHASE 2: WORKFLOW ENGINE (4 sprints)

#### Sprint 2.1: Workflow Compilation & Validation

**Goal:** Complete the 5-stage compiler and 7-check validator

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify 5-stage compiler | `internal/workflow/compiler.go` | Full compiler exists | Integration test: YAML input → Parser → Resolver → DAG Builder → Type Checker → AST. Verify cycle detection, topological sort, execution levels. | M |
| Verify 7-check validator | `internal/workflow/validator.go` | Validator exists | Integration test all 7 checks: structure, tool refs, variables, DAG, tool availability, conditions, lint warnings. | M |
| Dual expression syntax | `internal/workflow/` | $inputs/$nodes format exists | Add translation from canvas format ($('Name').json.field) to DSL format ($nodes.X.outputs.Y). Both syntaxes should work. | M |
| Preflight validation (6+domain) | `internal/service/preflight.go` | Preflight service exists | Verify all 6 universal checks: schema, artifact pinning, unit consistency, quota, governance, tool versions. Add domain validator hook. | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Canvas → YAML DSL serialization | `apps/workflow-studio/src/utils/serializeCanvasToDsl.ts` | Exists | Verify: api_version, node types, connection mapping, expression translation. Fix any mismatches with compiler expectations. | M |
| Compile/Publish button wiring | `apps/workflow-studio/src/pages/BuilderPage.tsx` | Buttons exist, some stubs | Wire compile → POST /v0/workflows/compile, publish → POST /v0/workflows/{id}/versions/{v}/publish. Show errors in diagnostics panel. | M |
| Validation error display | `apps/workflow-studio/src/components/builder/Diagnostics.tsx` | Component exists | Wire to compiler response: show errors (block publish), warnings (allow publish), per-node highlighting. | S |

**APIs:** All exist, verify integration
**Acceptance Criteria:**
- [ ] YAML DSL compiles through all 5 stages without errors
- [ ] 7 validator checks catch invalid workflows
- [ ] Both expression syntaxes work
- [ ] Preflight catches missing artifacts, quota issues, tool version problems
- [ ] Frontend compile/publish buttons work end-to-end

---

#### Sprint 2.2: Workflow Execution & Scheduling

**Goal:** Execute workflows with parallel dispatch, dependency tracking, and state management

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify topological scheduler | `internal/workflow/scheduler.go` | Scheduler exists | Integration test: multi-node DAG → verify parallel dispatch of independent nodes → verify sequential dispatch of dependent nodes | M |
| Verify NATS dispatch/consume | `internal/service/run.go` | Dispatch and result consumer exist | E2E test: dispatch 3 nodes → verify NATS messages → verify result consumption → verify status updates | M |
| NodeRun 8-state machine | `internal/model/run.go` | NodeRun model exists | Verify all 8 transitions: QUEUED→RUNNING→SUCCEEDED/FAILED, RETRYING between retries, BLOCKED for gates, SKIPPED for branches, CANCELED on user cancel | M |
| Retry with exponential backoff | `internal/workflow/scheduler.go` | Retry logic exists | Test: node fails → wait_between_sec × 2^attempt → retry up to max_retries → FAILED if exhausted | S |
| Condition/Switch evaluation | `internal/workflow/` | Condition evaluator exists | Test: IF node with expression → correct branch selected → other branch nodes SKIPPED | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Run Monitor — live execution badges | `apps/workflow-studio/src/pages/RunsPage.tsx` | Runs page exists | Wire SSE stream: node_started → spinner, node_completed → green check, node_failed → red X. Poll fallback at 3s. | M |
| Run Monitor — log viewer | `apps/workflow-studio/src/components/runs/LogViewer.tsx` | Component exists | Wire to GET /v0/runs/{id}/logs. Auto-scroll, node filtering, copy/download buttons. | M |
| Run Monitor — artifact browser | `apps/workflow-studio/src/components/runs/ArtifactsTab.tsx` | Component exists | Wire to GET /v0/runs/{id}/artifacts. Show name, type, size, SHA-256, download link. | S |

**APIs:** All exist, verify real execution
**NATS:** airaie.jobs.tool.execution, airaie.results.completed, airaie.events.{runId}
**Acceptance Criteria:**
- [ ] Multi-node workflow executes with correct topological order
- [ ] Parallel nodes dispatch simultaneously
- [ ] Retry works with exponential backoff
- [ ] Conditions route to correct branches
- [ ] Frontend shows live execution with status badges and logs

---

#### Sprint 2.3: Expression System & Data Flow

**Goal:** Ensure data flows correctly between nodes via expressions

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Expression resolution at dispatch | `internal/workflow/scheduler.go` | Expression evaluator exists | Test: {{ $('Node').json.field }} resolves from runData at dispatch time. Test nested access, artifact refs, trigger data. | M |
| Board context expressions | Same | Not yet wired | Add: {{ $board.meta.material }}, {{ $board.artifacts.geometry }}, {{ $board.mode }} resolution when run has board_id | M |
| Gate/cost expressions | Same | Partial | Add: {{ $gate('Name').status }}, {{ $gate('Name').passed }}, {{ $cost.total }}, {{ $cost.remaining }} | S |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Expression editor (CodeMirror) | `apps/workflow-studio/src/components/ndv/ExpressionEditor.tsx` | Component missing | Build CodeMirror 6 editor with {{ }} syntax highlighting, autocomplete for $('NodeName').json.*, variable reference popup | L |
| Node Inspector — input/output panels | `apps/workflow-studio/src/components/ndv/NodeInspector.tsx` | Basic exists | Add: Input Panel (parent node data), Output Panel (execution output), expression toggle per parameter | L |
| Parameter form from ToolContract | `apps/workflow-studio/src/components/ndv/ParameterForm.tsx` | Missing | Auto-generate form from ToolContract: artifact selector, number input, dropdown for enums, JSON editor for objects | L |

**APIs:** No new APIs, expression resolution is internal
**Acceptance Criteria:**
- [ ] Expressions resolve correctly at dispatch time
- [ ] Board context accessible in expressions when run is board-linked
- [ ] Expression editor provides autocomplete and syntax highlighting
- [ ] Parameter forms auto-generated from ToolContract

---

#### Sprint 2.4: Workflow Versioning & Triggers

**Goal:** Complete workflow version management and trigger system

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify version lifecycle | `internal/service/workflow.go` | Version CRUD exists | Test: draft → compiled → published. Verify published is immutable. Multiple published versions allowed. | S |
| Trigger CRUD | `internal/service/trigger.go` | Trigger service exists | Test: create webhook/cron/event triggers. Verify webhook URL generation, cron scheduling, NATS event subscription. | M |
| Trigger execution | Same | Not fully wired | Wire: webhook request → create Run → schedule. Cron tick → create Run. NATS event → filter → create Run. | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Version history page | `apps/workflow-studio/src/pages/VersionsPage.tsx` | Page exists | Wire to real data: version list, diff viewer, publish/rollback buttons | M |
| Trigger configuration | `apps/workflow-studio/src/pages/TriggersPage.tsx` | Page exists | Wire to real data: webhook URL display/copy, cron editor, event subscription config | M |

**APIs:** All exist
**Acceptance Criteria:**
- [ ] Workflow versions follow draft → compiled → published lifecycle
- [ ] Webhook triggers fire workflow runs on HTTP POST
- [ ] Cron triggers fire on schedule
- [ ] Frontend shows version history and trigger configuration

---

### PHASE 3: AGENT INTELLIGENCE (4 sprints)

#### Sprint 3.1: Agent Scoring & Tool Selection

**Goal:** Implement 5-dimension scoring with ToolShelf integration

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify 5-dimension scoring | `internal/service/runtime.go` | Scorer exists with some dimensions | Verify all 5: Compatibility (0.4), Trust (0.3), Cost (0.2), Latency (0.1), Risk Penalty (-0.5 to 0). Test with mock tools. | M |
| ToolShelf integration in agent | Same (ToolSearcher) | Basic search exists | Wire ToolSearcher to use ToolShelf 5-stage resolution (from Sprint 1.3). Agent candidates come from ToolShelf, not direct DB query. | M |
| LLM scoring blend | Same | LLM interface exists | Wire real LLM call for tool scoring. Send: goal + context + tool contracts. Receive: per-tool relevance score 0-1. Blend: (1-w)×algo + w×llm | M |
| Deterministic fallback | Same | Partial | When LLM unavailable: use algorithmic-only scoring (llm_weight=0). ProposalGenerator mode="deterministic". | S |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Agent Builder — scoring config | `apps/agent-studio/src/components/builder/` | Exists | Wire: strategy selector (weighted/priority/cost_optimized), weight sliders for 5 dimensions, min_threshold input | M |
| Score visualization in playground | `apps/agent-studio/src/components/playground/` | Exists | Show: per-tool score breakdown (5 bars), LLM vs algorithmic scores, final blended score | M |

**Acceptance Criteria:**
- [ ] 5-dimension scoring produces correct rankings
- [ ] ToolShelf provides candidates to agent
- [ ] LLM blend works when provider configured
- [ ] Deterministic fallback works when LLM unavailable

---

#### Sprint 3.2: Proposal Generation & Policy Engine

**Goal:** Generate ActionProposals and enforce governance policies

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify ProposalGenerator | `internal/service/runtime.go` | Proposal generation exists | Test: goal + context + scored tools → ActionProposal with selected_tool, confidence, reasoning, inputs, alternatives | M |
| Verify PolicyEnforcer (4 verdicts) | Same | Policy engine exists | Test all 4 verdicts: APPROVED (conf≥threshold), NEEDS_APPROVAL (below threshold), REJECTED (conf<0.5), ESCALATE (cost>limit). Test enforcement order. | M |
| Board mode override | Same | Not wired | Add: when agent runs within board context, apply board mode threshold: Explore=0.5, Study=0.75, Release=0.90. Effective = max(agent_threshold, board_threshold). | M |
| Approval queue | `internal/service/approval.go` | Approval service exists | Test: NEEDS_APPROVAL proposal → created in approval queue → user approves/rejects → agent resumes/stops | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Proposal viewer in playground | `apps/agent-studio/src/components/playground/` | ProposalViewer exists | Wire real data: confidence badge, reasoning, proposed inputs, alternatives, policy verdict | M |
| Approval queue page | `apps/agent-studio/src/pages/ApprovalsPage.tsx` | Page exists | Wire to GET /v0/approvals. Show pending proposals with approve/reject buttons. | M |

**Acceptance Criteria:**
- [ ] Proposals generated with confidence scores and reasoning
- [ ] Policy engine returns correct verdicts
- [ ] Board mode overrides tighten thresholds (never loosen)
- [ ] Approval queue shows pending proposals

---

#### Sprint 3.3: Agent Memory (pgvector)

**Goal:** Implement dual-layer memory with embedding-based retrieval

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify pgvector setup | `internal/service/memory.go` | Memory store exists, pgvector extension | Verify: vector(1536) column, IVFFlat index, embedding generation (via LLM or OpenAI), cosine similarity search | M |
| Episodic memory (TTL) | Same | Basic memory exists | Add: expires_at field on episodic memories, background cleanup goroutine (5-min ticker), auto-creation after each run | M |
| Semantic memory (persistent) | Same | Partial | Add: pattern extraction from 3+ episodic entries, semantic memories have no TTL, higher relevance weighting | M |
| Memory categorization | Same | Memory types exist | Verify 4 types: fact, preference, lesson, error_pattern. Each maps to episodic or semantic storage. | S |
| Memory retrieval injection | `internal/service/runtime.go` | Partial | On each decision step: embed current context → query top-k similar memories → inject into LLM prompt. Board-scoped memories prioritized. | M |
| Auto-learning from runs | `internal/service/run.go` | LearnFromRun exists | Verify: success → fact memory, failure → error_pattern, retry → lesson. Async with panic recovery. | S |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Memory browser page | `apps/agent-studio/src/pages/MemoryPage.tsx` | Page exists | Wire to real data: list memories by type, search, add/delete manually, show source_run_id | M |

**Acceptance Criteria:**
- [ ] pgvector stores 1536-dim embeddings
- [ ] Top-k similarity search returns relevant memories
- [ ] Episodic memories expire after TTL
- [ ] Semantic memories persist permanently
- [ ] Auto-learning creates memories after each run

---

#### Sprint 3.4: Multi-Turn Sessions & Replanning

**Goal:** Support stateful conversations and failure recovery

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify session management | `internal/service/session.go` | Session service exists | Test: create session → send messages → maintain history → context accumulation → session expiry (1h TTL) | M |
| Multi-turn context | Same | ProcessMessage exists | Test: message 1 → agent responds → message 2 → agent has context from message 1 → iterative refinement | M |
| Replanning on failure | `internal/service/runtime.go` | AttemptReplan exists | Test: tool fails → GenerateWithFailureContext → exclude failed tool → regenerate proposal with remaining budget → execute alternate | M |
| Decision trace | `internal/service/run.go` | Trace endpoint exists | Test: GET /v0/runs/{id}/trace returns full decision chain: context → search → score → propose → policy → execute → evaluate | S |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Session manager in playground | `apps/agent-studio/src/components/playground/SessionList.tsx` | Component exists | Wire to real data: session list, active session indicator, message history | M |
| Decision trace timeline | `apps/agent-studio/src/components/playground/DecisionTraceTimeline.tsx` | Component exists | Wire to real data: step-by-step visualization with status dots and timestamps | M |

**Acceptance Criteria:**
- [ ] Multi-turn sessions maintain context across messages
- [ ] Failed tools are excluded from replanning
- [ ] Decision trace shows complete reasoning chain
- [ ] Sessions expire after 1 hour

---

### PHASE 4: BOARD GOVERNANCE (5 sprints)

#### Sprint 4.1: IntentSpec & IntentType Registry

**Goal:** Implement the intent system that drives board card execution

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify IntentSpec CRUD | `internal/service/intent.go` | Intent service exists | Test: create intent → update → lock → activate → complete/fail. Verify immutability after lock. | M |
| Verify IntentType registry | `internal/service/` | Intent type definitions exist | Test: hierarchical types (sim.fea, cad.dfm, nde.srb), input requirements, acceptance criteria templates, default pipelines | M |
| AcceptanceCriterion evaluation | Same | Criteria model exists | Test: evaluate metric against criterion (lt, lte, gt, gte, eq, neq, in, between). Return pass/fail with margin. | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| IntentSpec editor in card detail | Board Studio components | Exists (partial) | Wire: goal textarea, inputs picker, constraints editor, acceptance criteria table (metric, operator, threshold, unit) | L |
| IntentType selector | Board Studio components | Exists | Wire to backend: hierarchical intent type browser, show required inputs and available pipelines per type | M |

**Acceptance Criteria:**
- [ ] IntentSpecs created with goal, inputs, constraints, acceptance criteria
- [ ] IntentSpec lifecycle: draft → locked (immutable) → active → completed
- [ ] IntentTypes queryable by hierarchy (sim/*, cad/*, etc.)
- [ ] Criteria evaluate correctly for all operators

---

#### Sprint 4.2: Cards, Dependencies & State Machine

**Goal:** Implement the rich card system with 6 types, 8 statuses, and dependency DAG

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify card 8-state machine | `internal/service/card.go` | Card service exists with transitions | Test all transitions: draft→ready, ready→queued, queued→running, running→completed/failed, failed→ready(retry). Verify invalid transitions rejected. | M |
| Card dependency DAG | Same | Dependencies exist with cycle detection | Test: add dependencies → verify topological sort → verify blocked status when dependency incomplete → unblock when dependency completes | M |
| 6 card types | Same | Card types exist | Test: analysis, comparison, sweep, agent, gate, milestone. Each type has different behavior (agent cards use agent execution, gate cards evaluate gate requirements). | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Card grid with status badges | Board Studio components | Exists | Wire real data: 6 card type icons, 8 status colors, KPI summary, dependency arrows in DAG view | M |
| Card detail page | Board Studio pages | Exists (partial) | Wire: IntentSpec display, KPIs with pass/fail, linked runs, evidence table, execution state | M |

**Acceptance Criteria:**
- [ ] 6 card types render with correct icons and behavior
- [ ] 8-status state machine enforced (invalid transitions rejected)
- [ ] Dependencies block downstream cards until complete
- [ ] DAG view shows dependency arrows

---

#### Sprint 4.3: Plan Generation & Execution

**Goal:** Generate ExecutionPlans from IntentSpec + Pipeline and execute them

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify 9-step plan generation | `internal/service/plan_generator.go` | Plan generator exists | Test all 9 steps: validate card → load IntentSpec → select pipeline → instantiate nodes → bind inputs → apply overrides → insert validators → insert evidence → insert governance | L |
| Plan compilation to workflow | `internal/service/plan_compiler.go` | Compiler exists (with node ID fix from Phase 0) | Test: PlanNodes → WorkflowDSL YAML → compile → publish → run. Verify bindings map IntentSpec inputs to tool ports. | M |
| Plan execution chain | `internal/service/plan_generator.go` | ExecutePlan exists (fixed in Phase 0) | Test: ExecutePlan → CreateWorkflow → CreateVersion → Compile → Publish → StartRun → EvidenceCollector | M |
| Plan preflight | `internal/service/preflight.go` | Preflight exists | Test: validate plan before execution — schema, artifacts, units, quota, governance, tool versions. Show blockers/warnings. | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Plan viewer in card detail | Board Studio components | PlanExecutionPanel exists | Wire: plan DAG visualization with node roles (solve/validate/evidence/approval), status badges, parameter editing | L |
| Preflight report display | Board Studio components | PreflightResults exists | Wire: blocker/warning/pass display, auto-fix buttons where applicable | M |
| Plan execution progress | Board Studio components | ExecutionProgress exists | Wire: per-node progress, overall percentage, ETA, log streaming | M |

**Acceptance Criteria:**
- [ ] 9-step plan generation produces valid ExecutionPlan
- [ ] Plan compiles to executable workflow
- [ ] Preflight catches blockers before execution
- [ ] Plan execution produces artifacts and evidence

---

#### Sprint 4.4: Evidence Collection & Gates

**Goal:** Auto-collect evidence from runs and evaluate governance gates

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Verify 10-step evidence collection | `internal/service/evidence_collector.go` | Evidence collector exists | Test all 10 steps: run complete → queue handler → load evidence nodes → extract metrics → create CardEvidence → update trust → check borderline → escalate if needed → emit audit → invalidate cache | L |
| CardEvidence evaluation | Same | CardEvidence model exists | Test: metric_value vs threshold with operator → evaluation (pass/fail/warning/info) → passed boolean | M |
| Gate auto-evaluation | `internal/service/gate.go` | Gate service exists | Test: evidence gate → check all requirements (run_succeeded, artifact_exists, metric_threshold, role_signed) → update gate status | M |
| Gate manual approval | Same | Approval handling exists | Test: review gate → user approves → gate passes. Compliance gate → all sign-offs collected → passes. | M |
| Board mode enforcement | `internal/service/board_mode.go` | Mode service exists | Test: Explore (gates advisory), Study (gates enforced), Release (all gates must pass). Verify one-way escalation. | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Evidence panel in board detail | Board Studio components | Evidence panel exists | Wire: CardEvidence table with metric, threshold, evaluation (pass/fail with colors), linked artifact/run | M |
| Gate review panel | Board Studio components | Gate components exist | Wire: requirement checklist with pass/fail indicators, approve/reject/waive buttons, approval history | M |
| Board readiness gauge | Board Studio components | Readiness display exists | Wire: weighted 5-category calculation (design 0.3, validation 0.3, compliance 0.15, manufacturing 0.1, approvals 0.15) | S |

**Acceptance Criteria:**
- [ ] Evidence auto-collected when workflow runs complete
- [ ] CardEvidence evaluates correctly against acceptance criteria
- [ ] Gates auto-evaluate for evidence gates
- [ ] Manual approval works for review gates
- [ ] Board readiness uses weighted 5-category formula
- [ ] Mode escalation is one-way and enforced

---

#### Sprint 4.5: Release Packet & Board Context

**Goal:** Build release packets and provide board context to workflows/agents

**Backend Tasks:**
| Task | File | What Exists | What to Do | Complexity |
|------|------|-------------|------------|------------|
| Release packet generation | `internal/service/release.go` | Release service exists (partial) | Build: lock artifacts (frozen snapshots), generate BOM from board metadata, compile proof bundle (gate evaluations), collect sign-offs, generate ZIP | L |
| Board context in expressions | `internal/workflow/scheduler.go` | Not yet wired | Wire: when run has board_id, resolve {{ $board.meta.* }} and {{ $board.artifacts.* }} from board API | M |
| Board context in agent prompt | `internal/service/runtime.go` | Partial | Wire: inject board_name, goal, mode, completed_cards, pending_gates, recent_evidence into agent context when running within board | M |
| Scheduler completion → evidence | `internal/workflow/scheduler.go` | onRunCompleted callback exists | Verify: finalizeWorkflow → onRunCompleted → EvidenceCollectorService.OnRunCompleted → auto-evidence chain | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Release Packet builder page | Board Studio pages | ReleasePacketPage exists | Wire: artifact locking, BOM viewer, tolerance attachment, proof bundle, sign-off records, export button | L |
| Board mode escalation UI | Board Studio components | Mode dropdown exists | Wire: escalation with validation (Study requires cards+gates, Release requires all gates passed), confirmation dialog | M |

**Acceptance Criteria:**
- [ ] Release packet generated as ZIP with all components
- [ ] Artifacts locked (frozen snapshots) in release mode
- [ ] Board context available in workflow expressions
- [ ] Board context injected into agent prompts
- [ ] Evidence auto-collected from workflow completions

---

### PHASE 5: INTEGRATION & E2E (3 sprints)

#### Sprint 5.1: Cross-Component Integration

**Goal:** Wire Board → Workflow → Agent → Tool execution chains

**Backend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| E2E test: Board card → Plan → Workflow → Tool → Evidence → Gate | Multiple | Write integration test: create board → add card with IntentSpec → generate plan → compile to workflow → execute → collect evidence → evaluate gate → verify pass | L |
| E2E test: Agent within board context | Multiple | Write: create board → link agent → run agent in board context → verify board mode override → verify evidence attached | L |
| Board → Workflow Studio navigation | Frontend | Wire: click workflow in board → navigate to `/workflow-studio/:id?from=board&boardId=X` within same app (React Router) | M |
| Board → Agent Studio navigation | Frontend | Wire: click agent in board → navigate to `/agent-studio/:id?from=board&boardId=X` within same app | M |

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Dashboard with real data | `src/pages/DashboardPage.tsx` | Exists with mock data | Wire to real APIs: recent workflows, active runs, agent decisions, board readiness, system stats | M |
| Approval Queue page (cross-cutting) | `src/pages/ApprovalsPage.tsx` | Missing | Build: unified list of all pending approvals (gate approvals + agent escalations), approve/reject/waive actions | L |
| Artifact Browser page | `src/pages/ArtifactsPage.tsx` | Missing | Build: browse all artifacts, filter by type/workflow/run, lineage graph, download | L |

---

#### Sprint 5.2: Cross-Page Studio Navigation

**Goal:** Seamless navigation between all studio pages within the single app with context preservation

**Backend Tasks:** None (frontend-only sprint)

**Frontend Tasks:**
| Task | File | What to Do | Complexity |
|------|------|------------|------------|
| Route-based context passing | All studio pages | Standardize: `/workflow-studio/:id?from=board&boardId=X&cardId=Y` for context passing via React Router query params (no iframes, no separate ports) | M |
| Back-navigation breadcrumb | All studio pages | When navigating from another studio page, show "Back to [Board Name]" breadcrumb using React Router state/params | S |
| Unified routing configuration | `src/App.tsx` | All studios are routes within the same React app. No separate ports. No environment URL config needed. Single React Router with nested layouts. | S |
| Notification system | Platform | Build: toast notifications for run completions, gate approvals needed, agent escalations | M |

---

#### Sprint 5.3: End-to-End Validation

**Goal:** Run the complete FEA validation scenario end-to-end

**Tasks:**
| Task | What to Do | Complexity |
|------|------------|------------|
| Register 3 mock tools | mesh_generator, fea_solver, result_analyzer with full ToolContracts | M |
| Build FEA workflow | Webhook → Mesh Gen → FEA Solver → IF Condition → Result Analyzer / AI Optimizer | M |
| Create validation board | Structural Validation Study with IntentSpec, 4 cards, 3 gates | M |
| Execute end-to-end | Trigger workflow → tools run → artifacts produced → evidence collected → gates evaluated → approve → escalate to release → build release packet | L |
| Verify all components | Check: ToolShelf resolved correctly, expressions resolved, agent scored correctly, evidence matches criteria, gates passed, release packet valid | L |

---

### PHASE 6: PRODUCTION READINESS (3 sprints)

#### Sprint 6.1: Authentication & Authorization

**Backend Tasks:**
| Task | What Exists | What to Do | Complexity |
|------|-------------|------------|------------|
| JWT authentication | Stubs exist | Enforce JWT on all endpoints, token refresh, logout | M |
| API key management | Handler exists | CRUD for API keys, scope enforcement, rate limiting | M |
| RBAC (project-level) | Roles planned | Implement: owner (full), editor (read+write), viewer (read) per project | L |
| Gate-specific roles | Role concept exists | Add: lead_engineer, quality_manager, project_lead roles for gate approvals | M |

#### Sprint 6.2: Testing & Monitoring

**Tasks:**
| Task | What to Do | Complexity |
|------|------------|------------|
| E2E test suite (Playwright) | Single app covering all studio pages (/workflow-studio, /agent-studio, /board-studio) | L |
| Backend integration tests | Cover all critical paths (tool exec, workflow run, agent decision, evidence collection) | L |
| Prometheus metrics | 10+ metrics: run duration, tool success rate, agent confidence, gate pass rate | M |
| Grafana dashboards | 4 dashboards: system overview, workflow runs, agent decisions, board readiness | M |
| Error alerting | PagerDuty/Slack integration for failed runs, system errors | S |

#### Sprint 6.3: Deployment & Security

**Tasks:**
| Task | What to Do | Complexity |
|------|------------|------------|
| Kubernetes manifests | Deploy: API gateway, Rust runner, PostgreSQL, NATS, MinIO | L |
| Helm charts | Parameterized deployment | M |
| CI/CD pipeline | GitHub Actions: test → build → push → deploy | M |
| Security hardening | CORS, CSP, input sanitization, prompt injection defense (14 regex), AES-256-GCM for credentials | M |
| API documentation | OpenAPI spec + developer guide | M |

---

### PHASE 7: ADVANCED FEATURES (Per-feature sprints)

| Feature | Sprint | Complexity | Dependencies |
|---------|--------|------------|-------------|
| Board composition (parent-child, max 3 levels) | 7.1 | M | Phase 4 |
| Board replay from IntentSpec | 7.2 | M | Phase 4 |
| Board fork for experimentation | 7.3 | M | Phase 4 |
| Multi-agent coordination | 7.4 | L | Phase 3 |
| Agent template library (16 STEM) | 7.5 | M | Phase 3 |
| Tool SDK + CLI (init/test/build/publish) | 7.6 | L | Phase 1 |
| Workflow templates marketplace | 7.7 | M | Phase 2 |
| Advanced analytics dashboards | 7.8 | M | Phase 6 |
| WebSocket upgrade from SSE | 7.9 | M | Phase 5 |
| Audit log viewer | 7.10 | S | Phase 6 |
| Cost tracking dashboard | 7.11 | M | Phase 1 |

---

## 6. TIMELINE ESTIMATE

| Phase | Duration | Sprints | Cumulative |
|-------|----------|---------|-----------|
| Phase 0: Unblock | 3-5 days | 1 | Week 1 |
| Phase 1: Tools | 8-12 days | 3 | Week 2-3 |
| Phase 2: Workflows | 10-15 days | 4 | Week 4-6 |
| Phase 3: Agents | 10-15 days | 4 | Week 4-6 (parallel with Phase 2) |
| Phase 4: Boards | 12-18 days | 5 | Week 7-9 |
| Phase 5: Integration | 8-12 days | 3 | Week 10-11 |
| Phase 6: Production | 10-15 days | 3 | Week 12-14 |
| Phase 7: Advanced | Ongoing | Per-feature | Week 15+ |

**Total to MVP (Phases 0-5):** ~10-12 weeks
**Total to Production (Phases 0-6):** ~14-16 weeks
**Note:** Phases 2 and 3 can run in parallel (different teams/engineers)

---

## 7. RISK REGISTER

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM provider API changes | Agent scoring breaks | Abstraction layer (internal/agent/llm.go) already exists |
| Rust runner Docker execution issues | All tool execution fails | Docker adapter tested in Phase 0, Python adapter as fallback |
| pgvector performance at scale | Agent memory retrieval slow | IVFFlat index, TTL cleanup, top-k limit (5) |
| NATS JetStream message loss | Runs stuck in QUEUED | At-least-once delivery, DLQ handler exists |
| Plan compiler YAML format mismatch | Board cards can't execute | Fixed in Phase 0, regression test in Phase 4 |
| State sync across studio pages | Data inconsistency | Single React app = shared Zustand/React Query state. No cross-port sync needed. Route params for context. |

---

*Generated: 2026-04-06*
*Based on: 5 architecture docs + codebase analysis of airaie-kernel (85% complete) + airaie-platform unified app (75% complete — all studios merged into single React app at :3000)*