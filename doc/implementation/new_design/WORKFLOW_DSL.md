# Workflow DSL — Canonical Schema

> **This document is the single source of truth for the Workflow DSL** that
> the AirAIE Platform v2 frontend reads/writes from `WorkflowVersion.dsl_json`.
> When the schema and any other artifact disagree (TypeScript types, kernel
> Go structs, sample workflows), this doc wins.

## Purpose

The Workflow DSL is the on-disk format of an authored workflow. It is:

- **Persisted** by the kernel as a base64-encoded JSON blob in the
  `workflow_versions.dsl_json` column (see `airaie-kernel/internal/model/model.go`
  — `WorkflowVersion`).
- **Edited** by the AirAIE frontend Workflow Editor through the
  `@xyflow/react` (ReactFlow) canvas.
- **Compiled** by the kernel parser/compiler (`airaie-kernel/internal/workflow/`)
  into the runtime `WorkflowAST` consumed by the dispatcher.

The frontend never edits the AST or the YAML form directly — it round-trips
through the JSON DSL via the converter at
`frontend/src/utils/workflowDsl.ts`.

## Top-level shape

```jsonc
{
  "kind": "workflow",          // reserved; must be "workflow" today
  "version": 1,                 // schema version; bump on incompatible changes
  "metadata": { "name": "demo", "description": "..." },
  "config":   { "parallelism": 4, "timeout_seconds": 1800 },
  "nodes":    [ /* WorkflowDslNode[] */ ],
  "edges":    [ /* WorkflowDslEdge[] (optional; back-filled from depends_on) */ ]
}
```

`metadata` and `config` are pass-through bags. Today the kernel reads a
narrow set of keys (see `WorkflowMetadata`, `WorkflowConfig` in
`airaie-kernel/internal/workflow/types.go`); the frontend preserves
unknown keys for forward compatibility.

## Node-type reference

The frontend recognises **seven** node kinds. The first six map 1:1 to
the registry in
`frontend/src/components/workflows/nodes/index.ts` (`nodeTypes`).
`stickyNote` is a comment-only node — it has no inputs and no edges and
the kernel ignores it.

The kernel today only models `tool` and `agent` natively (see
`NodeType` in `airaie-kernel/internal/workflow/types.go:38–41`). The
remaining frontend-only kinds (`trigger`, `gate`, `logic`, `data`,
`stickyNote`) are persisted in the DSL and round-trip through edits;
the compiler treats them as scaffolding until backend support lands.

### Common fields (every node)

