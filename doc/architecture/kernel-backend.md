# AIRAIE Kernel Backend Reference

> Go control plane + Rust data plane. This document maps every endpoint, model, service, store, state machine, and algorithm in the kernel.
> **Authored:** 2026-04-05 · **Conceptually re-anchored:** 2026-04-26

---

> **Scope.** Implementation reference for the kernel (API gateway + runner). For the *concept* the kernel implements — the chain from IntentSpec to Release Packet, plus governance — read:
>
> - [`../concepts/01-CORE-MODEL.md`](../concepts/01-CORE-MODEL.md) (every primary noun the kernel persists)
> - [`../concepts/02-GOVERNANCE-AND-MODES.md`](../concepts/02-GOVERNANCE-AND-MODES.md) (auth, RBAC, audit trail, Trust formula)
> - [`../protocol/ATP-SPEC.md`](../protocol/ATP-SPEC.md) (the Tool protocol the runner enforces)
>
> Sections below remain current for endpoint URLs, model fields, service boundaries, and the state machines.

---

## 1. Architecture

```
┌──────────────────────────────────────────────────┐
│              GO CONTROL PLANE (:8080)              │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Handlers │→ │ Services │→ │    Stores     │   │
│  │ (HTTP)   │  │ (Logic)  │  │ (PostgreSQL)  │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
│       │              │              │              │
│       │         ┌────┴────┐         │              │
│       │         │  NATS   │         │              │
│       │         │Dispatch │         │              │
│       │         └────┬────┘         │              │
└───────│──────────────│──────────────│──────────────┘
        │              │              │
        │SSE           │Jobs          │SQL
        ▼              ▼              ▼
   Frontend       Rust Workers    PostgreSQL 16
   (React)        (Docker exec)   + MinIO (S3)
```

### Package Organization

```
internal/
├── handler/          # 213 HTTP handler methods (request → response)
├── service/          # 30 business logic services
├── store/            # PostgreSQL persistence (per-entity stores)
├── model/            # Go structs (domain entities)
├── validator/        # Input validation
├── agent/            # Agent runtime & execution
├── auth/             # JWT, API keys, RBAC (planned)
├── config/           # Configuration loading
├── crypto/           # AES encryption
├── worker/           # NATS worker process
└── workflow/         # Workflow DSL & compilation
```

---

## 2. Domain Models (Go Structs)

### Board

```go
Board {
  ID            string      `json:"id"`            // "board_..."
  ProjectID     string      `json:"project_id"`
  Type          string      `json:"type"`           // validated by TypeRegistry
  VerticalID    *string     `json:"vertical_id"`
  Name          string      `json:"name"`           // unique per project/type (non-archived)
  Mode          string      `json:"mode"`           // "explore" | "study" | "release"
  ParentBoardID *string     `json:"parent_board_id"` // sub-board hierarchy (max depth 3)
  Status        string      `json:"status"`         // "DRAFT" | "ARCHIVED"
  Owner         string      `json:"owner"`
  Metadata      JSONB       `json:"metadata"`
  ArchivedAt    *time.Time  `json:"archived_at"`
  CreatedAt     time.Time   `json:"created_at"`
  UpdatedAt     time.Time   `json:"updated_at"`
}
```

### Card

```go
Card {
  ID            string         `json:"id"`            // "card_..."
  BoardID       string         `json:"board_id"`
  IntentSpecID  *string        `json:"intent_spec_id"`
  CardType      string         `json:"card_type"`     // "analysis"|"comparison"|"sweep"|"agent"|"gate"|"milestone"
  IntentType    *string        `json:"intent_type"`   // "sim.fea", "opt.topology", etc.
  AgentID       *string        `json:"agent_id"`      // for "agent" card type
  AgentVersion  *int           `json:"agent_version"`
  Title         string         `json:"title"`
  Description   string         `json:"description"`
  Status        string         `json:"status"`        // "draft"|"ready"|"queued"|"running"|"completed"|"failed"|"blocked"|"skipped"
  Ordinal       int            `json:"ordinal"`
  Config        map[string]any `json:"config"`
  KPIs          []CardKPI      `json:"kpis"`
  StartedAt     *time.Time     `json:"started_at"`
  CompletedAt   *time.Time     `json:"completed_at"`
  CreatedAt     time.Time      `json:"created_at"`
  UpdatedAt     time.Time      `json:"updated_at"`
}

CardKPI {
  MetricKey   string  `json:"metric_key"`    // "von_mises_max"
  TargetValue float64 `json:"target_value"`
  Unit        string  `json:"unit"`          // "MPa"
  Tolerance   float64 `json:"tolerance"`
}
```

