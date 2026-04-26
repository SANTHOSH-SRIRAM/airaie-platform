# 05 — Tool Author Contract

> **Purpose:** the pact between AirAIE and anyone writing a Tool. This is what we ask Tool authors to commit to so the platform's UX and governance work for them and their users.
> **Audience:** Tool authors (internal + external), maintainers reviewing Tool registrations.
> **Read after:** [`01-CORE-MODEL.md`](./01-CORE-MODEL.md). The protocol details live in [`../protocol/ATP-SPEC.md`](../protocol/ATP-SPEC.md).

---

## The pact, in one sentence

> **Your Tool serves the user's intent, not its own UI.** If you accept that, the platform makes your Tool feel like a first-class citizen — discoverable, governable, renderable, reproducible. If you don't, the platform demotes you to a fallback "download artifact" link and your users go back to running you out-of-band.

The contract has two parts:
1. **Required** — without these, the Tool registers but is barely usable inside the platform.
2. **Recommended** — without these, the Tool works but the user pays a UX tax.

If you find yourself wanting to deviate, talk to the AirAIE team. The contract is finite and deliberate; it isn't a checklist of preferences.

---

## Required

### 1. ATP manifest

Every Tool ships an [ATP](../protocol/ATP-SPEC.md) manifest declaring:

```yaml
name:        tool_calculix              # globally unique
version:     2.20                       # semver-compatible
title:       "CalculiX FEA solver"
description: "CCX implicit/explicit FE solver for static and dynamic analyses."
intent_types:                            # which IntentTypes this Tool serves
  - fea_static
  - fea_dynamic
inputs:
  - name: mesh
    kind: inp                            # CalculiX input deck
    required: true
    description: "CCX .inp file with model definition"
  - name: solver_options
    kind: json
    required: false
    schema_ref: "schemas/calculix-options-v1.json"
outputs:
  - name: results
    kind: frd
    description: "Solver result deck"
    renderer_hint: fea-frd               # registry id (see 04-RENDERER-REGISTRY)
  - name: results_preview
    kind: frd
    derived_from: results
    max_size_bytes: 5_000_000
    description: "Decimated preview for inline rendering"
  - name: metrics
    kind: json
    schema_ref: "schemas/fea-metrics-v1.json"
    renderer_hint: json-metrics
  - name: log
    kind: text
    description: "Solver stdout/stderr (always emitted)"
resources:
  cpu:        { request: 1.0, limit: 4.0 }
  memory:     { request: 512Mi, limit: 8Gi }
  wall_time:  { default: 5m, max: 1h }
governance:
  trust_level:     verified              # set by AirAIE admin, not the author
  determinism:     deterministic         # 'deterministic' | 'stochastic' | 'time-dependent'
bindings:
  - kind: docker
    image: ghcr.io/airaie/calculix:2.20
    digest: sha256:abc...                # required; pinned at compile time
    entrypoint: ["/usr/local/bin/atp-driver"]
```

A few rules:
- `name` is forever. New names create new Tools. Renames are not allowed.
- `version` is forever-immutable per `(name, version)` pair. New version = new manifest.
- `bindings.docker.digest` is required. Floating tags are rejected.

### 2. Reproducibility

A Tool must be **deterministic for a given (input artifact hashes, manifest version, configuration)**. Two runs with identical inputs must produce identical metric values within declared tolerance.

If the Tool is intrinsically stochastic (e.g., Monte Carlo sampler, an LLM with `temperature > 0`), declare `governance.determinism = stochastic` and accept a `seed` input port. The platform passes the same seed for repro runs — and the run remains repro-checkable when seeds match.

If the Tool's results depend on wall-clock or external state (e.g., "fetch current weather"), declare `time-dependent`. Such Tools cannot satisfy a `reproducibility` Gate and are restricted in Study/Release mode.

**The bar for Verified+ trust:** all runs since promotion must be repro-checkable. One non-deterministic Verified Tool failing repro is grounds for demotion.

### 3. Metrics emission (NDJSON event stream)

Anything you want the platform to evaluate as Evidence MUST be emitted as a metric event on stdout (one JSON object per line, ATP "event" envelope):

