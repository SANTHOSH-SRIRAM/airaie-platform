# Airaie Unified Studio: End-to-End Mechanism, Data Flow I/O & State Machine Architecture

**Version:** 1.0 (Unified n8n-Inspired System Edition)
**Scope:** Ultra-fine Deep Architectural Mapping of Control/Data Planes, File I/O, Node Resolution, and Distributed State Machines.

---

## 1. Architectural Philosophy: The Separation of Logistics & Computation

The Airaie Unified Studio operates on a strictly bifurcated architecture designed explicitly for heavy-compute engineering processes (FEA, CFD, CAD processing, optimization). Generic DAG orchestrators (like n8n or Airflow) operate *in-process* or pass binary blobs in memory. 

Airaie radically streamlines this by separating:
1. **The Topography & Logic (Control Plane):** Handled by a monolithic Go Orchestrator and PostgreSQL, reacting to the React 19 Frontend.
2. **The Physics & Computation (Data Plane):** Handled by async Rust Runners operating isolated Docker Sandboxes and MinIO/S3 object stores.

This document traces exactly how a payload moves from an engineer's intention down into the hardware, and enumerates the deterministic state changes that happen along the way.

---

## 2. End-to-End State Machine Architecture

Because the platform coordinates human approvals, LLM-based agent reasoning, and deep physical simulations, there are multiple intersecting state machines.

### 2.1 The Workflow Definition Lifecycle
Workflows (the DAGs) possess their own versioned persistence states to prevent running incomplete graphs:
* `DRAFT`: The mutable state saved in the React UI via `Zustand` and synced to PostgreSQL via auto-save debounce on `PUT /v0/workflows/:id`.
* `COMPILED`: A strictly validated AST sequence checking for cycle detection (Kahn's algorithm), type-safety, and valid Tool Registry resolution.
* `PUBLISHED`: An immutable, production-ready snapshot. Only `PUBLISHED` workflows can be instantiated into a Task Run.

### 2.2 The Global Run State Machine (Go Scheduler)
When an execution begins (`POST /v0/runs`), the Go Scheduler spins up a background goroutine protected by PostgreSQL Advisory Locks (to ensure safety across multi-region API Gateways).

**Run Lifecycle Statuses:**
* `PENDING`: The AST is converted into an `ExecutionPlan`. Dependency graph is loaded.
* `RUNNING`: The Scheduler finds all "root" nodes (zero dependencies) and dispatches them.
* `PAUSED`: The run has encountered an inline **Gate Node** that requires manual evaluation (e.g., an Engineer's signature).
* `SUCCEEDED`: All terminal leaf nodes have emitted a successful exit code.
* `FAILED`: A node exceeded `max_retries` or encountered a system error, and the workflow is marked `critical`.
* `CANCELED`: An external halt command was received (`POST /v0/runs/:id/cancel`).

### 2.3 The Node Execution State Machine (Distributed Runtime)
A single node in the DAG transitions through physical infrastructure stages:
1. **QUEUED (Go):** Node placed into the `jobs.dispatch` NATS JetStream queue.
2. **ACQUIRED (Rust):** A worker in the `airaie-runners` NATS group consumes the job subject to Tokio concurrency limits.
3. **PRE-FLIGHT (Rust):** Validating the Tool Contract policy limits (Maximum CPUs, memory limit, timeout limits).
4. **I/O PREP (Rust):** S3 minIO downloads resolved input Artifacts to the local host's `/in` volume.
5. **EXECUTING (Docker):** Standard `RUNNING` state. Container started with `no-new-privileges:true`. 
6. **STREAMING (NATS):** Console stdout/stderr emitted real-time to `events.{run_id}` for the UI to consume via SSE.
7. **I/O TEARDOWN (Rust):** Outputs collected from `/out` volume, hashed, and uploaded to MinIO.
8. **COMPLETED (Go):** Rust runner publishes to `results.completed`. Go ResultHandler updates Postgres NodeRun row and attempts to unblock downstream dependent nodes.

### 2.4 The AI Agent Nested Iteration Loop
An Agent Node is distinct; it is **not** a single linear step. It acts as an orchestrator *inside* the wider workflow execution schema.
When an Agent Node receives inputs, its internal state machine activates:

```text
[CONTEXT_GATHER] ──> [CAPABILITY_SEARCH] ──> [SCORING]
                                                 │
   ┌─────────────────────────────────────────────┘
   ▼
[PROPOSAL_GEN] ──> [POLICY_CHECK] ──> [DISPATCH_TOOL] ──> [RESULT_EVAL]
   ▲                                                             │
   └──────────────────────────[Iterate?]─────────────────────────┘
                                 │
                               [Done]
                                 ▼
                     (Outputs pass to next Workflow Node)
```
- **Context Gather:** Merges input artifacts, goal directives, and Agent Memory (pgvector).
- **Scoring (Blended):** System calculates `(0.6 * Algorithmic_Match_Score) + (0.4 * LLM_Contextual_Score)` to rank valid tools dynamically.
- **Policy Check:** Applies `auto_approve_threshold`. If confidence is `0.9` and the policy threshold is `0.85`, it instantly auto-executes the tool. Otherwise, it kicks the state to `NEEDS_APPROVAL`.

### 2.5 Governance Gate State Machine
The Gate Node provides compliance pacing. 
* **PENDING:** Waits for required items.
* **EVALUATING (Automated):** E.g., `artifact_exists`, `run_succeeded`, `threshold_met (max_stress < 250 MPa)`. Checked iteratively as inputs flow in.
* **EVALUATING (Manual):** `role_signed` (e.g., `lead_engineer`).
* **PASSED / BLOCKED:** Allows or strictly halts the workflow progression.

---

## 3. Data Flow I/O & Payload Exchange

The mechanism is completely streamlined to avoid clogging active memory. We never pass CAD files or FEA results through WebSocket/REST layers.

### 3.1 The Edge Envelope (Information flowing between nodes)
The unified edge message passed across the Go engine takes an n8n-style JSON format, strictly delineating parameters from raw file references:

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
        "cost_usd": 0.50
      }
    }
  ]
}
```

### 3.2 The Expression Resolution Engine (`{{ }}`)
Because I/O is cleanly separated, the Workflow Engine allows the designer to route data using Go-evaluated template expressions:
* `{{ $json.max_stress_mpa }}` resolves parameter values.
* `{{ $artifacts.mesh_file }}` points the downstream Tool's contract to a specific S3 hash.
* `{{ $gate('Evidence').status }}` pulls active state from the platform.

### 3.3 The Infrastructure I/O Sequence (Data Plane Mapping)
When dealing with multi-gigabyte engineering files:
1. The **Go Scheduler** generates short-lived **S3 Presigned URLs** based on the referenced artifact IDs.
2. These URLs are inserted into the `JobPayload` passed to NATS.
3. The **Rust Volume Manager** intercepts the payload, issues parallel un-authenticated `GET` requests using the presigned URLs, and writes them locally to a secured `ramdisk` or highly optimized `nvme` storage path mapped as `/in`.
4. The Tool (e.g., OpenFOAM) boots, natively reading from `/in` completely agnostic of the cloud topology.
5. The Tool dumps processing outputs to `/out`.
6. The Rust runner captures `/out`, hashes each file against SHA-256 (instantly creating the immutable lineage), uploads them back to MinIO using a new batch of Presigned `PUT` URLs, and sends the new Artifact IDs back over NATS.

---

## 4. UI Streamlining (The Single App Shell)

Instead of the V1 fragmented micro-frontend approach, the mechanism is streamlined to a single React 19 shell interacting with this state machine.

### React / XYFlow State Model
1. **`canvas.store.ts` (Zustand):** Holds ephemeral positional data of the X/Y axes, pan/zoom levels, and current selection masks.
2. **`workflow.store.ts` (Zustand):** Contains the live graph nodes/edges matching the Edge Envelope structure. It compiles the JSON state into DSL YAML behind the scenes.
3. **`execution.store.ts` (Zustand/SSE):** Maintains standing connections to `GET /v0/runs/:id/stream`. As NATS events pass through the Go REST gateway via SSE, the store triggers React hydration, appending red/green/spinning badge icons to the generic XYFlow nodes natively.

**Right-Panel Inspector (NDV)** 
When a node is selected, an Inspector Panel dynamically maps the Tool Contract JSON Schema strictly against the Node's active parameters, presenting file choosers that only show correct file types (e.g., `.stl`, `.step`) and validating type safety *before* an execution state machine can ever be instantiated.

---

## 5. Architectural Diagram

```text
┌───────────────────────────────────────────────────────────────┐
│                     REACT 19 FRONTEND UI                      │
│   [XYFlow Canvas] <──> [Zustand Stores] <──> [SSE Stream]     │
└───────┬──────────────────────┬───────────────────────▲────────┘
        │ (Save/Compile)       │ (Post Run)            │ (Live Logs)
