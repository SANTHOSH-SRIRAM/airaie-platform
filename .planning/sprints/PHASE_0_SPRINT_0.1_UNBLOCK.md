# PHASE 0 / SPRINT 0.1 — UNBLOCK: Fix Critical Blockers

> Sprint document generated from AIRAIE_MASTER_SPRINT_PLAN.md
> Source: Phase 0 blocker table (B1-B4) and architecture docs
> Date created: 2026-04-06

---

## 1. Sprint Overview

| Field | Value |
|-------|-------|
| **Sprint Name** | Phase 0 / Sprint 0.1 — UNBLOCK |
| **Sprint Goal** | Remove all critical blockers (B1-B4) preventing end-to-end execution of the Airaie platform so that Phase 1 (Tool Execution Golden Path) can begin |
| **Duration** | 5 days (2026-04-07 through 2026-04-11) |
| **Theme** | Backend stabilization — fix broken paths, verify infrastructure, enable real execution |
| **Team Composition** | 1 Backend Engineer (Go), 1 Systems Engineer (Rust/Docker/Infra), 1 QA Engineer (optional, can be same person) |
| **Frontend Work** | None — this is a backend-only sprint |

### Key Deliverables

1. **Plan compiler generates valid node IDs** — no dots or special characters in node IDs produced by `plan_compiler.go`
2. **ExecutePlan follows the real execution path** — stub fallback removed from `plan_generator.go`, real chain of CreateWorkflow -> CreateVersion -> Compile -> Publish -> Run is exercised
3. **Rust runner executes Docker containers end-to-end** — job dispatched via NATS `airaie.jobs.tool.execution`, container runs, artifacts land in MinIO, result published to `airaie.results.completed`
4. **LLM provider loads from environment** — `AIRAIE_LLM_PROVIDER`, `AIRAIE_LLM_API_KEY`, `AIRAIE_LLM_MODEL` read at startup; graceful fallback to deterministic scoring when missing

### Why This Sprint Matters

Every subsequent phase depends on these four capabilities:
- Phase 1 (Tool Execution) needs valid node IDs (B1) and working Docker execution (B3)
- Phase 2 (Workflows) needs the real execution path (B2) and valid node IDs (B1)
- Phase 3 (Agents) needs LLM provider wiring (B4) and working tool execution (B3)
- Phase 4 (Boards) needs all four blockers resolved since boards orchestrate everything

If any blocker remains, downstream phases will produce false test results or silently use stubs instead of real infrastructure.

---

## 2. Scope Breakdown

### Epic: E0.1 — Remove Critical Execution Blockers

**Description:** Fix 4 identified blockers that prevent the Airaie platform from executing workflows, tools, and agents end-to-end.

### User Stories

#### US-0.1.1: Plan Compiler Node ID Sanitization (Blocker B1)

**As** a board card execution pipeline,
**I need** the plan compiler to generate node IDs that contain only lowercase alphanumeric characters, underscores, and hyphens,
**So that** compiled workflow YAML is valid and the scheduler/dispatcher can reference nodes without parsing errors.

**Acceptance Criteria:**
- AC-1: Node IDs produced by `plan_compiler.go` match the regex `^[a-z0-9_-]+$`
- AC-2: Input names containing dots (e.g., `cad.geometry_check`) are transformed to underscores (e.g., `cad_geometry_check`)
- AC-3: Input names containing uppercase letters are lowercased
- AC-4: Input names containing spaces, slashes, or other special characters are replaced with underscores
- AC-5: Consecutive underscores from multiple replacements are collapsed to a single underscore
- AC-6: Leading/trailing underscores are trimmed
- AC-7: Existing valid node IDs (e.g., `mesh_gen_1`) pass through unchanged
- AC-8: Unit tests cover all edge cases listed above

#### US-0.1.2: Remove Stub Fallback in ExecutePlan (Blocker B2)

**As** the board system's execution chain,
**I need** `ExecutePlan` in `plan_generator.go` to follow the real workflow creation path,
**So that** board cards actually create and run workflows instead of returning fake stub results.

**Acceptance Criteria:**
- AC-1: The early-return stub code path in `ExecutePlan` is removed
- AC-2: `ExecutePlan` calls `CreateWorkflow` with the plan's generated YAML
- AC-3: `ExecutePlan` calls `CreateVersion` on the new workflow
- AC-4: `ExecutePlan` calls `Compile` on the version (producing validated AST)
- AC-5: `ExecutePlan` calls `Publish` to make the version runnable
- AC-6: `ExecutePlan` calls `StartRun` (or equivalent) to dispatch the workflow
- AC-7: Errors at any step propagate clearly with the step name in the error message
- AC-8: Integration test confirms the full chain executes against a live database

#### US-0.1.3: Rust Runner Docker Execution Verification (Blocker B3)

**As** the workflow scheduler,
**I need** the Rust runner to consume job messages from NATS, execute Docker containers, upload output artifacts to MinIO, and publish results back to NATS,
**So that** tool nodes in workflows actually perform real computation.

**Acceptance Criteria:**
- AC-1: Rust runner binary builds and starts without errors
- AC-2: Runner subscribes to `airaie.jobs.tool.execution` NATS subject
- AC-3: When a job is published, runner pulls the specified Docker image
- AC-4: Runner creates workspace directories at `/tmp/airaie-runner/{job_id}/inputs/` and `/tmp/airaie-runner/{job_id}/outputs/`
- AC-5: Runner downloads input artifacts from MinIO presigned URLs to the inputs directory
- AC-6: Runner starts the container with inputs mounted read-only and outputs mounted writable
- AC-7: On container exit code 0: runner uploads files from `/outputs/` to MinIO and publishes a `SUCCEEDED` result to `airaie.results.completed`
- AC-8: On container exit code != 0: runner publishes a `FAILED` result with stderr captured
- AC-9: On container timeout: runner kills the container and publishes a `TIMEOUT` result
- AC-10: Workspace directory is cleaned up after result publication
- AC-11: Integration test demonstrates full cycle with a simple test tool (e.g., `alpine:latest` running `echo "hello" > /workspace/outputs/result.txt`)

#### US-0.1.4: LLM Provider Environment Configuration (Blocker B4)

**As** the agent runtime,
**I need** LLM provider configuration loaded from environment variables at startup,
**So that** agents can use LLM reasoning when configured, and fall back to deterministic-only scoring when not.

**Acceptance Criteria:**
- AC-1: `AIRAIE_LLM_PROVIDER` env var is read at startup (valid values: `anthropic`, `openai`, `google`, `huggingface`, empty/missing)
- AC-2: `AIRAIE_LLM_API_KEY` env var is read at startup
- AC-3: `AIRAIE_LLM_MODEL` env var is read at startup (e.g., `claude-sonnet-4-6`, `gpt-4o`)
- AC-4: When all three are set, the LLM provider is initialized and available to the agent runtime
- AC-5: When any are missing or empty, the system logs a clear warning and activates deterministic-only mode (pure algorithmic scoring, no LLM calls)
- AC-6: Deterministic mode uses the 5-dimension algorithmic scoring (compatibility 0.4, trust 0.3, cost 0.2, latency 0.1, risk penalty) without the LLM weight component
- AC-7: The system does NOT crash or panic when LLM env vars are missing
- AC-8: A health check endpoint or startup log line confirms whether LLM mode or deterministic mode is active
- AC-9: Unit test verifies both code paths (LLM configured vs. LLM missing)

### Tasks (Summary)

| Task ID | Story | Task | Estimated Hours |
|---------|-------|------|-----------------|
| T-0.1.1 | US-0.1.1 | Implement `sanitizeNodeID()` function in plan_compiler.go | 2h |
| T-0.1.2 | US-0.1.1 | Wire sanitization into all node ID generation call sites | 1h |
| T-0.1.3 | US-0.1.1 | Write unit tests for sanitizeNodeID | 1.5h |
| T-0.1.4 | US-0.1.2 | Remove stub early-return in ExecutePlan | 1h |
| T-0.1.5 | US-0.1.2 | Wire real chain: CreateWorkflow -> CreateVersion -> Compile -> Publish -> StartRun | 3h |
| T-0.1.6 | US-0.1.2 | Write integration test for ExecutePlan real path | 2h |
| T-0.1.7 | US-0.1.3 | Build Rust runner binary and verify startup | 2h |
| T-0.1.8 | US-0.1.3 | Verify NATS subscription and job deserialization | 2h |
| T-0.1.9 | US-0.1.3 | Verify Docker container lifecycle (pull, create, start, wait, remove) | 3h |
| T-0.1.10 | US-0.1.3 | Verify MinIO artifact upload/download in runner | 2h |
| T-0.1.11 | US-0.1.3 | Verify result publication to airaie.results.completed | 1h |
| T-0.1.12 | US-0.1.3 | Write end-to-end integration test (NATS -> Docker -> MinIO -> NATS) | 3h |
| T-0.1.13 | US-0.1.4 | Implement env var loading for AIRAIE_LLM_* in llm.go | 1.5h |
| T-0.1.14 | US-0.1.4 | Implement deterministic fallback mode | 2h |
| T-0.1.15 | US-0.1.4 | Wire env loading into api-gateway startup (main.go) | 1h |
| T-0.1.16 | US-0.1.4 | Write unit tests for both LLM and deterministic paths | 1.5h |
| **Total** | | | **29.5h** |