**Card Status Transitions:**
```
draft → ready, blocked, skipped
ready → queued, blocked, skipped
queued → running, blocked, skipped
running → completed, failed, blocked, skipped
failed → ready (retry), skipped
completed → skipped (override)
```

### IntentSpec

```go
IntentSpec {
  ID                 string              `json:"id"`
  BoardID            string              `json:"board_id"`
  CardID             *string             `json:"card_id"`
  IntentType         string              `json:"intent_type"`     // "sim.fea"
  Version            int                 `json:"version"`
  Goal               string              `json:"goal"`
  Inputs             []IntentInput       `json:"inputs"`
  Constraints        map[string]any      `json:"constraints"`
  AcceptanceCriteria []AcceptanceCriterion `json:"acceptance_criteria"`
  Preferences        *IntentPreferences  `json:"preferences"`
  Governance         *GovernanceSpec     `json:"governance"`
  Context            *IntentContext      `json:"context"`
  Status             string              `json:"status"`          // "draft"|"locked"|"active"|"completed"|"failed"
  LockedAt           *time.Time          `json:"locked_at"`
}

AcceptanceCriterion {
  ID          string  `json:"id"`
  Metric      string  `json:"metric"`      // "max_stress"
  Operator    string  `json:"operator"`    // "lt"|"lte"|"gt"|"gte"|"eq"|"neq"|"in"|"between"
  Threshold   any     `json:"threshold"`
  Unit        *string `json:"unit"`
  Weight      *float64 `json:"weight"`     // 0.0-1.0
}
```

### ExecutionPlan

```go
ExecutionPlan {
  ID              string            `json:"id"`            // "plan_..."
  CardID          string            `json:"card_id"`
  PipelineID      string            `json:"pipeline_id"`
  Nodes           []PlanNode        `json:"nodes"`
  Edges           []PlanEdge        `json:"edges"`
  Bindings        map[string]string `json:"bindings"`      // intent inputs → node ports
  ExpectedOutputs []string          `json:"expected_outputs"`
  CostEstimate    int               `json:"cost_estimate"` // credits
  TimeEstimate    string            `json:"time_estimate"` // "2h30m"
  Status          string            `json:"status"`        // "draft"|"validated"|"executing"|"completed"|"failed"
  PreflightResult *JSON             `json:"preflight_result"`
  WorkflowID      *string           `json:"workflow_id"`   // compiled to workflow
  RunID           *string           `json:"run_id"`        // linked to execution
}

PlanNode {
  NodeID      string         `json:"node_id"`       // "node_001_auto_mesh"
  ToolID      string         `json:"tool_id"`
  ToolVersion string         `json:"tool_version"`
  Role        string         `json:"role"`          // "validate_input"|"preprocess"|"solve"|"postprocess"|"report"|"evidence"|"approval"
  Parameters  map[string]any `json:"parameters"`
  IsEditable  bool           `json:"is_editable"`
  IsRequired  bool           `json:"is_required"`
  Status      *string        `json:"status"`
}
```

### Gate

