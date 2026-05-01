# Sample Workspace Seed — Spec for Fresh Session

**Date:** 2026-05-01
**Status:** Spec only — no code shipped yet. Hand to a fresh agent session for implementation.
**Goal:** Seed a single coherent real-use-case workspace covering all entity types (project, tools, agents, workflows, boards, cards, gates) with no mock data. Idempotent, re-runnable.

---

## 1. The use case (real, defensible)

**"Aerospace Bracket Validation"** — a structural-validation engineering project.

Real workflow (matches existing ATP tools live in dev kernel):

```
geometry  →  Gmsh Meshing  →  CalculiX Linear Static FEA  →  CalculiX FRD Result Summarizer
(.step/.geo)  (mesh.msh)      (.frd + .vtp)                  (metrics JSON: max_stress, max_displacement)
```

Why this use case:
- All four tools are **already registered + working** in the dev kernel (verified via `GET /v0/tools`)
- Real engineering: linear-static FEA on a cantilevered bracket geometry under tip load
- Outputs map cleanly to `fea_static` intent type (the renderer registry's primary FEA layout)
- Sub-second to single-digit-second runs — fast feedback loops in dev
- Frontend renderers exist for all output kinds: `vtk-polydata` for `.vtp`, `json-metrics` for `.frd` summary
- The trio's outputs feed evidence rows naturally (max_stress < limit, displacement < spec, etc.)

Optional secondary use case for the "comparison" card:
- **Bracket Geometry Sweep** — run the same workflow on three bracket variants (tapered / straight / I-beam), use a `comparison` card to show the three runs side-by-side via `<SplitRenderer axisLocked>`.

---

## 2. Entity tree to seed

```
Project (prj_default — already exists; reused)
│
├── Tools (already registered, just look up by name)
│   ├── tool_98ec0852  Gmsh Meshing
│   ├── tool_05b5ca42  CalculiX Linear Static FEA
│   └── tool_589373ae  CalculiX FRD Result Summarizer
│   (also available if needed: tool_7a5e6263 OpenFOAM Cavity CFD,
│    tool_f8e9675d Ngspice, tool_55ca3e22 Sklearn, tool_029bde9a hello)
│
├── Agent (1, real LLM-backed)
│   └── agt_bracket_advisor  v1 published
│        ├── role: "FEA validation reviewer"
│        ├── tools: [Gmsh, CalculiX, frd-summarizer]
│        └── memory + eval cases included
│
├── Workflow (1, real DSL with the 3-tool chain)
│   └── wf_bracket_fea  v1 published
│        ├── inputs: { geometry: artifact, tip_load_N: float }
│        ├── nodes: gmsh → calculix → frd-summary
│        └── outputs: { metrics, vtp, frd }
│
└── Board "Bracket Validation" (mode=explore)
    ├── Card 1: analysis — "Stress under 250N tip load"
    │     ├── card_type: 'analysis'
    │     ├── intent_type: 'fea_static'
    │     ├── intent_spec: { tip_load_N: 250, max_stress_limit_MPa: 200 }
    │     └── plan generated → run → evidence + artifacts
    ├── Card 2: comparison — "Three bracket geometries"
    │     ├── card_type: 'comparison'
    │     └── comparison_config: { card_ids: [card1, card3, card4] }
    ├── Card 3: analysis — "Tapered bracket variant"
    ├── Card 4: analysis — "I-beam bracket variant"
    ├── Card 5: gate — "Production release readiness gate"
    │     ├── card_type: 'gate'
    │     └── gate requirements: max_stress < 200MPa, displacement < 0.5mm,
    │                            safety_factor > 1.5
    └── Card 6: milestone — "v1.0 release"
          └── card_type: 'milestone'
```

---

## 3. APIs catalog (verified during audit)

### 3.1 Auth
All requests need: `X-Project-Id: prj_default` header.
Optional: `Authorization: Bearer <token>` for user attribution; pass-through if dev mode allows.

### 3.2 Tools (lookup only — already registered)
- `GET /v0/tools?limit=50` → returns 24 real tools
- Look up by name to get tool_id. Use `tool_id@latest_version` as `tool_ref`.

### 3.3 Workflows
- `POST /v0/workflows` body: `{name, description, owner}` → `{workflow: {id, ...}}`
- `POST /v0/workflows/{id}/versions` body: `{dsl_yaml: "..."}` (NOT JSON; YAML string) → `{version}`
- `POST /v0/workflows/compile` (or `POST /v0/workflows/{id}/versions/{version}/...` — verify)
- `POST /v0/workflows/{id}/versions/{version}/publish`
- `POST /v0/workflows/{id}/run` body: `{inputs: {...}}` → starts a run

**DSL shape (verified via `internal/workflow/testdata/linear.yaml`):**
```yaml
api_version: airaie.workflow/v1
kind: Workflow
metadata:
  name: bracket-fea-pipeline
  description: Gmsh → CalculiX → frd-summary
  version: 1
inputs:
  - name: geometry
    type: artifact
    description: STEP or GEO file
  - name: tip_load_N
    type: number
nodes:
  - id: mesh
    tool: tool_98ec0852@<version>   # Gmsh — verify version via GET tool
    inputs:
      geometry: $inputs.geometry
  - id: solve
    tool: tool_05b5ca42@<version>   # CalculiX
    inputs:
      mesh: $nodes.mesh.outputs.mesh
      load_N: $inputs.tip_load_N
    depends_on: [mesh]
  - id: summarize
    tool: tool_589373ae@<version>   # frd-summary
    inputs:
      frd: $nodes.solve.outputs.results_frd
    depends_on: [solve]
outputs:
  metrics: $nodes.summarize.outputs.metrics
  vtp: $nodes.solve.outputs.result_vtp
  frd: $nodes.solve.outputs.results_frd
config:
  timeout_seconds: 600
```

**OPEN — verify before writing seed:**
- Each tool's actual port names (input/output) — query `GET /v0/tools/{id}/versions/{v}` and read the contract
- The exact `tool_ref` format expected by the workflow validator (`tool_id@version` vs `tool_name@version`)

### 3.4 Agents
- `POST /v0/agents` body: `{name, description, owner}` → `{agent: {id}}`
- `POST /v0/agents/{id}/versions` body: `{spec_json: {...full agent spec...}}`
- `POST /v0/agents/{id}/versions/{v}/validate`
- `POST /v0/agents/{id}/versions/{v}/publish`

**Spec shape:** see existing `airaie-kernel/testdata/agents/agt_mesh_study.yaml` — a complete working example. Copy + retarget for `agt_bracket_advisor`.

### 3.5 Boards
- `POST /v0/boards` body: `{name, description, mode: 'explore'|'study'|'release'}` → `{board: {id}}`
- `PATCH /v0/boards/{id}` for updates
- `PATCH /v0/boards/{id}/body` for Tiptap canvas body_blocks (Phase 10 column)

### 3.6 Cards
**Endpoint surprise:** card create is BOARD-scoped, not flat:
- `POST /v0/boards/{boardId}/cards` body: `{name, card_type, ...}` → `{card: {id}}`
- `GET /v0/boards/{boardId}/cards` → list cards
- `GET /v0/boards/{boardId}/cards/ready` → cards ready for execution
- `GET /v0/boards/{boardId}/cards/graph` → dependency DAG

**OPEN — verify before writing seed:**
- Full `CreateCardRequest` body shape — read `internal/handler/card.go` + `internal/service/card.go`
- Allowed `card_type` values — likely `analysis | comparison | sweep | gate | milestone | agent` per the data model in CLAUDE.md
- How `intent_spec_id` is attached to a card (see route `POST /v0/boards/{boardId}/intents` — likely create the IntentSpec first, then update the card with the resulting intent_spec_id)

### 3.7 IntentSpecs
- `POST /v0/boards/{boardId}/intents` body: `{intent_type, intent_spec: {...}, card_id?: ...}` → `{intent: {id}}`
- `GET /v0/boards/{boardId}/intents` → list
- `GET /v0/intent-types/{slug}` → schema for an intent_type
- `GET /v0/intent-types/{slug}/inputs` → declared inputs for the type
- `GET /v0/intent-types/{slug}/pipelines` → available pipelines (e.g. `pipe_fea_standard`)

**Known intent_type slugs (verified from project memory):**
- `fea_static` — linear-static FEA. Pipeline: `pipe_fea_standard`. Use this for Cards 1/3/4.
- `cfd_analysis` — for OpenFOAM. Pipeline: `pipe_cfd_quick`.

**OPEN — verify before writing seed:**
- Run `GET /v0/intent-types/fea_static` and `GET /v0/intent-types/fea_static/inputs` to get the exact inputs shape
- Confirm `pipe_fea_standard` exists by `GET /v0/intent-types/fea_static/pipelines`

### 3.8 Cards plan + run
- `POST /v0/cards/{id}/plan/generate` → generates a plan from card's intent + pipeline
- `POST /v0/cards/{id}/plan/compile` → compiles to executable workflow
- `POST /v0/cards/{id}/plan/execute` → triggers run

This is the canonical board-card execution path — preferred over directly running the workflow when seeding cards, since it exercises the full IntentSpec → Plan → Run → Evidence → Gate chain.

### 3.9 Gates
- `POST /v0/gates` body: `{board_id, card_id, name, requirements: [...]}` → `{gate: {id}}`
- `POST /v0/gates/{id}/requirements` for adding criteria
- `POST /v0/gates/{id}/evaluate` triggers automatic evaluation
- `POST /v0/gates/{id}/approve | /reject | /waive` for manual

---

## 4. Seed script architecture

**Location:** `airaie-kernel/scripts/seed_sample_workspace.sh`
**Pattern to follow:** existing `register_test_agent.sh` (curl + python3 for JSON parsing)

**Structure (recommended):**

```bash
#!/usr/bin/env bash
# seed_sample_workspace.sh — Aerospace Bracket Validation reference workspace
# Usage: ./seed_sample_workspace.sh [BASE_URL]
set -euo pipefail
BASE="${1:-http://localhost:8080}"
API="${BASE}/v0"
PROJ="prj_default"
H=(-H "X-Project-Id: ${PROJ}" -H "Content-Type: application/json")
MANIFEST="${SCRIPT_DIR}/.seeded_workspace_ids.json"

# --- Idempotency: if manifest exists, read IDs and PATCH instead of create ---
# (write a small `lookup_or_create` helper that prefers existing entities by name)

# Phase 1: Tool lookup (no creation — they're already registered)
GMSH_ID=$(lookup_tool_by_name "Gmsh Meshing")
CCX_ID=$(lookup_tool_by_name "CalculiX Linear Static FEA")
FRD_ID=$(lookup_tool_by_name "CalculiX FRD Result Summarizer")
GMSH_V=$(latest_version_for "$GMSH_ID")
CCX_V=$(latest_version_for "$CCX_ID")
FRD_V=$(latest_version_for "$FRD_ID")

# Phase 2: Workflow
WF_ID=$(create_workflow "wf_bracket_fea" "Bracket FEA pipeline")
DSL=$(envsubst < "${SCRIPT_DIR}/seed_data/bracket_fea.dsl.yaml.tmpl")
create_workflow_version "$WF_ID" "$DSL"
publish_workflow_version "$WF_ID" 1

# Phase 3: Agent
AGENT_ID=$(create_agent "agt_bracket_advisor" "FEA validation reviewer")
SPEC=$(envsubst < "${SCRIPT_DIR}/seed_data/bracket_advisor.yaml.tmpl")
create_agent_version "$AGENT_ID" "$SPEC"
validate_agent_version "$AGENT_ID" 1
publish_agent_version "$AGENT_ID" 1

# Phase 4: Board
BOARD_ID=$(create_board "Bracket Validation" "explore")

# Phase 5: IntentSpec for fea_static
INTENT1_ID=$(create_intent_spec "$BOARD_ID" "fea_static" '{"tip_load_N":250,"max_stress_limit_MPa":200}')
# ... INTENT2, INTENT3 for the two variant cards

# Phase 6: Cards
CARD1_ID=$(create_card "$BOARD_ID" "Stress under 250N tip load" "analysis" "$INTENT1_ID")
CARD3_ID=$(create_card "$BOARD_ID" "Tapered bracket variant" "analysis" "$INTENT2_ID")
CARD4_ID=$(create_card "$BOARD_ID" "I-beam bracket variant" "analysis" "$INTENT3_ID")
CARD2_ID=$(create_comparison_card "$BOARD_ID" "Three bracket geometries" "$CARD1_ID,$CARD3_ID,$CARD4_ID")
CARD5_ID=$(create_gate_card "$BOARD_ID" "Production release readiness")
CARD6_ID=$(create_milestone_card "$BOARD_ID" "v1.0 release")

# Phase 7: Plan + execute card 1 to populate real evidence
generate_plan "$CARD1_ID"
compile_plan "$CARD1_ID"
execute_plan "$CARD1_ID"

# Phase 8: Gate setup on card 5
GATE_ID=$(create_gate "$BOARD_ID" "$CARD5_ID" "Production release")
add_gate_requirement "$GATE_ID" "max_stress_MPa" "<" 200
add_gate_requirement "$GATE_ID" "max_displacement_mm" "<" 0.5
add_gate_requirement "$GATE_ID" "safety_factor" ">" 1.5

# Phase 9: Write manifest
write_manifest > "$MANIFEST"

echo "Seeded workspace. IDs in $MANIFEST"
```

### Sidecar files needed

`airaie-kernel/scripts/seed_data/bracket_fea.dsl.yaml.tmpl` — workflow DSL with `${GMSH_ID}@${GMSH_V}` placeholders (envsubst-driven)

`airaie-kernel/scripts/seed_data/bracket_advisor.yaml.tmpl` — agent spec, copy+adapt from `airaie-kernel/testdata/agents/agt_mesh_study.yaml`

`airaie-kernel/scripts/seed_data/bracket_geometry.step` — a real STEP file for input. Generate via `gmsh -2 bracket.geo -o bracket.step`, OR use a tiny existing geometry from `atp/examples/calculix-beam/cantilever.inp` (already in the repo).

---

## 5. What the fresh session must verify before writing the seed

Run these exact curls first. Each ~1-line JSON parse. Build a small fact-sheet from them.

```bash
H='-H X-Project-Id: prj_default'

# 1. Confirm tool versions
curl -sS $H "${API}/tools?limit=50" | jq '.tools[] | select(.name|test("Gmsh|CalculiX|FRD")) | {id,name,latest_version,status}'

# 2. fea_static intent type schema
curl -sS $H "${API}/intent-types/fea_static"
curl -sS $H "${API}/intent-types/fea_static/inputs"
curl -sS $H "${API}/intent-types/fea_static/pipelines"

# 3. Card create body shape — read the source
sed -n '/CreateCardRequest/,/^}/p' airaie-kernel/internal/service/card.go | head -30
sed -n '/createCard/,/^func/p' airaie-kernel/internal/handler/card.go | head -40

# 4. IntentSpec shape (read service)
sed -n '/CreateIntentSpec/,/^func/p' airaie-kernel/internal/service/board_intent.go | head -40

# 5. Verify dev-start is healthy
curl -sf "${BASE}/v0/health"
```

After confirming these the seed script can be written end-to-end.

---

## 6. Existing code to crib from

| What | Where |
|------|-------|
| curl + python3 + auth pattern | `airaie-kernel/scripts/register_test_agent.sh` |
| Tool registration via JSON manifests | `airaie-kernel/scripts/register_mock_tools.sh` |
| Health-check + step-by-step verify | `airaie-kernel/scripts/e2e_golden_path.sh` |
| Workflow DSL syntax | `airaie-kernel/internal/workflow/testdata/linear.yaml` (single tool chain) and `complex.yaml` / `branching.yaml` (advanced patterns) |
| Agent spec_json template | `airaie-kernel/testdata/agents/agt_mesh_study.yaml` |
| ATP tool examples (real working tools) | `atp/examples/calculix-beam/`, `atp/examples/openfoam-cavity/`, `atp/examples/gmsh/` |

---

## 7. Stretch (optional, if time permits)

1. **Trigger sample runs on cards 3 + 4** so the comparison card has real artifacts to render
2. **Approve + record evidence on the gate** so the milestone card sees a green gate
3. **Set IntentSpec acceptance criteria** matching the gate requirements so the system shows alignment between intent and gate
4. **Add manual evidence rows** on card 1 to demonstrate the human-in-the-loop path
5. **Generate a board canvas body_blocks** so opening the board shows a populated Tiptap canvas (Phase 10 surface), not an auto-migrated default

---

## 8. Acceptance criteria for the fresh session

When the seed completes successfully and you re-run `/gsd:resume-work`, the following must be true:

1. ✓ `GET /v0/workflows` returns ≥ 2 (existing `wf_96267c6c` + new `wf_bracket_fea`)
2. ✓ `GET /v0/agents` returns ≥ 1 with `name=agt_bracket_advisor`, status=published
3. ✓ `GET /v0/boards` returns ≥ 1 with `name=Bracket Validation`
4. ✓ `GET /v0/boards/{id}/cards` returns 6 cards across all 4 card_types (analysis, comparison, gate, milestone)
5. ✓ Each `analysis` card has a non-null `intent_spec_id`
6. ✓ Card 1 has a successful run with at least 2 artifacts (frd + vtp) and ≥ 1 evidence row
7. ✓ Card 5 has a gate with 3 requirements
8. ✓ Frontend shows the workspace correctly: open `/boards`, see the new board; open the board, see all 6 cards; click card 1, see the renderer registry mount the FEA layout with VtpViewer + json-metrics
9. ✓ Re-running the seed script is idempotent — no duplicates, IDs preserved in manifest

---

## 9. Known caveats / gotchas to surface to the implementer

1. **The frontend dev server may have cached old code** — flake during testing. Restart `npm run dev` if symptoms drift. (See G.4.20 in PHASE_G_HARDENING_BACKLOG — production build currently fails to init separately.)
2. **Auth header is project-scoped** — `X-Project-Id` is enough in dev mode but production needs Bearer + cookie auth.
3. **Tool refs:** workflow DSL uses `tool_id@version`. Versions are SemVer strings, not integers.
4. **CalculiX timeout:** the cantilever beam is fast (<1s), but the gateway sometimes lags. Set workflow `config.timeout_seconds: 600` to be safe.
5. **`runs.view_state_json`** (just shipped in migration 033) — empty `{}` default; safe to ignore in seed but verify migration applied if seed fails on UPDATE.
6. **Don't add IntentSpec validation that requires a backend that doesn't exist** — `acceptance_criteria` are user-facing and stored as JSON; no executor parses them. The gate is what actually evaluates.
7. **`crun_*` vs `run_*`** — board-card runs use `crun_*` ids; standalone tool/workflow runs use `run_*`. The `useRunDetail` hook bug is open for `crun_*` ids per memory.

---

## 10. After the seed lands

Add a note to STATE.md:
```markdown
Sample workspace seeded: see seed_sample_workspace.sh + .seeded_workspace_ids.json.
Reference: .planning/research/sample-workspace-seed-spec-2026-05-01.md
```

And update the original spec doc (this file) with `status: implemented` and a pointer to the live IDs.

---

**End of spec. Hand to fresh session.**