---

## 3. Detailed Task Planning

### T-0.1.1: Implement `sanitizeNodeID()` Function

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.1 |
| **Story** | US-0.1.1 (Blocker B1) |
| **Description** | Create a `sanitizeNodeID(raw string) string` function in `internal/service/plan_compiler.go` that normalizes arbitrary strings into valid node IDs. The function must: (1) lowercase the input, (2) replace any character NOT matching `[a-z0-9_-]` with an underscore, (3) collapse consecutive underscores to one, (4) trim leading/trailing underscores and hyphens. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 2 hours |
| **Inputs** | Raw node name strings from PlanNode definitions (e.g., `node_000_cad.geometry_check`, `FEA Stress Analysis v2`, `mesh/refinement.step`) |
| **Output** | A pure function `sanitizeNodeID` with no side effects, plus the compiled regex `var nodeIDRegex = regexp.MustCompile("[^a-z0-9_-]")` at package level |
| **Definition of Done** | Function exists, compiles, handles all documented edge cases, is called from node ID generation sites (see T-0.1.2) |

**Implementation Detail:**
```go
// internal/service/plan_compiler.go

import (
    "regexp"
    "strings"
)

var nodeIDSanitizer = regexp.MustCompile(`[^a-z0-9_-]+`)
var multiUnderscore = regexp.MustCompile(`_+`)

func sanitizeNodeID(raw string) string {
    lower := strings.ToLower(raw)
    sanitized := nodeIDSanitizer.ReplaceAllString(lower, "_")
    sanitized = multiUnderscore.ReplaceAllString(sanitized, "_")
    sanitized = strings.Trim(sanitized, "_-")
    if sanitized == "" {
        sanitized = "node"
    }
    return sanitized
}
```

---

### T-0.1.2: Wire Sanitization Into Node ID Generation Call Sites

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.2 |
| **Story** | US-0.1.1 (Blocker B1) |
| **Description** | Locate every place in `plan_compiler.go` where node IDs are constructed (typically `fmt.Sprintf("node_%03d_%s", index, toolName)` or similar patterns). Wrap the tool name portion through `sanitizeNodeID()`. Also check `plan_generator.go` for any node ID construction that feeds into the compiler. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 1 hour |
| **Inputs** | Existing node ID construction code in plan_compiler.go and plan_generator.go |
| **Output** | All node ID construction sites use sanitizeNodeID for the variable portion |
| **Definition of Done** | `grep -r` for node ID construction patterns confirms all sites are wrapped; compiles successfully; no direct string concatenation of user-supplied names into node IDs |

**Search Pattern for Call Sites:**
```
grep -n "node_" internal/service/plan_compiler.go
grep -n "node_id" internal/service/plan_generator.go
grep -n "NodeID" internal/service/plan_compiler.go
grep -n "Sprintf.*node" internal/service/plan_compiler.go
```

---

### T-0.1.3: Write Unit Tests for sanitizeNodeID

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.3 |
| **Story** | US-0.1.1 (Blocker B1) |
| **Description** | Write table-driven Go unit tests covering all edge cases for `sanitizeNodeID`. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 1.5 hours |
| **Inputs** | The sanitizeNodeID function from T-0.1.1 |
| **Output** | `internal/service/plan_compiler_test.go` with `TestSanitizeNodeID` |
| **Definition of Done** | All test cases pass; `go test ./internal/service/...` exits 0 |

**Test Cases:**
| Input | Expected Output | Rationale |
|-------|-----------------|-----------|
| `"mesh_gen_1"` | `"mesh_gen_1"` | Already valid, no change |
| `"cad.geometry_check"` | `"cad_geometry_check"` | Dots replaced with underscores |
| `"FEA Stress Analysis"` | `"fea_stress_analysis"` | Uppercase lowered, spaces to underscores |
| `"node_000_cad.geometry_check"` | `"node_000_cad_geometry_check"` | The exact blocker scenario |
| `"mesh/refinement.step"` | `"mesh_refinement_step"` | Slashes and dots both replaced |
| `"___leading___"` | `"leading"` | Leading/trailing underscores trimmed |
| `"a--b__c"` | `"a--b_c"` | Hyphens preserved, multi-underscores collapsed |
| `"UPPER-case-MIX"` | `"upper-case-mix"` | Uppercase converted to lower |
| `""` | `"node"` | Empty string gets default |
| `"..."` | `"node"` | All-invalid characters get default |
| `"node-with-hyphens"` | `"node-with-hyphens"` | Hyphens are valid, no change |
| `"tool@v2.0.1#beta"` | `"tool_v2_0_1_beta"` | Mixed special chars all replaced |
| `"a"` | `"a"` | Single character, valid |

---

### T-0.1.4: Remove Stub Early-Return in ExecutePlan

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.4 |
| **Story** | US-0.1.2 (Blocker B2) |
| **Description** | In `internal/service/plan_generator.go`, locate the `ExecutePlan` function. Find the early-return stub that bypasses real workflow creation (typically a block that returns a hardcoded or mock result before reaching `CreateWorkflow`). Remove it entirely. The code below it (the real path) must become the active path. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 1 hour |
| **Inputs** | Current plan_generator.go with stub code |
| **Output** | plan_generator.go with stub removed; real code path is the only path |
| **Definition of Done** | The function no longer contains any early-return that short-circuits before CreateWorkflow; compiles successfully; no dead code remains |

**What to Look For:**
```go
// PATTERN: The stub typically looks like this:
func (s *PlanGeneratorService) ExecutePlan(ctx context.Context, plan *model.ExecutionPlan) (*model.Run, error) {
    // ---- STUB START (REMOVE THIS BLOCK) ----
    if true { // or some always-true condition
        return &model.Run{
            ID:     uuid.New(),
            Status: "COMPLETED",
            // ... fake results
        }, nil
    }
    // ---- STUB END ----
    
    // Real path below (this should remain):
    wf, err := s.workflowService.CreateWorkflow(ctx, ...)
    ...
}
```

---

### T-0.1.5: Wire Real Execution Chain in ExecutePlan

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.5 |
| **Story** | US-0.1.2 (Blocker B2) |
| **Description** | Verify and complete the real execution chain in `ExecutePlan` after stub removal. The function must call 5 operations in sequence, with proper error handling at each step. If any step fails, the function should return an error that includes the step name for debugging. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 3 hours |
| **Inputs** | ExecutionPlan model (with PlanNodes, PlanEdges, bindings); existing service interfaces for workflow, version, compiler, scheduler |
| **Output** | Complete ExecutePlan function that exercises the full chain |
| **Definition of Done** | Function compiles; each step is called in order; error messages include step context; no panics on nil returns |

**Required Chain:**
```
Step 1: CreateWorkflow
  Input:  Plan name, project_id, generated YAML from plan nodes/edges
  Output: Workflow record with ID
  Error:  "ExecutePlan: CreateWorkflow failed: %w"

Step 2: CreateVersion
  Input:  Workflow ID, version DSL (YAML)
  Output: WorkflowVersion record with version number
  Error:  "ExecutePlan: CreateVersion failed: %w"

Step 3: Compile
  Input:  Workflow ID, Version ID
  Output: Compiled AST, validation result
  Error:  "ExecutePlan: Compile failed: %w"
  Note:   If validation fails, return error with validation details

Step 4: Publish
  Input:  Workflow ID, Version ID
  Output: Published version (status = PUBLISHED)
  Error:  "ExecutePlan: Publish failed: %w"

Step 5: StartRun
  Input:  Workflow ID, Version number, trigger inputs (from plan bindings)
  Output: Run record with ID, status = PENDING
  Error:  "ExecutePlan: StartRun failed: %w"
```

---

### T-0.1.6: Write Integration Test for ExecutePlan Real Path

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.6 |
| **Story** | US-0.1.2 (Blocker B2) |
| **Description** | Write an integration test that exercises the full ExecutePlan chain against a real PostgreSQL database (using test containers or the dev Docker Compose stack). The test should create a minimal ExecutionPlan with 1 tool node, call ExecutePlan, and verify that a Workflow, WorkflowVersion, and Run are created in the database. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 2 hours |
| **Inputs** | Running PostgreSQL with migrations applied; service layer initialized |
| **Output** | `internal/service/plan_generator_test.go` with `TestExecutePlan_RealPath` |
| **Definition of Done** | Test passes against a live database; verifies Workflow, Version, and Run exist after ExecutePlan returns |

**Test Structure:**
```go
func TestExecutePlan_RealPath(t *testing.T) {
    // Setup: initialize DB, run migrations, create services
    // Arrange: build a minimal ExecutionPlan with 1 PlanNode
    // Act: call ExecutePlan
    // Assert:
    //   1. No error returned
    //   2. Workflow exists in DB with correct name
    //   3. WorkflowVersion exists with status = PUBLISHED
    //   4. Run exists with status = PENDING (or RUNNING if async dispatch started)
    //   5. Run references the correct workflow and version
}
```