```go
Gate {
  ID          string     `json:"id"`
  BoardID     string     `json:"board_id"`
  ProjectID   string     `json:"project_id"`
  Name        string     `json:"name"`
  GateType    string     `json:"gate_type"`    // "evidence"|"review"|"compliance"
  Status      string     `json:"status"`       // "PENDING"|"EVALUATING"|"PASSED"|"FAILED"|"WAIVED"
  Description *string    `json:"description"`
  Metadata    *JSONB     `json:"metadata"`
  EvaluatedAt *time.Time `json:"evaluated_at"`
}

GateRequirement {
  ID          string  `json:"id"`
  GateID      string  `json:"gate_id"`
  ReqType     string  `json:"req_type"`     // "run_succeeded"|"artifact_exists"|"role_signed"|"metric_threshold"
  Description string  `json:"description"`
  Config      JSONB   `json:"config"`
  Satisfied   bool    `json:"satisfied"`
  Evidence    *JSONB  `json:"evidence"`
}

GateApproval {
  ID        string  `json:"id"`
  GateID    string  `json:"gate_id"`
  Action    string  `json:"action"`    // "approve"|"reject"|"waive"
  Actor     string  `json:"actor"`
  Role      *string `json:"role"`
  Rationale *string `json:"rationale"`
}
```

### Run

```go
Run {
  ID               string     `json:"id"`            // "run_..."
  ProjectID        string     `json:"project_id"`
  RunType          string     `json:"run_type"`      // "tool"|"workflow"|"agent"
  WorkflowID       *string    `json:"workflow_id"`
  WorkflowVersion  *int       `json:"workflow_version"`
  ToolRef          *string    `json:"tool_ref"`      // "tool_id@version"
  AgentID          *string    `json:"agent_id"`
  Status           string     `json:"status"`        // "PENDING"|"RUNNING"|"SUCCEEDED"|"FAILED"|"CANCELED"|"AWAITING_APPROVAL"
  InputsJSON       JSONB      `json:"inputs_json"`
  OutputsJSON      *JSONB     `json:"outputs_json"`
  Actor            string     `json:"actor"`
  CostEstimate     float64    `json:"cost_estimate"`
  CostActual       float64    `json:"cost_actual"`
  StartedAt        *time.Time `json:"started_at"`
  CompletedAt      *time.Time `json:"completed_at"`
}

NodeRun {
  ID          string     `json:"id"`            // "nr_..."
  RunID       string     `json:"run_id"`
  NodeID      string     `json:"node_id"`
  JobID       *string    `json:"job_id"`        // NATS job
  ToolRef     string     `json:"tool_ref"`
  Status      string     `json:"status"`        // "QUEUED"|"RUNNING"|"RETRYING"|"BLOCKED"|"SUCCEEDED"|"FAILED"|"SKIPPED"|"CANCELED"
  Attempt     int        `json:"attempt"`
  InputsHash  string     `json:"inputs_hash"`
}
```

### Tool

```go
Tool {
  ID          string `json:"id"`
  ProjectID   string `json:"project_id"`
  Name        string `json:"name"`
  Description string `json:"description"`
  Owner       string `json:"owner"`
}

ToolVersion {
  ID               string     `json:"id"`
  ToolID           string     `json:"tool_id"`
  Version          string     `json:"version"`          // semver
  Status           string     `json:"status"`           // "draft"|"published"|"deprecated"
  ContractJSON     JSONB      `json:"contract_json"`    // ToolContract
  RunCount         int        `json:"run_count"`
  SuccessRate      float64    `json:"success_rate"`     // computed by TrustUpdater
  DeprecateMessage *string    `json:"deprecate_message"`
}

ToolContract {
  Inputs  []ToolPort `json:"inputs"`
  Outputs []ToolPort `json:"outputs"`
}

ToolPort {
  Name        string      `json:"name"`
  Type        string      `json:"type"`        // "artifact"|"parameter"|"metric"
  Required    bool        `json:"required"`
  Schema      *JSONSchema `json:"schema"`
  Description *string     `json:"description"`
}
```

### Agent

