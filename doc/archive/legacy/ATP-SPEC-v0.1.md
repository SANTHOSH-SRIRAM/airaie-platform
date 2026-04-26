# ATP — Airaie Tool Protocol

**Version:** 0.1 (Draft)
**Status:** Experimental — subject to change without notice until v1.0
**Date:** 2026-04-23
**License:** Apache-2.0 (intended, upon publication)

---

## Abstract

The **Airaie Tool Protocol (ATP)** is a transport-agnostic specification for
describing, discovering, invoking, observing, and governing computational tools.
It defines a typed contract (the Manifest), a universal set of seven Verbs, a
three-type data model (Artifact / Parameter / Metric), a universal State
Machine, and a standardized Event Stream.

ATP separates **what a tool is** from **how a tool is reached**. A tool author
writes one Manifest and binds it to one or more Transport Bindings (Docker,
CLI, HTTP/OpenAPI, gRPC, Python module, MCP, Jupyter, hardware device,
human-task, …). A consumer — an agent, a workflow, a UI, a CI job, an external
AI client — interacts with the tool via the Verbs, never seeing the transport.

ATP is designed for engineering, scientific, and governed-experimentation
domains where reproducibility, provenance, trust scoring, and policy
enforcement are non-negotiable.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Conformance Language](#2-conformance-language)
3. [Design Goals and Non-Goals](#3-design-goals-and-non-goals)
4. [Core Concepts](#4-core-concepts)
5. [Data Model](#5-data-model)
6. [The Manifest](#6-the-manifest)
7. [The Seven Verbs](#7-the-seven-verbs)
8. [State Machine](#8-state-machine)
9. [Event Stream](#9-event-stream)
10. [Error Model](#10-error-model)
11. [Governance, Trust, and Sandboxing](#11-governance-trust-and-sandboxing)
12. [Transport Bindings](#12-transport-bindings)
13. [Versioning](#13-versioning)
14. [Security Considerations](#14-security-considerations)
15. [Appendix A — Manifest JSON Schema](#appendix-a--manifest-json-schema)
16. [Appendix B — Reference Binding: Docker](#appendix-b--reference-binding-docker)
17. [Appendix C — Glossary](#appendix-c--glossary)
18. [Appendix D — Prior Art and Acknowledgments](#appendix-d--prior-art-and-acknowledgments)

---

## 1. Introduction

### 1.1 Motivation

Engineering, scientific, and analytical tools exist in every imaginable shape:
Docker-packaged OSS solvers (OpenFOAM, CalculiX), licensed host binaries
(MATLAB, Abaqus, ANSYS), cloud REST services (Bloomberg, ANSYS Cloud,
Autodesk APS), native libraries (QuantLib, OpenCV), notebooks (Jupyter,
MATLAB Live), GUI-only applications (SolidWorks, AutoCAD), Model Context
Protocol servers, and physical instruments (DAQ, PLCs, test rigs).

Today each of these speaks a different protocol. A platform that wants to
compose them — to run governed experiments, agent-driven workflows,
reproducible pipelines — must write a custom adapter per tool, per protocol,
per vendor. The adapter churn is the primary cost of operating such a
platform.

ATP exists to collapse this N×M problem into N+M. A tool author writes **one**
Manifest and **one** Transport binding. A platform implements the **seven
Verbs** once per supported transport. New tools and new transports plug in
without kernel changes.

### 1.2 Scope

ATP specifies:

- The Manifest format (YAML/JSON)
- The Verb set and their semantics
- The port type system (Artifact / Parameter / Metric)
- The execution State Machine
- The Event Stream schema (NDJSON)
- The governance metadata envelope (trust, sandbox, cost, approval)
- The requirements a Transport Binding MUST satisfy

ATP does NOT specify:

- How the Manifest is stored, indexed, or distributed (registries are out of scope)
- How transports authenticate (each binding defines its own auth model)
- How artifacts are physically stored (content-addressed, but backend-agnostic)
- Which scheduler, orchestrator, or runtime executes jobs (reference
  implementation exists; alternatives MAY conform)
- Higher-level concepts such as workflows, boards, or intents (those compose
  ATP; ATP does not define them)

### 1.3 Audience

This document is normative for:

- **Tool authors** writing ATP-conformant tools
- **Platform implementers** building ATP consumers (runtimes, registries, agents)
- **Transport-binding authors** adding new transports

---

## 2. Conformance Language

The keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**,
**SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this
document are to be interpreted as described in [RFC 2119] when, and only when,
they appear in all capitals.

A **Conformant Manifest** is a document that validates against the Manifest
JSON Schema (Appendix A) and satisfies the additional constraints in §6.

A **Conformant Transport Binding** is an implementation that, for each tool
Manifest declaring its transport, correctly implements all seven Verbs (§7),
emits events conforming to §9, and respects the State Machine of §8.

A **Conformant Runtime** is an implementation that can discover Manifests,
invoke Verbs via one or more Transport Bindings, and present results to
consumers in a manner consistent with this specification.

---

## 3. Design Goals and Non-Goals

### 3.1 Goals

1. **Transport agnosticism.** A tool consumer MUST NOT need to know how a
   tool is reached. Docker vs MCP vs CLI vs HTTP is an implementation detail.
2. **One contract, many bindings.** A single Manifest MAY declare multiple
   Transport Bindings; the runtime selects at invocation time.
3. **Typed, content-addressed data.** Three port types (Artifact, Parameter,
   Metric); file payloads are content-hashed; parameter and metric values are
   JSONSchema-validated.
4. **Reproducibility by construction.** Version-pinned tools + content-hashed
   artifacts + immutable manifests = byte-identical replay.
5. **Governance metadata is first-class.** Trust level, sandbox constraints,
   cost estimate, and approval policy travel with the Manifest.
6. **Observable.** Log, progress, metric, and artifact events share one NDJSON
   schema regardless of transport.
7. **Open.** The specification, reference SDKs, and schema are
   vendor-neutral and published under a permissive license.

### 3.2 Non-Goals

1. ATP is **not** a workflow language. Composing tools into DAGs is
   out of scope (see: Airaie Workflow DSL, CWL, Nextflow).
2. ATP is **not** a container-image format. OCI defines that.
3. ATP is **not** a secrets-management system. Credentials are supplied by
   the runtime via out-of-band channels.
4. ATP does **not** prescribe a scheduling algorithm.
5. ATP does **not** replace MCP, OpenAPI, gRPC, or OCI — it composes with them
   via Transport Bindings.

---

## 4. Core Concepts

### 4.1 Tool

A **Tool** is a named, versioned, self-contained computational unit.
A Tool is fully described by its Manifest.

### 4.2 Manifest

A **Manifest** is a structured document (YAML or JSON) that describes a
Tool's identity, interface, runtime bindings, capabilities, governance
metadata, and tests. See §6.

### 4.3 Transport Binding

A **Transport Binding** is a mapping from ATP's abstract Verbs to a concrete
wire protocol (e.g., Docker container lifecycle, HTTP/REST, MCP, OS
subprocess, MQTT, Modbus). A Manifest MAY declare one or more Transport
Bindings; consumers pick at invocation time. See §12.

### 4.4 Verb

A **Verb** is one of seven abstract operations defined by ATP:
`describe`, `validate`, `invoke`, `status`, `stream`, `cancel`, `result`.
Every Transport Binding MUST implement all seven. See §7.

### 4.5 Job and JobHandle

A **Job** is a single concrete execution of a Tool with bound inputs.
A **JobHandle** is an opaque, transport-unique identifier returned by
`invoke` and passed to `status`, `stream`, `cancel`, and `result`.
JobHandles MUST be string-typed and unique within a runtime.

### 4.6 Artifact

An **Artifact** is an immutable, content-addressed file payload.
Artifacts are identified by a content hash (`sha256:...` REQUIRED; other
algorithms OPTIONAL) and an opaque URI (e.g., `artifact://.../id` or
`s3://bucket/key`). Artifact bytes MUST NOT change after the hash is
assigned.

### 4.7 Port

A **Port** is a named, typed input or output of a Tool. Every Port
declares exactly one of three port types: `artifact`, `parameter`,
or `metric`. See §5.

### 4.8 Event

An **Event** is a structured record emitted during Job execution
(lifecycle transition, log line, progress update, metric sample, artifact
written). Events conform to the NDJSON schema in §9.

### 4.9 Consumer

A **Consumer** is any caller of ATP Verbs: a workflow engine, an agent
runtime, a human-facing UI, a CI system, an external AI client, or another
Tool invoking a subtool.

---

## 5. Data Model

### 5.1 Port Types

ATP defines exactly three port types. Every input and output Port MUST
declare one:

| Type | Description | Wire Representation |
|---|---|---|
| `artifact` | An immutable, content-addressed file payload | URI + `sha256` digest |
| `parameter` | A typed scalar or structured value | Inline JSON value |
| `metric` | A structured measurement or result | Inline JSON value |

Rationale: the three-type discipline enforces that large data (files) is
passed by reference, while small data (scalars, configs, measurements) is
passed inline. This is the universal data currency across all tools.

### 5.2 Typed Schemas

Ports of type `parameter` and `metric` MAY declare a `schema` and/or
`value_schema` field expressing their type using JSONSchema (Draft 2020-12).

Ports of type `artifact` MAY declare a `constraints` object with at least
the following OPTIONAL keys:

- `accepted_formats` — array of file extensions (e.g., `[".stl", ".step"]`)
- `max_size_bytes` — integer upper bound
- `artifact_kind` — free-form domain tag (e.g., `"measurement.result"`,
  `"geometry.cad"`, `"report.pdf"`)

### 5.3 Constraints

A `constraints` object MAY appear on any Port. Recognized keys include:

| Key | Applies To | Example |
|---|---|---|
| `enum` | parameter (string/number) | `["vtk", "csv", "json"]` |
| `min`, `max` | parameter (number/integer) | `{"min": 1, "max": 10000}` |
| `pattern` | parameter (string) | `"^[A-Za-z0-9\\-]+$"` |
| `shape` | parameter (array) | `[3, 3]` |
| `accepted_formats` | artifact | `[".stl", ".step"]` |
| `max_size_bytes` | artifact | `536870912` |

Unknown keys MUST be preserved but MAY be ignored by consumers.

### 5.4 Content Addressing

Every Artifact MUST carry a content digest. Implementations MUST support
`sha256`. Implementations MAY additionally support `sha512`, `blake3`,
or other cryptographic digests. Digests are expressed as
`<algorithm>:<hex>` (e.g., `sha256:a1b2c3…`).

Artifact immutability is a protocol invariant: once a digest is assigned,
the bytes referenced by that URI MUST NOT change. A "new version" is a new
Artifact with a new URI and a new digest.

---

## 6. The Manifest

### 6.1 Top-Level Structure

A Manifest is a YAML or JSON document with the following top-level fields:

```yaml
apiVersion: atp/v1          # REQUIRED — protocol version identifier
kind: Tool                  # REQUIRED — always "Tool" in v1
metadata: {...}             # REQUIRED
interface: {...}            # REQUIRED
bindings: [...]             # REQUIRED — at least one binding
capabilities: {...}         # OPTIONAL
governance: {...}           # OPTIONAL
observability: {...}        # OPTIONAL
tests: {...}                # OPTIONAL
```

Consumers MUST reject Manifests where `apiVersion` is unknown or
incompatible. A Manifest MUST NOT contain top-level keys outside this list
in v1; future versions MAY add keys under new `apiVersion` values.

### 6.2 `metadata`

```yaml
metadata:
  id: openfoam.simplefoam         # REQUIRED — globally unique, dotted reverse-DNS style
  name: "OpenFOAM SimpleFoam"     # REQUIRED — human-readable
  version: "11.0.0"               # REQUIRED — semver
  tier: 2                         # OPTIONAL — 1|2|3 (see §6.7)
  owner: "cfd-team"               # OPTIONAL
  domain_tags: [cfd, incompressible]  # OPTIONAL — array of strings
  description: "..."              # OPTIONAL — markdown-compatible
  license: "GPL-3.0"              # OPTIONAL — SPDX identifier
  source: "https://github.com/.../openfoam"  # OPTIONAL — URL
```

The `id` field MUST be unique within any registry that indexes this
Manifest. The combination `(id, version)` is the canonical tool reference.
Tool references MAY be written as `id@version` in textual contexts.

### 6.3 `interface`

```yaml
interface:
  inputs:                         # REQUIRED — array (may be empty)
    - name: case_dir              # REQUIRED
      type: artifact              # REQUIRED — artifact|parameter|metric
      required: true              # OPTIONAL — default true
      description: "..."          # OPTIONAL
      default: ...                # OPTIONAL — only for parameter
      schema: {...}               # OPTIONAL — JSONSchema for parameter
      value_schema: {...}         # OPTIONAL — JSONSchema for nested objects
      constraints: {...}          # OPTIONAL
      unit: "MPa"                 # OPTIONAL — free-form
      artifact_kind: "geometry.cad"  # OPTIONAL — artifact only

  outputs:                        # REQUIRED — array (may be empty)
    - name: result_vtk
      type: artifact
      artifact_kind: "measurement.result"

  errors:                         # OPTIONAL
    - code: DIVERGED
      description: "Solver did not converge"

  streaming:                      # OPTIONAL
    progress: true
    log_chunks: true
    intermediate_results: false
```

Port names within `inputs` MUST be unique; same for `outputs`. Port names
MUST match the regex `^[a-z][a-z0-9_]*$` (snake_case) and be no longer
than 64 characters.

### 6.4 `bindings`

The `bindings` array is how one Manifest binds to one or more Transport
Bindings. The array MUST contain at least one entry.

```yaml
bindings:
  - transport: docker             # REQUIRED — transport identifier
    priority: 10                  # OPTIONAL — higher = preferred
    spec:                         # REQUIRED — transport-specific config
      image: "registry.airaie.io/openfoam:11"
      entrypoint: "/app/run.sh"
      work_dir: "/workspace"
    resources:                    # OPTIONAL — transport MAY honor
      cpu: 4
      memory_mb: 4096
      gpu: false
      timeout_sec: 3600

  - transport: cli
    priority: 5
    spec:
      executable: "simpleFoam"
      arg_map: {...}

  - transport: http
    priority: 1
    spec:
      openapi_url: "https://.../openapi.yaml"
      operation: "POST /v1/simulations"
```

The `transport` field MUST match a registered Transport Binding identifier
(see §12). Runtimes MUST attempt the highest-priority available binding
first and SHOULD fall back to lower-priority bindings on transport-level
failure (not on tool-level failure).

The `spec` field is binding-defined; each binding documents its allowed
keys.

### 6.5 `capabilities`

```yaml
capabilities:
  computes: [stress_field, safety_factor]        # OPTIONAL
  requires: [meshed_geometry, material_props]    # OPTIONAL
  supported_intents:                              # OPTIONAL
    - intent_type: sim.cfd_incompressible
      confidence: 0.95
  composition:                                    # OPTIONAL
    idempotent: true
    cacheable: true
    cache_key_inputs: [case_dir, endTime]
```

The `supported_intents` field enables intent-based tool discovery. Each
entry declares an intent-type identifier and a confidence score in `[0, 1]`.

### 6.6 `governance`

```yaml
governance:
  sandbox:
    network: deny                   # deny | restricted | allow
    filesystem: sandbox             # sandbox | readonly | readwrite
    max_cpu_per_job: 8
    max_memory_mb_per_job: 8192
    max_timeout_sec_per_job: 3600
  quota:
    max_concurrent_jobs: 10
    max_daily_runs: 500
  data_policy:
    retention_days: 90
    pii_handling: "none"            # none | hashed | encrypted
    export_restricted: false
  approval:
    auto_approve_below_cost: 5.00
    require_review_above_cost: 50.00
  trust_level: verified             # untested|community|tested|verified|certified
```

See §11 for governance semantics.

### 6.7 Tier Taxonomy

Optional `metadata.tier` classifies the Tool:

| Tier | Name | Scope |
|---|---|---|
| 1 | Primitives | Small, reusable, single operation (unit converter, validator) |
| 2 | Domain Operators | Mid-level, domain-specific (FEA solver, mesh generator) |
| 3 | Products | End-to-end pipelines composing lower tiers |

### 6.8 `tests`

```yaml
tests:
  sample_cases:
    - name: simple_bracket
      inputs:
        mesh_file: "testdata/bracket.stl"
        material: "Al6061-T6"
      expected_outputs:
        metrics.converged: true
        metrics.max_stress: { "$lt": 300 }
```

Sample cases are used for:
- Contract lint verification at registration time
- Smoke tests before trust promotion (see §11.2)
- Regression guards on version upgrades

---

## 7. The Seven Verbs

Every Transport Binding MUST implement all seven verbs. This section
defines their abstract semantics; §12 and its per-transport sub-specs
define the wire-level mappings.

### 7.1 `describe`

**Signature:** `describe(tool_ref: string) → Manifest`

Returns the full Manifest for a given tool reference (`id@version`).
The returned Manifest MUST be a conformant Manifest. Consumers MAY cache
the result.

### 7.2 `validate`

**Signature:** `validate(tool_ref: string, inputs: map) → ValidationResult`

Checks that the supplied `inputs` satisfy the Manifest's `interface.inputs`
contract. Returns either:

- `{ ok: true }`
- `{ ok: false, errors: [{port, code, message}, ...] }`

Validation MUST include:
- All required ports present
- All port values type-compatible with their declared `type`
- All `schema` / `value_schema` JSONSchema checks pass
- All `constraints` checks pass (ranges, enums, formats, sizes)

Validation MUST NOT have side effects and MUST be pure with respect to the
tool runtime. Implementations MAY perform artifact reachability checks as
part of validation (e.g., verifying a referenced artifact exists); this
is RECOMMENDED.

### 7.3 `invoke`

**Signature:** `invoke(tool_ref: string, inputs: map, options?) → JobHandle`

Submits a new Job. Implementations MUST:

1. Re-run validation (`validate`) prior to dispatch.
2. Enforce `governance.sandbox` and `governance.quota` constraints.
3. Generate and return a JobHandle that is unique within the runtime.
4. Transition the Job to state `queued` (or `running` if dispatched
   synchronously).
5. Begin emitting events to the event stream for that handle.

`invoke` is asynchronous. The returned JobHandle is valid immediately;
event delivery and terminal-state transition occur later.

The OPTIONAL `options` parameter is binding-defined and MAY include
priority, deadline, preferred binding, trace context, idempotency key,
etc.

### 7.4 `status`

**Signature:** `status(handle: string) → StateSnapshot`

Returns the current state of a Job:

```json
{
  "handle": "h_abc123",
  "state": "running",
  "entered_at": "2026-04-23T14:00:00Z",
  "progress": 0.42,
  "last_event_seq": 127
}
```

State values MUST be one of the State Machine states in §8.

`status` MUST be safely callable concurrently and repeatedly without
side effects.

### 7.5 `stream`

**Signature:** `stream(handle: string, from_seq?: int) → EventStream`

Returns an ordered stream of events (§9) for a Job. The stream:

- MUST replay events from `from_seq` (inclusive) if provided, else from 0.
- MUST deliver events in monotonically increasing `seq` order per handle.
- MUST terminate when the Job reaches a terminal state AND all events
  through that state have been delivered.
- MAY backfill events from a durable buffer if the consumer reconnects.

Wire format is binding-defined; NDJSON (HTTP), SSE (HTTP), and gRPC
server-streaming are RECOMMENDED.

### 7.6 `cancel`

**Signature:** `cancel(handle: string, reason?: string) → CancelAck`

Requests cancellation of a Job. Semantics:

- If the Job is in a non-terminal state, it MUST transition to `canceled`
  as soon as the transport can honor the request.
- If the Job is already in a terminal state, `cancel` is a no-op that
  returns success.
- Cancellation is best-effort; implementations MUST NOT guarantee
  synchronous termination.
- A `reason` string MAY be attached and SHOULD be included in the
  terminal event.

### 7.7 `result`

**Signature:** `result(handle: string) → JobResult`

Returns the final result of a Job. MUST be callable only after the Job
has reached a terminal state (`completed`, `failed`, `canceled`, `timeout`).
If called earlier, it MUST return a protocol error.

```json
{
  "handle": "h_abc123",
  "status": "completed",
  "exit_code": 0,
  "outputs": [
    {"name": "result_vtk", "type": "artifact",
     "uri": "artifact://.../r1", "sha256": "a1b2..."}
  ],
  "metrics": {"max_stress": 247.3, "converged": true},
  "errors": [],
  "duration_ms": 45231,
  "metadata": {"peak_memory_mb": 512}
}
```

The result payload MUST be stable — repeated calls for the same handle
MUST return equal bodies (modulo idempotent re-serialization).

---

## 8. State Machine

Every Job moves through the following universal state machine:

```
                ┌──────────┐
                │ pending  │
                └────┬─────┘
                     │ validate OK
                     ▼
                ┌──────────┐
                │validated │
                └────┬─────┘
                     │ dispatched
                     ▼
                ┌──────────┐
                │  queued  │
                └────┬─────┘
                     │ resources acquired
                     ▼
                ┌──────────┐
                │ running  │────────┐
                └────┬─────┘        │
                     │              │
        ┌────────────┼──────────┬───┴─────────┐
        │            │          │             │
        ▼            ▼          ▼             ▼
  ┌──────────┐ ┌─────────┐ ┌────────┐ ┌─────────────┐
  │completed │ │ failed  │ │canceled│ │   timeout   │
  └──────────┘ └─────────┘ └────────┘ └─────────────┘
              (terminal states — no further transitions)
```

| State | Meaning |
|---|---|
| `pending` | Accepted by runtime, not yet validated |
| `validated` | Inputs check out against Manifest |
| `queued` | Awaiting resources or scheduling slot |
| `running` | Actively executing |
| `completed` | Terminal — successful completion |
| `failed` | Terminal — execution error (tool exit code ≠ 0 or transport error) |
| `canceled` | Terminal — cancellation requested and honored |
| `timeout` | Terminal — exceeded `resources.timeout_sec` |

State transitions MUST be observable via the event stream: each transition
emits a `state` event (§9.3).

Implementations MAY collapse `pending → validated → queued` into a single
synchronous step when it is indistinguishable to the consumer; they MUST
still emit the corresponding `state` events.

Terminal states are final. A Job MUST NOT transition out of a terminal
state. Re-running a Job is modeled as creating a new Job with a new
handle.

---

## 9. Event Stream

### 9.1 Envelope

Every event is a single JSON object conforming to:

```json
{
  "ts": "2026-04-23T14:00:12.345Z",   // REQUIRED — RFC 3339 UTC
  "seq": 42,                          // REQUIRED — monotonically increasing per handle
  "handle": "h_abc123",               // REQUIRED
  "event": "log",                     // REQUIRED — one of the types in §9.2
  ...type-specific fields...
}
```

Wire format is NDJSON (one JSON object per line, `\n`-delimited). Binding
docs MAY map this onto SSE, gRPC messages, NATS subjects, or WebSocket
frames, but the JSON envelope is invariant.

### 9.2 Event Types

| `event` | When | Required Fields |
|---|---|---|
| `state` | State transition | `state`, `previous_state` |
| `log` | Stdout/stderr line | `stream` (`stdout`\|`stderr`), `line` |
| `progress` | Progress update | `ratio` (0–1), `stage?` |
| `metric` | Metric sample | `key`, `value`, `unit?` |
| `artifact` | Output artifact written | `name`, `uri`, `sha256`, `size_bytes?` |
| `warning` | Non-fatal issue | `code`, `message` |
| `error` | Fatal error | `code`, `message` |

Unknown event types MUST be preserved but MAY be ignored by consumers.

### 9.3 Example Stream

```jsonl
{"ts":"2026-04-23T14:00:00.100Z","seq":0,"handle":"h_abc","event":"state","state":"validated","previous_state":"pending"}
{"ts":"2026-04-23T14:00:00.150Z","seq":1,"handle":"h_abc","event":"state","state":"queued","previous_state":"validated"}
{"ts":"2026-04-23T14:00:01.200Z","seq":2,"handle":"h_abc","event":"state","state":"running","previous_state":"queued"}
{"ts":"2026-04-23T14:00:02.450Z","seq":3,"handle":"h_abc","event":"log","stream":"stdout","line":"Reading mesh..."}
{"ts":"2026-04-23T14:00:05.000Z","seq":4,"handle":"h_abc","event":"progress","ratio":0.25,"stage":"meshing"}
{"ts":"2026-04-23T14:00:30.000Z","seq":5,"handle":"h_abc","event":"metric","key":"residual","value":0.0001}
{"ts":"2026-04-23T14:00:42.000Z","seq":6,"handle":"h_abc","event":"artifact","name":"result_vtk","uri":"artifact://prj/result_1","sha256":"a1b2c3..."}
{"ts":"2026-04-23T14:00:42.500Z","seq":7,"handle":"h_abc","event":"state","state":"completed","previous_state":"running"}
```

### 9.4 Ordering Guarantees

- Events within a single handle MUST arrive in strictly increasing `seq`
  order when delivered by `stream`.
- Events across handles have NO ordering relationship.
- `seq` MUST start at 0 for each handle and increment by exactly 1 per event.
- The final event for any Job MUST be a `state` event transitioning to a
  terminal state.

### 9.5 Durability

Implementations SHOULD retain the event stream for at least 24 hours
after terminal-state transition, allowing late consumers to replay from
`seq=0`. Retention policy is implementation-defined.

---

## 10. Error Model

### 10.1 Error Envelope

All protocol errors use a common envelope:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Input 'threshold' must be ≥ 1",
  "details": {
    "port": "threshold",
    "value": -5,
    "constraint": "min"
  },
  "retriable": false
}
```

### 10.2 Standard Error Codes

| Code | Meaning | Verb(s) |
|---|---|---|
| `NOT_FOUND` | Tool or handle not found | all |
| `VERSION_MISMATCH` | Requested version is deprecated or unknown | all |
| `VALIDATION_FAILED` | Input validation error | validate, invoke |
| `QUOTA_EXCEEDED` | Governance quota violated | invoke |
| `POLICY_VIOLATION` | Sandbox or policy rule triggered | invoke |
| `TRANSPORT_UNAVAILABLE` | Declared binding could not be reached | invoke |
| `TIMEOUT` | Operation exceeded deadline | invoke, stream, cancel |
| `CANCELED` | Job canceled by caller | result |
| `INTERNAL` | Unrecoverable implementation error | all |
| `PRECONDITION` | Verb called in wrong state (e.g., `result` before terminal) | result |

Tool-specific errors (emitted by the tool's own logic, e.g., `MESH_INVALID`,
`DIVERGED`) are declared in `interface.errors` and surface as `error`
events (§9.2) in the stream AND in `result.errors`.

### 10.3 Retriability

`retriable: true` indicates the caller MAY retry with identical inputs.
`retriable: false` indicates the inputs or state must change before retry.
Transient infrastructure errors (network failures, backend timeouts)
SHOULD be marked retriable; validation errors and policy violations
MUST NOT.

---

## 11. Governance, Trust, and Sandboxing

### 11.1 Trust Levels

Five trust levels form an ordered progression:

| Level | Requirements |
|---|---|
| `untested` | Default for new Manifests |
| `community` | Contract passes all lint checks; published |
| `tested` | All declared `tests.sample_cases` pass |
| `verified` | ≥10 runs and Bayesian success ratio ≥0.80 |
| `certified` | ≥50 runs and Bayesian success ratio ≥0.95, plus human review |

Runtimes MAY refuse to dispatch tools below a required trust floor
(e.g., production Boards requiring `verified` or higher).

### 11.2 Bayesian Trust Formula

A Tool's empirical success ratio is computed as:

```
trust_score = (successes + 5) / (total_runs + 10)
```

The Beta(5, 5) prior yields `trust_score = 0.5` for a Tool with no runs
(neutral), converging toward the true success rate as runs accumulate.

| Runs | Successes | Trust Score |
|---|---|---|
| 0 | 0 | 0.500 |
| 10 | 10 | 0.750 |
| 10 | 8 | 0.650 |
| 100 | 95 | 0.909 |
| 1000 | 995 | 0.993 |

Implementations MUST update trust scores on every terminal transition.

### 11.3 Sandbox Model

The `governance.sandbox` block declares the execution sandbox:

| Key | Values | Default | Effect |
|---|---|---|---|
| `network` | `deny` \| `restricted` \| `allow` | `deny` | Network reachability from the job environment |
| `filesystem` | `sandbox` \| `readonly` \| `readwrite` | `sandbox` | Filesystem writability outside the workspace |
| `max_cpu_per_job` | integer | unspecified | Hard CPU cap |
| `max_memory_mb_per_job` | integer | unspecified | Hard memory cap |
| `max_timeout_sec_per_job` | integer | unspecified | Hard wall-clock cap |

Transport Bindings MUST honor these when the underlying platform permits
(e.g., Docker binding enforces via `--network`, `--cpus`, `--memory`;
hardware bindings MAY have no-ops and MUST document this).

### 11.4 Cost and Approval

The `governance.approval` block declares cost-based gating:

- `auto_approve_below_cost` — USD threshold under which invocations auto-run
- `require_review_above_cost` — USD threshold above which invocations require human approval

Cost estimation logic is runtime-specific. Runtimes SHOULD compute an
estimate from resource declarations and rate tables before `invoke`.

---

## 12. Transport Bindings

### 12.1 Registered Bindings (v1 Baseline)

ATP v1 defines the following Transport Binding identifiers. Each is
specified in a companion document referenced below.

| ID | Binding Title | Reference Document |
|---|---|---|
| `docker` | Docker Container | `bindings/docker.md` |
| `cli` | Host CLI / Subprocess | `bindings/cli.md` |
| `http` | HTTP / OpenAPI | `bindings/http.md` |
| `grpc` | gRPC | `bindings/grpc.md` |
| `python` | Python Module | `bindings/python.md` |
| `mcp` | Model Context Protocol | `bindings/mcp.md` |
| `jupyter` | Jupyter Notebook | `bindings/jupyter.md` |
| `native` | WASM / Compiled Native | `bindings/native.md` |
| `workflow` | Sub-Workflow | `bindings/workflow.md` |
| `human_task` | Human Task | `bindings/human-task.md` |
| `hardware` | Hardware Device (serial, modbus, OPC-UA) | `bindings/hardware.md` |

Appendix B gives the `docker` binding as the reference illustration.

### 12.2 Binding Conformance Requirements

A Binding Specification document MUST describe:

1. **Identifier** — the string value used in `bindings[].transport`.
2. **`spec` schema** — keys accepted under `bindings[].spec`.
3. **Verb mappings** — how each of the seven Verbs is implemented
   over the transport's wire protocol.
4. **Authentication model** — how credentials are supplied (if any).
5. **Event production** — how the binding produces the §9 event stream.
6. **Sandbox enforcement** — how `governance.sandbox` is honored
   (or explicitly declared as no-op, with rationale).
7. **Error mapping** — how transport-level errors map to §10 codes.
8. **Conformance tests** — minimum test battery an implementation MUST pass.

### 12.3 Multiple Bindings per Manifest

When a Manifest declares multiple bindings:

- Runtimes MUST attempt bindings in descending `priority` order.
- A fallback to the next binding is permitted ONLY when the current
  binding fails at the **transport** layer (unreachable, unavailable,
  not installed), NOT at the **tool** layer (tool ran and failed).
- The binding actually used for a Job MUST be reported in
  `result.metadata.binding`.

### 12.4 Binding Discovery

A runtime advertises which bindings it supports via a local config file,
an environment variable, or a control-plane query. Consumers MAY pre-filter
Manifests to those declaring at least one supported binding.

---

## 13. Versioning

### 13.1 Protocol Version

The protocol itself is versioned via the `apiVersion` field:

- `atp/v0alpha1` through `atp/v0alphaN` — Draft versions. No compatibility
  guarantees.
- `atp/v1` — First stable version. Backward-compatible additions only.
- `atp/v2`, `atp/v3`, … — Breaking changes require a new major version.

This document defines `atp/v1` in draft form. Until v1.0 is declared
stable, the `apiVersion` SHOULD be treated as `atp/v0alpha1`.

### 13.2 Manifest Version (Semantic Versioning)

Each Tool has its own version in `metadata.version`, governed by SemVer 2.0:

- **Major** — breaking change to `interface` (removed port, type change,
  constraint tightened, added required input).
- **Minor** — backward-compatible additions (new optional input, new
  output port, new supported intent).
- **Patch** — no contract change (logic fix, performance improvement,
  sample cases updated).

Tool references MUST pin to exact versions in production contexts
(`openfoam.simplefoam@11.0.0`). SemVer-range references
(`openfoam.simplefoam@^11`) MAY be used in development.

### 13.3 Immutability

Once published at a given `(id, version)`, a Manifest MUST NOT be
modified. Corrections require a new patch version.

---

## 14. Security Considerations

### 14.1 Supply Chain

- **Manifest signing** — implementations SHOULD support signed Manifests
  (detached signatures, e.g., Sigstore, GPG). Signature verification is
  out of scope for v1 but reserved for v2.
- **Artifact integrity** — content hashes are the primary integrity
  mechanism. Runtimes MUST verify artifact hashes on download.
- **Image integrity** — for `docker` binding, image digests (rather than
  tags) are RECOMMENDED.

### 14.2 Sandbox Isolation

- `network: deny` means the job MUST have no outbound network
  reachability by the underlying platform's strictest means.
- `filesystem: sandbox` means the job MUST NOT write outside its workspace
  and MUST NOT read host filesystem paths except mounted inputs.
- Bindings MUST document any sandbox guarantees they cannot enforce and
  downgrade trust accordingly.

### 14.3 Credential Handling

- Credentials MUST NOT appear in the Manifest.
- Transport Bindings MAY declare credential names referenced via
  environment variables or secret-manager keys.
- Runtimes MUST inject credentials out-of-band and MUST NOT log them.

### 14.4 Denial of Service

Governance quotas (`max_concurrent_jobs`, `max_daily_runs`) and per-job
resource caps are the primary DoS mitigations. Runtimes SHOULD also
enforce global quotas at the project/tenant level.

### 14.5 Audit

Every Verb invocation SHOULD emit an audit event to a durable log
including: `ts`, `actor`, `verb`, `tool_ref`, `handle?`,
`outcome`, `error_code?`. The audit log is out of scope for ATP proper
but RECOMMENDED for any governed deployment.

---

## Appendix A — Manifest JSON Schema

A normative JSON Schema (Draft 2020-12) for Manifests is published alongside
this document as `manifest.schema.json`. The schema is summarized here;
the published file is authoritative.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://airaie.io/schemas/atp/v1/manifest.schema.json",
  "title": "ATP Manifest",
  "type": "object",
  "required": ["apiVersion", "kind", "metadata", "interface", "bindings"],
  "properties": {
    "apiVersion": { "const": "atp/v1" },
    "kind":       { "const": "Tool" },
    "metadata": {
      "type": "object",
      "required": ["id", "name", "version"],
      "properties": {
        "id":       { "type": "string", "pattern": "^[a-z][a-z0-9_.-]*$" },
        "name":     { "type": "string", "minLength": 1 },
        "version":  { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+([+-][A-Za-z0-9._-]+)?$" },
        "tier":     { "type": "integer", "enum": [1, 2, 3] },
        "owner":    { "type": "string" },
        "domain_tags": { "type": "array", "items": { "type": "string" } },
        "description": { "type": "string" },
        "license":  { "type": "string" },
        "source":   { "type": "string", "format": "uri" }
      }
    },
    "interface": {
      "type": "object",
      "required": ["inputs", "outputs"],
      "properties": {
        "inputs":  { "type": "array", "items": { "$ref": "#/$defs/port" } },
        "outputs": { "type": "array", "items": { "$ref": "#/$defs/port" } },
        "errors":  { "type": "array", "items": { "$ref": "#/$defs/errorDecl" } },
        "streaming": {
          "type": "object",
          "properties": {
            "progress":             { "type": "boolean" },
            "log_chunks":           { "type": "boolean" },
            "intermediate_results": { "type": "boolean" }
          }
        }
      }
    },
    "bindings": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["transport", "spec"],
        "properties": {
          "transport": { "type": "string" },
          "priority":  { "type": "integer", "minimum": 0 },
          "spec":      { "type": "object" },
          "resources": { "$ref": "#/$defs/resources" }
        }
      }
    },
    "capabilities": { "$ref": "#/$defs/capabilities" },
    "governance":   { "$ref": "#/$defs/governance" },
    "observability":{ "$ref": "#/$defs/observability" },
    "tests":        { "$ref": "#/$defs/tests" }
  },

  "$defs": {
    "port": {
      "type": "object",
      "required": ["name", "type"],
      "properties": {
        "name":          { "type": "string", "pattern": "^[a-z][a-z0-9_]*$", "maxLength": 64 },
        "type":          { "enum": ["artifact", "parameter", "metric"] },
        "required":      { "type": "boolean", "default": true },
        "description":   { "type": "string" },
        "default":       {},
        "schema":        { "type": "object" },
        "value_schema":  { "type": "object" },
        "constraints":   { "type": "object" },
        "unit":          { "type": "string" },
        "artifact_kind": { "type": "string" }
      }
    },
    "errorDecl": {
      "type": "object",
      "required": ["code", "description"],
      "properties": {
        "code":        { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "resources": {
      "type": "object",
      "properties": {
        "cpu":         { "type": "number" },
        "memory_mb":   { "type": "integer" },
        "disk_mb":     { "type": "integer" },
        "gpu":         { "type": "boolean" },
        "timeout_sec": { "type": "integer" }
      }
    },
    "capabilities": {
      "type": "object",
      "properties": {
        "computes":    { "type": "array", "items": { "type": "string" } },
        "requires":    { "type": "array", "items": { "type": "string" } },
        "supported_intents": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["intent_type"],
            "properties": {
              "intent_type": { "type": "string" },
              "confidence":  { "type": "number", "minimum": 0, "maximum": 1 }
            }
          }
        },
        "composition": {
          "type": "object",
          "properties": {
            "idempotent":        { "type": "boolean" },
            "cacheable":         { "type": "boolean" },
            "cache_key_inputs":  { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    },
    "governance": {
      "type": "object",
      "properties": {
        "sandbox": {
          "type": "object",
          "properties": {
            "network":                 { "enum": ["deny", "restricted", "allow"] },
            "filesystem":              { "enum": ["sandbox", "readonly", "readwrite"] },
            "max_cpu_per_job":         { "type": "integer" },
            "max_memory_mb_per_job":   { "type": "integer" },
            "max_timeout_sec_per_job": { "type": "integer" }
          }
        },
        "quota": {
          "type": "object",
          "properties": {
            "max_concurrent_jobs": { "type": "integer" },
            "max_daily_runs":      { "type": "integer" }
          }
        },
        "data_policy": {
          "type": "object",
          "properties": {
            "retention_days":    { "type": "integer" },
            "pii_handling":      { "enum": ["none", "hashed", "encrypted"] },
            "export_restricted": { "type": "boolean" }
          }
        },
        "approval": {
          "type": "object",
          "properties": {
            "auto_approve_below_cost":  { "type": "number" },
            "require_review_above_cost":{ "type": "number" }
          }
        },
        "trust_level": {
          "enum": ["untested", "community", "tested", "verified", "certified"]
        }
      }
    },
    "observability": {
      "type": "object",
      "properties": {
        "log_level":    { "enum": ["debug", "info", "warn", "error"] },
        "emit_metrics": { "type": "boolean" },
        "emit_traces":  { "type": "boolean" }
      }
    },
    "tests": {
      "type": "object",
      "properties": {
        "sample_cases": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "inputs"],
            "properties": {
              "name":             { "type": "string" },
              "inputs":           { "type": "object" },
              "expected_outputs": { "type": "object" }
            }
          }
        }
      }
    }
  }
}
```

---

## Appendix B — Reference Binding: Docker

This appendix defines the `docker` Transport Binding in full, as the
reference illustration. Other bindings follow the same document structure
and are specified in companion files.

### B.1 Identifier

`transport: docker`

### B.2 `spec` Schema

```yaml
bindings:
  - transport: docker
    priority: 10
    spec:
      image: "registry.airaie.io/openfoam:11"   # REQUIRED — OCI image reference
      entrypoint: "/app/run.sh"                  # OPTIONAL — overrides image default
      work_dir: "/workspace"                     # OPTIONAL — default /workspace
      env:                                        # OPTIONAL
        OPENFOAM_CASE: "/workspace/inputs/case"
      volumes:                                    # OPTIONAL — additional mounts
        - { source: "named-vol", target: "/cache", read_only: true }
      labels:                                     # OPTIONAL — container labels
        app: "openfoam"
      pull_policy: "if-not-present"               # OPTIONAL — always | if-not-present | never
    resources:
      cpu: 4
      memory_mb: 4096
      timeout_sec: 3600
```

### B.3 Verb Mappings

| Verb | Docker Mapping |
|---|---|
| `describe` | Read Manifest from registry; no Docker interaction |
| `validate` | Pure JSONSchema + constraints check; no container action |
| `invoke` | Pull image (per `pull_policy`) → prepare `/in` (ro) + `/out` (rw) bind mounts → write `inputs.json` → download artifact inputs via presigned URLs → `docker create` → `docker start` → return container ID as JobHandle |
| `status` | `docker inspect {container}`; map container state → ATP state |
| `stream` | `docker logs -f --timestamps {container}`; parse into `log` events; supplementary events (progress, metric, artifact) MAY be emitted by the container via a structured side-channel (e.g., writes to `/out/events.ndjson`) |
| `cancel` | `docker stop -t 10 {container}` (SIGTERM then SIGKILL) |
| `result` | Inspect container exit code; read `/out/outputs.json` manifest (if present) or auto-discover `/out/*`; upload outputs to artifact store; return `JobResult` |

### B.4 Input Delivery Convention

At `invoke`, the runtime creates a host workspace and populates:

```
/tmp/atp-{job}/
├── inputs/
│   ├── inputs.json              ← TOP-LEVEL ARRAY of port records
│   ├── <port-name>.json         ← per-parameter value (JSON-encoded)
│   ├── <artifact-port-1>.<ext>  ← downloaded from presigned URL
│   └── <artifact-port-2>.<ext>
└── outputs/                     ← empty; tool writes here
```

Bind-mounted into the container as `/in` (read-only) and `/out` (read-write).

`inputs.json` MUST be a top-level JSON array where each element is an object
with exactly these keys:

```json
[
  { "name": "mesh_file", "value": null,          "artifact_id": "/in/mesh_file.stl" },
  { "name": "threshold", "value": 250,            "artifact_id": null              },
  { "name": "material",  "value": "Al6061-T6",    "artifact_id": null              }
]
```

- `name` — port name (REQUIRED)
- `value` — inline value for parameter/metric ports; `null` for artifact ports
- `artifact_id` — path `/in/<name>.<ext>` for artifact ports; `null` for others

The runtime MUST also write a per-key file `/in/<port-name>.json` containing
the JSON-encoded `value` for every parameter port. This enables simple shell
tools to consume inputs without parsing the array (e.g. `cat /in/threshold.json`).
Artifact ports do not get a `<name>.json` file — their payload is the actual
artifact file at `/in/<name>.<ext>`.

Environment variables injected:
- `ATP_JOB_ID`
- `ATP_INPUT_DIR=/in`
- `ATP_OUTPUT_DIR=/out`

> **v0.1 note (2026-04-24):** this convention matches the Airaie Rust runner
> (the reference runtime). Earlier drafts specified `inputs.json` as a flat
> object keyed by port name — that form is no longer accepted.

### B.5 Output Collection Convention

Upon container exit, the runtime collects outputs:

1. If `/out/outputs.json` exists, it MUST be a top-level JSON array where
   each element has the following shape:
   ```json
   [
     { "name": "result_vtk",       "file_path": "result.vtk" },
     { "name": "metrics",          "value": { "max_stress": 247.3 } },
     { "name": "pre_uploaded",     "artifact_id": "art_abc123" }
   ]
   ```
   - `name` — port name (REQUIRED, MUST match a declared output port)
   - `file_path` — path relative to `/out/` for a file artifact (OPTIONAL)
   - `value` — inline JSON value for metric/parameter ports (OPTIONAL)
   - `artifact_id` — pre-existing artifact identifier (OPTIONAL; runtime-specific)
   Exactly one of `file_path`, `value`, or `artifact_id` SHOULD be present
   per entry.
2. If `/out/outputs.json` is absent, the runtime auto-discovers all files
   in `/out/` and MUST match them to declared output ports by name (filename
   stem matches port name) or by `artifact_kind` hint.
3. Artifact outputs are uploaded to the artifact store and their URIs +
   content hashes populate `JobResult.outputs[]`.
4. Metric outputs are read inline and populate `JobResult.metrics`.

> **v0.1 note (2026-04-24):** the earlier `{"outputs": [...]}` wrapped form
> and the `path` / `inline` key names are no longer accepted. The keys are now
> `file_path` / `value` / `artifact_id`, matching the Airaie reference runtime.

### B.6 Sandbox Enforcement

| Manifest Field | Docker Flag |
|---|---|
| `sandbox.network: deny` | `--network=none` |
| `sandbox.network: restricted` | `--network=bridge` + egress firewall (runtime-enforced) |
| `sandbox.network: allow` | `--network=bridge` |
| `sandbox.filesystem: sandbox` | `--read-only` + `--tmpfs /tmp` + writable `/out` only |
| `sandbox.filesystem: readonly` | `--read-only` |
| `sandbox.filesystem: readwrite` | (default) |
| `sandbox.max_cpu_per_job` | `--cpus={value}` |
| `sandbox.max_memory_mb_per_job` | `--memory={value}m` |
| `sandbox.max_timeout_sec_per_job` | runtime-enforced via wall-clock |

Additional defaults applied by the runtime (unless explicitly relaxed):
`--no-new-privileges`, `--pids-limit=1024`, `--cap-drop=ALL`, user namespace
remapping where supported.

### B.7 Error Mapping

| Docker Outcome | ATP Error |
|---|---|
| Image pull failure | `TRANSPORT_UNAVAILABLE` |
| Container OOMKilled | `error` event `code=OOM`, state=`failed` |
| Exceeded wall-clock | state=`timeout` |
| Non-zero exit code | state=`failed`; `result.exit_code` populated |
| SIGTERM from `cancel` | state=`canceled` |

### B.8 Conformance Tests

A `docker`-binding implementation MUST pass the following tests:

1. **T-DOCKER-01** — `invoke` of a trivial `alpine:latest` tool with an echo
   entrypoint produces a `completed` terminal state and a stdout log event.
2. **T-DOCKER-02** — `cancel` of a long-running tool transitions it to
   `canceled` within 15 seconds.
3. **T-DOCKER-03** — A tool with `sandbox.network: deny` MUST NOT be able
   to reach an external endpoint.
4. **T-DOCKER-04** — An artifact input is downloaded to `/in`, readable
   by the container.
5. **T-DOCKER-05** — An artifact output in `/out` is uploaded and its
   content hash is returned in `JobResult`.
6. **T-DOCKER-06** — A tool exceeding `max_timeout_sec_per_job` transitions
   to `timeout`.
7. **T-DOCKER-07** — A tool with `pull_policy: never` fails with
   `TRANSPORT_UNAVAILABLE` when the image is absent.

---

## Appendix C — Glossary

| Term | Definition |
|---|---|
| **Artifact** | Immutable, content-addressed file payload |
| **Binding** | Short for Transport Binding |
| **Consumer** | Any caller of ATP Verbs |
| **Content Address** | Identifier derived from the cryptographic hash of content |
| **Handle** | JobHandle — opaque identifier for a specific invocation |
| **Job** | A single concrete execution of a Tool |
| **Manifest** | Structured document describing a Tool (YAML/JSON) |
| **Metric** | A structured measurement or result, passed inline |
| **Parameter** | A typed scalar or object, passed inline |
| **Port** | A named, typed input or output of a Tool |
| **Runtime** | Implementation that discovers Manifests and invokes Verbs |
| **Terminal State** | `completed`, `failed`, `canceled`, or `timeout` |
| **Tool** | A named, versioned, self-contained computational unit |
| **Trust Level** | Five-level ordered progression of Tool maturity |
| **Transport Binding** | Mapping from ATP Verbs to a concrete wire protocol |
| **Verb** | One of seven abstract operations (describe, validate, invoke, status, stream, cancel, result) |

---

## Appendix D — Prior Art and Acknowledgments

ATP is synthesized from and inspired by the following prior work:

- **OCI Image and Runtime Specs** — transport-agnostic image descriptors with pluggable runtimes.
- **Language Server Protocol (LSP)** — one JSON-RPC contract above many language implementations.
- **Model Context Protocol (MCP, Anthropic)** — LLM-to-tool bridge; ATP's `mcp` binding reuses MCP wire semantics.
- **OpenAPI** — service description format; ATP's `http` binding leverages OpenAPI where available.
- **WHATWG Fetch** — stable semantics above multiple HTTP transports (HTTP/1.1, /2, /3).
- **Common Workflow Language (CWL)** — typed tool descriptions in scientific computing.
- **Kubernetes Custom Resource Definitions (CRDs)** — declarative, extensible API objects.
- **n8n / Temporal / Dagster** — workflow systems that motivated typed port composition.
- **Airaie** — the reference implementation of ATP. The existing Airaie
  ToolContract, 9 runtime adapters, NATS event stream, trust scoring, and
  three-port data model formed the empirical basis for this specification.

The authors acknowledge that this document is a synthesis; none of the
individual ideas are novel in isolation. ATP's contribution is the
**combination**: a single typed contract + multi-binding runtime dispatch
+ content-addressed data + first-class governance metadata, specifically
targeted at the engineering, scientific, and governed-experimentation
domain.

---

## Document Status

This is a **draft** specification. Breaking changes are expected before
v1.0. Feedback and proposed amendments should be filed as issues against
the spec repository.

**Changelog**

- **v0.1 (2026-04-23)** — Initial draft. Core concepts, Manifest format,
  seven Verbs, state machine, event stream, Docker reference binding.

**Next Planned Milestones**

| Version | Target | Contents |
|---|---|---|
| v0.2 | +2 weeks | CLI and HTTP binding specifications |
| v0.3 | +4 weeks | MCP, Python, Jupyter binding specifications |
| v0.4 | +6 weeks | Hardware, human-task, workflow, native binding specs |
| v0.5 | +8 weeks | Reference SDKs (TypeScript, Python, Go) |
| v1.0 | +12 weeks | Stability declared; breaking changes require v2 |

[RFC 2119]: https://www.rfc-editor.org/rfc/rfc2119