---

### T-0.1.7: Build Rust Runner Binary and Verify Startup

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.7 |
| **Story** | US-0.1.3 (Blocker B3) |
| **Description** | Build the Rust runner from `runner/src/` using `cargo build --release`. Verify that the binary starts, reads its configuration (NATS URL, MinIO endpoint, concurrency slots), and connects to NATS JetStream without errors. |
| **Owner Role** | Systems Engineer (Rust/Docker) |
| **Estimated Effort** | 2 hours |
| **Inputs** | Rust source in `runner/src/`, Cargo.toml, running NATS and MinIO instances (via Docker Compose) |
| **Output** | Compiled binary at `runner/target/release/airaie-runner`; startup log showing successful NATS and MinIO connections |
| **Definition of Done** | Binary compiles without warnings on stable Rust; starts and logs "Connected to NATS" and "Connected to MinIO" (or equivalent); no panics on startup |

**Startup Verification Checklist:**
- [ ] `cargo build --release` succeeds
- [ ] Binary starts with `NATS_URL=nats://localhost:4222`
- [ ] Binary starts with `MINIO_ENDPOINT=http://localhost:9000`
- [ ] Logs show successful connection to both services
- [ ] Binary does not exit immediately (stays alive waiting for jobs)

---

### T-0.1.8: Verify NATS Subscription and Job Deserialization

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.8 |
| **Story** | US-0.1.3 (Blocker B3) |
| **Description** | Verify that the Rust runner subscribes to `airaie.jobs.tool.execution` and can deserialize the JobPayload JSON published by the Go control plane's Dispatcher. Publish a test job message manually via NATS CLI or a test script and confirm the runner logs it correctly. |
| **Owner Role** | Systems Engineer (Rust/Docker) |
| **Estimated Effort** | 2 hours |
| **Inputs** | Running Rust runner (from T-0.1.7), NATS server, JobPayload schema from Go dispatcher |
| **Output** | Runner logs showing received and deserialized job; no deserialization errors |
| **Definition of Done** | Publish a JSON job to `airaie.jobs.tool.execution`, runner logs the job_id and tool details correctly |

**JobPayload Schema (expected by runner):**
```json
{
  "job_id": "uuid-string",
  "run_id": "uuid-string",
  "node_id": "mesh_gen_1",
  "tool_id": "tool_mesh_gen",
  "tool_version": "1.0.0",
  "docker_image": "alpine:latest",
  "inputs": {
    "parameters": { "key": "value" },
    "artifacts": [
      {
        "name": "input_geometry",
        "presigned_url": "http://minio:9000/bucket/path?signature=..."
      }
    ]
  },
  "resource_limits": {
    "cpu": "2",
    "memory": "4Gi",
    "timeout_seconds": 300
  },
  "sandbox": {
    "network": "deny",
    "filesystem": "sandbox"
  }
}
```

**NATS CLI Test Command:**
```bash
nats pub airaie.jobs.tool.execution '{"job_id":"test-001","run_id":"run-001","node_id":"test_node","tool_id":"test_tool","tool_version":"1.0.0","docker_image":"alpine:latest","inputs":{"parameters":{},"artifacts":[]},"resource_limits":{"cpu":"1","memory":"512Mi","timeout_seconds":60},"sandbox":{"network":"deny","filesystem":"sandbox"}}'
```

---

### T-0.1.9: Verify Docker Container Lifecycle

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.9 |
| **Story** | US-0.1.3 (Blocker B3) |
| **Description** | Verify the Rust runner's Docker adapter correctly manages the full container lifecycle: pull image, create container with volume mounts, start container, wait for exit, capture exit code, capture stdout/stderr, remove container. Test with both a succeeding container (exit 0) and a failing container (exit 1). |
| **Owner Role** | Systems Engineer (Rust/Docker) |
| **Estimated Effort** | 3 hours |
| **Inputs** | Running Rust runner, Docker daemon accessible from runner |
| **Output** | Runner logs showing full lifecycle for both success and failure cases |
| **Definition of Done** | Success case: container runs, exits 0, runner logs SUCCESS. Failure case: container exits non-zero, runner logs FAILED with stderr. Timeout case: container exceeds timeout, runner kills it and logs TIMEOUT. |

**Test Containers:**
```bash
# Success case: writes a file to /workspace/outputs/
docker run --rm -v /outputs:/workspace/outputs alpine:latest \
  sh -c 'echo "result_data" > /workspace/outputs/result.txt'

# Failure case: exits with code 1
docker run --rm alpine:latest sh -c 'echo "error: missing input" >&2; exit 1'

# Timeout case: sleeps forever (runner should kill after timeout)
docker run --rm alpine:latest sh -c 'sleep 9999'
```

**Volume Mount Expectations:**
```
Host: /tmp/airaie-runner/{job_id}/inputs/  -> Container: /workspace/inputs/  (read-only)
Host: /tmp/airaie-runner/{job_id}/outputs/ -> Container: /workspace/outputs/ (read-write)
```

---

### T-0.1.10: Verify MinIO Artifact Upload/Download in Runner

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.10 |
| **Story** | US-0.1.3 (Blocker B3) |
| **Description** | Verify that the Rust runner can: (1) download input artifacts from MinIO using presigned URLs before container execution, and (2) upload output artifacts to MinIO after container execution. Check that SHA-256 hashes and file sizes are computed correctly. |
| **Owner Role** | Systems Engineer (Rust/Docker) |
| **Estimated Effort** | 2 hours |
| **Inputs** | Running MinIO instance with a test bucket; test artifacts uploaded manually |
| **Output** | Input artifacts appear in `/tmp/airaie-runner/{job_id}/inputs/`, output artifacts appear in MinIO bucket after job |
| **Definition of Done** | Download: artifact present at expected path before container starts. Upload: artifact present in MinIO after container exits; SHA-256 matches; file size matches. |

**Verification Steps:**
```bash
# 1. Create test bucket
mc mb minio/airaie-artifacts

# 2. Upload a test input artifact
echo "test geometry data" > /tmp/test_input.step
mc cp /tmp/test_input.step minio/airaie-artifacts/inputs/test_input.step

# 3. Generate presigned URL
mc share download minio/airaie-artifacts/inputs/test_input.step

# 4. Submit job with presigned URL as input artifact
# 5. After job completes, check MinIO for output artifacts:
mc ls minio/airaie-artifacts/outputs/
```

---

### T-0.1.11: Verify Result Publication to NATS

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.11 |
| **Story** | US-0.1.3 (Blocker B3) |
| **Description** | Verify that after job completion, the Rust runner publishes a correctly formatted Result payload to `airaie.results.completed`. Subscribe to this subject with `nats sub` before dispatching a test job, and confirm the result message structure matches what the Go ResultHandler expects. |
| **Owner Role** | Systems Engineer (Rust/Docker) |
| **Estimated Effort** | 1 hour |
| **Inputs** | Running runner processing a test job |
| **Output** | Result JSON captured from `airaie.results.completed` |
| **Definition of Done** | Result message contains: job_id, status (SUCCEEDED/FAILED/TIMEOUT/CANCELED), exit_code, outputs (list of artifact references), metrics (if metrics.json present), errors (if failed), duration_ms |

**Expected Result Payload:**
```json
{
  "job_id": "test-001",
  "run_id": "run-001",
  "node_id": "test_node",
  "status": "SUCCEEDED",
  "exit_code": 0,
  "outputs": [
    {
      "name": "result.txt",
      "artifact_url": "s3://airaie-artifacts/outputs/test-001/result.txt",
      "sha256": "abc123...",
      "size_bytes": 42
    }
  ],
  "metrics": {},
  "errors": [],
  "duration_ms": 1523,
  "timestamp": "2026-04-08T10:30:00Z"
}
```

**Verification Command:**
```bash
# Terminal 1: subscribe to results
nats sub airaie.results.completed

# Terminal 2: dispatch a test job (from T-0.1.8)
nats pub airaie.jobs.tool.execution '{ ... }'

# Terminal 1 should show the result JSON
```

---

### T-0.1.12: End-to-End Rust Runner Integration Test

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.12 |
| **Story** | US-0.1.3 (Blocker B3) |
| **Description** | Write a scripted integration test that exercises the complete Rust runner cycle: publish a job to NATS with a test tool image, wait for the container to execute, verify output artifacts land in MinIO, and verify the result appears on `airaie.results.completed`. This test should be repeatable and idempotent. |
| **Owner Role** | Systems Engineer (Rust/Docker) |
| **Estimated Effort** | 3 hours |
| **Inputs** | Running NATS, MinIO, Docker, and Rust runner |
| **Output** | Test script (shell or Rust integration test) at `runner/tests/integration_test_docker.sh` or `runner/tests/integration_test.rs` |
| **Definition of Done** | Script runs in CI; all assertions pass; cleans up after itself (removes test artifacts, containers) |