```go
Agent {
  ID          string `json:"id"`
  ProjectID   string `json:"project_id"`
  Name        string `json:"name"`       // unique per project
  Description string `json:"description"`
  Owner       string `json:"owner"`
}

AgentVersion {
  ID          string     `json:"id"`
  AgentID     string     `json:"agent_id"`
  Version     int        `json:"version"`
  SpecJSON    JSONB      `json:"spec_json"`    // full AgentSpec
  Status      string     `json:"status"`       // "draft"|"validated"|"published"
  PublishedAt *time.Time `json:"published_at"`
}

AgentMemory {
  ID          string   `json:"id"`
  AgentID     string   `json:"agent_id"`
  ProjectID   string   `json:"project_id"`
  MemoryType  string   `json:"memory_type"`   // "fact"|"preference"|"lesson"|"error_pattern"
  Content     string   `json:"content"`
  Tags        []string `json:"tags"`
  Relevance   float64  `json:"relevance"`
  SourceRunID *string  `json:"source_run_id"`
}
```

### Pipeline

```go
Pipeline {
  ID          string         `json:"id"`
  ProjectID   string         `json:"project_id"`
  Name        string         `json:"name"`
  IntentType  string         `json:"intent_type"`
  TrustLevel  string         `json:"trust_level"`   // "untested"|"community"|"tested"|"verified"|"certified"
  IsBuiltin   bool           `json:"is_builtin"`
  Steps       []PipelineStep `json:"steps"`
}

PipelineStep {
  ID             string         `json:"id"`
  Ordinal        int            `json:"ordinal"`
  ToolID         string         `json:"tool_id"`
  ToolVersion    string         `json:"tool_version"`
  Role           string         `json:"role"`          // same roles as PlanNode
  ConfigTemplate map[string]any `json:"config_template"`
  DependsOn      []string       `json:"depends_on"`
}
```

---

## 3. Full API Surface (213 Endpoints)

### Boards
```
POST   /v0/boards                          CreateBoard
GET    /v0/boards                          ListBoards
GET    /v0/boards/{id}                     GetBoard
PATCH  /v0/boards/{id}                     UpdateBoard
DELETE /v0/boards/{id}                     DeleteBoard
GET    /v0/boards/{id}/children            ListChildBoards
GET    /v0/boards/{id}/composition         GetBoardComposition
GET    /v0/boards/{id}/mode                GetBoardMode
PATCH  /v0/boards/{id}/mode                UpdateBoardMode
GET    /v0/boards/{id}/summary             GetBoardSummary
GET    /v0/boards/{id}/readiness           GetReadiness
GET    /v0/boards/{id}/diff                CompareBoardsEvidence
GET    /v0/boards/{id}/triage              TriageFailures
GET    /v0/boards/{id}/reproducibility     GetReproducibilityScore
POST   /v0/boards/{id}/records             AddBoardRecord
GET    /v0/boards/{id}/records             ListBoardRecords
POST   /v0/boards/{id}/attachments         AddBoardAttachment
GET    /v0/boards/{id}/attachments         ListBoardAttachments
POST   /v0/boards/from-intent              CreateBoardFromIntent
```

### Cards
```
POST   /v0/cards                           CreateCard
GET    /v0/cards                           ListCards
GET    /v0/cards/{id}                      GetCard
PATCH  /v0/cards/{id}                      UpdateCard
DELETE /v0/cards/{id}                      DeleteCard
POST   /v0/cards/{id}/dependencies         AddDependency
GET    /v0/cards/{id}/dependencies         ListDependencies
DELETE /v0/cards/{id}/dependencies/{depId} RemoveDependency
POST   /v0/cards/{id}/runs                 AddRun
GET    /v0/cards/{id}/runs                 ListRuns
POST   /v0/cards/{id}/evidence             AddEvidence
GET    /v0/cards/{id}/evidence             ListEvidence
GET    /v0/cards/{id}/plan                 GetActivePlan
```

