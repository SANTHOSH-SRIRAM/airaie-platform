# PHASE 2: WORKFLOW ENGINE COMPLETION
# Complete Sprint Documents (Sprints 2.1 - 2.4)

> **Objective:** Complete the workflow compilation, execution, expression, versioning, and trigger pipeline.
> **Duration:** 10-15 days (4 sprints, ~3 days each)
> **Start Date:** ~2026-04-28 (after Phase 1 completion)
> **End Date:** ~2026-05-12
> **Parallel With:** Phase 3 (Agent Intelligence) -- Phases 2 and 3 are independent; both depend on Phase 1.
> **Dependencies:** Phase 1 (Tool Execution Golden Path) must be complete.
> **Generated:** 2026-04-06

---

## PHASE 2 OVERVIEW

Phase 2 converts the existing workflow engine code (~95% backend, ~65% frontend) into a fully verified, integration-tested, end-to-end workflow execution system. The backend code for the compiler, validator, scheduler, dispatcher, and expression engine already exists. The primary work is integration testing, wiring stubs to real execution paths, completing frontend components, and adding missing features (board context expressions, trigger execution wiring).

### Phase 2 Sprint Map

```
Sprint 2.1: Workflow Compilation & Validation    (~3 days)
  - 5-stage compiler integration test
  - 7-check validator integration test
  - Dual expression syntax translation
  - Preflight validation (6 universal + domain)
  - Frontend: Canvas-to-DSL, Compile/Publish, Diagnostics

Sprint 2.2: Workflow Execution & Scheduling       (~3 days)
  - Topological scheduler integration test
  - NATS dispatch/consume end-to-end
  - NodeRun 8-state machine verification
  - Retry with exponential backoff
  - Condition/Switch evaluation
  - Frontend: RunsPage live badges, LogViewer, ArtifactsTab

Sprint 2.3: Expression System & Data Flow         (~4 days)
  - Expression resolution at dispatch
  - Board context expressions ($board.*)
  - Gate/cost expressions ($gate, $cost)
  - Frontend: ExpressionEditor (CodeMirror 6), NodeInspector, ParameterForm

Sprint 2.4: Workflow Versioning & Triggers        (~3 days)
  - Version lifecycle (draft -> compiled -> published)
  - Trigger CRUD (webhook/cron/event)
  - Trigger execution wiring
  - Frontend: VersionsPage, TriggersPage
```

### Key Files (Backend)

| File | Purpose |
|------|---------|
| `internal/workflow/compiler.go` | 5-stage compiler pipeline (Parser -> Resolver -> DAG Builder -> Type Checker -> AST) |
| `internal/workflow/validator.go` | 7-check workflow validation |
| `internal/workflow/scheduler.go` | Topological scheduler, dispatch loop, expression resolution, retry |
| `internal/service/run.go` | Run lifecycle, NATS dispatch/consume, result handling |
| `internal/service/preflight.go` | 6 universal + domain-specific preflight checks |
| `internal/model/run.go` | Run and NodeRun data models, state machine |
| `internal/service/workflow.go` | Version lifecycle, CRUD |
| `internal/service/trigger.go` | Trigger CRUD and execution wiring |

### Key Files (Frontend)

| File | Purpose |
|------|---------|
| `frontend/src/utils/canvasToYaml.ts` | Canvas-to-YAML DSL serialization |
| `frontend/src/pages/WorkflowEditorPage.tsx` | Builder page with compile/publish buttons |
| `frontend/src/components/workflows/ValidationPanel.tsx` | Diagnostics / validation error display |
| `frontend/src/pages/WorkflowRunsPage.tsx` | Run monitor with live execution |
| `frontend/src/components/workflows/runs/LogViewer.tsx` | Real-time log viewer |
| `frontend/src/components/workflows/runs/ArtifactsTab.tsx` | Artifact browser per run |
| `frontend/src/components/workflows/ndv/NodeInspector.tsx` | Node data viewer (input/output panels) |
| `frontend/src/components/workflows/ndv/ParameterForm.tsx` | Auto-generated parameter form |
| `frontend/src/components/workflows/VersionList.tsx` | Version history |
| `frontend/src/components/workflows/PublishModal.tsx` | Publish workflow modal |

### NATS Subjects

| Subject | Direction | Purpose |
|---------|-----------|---------|
| `airaie.jobs.tool.execution` | Scheduler -> Runner | Dispatch tool execution job |
| `airaie.jobs.agent.execution` | Scheduler -> Agent Runtime | Dispatch agent execution job |
| `airaie.results.completed` | Runner -> ResultHandler | Job completion callback |
| `airaie.events.{runId}` | Scheduler -> Frontend SSE | Real-time run event stream |
| `airaie.jobs.approval.wait` | Scheduler -> Approval System | Gate approval request |
| `airaie.execution.completed` | Scheduler -> Downstream | Full run completion notification |

---
---

# SPRINT 2.1: WORKFLOW COMPILATION & VALIDATION

---

## 1. Sprint Metadata

| Field | Value |
|-------|-------|
| **Sprint ID** | 2.1 |
| **Sprint Name** | Workflow Compilation & Validation |
| **Phase** | 2 -- Workflow Engine Completion |
| **Duration** | 3 days |
| **Start Date** | 2026-04-28 |
| **End Date** | 2026-04-30 |
| **Goal** | Complete and verify the 5-stage compiler pipeline, 7-check validator, dual expression syntax translation, and preflight validation system. Wire frontend compile/publish buttons and diagnostics panel to real backend APIs. |
| **Dependencies** | Phase 1 complete (tool registration, execution, ToolShelf). Compiler, validator, and preflight service Go code exists. |
| **Risks** | Expression syntax translation edge cases (nested objects, array access). Preflight domain validator hook may require IntentType registry from Phase 4. |
| **Mitigation** | Provide a no-op domain validator fallback when IntentType is not set. Exhaustive expression test matrix for syntax translation. |

---

## 2. Objectives & Key Results

| # | Objective | Key Result | Measurement |
|---|-----------|------------|-------------|
| O1 | Verify 5-stage compiler produces correct AST from YAML DSL | Compile 5 distinct workflow YAML files (linear, parallel, branching, loop-reject, complex) through all 5 stages without regression | All 5 compile successfully; cycle detection rejects the loop case |
| O2 | Verify 7-check validator catches all invalid workflow patterns | Run 14 test cases (2 per check: 1 pass, 1 fail) through the validator | All 14 tests pass with correct error/warning classification |
| O3 | Dual expression syntax works interchangeably | Canvas-format and DSL-format expressions both compile to same AST | Bidirectional translation round-trips for 10 expression patterns |
| O4 | Preflight validation catches pre-execution issues | 6 universal checks + 1 domain check tested with both valid and invalid inputs | 12 preflight test cases pass |
| O5 | Frontend compile/publish flow works end-to-end | User can draw workflow on canvas, click Compile, see errors/warnings, fix issues, re-compile, and Publish | Manual QA walkthrough succeeds |

---

## 3. Architecture Context

### 5-Stage Compiler Pipeline

```
Input: YAML DSL string (from frontend serialization or API)

  Stage 1: PARSER
  ├── Parse YAML into structured JSON
  ├── Validate syntax, required fields, structure
  ├── Reject malformed YAML with line/column errors
  └── Output: ParsedWorkflow struct

  Stage 2: RESOLVER
  ├── Resolve all variable references in expressions:
  │   $inputs.X -> maps to workflow-level input parameter
  │   $nodes.X.outputs.Y -> maps to node X's output port Y
  ├── Build node-name <-> node-id mapping for canvas expressions
  ├── Translate canvas-format $('Name').json.field to DSL-format $nodes.X.outputs.Y
  └── Output: ResolvedWorkflow struct (all refs validated)

  Stage 3: DAG BUILDER
  ├── Build adjacency list from connections
  ├── Cycle detection via Kahn's algorithm:
  │   1. Compute in-degree for every node
  │   2. Seed queue with in-degree-0 nodes
  │   3. Process queue, decrementing children's in-degree
  │   4. If processed count != total nodes -> CYCLE DETECTED -> reject
  ├── Produce topological ordering
  └── Output: DAG struct with execution levels

  Stage 4: TYPE CHECKER
  ├── For each edge: lookup source output port type + target input port type
  ├── Verify type compatibility (number->number OK, number->artifact FAIL)
  ├── For required inputs without connection: verify default/static value
  └── Output: TypeCheckedDAG struct (or type errors)

  Stage 5: AST OUTPUT
  ├── Create Abstract Syntax Tree with resolved refs + validated types
  ├── Compute execution levels (parallel groups):
  │   Level 0: [trigger nodes]
  │   Level 1: [nodes depending only on level 0]
  │   Level 2: [nodes depending only on levels 0-1]
  └── Output: { status: "compiled", ast: {...}, warnings: [...], errors: [...] }
```

### 7-Check Validator

```
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
  - All {{ $nodes.X.outputs.Y }} map to existing node IDs and output ports
  - No dangling references to non-existent nodes or ports

CHECK 4: DAG VALIDATION
  - No cycles in the graph (Kahn's algorithm)
  - All edge source/target node IDs exist in the nodes list
  - No self-referencing edges (node -> same node)
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

### Preflight Validation (6 Universal + Domain)

```
UNIVERSAL CHECKS:
  1. Input schema validation -- all inputs match tool contract JSON Schema
  2. Artifact version pinning -- all referenced artifacts have version IDs
  3. Unit consistency -- physical units match across connected node ports
  4. Quota availability -- project has sufficient remaining credits
  5. Governance compliance -- required approval roles configured for Gate nodes
  6. Tool version availability -- all referenced tool versions are "published"

DOMAIN-SPECIFIC CHECKS:
  7. Domain validator hook -- loaded from IntentTypeDefinition for the workflow's domain
     (structural, thermal, CFD, etc.). No-op fallback when IntentType is not set.
```

---

## 4. Task Breakdown

### 4.1 Backend Tasks

#### Task 2.1.B1: Verify 5-Stage Compiler Pipeline (Integration Test)

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/compiler.go` |
| **What Exists** | Full 5-stage compiler exists with Parser, Resolver, DAG Builder, Type Checker, and AST output |
| **What To Do** | Write integration tests that feed real YAML DSL through all 5 stages. Verify: (1) Parser produces correct ParsedWorkflow. (2) Resolver maps all node names to IDs and translates expressions. (3) DAG Builder computes correct topological sort and execution levels. (4) Type Checker catches mismatched port types. (5) AST output includes execution levels for parallel dispatch. (6) Cycle detection rejects cyclic DAGs. |
| **Complexity** | M |
| **Estimated Hours** | 6 |
| **Test File** | `internal/workflow/compiler_integration_test.go` |

**Subtasks:**
1. Create test YAML DSL fixture: linear 3-node workflow (Trigger -> Tool A -> Tool B)
2. Create test YAML DSL fixture: parallel workflow (Trigger -> [Tool A, Tool B] -> Merge -> Tool C)
3. Create test YAML DSL fixture: branching workflow (Trigger -> Tool -> IF -> [Branch A, Branch B])
4. Create test YAML DSL fixture: cyclic workflow (A -> B -> C -> A) -- MUST be rejected
5. Create test YAML DSL fixture: complex workflow (6+ nodes, parallel + branching + merge)
6. Write integration test: feed each fixture through `Compile()` and assert stage outputs
7. Assert execution levels are computed correctly for parallel fixture (Level 0: Trigger, Level 1: [A, B], Level 2: Merge, Level 3: C)
8. Assert cycle detection error includes the cycle path nodes
9. Assert type checker catches number->artifact mismatch when introduced into fixture

**Acceptance Criteria for Task:**
- [ ] 5 YAML fixtures compiled; 4 succeed, 1 (cyclic) rejected
- [ ] Execution levels match expected parallel grouping
- [ ] Type mismatch produces descriptive error with source/target node IDs and port names

---