**Test Script Outline:**
```bash
#!/bin/bash
set -euo pipefail

JOB_ID="integration-test-$(date +%s)"
BUCKET="airaie-artifacts"

# 1. Upload a test input artifact to MinIO
echo '{"geometry": "cube", "units": "mm"}' > /tmp/test_input.json
mc cp /tmp/test_input.json minio/$BUCKET/inputs/$JOB_ID/input.json
INPUT_URL=$(mc share download --json minio/$BUCKET/inputs/$JOB_ID/input.json | jq -r .url)

# 2. Subscribe to results (background, capture output)
nats sub airaie.results.completed --count=1 > /tmp/result_$JOB_ID.json &
SUB_PID=$!

# 3. Publish job
nats pub airaie.jobs.tool.execution "$(cat <<EOF
{
  "job_id": "$JOB_ID",
  "run_id": "test-run-001",
  "node_id": "test_node",
  "tool_id": "echo_tool",
  "tool_version": "1.0.0",
  "docker_image": "alpine:latest",
  "inputs": {
    "parameters": {"message": "hello airaie"},
    "artifacts": [{"name": "input.json", "presigned_url": "$INPUT_URL"}]
  },
  "resource_limits": {"cpu": "1", "memory": "256Mi", "timeout_seconds": 30},
  "sandbox": {"network": "deny", "filesystem": "sandbox"}
}
EOF
)"

# 4. Wait for result (max 30s)
wait $SUB_PID || { echo "FAIL: No result received"; exit 1; }

# 5. Parse result
STATUS=$(jq -r .status /tmp/result_$JOB_ID.json)
[ "$STATUS" = "SUCCEEDED" ] || { echo "FAIL: Expected SUCCEEDED, got $STATUS"; exit 1; }

# 6. Verify output artifact in MinIO
mc ls minio/$BUCKET/outputs/$JOB_ID/ || { echo "FAIL: No output artifacts in MinIO"; exit 1; }

# 7. Cleanup
mc rm --recursive --force minio/$BUCKET/inputs/$JOB_ID/
mc rm --recursive --force minio/$BUCKET/outputs/$JOB_ID/
rm -f /tmp/test_input.json /tmp/result_$JOB_ID.json

echo "PASS: End-to-end Rust runner integration test succeeded"
```

---

### T-0.1.13: Implement Env Var Loading for LLM Provider

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.13 |
| **Story** | US-0.1.4 (Blocker B4) |
| **Description** | In `internal/agent/llm.go`, implement (or fix) the initialization function that reads `AIRAIE_LLM_PROVIDER`, `AIRAIE_LLM_API_KEY`, and `AIRAIE_LLM_MODEL` from environment variables at startup. Return an `LLMProvider` interface implementation for the configured provider, or `nil` if not configured (signaling deterministic mode). |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 1.5 hours |
| **Inputs** | Environment variables; existing LLMProvider interface and provider implementations (Anthropic, OpenAI, etc.) |
| **Output** | Updated `NewLLMProvider()` or `InitLLMProvider()` function that reads env vars and returns the correct provider |
| **Definition of Done** | Function reads all 3 env vars; returns correct provider type; returns nil + logs warning when vars missing; no panics |

**Implementation Approach:**
```go
// internal/agent/llm.go

type LLMConfig struct {
    Provider string // "anthropic", "openai", "google", "huggingface"
    APIKey   string
    Model    string
}

func LoadLLMConfigFromEnv() (*LLMConfig, error) {
    provider := os.Getenv("AIRAIE_LLM_PROVIDER")
    apiKey := os.Getenv("AIRAIE_LLM_API_KEY")
    model := os.Getenv("AIRAIE_LLM_MODEL")

    if provider == "" || apiKey == "" || model == "" {
        log.Warn("LLM provider not fully configured; " +
            "activating deterministic-only mode. " +
            "Set AIRAIE_LLM_PROVIDER, AIRAIE_LLM_API_KEY, AIRAIE_LLM_MODEL to enable LLM.")
        return nil, nil
    }

    validProviders := map[string]bool{
        "anthropic": true, "openai": true,
        "google": true, "huggingface": true,
    }
    if !validProviders[provider] {
        return nil, fmt.Errorf("unknown LLM provider %q; "+
            "valid values: anthropic, openai, google, huggingface", provider)
    }

    return &LLMConfig{Provider: provider, APIKey: apiKey, Model: model}, nil
}
```

---

### T-0.1.14: Implement Deterministic Fallback Mode

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.14 |
| **Story** | US-0.1.4 (Blocker B4) |
| **Description** | Implement or verify the deterministic scoring path that is used when no LLM provider is configured. In this mode, the agent uses only the 5-dimension algorithmic scoring (compatibility 0.4, trust 0.3, cost 0.2, latency 0.1, risk penalty) without any LLM weight. The `llm_weight` in the AgentSpec should be set to 0.0 in deterministic mode. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 2 hours |
| **Inputs** | Scorer implementation in `internal/service/runtime.go`, LLMConfig (nil when in deterministic mode) |
| **Output** | Scorer that skips LLM call when LLM is nil and uses 100% algorithmic scoring |
| **Definition of Done** | When LLMConfig is nil, scoring runs without error; no LLM API calls are made; final score uses only algorithmic dimensions; log line confirms deterministic mode at scoring time |

**Scoring Formula (deterministic mode):**
```
score = (compatibility * 0.4) + (trust * 0.3) + (cost * 0.2) + (latency * 0.1) - risk_penalty

Where:
  compatibility = input/output type match ratio (0.0 to 1.0)
  trust = (successes + 5) / (total_runs + 10)  (Bayesian)
  cost = 1.0 - (tool_cost / budget_limit)  (inverted, higher is better)
  latency = 1.0 - (estimated_time / deadline)  (inverted, higher is better)
  risk_penalty = side_effect_count * 0.05 + failure_rate * 0.1
```

---

### T-0.1.15: Wire Env Loading Into API Gateway Startup

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.15 |
| **Story** | US-0.1.4 (Blocker B4) |
| **Description** | In `services/api-gateway/main.go`, ensure that `LoadLLMConfigFromEnv()` (from T-0.1.13) is called during application startup, and the resulting config (or nil) is injected into the agent runtime service. Add a startup log line indicating whether LLM mode or deterministic mode is active. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 1 hour |
| **Inputs** | main.go startup sequence, LLM config loader, agent runtime service constructor |
| **Output** | main.go calls LoadLLMConfigFromEnv and passes result to agent service initialization |
| **Definition of Done** | On startup with LLM vars set: log shows "LLM mode: anthropic / claude-sonnet-4-6". On startup without LLM vars: log shows "Deterministic mode: LLM not configured". No startup failures in either case. |

---

### T-0.1.16: Write Unit Tests for LLM Configuration Paths

| Field | Detail |
|-------|--------|
| **Task ID** | T-0.1.16 |
| **Story** | US-0.1.4 (Blocker B4) |
| **Description** | Write unit tests covering: (1) all 3 env vars set with valid provider -> returns LLMConfig, (2) missing AIRAIE_LLM_PROVIDER -> returns nil, (3) missing AIRAIE_LLM_API_KEY -> returns nil, (4) missing AIRAIE_LLM_MODEL -> returns nil, (5) invalid provider name -> returns error, (6) deterministic scoring produces a valid score without LLM. |
| **Owner Role** | Backend Engineer (Go) |
| **Estimated Effort** | 1.5 hours |
| **Inputs** | LoadLLMConfigFromEnv function, Scorer with deterministic mode |
| **Output** | `internal/agent/llm_test.go` with `TestLoadLLMConfigFromEnv` and `TestDeterministicScoring` |
| **Definition of Done** | All 6 test cases pass; `go test ./internal/agent/...` exits 0 |

**Test Cases:**
```go
func TestLoadLLMConfigFromEnv(t *testing.T) {
    tests := []struct {
        name        string
        envVars     map[string]string
        wantConfig  bool
        wantErr     bool
    }{
        {
            name:       "all vars set - anthropic",
            envVars:    map[string]string{"AIRAIE_LLM_PROVIDER": "anthropic", "AIRAIE_LLM_API_KEY": "sk-xxx", "AIRAIE_LLM_MODEL": "claude-sonnet-4-6"},
            wantConfig: true,
            wantErr:    false,
        },
        {
            name:       "all vars set - openai",
            envVars:    map[string]string{"AIRAIE_LLM_PROVIDER": "openai", "AIRAIE_LLM_API_KEY": "sk-xxx", "AIRAIE_LLM_MODEL": "gpt-4o"},
            wantConfig: true,
            wantErr:    false,
        },
        {
            name:       "missing provider",
            envVars:    map[string]string{"AIRAIE_LLM_API_KEY": "sk-xxx", "AIRAIE_LLM_MODEL": "gpt-4o"},
            wantConfig: false,
            wantErr:    false,  // nil, nil = deterministic mode
        },
        {
            name:       "missing api key",
            envVars:    map[string]string{"AIRAIE_LLM_PROVIDER": "anthropic", "AIRAIE_LLM_MODEL": "claude-sonnet-4-6"},
            wantConfig: false,
            wantErr:    false,
        },
        {
            name:       "missing model",
            envVars:    map[string]string{"AIRAIE_LLM_PROVIDER": "anthropic", "AIRAIE_LLM_API_KEY": "sk-xxx"},
            wantConfig: false,
            wantErr:    false,
        },
        {
            name:       "invalid provider",
            envVars:    map[string]string{"AIRAIE_LLM_PROVIDER": "invalid", "AIRAIE_LLM_API_KEY": "sk-xxx", "AIRAIE_LLM_MODEL": "model"},
            wantConfig: false,
            wantErr:    true,
        },
        {
            name:       "all empty strings",
            envVars:    map[string]string{"AIRAIE_LLM_PROVIDER": "", "AIRAIE_LLM_API_KEY": "", "AIRAIE_LLM_MODEL": ""},
            wantConfig: false,
            wantErr:    false,
        },
    }
    // ... test body sets env vars, calls LoadLLMConfigFromEnv, asserts
}
```