### IntentSpecs
```
POST   /v0/boards/{boardId}/intents        CreateIntent
GET    /v0/boards/{boardId}/intents        ListIntents
GET    /v0/intents/{id}                    GetIntent
PATCH  /v0/intents/{id}                    UpdateIntent
DELETE /v0/intents/{id}                    DeleteIntent
POST   /v0/intents/{id}/lock              LockIntent
GET    /v0/intent-types/{slug}            GetIntentType
GET    /v0/intent-types/{slug}/inputs     GetIntentTypeInputs
GET    /v0/intent-types/{slug}/pipelines  GetIntentTypePipelines
```

### Gates
```
POST   /v0/gates                           CreateGate
GET    /v0/gates                           ListGates
GET    /v0/gates/{id}                      GetGate
POST   /v0/gates/{id}/requirements         AddGateRequirement
GET    /v0/gates/{id}/requirements         ListGateRequirements
POST   /v0/gates/{id}/evaluate             EvaluateGate
POST   /v0/gates/{id}/approve              ApproveGate
POST   /v0/gates/{id}/reject              RejectGate
POST   /v0/gates/{id}/waive               WaiveGate
GET    /v0/gates/{id}/approvals            ListGateApprovals
```

### Execution Plans
```
POST   /v0/plans                           GeneratePlan
GET    /v0/plans/{id}                      GetPlan
PATCH  /v0/plans/{id}                      EditPlan
POST   /v0/plans/{id}/validate             ValidatePlan (preflight)
POST   /v0/plans/{id}/compile              CompilePlan
POST   /v0/plans/{id}/execute              ExecutePlan
```

### Workflows
```
POST   /v0/workflows                       CreateWorkflow
GET    /v0/workflows                       ListWorkflows
GET    /v0/workflows/{id}                  GetWorkflow
DELETE /v0/workflows/{id}                  DeleteWorkflow
POST   /v0/workflows/{id}/versions         CreateWorkflowVersion
GET    /v0/workflows/{id}/versions         ListWorkflowVersions
GET    /v0/workflows/{id}/versions/{v}     GetWorkflowVersion
POST   /v0/workflows/{id}/versions/{v}/publish  PublishWorkflowVersion
POST   /v0/workflows/{id}/run              StartWorkflowRunByID
POST   /v0/workflows/compile               CompileWorkflow
POST   /v0/workflows/validate              ValidateWorkflow
POST   /v0/workflows/{id}/triggers         CreateTrigger
GET    /v0/workflows/{id}/triggers         ListTriggers
PATCH  /v0/workflows/{id}/triggers/{tid}   UpdateTrigger
DELETE /v0/workflows/{id}/triggers/{tid}   DeleteTrigger
```

### Runs
```
POST   /v0/runs                            StartRun
GET    /v0/runs                            ListRuns
GET    /v0/runs/{id}                       GetRun
POST   /v0/runs/{id}/cancel                CancelRun
POST   /v0/runs/{id}/resume                ResumeRun
GET    /v0/runs/{id}/logs                  GetRunLogs
GET    /v0/runs/{id}/events                GetRunEvents
GET    /v0/runs/{id}/artifacts             GetRunArtifacts
GET    /v0/runs/{id}/trace                 GetRunTrace
GET    /v0/runs/{id}/stream                StreamRunEvents (SSE)
GET    /v0/runs/{id}/explain               ExplainRun
GET    /v0/runs/{id}/checkpoints           GetRunCheckpoints
```

### Tools
```
POST   /v0/tools                           CreateTool
GET    /v0/tools                           ListTools
GET    /v0/tools/{id}                      GetTool
POST   /v0/tools/{id}/versions             CreateVersion
GET    /v0/tools/{id}/versions             ListVersions
GET    /v0/tools/{id}/versions/{v}         GetVersion
POST   /v0/tools/{id}/versions/{v}/publish      PublishVersion
POST   /v0/tools/{id}/versions/{v}/deprecate    DeprecateVersion
POST   /v0/tools/{id}/versions/{v}/tests        SubmitTestResults
GET    /v0/tools/{id}/versions/{v}/tests        GetTestResults
POST   /v0/tools/{id}/versions/{v}/validate-inputs  ValidateInputs
POST   /v0/validate/contract               ValidateContract
```