┌───────▼──────────────────────▼───────────────────────┴────────┐
│                   GO CONTROL PLANE (Port 8080)                │
│  [API Handlers] ──> [Schema Validator] ──> [Store / Data]     │
│                                                               │
│  [Workflow Compiler] ──> [DAG Scheduler] <──> [Agent Runtime] │
└───────┬──────────────────────▲───────────────────────▲────────┘
        │ jobs.dispatch        │ results.completed     │ events.* 
┌───────▼──────────────────────┴───────────────────────┴────────┐
│                   NATS JETSTREAM MESSAGE BUS                  │
└───────┬──────────────────────▲───────────────────────▲────────┘
        │ Consume              │ Publish               │ Publish  
┌───────▼──────────────────────┴───────────────────────┴────────┐
│                   RUST DATA PLANE (Runners)                   │
│  [Policy Pre-Flight] ──> [Volume Manager] ──> [Docker Sandbox]│
└───────┬──────────────────────▲────────────────────────────────┘
        │ Download (/in)       │ Upload (/out)
┌───────▼──────────────────────┴────────────────────────────────┐
│                       MINIO / S3 STORAGE                      │
│                  (Immutable Versioned Artifacts)              │
└───────────────────────────────────────────────────────────────┘
                                ▲
────────────────────────────────┴────────────────────────────────
This unified architecture guarantees that intelligent reasoning, 
strict governance, heavy computation, and front-end visualization 
exist in total deterministic harmony.
```