| Field            | Type                       | Required | Notes                                                                    |
| ---------------- | -------------------------- | -------- | ------------------------------------------------------------------------ |
| `id`             | `string`                   | yes      | Stable across edits.                                                     |
| `type`           | `WorkflowDslNodeType`      | yes      | One of `trigger`, `tool`, `agent`, `gate`, `logic`, `data`, `stickyNote`. |
| `subtype`        | `string`                   | no       | Catalogue entry (e.g. `fea-solver`). Drives icon/colour.                 |
| `label`          | `string`                   | no       | Display name; auto-derived from `id` when omitted.                       |
| `position`       | `{x: number, y: number}`   | no       | Auto-laid-out by depth when absent.                                      |
| `inputs`         | `Record<string, unknown>`  | no       | Free-form config + expressions (see [Expressions](#expression-syntax)).  |
| `version`        | `string`                   | no       | Display badge (e.g. `v1.0`).                                             |
| `status`         | `idle | running | completed | failed` | no | Runtime overlay; cleared on save.                              |
| `resourceLimits` | `{cpu, memoryMb, timeoutSeconds}` | no | Used by the dispatcher when present.                                  |
| `retryPolicy`    | `{maxRetries, waitBetweenSeconds}` | no | "" |
| `metadata`       | `Record<string, unknown>`  | no       | UI metadata (createdAt, lastRunAt, avgCostUsd, ...).                     |
| `depends_on`     | `string[]`                 | no       | **Deprecated, kept for backward compatibility.** See [Migration](#migration-note). |

### `trigger`

Workflow entry point. Source-only (no inbound edges).

```jsonc
{
  "id": "start",
  "type": "trigger",
  "subtype": "webhook",        // webhook | schedule | event-listener | manual
  "inputs": { "endpoint": "/validate" }   // or { "cron": "0 * * * *" }, etc.
}
```

ReactFlow `data`: `{ label, subtype, nodeType: "trigger", inputs }`.

### `tool`

Container-tool invocation. Compiled by the kernel into an
`ASTNode { node_type: "tool", tool_ref }` (see
`airaie-kernel/internal/workflow/types.go:113–131`).

```jsonc
{
  "id": "solve",
  "type": "tool",
  "subtype": "fea-solver",
  "tool": "fea-solver@2.1.0",   // tool_id@version, parsed by EffectiveRef
  "inputs": { "mesh_file": "{{ $('mesh').json.output_path }}" },
  "timeout": 600,                // seconds, per-node
  "depends_on": ["mesh"]          // back-compat only when no `edges` array
}
```

ReactFlow `data` extends the common shape with `tool` and `timeout`.

### `agent`

Agent run (plan -> approve -> execute). Maps to
`ASTNode { node_type: "agent", agent_ref }`.

```jsonc
{
  "id": "optimize",
  "type": "agent",
  "subtype": "ai-optimizer",
  "agent": "ai-optimizer@1.0",
  "inputs": { "goal": "minimize mass", "constraints": "stress < 200 MPa" }
}
```

The agent node ships four sub-port handles in the canvas (`ai_model`,
`ai_tool`, `ai_policy`, `ai_memory`); these are encoded into edges via
the standard handle format `mode/type/index` (see
`frontend/src/utils/handleFormat.ts`).

### `gate`

Governance checkpoint (approval-gate, evidence-gate, ...). Frontend-only
today; the kernel will surface gates as approval steps when the
governance backend lands.

```jsonc
{
  "id": "approve",
  "type": "gate",
  "subtype": "approval-gate",
  "inputs": { "approvers": "lead-engineer", "criteria": "stress_max < 200" }
}
```

### `logic`

Control-flow node: `condition` (if/else) or `loop`.

```jsonc
{
  "id": "branch",
  "type": "logic",
  "subtype": "condition",
  "inputs": { "expression": "{{ $('solve').json.stress_max }} < 200" }
}
```

The condition variant exposes two output handles (`outputs/main/0` =
true, `outputs/main/1` = false). The `loop` variant accepts
`maxIterations`.

### `data`

Data movement: `artifact-store` (store/retrieve), `transform` (script),
`upload` (file upload — no inputs, source-only).

```jsonc
{
  "id": "store",
  "type": "data",
  "subtype": "artifact-store",
  "inputs": { "operation": "store", "output_format": "VTK" }
}
```

### `stickyNote`

Author-only annotation. Carries `text`, `width`, `height`. The kernel
ignores stickyNotes entirely.

```jsonc
{
  "id": "note_1",
  "type": "stickyNote",
  "position": { "x": 600, "y": 50 },
  "width": 220,
  "height": 140,
  "text": "TODO: revisit boundary conditions"
}
```

## Edge shape

```jsonc
{
  "id": "e-mesh-solve",
  "source": "mesh",
  "target": "solve",
  "sourceHandle": "outputs/main/0",   // optional; n8n-inspired handle format
  "targetHandle": "inputs/main/0",
  "data": { /* free-form, e.g. label or condition */ }
}
```

The handle format is `mode/type/index`, encoded by
`encodeHandle(mode, type, index)` in
`frontend/src/utils/handleFormat.ts`. The kernel does not consume
handles today — they exist purely for the canvas — but they round-trip
losslessly through the DSL.

## Expression syntax

Inputs may reference outputs of upstream nodes or workflow inputs by
embedding expressions as **plain strings** inside the `inputs` map.
The frontend never parses or rewrites them; the kernel's expression
evaluator resolves them at run time.

| Syntax                              | Meaning                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `{{ $('NodeName').json.field }}`    | n8n-style reference to a previous node's output JSON.  |
| `$inputs.x`                         | Reference to a top-level workflow input.               |
| literal value (number/string/bool/array/object) | passed through verbatim.                  |

Example:

```jsonc
"inputs": {
  "mesh_file":   "{{ $('mesh').json.output_path }}",
  "threshold":   "$inputs.stress_threshold",
  "extra_flags": ["--verbose", "--seed=42"]
}
```

The converter stores these as raw strings (or arrays/objects) and never
escapes or interprets them.

## Storage

The DSL is persisted as **base64-encoded JSON** in
`workflow_versions.dsl_json`. The frontend round-trips through:

```
DSL JSON -> JSON.stringify -> UTF-8 -> btoa  -> dsl_json  (storage)
dsl_json -> atob -> JSON.parse                              (load)
```

`encodeDsl` / `decodeDsl` in `frontend/src/utils/workflowDsl.ts`
implement this. `decodeDsl` returns `null` for empty / malformed input
rather than throwing, so editor loaders can fall back to an empty
graph.

## Migration note

Historical workflows persisted only `nodes[]` with `depends_on` and no
explicit `edges` array (see `RawDslNode` in
`frontend/src/api/workflows.ts:40–46` and the legacy `dslToSteps`
algorithm at `frontend/src/api/workflows.ts:74–124`).

The converter back-fills edges from `depends_on` when `edges` is absent
or empty:

```text
nodes[].depends_on = [parent]   --derive-->   { id: "e-parent-child", source: parent, target: child }
```

Save-on-edit emits the **explicit edges form** and stops re-emitting
`depends_on`, so the migration is opt-in and irreversible per workflow:
a workflow stays in legacy form until its first edit through the v2
editor. Both forms are decodable indefinitely.

## Versioning policy

- `version` is an integer.
- Today: **`version: 1`**.
- Bump only on **incompatible** changes (renamed required fields,
  removed node types, changed semantics). Adding optional fields does
  not bump the version.
- `decodeDsl` accepts any `version` and lets `dslToFlow` / the kernel
  reject unsupported values explicitly. There is no implicit migration.

## Round-trip guarantees

`flowToDsl(dslToFlow(dsl))` is **lossless** when:

- Every node has an explicit `position`, **or** the caller treats
  auto-layout as authoritative on first save.
- Edges are explicit (`dsl.edges` present and non-empty), **or** the
  caller accepts that the first round-trip materialises edges and drops
  `depends_on`.

For a graph that was authored in the v2 editor and saved once, every
subsequent round-trip is bit-exact modulo `kind`/`version` defaults.