### Agents
```
POST   /v0/agents                          CreateAgent
GET    /v0/agents                          ListAgents
GET    /v0/agents/{id}                     GetAgent
DELETE /v0/agents/{id}                     DeleteAgent
POST   /v0/agents/{id}/versions            CreateAgentVersion
GET    /v0/agents/{id}/versions            ListAgentVersions
GET    /v0/agents/{id}/versions/{v}        GetAgentVersion
POST   /v0/agents/{id}/versions/{v}/validate  ValidateAgentVersion
POST   /v0/agents/{id}/versions/{v}/publish   PublishAgentVersion
POST   /v0/agents/{id}/versions/{v}/run       RunAgent
POST   /v0/agents/{id}/sessions            CreateSession
GET    /v0/agents/{id}/sessions/{sid}      GetSession
POST   /v0/agents/{id}/sessions/{sid}/run     RunInSession
POST   /v0/agents/{id}/sessions/{sid}/messages  SendMessage
POST   /v0/agents/{id}/sessions/{sid}/approve   ApproveSessionAction
DELETE /v0/agents/{id}/sessions/{sid}      CloseSession
POST   /v0/agents/{id}/memories            CreateMemory
GET    /v0/agents/{id}/memories            ListMemories
DELETE /v0/agents/{id}/memories/{mid}      DeleteMemory
POST   /v0/agents/{id}/evals              CreateAgentEvalCase
GET    /v0/agents/{id}/evals              ListAgentEvalCases
POST   /v0/agents/{id}/evals/run          RunAgentEvals
POST   /v0/agents/{id}/triggers            CreateAgentTrigger
GET    /v0/agents/{id}/triggers            ListAgentTriggers
```

### Artifacts
```
POST   /v0/artifacts/upload-url            GetUploadURL
POST   /v0/artifacts/{id}/finalize         FinalizeUpload
GET    /v0/artifacts                       ListArtifacts
GET    /v0/artifacts/{id}                  GetArtifact
GET    /v0/artifacts/{id}/download-url     GetDownloadURL
GET    /v0/artifacts/{id}/lineage          GetLineage
POST   /v0/artifacts/{id}/convert          ConvertArtifact
```

### ToolShelf
```
POST   /v0/toolshelf/resolve              ResolveTools
POST   /v0/toolshelf/resolve/v2           ResolveToolsV2 (pipeline-aware)
GET    /v0/toolshelf/resolve/{id}/explain  ExplainResolution
```

### Pipelines
```
POST   /v0/pipelines                       CreatePipeline
GET    /v0/pipelines                       ListPipelines
GET    /v0/pipelines/{id}                  GetPipeline
PATCH  /v0/pipelines/{id}                  UpdatePipeline
DELETE /v0/pipelines/{id}                  DeletePipeline
```

### Domain Registry
```
GET    /v0/verticals                       ListVerticals
POST   /v0/verticals                       CreateVertical
GET    /v0/verticals/{slug}                GetVertical
GET    /v0/verticals/{slug}/board-types    ListVerticalBoardTypes
GET    /v0/verticals/{slug}/gate-types     ListVerticalGateTypes
GET    /v0/verticals/{slug}/intent-types   ListIntentTypesByVertical
GET    /v0/board-types/{slug}/statuses     ListBoardTypeStatuses
GET    /v0/board-types/{slug}/transitions  ListBoardTypeTransitions
```

### Templates, Quotas, Audit
```
GET    /v0/templates                       ListTemplates
POST   /v0/templates                       CreateTemplate
POST   /v0/templates/{id}/apply            ApplyTemplate
GET    /v0/quotas                          GetQuotas
POST   /v0/policies                        CreatePolicy
GET    /v0/policies                        ListPolicies
GET    /v0/audit/events                    ListAuditEventsFiltered
```

---

## 4. Key Algorithms

