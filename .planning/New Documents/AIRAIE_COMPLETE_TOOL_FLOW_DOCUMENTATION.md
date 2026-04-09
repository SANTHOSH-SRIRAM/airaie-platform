# AIRAIE — Complete Tool System: Architecture, Flow & Implementation Guide

> Generated: 2026-04-08  
> Status: Current (tool registration working; execution partially wired)  
> Scope: Covers both `airaie-kernel` (Go + Rust) and `airaie-platform` (React/TS)

---

## 🧠 1. High-Level Overview

### What Is a Tool in Airaie?

A **Tool** is a versioned, self-contained, executable engineering computation unit. It is:

- A **black box with a typed contract** — declared inputs, declared outputs, declared resource requirements
- **Backed by real execution logic** — a Docker image, Python script, WASM binary, CLI, remote API, or Jupyter notebook
- **Registered in the ToolShelf** — metadata + contract stored in PostgreSQL
- **Executable via the Runner** — dispatched through NATS to the Rust worker for sandboxed execution
- **Composable** — usable as a node in Workflows and callable by Agents

### The Tool Equation

```
Tool = Contract (what it accepts/returns)
     + Execution Logic (the ACTUAL code inside the Docker image)
     + Execution Config (adapter, image, resource limits)
     + Metadata (name, version, owner, domain_tags)
     + Trust Score (Bayesian score from execution history)
```

### Critical Point: Where Does the Logic Live?

**The algorithm/logic of a tool does NOT live inside Airaie.**

The logic lives **inside the Docker image** (or Python script, or WASM binary, etc.) that the tool author builds and pushes to a container registry.

Airaie only knows:
- **The image name** — so it can pull and run the container
- **The input/output contract** — so it can pass inputs in and collect outputs out
- **Resource limits** — so it can sandbox the execution properly

The actual computation (FEA solver, mesh generator, CFD engine, ML model) is entirely inside the container image, written in whatever language the tool author chose (Python, C++, Fortran, Go, etc.).

---

## 🏗️ 2. System Architecture

### Repository Structure

```
airaie-kernel/          ← Go backend (control plane) + Rust runner (data plane)
├── cmd/worker/         ← Rust runner entry point (compiled binary)
├── internal/
│   ├── handler/        ← HTTP API handlers (REST API for frontend)
│   ├── service/        ← Business logic (RunService, RegistryService, etc.)
│   ├── model/          ← Data models (Tool, Run, NodeRun, Artifact, etc.)
│   ├── store/          ← PostgreSQL data access layer
│   ├── agent/          ← Agent runtime, LLM integration, proposal generation
│   ├── auth/           ← JWT + API key authentication
│   └── validator/      ← Contract lint/validation engine
└── runner/             ← Rust crate: sandboxed execution data plane
    └── src/
        ├── main.rs         ← Runner entry point
        ├── config.rs       ← Environment variable config
        ├── execution/      ← JobExecutor + volume management
        ├── adapters/       ← DockerAdapter, PythonAdapter
        ├── nats/           ← JobConsumer, Publisher
        ├── s3/             ← MinIO artifact client
        └── models/         ← Job, JobResult, RunEvent (shared JSON contracts)

airaie-platform/        ← React/TypeScript frontend
└── frontend/src/
    ├── api/            ← HTTP client for all backend endpoints
    ├── components/     ← React components organized by domain
    ├── hooks/          ← React Query wrappers (useTools, useRuns, etc.)
    ├── pages/          ← Page-level route components
    ├── store/          ← Zustand state stores
    └── types/          ← TypeScript type definitions
```