---

## 4. Technical Implementation Plan

### Architecture Context

```
┌──────────────────────────────────────────────────────────────────┐
│  Go Control Plane (:8080)                                        │
│                                                                  │
│  Board Card → ExecutePlan [B2]                                   │
│       │                                                          │
│       ▼                                                          │
│  PlanGenerator.ExecutePlan()                                     │
│       │                                                          │
│       ├─ CreateWorkflow (YAML DSL)                               │
│       ├─ CreateVersion                                           │
│       ├─ Compile ← plan_compiler.go [B1: node ID sanitization]  │
│       ├─ Publish                                                 │
│       └─ StartRun                                                │
│              │                                                   │
│              ▼                                                   │
│  Scheduler → Dispatcher                                          │
│       │                                                          │
│       ▼                                                          │
│  NATS: airaie.jobs.tool.execution                                │
│       │                                                          │
│       ▼                                                          │
│  Rust Runner [B3]                                                │
│       ├─ Download inputs from MinIO                              │
│       ├─ Docker: pull → create → start → wait → collect          │
│       ├─ Upload outputs to MinIO                                 │
│       └─ Publish result to airaie.results.completed              │
│              │                                                   │
│              ▼                                                   │
│  ResultHandler (Go) → Update NodeRun → Dispatch next nodes       │
│                                                                  │
│  Agent Runtime [B4]                                              │
│       ├─ LoadLLMConfigFromEnv()                                  │
│       ├─ If configured: LLM + algorithmic hybrid scoring         │
│       └─ If not configured: pure algorithmic scoring             │
└──────────────────────────────────────────────────────────────────┘
```

### B1: Node ID Sanitization — Technical Details

**File:** `internal/service/plan_compiler.go`

**Current Behavior (Bug):**
The plan compiler takes tool names (which may contain dots for namespacing, e.g., `cad.geometry_check`) and concatenates them into node IDs like `node_000_cad.geometry_check`. Dots are invalid in node IDs because:
1. YAML key parsing treats dots as nested object accessors in some libraries
2. The expression system `{{ $nodes.X.outputs.Y }}` uses dots as path separators, so a node ID with dots creates ambiguity
3. NATS subject namespacing uses dots as delimiters
4. PostgreSQL queries may escape dots differently depending on the ORM

**Fix Approach:**
1. Add `sanitizeNodeID()` as a package-level pure function
2. Apply it wherever a node ID is constructed from user-provided or derived names
3. The function is idempotent: passing an already-valid ID through it returns the same string

**Regex Justification:**
- `[^a-z0-9_-]+` matches one or more characters that are NOT lowercase alphanumeric, underscore, or hyphen
- Replacing the entire match with a single `_` naturally handles consecutive invalid characters without producing `___`
- A separate pass with `_+` -> `_` catches cases where valid underscores surround the replaced segment

### B2: Stub Removal — Technical Details

**File:** `internal/service/plan_generator.go`

**Current Behavior (Bug):**
The `ExecutePlan` function has an early-return stub that was introduced during initial development to allow frontend testing without a fully working backend. The stub returns a mock Run with status COMPLETED and fake node results. This means that:
- The real `CreateWorkflow` code is never reached
- No actual YAML is compiled
- No workflow version is created
- No run is dispatched
- Frontend sees "success" but nothing real happened

**Fix Approach:**
1. Delete the entire stub block (typically guarded by `if true`, a feature flag, or a TODO comment)
2. Ensure the remaining code has all necessary service dependencies injected (workflow service, version service, compiler service, scheduler service)
3. Add error wrapping at each step for clear debugging
4. The function signature and return type remain unchanged

**Service Dependencies Required:**
```go
type PlanGeneratorService struct {
    workflowService  WorkflowService
    versionService   VersionService
    compilerService  CompilerService
    schedulerService SchedulerService
    store            Store
}
```

### B3: Rust Runner — Technical Details

**Directory:** `runner/src/`

**Architecture:**
The Rust runner is a standalone binary that:
1. Connects to NATS JetStream at startup
2. Subscribes to `airaie.jobs.tool.execution` with a durable consumer
3. For each job, creates a workspace at `/tmp/airaie-runner/{job_id}/`
4. Downloads input artifacts from MinIO via presigned HTTP GET
5. Starts a Docker container with workspace volumes mounted
6. Monitors the container (timeout, OOM)
7. On exit, uploads output files from `/workspace/outputs/` to MinIO via presigned HTTP PUT
8. Publishes a Result message to `airaie.results.completed`
9. Cleans up the workspace directory
10. Acknowledges the NATS message

**Docker Container Configuration:**
```
Image:    from JobPayload.docker_image (e.g., "airaie-tools/fea-solver:1.0.0")
Network:  --network=none (when sandbox.network == "deny")
Memory:   --memory={resource_limits.memory}
CPU:      --cpus={resource_limits.cpu}
Volumes:
  - /tmp/airaie-runner/{job_id}/inputs/:/workspace/inputs/:ro
  - /tmp/airaie-runner/{job_id}/outputs/:/workspace/outputs/:rw
Env:
  - CONFIG_JSON=<json-encoded parameters>
```

**Concurrency:**
The runner supports N concurrent jobs (default 4, configurable). It uses a semaphore/tokio channel to limit parallelism.

**No API Changes, No DB Changes:**
The runner does not talk to PostgreSQL directly. All state updates go through NATS messages that the Go control plane consumes.

### B4: LLM Provider Configuration — Technical Details

**Files:** `internal/agent/llm.go`, `services/api-gateway/main.go`

**Environment Variables:**
| Variable | Required | Default | Values |
|----------|----------|---------|--------|
| `AIRAIE_LLM_PROVIDER` | No | (empty) | `anthropic`, `openai`, `google`, `huggingface` |
| `AIRAIE_LLM_API_KEY` | No | (empty) | Provider-specific API key |
| `AIRAIE_LLM_MODEL` | No | (empty) | Provider-specific model ID (e.g., `claude-sonnet-4-6`) |

**Behavior Matrix:**
| All 3 vars set and valid | Provider valid | Result |
|--------------------------|---------------|--------|
| Yes | Yes | LLM mode — hybrid scoring (LLM + algorithmic) |
| No (any missing) | N/A | Deterministic mode — algorithmic only, warning logged |
| Yes | No (unknown provider) | Error — startup fails with clear message |

**No New API Endpoints:**
This blocker is about internal service configuration, not external APIs.

**No Database Changes:**
LLM configuration is environment-based, not stored in PostgreSQL. Agent specs already have an `llm_weight` field in the database; the deterministic fallback simply overrides this to 0.0 at runtime.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Node ID is all special characters (e.g., `"..."`) | `sanitizeNodeID` returns `"node"` as fallback |
| Two nodes sanitize to the same ID | Plan compiler should append a unique suffix (sequence number) — verify this existing behavior is preserved |
| ExecutePlan receives an empty plan (0 nodes) | Return an error: "ExecutePlan: plan has no nodes" |
| Docker image does not exist in registry | Runner returns FAILED with "image pull failed" error |
| MinIO is unreachable during artifact download | Runner returns FAILED with "artifact download failed: connection refused" |
| NATS disconnects during job processing | Runner should reconnect (NATS client auto-reconnect); in-flight job should complete or timeout |
| LLM API key is set but invalid (auth fails at runtime) | LLM call fails; agent falls back to deterministic scoring for that request; error logged |
| Container writes no files to /outputs/ | Runner publishes SUCCEEDED with empty outputs list (not an error — some tools produce only metrics) |

---

## 5. UX/UI Requirements

**Not applicable for Sprint 0.1.**

This sprint is entirely backend-focused. The four blockers (B1-B4) are all in Go and Rust services with no frontend touchpoints.

**Rationale:** Phase 0 exists to fix infrastructure-level issues that prevent real execution. The frontend already has stub data flowing through it (which is part of the problem — B2 is about removing the stub that makes the frontend appear to work when nothing real is happening). Once Phase 0 is complete, subsequent sprints (Phase 1+) will add real frontend features that exercise these fixed backend paths.

**Impact on Future UX:** After this sprint, the frontend will stop receiving fake "success" responses from the stub and will instead see real workflow execution results (or real errors). This may surface UI issues that were hidden by the stub, which should be noted during Phase 1 planning.

---

## 6. QA & Testing Plan