```jsonl
{"event":"metric","key":"lift_coefficient","value":1.28,"unit":"dimensionless"}
{"event":"metric","key":"drag_coefficient","value":0.041,"unit":"dimensionless"}
{"event":"metric","key":"run_converged","value":true}
{"event":"metric","key":"max_displacement_m","value":6.36e-6,"unit":"m"}
{"event":"progress","step":"solver","percent":47,"iter":234,"residual":1.2e-5}
{"event":"log","level":"info","msg":"Mesh assembled: 36 nodes, 8 hex elements"}
```

Rules:
- One JSON object per line. No multi-line JSON. Lines that don't parse are logged but ignored.
- `key` is what the IntentSpec acceptance criteria match against. Pick stable, schema-aligned keys.
- `value` is the only field the Gate evaluator looks at; `unit` is metadata for display.
- A metric printed once is canonical; subsequent prints with the same key overwrite (last-wins).

**What is NOT evidence:** stdout text, log files, screenshots, free-form prints. The platform will not parse "Lift coefficient = 1.28" out of stdout.

### 4. Output port honesty

Every output declared in the manifest MUST be produced on success. Conversely, every Artifact written MUST correspond to a declared output.

The runner enforces this: extra files in the output directory are rejected; missing required outputs fail the Run. This makes Workflow compilation static — the compiler knows ahead of time which Artifacts each NodeRun will produce, and edges between nodes are wired ahead of execution.

### 5. Resource declarations

`resources.cpu.limit` and `resources.memory.limit` are **enforced** by the runner via cgroup limits. Exceeding causes the Run to fail with a typed error, not a silent OOM kill.

Authors should declare honest defaults — overstating limits causes the scheduler to reserve more capacity than needed; understating causes spurious failures.

---

## Recommended

These aren't required for registration, but Tools that follow them are dramatically nicer to use.

### A. Renderer hints

Set `outputs[].renderer_hint` to a registry id (see [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md)). The Tool author knows their output kind better than a heuristic. Without a hint, the registry walks fallbacks; with a hint, the right renderer mounts directly.

### B. Preview emission for large outputs

If your Tool produces multi-megabyte fields, decks, or tables, also emit a **preview** version sized for inline rendering:

```yaml
outputs:
  - name: pressure_field
    kind: vtu
    description: "Full-resolution pressure field (~200 MB)"
  - name: pressure_field_preview
    kind: vtu
    derived_from: pressure_field
    max_size_bytes: 5_000_000
    description: "Decimated preview, 5% of points"
    renderer_hint: cfd-vtu
```

The renderer loads the preview by default; the user clicks "Load full" only when they need it.

### C. CAD format pairs

CAD tools that emit STEP/IGES MUST also emit a browser-renderable companion (GLTF preferred):

```yaml
outputs:
  - name: geometry
    kind: step
    description: "Canonical CAD format for downstream tools"
  - name: geometry_gltf
    kind: gltf
    derived_from: geometry
    description: "Browser-renderable companion"
    renderer_hint: cad-3d
```

A 10-line OpenCASCADE conversion in the Tool's container is dramatically cheaper than maintaining a server-side conversion service.

### D. Structured metrics file

In addition to NDJSON metric events, write a final `metrics.json` Artifact summarizing all key results:

```json
{
  "schema": "fea-metrics-v1",
  "max_von_mises_pa": 18780,
  "max_displacement_m": 6.36e-6,
  "n_elements": 8,
  "n_nodes": 36,
  "solver_wall_seconds": 0.121,
  "convergence": {
    "converged": true,
    "iterations": 12,
    "final_residual": 1.2e-9
  }
}
```

The platform renders this with `json-metrics` (a clean key-value card). Users get a structured summary even if they ignore the full result deck.

### E. Default `view_state.json`

For renderers that have visual state (camera, color scale, slice planes), emit a starting view-state Artifact:

```json
{
  "renderer": "fea-frd",
  "camera":   { "pos": [0.5, 0.5, 0.5], "target": [0, 0, 0], "up": [0, 0, 1] },
  "scalar":   { "field": "displacement", "scale": "auto", "deformation_factor": 100 }
}
```

The renderer initializes from this. In Release mode, the QA approver's view becomes locked.

### F. Human-readable summary

Emit a `summary.md` Artifact with a short Markdown narrative:

