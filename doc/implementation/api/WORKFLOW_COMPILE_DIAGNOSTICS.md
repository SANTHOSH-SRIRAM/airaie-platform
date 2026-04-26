# Workflow Compile / Validate Diagnostics

This file documents the wire format for diagnostics returned by the workflow
compile and validate endpoints. The format is consumed by the frontend
WorkflowEditor to render inline per-node errors.

If `WORKFLOW_DSL.md` (B1) lands later, this content should be folded into a
`## Compile / Validate Diagnostics` section there and this file deleted.

## Endpoints

| Method | Path                       | Purpose                                                |
| ------ | -------------------------- | ------------------------------------------------------ |
| POST   | `/v0/workflows/compile`    | Compile a stored workflow version into an executable AST |
| POST   | `/v0/workflows/validate`   | Validate raw DSL YAML without persisting                |
| POST   | `/v0/workflows/plan`       | Return the execution plan (DAG) for a compiled version  |

## Diagnostic envelope

Every error and warning emitted by compile / validate carries the same shape:

```json
{
  "node_id":    "step1",
  "field_path": "inputs.mesh_density",
  "message":    "type mismatch: port expects integer, got string",
  "severity":   "error"
}
```

| Field        | Type                  | Notes                                                                                       |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------- |
| `node_id`    | string, optional      | Workflow DAG node the diagnostic attaches to. Omitted for top-level / structural errors.    |
| `field_path` | string, optional      | Dotted path inside the node payload (e.g. `tool`, `inputs.mesh_density`, `depends_on[0]`).  |
| `message`    | string                | Human-readable diagnostic text.                                                             |
| `severity`   | `"error" \| "warning"` | Errors fail compile; warnings are advisory.                                                |

Backwards-compatible legacy fields (`field`, `type`, `line`) are still emitted
when available — clients should prefer `node_id` + `field_path`.

## Compile response

```json
{
  "success": true,
  "ast_json": { /* full WorkflowAST when success=true */ },
  "errors": [],
  "warnings": [
    { "node_id": "step2", "field_path": "inputs.x", "message": "...", "severity": "warning" }
  ]
}
```

On failure:

```json
{
  "success": false,
  "errors": [
    { "node_id": "step1", "field_path": "tool", "message": "tool not found: foo", "severity": "error" }
  ]
}
```

## Validate response

```json
{
  "valid": false,
  "errors": [
    { "node_id": "step2", "field_path": "depends_on", "message": "cycle detected: [step1 step2]", "severity": "error" }
  ],
  "warnings": [
    { "node_id": "step3", "field_path": "depends_on", "message": "implicit dependency on step2", "severity": "warning" }
  ]
}
```

`errors` and `warnings` are always present (possibly empty arrays).

## When `node_id` is omitted

Top-level / structural failures have no node context. Examples:

- Missing or wrong `api_version`, `kind`, `metadata.name`, `metadata.version`.
- YAML parse failures.
- Empty `nodes` list.
- Unused workflow inputs (`field_path = "inputs.<name>"`, no `node_id`).

## Diagnostic origin map (for backend maintainers)

| Source                                      | NodeID populated? | FieldPath                        |
| ------------------------------------------- | ----------------- | -------------------------------- |
| YAML parse error (`parser.Parse`)           | No                | empty                            |
| Missing `api_version`/`kind`/`metadata.*`   | No                | `api_version`, `kind`, ...       |
| Empty `nodes` list                          | No                | empty                            |
| Per-node id / tool / agent validation       | Yes               | `id`, `tool`, `agent`            |
| `depends_on` self-reference / empty entry   | Yes               | `depends_on[<i>]`                |
| Variable resolution (`$inputs`, `$nodes`)   | Yes               | `inputs.<port>`                  |
| Output reference resolution                 | No                | `outputs.<name>`                 |
| Condition (`when`) parse                    | Yes               | `when`                           |
| Cycle detection                             | First node in cycle | empty                          |
| Reference to unknown node in `depends_on`   | Yes               | `depends_on`                     |
| Tool not found / not published              | Yes               | `tool`                           |
| Type mismatch on edge                       | Target node       | `inputs.<port>`                  |
| Missing required input port                 | Yes               | `inputs.<port>`                  |
| Lint: unused required input                 | No                | `inputs.<name>`                  |
| Lint: implicit `depends_on`                 | Yes               | `depends_on`                     |
| Lint: unreachable node                      | Yes               | empty                            |