### Testing Strategy

| Layer | Approach | Coverage Target |
|-------|----------|-----------------|
| Unit tests (Go) | `go test` with table-driven tests | sanitizeNodeID edge cases, LLM config loading |
| Integration tests (Go) | Test against live PostgreSQL (Docker) | ExecutePlan real path |
| Integration tests (Rust/Infra) | Shell script or Rust test against live NATS + MinIO + Docker | Full runner cycle |
| Smoke test (system) | Manual E2E: trigger board card -> verify run completes | Proves all 4 blockers are fixed together |

### Test Cases — Functional

#### TC-01: Node ID Sanitization — Dots Replaced

| Field | Detail |
|-------|--------|
| **ID** | TC-01 |
| **Blocker** | B1 |
| **Precondition** | plan_compiler.go is updated |
| **Input** | PlanNode with tool name `cad.geometry_check` at index 0 |
| **Action** | Call plan compiler to generate node ID |
| **Expected** | Node ID is `node_000_cad_geometry_check` (or similar without dots) |
| **Pass Criteria** | Node ID matches `^[a-z0-9_-]+$` |

#### TC-02: Node ID Sanitization — Uppercase and Spaces

| Field | Detail |
|-------|--------|
| **ID** | TC-02 |
| **Blocker** | B1 |
| **Input** | PlanNode with tool name `FEA Stress Analysis` |
| **Expected** | Node ID contains `fea_stress_analysis` |
| **Pass Criteria** | No uppercase, no spaces in node ID |

#### TC-03: Node ID Sanitization — Already Valid

| Field | Detail |
|-------|--------|
| **ID** | TC-03 |
| **Blocker** | B1 |
| **Input** | PlanNode with tool name `mesh_gen` |
| **Expected** | Node ID contains `mesh_gen` unchanged |
| **Pass Criteria** | Valid IDs are not corrupted |

#### TC-04: ExecutePlan — Real Path Creates Workflow

| Field | Detail |
|-------|--------|
| **ID** | TC-04 |
| **Blocker** | B2 |
| **Precondition** | PostgreSQL running with migrations; plan_generator.go stub removed |
| **Input** | ExecutionPlan with 1 PlanNode (tool type, valid tool reference) |
| **Action** | Call `ExecutePlan(ctx, plan)` |
| **Expected** | Returns Run with non-nil ID; Workflow, WorkflowVersion, and Run records exist in database |
| **Pass Criteria** | No error; all 3 DB records created; WorkflowVersion.status == "PUBLISHED" |

#### TC-05: ExecutePlan — Error Propagation

| Field | Detail |
|-------|--------|
| **ID** | TC-05 |
| **Blocker** | B2 |
| **Input** | ExecutionPlan referencing a non-existent tool |
| **Action** | Call `ExecutePlan(ctx, plan)` |
| **Expected** | Returns error containing the failing step name (e.g., "Compile failed") |
| **Pass Criteria** | Error is not nil; error message includes step context |

#### TC-06: Rust Runner — Success Path

| Field | Detail |
|-------|--------|
| **ID** | TC-06 |
| **Blocker** | B3 |
| **Precondition** | NATS, MinIO, Docker running; runner binary started |
| **Input** | Job with `alpine:latest`, command: `echo "ok" > /workspace/outputs/result.txt` |
| **Action** | Publish job to `airaie.jobs.tool.execution` |
| **Expected** | Result on `airaie.results.completed` with status=SUCCEEDED; `result.txt` exists in MinIO |
| **Pass Criteria** | Status is SUCCEEDED; artifact retrievable from MinIO; exit_code = 0 |

#### TC-07: Rust Runner — Failure Path

| Field | Detail |
|-------|--------|
| **ID** | TC-07 |
| **Blocker** | B3 |
| **Input** | Job with `alpine:latest`, command: `exit 1` |
| **Expected** | Result with status=FAILED, exit_code=1, errors array non-empty |
| **Pass Criteria** | Status is FAILED; stderr captured in errors |

#### TC-08: Rust Runner — Timeout Path

| Field | Detail |
|-------|--------|
| **ID** | TC-08 |
| **Blocker** | B3 |
| **Input** | Job with `alpine:latest`, command: `sleep 9999`, timeout: 5 seconds |
| **Expected** | Result with status=TIMEOUT; container killed |
| **Pass Criteria** | Status is TIMEOUT; result received within ~10 seconds (timeout + cleanup) |

#### TC-09: LLM Config — All Vars Set

| Field | Detail |
|-------|--------|
| **ID** | TC-09 |
| **Blocker** | B4 |
| **Input** | Env: `AIRAIE_LLM_PROVIDER=anthropic`, `AIRAIE_LLM_API_KEY=sk-test`, `AIRAIE_LLM_MODEL=claude-sonnet-4-6` |
| **Action** | Start api-gateway |
| **Expected** | Startup log: "LLM mode: anthropic / claude-sonnet-4-6" |
| **Pass Criteria** | LLM provider initialized; no errors |

#### TC-10: LLM Config — No Vars Set

| Field | Detail |
|-------|--------|
| **ID** | TC-10 |
| **Blocker** | B4 |
| **Input** | No AIRAIE_LLM_* environment variables |
| **Action** | Start api-gateway |
| **Expected** | Startup log: "Deterministic mode: LLM not configured"; no crash |
| **Pass Criteria** | Server starts normally; warning logged; deterministic mode active |

#### TC-11: LLM Config — Invalid Provider

| Field | Detail |
|-------|--------|
| **ID** | TC-11 |
| **Blocker** | B4 |
| **Input** | `AIRAIE_LLM_PROVIDER=invalid_provider` |
| **Action** | Start api-gateway |
| **Expected** | Startup fails with error: "unknown LLM provider" |
| **Pass Criteria** | Clear error message; server does not start with invalid config |

### Test Cases — Edge Cases

#### TC-12: Node ID Collision After Sanitization

| Field | Detail |
|-------|--------|
| **ID** | TC-12 |
| **Blocker** | B1 |
| **Input** | Two PlanNodes: `cad.check` and `cad_check` at different indices |
| **Expected** | Node IDs are unique (indices differentiate them: `node_000_cad_check`, `node_001_cad_check`) |
| **Pass Criteria** | No duplicate node IDs in compiled workflow |

#### TC-13: Runner — Image Pull Failure

| Field | Detail |
|-------|--------|
| **ID** | TC-13 |
| **Blocker** | B3 |
| **Input** | Job with docker_image: `nonexistent/image:99.99` |
| **Expected** | Result with status=FAILED, error message about image pull failure |
| **Pass Criteria** | Runner does not hang; error is descriptive |

#### TC-14: Runner — MinIO Unreachable During Input Download

| Field | Detail |
|-------|--------|
| **ID** | TC-14 |
| **Blocker** | B3 |
| **Input** | Job with artifact presigned URL pointing to unreachable MinIO |
| **Expected** | Result with status=FAILED, error message about artifact download failure |
| **Pass Criteria** | Runner does not hang; fails within a reasonable timeout |

#### TC-15: ExecutePlan — Empty Plan

| Field | Detail |
|-------|--------|
| **ID** | TC-15 |
| **Blocker** | B2 |
| **Input** | ExecutionPlan with 0 PlanNodes |
| **Expected** | Error returned: "plan has no nodes" (or similar) |
| **Pass Criteria** | No panic; clear error message |

### Test Data

| Data Item | Description | Location |
|-----------|-------------|----------|
| Test Docker image | `alpine:latest` — minimal Linux image for runner tests | Docker Hub (public) |
| Test input artifact | JSON file with sample geometry data | Created in test setup |
| Test ExecutionPlan | Minimal plan with 1 tool node referencing `alpine:latest` | Created in test code |
| PostgreSQL test DB | Fresh database with migrations applied | Docker Compose dev stack |
| NATS test instance | Local NATS server with JetStream enabled | Docker Compose dev stack |
| MinIO test instance | Local MinIO with `airaie-artifacts` bucket | Docker Compose dev stack |

### Automation Scope

| Test Type | Automated? | Tool | Notes |
|-----------|-----------|------|-------|
| Go unit tests | Yes | `go test` | Run in CI on every commit |
| Go integration tests | Yes | `go test` with build tag `integration` | Requires Docker Compose up |
| Rust runner integration | Yes | Shell script (`integration_test_docker.sh`) | Requires Docker Compose up |
| System smoke test | Manual for Sprint 0.1 | Human | Automate in Phase 5 |

---

## 7. Risks & Mitigation