```markdown
# Run summary

The CCX solver completed a static analysis of the cantilever beam in 121 ms.
Max von Mises stress is 18.78 kPa at node 1 (root); max displacement is 6.36 µm
at node 36 (tip). All convergence criteria met.
```

Reviewers and Release Packet readers see this inline. It saves the Card author from writing the same thing in Notes.

### G. Schema-pinned input/output

Reference JSON schemas for inputs/outputs (`schema_ref` in the manifest). The Workflow compiler validates port-to-port compatibility statically; the runner validates at the boundary; the Card UI generates input forms from the schema.

---

## Trust progression

A Tool earns trust by being used and not failing. The progression:

1. **Registration → `untested`.** Default. Can be invoked in Explore mode.
2. **`tested` (auto-promote).** After ≥ 10 successful runs and trust score ≥ 0.70 (Bayesian, `(succ+5)/(total+10)`), the registry promotes automatically.
3. **`verified` (manual promote).** AirAIE admin signs off after a manual review covering: deterministic re-runs, manifest accuracy, schema correctness, security review of the container.
4. **`certified` (manual promote).** Used in production with a formal certification — usually involving an external auditor or the customer's compliance team. Rare.

**Demotion happens.** A Verified Tool that fails repro on a Release-mode Card gets demoted automatically (with audit emission). The trust *level* is human-set; the trust *score* is mechanical and visible alongside the level.

The Mode minimums:

| Mode    | Tool trust ≥        |
|---------|---------------------|
| Explore | `untested`          |
| Study   | `tested`            |
| Release | `verified`          |

Workflow compile fails if a node references a tool below the minimum. The user sees the offending node and can swap it for an alternative or escalate the Tool's trust.

---

## Anti-patterns

What to NOT do:

- **Floating Docker tags.** `latest`, `v2`, `stable`. Always pin to a digest.
- **Print metrics to stdout as text.** Use NDJSON metric events. The platform will not parse "Result: 1.28" out of free text.
- **Emit Artifacts not declared in the manifest.** The runner discards them.
- **Read environment variables for secrets.** Use the [Secrets](../protocol/ATP-SPEC.md#secrets) port; the runner injects them at the boundary.
- **Mutate inputs in place.** All input directories are read-only-mounted. Write under `/out`.
- **Open network connections without declaring them** in `bindings.docker.network`. Default is no network. Tools that need network state declare it explicitly.
- **Embed UI** (e.g., a small HTTP server with a custom dashboard). The platform owns the UI. Your Tool emits Artifacts; the platform renders them.

---

## Validation flow

When a Tool is registered (or a new version uploaded):

1. **Manifest schema check** — syntactic, against ATP schema.
2. **Image pull check** — runner attempts `docker pull <image>@<digest>`.
3. **Smoke run** — the runner executes the Tool with a `--smoke-test` flag (Tool authors implement this), expects a known set of metric events.
4. **Schema validation** — declared `schema_ref` documents resolve and parse.
5. **Determinism probe** (Verified+) — two smoke runs, byte-identical output OR identical metric set.

If any step fails, registration is rejected with a typed error. The author fixes and retries.

---

## A minimal working example

```yaml
name:        hello_world
version:     0.1.0
title:       "ATP hello-world"
description: "Smallest possible ATP tool — emits a metric and a text artifact."
intent_types: [hello]
inputs:
  - name: name
    kind: text
    required: true
outputs:
  - name: greeting
    kind: text
    renderer_hint: fallback
  - name: metrics
    kind: json
    renderer_hint: json-metrics
governance:
  trust_level:  untested
  determinism:  deterministic
bindings:
  - kind: docker
    image: ghcr.io/airaie/atp-hello:0.1
    digest: sha256:1f4e...
```

The container reads `/in/name`, writes `/out/greeting` and `/out/metrics.json`, and emits one NDJSON metric event. ~30 lines of Python. That's the floor.

---

## Cross-references

- Protocol details (port types, transports, event envelope) → [`../protocol/ATP-SPEC.md`](../protocol/ATP-SPEC.md)
- How emitted Artifacts get rendered → [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md)
- How emitted metrics become Evidence → [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md) §"Evidence — the four kinds"
- The Run / NodeRun model → [`01-CORE-MODEL.md`](./01-CORE-MODEL.md)