### Architectural Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 1: USER INTERFACE (React + TypeScript, Port :3000)            │
│  RegisterToolPage, ToolDetailPage, WorkflowEditorPage                │
│  Components: ToolCard, ContractPortEditor, LintResultsPanel          │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 2: API CLIENT (frontend/src/api/tools.ts, runs.ts)            │
│  HTTP fetch wrapper → /v0/tools, /v0/runs, /v0/toolshelf             │
│  React Query hooks → useTools.ts, useRuns.ts                         │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 3: GO HTTP API (internal/handler/, Port :8080)                │
│  Handler structs: tools.go, runs.go, toolshelf.go, tool_sdk.go      │
│  Mux routes all /v0/* endpoints to handlers                          │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 4: GO SERVICE LAYER (internal/service/)                        │
│  RegistryService  → tool CRUD, contract validation, trust scores     │
│  RunService       → run lifecycle, NATS dispatch, result consumption  │
│  ArtifactService  → MinIO presigned URLs, artifact records           │
│  QuotaService     → per-project resource quotas                      │
│  ToolshelfService → intent-based resolution, ranking strategies      │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 5: DATA LAYER                                                  │
│  PostgreSQL       → tools, tool_versions, runs, node_runs, artifacts │
│  NATS JetStream   → jobs.dispatch, results.completed, events.*       │
│  MinIO / S3       → artifact blobs (input files + output files)      │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 6: RUST RUNNER (airaie-kernel/runner/, Port :8082)            │
│  JobConsumer      → subscribes to NATS jobs.dispatch queue           │
│  JobExecutor      → orchestrates the full job lifecycle              │
│  DockerAdapter    → pulls image, creates container, mounts volumes   │
│  PythonAdapter    → spawns Python subprocess                         │
│  S3Client         → downloads inputs / uploads outputs via MinIO     │
│  Publisher        → publishes JobResult + RunEvents back to NATS     │
└──────────────────────────────────────────────────────────────────────┘
```

### Infrastructure Components

| Component | Port | Purpose |
|-----------|------|---------|
| Go API Server | :8080 | REST API for frontend + CLI |
| React Frontend | :3000 | Browser UI |
| PostgreSQL 16 | :5433 | Persistent data store |
| NATS JetStream | :4222 | Message queue (jobs → runner, results → API) |
| MinIO | :9000 | S3-compatible artifact/file storage |
| Rust Runner | :8082 | Sandboxed job execution engine |
| Prometheus | :9090 | Metrics |

---

## 📁 3. Codebase Breakdown (File-by-File)

### FRONTEND — `airaie-platform/frontend/src/`

#### `api/tools.ts`
- **Purpose**: All HTTP calls related to tools
- **Key functions**: `fetchTools()`, `createTool()`, `createToolVersion()`, `publishToolVersion()`, `validateContract()`, `resolveTools()`
- **Pattern**: Each function wraps `fetch()` via `client.ts`, returns typed data
- **Connects to**: `hooks/useTools.ts` (consumes these functions via React Query)

#### `api/runs.ts`
- **Purpose**: HTTP calls for run lifecycle
- **Key functions**: `startRun(toolRef, inputs)`, `getRun(id)`, `getRunLogs(id)`, `cancelRun(id)`, `streamRunEvents(id)` (SSE)
- **Connects to**: `hooks/useRuns.ts`

#### `api/client.ts`
- **Purpose**: Core HTTP wrapper with JWT auth, error normalization
- **Key functions**: `apiFetch(url, options)`, `apiOrMock(apiFn, mockFn)` (dev fallback)
- **Connects to**: All other `api/*.ts` files

#### `hooks/useTools.ts`
- **Purpose**: React Query wrappers for tool data
- **Key exports**: `useToolList()`, `useToolDetail(id)`, `useCreateTool()`, `usePublishToolVersion()`, `useValidateContract()`, `useCreateRun()`
- **Connects to**: `api/tools.ts` (calls), components (data consumers)

#### `hooks/useRuns.ts`
- **Purpose**: React Query wrappers for run data
- **Key exports**: `useRunDetail(id)`, `useRunLogs(id)`, `useSSE(runId)`, `useCancelRun()`
- **Connects to**: `api/runs.ts`, execution components

#### `store/toolRegistryStore.ts`
- **Purpose**: Zustand store for tool registry UI state (filters, selected tool, view mode)
- **Key state**: `selectedToolId`, `filterStatus[]`, `filterCategory[]`, `search`, `sortBy`
- **Connects to**: `ToolCardGrid.tsx`, `FilterSidebar.tsx`, `ToolRegistryTopBar.tsx`

#### `store/executionStore.ts`
- **Purpose**: Zustand store for live execution state (logs, artifacts, metrics during a run)
- **Connects to**: Run monitoring components, SSE event handler

#### `pages/RegisterToolPage.tsx`
- **Purpose**: 4-step wizard to register a tool
- **Step 0**: Name, description, category, adapter, domain tags
- **Step 1**: Input/output port editor (ContractPortEditor)
- **Step 2**: Docker image, CPU/memory/timeout sliders, network/filesystem policy
- **Step 3**: JSON preview (ContractJsonPreview), validate button (LintResultsPanel), submit
- **Calls**: `useCreateTool()`, `useCreateToolVersion()`, `useValidateContract()`

#### `pages/ToolDetailPage.tsx`
- **Purpose**: Full tool detail view with sections for overview, contract, execution, versions, runs
- **Actions**: Test Run button → `useCreateRun()`
- **Connects to**: `useToolDetailFull(id)`, `useToolRuns(toolId)`

#### `components/tools/ContractPortEditor.tsx`
- **Purpose**: Table UI for editing input/output port definitions (name, type, required, description)
- **Used by**: RegisterToolPage Step 1

#### `components/tools/LintResultsPanel.tsx`
- **Purpose**: Displays `validateContract` results — pass/fail/warn per lint check
- **Used by**: RegisterToolPage Step 3

#### `components/tools/ResolutionTester.tsx`
- **Purpose**: UI to test tool resolution: enter intent_type → see ranked tools
- **Calls**: `resolveToolShelf(intentType, strategy)`

#### `components/tools/ToolRegistryActionBar.tsx`
- **Purpose**: Bottom action bar — "Use in Workflow", "View Contract", "Test Run" buttons
- **Connects to**: `toolRegistryStore.selectedToolId`

---

### BACKEND (Go) — `airaie-kernel/internal/`

#### `handler/tools.go`
- **Purpose**: HTTP handlers for tool CRUD
- **Routes**: `POST /v0/tools`, `GET /v0/tools`, `GET /v0/tools/{id}`
- **Calls**: `RegistryService.RegisterTool()`, `store.ListTools()`, `store.GetTool()`
- **Connects to**: `service/registry.go`

#### `handler/runs.go`
- **Purpose**: HTTP handlers for run lifecycle
- **Routes**: `POST /v0/runs`, `GET /v0/runs`, `GET /v0/runs/{id}`, `POST /v0/runs/{id}/cancel`, `GET /v0/runs/{id}/logs`, `GET /v0/runs/{id}/artifacts`, `GET /v0/runs/{id}/events` (SSE)
- **Key handler**: `StartRun()` — dispatches tool or workflow run
- **Calls**: `RunService.StartRun()`, `RunService.GetRun()`, `RunService.CancelRun()`
- **Connects to**: `service/run.go`

#### `handler/tool_sdk.go`
- **Purpose**: Test result submission handlers
- **Routes**: `POST /v0/tools/{id}/versions/{version}/tests`, `GET /v0/tools/{id}/versions/{version}/tests`
- **Calls**: `store.CreateToolTestResult()`, `store.ListToolTestResults()`

#### `handler/toolshelf.go`
- **Purpose**: Tool resolution API handlers
- **Routes**: `POST /v0/toolshelf/resolve`, `POST /v0/toolshelf/resolve/v2`, `GET /v0/toolshelf/resolve/{id}/explain`
- **Calls**: `ToolshelfService.Resolve()`, `ToolshelfService.Explain()`
- **Connects to**: `service/toolshelf.go`

#### `service/registry.go`
- **Purpose**: Business logic for tool CRUD, contract validation, version lifecycle, trust scores
- **Key methods**:
  - `RegisterTool(ctx, req)` — creates tool + validates name uniqueness
  - `CreateToolVersion(ctx, toolID, version, contractJSON)` — validates contract, stores version
  - `PublishToolVersion(ctx, toolID, version)` — marks version `published`, syncs capabilities
  - `UpdateTrustScore(ctx, toolID, version, success)` — Bayesian trust update after each run
- **Errors**: `ErrToolNotFound`, `ErrVersionExists`, `ErrCannotModify`, `ErrTrustTooLow`
- **Connects to**: `store/`, `validator/`, `service/capability.go`

#### `service/run.go`
- **Purpose**: Core run lifecycle — from HTTP request to NATS dispatch to result consumption
- **Key structs**: `RunService`, `JobPayload`, `PortValue`, `Limits`, `Policy`
- **Key method**: `StartRun(ctx, req)`:
  1. Parses `tool_ref` (format: `tool_id@version`)
  2. Verifies tool version exists and is `published`
  3. Parses contract for runtime config, limits, output ports
  4. Checks quota (if QuotaService set)
  5. Creates `Run` + `NodeRun` records in PostgreSQL
  6. Calls `prepareInputs()` → generates presigned download URLs for artifact inputs
  7. Calls `ArtifactService.GenerateUploadURL()` → presigned upload URLs for each output port
  8. Builds `JobPayload` struct
  9. Marshals to JSON and publishes to NATS `jobs.dispatch`
  10. Returns run record to HTTP caller (status: PENDING)
- **Result consumer**: Separate goroutine subscribes to `results.completed` → updates NodeRun + Run status
- **Connects to**: `store/`, `service/artifact.go`, `service/audit.go`, NATS

#### `service/artifact.go`
- **Purpose**: Artifact record management + MinIO presigned URL generation
- **Key methods**: `GenerateDownloadURL()`, `GenerateUploadURL()`, `CreateArtifact()`
- **Connects to**: MinIO SDK, `store/`

#### `service/toolshelf.go`
- **Purpose**: Intent-based tool resolution and ranking
- **Ranking strategies**: `weighted` (default), `priority`, `cost_optimized`
- **Connects to**: `service/registry.go`, `store/`

#### `service/runtime.go`
- **Purpose**: Agent runtime orchestration (context assembly, proposal generation, policy evaluation)
- **Connects to**: `agent/` package, `service/run.go`

---

### RUST RUNNER — `airaie-kernel/runner/src/`

#### `main.rs`
- **Purpose**: Entry point for the Rust runner binary
- **Startup sequence**:
  1. Initialize structured JSON logging
  2. Load `Config` from environment variables
  3. Connect to NATS
  4. Create `Publisher` (for results + events)
  5. Create `S3Client` (for MinIO artifact I/O)
  6. Create `JobExecutor` (Arc-shared for concurrency)
  7. Create `JobConsumer` with semaphore-based backpressure
  8. Listen for Ctrl+C (graceful shutdown)
  9. Run consumer loop

#### `config.rs`
- **Purpose**: All configuration from environment variables
- **Key env vars**: `AIRAIE_NATS_URL`, `AIRAIE_JOB_SUBJECT`, `AIRAIE_RESULT_SUBJECT`, `AIRAIE_MAX_CONCURRENT`, `AIRAIE_WORK_DIR`, `AIRAIE_MINIO_ENDPOINT`

#### `nats/consumer.rs`
- **Purpose**: Subscribes to `jobs.dispatch` NATS subject with queue group `runners` (competing-consumer pattern)
- **Backpressure**: `tokio::sync::Semaphore` with `max_concurrent` permits — only accepts new jobs when capacity available
- **Flow**: receive NATS message → deserialize to `Job` → acquire semaphore permit → spawn tokio task → call `JobExecutor.execute()` → release permit

#### `execution/executor.rs` — THE HEART OF THE RUNNER
- **Purpose**: Orchestrates the complete job execution lifecycle
- **`execute()` method steps**:
  1. Check `job.policy.check_compliance()` — reject immediately if policy violated
  2. Emit `NODE_STARTED` event to NATS
  3. Call `execute_inner()`
  4. On success: emit `NODE_COMPLETED` + publish `JobResult`
  5. On failure: emit `NODE_FAILED` + publish `JobResult`
  6. Cleanup job directory
- **`execute_inner()` method steps**:
  1. Create workspace dirs: `/tmp/airaie-runner/{job_id}/inputs/` + `/outputs/`
  2. Call `volume::prepare_inputs()` — download artifact files + write `inputs.json`
  3. Spawn log streamer (mpsc channel)
  4. Create adapter (`DockerAdapter` or `PythonAdapter`)
  5. Call `adapter.execute()` — blocks until container exits
  6. Collect outputs from container's `/out/` directory
  7. Upload output files to MinIO via presigned URLs
  8. Record metrics (duration, peak memory, CPU time)

#### `adapters/docker.rs` — DOCKER EXECUTION
- **Purpose**: Manages full Docker container lifecycle via `bollard` API
- **Key flow**:
  1. `resolve_image()` — use `job.image` or convert `tool_ref` to image name
  2. `build_container_config()` — create bollard Config with:
     - Volume mounts: `/in` (read-only), `/out` (read-write)
     - Resource limits: nano_cpus, memory bytes, memory_swap
     - Network mode: `none` (if policy=deny) or `bridge` (if allow)
     - Security: `no-new-privileges`, read-only rootfs if policy requires
     - Labels: `airaie.job_id`, `run_id`, `node_id`, `tool_ref`
     - Environment: `AIRAIE_JOB_ID`, `AIRAIE_RUN_ID`, `AIRAIE_INPUT_DIR`, `AIRAIE_OUTPUT_DIR`
  3. Pull image if not cached
  4. Create container
  5. Start container
  6. `stream_logs()` — follow container logs, send to channel
  7. Wait for container exit (with timeout via `tokio::time::timeout`)
  8. `check_oom_killed()` — inspect container for OOM status
  9. `collect_outputs()` — parse `outputs.json` manifest OR auto-discover all files in `/out/`
  10. Stop + remove container

#### `adapters/python.rs` — PYTHON EXECUTION
- **Purpose**: Runs Python tool logic via subprocess (no Docker overhead)
- **Entrypoint**: `python3 -m airaie_tool_sdk.entrypoint`
- **Environment**: `AIRAIE_JOB_ID`, `AIRAIE_INPUT_DIR`, `AIRAIE_OUTPUT_DIR`, `INPUTS` (JSON)
- **Collects**: `outputs.json` from output directory

#### `execution/volume.rs`
- **Purpose**: Handles all file I/O for job workspace
- **`prepare_inputs()`**: Writes `inputs.json` (all non-artifact inputs) + downloads artifact files from MinIO via presigned GET URLs
- **`collect_outputs()`**: Reads `outputs.json` manifest OR auto-discovers all files in `/out/` directory
- **`upload_outputs()`**: Uploads collected files to MinIO via presigned PUT URLs

#### `nats/publisher.rs`
- **Purpose**: Publishes `JobResult` and `RunEvent` messages to NATS
- **Subjects**: `results.completed` (results), `events.{run_id}` (lifecycle events)
- **Events published**: `NODE_STARTED`, `NODE_COMPLETED`, `NODE_FAILED`, `NODE_LOG`, `NODE_PROGRESS`

#### `s3/mod.rs`
- **Purpose**: HTTP-based MinIO client for artifact download/upload via presigned URLs
- **`download_presigned(url, path)`**: GET presigned URL → stream to file
- **`upload_presigned(path, url)`**: Read file → PUT to presigned URL

#### `models/job.rs`
- **Purpose**: `Job` struct — the NATS message contract between Go control plane and Rust runner
- **Key fields**: `job_id`, `run_id`, `node_id`, `tool_ref`, `image`, `adapter`, `inputs[]`, `limits`, `policy`, `artifact_urls`, `output_upload_urls`

#### `models/result.rs`
- **Purpose**: `JobResult` struct — sent back from Rust runner to Go via NATS
- **Key fields**: `job_id`, `status` (Succeeded/Failed/Timeout/Canceled), `exit_code`, `outputs[]`, `metrics`, `errors`, `logs_ref`

#### `sandbox.rs`
- **Purpose**: Applies governance policy constraints to Docker container config
- **Network**: deny → none, restricted → bridge, allow → bridge
- **Filesystem**: sandbox → readonly root + tmpfs `/out`, readonly → readonly root, readwrite → readwrite

---

## 🔄 4. Complete Tool Execution Flow (VERY IMPORTANT)

### Full Lifecycle — Step by Step

```
STEP 1: TOOL REGISTRATION (one-time, already working)
═══════════════════════════════════════════════════════

User opens RegisterToolPage in browser

  → Step 0: Fills in name, description, category, adapter ("docker"), domain_tags
  → Step 1: Adds input ports (name, type: artifact/parameter/metric, required, description)
            Adds output ports (name, type, description)
  → Step 2: Sets Docker image name, CPU/memory/timeout, network policy, filesystem policy
  → Step 3: Reviews JSON contract, clicks "Validate" → POST /v0/validate/contract
            Sees lint results (12 checks pass/fail)
            Clicks "Register" → POST /v0/tools (create tool entity)
                              → POST /v0/tools/{id}/versions (store contract)
                              → POST /v0/tools/{id}/versions/{v}/publish (set published)

  Go Handler (handler/tools.go) receives POST /v0/tools
  → Calls RegistryService.RegisterTool()
  → Verifies project exists
  → Checks name uniqueness
  → Stores tool record in PostgreSQL (tools table)
  → Returns tool entity to frontend

  Then frontend calls POST /v0/tools/{id}/versions
  → Validates contract via validator/
  → Stores contract JSON in PostgreSQL (tool_versions table)
  → Status: "draft"

  Then frontend calls POST /v0/tools/{id}/versions/{v}/publish
  → Marks version "published" in PostgreSQL
  → Syncs capabilities to capability index
  → Tool is now discoverable via toolshelf resolution


STEP 2: RUN TRIGGERED (missing wiring — partially implemented)
═══════════════════════════════════════════════════════════════

Trigger can come from:
  A) Frontend: User clicks "Test Run" on ToolDetailPage
  B) Workflow: Workflow scheduler dispatches a node execution
  C) Agent: AgentRuntimeService decides to call a tool

  → POST /v0/runs with body: { "tool_ref": "tool_id@1.0.0", "inputs": {...} }


STEP 3: GO CONTROL PLANE PROCESSES THE RUN REQUEST
═══════════════════════════════════════════════════

  handler/runs.go → StartRun()
  ↓
  service/run.go → RunService.StartRun()
  ↓
  1. Parse tool_ref: "tool_abc123@1.0.0" → toolID="tool_abc123", version="1.0.0"
  2. Fetch ToolVersion from PostgreSQL (must be "published")
  3. Parse contract JSON → get runtime.adapter, runtime.docker.image, output ports, limits
  4. Check quota (QuotaService.EvaluateStart) — abort if over quota
  5. Generate IDs: runID="run_xyz", nodeID="main", jobID="job_abc"
  6. Compute cost estimate (CPU × duration × rate + memory × duration × rate)
  7. Create Run record in PostgreSQL { status: "pending" }
  8. Create NodeRun record in PostgreSQL { status: "queued" }
  9. Emit "run.created" audit event
  10. Call prepareInputs():
      - For each input that is a file (type=artifact):
        - Call ArtifactService.GenerateDownloadURL() → MinIO presigned GET URL
      - Return []PortValue with artifact_urls
  11. For each output port in contract:
      - Call ArtifactService.GenerateUploadURL() → MinIO presigned PUT URL
      - Store in outputUploadURLs map
  12. Build JobPayload struct:
      {
        job_id, run_id, node_id, tool_ref,
        image: "registry.io/fea-solver:2.1",  ← from contract
        adapter: "docker",
        inputs: [{ name, value, artifact_id }...],
        limits: { cpu, memory_mb, timeout_sec },
        policy: { network: "deny", fs: "sandbox" },
        artifact_urls: { "mesh_file": "https://minio/presigned/download/..." },
        output_upload_urls: { "result": "https://minio/presigned/upload/..." }
      }
  13. Marshal JobPayload to JSON
  14. Publish to NATS subject "jobs.dispatch"
  15. Return Run record to HTTP caller (HTTP 202 Accepted)


STEP 4: RUST RUNNER PICKS UP THE JOB
═════════════════════════════════════

  nats/consumer.rs → JobConsumer.run()
  ↓
  - Waiting on NATS subscription to "jobs.dispatch" queue group "runners"
  - Receives NATS message
  - Checks semaphore permits (max_concurrent=4, default)
  - Acquires 1 semaphore permit (blocks if at capacity)
  - Deserializes bytes → Job struct
  - Spawns tokio task: JobExecutor.execute(job)


STEP 5: JOB EXECUTOR RUNS THE JOB
═══════════════════════════════════

  execution/executor.rs → JobExecutor.execute()
  ↓

  [POLICY PREFLIGHT]
  - job.policy.check_compliance():
    - Is adapter in allowed_adapters?
    - Does CPU request exceed max_cpu_per_job?
    - Does memory exceed max_memory_mb_per_job?
    - Does timeout exceed max_timeout_s_per_job?
  - If violation → publish JobResult{status: Failed, error: "policy_violation"} → return

  [EMIT START EVENT]
  - Publisher.emit_node_started(run_id, node_id, job_id)
  - Go control plane receives this event → updates NodeRun.status = "running"

  [EXECUTE INNER]
  1. Create workspace: /tmp/airaie-runner/{job_id}/inputs/  + /outputs/

  2. volume::prepare_inputs():
     - Write inputs.json: { all non-artifact input values }
       Example: { "threshold": 250, "material": "Al6061-T6", "output_format": "vtk" }
     - For each artifact input:
       - S3Client.download_presigned(artifact_url, "/inputs/{name}.{ext}")
       - Downloads the actual file (e.g., mesh_file.stl) from MinIO

  3. Create DockerAdapter (or PythonAdapter based on job.adapter)

  4. DockerAdapter.execute():
     a. resolve_image() → "registry.io/fea-solver:2.1"
     b. build_container_config():
        - Bind mount: /tmp/airaie-runner/{job_id}/inputs → /in (read-only)
        - Bind mount: /tmp/airaie-runner/{job_id}/outputs → /out (read-write)
        - Resource limits: nano_cpus, memory_bytes
        - Network: none (policy=deny)
        - Env vars: AIRAIE_JOB_ID, AIRAIE_INPUT_DIR=/in, AIRAIE_OUTPUT_DIR=/out
     c. Pull image if not local
     d. Create container
     e. Start container
        ↓ THE ACTUAL TOOL LOGIC RUNS HERE (inside the Docker container)
        ↓ The container reads /in/inputs.json and /in/{artifact files}
        ↓ The container runs its algorithm (FEA solver, etc.)
        ↓ The container writes output files to /out/
        ↓ The container writes /out/outputs.json manifest
        ↓ The container exits with code 0 (success) or non-zero (failure)
     f. stream_logs() → captures stdout/stderr line by line
     g. Wait for container exit (with timeout enforcement)
     h. check_oom_killed() → inspect container
     i. collect_outputs():
        - Read /out/outputs.json: [{ "name": "result", "path": "result.vtk" }, ...]
        - OR auto-discover all files in /out/ directory
     j. Stop + remove container

  5. upload_outputs():
     - For each collected output file:
       - S3Client.upload_presigned(local_path, output_upload_urls[name])
       - Updates output.artifact_id with MinIO artifact key

  6. Collect metrics: duration_ms, peak_mem_mb, cpu_time_ms


STEP 6: RUNNER REPORTS RESULT
═══════════════════════════════

  [IF SUCCESS (exit code 0)]
  Publisher.publish_result():
  {
    job_id, status: "Succeeded",
    exit_code: 0,
    outputs: [{ name: "result", artifact_id: "art_xyz" }, ...],
    metrics: { duration_ms: 45000, peak_mem_mb: 512, cpu_time_ms: 40000 },
    logs_ref: "logs/run_xyz/job_abc"
  }

  [IF FAILURE (exit code != 0)]
  Publisher.publish_result():
  {
    job_id, status: "Failed",
    exit_code: 1,
    errors: [{ code: "TOOL_ERROR", message: "Solver diverged at iteration 47" }],
    logs_ref: "logs/run_xyz/job_abc"
  }

  Published to NATS subject: "results.completed"
  Also publishes NODE_COMPLETED or NODE_FAILED event to "events.{run_id}"

  Cleanup: rm -rf /tmp/airaie-runner/{job_id}/


STEP 7: GO CONTROL PLANE CONSUMES THE RESULT
═════════════════════════════════════════════

  service/run.go → result consumer goroutine → subscribed to "results.completed"
  ↓
  Receives JobResult from NATS
  ↓
  1. Find NodeRun by job_id in PostgreSQL
  2. Update NodeRun:
     - status: "succeeded" or "failed"
     - exit_code, metrics JSON, outputs JSON
     - completed_at timestamp
  3. If outputs contain artifact_ids:
     - Create Artifact records in PostgreSQL (name, artifact_id, type, size, content_type)
  4. Update Run:
     - If all nodes succeeded → Run.status = "succeeded"
     - If any node failed → Run.status = "failed"
  5. Emit audit event: "run.completed" or "run.failed"
  6. Update tool trust score:
     - RegistryService.UpdateTrustScore(toolID, version, success=true/false)
     - Bayesian update: new_rate = (old_rate × count + outcome) / (count + 1)
  7. Collect evidence (if EvidenceCollectorService wired)
  8. If agent run: check for replanning (ReplanHandler)
  9. If workflow run: check if downstream nodes are ready → dispatch next nodes


STEP 8: FRONTEND RECEIVES RESULTS
══════════════════════════════════

  Option A: Polling
  useRunDetail(runId) → React Query polls GET /v0/runs/{id} every N seconds
  ↓
  Sees Run.status change to "succeeded"
  ↓
  useRunLogs(runId) → GET /v0/runs/{id}/logs → shows log entries
  useRunArtifacts(runId) → GET /v0/runs/{id}/artifacts → shows output files

  Option B: SSE streaming (real-time)
  useSSE(runId) → EventSource to GET /v0/runs/{id}/events
  ↓
  Go handler/runs.go → GetRunEvents():
    1. Replays all existing audit events for this run
    2. If run is terminal → closes stream
    3. Otherwise → subscribes to NATS "events.{run_id}"
    4. Streams live RunEvents to browser as SSE events
  ↓
  Frontend receives: NODE_STARTED, NODE_LOG (log chunks), NODE_COMPLETED, etc.
  ↓
  executionStore.ts updates → components re-render with live data
```

---

## ⚙️ 5. Tool Runtime Environment

### Where Does the Tool Actually Run?

```
The TOOL'S CODE (algorithm, logic) runs inside:
  → A Docker container on the Rust Runner host machine
  → OR directly as a Python subprocess (PythonAdapter)
  → OR as a WASM binary (NativeAdapter — planned)

The RUNNER (Rust binary) runs on:
  → A dedicated worker machine (Docker compose service "worker" at :8082)
  → Can be horizontally scaled: multiple runner instances, all subscribe to the same NATS queue group
  → Each runner handles up to max_concurrent=4 jobs simultaneously (configurable)
```

### Execution Lifecycle States

| State | Who Sets It | Where | Meaning |
|-------|------------|-------|---------|
| `pending` | Go RunService | PostgreSQL Run table | Run created, job not yet dispatched |
| `queued` | Go RunService | PostgreSQL NodeRun table | Job published to NATS, waiting for runner |
| `running` | Rust Runner | NATS event → Go consumer | Runner picked up job, container started |
| `succeeded` | Rust Runner | NATS result → Go consumer | Container exited 0, outputs uploaded |
| `failed` | Rust Runner | NATS result → Go consumer | Container exited non-zero, or OOM, or policy violation |
| `timeout` | Rust Runner | NATS result → Go consumer | Container killed after timeout_sec |
| `canceled` | Go RunService | PostgreSQL → NATS | User canceled, or budget exceeded |

### State Management

- **Run state**: Stored in PostgreSQL `runs` + `node_runs` tables
- **Event stream**: Published to NATS `events.{run_id}` for real-time delivery
- **Audit trail**: Every state transition recorded in `audit_events` table
- **Artifact state**: Output files stored in MinIO; metadata in `artifacts` table

---

## 🧮 6. Algorithm Integration — THE CRITICAL MISSING PIECE

### Where the Algorithm Lives

```
THE ALGORITHM IS NOT INSIDE AIRAIE.

The algorithm lives inside the Docker image that the tool author builds.

┌─────────────────────────────────────────────────────────────┐
│  What Airaie Stores (in PostgreSQL):                         │
│    - Tool metadata (name, description, owner)                │
│    - Tool contract (input ports, output ports, limits)       │
│    - Docker image name (e.g., "my-registry.io/fea-solver:2")│
│                                                              │
│  What Airaie Does NOT Store:                                 │
│    - The actual FEA algorithm                                │
│    - The mesh generation code                                │
│    - The CFD solver                                          │
│    - Any computation logic                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  What the Docker Image Contains (built by tool author):      │
│    /app/                                                     │
│      ├── run.sh          ← Entrypoint script                 │
│      ├── solver.py       ← THE ACTUAL ALGORITHM              │
│      └── requirements.txt                                    │
│                                                              │
│  At Runtime (Airaie mounts):                                 │
│    /in/                  ← inputs (read-only)                │
│      ├── inputs.json     ← parameter values from contract    │
│      └── mesh_file.stl   ← downloaded from MinIO            │
│    /out/                 ← outputs (read-write)              │
│      ← tool writes output files here                         │
└─────────────────────────────────────────────────────────────┘
```

### How Tool Logic Reads Inputs

The container receives inputs via two mechanisms:

**1. `inputs.json` file** (for parameters and configuration):
```json
{
  "threshold": 250,
  "material": "Al6061-T6",
  "output_format": "vtk",
  "solver_config": { "type": "linear", "convergence_tol": 1e-6 }
}
```

**2. Downloaded files** (for artifact-type inputs):
- The file `mesh_file.stl` is downloaded from MinIO and placed at `/in/mesh_file.stl`
- The container reads it directly from the filesystem

**3. Environment variables**:
```
AIRAIE_JOB_ID=job_abc123
AIRAIE_RUN_ID=run_xyz456
AIRAIE_INPUT_DIR=/in
AIRAIE_OUTPUT_DIR=/out
```

### How Tool Logic Writes Outputs

The container writes outputs to `/out/`:

**Option A — `outputs.json` manifest** (preferred):
```json
[
  { "name": "result", "path": "result.vtk" },
  { "name": "metrics", "path": "metrics.json" }
]
```

**Option B — Auto-discovery**: If no `outputs.json`, the runner uploads ALL files found in `/out/` directory.

**Metric outputs** (inline values, not files):
```json
{ "max_stress": 180.5, "safety_factor": 1.39, "converged": true }
```
These go in `metrics.json` and are parsed as inline output values, not uploaded as files.

### The Full Tool Author Workflow

```
1. WRITE YOUR CODE
   Write solver.py, run.sh (or any language/binary)
   Read inputs from /in/inputs.json
   Read artifact files from /in/
   Run your algorithm
   Write outputs to /out/
   Write outputs.json manifest

2. BUILD DOCKER IMAGE
   FROM python:3.11-slim
   COPY requirements.txt /app/
   RUN pip install -r /app/requirements.txt
   COPY solver.py /app/
   COPY run.sh /app/
   RUN chmod +x /app/run.sh
   ENTRYPOINT ["/app/run.sh"]

3. PUSH TO REGISTRY
   docker push my-registry.io/my-solver:1.0.0

4. REGISTER IN AIRAIE
   Use RegisterToolPage wizard:
   - Enter tool metadata
   - Define input/output ports matching what solver.py expects
   - Set image: "my-registry.io/my-solver:1.0.0"
   - Set resource limits (CPU, memory, timeout)
   - Submit → tool is registered and published

5. RUN THE TOOL
   POST /v0/runs { tool_ref: "tool_id@1.0.0", inputs: { "mesh_file": "art_abc", "threshold": 250 } }
   → Airaie downloads mesh_file from MinIO → runs container → collects outputs
```

---

## 🔌 7. Tool Registration vs Execution (CRITICAL)

### What "Registration" Means Today (Working)

```
POST /v0/tools
  ↓ Creates tool entity in PostgreSQL (tools table)
  ↓ Stores: id, name, description, project_id, owner, created_at

POST /v0/tools/{id}/versions
  ↓ Validates contract JSON (12 lint checks via validator/)
  ↓ Stores: tool_id, version, contract_json, status="draft"

POST /v0/tools/{id}/versions/{v}/publish
  ↓ Sets version status = "published"
  ↓ Syncs supported_intents to capability index
  ↓ Tool is now discoverable via /v0/toolshelf/resolve

Result: Tool is KNOWN to the system. It can be found, described, and resolved.
It cannot yet be EXECUTED because nothing has triggered a run.
```

### What "Execution" Requires (Partially Wired)

```
POST /v0/runs { tool_ref, inputs }

Go side (service/run.go → StartRun): IMPLEMENTED
  ✅ Parse tool_ref
  ✅ Verify version is published
  ✅ Parse contract for runtime config
  ✅ Quota check
  ✅ Create Run + NodeRun in PostgreSQL
  ✅ Emit audit event
  ✅ Build JobPayload
  ✅ Publish to NATS jobs.dispatch
  ✅ Return Run record (202 Accepted)

  ⚠️ prepareInputs() — NEEDS VERIFICATION:
     Does it correctly map user-supplied inputs to artifact download URLs?
     Are artifact inputs looked up in MinIO correctly?

  ⚠️ Output URL generation — NEEDS VERIFICATION:
     Are presigned upload URLs being generated for all output ports in contract?

Result consumer (results.completed subscriber): NEEDS VERIFICATION
  ❓ Is the NATS subscription to "results.completed" running in the Go server?
  ❓ Is it updating NodeRun + Run status correctly on result receipt?
  ❓ Is it creating Artifact records for each output?

Rust Runner side (runner/src/): IMPLEMENTED
  ✅ JobConsumer subscribes to NATS jobs.dispatch
  ✅ Semaphore backpressure
  ✅ JobExecutor.execute() with full lifecycle
  ✅ DockerAdapter with full container management
  ✅ volume::prepare_inputs() downloads files + writes inputs.json
  ✅ volume::collect_outputs() reads manifest or auto-discovers
  ✅ upload_outputs() via presigned PUT URLs
  ✅ Publisher.publish_result() to results.completed
  ✅ Policy enforcement (sandbox.rs)

  ⚠️ RUNNER MUST BE RUNNING: The Rust binary (docker-compose "worker" service) must be up
  ⚠️ DOCKER SOCKET: Runner needs /var/run/docker.sock mounted
  ⚠️ NATS CONNECTED: Runner must reach NATS at AIRAIE_NATS_URL
  ⚠️ MINIO CONNECTED: Runner must reach MinIO at AIRAIE_MINIO_ENDPOINT

Frontend side: PARTIALLY WIRED
  ✅ "Test Run" button on ToolDetailPage calls useCreateRun()
  ✅ useCreateRun() calls POST /v0/runs
  ⚠️ Run result display — is the run status being polled/streamed?
  ⚠️ LogViewer — is it connected to GET /v0/runs/{id}/logs?
  ⚠️ ArtifactsTab — is it connected to GET /v0/runs/{id}/artifacts?
```

### The Missing Configuration You Asked About

**You asked: "We only register the Docker image name and input/output names. Where is the algorithm? How is it configured?"**

**Answer: The algorithm is the Docker image. You don't configure the algorithm IN Airaie — you BUILD the algorithm INTO the Docker image.**

When you register a tool with image `my-registry.io/fea-solver:2.1`:
- You are telling Airaie: "when someone runs this tool, pull this image and run it"
- The actual computation code (solver.py, run.sh, etc.) is already inside that image
- The contract (input/output ports) tells Airaie what to pass in and what to collect out

**The configuration IS complete when you register the tool.** What's missing is:
1. The actual Docker image must exist and be pushable to a registry Airaie can pull from
2. The run flow must be end-to-end wired (NATS → Runner → NATS → Go consumer)
3. The result display in the frontend must be connected

---

## 🧵 8. Inter-Workspace Communication

### Data Flow Between Components

```
┌──────────┐    HTTP /v0/*    ┌──────────┐    NATS             ┌──────────┐
│ Frontend │ ←──────────────→ │  Go API  │ jobs.dispatch ────→ │   Rust   │
│ React    │                  │  Server  │                      │  Runner  │
│ :3000    │                  │  :8080   │ ←─ results.completed │  :8082   │
└──────────┘                  └────┬─────┘ ←─ events.{run_id}  └────┬─────┘
                                   │                                  │
                                   │                                  │
                              ┌────▼─────┐                      ┌────▼─────┐
                              │PostgreSQL│                      │  MinIO   │
                              │  :5433   │                      │  :9000   │
                              │ - tools  │                      │ artifacts│
                              │ - runs   │                      │ (files)  │
                              │ - nodes  │                      └──────────┘
                              └──────────┘
                                   ▲
                              NATS :4222
                              ┌─────────────────────────────┐
                              │ Subjects:                   │
                              │   jobs.dispatch (queue)     │
                              │   results.completed         │
                              │   events.{run_id}           │
                              └─────────────────────────────┘
```

### The NATS Job Contract (Go ↔ Rust)

The `JobPayload` struct (Go service/run.go) maps exactly to the `Job` struct (Rust models/job.rs). Both use `serde`/`encoding/json` with identical field names.

The `JobResult` struct (Rust models/result.rs) maps to what the Go result consumer deserializes.

This JSON contract is validated by `runner/src/models/contract_tests.rs` against shared fixtures.

---

## 🚨 9. Current Gaps & Issues

### Gap 1: NATS Result Consumer May Not Be Running

The Go server must have a goroutine that subscribes to `results.completed` and processes `JobResult` messages. This is what closes the loop — without it, the runner executes the job but the Go server never knows.

**Where to check**: Does the Go server startup code (likely in `cmd/server/main.go`) call something like `runService.StartResultConsumer(ctx)`?

### Gap 2: Docker Image Does Not Exist

Registering a tool with `image: "my-solver:1.0.0"` only stores that name. The image must:
- Actually exist in a Docker registry accessible from the runner host
- Or be available locally on the runner machine

If the runner tries to pull a non-existent image, the job will fail with `image not found`.

**Currently**: During development/testing, you need a real Docker image. You can use any public image (e.g., `python:3.11-slim`) with a simple entrypoint to test the flow end-to-end.

### Gap 3: Input Artifact Handling for "Test Run"

When testing a tool from the frontend without any real input files, the `prepareInputs()` function needs real artifact IDs to generate presigned download URLs. If inputs are parameters (not files), this should work. If inputs are artifacts (files), the user needs to upload them first.

**Currently**: The "Test Run" button likely doesn't have a file upload UI for artifact inputs.

### Gap 4: Contract Field Mismatch — `runtime.docker.image`

The Go service `run.go` parses the contract as:
```go
var contract struct {
    Runtime struct {
        Docker struct { Image string `json:"image"` } `json:"docker"`
    } `json:"runtime"`
}
```

But the architecture spec shows the contract uses `adapter_specific.image` or `runtime.image`. Make sure your registered contract's JSON structure matches what `StartRun` expects when it extracts the image name.

### Gap 5: Frontend Run Result Display

The `ToolDetailPage` shows a "Recent Runs" section but it may use mock data. The actual `useToolRuns(toolId)` hook → `GET /v0/runs?tool_id=...` needs to be wired to show live run status and navigate to a run detail view.

### Gap 6: SSE Stream Not Connected to Live Runner Events

The `GetRunEvents` handler in Go subscribes to NATS `events.{run_id}` and streams to the browser. For this to work, the runner must be publishing events with the exact matching subject format.

---

## 🛠️ 10. What Needs to Be Built Next

### Priority 1: Make a Test Run Work End-to-End

```
Step A: Verify NATS result consumer is running in Go server
  - Find startup code (cmd/server/main.go or similar)
  - Confirm RunService.StartResultConsumer(ctx) is called
  - Or implement it: subscribe to "results.completed", update NodeRun + Run

Step B: Use a real (simple) Docker image for testing
  - Create a minimal tool image: reads /in/inputs.json, writes /out/outputs.json
  - Docker build + push to local registry or Docker Hub
  - Register it in Airaie with the correct image name

Step C: Verify runner is running
  - cd airaie-kernel && docker compose -f infra/docker-compose.yaml up worker
  - Check runner logs: should show "Connected to NATS" and "Subscribed to jobs.dispatch"

Step D: Trigger a run from frontend
  - POST /v0/runs { tool_ref: "...", inputs: { "param1": "value1" } }
  - Check PostgreSQL: does Run record appear? Does it transition to "running"?
  - Check NATS: is the job message published?
  - Check runner logs: does it pick up the job and start the container?
  - Check PostgreSQL: does Run transition to "succeeded"?

Step E: Display results in frontend
  - Wire useRunDetail(runId) polling on ToolDetailPage after test run
  - Show run status, logs, outputs
```

### Priority 2: Wire the Frontend Test Run UI Properly

```
ToolDetailPage "Test Run" button:
  1. Open a modal with input fields matching the tool's contract input ports
  2. For parameter inputs: text/number fields
  3. For artifact inputs: file upload → POST to /v0/artifacts/upload → get artifact_id
  4. Call POST /v0/runs { tool_ref, inputs: { ... } }
  5. Redirect to run detail page or show inline run status
  6. Poll or SSE for run completion
  7. Display outputs: artifact download links, metric values
```

### Priority 3: Build the Actual Tool Docker Images

For any tool to actually execute, the author must:
1. Write the tool code (solver.py, etc.)
2. Build a Dockerfile
3. Ensure the entrypoint reads from `/in/inputs.json` and writes to `/out/`
4. Push to a Docker registry
5. Register the tool with the correct image name

### Priority 4: Implement the Missing Backend Routes

Some API routes referenced in frontend code may not yet be implemented:
- `GET /v0/runs?tool_id={id}` — list runs for a specific tool
- `GET /v0/runs/{id}/stream` — SSE run events stream
- `POST /v0/artifacts/upload` — upload artifact files for test runs

### Priority 5: Connect Trust Score Updates

After every run, call `RegistryService.UpdateTrustScore()` to update the tool's Bayesian success rate. This is the data that feeds the ToolShelf resolution ranking.

---

## 🗺️ 11. End-to-End Flow (Simplified)

```
User fills RegisterToolPage wizard
    ↓
Contract stored in PostgreSQL (tool registered)
    ↓
User clicks "Test Run" on ToolDetailPage
    ↓
POST /v0/runs { tool_ref: "tool_id@version", inputs: {...} }
    ↓
Go RunService.StartRun():
  - Validates tool is published
  - Creates Run record (status: pending)
  - Generates presigned MinIO URLs
  - Builds JobPayload JSON
    ↓
Publishes JobPayload to NATS → jobs.dispatch
    ↓
Rust Runner picks up job from NATS
    ↓
Downloads input files from MinIO → /tmp/airaie-runner/{job_id}/inputs/
    ↓
Pulls Docker image → creates container → starts container
    ↓
TOOL CODE RUNS INSIDE CONTAINER (your algorithm executes)
  Reads /in/inputs.json + /in/{artifact files}
  Runs computation
  Writes /out/{output files} + /out/outputs.json
    ↓
Container exits (code 0 = success)
    ↓
Runner uploads /out/ files to MinIO via presigned PUT URLs
    ↓
Runner publishes JobResult to NATS → results.completed
    ↓
Go result consumer receives JobResult:
  - Updates Run.status = "succeeded"
  - Creates Artifact records in PostgreSQL
  - Updates tool trust score
    ↓
Frontend polls GET /v0/runs/{id} → sees "succeeded"
Frontend shows output artifacts + metrics + logs
```

---

## 📦 12. Future Scalability Considerations

### Horizontal Scaling of Runners

The Rust Runner uses a NATS queue group (`runners`). Multiple runner instances can be started and they will automatically load-balance jobs. No coordination needed.

```
Add runner instances: docker compose scale worker=N
Each instance independently subscribes to NATS queue group "runners"
Jobs are distributed automatically by NATS competing-consumer semantics
```

### Adding New Adapter Types

The `ExecutionAdapter` trait (adapters/mod.rs) defines the interface:
- `execute()`, `can_handle()`, `cleanup()`
- Add new file: `adapters/new_adapter.rs`
- Implement the trait
- Add to `create_adapter()` factory function
- Add adapter name to the `Adapter` enum in models

### Adding New Tool Types / Domains

Tools are categorized by `domain_tags` and `supported_intents`. To add a new domain:
1. Register tools with appropriate `domain_tags` (e.g., `["acoustics", "vibration-analysis"]`)
2. Define `supported_intents` in the contract with appropriate intent type strings
3. The ToolShelf resolution engine automatically picks them up

### Contract Versioning

Each tool version has its own `contract_json`. Breaking changes in a contract should bump the tool version (e.g., `1.0.0` → `2.0.0`). Published versions are immutable — `ErrCannotModify` is returned if you try to update a published version's contract.

### Workflow Composition

Tools become workflow nodes when used in the `WorkflowEditorPage`. The workflow compiler (`service/plan_compiler.go`) validates that:
- All required inputs are connected to upstream outputs
- Types match between connected ports
- No cycles exist in the DAG

This enables composing multiple tools into end-to-end engineering pipelines.

### Trust Score Evolution

The Bayesian trust scoring system (`service/trust_updater.go`) automatically improves tool rankings over time:
- More successful runs → higher trust score → ranked higher in ToolShelf resolution
- Trust levels: `untested` → `community` → `tested` → `verified` → `certified`
- Trust promotion requires manual review at each level above `community`

---

## Summary: What You Need to Do Right Now

| # | Action | Why |
|---|--------|-----|
| 1 | Build a minimal Docker image with entrypoint that reads `/in/inputs.json` and writes `/out/outputs.json` | Without a real image, no job can execute |
| 2 | Push it to a registry accessible from your runner host | Runner pulls images at runtime |
| 3 | Register the tool with that image name via the UI | Connects the contract to the execution target |
| 4 | Verify the Go result consumer goroutine is running | Without this, results from NATS are lost |
| 5 | Verify the Rust runner is started and connected to NATS + MinIO | Runner is the data plane — nothing executes without it |
| 6 | Trigger a test run and trace through logs at each layer | Identify exactly where the chain breaks |
| 7 | Wire the frontend run result display (poll status, show logs, show artifacts) | Full UX loop |