| # | Risk | Probability | Impact | Mitigation Strategy | Owner |
|---|------|-------------|--------|---------------------|-------|
| R1 | **Rust runner does not compile on current toolchain** — Cargo.toml may depend on nightly features or outdated crate versions | Medium | High (blocks B3 entirely) | Pin Rust toolchain version in `rust-toolchain.toml`. Run `cargo build` as the first task on Day 1 to detect issues early. If it fails, update crate versions or fix API changes before proceeding to integration tasks. | Systems Engineer |
| R2 | **Docker-in-Docker issues on dev machines** — The Rust runner needs to create Docker containers, but if the dev environment is itself a container (e.g., devcontainer), Docker socket access may be restricted | Medium | High (blocks B3) | Verify Docker socket is mounted (`/var/run/docker.sock`). If running in a devcontainer, ensure the `docker` feature is enabled. Fallback: test on a bare-metal or VM dev machine. | Systems Engineer |
| R3 | **Stub removal in ExecutePlan breaks other callers** — Other services may depend on the stub's return shape or timing behavior | Low | Medium | Search for all callers of `ExecutePlan` before removing the stub: `grep -rn "ExecutePlan" internal/`. Verify each caller handles the real return shape. Add integration test (T-0.1.6) to catch regressions. | Backend Engineer |
| R4 | **NATS JetStream subject not pre-configured** — The runner expects `airaie.jobs.tool.execution` to exist as a JetStream stream, but it may not be created in the dev Docker Compose | Medium | Medium (runner silently fails to subscribe) | Add stream/consumer creation to the Docker Compose init script or the runner's startup code. Verify with `nats stream ls` before running tests. | Systems Engineer |
| R5 | **MinIO presigned URL format mismatch between Go and Rust** — The Go dispatcher generates presigned URLs; the Rust runner consumes them. If the URL format or signing algorithm differs, downloads fail silently | Medium | Medium | Generate a presigned URL from Go, manually test it with `curl` from the runner environment. Add this as a sub-step in T-0.1.10. | Systems Engineer |
| R6 | **LLM env var change breaks existing deployments** — If someone has a deployment with partial env vars set (e.g., only AIRAIE_LLM_PROVIDER without the key), the new validation may change behavior | Low | Low | The fallback is graceful: any missing var -> deterministic mode with a warning. This is strictly safer than the current behavior (which may crash or silently fail). Document the env var contract in the sprint deliverables. | Backend Engineer |
| R7 | **Sprint takes longer than 5 days due to B3 complexity** — The Rust runner integration test (B3) is estimated at M (medium) complexity and involves multiple infrastructure components | Medium | Medium (delays Phase 1 start) | Front-load B3 work to Days 1-3 so that any overruns are visible by Day 3. B1, B2, B4 can proceed in parallel. If B3 is still incomplete by Day 4, ship B1+B2+B4 as Sprint 0.1 and create Sprint 0.1.1 for B3 alone. | Team Lead |

---

## 8. Dependencies

### Internal Dependencies

| Dependency | Required By | Status | Notes |
|------------|------------|--------|-------|
| PostgreSQL with all 19 migrations applied | T-0.1.5, T-0.1.6 (B2) | Exists (Docker Compose) | Verify `docker-compose up postgres` and run migrations before testing |
| NATS JetStream running locally | T-0.1.7 through T-0.1.12 (B3) | Exists (Docker Compose) | Verify stream `airaie-jobs` exists with subject `airaie.jobs.tool.execution` |
| MinIO running locally with `airaie-artifacts` bucket | T-0.1.10, T-0.1.12 (B3) | Exists (Docker Compose) | Create bucket if it does not exist: `mc mb minio/airaie-artifacts` |
| Docker daemon accessible | T-0.1.9, T-0.1.12 (B3) | Host machine | Verify `docker ps` works from runner context |
| Go 1.21+ toolchain | T-0.1.1 through T-0.1.6, T-0.1.13 through T-0.1.16 | Installed | Verify `go version` |
| Rust stable toolchain (latest) | T-0.1.7 through T-0.1.12 | Installed | Verify `rustc --version` and `cargo --version` |
| Existing service interfaces (WorkflowService, CompilerService, etc.) | T-0.1.5 (B2) | Exists in codebase | Verify interfaces are implemented and injected correctly |
| Existing LLMProvider interface | T-0.1.13, T-0.1.14 (B4) | Exists in codebase | Verify interface methods match expected call pattern |

### External Dependencies

| Dependency | Required By | Status | Risk |
|------------|------------|--------|------|
| Docker Hub access (to pull `alpine:latest`) | T-0.1.9, T-0.1.12 (B3) | Available | Low — alpine is cached after first pull; can pre-pull |
| No external LLM API needed for Sprint 0.1 | B4 | N/A | B4 only validates env loading and deterministic fallback — no real LLM API calls needed for testing |

### Blocking Dependencies

```
T-0.1.1 ──→ T-0.1.2 ──→ T-0.1.3  (B1: sequential — function first, then wire, then test)
T-0.1.4 ──→ T-0.1.5 ──→ T-0.1.6  (B2: sequential — remove stub, wire real path, then test)
T-0.1.7 ──→ T-0.1.8 ──→ T-0.1.9 ──→ T-0.1.10 ──→ T-0.1.11 ──→ T-0.1.12  (B3: sequential build-up)
T-0.1.13 ──→ T-0.1.14 ──→ T-0.1.15 ──→ T-0.1.16  (B4: sequential)

B1, B2, B3, B4 are INDEPENDENT of each other and can proceed in parallel.
```

---

## 9. Sprint Execution Plan

### Day-by-Day Schedule

#### Day 1 — Monday 2026-04-07: Foundations

| Time Block | Backend Engineer (Go) | Systems Engineer (Rust/Docker) |
|-----------|----------------------|-------------------------------|
| Morning (4h) | T-0.1.1: Implement `sanitizeNodeID()` (2h) | T-0.1.7: Build Rust runner, verify startup (2h) |
| | T-0.1.2: Wire sanitization into call sites (1h) | T-0.1.8: Verify NATS subscription + job deser (2h) |
| | T-0.1.3: Write unit tests for sanitizeNodeID (1h) | |
| Afternoon (4h) | T-0.1.4: Remove stub in ExecutePlan (1h) | T-0.1.9: Verify Docker container lifecycle — start (3h) |
| | T-0.1.13: Implement LLM env var loading (1.5h) | |
| | T-0.1.14: Implement deterministic fallback — start (1.5h) | |

**Day 1 Target:** B1 complete (all 3 tasks). B2 stub removed. B3 runner builds and connects. B4 env loading coded.

#### Day 2 — Tuesday 2026-04-08: Core Implementation

| Time Block | Backend Engineer (Go) | Systems Engineer (Rust/Docker) |
|-----------|----------------------|-------------------------------|
| Morning (4h) | T-0.1.14: Complete deterministic fallback (0.5h) | T-0.1.9: Complete Docker lifecycle verification (remaining) |
| | T-0.1.5: Wire real ExecutePlan chain (3h) | T-0.1.10: Verify MinIO upload/download (2h) |
| | T-0.1.15: Wire env loading into main.go (1h) | |
| Afternoon (4h) | T-0.1.6: Write integration test for ExecutePlan (2h) | T-0.1.11: Verify result publication to NATS (1h) |
| | T-0.1.16: Write LLM config unit tests (1.5h) | T-0.1.12: E2E integration test — start (3h) |

**Day 2 Target:** B2 complete. B4 complete. B3 individual components verified.

#### Day 3 — Wednesday 2026-04-09: Integration

| Time Block | Backend Engineer (Go) | Systems Engineer (Rust/Docker) |
|-----------|----------------------|-------------------------------|
| Morning (4h) | Fix any issues from Day 1/2 test failures | T-0.1.12: Complete E2E integration test |
| | Cross-test: verify B1 fix works with B2 (compile a plan with dotted names through the real path) | |
| Afternoon (4h) | System smoke test: manually trigger a board card through the full chain | Fix any E2E test failures |
| | Document any issues found | Verify timeout and failure paths in E2E test |

**Day 3 Target:** B3 complete. All 4 blockers individually verified.

#### Day 4 — Thursday 2026-04-10: System Verification

| Time Block | All Engineers |
|-----------|--------------|
| Morning (4h) | Run all tests in sequence: Go unit tests -> Go integration tests -> Rust E2E test |
| | Fix any failures |
| Afternoon (4h) | System-level smoke test: Board Card -> ExecutePlan -> Compile (with sanitized IDs) -> Publish -> StartRun -> NATS dispatch -> Rust runner -> Docker -> MinIO -> Result |
| | Verify LLM mode and deterministic mode both start correctly |
| | Document results |

**Day 4 Target:** Full system validation across all 4 blockers together.

#### Day 5 — Friday 2026-04-11: Buffer & Handoff

| Time Block | All Engineers |
|-----------|--------------|
| Morning (4h) | Fix any remaining issues from Day 4 |
| | Run full test suite one final time |
| | Update `.env.example` with AIRAIE_LLM_* documentation |
| Afternoon (4h) | Sprint review: demonstrate all 4 acceptance criteria passing |
| | Update master sprint plan with Phase 0 completion status |
| | Handoff notes for Phase 1 team |

**Day 5 Target:** Sprint complete. All tests green. Ready for Phase 1.

### Parallel Streams

```
Stream A (Backend Engineer — Go):
  B1 ────────────► B2 ────────────────► B4 ──────► Cross-test ──► Smoke test
  Day 1 (morning)   Day 1 (afternoon)    Day 2       Day 3          Day 4
                     + Day 2 (morning)

Stream B (Systems Engineer — Rust/Docker):
  B3 ──────────────────────────────────────────────► E2E test ──► Smoke test
  Day 1 through Day 3                                  Day 3        Day 4
```