### Plan Generation (PlanGeneratorService — 9 steps)

```
1. Validate card type (analysis | comparison | sweep only)
2. Load IntentSpec via card FK
3. Auto-select pipeline (highest trust_level for intent_type)
4. Instantiate pipeline steps → PlanNodes + PlanEdges
5. Bind IntentSpec.inputs → node ports
6. Apply parameter overrides (validate against tool contract schema)
7. Insert validation nodes (input schema + unit consistency checks)
8. Insert evidence nodes (metric extraction matching card KPIs)
9. Insert governance nodes (approval gates if board mode = study | release)
10. Compute cost/time estimates from tool resource limits
```

### Preflight Validation (6 universal + domain checks)

```
1. Input schema validation (tool contract JSON Schema checks)
2. Artifact version pinning (all referenced artifacts must have versions)
3. Unit consistency (physical units match across connected nodes)
4. Quota availability (remaining project credits check)
5. Governance compliance (required approval roles configured)
6. Tool version availability (all tool versions in "published" status)
7. Domain-specific validators (loaded from IntentTypeDefinition)
```

### Evidence Collection (EvidenceCollectorService — 10 steps)

```
1.  Run completes → RunService emits event
2.  FireEvidenceCollection queues async handler
3.  Load all plan nodes with role = "evidence"
4.  For each tool output, extract metrics matching card KPIs
5.  Create CardEvidence records with evaluation (pass|fail|warning|info)
6.  Run TrustUpdater: update tool_versions.success_rate
7.  Check if any metric is borderline (within tolerance of threshold)
8.  If borderline → auto-escalate approval gates
9.  Emit audit events for all evidence records
10. Invalidate plan readiness cache
```

### Tool Resolution (ToolShelfService — 5 stages)

```
1. DISCOVER:  Find tools supporting intent_type (GIN index on JSONB capabilities)
2. FILTER:    Apply trust_level, compliance, adapter constraints
3. RANK:      Composite score = trust(100/70/30) + success_rate×80 + confidence×40 + preference(+50) - cost×0.1 - time×0.05
4. EXPLAIN:   Attribution breakdown per scoring factor
5. ASSEMBLE:  Return ranked list with confidence scores
```

### Board Intelligence (BoardIntelligenceService)

```
EvidenceDiff(boardA, boardB):
  For each metric in boardA:
    Find same metric in boardB
    Compute delta = A.value - B.value
    Classify: improved | degraded | unchanged | new | removed
    (operator-aware: for "lt" thresholds, lower = better)

FailureTriage(board):
  For each failing evidence:
    overshoot = |actual - threshold| / threshold
    Classify: CRITICAL (>50%) | WARNING (10-50%) | INFO (<10%)

ReproducibilityScore(card):
  Collect all evidence values for same metric across runs
  Compute CV (coefficient of variation)
  Score = 1.0 if single run, lower if high variance
```

### Readiness Scoring (BoardSummaryService)

```
Readiness weights:
  design:     0.30
  validation: 0.30
  compliance: 0.15
  manufacturing: 0.10
  approvals:  0.15

Score = Σ (category_weight × category_pass_rate)
```

---

## 5. Error Mapping

| Service Error | HTTP | Code | Notes |
|--------------|------|------|-------|
| ErrBoardNotFound | 404 | BOARD_NOT_FOUND | |
| ErrBoardProjectMismatch | 404 | BOARD_NOT_FOUND | No info leakage |
| ErrInvalidBoardMode | 400 | INVALID_BOARD_MODE | Must be explore/study/release |
| ErrBoardArchived | 409 | GATE_BOARD_ARCHIVED | Read-only after archive |
| ErrCardNotFound | 404 | CARD_NOT_FOUND | |
| ErrInvalidTransition | 409 | INVALID_TRANSITION | Invalid card status change |
| ErrDependencyCycle | 409 | DEPENDENCY_CYCLE | DAG violation |
| ErrPlanNotValidated | 422 | UNPROCESSABLE_ENTITY | Must preflight before execute |
| ErrPlanNotDraft | 409 | PLAN_NOT_DRAFT | |
| ErrCannotRemoveRequired | 409 | CANNOT_REMOVE | Required node in plan |
| ErrCannotSkipGovernance | 409 | CANNOT_SKIP_GOVERNANCE | Governance node in study/release |
| ErrQuotaExceeded | 429 | QUOTA_EXCEEDED | Project credits exhausted |
| ErrPolicyBlocked | 403 | POLICY_BLOCKED | Agent proposal rejected |
| ErrGateProjectMismatch | 404 | GATE_NOT_FOUND | No info leakage |