#### Task 2.1.B2: Verify 7-Check Validator (Integration Test)

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/validator.go` |
| **What Exists** | Validator exists with all 7 checks implemented |
| **What To Do** | Write integration tests for all 7 checks. Each check needs at least 2 test cases: one passing and one failing. Verify error severity (ERROR blocks publish, WARNING allows publish). |
| **Complexity** | M |
| **Estimated Hours** | 5 |
| **Test File** | `internal/workflow/validator_integration_test.go` |

**Subtasks:**
1. Check 1 tests: (a) Valid structure with all required fields. (b) Missing `api_version` field -> ERROR. (c) Invalid identifier with dots -> ERROR.
2. Check 2 tests: (a) Valid tool_ref `fea-solver@2.1.0`. (b) Bare tool name `fea-solver` without version -> ERROR. (c) Invalid semver `fea-solver@abc` -> ERROR.
3. Check 3 tests: (a) All `$inputs.X` and `$nodes.X.outputs.Y` resolve. (b) Reference to non-existent node -> ERROR. (c) Reference to non-existent port -> ERROR.
4. Check 4 tests: (a) Valid DAG compiles. (b) Cyclic graph -> ERROR with cycle path. (c) Self-referencing edge -> ERROR.
5. Check 5 tests: (a) All tool refs exist and are published. (b) Reference to non-existent tool -> ERROR. (c) Reference to draft tool version -> ERROR.
6. Check 6 tests: (a) Valid `{{ }}` expressions parse. (b) Malformed expression `{{ $('unclosed }` -> ERROR. (c) IF condition that returns string instead of boolean -> ERROR.
7. Check 7 tests: (a) Clean workflow -> no warnings. (b) Unreachable node -> WARNING. (c) Unused workflow input -> WARNING. (d) Redundant edge -> WARNING.

**Acceptance Criteria for Task:**
- [ ] 14+ test cases pass covering all 7 checks
- [ ] Errors correctly block compilation; warnings do not
- [ ] Error messages include node IDs, line numbers, and descriptive text

---

#### Task 2.1.B3: Dual Expression Syntax Translation

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/` (compiler.go or expression module) |
| **What Exists** | `$inputs` / `$nodes` DSL format exists. Canvas format `$('Name').json.field` needs translation layer. |
| **What To Do** | Implement or verify bidirectional translation between canvas-format and DSL-format expressions. Both syntaxes must compile to the same internal AST representation. The compiler maintains a node-name <-> node-id mapping to perform the translation. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. Verify node-name <-> node-id mapping is built correctly during compilation (node names from YAML `name` field, IDs from `id` or sanitized name)
2. Implement or verify Canvas -> DSL translation: `{{ $('Mesh Generator').json.element_count }}` -> `{{ $nodes.mesh_gen_1.outputs.element_count }}`
3. Implement or verify DSL -> Canvas translation (for editor display): `{{ $nodes.mesh_gen_1.outputs.element_count }}` -> `{{ $('Mesh Generator').json.element_count }}`
4. Handle artifact references: `{{ $('Node').artifacts.mesh_output }}` <-> `{{ $nodes.X.outputs.mesh_output }}`
5. Handle nested field access: `{{ $('FEA Solver').json.metrics.max_stress }}` <-> `{{ $nodes.fea_solver_1.outputs.metrics.max_stress }}`
6. Handle shared variables (no translation needed, pass through): `{{ $trigger.json.field }}`, `{{ $run.id }}`, `{{ $workflow.name }}`, `{{ $env.VAR }}`, `{{ $now }}`
7. Handle gate/cost expressions (no translation needed, pass through): `{{ $gate('Name').status }}`, `{{ $cost.total }}`
8. Write test: round-trip translation (canvas -> DSL -> canvas) for 10 expression patterns
9. Write test: mixed expressions in one workflow (some canvas, some DSL) compile correctly
10. Edge case: node name with special characters -> verify sanitized ID mapping is stable

**Expression Translation Test Matrix:**

| # | Canvas Format | DSL Format | Notes |
|---|---------------|------------|-------|
| 1 | `{{ $('Webhook').json.material }}` | `{{ $inputs.material }}` (if trigger) | Trigger shortcut |
| 2 | `{{ $('Mesh Gen').json.element_count }}` | `{{ $nodes.mesh_gen_1.outputs.element_count }}` | Basic field |
| 3 | `{{ $('Mesh Gen').artifacts.mesh_output }}` | `{{ $nodes.mesh_gen_1.outputs.mesh_output }}` | Artifact ref |
| 4 | `{{ $('FEA').json.metrics.max_stress }}` | `{{ $nodes.fea_1.outputs.metrics.max_stress }}` | Nested access |
| 5 | `{{ $('FEA').json.results[0].value }}` | `{{ $nodes.fea_1.outputs.results[0].value }}` | Array index |
| 6 | `{{ $trigger.json.load }}` | `{{ $trigger.json.load }}` | Shared (no change) |
| 7 | `{{ $run.id }}` | `{{ $run.id }}` | Shared (no change) |
| 8 | `{{ $gate('Quality').status }}` | `{{ $gate('Quality').status }}` | Gate expr |
| 9 | `{{ $cost.total }}` | `{{ $cost.total }}` | Cost expr |
| 10 | `{{ $('Node A').json.x + $('Node B').json.y }}` | `{{ $nodes.node_a.outputs.x + $nodes.node_b.outputs.y }}` | Arithmetic |

**Acceptance Criteria for Task:**
- [ ] Both expression formats compile to identical AST
- [ ] Round-trip translation preserves semantic equivalence for all 10 patterns
- [ ] Mixed-format expressions in single workflow compile without error

---

#### Task 2.1.B4: Preflight Validation (6 Universal + Domain Checks)

| Field | Value |
|-------|-------|
| **File** | `internal/service/preflight.go` |
| **What Exists** | Preflight service exists with some checks implemented |
| **What To Do** | Verify all 6 universal checks are implemented and working. Add domain validator hook that loads domain-specific checks from IntentTypeDefinition. Provide no-op fallback when IntentType is not set. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. Verify Check 1 (Input Schema): tool contract JSON Schema validates all resolved input values. Missing required field -> preflight failure. Wrong type -> preflight failure.
2. Verify Check 2 (Artifact Pinning): all artifact references resolve to existing artifact IDs with version. Dangling or unversioned ref -> preflight failure.
3. Verify Check 3 (Unit Consistency): physical unit metadata on ports match across connections. MPa output -> MPa input OK. MPa output -> PSI input -> preflight warning with suggested conversion.
4. Verify Check 4 (Quota): project credit balance >= estimated cost. Insufficient quota -> preflight failure with remaining balance and estimated cost.
5. Verify Check 5 (Governance): if workflow contains Gate nodes, verify approval roles are configured. Missing approver role -> preflight failure.
6. Verify Check 6 (Tool Version): all tool versions referenced in workflow are in "published" status. Draft or deprecated version -> preflight failure with version status and suggestion to publish/upgrade.
7. Add domain validator hook interface: `DomainValidator` interface with `Validate(ctx, plan, domain) []PreflightIssue`. Register validators per IntentType.
8. Implement no-op fallback: when workflow has no associated IntentType or domain, skip domain checks and return empty issues.
9. Write integration test with mock ToolStore and ArtifactStore to test each check independently.

**Acceptance Criteria for Task:**
- [ ] All 6 universal checks tested with pass and fail cases
- [ ] Domain validator hook can be registered and invoked
- [ ] No-op fallback works when domain is unset
- [ ] Preflight failures include descriptive error messages with node/port context

---

### 4.2 Frontend Tasks

#### Task 2.1.F1: Canvas -> YAML DSL Serialization Verification

| Field | Value |
|-------|-------|
| **File** | `frontend/src/utils/canvasToYaml.ts` |
| **What Exists** | `canvasToYaml.ts` exists with serialization logic |
| **What To Do** | Verify serialization produces YAML that the compiler accepts. Check: `api_version` field, node types mapped correctly, connections mapped to the format the compiler expects, expressions in canvas format correctly embedded, trigger node data included. Fix any mismatches discovered during integration with the compiler. |
| **Complexity** | M |
| **Estimated Hours** | 4 |

**Subtasks:**
1. Verify `api_version: v1` is always present in serialized output
2. Verify all node types (trigger, tool, agent, condition, switch, merge, transform, gate, delay) serialize with correct `type` field
3. Verify connections serialize in the format: `connections[source_node][output_type][output_index] = [{ node, type, index }]`
4. Verify node parameters include expression strings in `{{ }}` format
5. Verify trigger node serializes webhook/cron/event/manual config
6. Verify tool_ref on tool nodes serializes as `name@version` format
7. Test with a 5-node canvas: Trigger -> Tool A -> Condition -> [Tool B, Tool C]. Compare serialized YAML against expected structure.
8. Verify canvas position metadata (x, y) is preserved for editor round-trip but ignored by compiler

**Acceptance Criteria for Task:**
- [ ] Serialized YAML from canvas compiles without parser errors
- [ ] Node types, connections, and expressions survive serialization round-trip
- [ ] At least 3 canvas configurations tested against compiler

---

#### Task 2.1.F2: Compile/Publish Button Wiring

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/WorkflowEditorPage.tsx`, `frontend/src/components/workflows/WorkflowEditorTopBar.tsx`, `frontend/src/components/workflows/PublishModal.tsx` |
| **What Exists** | Buttons exist in the editor top bar. Some may be stubs or wired to mock data. |
| **What To Do** | Wire Compile button to `POST /v0/workflows/compile` with serialized YAML body. Wire Publish button to `POST /v0/workflows/{id}/versions/{v}/publish`. Display compiler response (errors, warnings, success) in the diagnostics panel. Block Publish when there are compile errors. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. Wire Compile button click handler:
   - Serialize current canvas state to YAML via `canvasToYaml()`
   - Call `POST /v0/workflows/compile` with `{ dsl_yaml: yamlString }`
   - Parse response: `{ status: "compiled" | "error", ast, warnings, errors }`
   - On success: store compiled AST in local state, enable Publish button, show success toast
   - On error: show errors in ValidationPanel, disable Publish button
2. Wire Publish button click handler:
   - Open PublishModal with version number input and changelog
   - On confirm: call `POST /v0/workflows/{id}/versions/{v}/publish`
   - On success: show success toast, update version badge in top bar
   - On error: show error in modal
3. Add loading states: spinner on Compile button during API call, spinner on Publish button during API call
4. Add error boundary: if API call fails (network error), show user-friendly message
5. Disable Compile button when canvas is empty (no nodes)
6. Disable Publish button until Compile succeeds (no compile errors)

**API Calls:**
```
POST /v0/workflows/compile
  Request: { dsl_yaml: string }
  Response: { status: "compiled", ast: object, warnings: string[], errors: [] }
          | { status: "error", ast: null, warnings: [], errors: CompileError[] }

POST /v0/workflows/{id}/versions/{v}/publish
  Request: { changelog?: string }
  Response: { version: number, status: "published", published_at: string }
```

**Acceptance Criteria for Task:**
- [ ] Compile button sends real YAML to backend and receives response
- [ ] Compile errors display in ValidationPanel with per-node context
- [ ] Publish button is disabled until compile succeeds
- [ ] Publish success updates version badge and shows confirmation

---

#### Task 2.1.F3: Validation Error Display (Diagnostics Panel)

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/workflows/ValidationPanel.tsx` |
| **What Exists** | ValidationPanel component exists |
| **What To Do** | Wire to compiler response. Display errors (block publish), warnings (allow publish), and info messages. Add per-node highlighting: when user clicks an error, the corresponding node on the canvas highlights with a red border. |
| **Complexity** | S |
| **Estimated Hours** | 3 |

**Subtasks:**
1. Accept compiler response as prop: `{ errors: CompileError[], warnings: CompileWarning[] }`
2. Render errors with red icon, error code, message, and affected node ID
3. Render warnings with yellow icon, warning code, message, and affected node ID
4. Add click handler on each error/warning: scroll to and highlight the affected node on the canvas
5. Show error count badge on the ValidationPanel tab/header
6. Add "Clear" button to dismiss warnings after acknowledgment
7. Show empty state when no errors/warnings: "Compilation successful" with green check

**CompileError Structure:**
```typescript
interface CompileError {
  code: string;         // e.g., "E001_MISSING_API_VERSION"
  severity: "error" | "warning" | "info";
  message: string;      // human-readable description
  node_id?: string;     // affected node (if applicable)
  line?: number;        // line in YAML (if applicable)
  suggestion?: string;  // how to fix
}
```

**Acceptance Criteria for Task:**
- [ ] Errors render with red styling, warnings with yellow
- [ ] Clicking an error highlights the corresponding node on canvas
- [ ] Error count badge shows total error count
- [ ] Empty state shows success message after clean compilation

---

## 5. API Endpoints

All endpoints exist. This sprint verifies integration.

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| `POST` | `/v0/workflows/compile` | Compile YAML DSL through 5-stage pipeline | `{ dsl_yaml: string }` | `{ status, ast, warnings, errors }` |
| `POST` | `/v0/workflows/{id}/versions` | Create new draft version | `{ dsl_yaml: string }` | `{ version, status: "draft" }` |
| `POST` | `/v0/workflows/{id}/versions/{v}/compile` | Compile specific version | `{}` | `{ status, ast, warnings, errors }` |
| `POST` | `/v0/workflows/{id}/versions/{v}/publish` | Publish compiled version | `{ changelog? }` | `{ version, status: "published" }` |
| `POST` | `/v0/validate/contract` | Validate a tool contract | `{ contract: ToolContract }` | `{ valid, errors }` |
| `POST` | `/v0/runs/preflight` | Run preflight checks before execution | `{ workflow_id, version, inputs }` | `{ passed, issues[] }` |

---

## 6. Data Models

### CompileResult

```go
type CompileResult struct {
    Status   string         `json:"status"`   // "compiled" | "error"
    AST      *WorkflowAST   `json:"ast"`      // nil if error
    Warnings []CompileIssue `json:"warnings"`
    Errors   []CompileIssue `json:"errors"`
}

type CompileIssue struct {
    Code       string `json:"code"`       // "E001_MISSING_API_VERSION"
    Severity   string `json:"severity"`   // "error" | "warning" | "info"
    Message    string `json:"message"`
    NodeID     string `json:"node_id,omitempty"`
    Line       int    `json:"line,omitempty"`
    Suggestion string `json:"suggestion,omitempty"`
}
```

### WorkflowAST

```go
type WorkflowAST struct {
    Nodes           []ASTNode       `json:"nodes"`
    Edges           []ASTEdge       `json:"edges"`
    ExecutionLevels [][]string      `json:"execution_levels"` // [[trigger], [A,B], [merge], [C]]
    InputSchema     json.RawMessage `json:"input_schema"`
    OutputSchema    json.RawMessage `json:"output_schema"`
}

type ASTNode struct {
    ID         string          `json:"id"`
    Type       string          `json:"type"`       // trigger, tool, agent, condition, switch, merge, etc.
    Name       string          `json:"name"`
    ToolRef    string          `json:"tool_ref,omitempty"`
    Parameters json.RawMessage `json:"parameters"`
    Level      int             `json:"level"`       // execution level for parallel dispatch
}
```

### PreflightResult

```go
type PreflightResult struct {
    Passed bool             `json:"passed"`
    Issues []PreflightIssue `json:"issues"`
}

type PreflightIssue struct {
    Check    string `json:"check"`    // "input_schema", "artifact_pinning", "unit_consistency", etc.
    Severity string `json:"severity"` // "error" | "warning"
    Message  string `json:"message"`
    NodeID   string `json:"node_id,omitempty"`
    PortName string `json:"port_name,omitempty"`
}
```

---

## 7. NATS Events

No NATS events in Sprint 2.1. Compilation and validation are synchronous request-response operations.

---

## 8. Test Plan

### Unit Tests

| Test | Input | Expected Output | File |
|------|-------|-----------------|------|
| Parser rejects invalid YAML | Malformed YAML string | CompileResult with errors, line number | `compiler_test.go` |
| Parser accepts valid YAML | Well-formed workflow YAML | ParsedWorkflow struct | `compiler_test.go` |
| Resolver maps node names to IDs | Workflow with named nodes | Correct name-to-ID mapping | `compiler_test.go` |
| DAG Builder detects cycle | A->B->C->A connections | Error with cycle path [A,B,C,A] | `compiler_test.go` |
| DAG Builder computes levels | Parallel DAG | Correct level assignment | `compiler_test.go` |
| Type Checker catches mismatch | number output -> artifact input | Type error with port info | `compiler_test.go` |
| Validator Check 1: structure | Missing api_version | Error E001 | `validator_test.go` |
| Validator Check 2: tool refs | Bare tool name | Error E002 | `validator_test.go` |
| Validator Check 3: variable refs | Dangling $nodes.X ref | Error E003 | `validator_test.go` |
| Validator Check 4: DAG | Self-referencing edge | Error E004 | `validator_test.go` |
| Validator Check 5: availability | Draft tool version ref | Error E005 | `validator_test.go` |
| Validator Check 6: condition | Non-boolean IF expression | Error E006 | `validator_test.go` |
| Validator Check 7: lint | Unreachable node | Warning W001 | `validator_test.go` |
| Expression canvas->DSL | `$('Name').json.field` | `$nodes.id.outputs.field` | `expression_test.go` |
| Expression DSL->canvas | `$nodes.id.outputs.field` | `$('Name').json.field` | `expression_test.go` |
| Expression round-trip | canvas -> DSL -> canvas | Original expression | `expression_test.go` |
| Preflight: schema validation | Missing required input | Issue: input_schema error | `preflight_test.go` |
| Preflight: artifact pinning | Dangling artifact ref | Issue: artifact_pinning error | `preflight_test.go` |
| Preflight: quota | Insufficient credits | Issue: quota error | `preflight_test.go` |
| Preflight: tool version | Deprecated tool version | Issue: tool_version error | `preflight_test.go` |

### Integration Tests

| Test | Scope | Steps | Expected |
|------|-------|-------|----------|
| Full compile pipeline | Compiler E2E | Feed YAML fixture -> Parser -> Resolver -> DAG Builder -> Type Checker -> AST | AST with correct execution levels |
| Compile + validate | Compiler + Validator | Compile valid workflow, then validate | No errors, possible lint warnings |
| Compile invalid workflow | Compiler + Validator | Compile workflow with cycle + type mismatch + bad refs | Multiple errors from different checks |
| Frontend compile round-trip | Frontend + API | Canvas -> serialize -> compile API -> display results | Errors/warnings display in ValidationPanel |

### Manual QA

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Happy path compile | Draw 3-node workflow, click Compile | Green success, Publish button enabled |
| 2 | Compile with errors | Draw workflow with disconnected node, click Compile | Red errors in ValidationPanel, Publish disabled |
| 3 | Fix and recompile | Fix error, click Compile again | Errors cleared, Publish enabled |
| 4 | Publish workflow | After clean compile, click Publish, enter version info | Published successfully, version badge updates |
| 5 | Compile empty canvas | Click Compile with no nodes | Appropriate error message |

---

## 9. Definition of Done

- [ ] 5-stage compiler pipeline passes integration tests with 5 YAML fixtures
- [ ] 7-check validator passes 14+ test cases (2 per check minimum)
- [ ] Dual expression syntax translates correctly for 10 expression patterns
- [ ] Expression round-trip (canvas -> DSL -> canvas) preserves semantics
- [ ] Preflight 6 universal checks tested with pass and fail cases
- [ ] Domain validator hook interface defined with no-op fallback
- [ ] Frontend `canvasToYaml()` output compiles without parser errors
- [ ] Compile button wired to real API endpoint
- [ ] Publish button wired to real API endpoint, disabled until compile succeeds
- [ ] ValidationPanel shows errors/warnings with per-node highlighting
- [ ] All backend tests pass (`go test ./internal/workflow/...`)
- [ ] No compiler regressions (existing tests still pass)

---

## 10. Dependencies & Blockers

| Dependency | Type | Status | Impact |
|------------|------|--------|--------|
| Phase 1 complete (tool registry populated) | Hard | Expected 2026-04-27 | Check 5 (tool availability) needs real tools in DB |
| `internal/workflow/compiler.go` exists | Soft | Exists | Verify, not build from scratch |
| `internal/workflow/validator.go` exists | Soft | Exists | Verify, not build from scratch |
| `internal/service/preflight.go` exists | Soft | Exists | Verify, add domain hook |
| IntentType registry for domain validators | Soft | Phase 4 | Use no-op fallback until Phase 4 |
| `frontend/src/utils/canvasToYaml.ts` exists | Soft | Exists | Verify against compiler expectations |

---

## 11. Sprint Velocity & Estimates

| Category | Tasks | Total Hours | Percentage |
|----------|-------|-------------|------------|
| Backend Development | 4 tasks | 21 hours | 60% |
| Frontend Development | 3 tasks | 12 hours | 34% |
| Testing & QA | (included in tasks) | -- | -- |
| Sprint Overhead | Standup, review, retro | 2 hours | 6% |
| **Total** | **7 tasks** | **35 hours** | **100%** |

---

## 12. Rollback Plan

If Sprint 2.1 reveals fundamental issues with the compiler:
1. Compiler bugs: fix in place; the compiler code exists and just needs corrections, not rewrites
2. Expression translation failures: fall back to DSL-only mode (disable canvas expressions temporarily)
3. Preflight too strict: make non-critical checks produce warnings instead of errors
4. Frontend serialization mismatch: manually verify YAML output against compiler input spec and fix serializer

---
---

# SPRINT 2.2: WORKFLOW EXECUTION & SCHEDULING

---

## 1. Sprint Metadata

| Field | Value |
|-------|-------|
| **Sprint ID** | 2.2 |
| **Sprint Name** | Workflow Execution & Scheduling |
| **Phase** | 2 -- Workflow Engine Completion |
| **Duration** | 3 days |
| **Start Date** | 2026-05-01 |
| **End Date** | 2026-05-03 |
| **Goal** | Execute compiled workflows with topological scheduling, parallel NATS dispatch, full NodeRun state machine (8 states), retry with exponential backoff, and condition/switch branch evaluation. Wire frontend run monitor with live status badges, log viewer, and artifact browser. |
| **Dependencies** | Sprint 2.1 complete (compiler and validator verified). NATS JetStream running. Rust Runner operational (Phase 1). |
| **Risks** | NATS message ordering under parallel dispatch. State machine transitions under concurrent node completions. SSE connection stability for live updates. |
| **Mitigation** | Use NATS JetStream for at-least-once delivery. Serialize state transitions with DB-level locking. SSE with 3s poll fallback. |

---

## 2. Objectives & Key Results

| # | Objective | Key Result | Measurement |
|---|-----------|------------|-------------|
| O1 | Multi-node workflows execute with correct topological order | 3-node linear workflow: nodes execute in exact sequence. 4-node parallel workflow: independent nodes dispatch simultaneously. | Integration test timing validates dispatch order |
| O2 | NodeRun state machine handles all 8 transitions | All 8 states (QUEUED, RUNNING, SUCCEEDED, FAILED, RETRYING, BLOCKED, SKIPPED, CANCELED) reachable and correctly transitioned | State machine test covers all valid transitions |
| O3 | Retry with exponential backoff works correctly | Node fails -> retries with wait_between_sec * 2^attempt -> exhausts retries -> FAILED | Timing test validates backoff intervals |
| O4 | Condition/Switch evaluation routes correctly | IF node: true condition -> branch A executes, branch B SKIPPED. Switch node: matches correct case. | Branch test validates routing and SKIPPED status |
| O5 | Frontend shows live execution status | SSE events update node badges in real-time (spinner, green check, red X) | Manual QA walkthrough with real workflow run |

---

## 3. Architecture Context

### Topological Scheduler Event Loop

```
SCHEDULER LOOP (event-driven, per-run):

  1. INITIALIZE
     ├── Load compiled AST with execution levels
     ├── Create NodeRun records for all nodes (status: BLOCKED)
     ├── Build in-degree map from DAG edges
     ├── Seed ready queue with in-degree-0 nodes (triggers)
     └── Transition Run: PENDING -> RUNNING

  2. DISPATCH LOOP
     ├── While ready queue is not empty:
     │   ├── Dequeue node
     │   ├── Resolve input expressions against current runData
     │   ├── Run preflight validation for this node
     │   ├── Build JobPayload (inputs, artifact URLs, limits)
     │   ├── Publish to NATS subject (tool or agent)
     │   ├── Create/update NodeRun: QUEUED
     │   └── Emit SSE event: NODE_QUEUED
     │
     ├── WAIT for results on airaie.results.completed
     │
     ├── On RESULT received:
     │   ├── Update NodeRun: RUNNING -> SUCCEEDED or FAILED
     │   ├── Store output data in runData[node_id]
     │   ├── Create artifact records if any
     │   ├── For each child node:
     │   │   ├── Decrement child's in-degree
     │   │   └── If child in-degree = 0 -> add to ready queue
     │   ├── If node FAILED:
     │   │   ├── Check retry config -> RETRYING or FAILED
     │   │   ├── If FAILED + critical: abort run
     │   │   └── If FAILED + non-critical: SKIP downstream
     │   └── Emit SSE events: NODE_COMPLETED / NODE_FAILED
     │
     └── Continue dispatch loop

  3. COMPLETION
     ├── When ready queue empty AND all nodes terminal:
     │   ├── If any critical node FAILED -> Run: FAILED
     │   ├── Else -> Run: SUCCEEDED
     │   └── Publish to airaie.execution.completed
     └── Emit SSE event: RUN_COMPLETED / RUN_FAILED
```

### NodeRun 8-State Machine

```
                     ┌────────────┐
                     │   BLOCKED  │ <-- (waiting for dependency or approval)
                     └──────┬─────┘
                            │ (dependency satisfied / approved)
                            v
  ┌────────┐     ┌─────────┐     ┌───────────┐
  │ QUEUED │ --> │ RUNNING │ --> │ SUCCEEDED │
  └────────┘     └────┬────┘     └───────────┘
                      │
                      ├--> ┌────────┐     ┌──────────┐
                      │    │ FAILED │ --> │ RETRYING │ --> (back to QUEUED)
                      │    └────────┘     └──────────┘
                      │
                      ├--> ┌─────────┐
                      │    │ SKIPPED │
                      │    └─────────┘
                      │
                      └--> ┌──────────┐
                           │ CANCELED │
                           └──────────┘

Valid Transitions:
  BLOCKED   -> QUEUED      (all dependencies satisfied)
  BLOCKED   -> SKIPPED     (upstream branch not taken)
  QUEUED    -> RUNNING     (runner picks up job)
  RUNNING   -> SUCCEEDED   (container exit 0, outputs captured)
  RUNNING   -> FAILED      (container exit non-zero, timeout, OOM)
  RUNNING   -> CANCELED    (user cancels run)
  FAILED    -> RETRYING    (retry config exists, attempts remaining)
  RETRYING  -> QUEUED      (backoff elapsed, re-dispatch)
  FAILED    -> FAILED      (retries exhausted, terminal)
  any       -> CANCELED    (user cancels entire run)
```

### Retry with Exponential Backoff

```
Configuration per node:
  {
    "retry": {
      "max_retries": 3,
      "wait_between_sec": 10,
      "backoff": "exponential"   // "fixed" | "exponential"
    }
  }

Exponential backoff formula:
  delay = wait_between_sec * 2^(attempt - 1) + jitter

  Attempt 1 failure: wait 10s  (10 * 2^0)
  Attempt 2 failure: wait 20s  (10 * 2^1)
  Attempt 3 failure: wait 40s  (10 * 2^2)
  Attempt 4: retries exhausted -> FAILED (terminal)

Jitter: random 0-25% of delay to prevent thundering herd
```

### NATS Message Flow

```
DISPATCH (Scheduler -> Runner):
  Subject: airaie.jobs.tool.execution
  Payload: {
    job_id:      "job_abc123",
    run_id:      "run_xyz789",
    node_id:     "fea_solver_1",
    tool_ref:    "fea-solver@2.1.0",
    image:       "registry.airaie.io/fea-solver:2.1",
    adapter:     "docker",
    inputs:      [{ name: "mesh_file", artifact_id: "art_002" }, ...],
    limits:      { cpu: 4, memory_mb: 2048, timeout_sec: 300 },
    policy:      { network: "deny", fs: "sandbox" },
    artifact_urls: { art_002: "https://minio/presigned/download" },
    output_upload_urls: { result: "https://minio/presigned/upload" }
  }

RESULT (Runner -> ResultHandler):
  Subject: airaie.results.completed
  Payload: {
    job_id:    "job_abc123",
    run_id:    "run_xyz789",
    node_id:   "fea_solver_1",
    status:    "SUCCEEDED" | "FAILED",
    outputs:   [{ name: "result", artifact_id: "art_003" }],
    metrics:   { max_stress: 187.3, safety_factor: 1.34 },
    logs:      "...",
    cost:      0.50,
    duration_ms: 15000,
    error:     null | { code: "TIMEOUT", message: "..." }
  }

SSE EVENTS (Scheduler -> Frontend):
  Subject: airaie.events.{runId}
  Payload: {
    event_type: "NODE_STARTED" | "NODE_COMPLETED" | "NODE_FAILED" | ...,
    run_id:     "run_xyz789",
    node_id:    "fea_solver_1",
    timestamp:  "2026-04-06T10:42:22Z",
    data:       { ... event-specific ... }
  }
```

---

## 4. Task Breakdown

### 4.1 Backend Tasks

#### Task 2.2.B1: Verify Topological Scheduler (Integration Test)

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/scheduler.go` |
| **What Exists** | Scheduler exists with topological dispatch logic |
| **What To Do** | Write integration tests that verify: (1) Linear DAG executes nodes in sequence. (2) Parallel DAG dispatches independent nodes simultaneously. (3) Merge node waits for all upstream before dispatching. (4) 6+ node complex DAG with mixed parallel/sequential. Record dispatch timestamps to verify ordering. |
| **Complexity** | M |
| **Estimated Hours** | 6 |

**Subtasks:**
1. Create test DAG: Linear (A -> B -> C). Verify A dispatches first, B after A completes, C after B completes.
2. Create test DAG: Parallel (A -> [B, C] -> D). Verify B and C dispatch simultaneously after A. D dispatches only after both B and C complete.
3. Create test DAG: Complex (A -> [B, C], B -> D, C -> D, D -> [E, F]). Verify execution levels: {A}, {B,C}, {D}, {E,F}.
4. Mock NATS publish and capture dispatch order and timing.
5. Mock result handler to simulate node completions with configurable delays.
6. Assert in-degree map correctly computed from DAG edges.
7. Assert ready queue seeded with only root nodes (in-degree 0).
8. Assert after each mock completion, correct children become ready.

**Acceptance Criteria for Task:**
- [ ] Linear DAG: nodes execute strictly in sequence
- [ ] Parallel DAG: independent nodes dispatch within 100ms of each other
- [ ] Merge node waits for all upstream completions
- [ ] Complex DAG: execution levels match expected grouping

---

#### Task 2.2.B2: Verify NATS Dispatch/Consume (E2E Test)

| Field | Value |
|-------|-------|
| **File** | `internal/service/run.go` |
| **What Exists** | Dispatch and result consumer exist |
| **What To Do** | End-to-end test with real NATS: dispatch 3 nodes -> verify NATS messages published to correct subjects -> verify result consumption -> verify status updates in DB. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. Set up test with real NATS JetStream connection (or embedded NATS for testing)
2. Create 3-node workflow and trigger a run
3. Verify 3 messages published to `airaie.jobs.tool.execution` with correct payloads (job_id, run_id, node_id, tool_ref, inputs)
4. Verify presigned URLs are generated for input artifacts (download) and output artifacts (upload) and included in JobPayload
5. Simulate runner responses: publish 3 results to `airaie.results.completed`
6. Verify ResultHandler processes each result: NodeRun status updated in PostgreSQL
7. Verify runData map populated with output data from each result
8. Verify SSE events emitted to `airaie.events.{runId}` for each state transition
9. Verify run transitions to SUCCEEDED after all 3 nodes complete

**Acceptance Criteria for Task:**
- [ ] 3 jobs published to NATS with correct payloads
- [ ] 3 results consumed and processed
- [ ] NodeRun statuses updated correctly in DB
- [ ] Run status transitions: PENDING -> RUNNING -> SUCCEEDED

---

#### Task 2.2.B3: NodeRun 8-State Machine Verification

| Field | Value |
|-------|-------|
| **File** | `internal/model/run.go` |
| **What Exists** | NodeRun model exists with status field |
| **What To Do** | Verify all 8 state transitions are correctly enforced. Test each valid transition. Verify invalid transitions are rejected (e.g., SUCCEEDED -> RUNNING should be rejected). |
| **Complexity** | M |
| **Estimated Hours** | 4 |

**Subtasks:**
1. Define state transition table as test fixture:
   ```
   BLOCKED  -> QUEUED     (dependency satisfied)
   BLOCKED  -> SKIPPED    (branch not taken)
   QUEUED   -> RUNNING    (runner picks up)
   RUNNING  -> SUCCEEDED  (exit 0)
   RUNNING  -> FAILED     (exit non-zero / timeout / OOM)
   RUNNING  -> CANCELED   (user cancel)
   FAILED   -> RETRYING   (retry available)
   RETRYING -> QUEUED     (backoff elapsed)
   ```
2. Test each valid transition: call `TransitionNodeRun(nodeRunID, newStatus)` and verify DB update
3. Test invalid transitions and verify rejection:
   - SUCCEEDED -> RUNNING (invalid)
   - SKIPPED -> RUNNING (invalid)
   - CANCELED -> RUNNING (invalid)
   - QUEUED -> SUCCEEDED (invalid -- must go through RUNNING)
4. Test CANCELED propagation: when run is canceled, all QUEUED and RUNNING nodes -> CANCELED
5. Test SKIPPED propagation: when IF condition selects branch A, all nodes in branch B -> SKIPPED (recursively)
6. Verify NodeRun `attempt` counter increments on RETRYING -> QUEUED transition

**Acceptance Criteria for Task:**
- [ ] All 8 valid transitions succeed
- [ ] Invalid transitions are rejected with descriptive error
- [ ] CANCELED propagates to all active nodes
- [ ] SKIPPED propagates to downstream nodes of unselected branch

---

#### Task 2.2.B4: Retry with Exponential Backoff

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/scheduler.go` |
| **What Exists** | Retry logic exists |
| **What To Do** | Test retry behavior: node fails -> transitions to RETRYING -> waits backoff duration -> re-dispatches -> retries up to max_retries -> FAILED if exhausted. Verify exponential backoff timing. |
| **Complexity** | S |
| **Estimated Hours** | 3 |

**Subtasks:**
1. Configure test node with `max_retries: 3, wait_between_sec: 1, backoff: "exponential"`
2. Simulate node failure (exit code 1)
3. Verify transition: RUNNING -> FAILED -> RETRYING (attempt 1)
4. Verify backoff delay: ~1s (1 * 2^0) before re-dispatch
5. Simulate second failure -> RETRYING (attempt 2) -> backoff ~2s (1 * 2^1)
6. Simulate third failure -> RETRYING (attempt 3) -> backoff ~4s (1 * 2^2)
7. Simulate fourth failure -> retries exhausted -> FAILED (terminal)
8. Verify attempt counter: 1, 2, 3, 4 (4th is the final attempt that exceeds max)
9. Test fixed backoff mode: verify constant delay instead of exponential
10. Verify that during RETRYING, the node is not considered "complete" for dependency resolution

**Acceptance Criteria for Task:**
- [ ] Retry triggers on node failure when retry config exists
- [ ] Exponential backoff: delays are 1x, 2x, 4x of base interval
- [ ] Retries exhausted -> terminal FAILED
- [ ] Fixed backoff mode uses constant delay

---

#### Task 2.2.B5: Condition/Switch Evaluation

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/` (condition evaluator in scheduler.go or separate file) |
| **What Exists** | Condition evaluator exists |
| **What To Do** | Test: IF node evaluates expression at runtime and routes to correct branch. Switch node matches correct case. Unselected branch nodes are SKIPPED. |
| **Complexity** | M |
| **Estimated Hours** | 4 |

**Subtasks:**
1. Test IF node (true branch):
   - Workflow: Trigger -> FEA -> IF(stress < 250) -> [Analyzer (true), Optimizer (false)]
   - runData has FEA output: max_stress = 187.3
   - Expression `{{ $('FEA').json.max_stress < 250 }}` evaluates to true
   - Verify: Analyzer dispatched, Optimizer SKIPPED
2. Test IF node (false branch):
   - Same workflow, runData has max_stress = 300
   - Expression evaluates to false
   - Verify: Optimizer dispatched, Analyzer SKIPPED
3. Test Switch node:
   - Switch on `{{ $('Trigger').json.material_category }}`
   - Cases: "metal" -> Metal Analysis, "polymer" -> Polymer Analysis, "composite" -> Composite Analysis
   - Input: material_category = "polymer"
   - Verify: only Polymer Analysis dispatched, others SKIPPED
4. Test Switch node with default:
   - Input: material_category = "ceramic" (no matching case)
   - Verify: default branch dispatched
5. Test nested condition: IF -> IF (condition inside a branch)
6. Verify SKIPPED propagation: if Optimizer is SKIPPED, all nodes downstream of Optimizer are also SKIPPED
7. Test condition with complex expression: `{{ $('A').json.x > 10 && $('B').json.y < 5 }}`

**Acceptance Criteria for Task:**
- [ ] IF true branch: correct downstream executes, other SKIPPED
- [ ] IF false branch: correct downstream executes, other SKIPPED
- [ ] Switch: correct case matches, all others SKIPPED
- [ ] Switch default: used when no case matches
- [ ] SKIPPED propagates recursively to all downstream nodes of unselected branch

---

### 4.2 Frontend Tasks

#### Task 2.2.F1: Run Monitor -- Live Execution Badges

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/WorkflowRunsPage.tsx`, `frontend/src/components/workflows/runs/RunStatusBadge.tsx`, `frontend/src/components/workflows/nodes/NodeStatusBadge.tsx` |
| **What Exists** | Runs page exists with some run list rendering. Node status badge components exist. |
| **What To Do** | Wire SSE event stream from `GET /v0/runs/{id}/events` (SSE endpoint). On `NODE_QUEUED` -> gray clock icon. On `NODE_STARTED` -> blue spinner. On `NODE_COMPLETED` -> green check. On `NODE_FAILED` -> red X. On `NODE_RETRYING` -> orange retry icon. On `NODE_SKIPPED` -> gray slash. Add 3-second poll fallback when SSE connection drops. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. Establish SSE connection to `GET /v0/runs/{id}/events` when viewing a run
2. Parse SSE events using `frontend/src/utils/sseParser.ts`
3. On `NODE_QUEUED`: update node badge to gray clock icon, set tooltip "Queued"
4. On `NODE_STARTED`: update node badge to animated blue spinner, set tooltip "Running"
5. On `NODE_COMPLETED`: update node badge to green check icon, set tooltip "Succeeded (Xs)"
6. On `NODE_FAILED`: update node badge to red X icon, set tooltip "Failed: {error_message}"
7. On `NODE_RETRYING`: update node badge to orange retry icon, set tooltip "Retrying (attempt N/max)"
8. On `NODE_SKIPPED`: update node badge to gray slash icon, set tooltip "Skipped"
9. On `RUN_COMPLETED`: show overall success banner, stop SSE connection
10. On `RUN_FAILED`: show overall failure banner with error summary
11. Implement 3-second poll fallback: if SSE connection drops, poll `GET /v0/runs/{id}` every 3 seconds
12. Clean up SSE connection on component unmount
13. Show elapsed time per running node (update every second)

**SSE Event Types:**
```typescript
type RunSSEEvent =
  | { event_type: "NODE_QUEUED"; node_id: string }
  | { event_type: "NODE_STARTED"; node_id: string }
  | { event_type: "NODE_COMPLETED"; node_id: string; data: { duration_ms: number; cost: number } }
  | { event_type: "NODE_FAILED"; node_id: string; data: { error: string; attempt: number } }
  | { event_type: "NODE_RETRYING"; node_id: string; data: { attempt: number; max_retries: number; next_retry_at: string } }
  | { event_type: "NODE_SKIPPED"; node_id: string; data: { reason: string } }
  | { event_type: "RUN_COMPLETED"; data: { duration_ms: number; total_cost: number } }
  | { event_type: "RUN_FAILED"; data: { error: string; failed_node: string } }
  | { event_type: "RUN_CANCELED" }
  | { event_type: "NODE_LOG"; node_id: string; data: { line: string; stream: "stdout" | "stderr" } };
```

**Acceptance Criteria for Task:**
- [ ] Node badges update in real-time as SSE events arrive
- [ ] All 8 node states display with correct icon and tooltip
- [ ] Poll fallback activates within 3 seconds of SSE disconnect
- [ ] SSE connection cleans up on unmount

---

#### Task 2.2.F2: Run Monitor -- Log Viewer

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/workflows/runs/LogViewer.tsx` |
| **What Exists** | LogViewer component exists |
| **What To Do** | Wire to `GET /v0/runs/{id}/logs` for full logs and SSE `NODE_LOG` events for live streaming. Add auto-scroll, node filtering, search, copy, and download buttons. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. Fetch historical logs on mount: `GET /v0/runs/{id}/logs` -> display full log output
2. Subscribe to live log events via SSE: `NODE_LOG` events append to log display in real-time
3. Implement auto-scroll: automatically scroll to bottom as new log lines arrive. Toggle to disable auto-scroll when user scrolls up.
4. Implement node filter dropdown: select a specific node to show only its logs. "All Nodes" option shows interleaved logs.
5. Implement stream filter: toggle stdout (white) and stderr (red) separately
6. Implement search: text input filters visible log lines (highlight matches)
7. Implement timestamp display: show ISO timestamp prefix on each log line
8. Implement copy button: copy visible (filtered) log lines to clipboard
9. Implement download button: download full log as `.log` text file
10. Style: monospace font, dark background, colored output (stdout white, stderr red/orange, system messages gray)

**API:**
```
GET /v0/runs/{id}/logs
  Query: ?node_id=fea_solver_1 (optional filter)
  Response: {
    logs: [
      { timestamp: "...", node_id: "...", stream: "stdout", line: "..." },
      ...
    ]
  }
```

**Acceptance Criteria for Task:**
- [ ] Historical logs load on component mount
- [ ] Live log lines append via SSE
- [ ] Node filter shows only selected node's logs
- [ ] Copy and download buttons work
- [ ] Auto-scroll toggles correctly

---

#### Task 2.2.F3: Run Monitor -- Artifact Browser

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/workflows/runs/ArtifactsTab.tsx` |
| **What Exists** | ArtifactsTab component exists |
| **What To Do** | Wire to `GET /v0/runs/{id}/artifacts`. Display artifact list with name, type, size, SHA-256 hash, producing node, and download link. |
| **Complexity** | S |
| **Estimated Hours** | 3 |

**Subtasks:**
1. Fetch artifacts on mount: `GET /v0/runs/{id}/artifacts`
2. Render artifact table with columns: Name, Type (MIME), Size (formatted), SHA-256 (truncated with copy), Producing Node, Created At
3. Add download button per artifact: calls `GET /v0/artifacts/{id}/download-url` to get presigned URL, then opens download
4. Add artifact type icon: different icons for VTK, STL, CSV, JSON, PDF, image files
5. Add size formatting: bytes -> KB/MB/GB with 2 decimal places
6. Add SHA-256 display: show first 12 chars with tooltip showing full hash, click to copy
7. Show total artifact count and total size in header
8. Empty state: "No artifacts produced" when run produced no artifacts

**API:**
```
GET /v0/runs/{id}/artifacts
  Response: {
    artifacts: [
      {
        id: "art_003",
        name: "stress_result.vtk",
        mime_type: "application/vtk",
        size_bytes: 4521984,
        sha256: "a1b2c3d4e5f6...",
        node_id: "fea_solver_1",
        created_at: "2026-04-06T10:42:22Z"
      },
      ...
    ]
  }

GET /v0/artifacts/{id}/download-url
  Response: { url: "https://minio/presigned/..." , expires_at: "..." }
```

**Acceptance Criteria for Task:**
- [ ] Artifact table renders with all columns populated
- [ ] Download button generates presigned URL and initiates download
- [ ] SHA-256 copyable with click
- [ ] Empty state displays when no artifacts exist

---

## 5. API Endpoints

All endpoints exist. This sprint verifies real execution.

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| `POST` | `/v0/runs` | Create and start a workflow run | Verify dispatch |
| `GET` | `/v0/runs/{id}` | Get run status and details | Verify updates |
| `GET` | `/v0/runs/{id}/events` | SSE event stream for real-time updates | Verify streaming |
| `GET` | `/v0/runs/{id}/logs` | Get run logs | Verify log capture |
| `GET` | `/v0/runs/{id}/artifacts` | Get artifacts produced by run | Verify artifact records |
| `POST` | `/v0/runs/{id}/cancel` | Cancel a running workflow | Verify CANCELED propagation |
| `GET` | `/v0/artifacts/{id}/download-url` | Get presigned download URL | Verify presigned URL |

---

## 6. Data Models

### Run (existing, verify fields)

```go
type Run struct {
    ID            string          `json:"id"`
    ProjectID     string          `json:"project_id"`
    WorkflowID    string          `json:"workflow_id"`
    RunType       string          `json:"run_type"`      // "workflow"
    Status        RunStatus       `json:"status"`        // PENDING|RUNNING|SUCCEEDED|FAILED|CANCELED|AWAITING_APPROVAL
    InputsJSON    json.RawMessage `json:"inputs_json"`
    OutputsJSON   json.RawMessage `json:"outputs_json"`
    Actor         string          `json:"actor"`
    CostEstimate  float64         `json:"cost_estimate"`
    CostActual    float64         `json:"cost_actual"`
    StartedAt     *time.Time      `json:"started_at"`
    CompletedAt   *time.Time      `json:"completed_at"`
    CreatedAt     time.Time       `json:"created_at"`
}
```

### NodeRun (existing, verify fields)

```go
type NodeRun struct {
    ID              string        `json:"id"`
    RunID           string        `json:"run_id"`
    NodeID          string        `json:"node_id"`
    JobID           string        `json:"job_id"`
    ToolRef         string        `json:"tool_ref"`
    Status          NodeRunStatus `json:"status"`  // QUEUED|RUNNING|SUCCEEDED|FAILED|RETRYING|BLOCKED|SKIPPED|CANCELED
    Attempt         int           `json:"attempt"`
    MaxRetries      int           `json:"max_retries"`
    OutputArtifacts []string      `json:"output_artifacts"`
    OutputData      json.RawMessage `json:"output_data"`
    ErrorMessage    string        `json:"error_message,omitempty"`
    CostEstimate    float64       `json:"cost_estimate"`
    CostActual      float64       `json:"cost_actual"`
    StartedAt       *time.Time    `json:"started_at"`
    CompletedAt     *time.Time    `json:"completed_at"`
}
```

### JobPayload (NATS message)

```go
type JobPayload struct {
    JobID            string            `json:"job_id"`
    RunID            string            `json:"run_id"`
    NodeID           string            `json:"node_id"`
    ToolRef          string            `json:"tool_ref"`
    Image            string            `json:"image"`
    Adapter          string            `json:"adapter"`
    Inputs           []JobInput        `json:"inputs"`
    Limits           ResourceLimits    `json:"limits"`
    Policy           SandboxPolicy     `json:"policy"`
    ArtifactURLs     map[string]string `json:"artifact_urls"`
    OutputUploadURLs map[string]string `json:"output_upload_urls"`
}
```

---

## 7. NATS Events

| Subject | Publisher | Subscriber | Payload |
|---------|-----------|------------|---------|
| `airaie.jobs.tool.execution` | Scheduler | Rust Runner | JobPayload |
| `airaie.jobs.agent.execution` | Scheduler | Agent Runtime | JobPayload (with agent config) |
| `airaie.results.completed` | Runner | ResultHandler | JobResult |
| `airaie.events.{runId}` | Scheduler | SSE endpoint / Frontend | RunEvent |
| `airaie.jobs.approval.wait` | Scheduler | Approval system | ApprovalRequest |
| `airaie.execution.completed` | Scheduler | Downstream consumers | RunCompletionEvent |

---

## 8. Test Plan

### Unit Tests

| Test | Input | Expected | File |
|------|-------|----------|------|
| In-degree computation | DAG edges | Correct in-degree per node | `scheduler_test.go` |
| Ready queue seeding | DAG | Only root nodes in initial queue | `scheduler_test.go` |
| Dependency resolution | Node completion | Correct children become ready | `scheduler_test.go` |
| State transition BLOCKED->QUEUED | Dependency satisfied | NodeRun status QUEUED | `run_test.go` |
| State transition RUNNING->FAILED | Exit code 1 | NodeRun status FAILED | `run_test.go` |
| State transition FAILED->RETRYING | Retry config exists | NodeRun status RETRYING, attempt++ | `run_test.go` |
| Invalid transition SUCCEEDED->RUNNING | -- | Error: invalid transition | `run_test.go` |
| Exponential backoff calculation | attempt=1,2,3 | delays 10,20,40 | `scheduler_test.go` |
| Fixed backoff calculation | attempt=1,2,3 | delays 10,10,10 | `scheduler_test.go` |
| IF condition true | expression=true | True branch dispatched | `condition_test.go` |
| IF condition false | expression=false | False branch dispatched | `condition_test.go` |
| Switch case match | value="polymer" | Polymer branch dispatched | `condition_test.go` |
| Switch default | value="unknown" | Default branch dispatched | `condition_test.go` |
| SKIPPED propagation | Branch not taken | All downstream SKIPPED | `scheduler_test.go` |
| CANCELED propagation | Run cancel | All active nodes CANCELED | `scheduler_test.go` |

### Integration Tests

| Test | Scope | Steps | Expected |
|------|-------|-------|----------|
| Linear workflow execution | Scheduler + NATS + DB | Trigger 3-node linear workflow, mock runner responses | Nodes execute in sequence, run SUCCEEDED |
| Parallel workflow execution | Scheduler + NATS | Trigger parallel DAG, verify simultaneous dispatch | Independent nodes dispatched within 100ms |
| Retry exhaustion | Scheduler + NATS | Node fails 4 times with max_retries=3 | 3 retries attempted, then FAILED |
| Condition routing | Scheduler + Condition | IF node with true condition | True branch executes, false branch SKIPPED |
| Run cancellation | Scheduler + DB | Cancel running workflow | All active nodes CANCELED |
| Full 6-node workflow | All components | Complex DAG end-to-end | Correct execution order, all statuses correct |

### Manual QA

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Watch live execution | Trigger workflow, watch RunsPage | Node badges update in real-time via SSE |
| 2 | View logs | Click on running workflow, open LogViewer | Live log lines appear as container runs |
| 3 | Browse artifacts | After workflow completes, open ArtifactsTab | Artifacts listed with download links |
| 4 | Cancel run | Trigger workflow, click Cancel | All nodes transition to CANCELED |
| 5 | SSE disconnect recovery | Trigger workflow, disconnect network briefly | Poll fallback keeps UI updated |

---

## 9. Definition of Done

- [ ] Linear workflow executes nodes in correct topological order
- [ ] Parallel workflow dispatches independent nodes simultaneously
- [ ] NATS dispatch/consume verified end-to-end with real messages
- [ ] NodeRun 8-state machine: all valid transitions tested, invalid rejected
- [ ] Retry with exponential backoff: timing verified for 3 retry cycles
- [ ] IF condition routes to correct branch, other branch SKIPPED
- [ ] Switch routes to matching case, others SKIPPED
- [ ] SKIPPED propagates recursively to all downstream nodes
- [ ] Frontend node badges update via SSE in real-time
- [ ] LogViewer shows live logs with node filtering and auto-scroll
- [ ] ArtifactsTab shows artifact list with download links
- [ ] 3-second poll fallback works when SSE disconnects
- [ ] All backend tests pass

---

## 10. Dependencies & Blockers

| Dependency | Type | Status | Impact |
|------------|------|--------|--------|
| Sprint 2.1 complete (compiler verified) | Hard | In progress | Need compiled AST to feed scheduler |
| NATS JetStream running | Hard | Available | Required for dispatch/consume |
| Rust Runner operational | Hard | Phase 1 verified | Required for real tool execution |
| PostgreSQL with runs/node_runs tables | Hard | Available | State persistence |
| MinIO with presigned URL support | Hard | Available | Artifact download/upload |
| SSE endpoint `GET /v0/runs/{id}/events` | Soft | Exists | Verify real event streaming |

---

## 11. Sprint Velocity & Estimates

| Category | Tasks | Total Hours | Percentage |
|----------|-------|-------------|------------|
| Backend Development | 5 tasks | 22 hours | 56% |
| Frontend Development | 3 tasks | 13 hours | 33% |
| Testing & QA | (included in tasks) | -- | -- |
| Sprint Overhead | Standup, review, retro | 2 hours | 5% |
| Buffer | Integration issues | 2 hours | 5% |
| **Total** | **8 tasks** | **39 hours** | **100%** |

---

## 12. Rollback Plan

If Sprint 2.2 reveals scheduler issues:
1. NATS connectivity: fall back to synchronous in-process dispatch for testing (no NATS)
2. State machine bugs: add transition logging and audit trail for debugging
3. SSE not working: use poll-only mode at 3-second intervals (already the fallback)
4. Retry timing issues: use fixed backoff instead of exponential as interim

---
---

# SPRINT 2.3: EXPRESSION SYSTEM & DATA FLOW

---

## 1. Sprint Metadata

| Field | Value |
|-------|-------|
| **Sprint ID** | 2.3 |
| **Sprint Name** | Expression System & Data Flow |
| **Phase** | 2 -- Workflow Engine Completion |
| **Duration** | 4 days |
| **Start Date** | 2026-05-05 |
| **End Date** | 2026-05-08 |
| **Goal** | Ensure data flows correctly between workflow nodes via expressions. Add board context expressions ($board.*), gate/cost expressions ($gate, $cost). Build CodeMirror 6 expression editor with autocomplete. Build Node Inspector with input/output panels. Build ParameterForm auto-generated from ToolContract. |
| **Dependencies** | Sprint 2.2 complete (scheduler dispatches and resolves expressions at runtime). |
| **Risks** | CodeMirror 6 integration complexity. Board context requires board-linked runs (Phase 4 dependency). ToolContract schema variability (many field types). |
| **Mitigation** | Board context: test with mock board data, real integration in Phase 5. ToolContract: handle all 7 sections with graceful fallback for unknown types. |

---

## 2. Objectives & Key Results

| # | Objective | Key Result | Measurement |
|---|-----------|------------|-------------|
| O1 | Expressions resolve correctly at dispatch time | 15 expression patterns resolve to correct values from runData | All 15 expression tests pass |
| O2 | Board context expressions work for board-linked runs | `$board.meta.*`, `$board.artifacts.*`, `$board.mode` resolve when run has board_id | 5 board expression tests pass with mock board data |
| O3 | Gate/cost expressions accessible | `$gate('Name').status`, `$gate('Name').passed`, `$cost.total`, `$cost.remaining` resolve | 4 gate/cost expression tests pass |
| O4 | Expression editor provides productive editing experience | CodeMirror 6 editor with {{ }} syntax highlighting, autocomplete for node references, variable popup | Manual QA: type expression, get autocomplete suggestions |
| O5 | Node Inspector shows input/output data clearly | Input Panel shows upstream data, Output Panel shows execution results, expression toggle per parameter | Manual QA: inspect node, see correct data in both panels |
| O6 | ParameterForm auto-generates from ToolContract | Form fields generated for all ToolContract input types: artifact, number, string, enum, boolean, JSON | 6 field type tests pass |

---

## 3. Architecture Context

### Expression Resolution at Dispatch Time

```
WHEN: The scheduler is about to dispatch a node for execution.
WHERE: internal/workflow/scheduler.go (dispatch path)
HOW:

  1. Scheduler loads the node's parameter configuration from the AST
  2. For each parameter value that contains {{ }}:
     a. Parse the expression string
     b. Identify variable references:
        - $('NodeName').json.field     -> lookup runData["node_id"].data.json.field
        - $('NodeName').artifacts.name -> lookup runData["node_id"].data.artifacts.name
        - $trigger.json.field          -> lookup runData["trigger_node_id"].data.json.field
        - $run.id                      -> current run ID
        - $workflow.name               -> workflow name
        - $now                         -> current ISO timestamp
        - $env.VAR                     -> environment variable lookup
        - $board.meta.field            -> board metadata (when board-linked)
        - $board.artifacts.name        -> board artifact reference
        - $board.mode                  -> current board mode (Explore/Study/Release)
        - $gate('Name').status         -> gate evaluation result
        - $gate('Name').passed         -> boolean: did gate pass
        - $cost.total                  -> accumulated run cost
        - $cost.remaining              -> budget - total
     c. Substitute resolved values into the expression
     d. Evaluate arithmetic/comparison if present
     e. Return resolved value
  3. Resolved values are placed into the JobPayload inputs
  4. If any expression references a node that hasn't completed -> ERROR (should not happen
     because topological ordering ensures dependencies are complete)

EXAMPLE:
  Parameter: "threshold": "{{ $('Webhook').json.threshold }}"
  runData["webhook_1"].data.json = { material: "Al6061", threshold: 250 }
  Resolved: "threshold": 250
```

### Board Context Expressions

```
WHEN: A run is linked to a board (run.board_id is set)
WHERE: Scheduler expression resolver
HOW:

  When the run has a board_id, the scheduler loads the board data and
  makes it available as a special context:

  $board.meta.material         -> board.intent_spec.parameters.material
  $board.meta.load_case        -> board.intent_spec.parameters.load_case
  $board.meta.geometry_type    -> board.intent_spec.parameters.geometry_type
  $board.artifacts.geometry    -> board.primary_artifact_id (the main geometry)
  $board.artifacts.baseline    -> board.baseline_artifact_id
  $board.mode                  -> board.current_mode ("explore" | "study" | "release")
  $board.intent.goal           -> board.intent_spec.goal
  $board.intent.constraints    -> board.intent_spec.constraints

  USE CASE:
    A workflow run triggered from a board can dynamically adapt based on
    the board's current state. For example:
    - In "explore" mode: use coarser mesh (faster, cheaper)
    - In "study" mode: use finer mesh (more accurate)
    - In "release" mode: use finest mesh + full convergence
    
    Expression: {{ $board.mode == "release" ? 0.1 : 0.5 }}
    This sets mesh density based on board mode.

  RESOLUTION:
    1. Scheduler checks: does run.board_id exist?
    2. If yes: load board data from BoardService
    3. Inject board context into expression resolver namespace
    4. If no: $board.* references -> ERROR (board context not available)
```

### Gate/Cost Expressions

```
GATE EXPRESSIONS:
  $gate('Quality Gate').status   -> "passed" | "failed" | "pending" | "skipped"
  $gate('Quality Gate').passed   -> true | false
  $gate('Safety Review').status  -> "pending" (requires human approval)

  HOW:
    Gate nodes in the workflow DAG maintain their evaluation state.
    When a gate node completes (via evidence evaluation or human approval),
    its status is stored in runData.
    Downstream nodes can reference gate status in condition expressions.

  EXAMPLE:
    IF condition: {{ $gate('Quality Gate').passed && $gate('Safety Review').passed }}
    -> Only proceed if BOTH gates passed.

COST EXPRESSIONS:
  $cost.total       -> sum of cost_actual for all completed NodeRuns in this run
  $cost.remaining   -> run.budget - $cost.total (if budget is set)

  HOW:
    The scheduler maintains a running cost total.
    After each node completion, it updates the total.
    Downstream nodes can use cost in condition expressions.

  EXAMPLE:
    IF condition: {{ $cost.remaining > 50 }}
    -> Only run the expensive optimization if budget remains.
```

---

## 4. Task Breakdown

### 4.1 Backend Tasks

#### Task 2.3.B1: Expression Resolution at Dispatch Time (Verification & Extension)

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/scheduler.go` (expression evaluator) |
| **What Exists** | Expression evaluator exists for basic `$('Node').json.field` resolution |
| **What To Do** | Write comprehensive tests for expression resolution at dispatch time. Cover: simple field access, nested field access, artifact references, trigger data shortcuts, array index access, arithmetic expressions, comparison operators, ternary operators, string concatenation, and null/missing field handling. |
| **Complexity** | M |
| **Estimated Hours** | 6 |

**Subtasks:**
1. Test basic field access: `{{ $('Mesh Gen').json.element_count }}` -> 45000
2. Test nested field access: `{{ $('FEA').json.metrics.max_stress }}` -> 187.3
3. Test artifact reference: `{{ $('Mesh Gen').artifacts.mesh_output }}` -> "art_002"
4. Test trigger shortcut: `{{ $trigger.json.material }}` -> "Al6061"
5. Test array index: `{{ $('FEA').json.results[0].value }}` -> first result value
6. Test arithmetic: `{{ $('FEA').json.max_stress * 1.5 }}` -> 280.95
7. Test comparison: `{{ $('FEA').json.max_stress < 250 }}` -> true/false
8. Test ternary: `{{ $('FEA').json.converged ? "pass" : "fail" }}` -> "pass"
9. Test string concat: `{{ $('Trigger').json.material + "_" + $('Trigger').json.grade }}` -> "Al6061_T6"
10. Test null handling: `{{ $('Node').json.missing_field }}` -> null (not error)
11. Test null with default: `{{ $('Node').json.missing_field ?? "default" }}` -> "default"
12. Test run context: `{{ $run.id }}` -> current run ID
13. Test workflow context: `{{ $workflow.name }}` -> workflow name
14. Test environment variable: `{{ $env.AIRAIE_ENV }}` -> env value
15. Test current timestamp: `{{ $now }}` -> ISO timestamp string

**Expression Test Matrix:**

| # | Expression | runData Context | Expected Result |
|---|------------|-----------------|-----------------|
| 1 | `{{ $('Webhook').json.material }}` | webhook: { json: { material: "Al6061" } } | "Al6061" |
| 2 | `{{ $('FEA').json.metrics.max_stress }}` | fea: { json: { metrics: { max_stress: 187.3 } } } | 187.3 |
| 3 | `{{ $('Mesh').artifacts.mesh_output }}` | mesh: { artifacts: { mesh_output: "art_002" } } | "art_002" |
| 4 | `{{ $trigger.json.load }}` | trigger: { json: { load: 500 } } | 500 |
| 5 | `{{ $('FEA').json.results[0].value }}` | fea: { json: { results: [{ value: 42 }] } } | 42 |
| 6 | `{{ $('FEA').json.max_stress * 1.5 }}` | fea: { json: { max_stress: 100 } } | 150 |
| 7 | `{{ $('FEA').json.max_stress < 250 }}` | fea: { json: { max_stress: 187.3 } } | true |
| 8 | `{{ $('FEA').json.converged ? "yes" : "no" }}` | fea: { json: { converged: true } } | "yes" |
| 9 | `{{ $run.id }}` | run_id = "run_xyz789" | "run_xyz789" |
| 10 | `{{ $now }}` | -- | ISO timestamp (verify format) |
| 11 | `{{ $('Node').json.x ?? 0 }}` | node: { json: {} } | 0 |
| 12 | `{{ $('A').json.x + $('B').json.y }}` | A: { json: { x: 10 } }, B: { json: { y: 20 } } | 30 |
| 13 | `{{ $('A').json.x > 5 && $('B').json.y < 25 }}` | A: { json: { x: 10 } }, B: { json: { y: 20 } } | true |
| 14 | `{{ $env.AIRAIE_ENV }}` | env AIRAIE_ENV=test | "test" |
| 15 | `{{ $workflow.name }}` | workflow name = "FEA Pipeline" | "FEA Pipeline" |

**Acceptance Criteria for Task:**
- [ ] All 15 expression patterns resolve correctly
- [ ] Nested field access works to arbitrary depth
- [ ] Null/missing fields handled gracefully (no panic)
- [ ] Arithmetic and comparison operators work correctly

---

#### Task 2.3.B2: Board Context Expressions

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/scheduler.go` (expression evaluator) |
| **What Exists** | Board context not yet wired into expression resolver |
| **What To Do** | Add `$board.*` namespace to the expression resolver. When a run has `board_id`, load the board data from BoardService and inject it into the expression context. Handle: `$board.meta.*`, `$board.artifacts.*`, `$board.mode`, `$board.intent.*`. When run has no board_id, `$board.*` references produce a clear error. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. Add board context loading: when `run.board_id != ""`, call `BoardService.GetBoard(board_id)` to load board data
2. Map board data to expression namespace:
   - `$board.meta.*` -> board.IntentSpec.Parameters (JSONB, arbitrary keys)
   - `$board.artifacts.*` -> board artifact references (primary geometry, baseline, etc.)
   - `$board.mode` -> board.CurrentMode ("explore" | "study" | "release")
   - `$board.intent.goal` -> board.IntentSpec.Goal (string)
   - `$board.intent.constraints` -> board.IntentSpec.Constraints (JSON array)
3. Handle no board context: when `run.board_id == ""` and expression uses `$board.*`, return error: "Board context not available. This run is not linked to a board."
4. Write test with mock BoardService:
   - `$board.meta.material` -> "Al6061-T6"
   - `$board.meta.load_case` -> "static"
   - `$board.artifacts.geometry` -> "art_board_001"
   - `$board.mode` -> "study"
   - `$board.intent.goal` -> "Validate structural integrity"
5. Write test for conditional based on board mode:
   - `{{ $board.mode == "release" ? 0.01 : 0.1 }}` -> 0.1 (when mode is "study")

**Acceptance Criteria for Task:**
- [ ] `$board.meta.*` resolves from board's IntentSpec parameters
- [ ] `$board.artifacts.*` resolves to board artifact IDs
- [ ] `$board.mode` resolves to current board mode string
- [ ] No board_id -> clear error message for `$board.*` references
- [ ] Board context is loaded once per run and cached

---

#### Task 2.3.B3: Gate/Cost Expressions

| Field | Value |
|-------|-------|
| **File** | `internal/workflow/scheduler.go` (expression evaluator) |
| **What Exists** | Partial -- gate and cost fields exist but not wired into expression namespace |
| **What To Do** | Add `$gate('Name')` and `$cost` namespaces to the expression resolver. Gate status comes from completed Gate nodes in the DAG. Cost comes from accumulated NodeRun costs. |
| **Complexity** | S |
| **Estimated Hours** | 3 |

**Subtasks:**
1. Add gate context: when a gate node completes in the DAG, store its result in a gate context map: `gateResults["Gate Name"] = { status: "passed"|"failed"|"pending", passed: bool }`
2. Wire `$gate('Name').status` to lookup gateResults map by gate name
3. Wire `$gate('Name').passed` to return boolean from gateResults
4. Handle missing gate: `$gate('Unknown Gate')` -> error: "Gate 'Unknown Gate' not found in this workflow"
5. Add cost context: maintain running cost total in scheduler state
6. Wire `$cost.total` to return sum of `cost_actual` from all completed NodeRuns
7. Wire `$cost.remaining` to return `run.budget - $cost.total` (if budget set, else return null)
8. Write tests:
   - `{{ $gate('Quality Gate').status }}` -> "passed" (after gate node completes)
   - `{{ $gate('Quality Gate').passed }}` -> true
   - `{{ $cost.total }}` -> 1.30 (after 3 nodes at $0.30, $0.50, $0.50)
   - `{{ $cost.remaining }}` -> 8.70 (budget $10.00 - total $1.30)

**Acceptance Criteria for Task:**
- [ ] `$gate('Name').status` resolves from completed gate nodes
- [ ] `$gate('Name').passed` returns boolean
- [ ] `$cost.total` reflects accumulated node costs
- [ ] `$cost.remaining` calculated from budget minus total
- [ ] Missing gate produces clear error

---

### 4.2 Frontend Tasks

#### Task 2.3.F1: Expression Editor (CodeMirror 6)

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/workflows/ndv/ExpressionEditor.tsx` (new component, or enhance existing) |
| **What Exists** | ParameterInput exists but no dedicated expression editor with syntax highlighting |
| **What To Do** | Build a CodeMirror 6 editor component specialized for Airaie workflow expressions. Features: `{{ }}` syntax highlighting, autocomplete for `$('NodeName').json.*` paths, variable reference popup showing available nodes and their output fields, inline validation (highlight unresolved references). |
| **Complexity** | L |
| **Estimated Hours** | 8 |

**Subtasks:**
1. Install CodeMirror 6 packages: `@codemirror/view`, `@codemirror/state`, `@codemirror/autocomplete`, `@codemirror/lang-javascript`
2. Create base ExpressionEditor component with CodeMirror 6 instance
3. Implement `{{ }}` bracket highlighting: style `{{` and `}}` delimiters in distinct color (e.g., orange)
4. Implement expression syntax highlighting:
   - `$('...')` -> green for node references
   - `.json.` / `.artifacts.` -> blue for path segments
   - `$trigger` / `$run` / `$workflow` / `$env` / `$board` / `$gate` / `$cost` / `$now` -> purple for built-in variables
   - String literals -> brown
   - Numbers -> teal
   - Operators (`+`, `-`, `*`, `/`, `<`, `>`, `==`, `&&`, `||`, `?`, `:`) -> gray
5. Implement autocomplete for node names:
   - Trigger on `$('` keystroke
   - Show dropdown of all node names in the current workflow (from canvas state)
   - On select: insert `$('NodeName')` with cursor after closing paren
6. Implement autocomplete for output fields:
   - Trigger on `.json.` or `.artifacts.` after a node reference
   - Load the referenced node's tool contract outputs
   - Show dropdown of available output field names
   - For nested objects: show nested fields with path (e.g., `metrics.max_stress`)
7. Implement autocomplete for built-in variables:
   - Trigger on `$` keystroke (when not followed by `(`)
   - Show: `$trigger`, `$run`, `$workflow`, `$env`, `$board`, `$gate`, `$cost`, `$now`
   - For each: show description tooltip
8. Implement inline validation:
   - Red underline on unresolved node references (node name doesn't exist in workflow)
   - Yellow underline on unresolved field paths (field not in tool contract)
   - Tooltip on hover: "Node 'X' not found in this workflow"
9. Implement variable reference popup:
   - Button or shortcut to open a panel showing all available expression variables
   - Organized by category: Workflow Inputs, Node Outputs, Built-in Variables, Board Context, Gates, Cost
   - Click to insert at cursor position
10. Add mode toggle: "Expression" (CodeMirror editor) vs "Fixed Value" (plain text input)
11. Style the editor to match the Airaie dark theme

**Component Props:**
```typescript
interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  workflowNodes: WorkflowNode[];     // available nodes for autocomplete
  toolContracts: Map<string, ToolContract>;  // node outputs for field autocomplete
  boardContext?: BoardContext;        // available $board.* fields
  mode: "expression" | "fixed";
  onModeChange: (mode: "expression" | "fixed") => void;
  placeholder?: string;
  error?: string;
}
```

**Acceptance Criteria for Task:**
- [ ] `{{ }}` brackets highlighted in distinct color
- [ ] `$('NodeName')` autocompletes from available workflow nodes
- [ ] `.json.field` autocompletes from tool contract outputs
- [ ] Built-in variables (`$trigger`, `$run`, etc.) autocomplete
- [ ] Unresolved references show red underline with tooltip
- [ ] Variable reference popup shows all available variables organized by category
- [ ] Mode toggle switches between expression editor and fixed value input

---

#### Task 2.3.F2: Node Inspector -- Input/Output Panels

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/workflows/ndv/NodeInspector.tsx`, `frontend/src/components/workflows/ndv/InputPanel.tsx`, `frontend/src/components/workflows/ndv/OutputPanel.tsx` |
| **What Exists** | Basic NodeInspector and InputPanel/OutputPanel exist |
| **What To Do** | Enhance: Input Panel shows upstream node data (the actual data that will flow to this node). Output Panel shows execution output (after the node runs). Add expression toggle per parameter (switch between fixed value and expression). Add data preview with JSON tree view. |
| **Complexity** | L |
| **Estimated Hours** | 7 |

**Subtasks:**
1. **Input Panel Enhancement:**
   - Fetch upstream node data from runData (during run) or tool contract (during design)
   - For each input parameter:
     - Show parameter name, type, and description (from tool contract)
     - Show value source: "Expression: `{{ $('Mesh').json.element_count }}`" or "Fixed: 0.8"
     - Show resolved value preview (during run): "45000" (resolved from runData)
     - Show upstream node connection: "Connected to: Mesh Generator -> element_count"
   - Add JSON tree view for complex input objects (using `JsonTreeView.tsx`)
   - Highlight required vs optional parameters

2. **Output Panel Enhancement:**
   - After node execution, show actual output data from runData
   - For each output parameter:
     - Show name, type, and actual value
     - For artifacts: show artifact ID, size, type, with download link
     - For JSON data: render in collapsible JSON tree view
   - Show execution metadata: duration, cost, attempt number
   - Show "Not yet executed" placeholder when node hasn't run

3. **Expression Toggle:**
   - Per-parameter toggle: "Fixed Value" <-> "Expression"
   - When "Fixed Value": show standard input (text, number, dropdown based on type)
   - When "Expression": show ExpressionEditor (from Task 2.3.F1)
   - Persist toggle state in node configuration

4. **Panel Layout:**
   - Tab layout: "Input" | "Output" | "Settings"
   - Input tab: parameter list with values and expression toggles
   - Output tab: execution results with JSON tree view
   - Settings tab: error handling config, retry config, resource limits

**Acceptance Criteria for Task:**
- [ ] Input Panel shows upstream data source and resolved values
- [ ] Output Panel shows execution results with JSON tree view
- [ ] Expression toggle switches between fixed value and expression editor per parameter
- [ ] Required parameters visually distinct from optional
- [ ] Artifact outputs show download link

---

#### Task 2.3.F3: Parameter Form from ToolContract

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/workflows/ndv/ParameterForm.tsx` |
| **What Exists** | ParameterForm exists but may be incomplete for all ToolContract input types |
| **What To Do** | Auto-generate form fields from the ToolContract input schema. Handle all contract input types: artifact (file selector), number (numeric input with min/max/units), string (text input), enum (dropdown), boolean (toggle), JSON/object (JSON editor). Each field should support expression toggle. |
| **Complexity** | L |
| **Estimated Hours** | 7 |

**Subtasks:**
1. Parse ToolContract input schema to generate form fields dynamically:
   ```typescript
   interface ToolContractInput {
     name: string;
     type: "artifact" | "number" | "string" | "boolean" | "enum" | "object" | "array";
     required: boolean;
     description: string;
     default?: any;
     constraints?: {
       min?: number; max?: number;     // for number
       enum_values?: string[];          // for enum
       pattern?: string;                // for string
       mime_types?: string[];           // for artifact
     };
     unit?: string;                     // physical unit (e.g., "MPa", "mm")
   }
   ```

2. **Artifact Selector:**
   - Dropdown/search field to select from available artifacts
   - Filter by MIME type (from contract constraints)
   - Show artifact metadata: name, size, type, upload date
   - Support expression mode: `{{ $('Node').artifacts.output }}`
   - Upload button to add new artifact from local file

3. **Number Input:**
   - Numeric input with min/max validation (from contract constraints)
   - Unit label next to input (e.g., "MPa", "mm", "N")
   - Slider for bounded ranges
   - Support expression mode

4. **String Input:**
   - Text input with pattern validation (from contract regex constraint)
   - Max length indicator
   - Support expression mode

5. **Enum Dropdown:**
   - Dropdown populated from `enum_values` in contract
   - Selected value highlighted
   - Support expression mode

6. **Boolean Toggle:**
   - Toggle switch with label
   - Support expression mode

7. **JSON/Object Editor:**
   - Embedded JSON editor (mini CodeMirror or textarea with validation)
   - Validate against JSON Schema from contract
   - Show schema-based hints
   - Support expression mode (the entire JSON can be an expression)

8. **Array Input:**
   - Repeatable field group with add/remove buttons
   - Each item matches the array item schema from contract
   - Support expression mode

9. **Validation:**
   - Required field indicator (red asterisk)
   - Inline validation messages (below field)
   - Validate on blur and on submit
   - Show tool contract description as field help text

10. **Expression Toggle Integration:**
    - Every field type supports switching to expression mode
    - When in expression mode: replace the field control with ExpressionEditor
    - When switching back to fixed: restore previous fixed value

**Acceptance Criteria for Task:**
- [ ] Artifact selector with MIME type filtering and upload
- [ ] Number input with min/max, units, and slider
- [ ] String input with pattern validation
- [ ] Enum dropdown populated from contract
- [ ] Boolean toggle
- [ ] JSON/object editor with schema validation
- [ ] All field types support expression toggle
- [ ] Required fields marked and validated
- [ ] Form generates correct parameter JSON for workflow node config

---

## 5. API Endpoints

No new API endpoints in Sprint 2.3. Expression resolution is internal to the scheduler. Frontend components use existing APIs:

| Method | Endpoint | Purpose | Used By |
|--------|----------|---------|---------|
| `GET` | `/v0/tools/{id}/versions/{v}` | Get tool contract for ParameterForm generation | ParameterForm |
| `GET` | `/v0/runs/{id}` | Get run data for output panel | NodeInspector |
| `GET` | `/v0/boards/{id}` | Get board data for board context expressions | Scheduler (backend) |
| `GET` | `/v0/artifacts/{id}/download-url` | Download artifact link for output panel | NodeInspector |

---

## 6. Data Models

### Expression Resolver Context

```go
type ExpressionContext struct {
    RunData       map[string]*NodeRunData  // per-node execution data
    RunID         string
    WorkflowName  string
    WorkflowVer   int
    TriggerData   *NodeRunData             // shortcut for trigger node
    BoardContext  *BoardExprContext         // nil when no board
    GateResults   map[string]*GateResult   // gate name -> result
    CostTotal     float64
    CostRemaining *float64                 // nil when no budget set
    EnvVars       map[string]string
    Now           time.Time
}

type BoardExprContext struct {
    Meta      map[string]interface{}   // from IntentSpec.Parameters
    Artifacts map[string]string        // artifact name -> artifact ID
    Mode      string                   // "explore" | "study" | "release"
    Intent    BoardIntentContext
}

type BoardIntentContext struct {
    Goal        string
    Constraints json.RawMessage
}

type GateResult struct {
    Status string  // "passed" | "failed" | "pending" | "skipped"
    Passed bool
}
```

### ToolContract Input Schema (for ParameterForm)

```typescript
interface ToolContractInput {
  name: string;
  type: "artifact" | "number" | "string" | "boolean" | "enum" | "object" | "array";
  required: boolean;
  description: string;
  default?: any;
  constraints?: {
    min?: number;
    max?: number;
    enum_values?: string[];
    pattern?: string;
    mime_types?: string[];
    max_length?: number;
    json_schema?: object;
  };
  unit?: string;
}
```

---

## 7. NATS Events

No new NATS events in Sprint 2.3. Expression resolution happens within the existing scheduler dispatch flow (Sprint 2.2).

---

## 8. Test Plan

### Unit Tests

| Test | Input | Expected | File |
|------|-------|----------|------|
| Simple field access | `$('A').json.x` + runData | Correct value | `expression_test.go` |
| Nested field access | `$('A').json.a.b.c` + runData | Correct nested value | `expression_test.go` |
| Artifact reference | `$('A').artifacts.mesh` + runData | Artifact ID string | `expression_test.go` |
| Trigger shortcut | `$trigger.json.x` + runData | Trigger data field | `expression_test.go` |
| Array index | `$('A').json.arr[0]` + runData | First array element | `expression_test.go` |
| Arithmetic | `$('A').json.x * 2` + runData | Calculated value | `expression_test.go` |
| Comparison | `$('A').json.x < 250` + runData | Boolean | `expression_test.go` |
| Ternary | `$('A').json.b ? "y" : "n"` + runData | String based on bool | `expression_test.go` |
| Null coalesce | `$('A').json.missing ?? 0` + runData | Default value | `expression_test.go` |
| Multi-node ref | `$('A').json.x + $('B').json.y` | Sum | `expression_test.go` |
| Run context | `$run.id` | Run ID string | `expression_test.go` |
| Workflow context | `$workflow.name` | Workflow name | `expression_test.go` |
| Env variable | `$env.TEST_VAR` | Env value | `expression_test.go` |
| Timestamp | `$now` | Valid ISO timestamp | `expression_test.go` |
| Board meta | `$board.meta.material` + board | Board material | `expression_test.go` |
| Board artifact | `$board.artifacts.geometry` + board | Board artifact ID | `expression_test.go` |
| Board mode | `$board.mode` + board | "study" | `expression_test.go` |
| Board mode conditional | `$board.mode == "release" ? 0.01 : 0.1` | 0.1 (study mode) | `expression_test.go` |
| No board context | `$board.meta.x` without board | Error message | `expression_test.go` |
| Gate status | `$gate('QG').status` + gate passed | "passed" | `expression_test.go` |
| Gate passed | `$gate('QG').passed` + gate passed | true | `expression_test.go` |
| Cost total | `$cost.total` + 3 completed nodes | Sum of costs | `expression_test.go` |
| Cost remaining | `$cost.remaining` + budget 10 | budget - total | `expression_test.go` |
| Missing gate | `$gate('Unknown').status` | Error: not found | `expression_test.go` |

### Integration Tests

| Test | Scope | Steps | Expected |
|------|-------|-------|----------|
| Expression resolution during dispatch | Scheduler E2E | Dispatch node with expression params, verify resolved JobPayload | Correct values in job inputs |
| Board-linked run expressions | Scheduler + BoardService | Create run with board_id, dispatch node with `$board.meta.*` | Board data in resolved params |
| Gate expression in condition | Scheduler + Gate | Gate node passes, downstream IF uses `$gate('X').passed` | Correct branch selected |
| Cost expression in condition | Scheduler + Cost | 3 nodes complete ($0.30 each), downstream IF uses `$cost.total < 1.0` | Correct evaluation (0.90 < 1.0 = true) |

### Frontend Tests

| Test | Component | Input | Expected |
|------|-----------|-------|----------|
| ExpressionEditor renders | ExpressionEditor | value=`{{ $('A').json.x }}` | Editor displays with syntax highlighting |
| Autocomplete node names | ExpressionEditor | Type `$('` | Dropdown shows available nodes |
| Autocomplete field paths | ExpressionEditor | Type `$('A').json.` | Dropdown shows tool contract output fields |
| ParameterForm artifact | ParameterForm | Contract input type="artifact" | Artifact selector renders |
| ParameterForm number | ParameterForm | Contract input type="number" min=0 max=100 | Number input with slider |
| ParameterForm enum | ParameterForm | Contract input type="enum" values=["a","b"] | Dropdown with 2 options |
| ParameterForm expression toggle | ParameterForm | Click expression toggle | Field switches to ExpressionEditor |
| Input Panel data display | InputPanel | Upstream node data in runData | Shows resolved values |
| Output Panel data display | OutputPanel | Completed node output | Shows JSON tree view |

---

## 9. Definition of Done

- [ ] 15 expression patterns resolve correctly at dispatch time
- [ ] Board context expressions resolve for board-linked runs
- [ ] Board context error when run has no board_id
- [ ] Gate expressions resolve from completed gate nodes
- [ ] Cost expressions reflect accumulated node costs
- [ ] ExpressionEditor has `{{ }}` syntax highlighting
- [ ] ExpressionEditor autocompletes node names and field paths
- [ ] NodeInspector Input Panel shows upstream data with expression source
- [ ] NodeInspector Output Panel shows execution results with JSON tree
- [ ] ParameterForm auto-generates all field types from ToolContract
- [ ] Expression toggle works on every parameter field type
- [ ] All backend expression tests pass (24+ test cases)
- [ ] All frontend component tests pass

---

## 10. Dependencies & Blockers

| Dependency | Type | Status | Impact |
|------------|------|--------|--------|
| Sprint 2.2 complete (scheduler dispatches) | Hard | In progress | Expression resolution happens during dispatch |
| BoardService exists | Soft | Exists | Board context loading |
| Board data populated | Soft | Phase 4 | Use mock board data for testing |
| ToolContract schema available | Soft | Phase 1 verified | ParameterForm generation |
| CodeMirror 6 packages | Soft | npm install | ExpressionEditor dependency |
| `frontend/src/components/workflows/ndv/JsonTreeView.tsx` exists | Soft | Exists | Used by Input/Output panels |

---

## 11. Sprint Velocity & Estimates

| Category | Tasks | Total Hours | Percentage |
|----------|-------|-------------|------------|
| Backend Development | 3 tasks | 14 hours | 37% |
| Frontend Development | 3 tasks | 22 hours | 58% |
| Testing & QA | (included in tasks) | -- | -- |
| Sprint Overhead | Standup, review, retro | 2 hours | 5% |
| **Total** | **6 tasks** | **38 hours** | **100%** |

---

## 12. Rollback Plan

If Sprint 2.3 has issues:
1. ExpressionEditor too complex: fall back to plain textarea with no autocomplete (expressions still work, just no editor assist)
2. Board context not available: skip board expressions, return clear error message, defer to Phase 5 integration
3. Gate/cost expressions: make them optional, downstream conditions can use explicit comparison against NodeRun data instead
4. ParameterForm missing types: use generic JSON input as fallback for unrecognized contract input types

---
---

# SPRINT 2.4: WORKFLOW VERSIONING & TRIGGERS

---

## 1. Sprint Metadata

| Field | Value |
|-------|-------|
| **Sprint ID** | 2.4 |
| **Sprint Name** | Workflow Versioning & Triggers |
| **Phase** | 2 -- Workflow Engine Completion |
| **Duration** | 3 days |
| **Start Date** | 2026-05-09 |
| **End Date** | 2026-05-12 |
| **Goal** | Complete the workflow version lifecycle (draft -> compiled -> published, immutable after publish), trigger CRUD (webhook, cron, event), and trigger execution wiring (trigger fires -> creates Run -> schedules). Wire frontend version history page and trigger configuration page. |
| **Dependencies** | Sprint 2.2 complete (runs execute). Sprint 2.1 complete (compilation works). |
| **Risks** | Cron scheduling reliability. Webhook URL generation and security (secret validation). NATS event subscription for event triggers. Immutability enforcement for published versions. |
| **Mitigation** | Use Go cron library (robfig/cron) with persistent schedule. Webhook secrets with HMAC-SHA256 validation. NATS wildcard subscriptions for event triggers. DB-level immutability (reject UPDATE on published versions). |

---

## 2. Objectives & Key Results

| # | Objective | Key Result | Measurement |
|---|-----------|------------|-------------|
| O1 | Version lifecycle enforced correctly | draft -> compiled -> published transitions work; published versions are immutable (reject edits) | 6 lifecycle test cases pass |
| O2 | Multiple published versions supported | Workflow can have v1 and v2 both published; one is "active" (receives triggers) | Test: publish 2 versions, verify both accessible, only active receives triggers |
| O3 | Webhook triggers create and execute runs | POST to webhook URL -> creates Run -> schedules -> executes | E2E test: HTTP POST -> run completes |
| O4 | Cron triggers fire on schedule | Cron trigger configured -> fires at next scheduled time -> creates Run | Test: set 1-minute cron, verify run created |
| O5 | Event triggers fire on NATS event | NATS event matching trigger filter -> creates Run | Test: publish matching event, verify run created |
| O6 | Frontend shows version history and trigger config | Version list with diff viewer and publish/rollback. Trigger page with webhook URL, cron editor, event config. | Manual QA walkthrough |

---

## 3. Architecture Context

### Version Lifecycle

```
VERSION STATES:
  draft       -> Editable in the Workflow Editor canvas
                 Can be saved and modified
                 Cannot be triggered by webhooks/schedules
                 Can be manually run for testing

  compiled    -> DSL validated and compiled to AST
                 All tool references resolved
                 All expressions syntax-checked
                 Ready to publish

  published   -> IMMUTABLE -- cannot be edited
                 Can be triggered by all trigger types
                 Has a version number (v1, v2, v3, ...)
                 Multiple versions can be published simultaneously
                 One version is "active" (receives triggers)

STATE TRANSITIONS:
  draft    -> compiled   (via POST /v0/workflows/{id}/versions/{v}/compile)
  compiled -> published  (via POST /v0/workflows/{id}/versions/{v}/publish)
  published -> (cannot edit, cannot revert to draft)
  
  To make changes after publish:
  1. Create a new version (auto-increment: v4)
  2. New version starts as draft (copy of previous)
  3. Edit, compile, publish the new version
  4. Set new version as "active" to receive triggers
  5. Old version remains published (for rollback)

IMMUTABILITY ENFORCEMENT:
  - API rejects PUT/PATCH on published versions with 409 Conflict
  - DB constraint: reject UPDATE on workflow_versions WHERE status = 'published'
  - Only allowed mutations on published: set active_version, archive
```

### Trigger System

```
TRIGGER TYPES:

  WEBHOOK:
    - System generates a unique webhook URL per trigger
    - URL: https://api.airaie.io/v0/hooks/{trigger_id}
    - Optional: HMAC-SHA256 secret for payload validation
    - On HTTP POST: validate signature, extract body, create Run
    - Request body becomes trigger node output data
    - File uploads -> artifacts in MinIO

  CRON:
    - Standard cron expression (5-field or 6-field)
    - Examples: "0 9 * * MON-FRI" (weekdays at 9am), "*/5 * * * *" (every 5 min)
    - Persistent scheduler: survives process restarts
    - On tick: create Run with configured default inputs
    - Timezone-aware (UTC default, configurable)

  EVENT:
    - NATS subject subscription with optional filter
    - Subject: "airaie.events.artifact.created", "airaie.events.board.mode_changed", etc.
    - Filter: JSON path match on event payload
    - On matching event: create Run with event payload as trigger data

TRIGGER DATA MODEL:
  Trigger {
    id:            "trig_abc123"
    workflow_id:   "wf_fea_val_001"
    version:       3              // which published version to run
    type:          "webhook" | "cron" | "event"
    enabled:       true | false
    config:        TriggerConfig  // type-specific configuration
    created_at:    timestamp
    last_fired_at: timestamp      // null if never fired
  }

  WebhookTriggerConfig {
    url:    "https://api.airaie.io/v0/hooks/trig_abc123"
    secret: "hmac_secret_..." (optional, for HMAC-SHA256 validation)
  }

  CronTriggerConfig {
    expression: "0 9 * * MON-FRI"
    timezone:   "UTC"
    inputs:     { ... default inputs ... }
  }

  EventTriggerConfig {
    subject:  "airaie.events.artifact.created"
    filter:   { "type": "vtk" }
  }
```

### Trigger Execution Wiring

```
WEBHOOK -> RUN:
  1. HTTP POST received at /v0/hooks/{trigger_id}
  2. Load trigger record from DB
  3. Validate: trigger enabled? version published?
  4. If webhook secret configured: validate HMAC-SHA256 signature
  5. Process request body:
     a. Extract JSON fields -> trigger data
     b. Upload any files -> MinIO -> artifact IDs
  6. Create Run:
     a. workflow_id from trigger
     b. version from trigger (or active version)
     c. inputs from request body
     d. actor = "webhook:{trigger_id}"
  7. Schedule Run (dispatch through scheduler)
  8. Return 202 Accepted with run_id

CRON -> RUN:
  1. Cron scheduler fires at configured time
  2. Load trigger record and configured default inputs
  3. Create Run:
     a. workflow_id from trigger
     b. version from trigger
     c. inputs from trigger.config.inputs (defaults)
     d. actor = "cron:{trigger_id}"
  4. Schedule Run
  5. Update trigger.last_fired_at

EVENT -> RUN:
  1. NATS consumer receives event on subscribed subject
  2. Apply filter: does event payload match trigger filter?
  3. If match:
     a. Create Run with event payload as trigger data
     b. actor = "event:{trigger_id}:{subject}"
  4. Schedule Run
  5. Update trigger.last_fired_at
```

---

## 4. Task Breakdown

### 4.1 Backend Tasks

#### Task 2.4.B1: Verify Version Lifecycle

| Field | Value |
|-------|-------|
| **File** | `internal/service/workflow.go` |
| **What Exists** | Version CRUD exists with status field |
| **What To Do** | Write integration tests for the complete version lifecycle. Verify: draft -> compiled -> published transitions. Verify published is immutable (reject edits). Verify multiple published versions can coexist. Verify "active" version designation. |
| **Complexity** | S |
| **Estimated Hours** | 4 |

**Subtasks:**
1. Test: create new version -> status is "draft"
2. Test: compile draft version -> status transitions to "compiled"
3. Test: publish compiled version -> status transitions to "published", version number assigned
4. Test: edit published version -> 409 Conflict error (immutability enforced)
5. Test: attempt to compile already-published version -> 409 Conflict
6. Test: create second version while first is published -> second starts as "draft"
7. Test: publish second version -> both v1 and v2 are "published"
8. Test: set active version to v2 -> verify only v2 receives new triggers
9. Test: get version history -> returns ordered list of all versions with status
10. Test: get specific version -> returns DSL, AST, status, published_at
11. Test: version number auto-increments (v1, v2, v3, ...)
12. Test: create version from existing (copy) -> new draft with copied DSL

**Acceptance Criteria for Task:**
- [ ] draft -> compiled -> published transitions work
- [ ] Published version rejects PUT/PATCH with 409
- [ ] Multiple published versions coexist
- [ ] Active version designation controls trigger routing
- [ ] Version numbers auto-increment

---

#### Task 2.4.B2: Trigger CRUD

| Field | Value |
|-------|-------|
| **File** | `internal/service/trigger.go` |
| **What Exists** | Trigger service exists with CRUD operations |
| **What To Do** | Test create, read, update, delete for all 3 trigger types. Verify webhook URL generation. Verify cron expression validation. Verify NATS subject validation for event triggers. Verify enable/disable toggle. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. **Webhook Trigger CRUD:**
   - Create: `POST /v0/triggers` with type="webhook", workflow_id, version
   - Verify unique webhook URL generated: `https://api.airaie.io/v0/hooks/{trigger_id}`
   - Verify optional HMAC secret generated/stored securely
   - Read: `GET /v0/triggers/{id}` returns full trigger config including URL
   - Update: `PUT /v0/triggers/{id}` can update version, enabled status, secret
   - Delete: `DELETE /v0/triggers/{id}` removes trigger (webhook URL becomes invalid)

2. **Cron Trigger CRUD:**
   - Create: `POST /v0/triggers` with type="cron", expression="0 9 * * MON-FRI", timezone="UTC", inputs={...}
   - Verify cron expression validation: reject invalid expressions (e.g., "invalid cron")
   - Verify cron schedule registered with scheduler
   - Read: shows next_fire_at (calculated from cron expression)
   - Update: change expression, verify schedule updated
   - Delete: remove from cron scheduler

3. **Event Trigger CRUD:**
   - Create: `POST /v0/triggers` with type="event", subject="airaie.events.artifact.created", filter={"type":"vtk"}
   - Verify NATS subject format validation
   - Verify subscription created on NATS
   - Read: shows subscription status
   - Update: change filter, verify subscription updated
   - Delete: unsubscribe from NATS

4. **Common:**
   - Enable/disable toggle: `PATCH /v0/triggers/{id}/enable` and `PATCH /v0/triggers/{id}/disable`
   - Disabled trigger: webhook returns 404, cron skips tick, event subscription paused
   - List triggers: `GET /v0/workflows/{id}/triggers` returns all triggers for a workflow
   - Verify trigger can only reference published version

**Acceptance Criteria for Task:**
- [ ] Webhook trigger: URL generated, secret stored, CRUD works
- [ ] Cron trigger: expression validated, schedule registered, CRUD works
- [ ] Event trigger: NATS subscription created, filter applied, CRUD works
- [ ] Enable/disable toggle works for all trigger types
- [ ] Trigger cannot reference draft or compiled-only version

---

#### Task 2.4.B3: Trigger Execution Wiring

| Field | Value |
|-------|-------|
| **File** | `internal/service/trigger.go`, `internal/service/run.go` |
| **What Exists** | Not fully wired -- trigger CRUD exists but fire -> Run creation -> scheduling is incomplete |
| **What To Do** | Wire the complete trigger-to-execution path. Webhook request -> create Run -> schedule. Cron tick -> create Run -> schedule. NATS event -> filter -> create Run -> schedule. |
| **Complexity** | M |
| **Estimated Hours** | 6 |

**Subtasks:**
1. **Webhook Execution:**
   - Register HTTP handler at `/v0/hooks/{trigger_id}` (may already exist)
   - On POST: load trigger, validate enabled status
   - If secret configured: extract `X-Airaie-Signature` header, validate HMAC-SHA256
   - Extract body as JSON -> trigger data
   - Handle multipart form data: upload files to MinIO -> artifact IDs
   - Create Run record: workflow_id, version, inputs (from body), actor="webhook:{trigger_id}"
   - Call `RunService.Schedule(run)` to start execution
   - Return 202 Accepted: `{ run_id: "run_...", status: "PENDING" }`
   - Handle errors: 404 if trigger not found, 403 if signature invalid, 409 if trigger disabled

2. **Cron Execution:**
   - Register cron job with Go cron library (e.g., robfig/cron)
   - On tick: check trigger still enabled
   - Create Run: inputs from trigger.config.inputs (default values), actor="cron:{trigger_id}"
   - Call `RunService.Schedule(run)`
   - Update trigger.last_fired_at
   - Handle restart: on service start, reload all enabled cron triggers and register schedules

3. **Event Execution:**
   - Subscribe to NATS subject from trigger config
   - On message: apply filter (JSON path match against payload)
   - If match: create Run with event payload as trigger data, actor="event:{trigger_id}"
   - Call `RunService.Schedule(run)`
   - Update trigger.last_fired_at
   - Handle reconnect: on NATS reconnect, re-establish all event trigger subscriptions

4. **Common Wiring:**
   - All trigger types call the same `RunService.CreateAndSchedule(params)` method
   - Trigger execution is async: return immediately, run executes in background
   - Rate limiting: prevent trigger from firing more than N times per minute (configurable)
   - Dead letter: if run creation fails, log error and optionally retry

**E2E Test Plan:**
1. Webhook test: `curl -X POST http://localhost:8080/v0/hooks/{id} -d '{"material":"Al6061"}' -H "X-Airaie-Signature: ..."` -> verify run created and executing
2. Cron test: create trigger with `*/1 * * * *` (every minute), wait 65 seconds, verify run created
3. Event test: publish NATS event to configured subject, verify run created

**Acceptance Criteria for Task:**
- [ ] Webhook POST -> Run created -> execution starts
- [ ] HMAC-SHA256 signature validation works (accepts valid, rejects invalid)
- [ ] Cron tick -> Run created -> execution starts
- [ ] Cron triggers survive process restart
- [ ] NATS event -> filter match -> Run created -> execution starts
- [ ] Rate limiting prevents trigger abuse
- [ ] Last_fired_at updated after each trigger fire

---

### 4.2 Frontend Tasks

#### Task 2.4.F1: Version History Page

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/workflows/VersionList.tsx`, `frontend/src/pages/WorkflowDetailPage.tsx` |
| **What Exists** | VersionList component exists. WorkflowDetailPage exists. |
| **What To Do** | Wire to real data from `GET /v0/workflows/{id}/versions`. Display version list with version number, status (draft/compiled/published), created date, published date, and actions. Add diff viewer to compare two versions. Add publish and set-active buttons. |
| **Complexity** | M |
| **Estimated Hours** | 5 |

**Subtasks:**
1. Fetch versions on mount: `GET /v0/workflows/{id}/versions`
2. Render version table with columns:
   - Version number (v1, v2, v3)
   - Status badge (draft=gray, compiled=blue, published=green)
   - Active indicator (star icon for the active version)
   - Created date (relative: "2 days ago")
   - Published date (relative, or "--" if not published)
   - Actions column
3. Actions per version:
   - Draft: "Compile" button, "Edit" button (opens editor), "Delete" button
   - Compiled: "Publish" button, "Edit" button (reverts to draft), "View" button
   - Published: "Set Active" button (if not already active), "View" button, "Create New Version" button (copies this version's DSL to a new draft)
4. Diff viewer:
   - Select two versions to compare
   - Show side-by-side YAML diff (or unified diff)
   - Highlight additions (green), deletions (red), modifications (yellow)
   - Use a diff library (e.g., `diff` npm package)
5. Publish button wiring:
   - Open confirmation dialog: "Publish v3? This version will become immutable."
   - Call `POST /v0/workflows/{id}/versions/{v}/publish`
   - On success: refresh version list, update status badge
6. Set Active button wiring:
   - Call `PATCH /v0/workflows/{id}` with `{ active_version: v }`
   - On success: move active indicator to new version
7. Create New Version from existing:
   - Call `POST /v0/workflows/{id}/versions` with `{ copy_from: v }`
   - New draft version created with copied DSL
   - Navigate to editor for new version

**API Calls:**
```
GET /v0/workflows/{id}/versions
  Response: { versions: [{ version: 1, status: "published", active: true, ... }, ...] }

POST /v0/workflows/{id}/versions/{v}/publish
  Response: { version: 3, status: "published" }

PATCH /v0/workflows/{id}
  Request: { active_version: 3 }
  Response: { active_version: 3 }

POST /v0/workflows/{id}/versions
  Request: { copy_from: 2 }
  Response: { version: 4, status: "draft" }
```

**Acceptance Criteria for Task:**
- [ ] Version list renders with correct status badges
- [ ] Active version indicated with star/badge
- [ ] Diff viewer compares two versions side-by-side
- [ ] Publish button works and version becomes immutable
- [ ] Set Active button works and trigger routing updates
- [ ] Create New Version from existing copies DSL

---

#### Task 2.4.F2: Trigger Configuration Page

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/WorkflowDetailPage.tsx` (triggers section or tab) |
| **What Exists** | WorkflowDetailPage exists, may have trigger section placeholder |
| **What To Do** | Build trigger management UI within the workflow detail page. Support creating, editing, deleting, and enabling/disabling triggers for all 3 types (webhook, cron, event). |
| **Complexity** | M |
| **Estimated Hours** | 6 |

**Subtasks:**
1. **Trigger List:**
   - Fetch triggers: `GET /v0/workflows/{id}/triggers`
   - Render trigger table with columns: Name, Type (webhook/cron/event), Status (enabled/disabled), Version, Last Fired, Actions
   - Type icon: webhook=globe, cron=clock, event=lightning
   - Status toggle: enable/disable with confirmation

2. **Create Trigger Dialog:**
   - "Add Trigger" button opens modal
   - Step 1: Select trigger type (webhook, cron, event)
   - Step 2: Configure type-specific settings
   - Step 3: Select version (dropdown of published versions)
   - Step 4: Review and create

3. **Webhook Trigger Config:**
   - Display generated webhook URL (read-only, with copy button)
   - Secret: "Generate Secret" button, toggle show/hide
   - Test button: sends a test POST to the webhook URL
   - Show example curl command:
     ```
     curl -X POST https://api.airaie.io/v0/hooks/{id} \
       -H "Content-Type: application/json" \
       -H "X-Airaie-Signature: sha256=..." \
       -d '{"material": "Al6061"}'
     ```

4. **Cron Trigger Config:**
   - Cron expression input with validation
   - Cron expression builder: presets for common schedules
     - Every hour, Every day at 9am, Weekdays at 9am, Every Monday, Custom
   - Human-readable preview: "Every weekday at 9:00 AM UTC"
   - Next 5 fire times preview (calculated from expression)
   - Timezone selector (default UTC)
   - Default inputs: JSON editor for default trigger data

5. **Event Trigger Config:**
   - NATS subject input with autocomplete for known subjects:
     - `airaie.events.artifact.created`
     - `airaie.events.board.mode_changed`
     - `airaie.events.run.completed`
     - Custom subject
   - Filter editor: JSON path filter on event payload
   - Filter preview: "Matches events where type = 'vtk'"

6. **Edit Trigger:**
   - Click trigger row -> open edit dialog
   - Editable fields depend on trigger type
   - Webhook: update secret, version
   - Cron: update expression, timezone, default inputs, version
   - Event: update subject, filter, version

7. **Delete Trigger:**
   - Delete button with confirmation: "Delete trigger 'Daily FEA Run'? Webhook URL will become invalid."
   - Call `DELETE /v0/triggers/{id}`

8. **Trigger History:**
   - Show recent fires: last 10 trigger events with run_id links
   - Show success/failure count

**API Calls:**
```
GET /v0/workflows/{id}/triggers
  Response: { triggers: [{ id, type, enabled, config, version, last_fired_at, ... }] }

POST /v0/triggers
  Request: { workflow_id, type, version, config: { ... }, name }
  Response: { id, url (for webhook), ... }

PUT /v0/triggers/{id}
  Request: { config: { ... }, version, name }
  Response: { updated trigger }

DELETE /v0/triggers/{id}
  Response: 204 No Content

PATCH /v0/triggers/{id}/enable
PATCH /v0/triggers/{id}/disable
  Response: { enabled: true/false }
```

**Acceptance Criteria for Task:**
- [ ] Trigger list renders with correct type icons and status
- [ ] Webhook trigger: URL displayed with copy, secret manageable, curl example shown
- [ ] Cron trigger: expression validated, human-readable preview, next fire times shown
- [ ] Event trigger: subject input with autocomplete, filter editor works
- [ ] Enable/disable toggle works immediately
- [ ] Create, edit, delete operations work for all 3 types
- [ ] Trigger history shows recent fires with run links

---

## 5. API Endpoints

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| `GET` | `/v0/workflows/{id}/versions` | List all versions | Exists, verify |
| `GET` | `/v0/workflows/{id}/versions/{v}` | Get specific version | Exists, verify |
| `POST` | `/v0/workflows/{id}/versions` | Create new version | Exists, verify |
| `POST` | `/v0/workflows/{id}/versions/{v}/compile` | Compile version | Exists, verify |
| `POST` | `/v0/workflows/{id}/versions/{v}/publish` | Publish version | Exists, verify |
| `PATCH` | `/v0/workflows/{id}` | Set active version | Exists, verify |
| `GET` | `/v0/workflows/{id}/triggers` | List triggers | Exists, verify |
| `POST` | `/v0/triggers` | Create trigger | Exists, verify |
| `GET` | `/v0/triggers/{id}` | Get trigger | Exists, verify |
| `PUT` | `/v0/triggers/{id}` | Update trigger | Exists, verify |
| `DELETE` | `/v0/triggers/{id}` | Delete trigger | Exists, verify |
| `PATCH` | `/v0/triggers/{id}/enable` | Enable trigger | Exists, verify |
| `PATCH` | `/v0/triggers/{id}/disable` | Disable trigger | Exists, verify |
| `POST` | `/v0/hooks/{trigger_id}` | Webhook receiver | Wire to Run creation |

---

## 6. Data Models

### WorkflowVersion

```go
type WorkflowVersion struct {
    ID          string          `json:"id"`
    WorkflowID  string          `json:"workflow_id"`
    Version     int             `json:"version"`      // auto-increment: 1, 2, 3, ...
    Status      VersionStatus   `json:"status"`       // draft | compiled | published
    DSL         string          `json:"dsl"`          // YAML DSL source
    AST         json.RawMessage `json:"ast"`          // compiled AST (null if draft)
    Changelog   string          `json:"changelog"`
    CreatedAt   time.Time       `json:"created_at"`
    CompiledAt  *time.Time      `json:"compiled_at"`
    PublishedAt *time.Time      `json:"published_at"`
}
```

### Trigger

```go
type Trigger struct {
    ID          string          `json:"id"`
    WorkflowID  string          `json:"workflow_id"`
    Name        string          `json:"name"`
    Type        TriggerType     `json:"type"`          // webhook | cron | event
    Version     int             `json:"version"`       // published version to run
    Enabled     bool            `json:"enabled"`
    Config      json.RawMessage `json:"config"`        // type-specific config
    CreatedAt   time.Time       `json:"created_at"`
    UpdatedAt   time.Time       `json:"updated_at"`
    LastFiredAt *time.Time      `json:"last_fired_at"`
}

type WebhookTriggerConfig struct {
    URL    string `json:"url"`
    Secret string `json:"secret,omitempty"`
}

type CronTriggerConfig struct {
    Expression string          `json:"expression"`
    Timezone   string          `json:"timezone"`
    Inputs     json.RawMessage `json:"inputs"`
}

type EventTriggerConfig struct {
    Subject string          `json:"subject"`
    Filter  json.RawMessage `json:"filter"`
}
```

---

## 7. NATS Events

| Subject | Publisher | Subscriber | Purpose |
|---------|-----------|------------|---------|
| `airaie.events.*` (wildcard) | Various | Event trigger subscriptions | Event triggers listen for matching events |
| `airaie.execution.completed` | Scheduler | Trigger system (for chaining) | One workflow's completion can trigger another |

---

## 8. Test Plan

### Unit Tests

| Test | Input | Expected | File |
|------|-------|----------|------|
| Version create | workflow_id | Draft version, auto-increment version number | `workflow_test.go` |
| Version compile | draft version | Status -> compiled, AST populated | `workflow_test.go` |
| Version publish | compiled version | Status -> published, published_at set | `workflow_test.go` |
| Version immutability | edit published | 409 Conflict error | `workflow_test.go` |
| Version copy | published v1 | New draft v2 with copied DSL | `workflow_test.go` |
| Active version set | v2 | Workflow.active_version = 2 | `workflow_test.go` |
| Webhook trigger create | workflow_id, type="webhook" | Trigger with URL generated | `trigger_test.go` |
| Cron trigger create | expression="0 9 * * MON-FRI" | Trigger with validated expression | `trigger_test.go` |
| Cron invalid expression | expression="invalid" | Validation error | `trigger_test.go` |
| Event trigger create | subject="airaie.events.x" | Trigger with NATS subscription | `trigger_test.go` |
| Trigger enable/disable | trigger_id | Enabled flag toggled | `trigger_test.go` |
| Trigger version check | draft version | Error: trigger requires published version | `trigger_test.go` |
| Webhook fire | POST to webhook URL | Run created, 202 returned | `trigger_test.go` |
| Webhook secret validation | Invalid HMAC signature | 403 Forbidden | `trigger_test.go` |
| Cron fire | Cron tick | Run created | `trigger_test.go` |
| Event fire | Matching NATS event | Run created | `trigger_test.go` |
| Event filter | Non-matching event | No run created | `trigger_test.go` |
| Disabled trigger fire | POST to disabled webhook | 404 or 409 error | `trigger_test.go` |

### Integration Tests

| Test | Scope | Steps | Expected |
|------|-------|-------|----------|
| Version lifecycle E2E | API + DB | Create -> compile -> publish -> verify immutable -> create v2 | All transitions correct |
| Webhook trigger E2E | API + NATS + Scheduler | Create webhook trigger -> POST to URL -> verify run executes | Run completes successfully |
| Cron trigger E2E | Cron + Scheduler | Create 1-min cron -> wait -> verify run created | Run created within 70s |
| Event trigger E2E | NATS + Scheduler | Create event trigger -> publish matching event -> verify run | Run created from event |
| Trigger chaining | 2 workflows + triggers | Workflow A completes -> event -> triggers Workflow B | Workflow B executes |

### Manual QA

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Version history | Open workflow detail, view Versions tab | Version list with status badges |
| 2 | Publish version | Click Publish on compiled version | Status changes to published, immutable |
| 3 | Diff versions | Select v1 and v2, click Compare | Side-by-side diff shown |
| 4 | Create webhook trigger | Add Trigger -> Webhook -> Configure | Webhook URL generated and displayed |
| 5 | Test webhook | Copy curl command, run in terminal | Run appears in runs list |
| 6 | Create cron trigger | Add Trigger -> Cron -> "Every 5 minutes" | Human-readable schedule shown |
| 7 | Enable/disable trigger | Toggle trigger status | Immediate effect (webhook returns 404 when disabled) |
| 8 | Trigger history | View trigger detail | Recent fires listed with run links |

---

## 9. Definition of Done

- [ ] Version lifecycle: draft -> compiled -> published transitions verified
- [ ] Published versions are immutable (409 on edit attempts)
- [ ] Multiple published versions coexist; active version receives triggers
- [ ] Webhook triggers: URL generated, HMAC validation works, fire creates run
- [ ] Cron triggers: expression validated, schedule fires, run created
- [ ] Event triggers: NATS subscription active, filter applied, matching events create runs
- [ ] Trigger enable/disable works for all types
- [ ] Trigger can only reference published versions
- [ ] Frontend version list with status badges and diff viewer
- [ ] Frontend trigger config with type-specific UI for all 3 types
- [ ] All backend tests pass
- [ ] Webhook E2E test: curl POST -> run completes

---

## 10. Dependencies & Blockers

| Dependency | Type | Status | Impact |
|------------|------|--------|--------|
| Sprint 2.1 (compilation works) | Hard | Complete | Need compiled versions to publish |
| Sprint 2.2 (runs execute) | Hard | Complete | Triggers create and schedule runs |
| NATS JetStream running | Hard | Available | Event triggers and dispatch |
| Go cron library (robfig/cron) | Soft | Verify installed | Cron scheduling |
| PostgreSQL workflow_versions table | Hard | Available | Version persistence |
| PostgreSQL triggers table | Hard | Available | Trigger persistence |

---

## 11. Sprint Velocity & Estimates

| Category | Tasks | Total Hours | Percentage |
|----------|-------|-------------|------------|
| Backend Development | 3 tasks | 15 hours | 45% |
| Frontend Development | 2 tasks | 11 hours | 33% |
| Testing & QA | (included in tasks) | -- | -- |
| Integration Testing | Webhook/Cron/Event E2E | 5 hours | 15% |
| Sprint Overhead | Standup, review, retro | 2 hours | 6% |
| **Total** | **5 tasks** | **33 hours** | **100%** |

---

## 12. Rollback Plan

If Sprint 2.4 has issues:
1. Cron scheduler unreliable: fall back to manual-only triggers (webhook + manual), defer cron to Phase 6
2. NATS event triggers: fall back to webhook + manual, event triggers can be wired in Phase 5 integration
3. Webhook HMAC validation: make it optional (allow unsigned webhooks in development)
4. Version immutability enforcement: soft-enforce at API level if DB constraint is difficult to add
5. Frontend trigger UI: fall back to JSON-based trigger config (power user mode) if type-specific UI is delayed

---
---

# PHASE 2 COMPLETION CHECKLIST

## Sprint Summary

| Sprint | Goal | Backend Tasks | Frontend Tasks | Total Tasks | Est. Hours |
|--------|------|---------------|----------------|-------------|------------|
| 2.1 | Compilation & Validation | 4 | 3 | 7 | 35 |
| 2.2 | Execution & Scheduling | 5 | 3 | 8 | 39 |
| 2.3 | Expression System & Data Flow | 3 | 3 | 6 | 38 |
| 2.4 | Versioning & Triggers | 3 | 2 | 5 | 33 |
| **Total** | | **15** | **11** | **26** | **145** |

## Phase 2 Exit Criteria

- [ ] **Compiler:** 5-stage pipeline compiles YAML DSL to AST with execution levels
- [ ] **Validator:** 7 checks catch invalid workflows with descriptive errors
- [ ] **Expressions:** Dual syntax (DSL + canvas) translates bidirectionally
- [ ] **Preflight:** 6 universal + domain-specific checks prevent invalid executions
- [ ] **Scheduler:** Topological ordering with parallel dispatch of independent nodes
- [ ] **State Machine:** NodeRun 8-state machine with all valid transitions enforced
- [ ] **NATS:** Jobs dispatched, results consumed, events streamed end-to-end
- [ ] **Retry:** Exponential backoff with configurable max retries
- [ ] **Conditions:** IF and Switch nodes route to correct branches
- [ ] **Expressions (runtime):** All expression types resolve at dispatch time (node refs, board, gate, cost)
- [ ] **Editor:** ExpressionEditor with CodeMirror 6, syntax highlighting, autocomplete
- [ ] **Inspector:** NodeInspector with input/output panels and expression toggle
- [ ] **ParameterForm:** Auto-generated from ToolContract for all input types
- [ ] **Versions:** draft -> compiled -> published lifecycle with immutability
- [ ] **Triggers:** Webhook, cron, and event triggers create and execute runs
- [ ] **Frontend:** Compile/publish buttons, diagnostics panel, run monitor with live badges, log viewer, artifact browser, version history, trigger config

## What Comes Next

After Phase 2 completes:
- **Phase 4 (Board Governance):** depends on Phase 2 (workflows execute) + Phase 3 (agents)
- **Phase 5 (Integration):** wires Board -> Workflow -> Agent chains end-to-end
- Board context expressions (Sprint 2.3) fully tested with real board data in Phase 5

Phase 3 (Agent Intelligence) runs in parallel with Phase 2 and does not block Phase 2 completion.