### Critical Path

```
The critical path is B3 (Rust runner Docker verification).

B1: 4.5h total → fits in Day 1
B2: 6h total → fits in Day 1-2
B4: 6h total → fits in Day 2
B3: 13h total → spans Day 1-3

If B3 is delayed, the system smoke test on Day 4 cannot cover the full 
chain (NATS → Docker → MinIO). However, B1, B2, and B4 can be verified 
independently.

Contingency: If B3 is not complete by end of Day 3, ship B1+B2+B4 
as "Sprint 0.1a" and finish B3 in a 2-day "Sprint 0.1b" extension.
```

---

## 10. Definition of Done (Sprint Level)

This sprint is DONE when ALL of the following are true:

### Code Quality

- [ ] All new code compiles without warnings (`go build ./...` clean, `cargo build --release` clean)
- [ ] No new `TODO` or `FIXME` comments introduced (existing ones are acceptable)
- [ ] `sanitizeNodeID` function is a pure function with no side effects
- [ ] Error messages include context (step name, input values) for debugging
- [ ] No hardcoded credentials or API keys in source code

### Testing

- [ ] Go unit tests pass: `go test ./internal/service/... ./internal/agent/...` exits 0
- [ ] Go integration test passes: `TestExecutePlan_RealPath` creates Workflow + Version + Run in DB
- [ ] Rust E2E integration test passes: job dispatched via NATS, container runs, artifacts in MinIO, result received
- [ ] All 15 test cases (TC-01 through TC-15) have been executed and documented
- [ ] No test depends on external network access (all use local Docker Compose services)

### Functionality

- [ ] **B1 VERIFIED:** Plan compiler generates node IDs matching `^[a-z0-9_-]+$` — no dots, no spaces, no uppercase
- [ ] **B2 VERIFIED:** `ExecutePlan` calls CreateWorkflow -> CreateVersion -> Compile -> Publish -> StartRun (stub is gone)
- [ ] **B3 VERIFIED:** Rust runner receives job from NATS, executes Docker container, uploads artifacts to MinIO, publishes result to NATS
- [ ] **B4 VERIFIED:** API gateway starts in LLM mode (with env vars) and deterministic mode (without env vars) without crashing

### Infrastructure

- [ ] Docker Compose dev stack runs all required services: PostgreSQL, NATS, MinIO, Docker
- [ ] NATS JetStream stream `airaie-jobs` with subject `airaie.jobs.tool.execution` exists and is subscribed
- [ ] MinIO bucket `airaie-artifacts` exists
- [ ] `.env.example` documents all AIRAIE_LLM_* environment variables

### Documentation

- [ ] This sprint document is updated with actual completion dates and any deviations
- [ ] Any discovered issues not in scope are logged as items for Phase 1 planning

---

## 11. Deliverables Checklist

### B1: Node ID Sanitization

- [ ] `sanitizeNodeID()` function added to `internal/service/plan_compiler.go`
- [ ] All node ID construction sites in `plan_compiler.go` use `sanitizeNodeID()`
- [ ] All node ID construction sites in `plan_generator.go` use `sanitizeNodeID()` (if any)
- [ ] `TestSanitizeNodeID` in `internal/service/plan_compiler_test.go` — 13 test cases
- [ ] TC-01, TC-02, TC-03, TC-12 pass

### B2: Stub Removal and Real Execution Path

- [ ] Stub early-return block removed from `ExecutePlan` in `plan_generator.go`
- [ ] `ExecutePlan` calls `CreateWorkflow` with plan-generated YAML
- [ ] `ExecutePlan` calls `CreateVersion` on the new workflow
- [ ] `ExecutePlan` calls `Compile` on the version
- [ ] `ExecutePlan` calls `Publish` on the version
- [ ] `ExecutePlan` calls `StartRun` to dispatch execution
- [ ] Each step's error is wrapped with step context
- [ ] `TestExecutePlan_RealPath` integration test in `plan_generator_test.go`
- [ ] TC-04, TC-05, TC-15 pass

### B3: Rust Runner Docker Verification

- [ ] Rust runner compiles with `cargo build --release`
- [ ] Runner connects to NATS and subscribes to `airaie.jobs.tool.execution`
- [ ] Runner deserializes JobPayload correctly (TC-06 precondition)
- [ ] Runner creates workspace at `/tmp/airaie-runner/{job_id}/`
- [ ] Runner downloads input artifacts from MinIO presigned URLs
- [ ] Runner starts Docker container with correct volume mounts
- [ ] Runner handles success path (exit 0): uploads artifacts, publishes SUCCEEDED
- [ ] Runner handles failure path (exit != 0): publishes FAILED with stderr
- [ ] Runner handles timeout path: kills container, publishes TIMEOUT
- [ ] Runner cleans up workspace after job
- [ ] Runner publishes result to `airaie.results.completed`
- [ ] Integration test script at `runner/tests/integration_test_docker.sh`
- [ ] TC-06, TC-07, TC-08, TC-13, TC-14 pass

### B4: LLM Provider Environment Configuration

- [ ] `LoadLLMConfigFromEnv()` in `internal/agent/llm.go`
- [ ] Reads `AIRAIE_LLM_PROVIDER`, `AIRAIE_LLM_API_KEY`, `AIRAIE_LLM_MODEL`
- [ ] Returns `*LLMConfig` when all present, `nil` when missing (deterministic mode)
- [ ] Returns error for unknown provider
- [ ] Deterministic scoring path works without LLM (5-dimension formula)
- [ ] `main.go` calls `LoadLLMConfigFromEnv()` at startup
- [ ] Startup log indicates LLM mode or deterministic mode
- [ ] `TestLoadLLMConfigFromEnv` — 7 test cases
- [ ] `TestDeterministicScoring` — verifies scoring without LLM
- [ ] TC-09, TC-10, TC-11 pass

### Sprint-Level

- [ ] All Go tests pass: `go test ./...`
- [ ] Rust runner E2E test passes
- [ ] System smoke test demonstrates board card -> real execution -> results
- [ ] `.env.example` updated with LLM configuration documentation
- [ ] Sprint retrospective notes captured
- [ ] Phase 1 readiness confirmed

---

## 12. Optional: Metrics, Release Plan & Rollback

### Sprint Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Planned hours | 29.5h | Sum of task estimates |
| Actual hours | Track daily | Time logging |
| Test cases written | 15 | Count of TC-01 through TC-15 |
| Test cases passing | 15 / 15 | Test execution results |
| Blockers resolved | 4 / 4 (B1-B4) | Acceptance criteria verification |
| Bugs found during testing | Track | Count of issues discovered |
| Days to completion | Target: 4 (buffer: 5) | Calendar tracking |

### Velocity Baseline

This is Sprint 0.1 (the first sprint), so there is no historical velocity data. The following will be captured for future sprint planning:

- Story points completed (if using points — suggest: B1=2, B2=3, B3=5, B4=3 = 13 total)
- Hours per story point ratio
- Estimation accuracy (estimated vs. actual per task)

### Release Plan

| Item | Detail |
|------|--------|
| **Release Type** | Internal development release — not customer-facing |
| **Branch Strategy** | Feature branch `phase-0/fix-blockers` off `main`; PR to `main` on completion |
| **Merge Criteria** | All tests green; code reviewed by at least 1 engineer; sprint demo completed |
| **Deployment** | Local Docker Compose dev stack (no staging/production deployment in Phase 0) |
| **Feature Flags** | None needed — changes are fixes, not new features |

### Rollback Plan

| Scenario | Rollback Action |
|----------|----------------|
| B1 (node ID sanitization) breaks existing workflows | Revert the commit; existing workflows have no dots in IDs (the bug only affects plan-generated IDs from boards) |
| B2 (stub removal) causes ExecutePlan to fail in unexpected ways | Revert the commit; stub returns to provide fake results while the real path is debugged |
| B3 (Rust runner) cannot execute containers | No rollback needed — runner is a separate binary; the Go control plane still functions (jobs stay in QUEUED state). Fix in Sprint 0.1b. |
| B4 (LLM config) crashes on startup | Revert the commit; agents continue to work without LLM (current behavior). The fallback is already the current state. |

**Rollback is low-risk for all 4 blockers** because:
- B1 and B2 are changes to the Go control plane, which can be reverted with `git revert`
- B3 is a verification of an existing binary, not a rewrite
- B4 adds graceful degradation, so the worst case is the same as the current state

### Post-Sprint Actions

1. **Update AIRAIE_MASTER_SPRINT_PLAN.md** — mark Phase 0 as COMPLETED with actual dates
2. **Begin Phase 1 Sprint 1.1 planning** — Tool Registration & Contract Validation
3. **Log any discovered issues** that are out of Sprint 0.1 scope as Phase 1 backlog items
4. **Archive this sprint document** — move to `.planning/sprints/completed/` after Phase 1 begins

---

*End of Sprint 0.1 Document*
*Generated: 2026-04-06 | Sprint Start: 2026-04-07 | Sprint End: 2026-04-11*