---

## 6. NATS Subjects

```
airaie.jobs.tool.execution        →  Dispatch tool job to Rust worker
airaie.jobs.agent.execution       →  Dispatch agent reasoning task
airaie.jobs.approval.wait         →  Gate requiring human approval
airaie.events.{runId}             →  Real-time log/event streaming per run
airaie.results.completed          →  Job completion callback from worker
airaie.execution.completed        →  Full run completion event
```

---

## 7. Database Migrations (19 total)

| Migration | Purpose |
|-----------|---------|
| 001 | Base schema (boards, tools, runs, artifacts) |
| 002-013 | Entity expansions (cards, gates, intents, pipelines, plans) |
| 014 | Evidence automation (run_id, criterion_id, operator, passed) |
| 015 | Vertical FK on intent_type_definitions |
| 016 | Trigger table (cron/webhook/event scheduling) |
| 017-018 | Agent sessions, memories, evals |
| 019 | Card agent fields (agent_id, agent_version) |

### Key Indexes

```sql
-- Board uniqueness (non-archived only)
CREATE UNIQUE INDEX ON boards (project_id, type, name) WHERE archived_at IS NULL;

-- Card evidence (fast lookups)
CREATE INDEX ON card_evidence (card_id, version DESC);
CREATE INDEX ON card_evidence (card_id, criterion_id);
CREATE INDEX ON card_evidence (run_id);

-- Tool capabilities (JSONB GIN for ToolShelf resolution)
CREATE INDEX ON tool_versions USING GIN (contract_json);

-- Gate uniqueness
CREATE UNIQUE INDEX ON gates (board_id, name);
```

---

## 8. Multi-Tenancy

- **Header**: `X-Project-Id` (defaults to `prj_default` in dev)
- **Scope enforcement**: Every query filtered by `project_id`
- **Cross-project**: Returns 404 (not 403) to prevent information leakage
- **Auth**: JWT + API keys planned (Sprint 18), currently unenforced

---

## 9. Implementation Status

### Completed (Phases 0-6, 25 plans)

| Phase | Feature | Plans |
|-------|---------|-------|
| B0-B1 | Board CRUD & mode transitions | 4 |
| B2-B3 | Intent types & intent-driven board creation | 4 |
| B4 | ToolShelf resolution engine | 2 |
| B5 | Pipeline composition | 2 |
| B6 | Card entity, DAG, dependencies | 3 |
| B7-B8 | Board composition, sub-boards, templates | 3 |
| B9 | Plan generation, compilation, execution | 3 |
| B10 | Preflight validation (6 universal + domain) | 2 |
| B11-B12 | Evidence collection, board intelligence | 2 |

### Not Yet Implemented

| Feature | Notes |
|---------|-------|
| Rust worker process | NATS layer ready, Docker execution not built |
| JWT / API Key auth | Stubs exist, not enforced |
| RBAC | owner/maintainer/viewer roles planned |
| LLM integration | Agent runtime exists, no LLM provider wired |
| Distributed scheduler | NATS subjects defined, coordination unbuilt |
| WASM adapters | Schema defined, runtime not implemented |
| Release packet generation | Endpoint planned, not coded |

---

*Generated from exhaustive scan of airaie-kernel source code and .planning directory (331 planning files, 19 migrations, 213 handler methods, 30 services).*
