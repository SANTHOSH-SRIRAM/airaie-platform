# PHASE 4: BOARD GOVERNANCE LAYER -- Sprint Documents

> Phase 4 builds the governance system that tracks validation evidence and enforces gates.
> Boards tie everything together: intent -> execution -> evidence -> release.
> Start Date: ~2026-05-12 (after Phases 2+3 complete)
> Duration: 12-18 days (5 sprints)

---

## Phase Overview

```
PHASE 4 SPRINT MAP:

  Sprint 4.1: IntentSpec & IntentType Registry     (2-3 days)
  Sprint 4.2: Cards, Dependencies & State Machine   (3-4 days)
  Sprint 4.3: Plan Generation & Execution            (3-4 days)
  Sprint 4.4: Evidence Collection & Gates            (3-4 days)
  Sprint 4.5: Release Packet & Board Context         (2-3 days)

DEPENDENCY CHAIN:

  4.1 IntentSpec ──> 4.2 Cards ──> 4.3 Plans ──> 4.4 Evidence ──> 4.5 Release
       │                  │              │               │               │
       │ IntentSpec        │ Card state   │ ExecutionPlan  │ CardEvidence  │ Release packet
       │ lifecycle         │ machine      │ generation     │ + gates       │ + board context
       │ IntentType        │ DAG deps     │ compilation    │ + readiness   │ + scheduler chain
       │ registry          │ 6 types      │ preflight      │ + mode        │
       │ AcceptCriteria    │              │ execution      │               │
       ▼                   ▼              ▼                ▼               ▼

PREREQUISITES (from earlier phases):
  - Phase 1: Tool execution pipeline (register -> run -> artifacts)
  - Phase 2: Workflow engine (compile -> schedule -> execute -> stream)
  - Phase 3: Agent intelligence (score -> propose -> execute -> learn)
```

---

# ============================================================
# SPRINT 4.1: IntentSpec & IntentType Registry
# ============================================================

**Sprint Number:** 4.1
**Title:** IntentSpec & IntentType Registry
**Duration:** 2-3 days (~2026-05-12 to 2026-05-14)
**Goal:** Implement the intent system that drives board card execution -- the foundational contract between user intent and system execution.

---

## Section 1: Objectives & Scope

### Primary Objectives
1. Verify and harden IntentSpec full lifecycle: `draft -> locked (immutable) -> active -> completed/failed`
2. Verify IntentType hierarchical registry with domain classification (`sim.fea`, `cad.dfm`, `nde.srb`, etc.)
3. Implement and verify AcceptanceCriterion evaluation for all 8 operators
4. Wire frontend IntentSpec editor into card detail panel
5. Wire IntentType hierarchical browser to backend

### Scope Boundaries
- **In scope:** IntentSpec CRUD, versioning, locking, status transitions, IntentType query, criterion evaluation
- **Out of scope:** Plan generation (Sprint 4.3), Card state machine (Sprint 4.2), Evidence collection (Sprint 4.4)

### Success Metrics
- IntentSpec can be created, updated, locked, activated, and completed/failed
- Locked IntentSpecs are provably immutable (all mutation attempts rejected)
- IntentTypes are queryable by hierarchy prefix (`sim/*`, `cad/*`, etc.)
- All 8 criterion operators evaluate correctly with margin calculation
- Frontend editor produces valid IntentSpec payloads

---

## Section 2: User Stories & Requirements

### US-4.1.1: IntentSpec CRUD & Lifecycle
**As a** board contributor,
**I want to** create an IntentSpec with a goal, inputs, constraints, and acceptance criteria,
**So that** the system knows exactly what I want to validate and how success is measured.

**Details:**
- Create IntentSpec with: `goal` (text), `inputs[]` (IntentInput), `constraints` (map), `acceptance_criteria[]` (AcceptanceCriterion), `preferences`, `governance`, `context`
- Each edit increments `version` (optimistic concurrency)
- Lock transition: `draft -> locked` -- sets `locked_at` timestamp, makes version immutable
- Activate transition: `locked -> active` -- plan generation has started
- Complete/fail transition: `active -> completed` or `active -> failed`
- After lock: any PATCH to goal, inputs, constraints, or acceptance_criteria returns `409 Conflict`

### US-4.1.2: IntentType Registry
**As a** board contributor,
**I want to** browse and select intent types from a hierarchical registry,
**So that** the system can match my intent to compatible pipelines and tools.

**Details:**
- IntentTypes organized hierarchically by domain:
  - `sim/` -- Simulation: `sim.fea`, `sim.cfd`, `sim.thermal`
  - `cad/` -- CAD: `cad.geometry_check`, `cad.dfm_analysis`
  - `nde/` -- Non-Destructive Evaluation: `nde.thickness_estimation`, `nde.defect_detection`, `nde.srb_image_from_duplex`
  - `research/` -- Research: `research.doe_study`, `research.hypothesis_test`
  - `ml/` -- Machine Learning: `ml.training`, `ml.inference`
- Each IntentType maps to: compatible Pipelines, expected KPI metrics, default acceptance criteria templates, domain-specific constraints schema
- Query by prefix: `GET /v0/intent-types?prefix=sim` returns all simulation types

### US-4.1.3: AcceptanceCriterion Evaluation
**As the** system (evidence collector),
**I want to** evaluate a metric value against an acceptance criterion,
**So that** I can determine pass/fail/warning/info for each KPI.

**Details:**
- 8 operators with evaluation logic:
  - `lt`: `metric_value < threshold` -- pass if strictly less than
  - `lte`: `metric_value <= threshold` -- pass if less than or equal
  - `gt`: `metric_value > threshold` -- pass if strictly greater than
  - `gte`: `metric_value >= threshold` -- pass if greater than or equal
  - `eq`: `metric_value == threshold` -- pass if exactly equal (with float epsilon)
  - `neq`: `metric_value != threshold` -- pass if not equal
  - `in`: `metric_value IN threshold_list` -- pass if value is in the provided set
  - `between`: `threshold[0] <= metric_value <= threshold[1]` -- pass if within range (inclusive)
- Each evaluation returns: `{ evaluation: "pass"|"fail"|"warning"|"info", passed: bool, margin: float }`
- Margin calculation: distance from threshold (e.g., metric=187.3, threshold=250, operator=lt -> margin=62.7 MPa)
- Warning: when margin is within tolerance (e.g., within 10% of threshold)

### US-4.1.4: Frontend IntentSpec Editor
**As a** board contributor,
**I want to** edit an IntentSpec visually within the card detail panel,
**So that** I can define goals, inputs, constraints, and acceptance criteria without writing JSON.

**Details:**
- Goal: rich textarea with character count
- Inputs: picker with artifact browser, type selector (`artifact:step`, `json:material`, `scalar:float`)
- Constraints: key-value editor with domain-specific templates
- Acceptance criteria: table with columns (metric, operator dropdown, threshold, unit, weight slider 0-1.0)
- Preferences: priority radio (accuracy/speed/cost), max_time, max_cost
- Governance: risk_policy dropdown, requires_approval toggle, approval_roles multi-select
- Lock button: confirms immutability, shows warning dialog

### US-4.1.5: Frontend IntentType Selector
**As a** board contributor,
**I want to** browse intent types in a hierarchical tree,
**So that** I can select the right type and see what pipelines and inputs it requires.

**Details:**
- Tree view: expandable domain categories (sim/, cad/, nde/, research/, ml/)
- Leaf nodes: individual intent types with description
- On select: show required inputs, available pipelines (with trust level), default acceptance criteria template
- Search/filter: type-ahead search across all intent types

---

## Section 3: Architecture & Technical Design

### Data Models

```
IntentSpec {
  id:                  uuid (PK)
  board_id:            uuid (FK -> boards.id)
  card_id:             uuid (FK -> cards.id, nullable)
  intent_type:         string          // "sim.fea", "cad.dfm", etc.
  version:             int             // auto-incremented on edit
  goal:                text            // human-readable objective
  inputs:              JSONB           // IntentInput[]
  constraints:         JSONB           // domain-specific key-value
  acceptance_criteria: JSONB           // AcceptanceCriterion[]
  preferences:         JSONB           // { priority, max_time, max_cost }
  governance:          JSONB           // { risk_policy, requires_approval, approval_roles, ... }
  context:             JSONB           // { project_id, workspace, units_system }
  status:              string          // draft | locked | active | completed | failed
  locked_at:           timestamp       // set on lock transition
  created_at:          timestamp
  updated_at:          timestamp
}

IntentType {
  id:                  string (PK)     // "sim.fea"
  domain:              string          // "sim"
  name:                string          // "Finite Element Analysis"
  description:         text
  input_requirements:  JSONB           // required input types/formats
  kpi_metrics:         JSONB           // expected metric keys
  criteria_templates:  JSONB           // default AcceptanceCriterion[]
  constraint_schema:   JSONB           // JSONSchema for constraints
  compatible_pipelines: uuid[]         // Pipeline IDs ranked by trust
}

AcceptanceCriterion {
  id:        uuid
  metric:    string      // "max_stress", "safety_factor"
  operator:  string      // lt|lte|gt|gte|eq|neq|in|between
  threshold: any         // number, list, or [min, max] range
  unit:      string      // "MPa", "cycles", "mm"
  weight:    float       // 0.0-1.0, relative importance
}
```

### Status Transition Rules

```
INTENTSPEC STATUS MACHINE:

  draft ---------> locked       Lock transition (POST /v0/cards/{id}/lock-intent)
                                Preconditions:
                                  - goal is non-empty
                                  - at least 1 acceptance criterion defined
                                  - intent_type is valid (exists in registry)
                                Side effects:
                                  - Sets locked_at = now()
                                  - Freezes version number
                                  - All future PATCH to content fields returns 409

  locked --------> active       Activated by plan generation (Sprint 4.3)
                                Preconditions:
                                  - ExecutionPlan created for this IntentSpec
                                Side effects:
                                  - Plan execution can begin

  active --------> completed    All acceptance criteria met
                                Preconditions:
                                  - All CardEvidence evaluations are "pass"
                                Side effects:
                                  - Card status -> completed

  active --------> failed       Execution error or criteria not met
                                Preconditions:
                                  - Run failed OR any criterion "fail"
                                Side effects:
                                  - Card status -> failed
                                  - Can unlock for revision (new version)

  IMMUTABILITY ENFORCEMENT:
    After status = "locked", the following fields are READ-ONLY:
      goal, inputs, constraints, acceptance_criteria, preferences, governance
    The following fields CAN still change:
      status (by state machine), card_id (assignment)
```

### AcceptanceCriterion Evaluation Algorithm

```go
// EvaluateCriterion evaluates a metric value against a criterion.
// Returns evaluation result with margin.
func EvaluateCriterion(criterion AcceptanceCriterion, metricValue interface{}) CriterionResult {
    switch criterion.Operator {
    case "lt":
        // metric_value < threshold
        passed := toFloat(metricValue) < toFloat(criterion.Threshold)
        margin := toFloat(criterion.Threshold) - toFloat(metricValue)
        return result(passed, margin, criterion)

    case "lte":
        // metric_value <= threshold
        passed := toFloat(metricValue) <= toFloat(criterion.Threshold)
        margin := toFloat(criterion.Threshold) - toFloat(metricValue)
        return result(passed, margin, criterion)

    case "gt":
        // metric_value > threshold
        passed := toFloat(metricValue) > toFloat(criterion.Threshold)
        margin := toFloat(metricValue) - toFloat(criterion.Threshold)
        return result(passed, margin, criterion)

    case "gte":
        // metric_value >= threshold
        passed := toFloat(metricValue) >= toFloat(criterion.Threshold)
        margin := toFloat(metricValue) - toFloat(criterion.Threshold)
        return result(passed, margin, criterion)

    case "eq":
        // metric_value == threshold (with float epsilon 1e-9)
        diff := math.Abs(toFloat(metricValue) - toFloat(criterion.Threshold))
        passed := diff < 1e-9
        margin := diff
        return result(passed, margin, criterion)

    case "neq":
        // metric_value != threshold
        diff := math.Abs(toFloat(metricValue) - toFloat(criterion.Threshold))
        passed := diff >= 1e-9
        margin := diff
        return result(passed, margin, criterion)

    case "in":
        // metric_value IN threshold_list
        list := toList(criterion.Threshold)
        passed := contains(list, metricValue)
        margin := 0 // not applicable for set membership
        return result(passed, margin, criterion)

    case "between":
        // threshold[0] <= metric_value <= threshold[1]
        bounds := toBounds(criterion.Threshold) // [min, max]
        val := toFloat(metricValue)
        passed := val >= bounds[0] && val <= bounds[1]
        marginLow := val - bounds[0]
        marginHigh := bounds[1] - val
        margin := math.Min(marginLow, marginHigh) // distance to nearest bound
        return result(passed, margin, criterion)
    }
}

// result constructs a CriterionResult with warning detection.
// Warning: metric passed but margin is within 10% of threshold.
func result(passed bool, margin float64, criterion AcceptanceCriterion) CriterionResult {
    evaluation := "fail"
    if passed {
        evaluation = "pass"
        // Check if borderline (within 10% of threshold)
        threshold := toFloat(criterion.Threshold)
        if threshold != 0 && math.Abs(margin/threshold) < 0.10 {
            evaluation = "warning" // passed but borderline
        }
    }
    return CriterionResult{
        Evaluation: evaluation,
        Passed:     passed,
        Margin:     margin,
    }
}
```

### API Design

```
EXISTING APIs (verify & harden):

  POST   /v0/intent-specs                    Create IntentSpec
    Body: { board_id, intent_type, goal, inputs, constraints, acceptance_criteria, ... }
    Returns: 201 + IntentSpec with status="draft", version=1

  GET    /v0/intent-specs/{id}               Get IntentSpec
    Returns: 200 + full IntentSpec

  PATCH  /v0/intent-specs/{id}               Update IntentSpec (draft only)
    Body: { goal?, inputs?, constraints?, acceptance_criteria?, ... }
    Returns: 200 + updated IntentSpec (version incremented)
    Error: 409 if status != "draft"

  POST   /v0/cards/{id}/lock-intent          Lock IntentSpec (draft -> locked)
    Preconditions: goal non-empty, >= 1 criterion, intent_type valid
    Returns: 200 + locked IntentSpec with locked_at
    Error: 409 if already locked

  GET    /v0/intent-types                    List intent types
    Query: ?prefix=sim (optional hierarchy filter)
    Returns: 200 + IntentType[]

  GET    /v0/intent-types/{id}               Get intent type details
    Returns: 200 + IntentType with compatible_pipelines, templates

  POST   /v0/intent-specs/{id}/evaluate      Evaluate criteria (testing)
    Body: { metrics: { "max_stress": 187.3, "safety_factor": 1.34 } }
    Returns: 200 + CriterionResult[] per acceptance_criteria
```

---

## Section 4: Backend Tasks

| # | Task | File | What Exists | What to Do | Complexity | Est. |
|---|------|------|-------------|------------|------------|------|
| B1 | Verify IntentSpec CRUD lifecycle | `internal/service/intent.go` | Intent service with CRUD methods | Test full lifecycle: create -> update (version increments) -> lock (immutability enforced) -> activate -> complete/fail. Verify: PATCH after lock returns 409, version is frozen at lock, locked_at is set. Add validation: goal non-empty, at least 1 criterion, intent_type exists in registry. | M | 4h |
| B2 | Verify IntentType registry | `internal/service/intent.go` or `internal/service/intent_type.go` | Intent type definitions exist | Test: list all types, filter by prefix (`sim/*`, `cad/*`), get single type with full details (input_requirements, kpi_metrics, criteria_templates, constraint_schema, compatible_pipelines). Verify hierarchical query returns correct subtree. Seed registry with all known types: sim.fea, sim.cfd, sim.thermal, cad.geometry_check, cad.dfm_analysis, nde.thickness_estimation, nde.defect_detection, nde.srb_image_from_duplex, research.doe_study, research.hypothesis_test, ml.training, ml.inference. | M | 4h |
| B3 | AcceptanceCriterion evaluation | `internal/service/intent.go` | Criteria model exists | Implement EvaluateCriterion function for all 8 operators (lt, lte, gt, gte, eq, neq, in, between). Return evaluation (pass/fail/warning/info) with margin and passed boolean. Warning detection: when margin is within 10% of threshold. Unit tests for each operator including edge cases (zero threshold, negative values, float precision for eq/neq, empty list for `in`, inverted bounds for `between`). | M | 4h |
| B4 | IntentSpec immutability enforcement | `internal/service/intent.go` | Lock mechanism exists | Harden: ensure ALL content fields are rejected on PATCH when status != "draft". Fields to protect: goal, inputs, constraints, acceptance_criteria, preferences, governance. Fields allowed to change post-lock: status (via state machine only), card_id (assignment). Add integration test: create -> lock -> attempt PATCH -> verify 409. | S | 2h |

---

## Section 5: Frontend Tasks

| # | Task | File | What to Do | Complexity | Est. |
|---|------|------|------------|------------|------|
| F1 | IntentSpec editor in card detail | Board Studio components (`src/components/board/IntentSpecEditor.tsx` or similar) | Wire existing partial editor: goal textarea (with char count), inputs picker (artifact browser + type selector with options: artifact:step, json:material, scalar:float, artifact:stl, artifact:vtk), constraints key-value editor (load domain template on IntentType select), acceptance criteria table (columns: metric text input, operator dropdown [lt/lte/gt/gte/eq/neq/in/between], threshold number input, unit text input, weight slider 0.0-1.0). Add preferences section: priority radio group (accuracy/speed/cost), optional max_time and max_cost. Add governance section: risk_policy dropdown (standard/high_risk/critical), requires_approval toggle, approval_roles multi-select. Lock button with confirmation dialog ("This IntentSpec will become immutable. Proceed?"). Visual status indicator: draft (blue), locked (amber lock icon), active (green pulse), completed (green check), failed (red x). | L | 6h |
| F2 | IntentType selector | Board Studio components (`src/components/board/IntentTypeSelector.tsx` or similar) | Wire to backend: hierarchical tree view with expandable domain categories (sim/, cad/, nde/, research/, ml/). Each leaf node shows: type name, description, badge for number of compatible pipelines. On select: populate right panel with required inputs, available pipelines (sorted by trust_level with badge: certified/verified/tested/community/untested), default acceptance criteria template (auto-fill criteria table). Type-ahead search with fuzzy matching across all intent types. Integrate into IntentSpec editor -- selecting IntentType auto-fills intent_type field and loads template. | M | 4h |

---

## Section 6: API Contracts

### POST /v0/intent-specs -- Create IntentSpec
```json
// Request
{
  "board_id": "uuid",
  "card_id": "uuid (optional)",
  "intent_type": "sim.fea",
  "goal": "Validate structural stress under 500N axial load",
  "inputs": [
    { "name": "geometry", "type": "artifact:step", "artifact_ref": "art_cad_001", "description": "CAD geometry" },
    { "name": "material", "type": "json:material", "description": "Material properties" }
  ],
  "constraints": {
    "load": 500,
    "unit": "N",
    "direction": "axial"
  },
  "acceptance_criteria": [
    { "metric": "max_stress", "operator": "lt", "threshold": 250, "unit": "MPa", "weight": 0.5 },
    { "metric": "safety_factor", "operator": "gt", "threshold": 1.2, "unit": "", "weight": 0.3 },
    { "metric": "convergence", "operator": "lt", "threshold": 50, "unit": "iterations", "weight": 0.2 }
  ],
  "preferences": { "priority": "accuracy", "max_time": "30m", "max_cost": 10.0 },
  "governance": {
    "risk_policy": "standard",
    "requires_approval": false,
    "approval_roles": [],
    "release_target": "manufacturing",
    "compliance_standards": ["ISO 12345"]
  },
  "context": { "project_id": "uuid", "workspace": "default", "units_system": "SI" }
}

// Response 201
{
  "id": "uuid",
  "board_id": "uuid",
  "card_id": null,
  "intent_type": "sim.fea",
  "version": 1,
  "goal": "Validate structural stress under 500N axial load",
  "inputs": [...],
  "constraints": {...},
  "acceptance_criteria": [...],
  "preferences": {...},
  "governance": {...},
  "context": {...},
  "status": "draft",
  "locked_at": null,
  "created_at": "2026-05-12T10:00:00Z",
  "updated_at": "2026-05-12T10:00:00Z"
}
```

### POST /v0/cards/{id}/lock-intent -- Lock IntentSpec
```json
// Response 200
{
  "id": "uuid",
  "version": 3,
  "status": "locked",
  "locked_at": "2026-05-12T14:30:00Z",
  "goal": "...",
  "inputs": [...],
  "constraints": {...},
  "acceptance_criteria": [...]
}

// Error 409 (already locked or content incomplete)
{
  "error": "intent_spec_already_locked",
  "message": "IntentSpec is locked at version 3 and cannot be modified"
}

// Error 422 (validation failure)
{
  "error": "intent_spec_incomplete",
  "message": "Cannot lock: goal is empty",
  "details": { "missing_fields": ["goal"] }
}
```

### GET /v0/intent-types?prefix=sim -- List IntentTypes
```json
// Response 200
{
  "intent_types": [
    {
      "id": "sim.fea",
      "domain": "sim",
      "name": "Finite Element Analysis",
      "description": "Structural simulation using finite element method",
      "input_requirements": [
        { "name": "geometry", "type": "artifact:step|artifact:stl", "required": true },
        { "name": "material", "type": "json:material", "required": true },
        { "name": "loads", "type": "json:load_case", "required": true }
      ],
      "kpi_metrics": ["max_stress", "safety_factor", "convergence", "max_displacement"],
      "criteria_templates": [
        { "metric": "max_stress", "operator": "lt", "threshold": null, "unit": "MPa", "weight": 0.5 },
        { "metric": "safety_factor", "operator": "gt", "threshold": null, "unit": "", "weight": 0.3 }
      ],
      "compatible_pipeline_count": 3
    },
    {
      "id": "sim.cfd",
      "domain": "sim",
      "name": "Computational Fluid Dynamics",
      "description": "Fluid flow and thermal simulation",
      "input_requirements": [...],
      "kpi_metrics": ["max_temp", "pressure_drop", "flow_rate"],
      "criteria_templates": [...],
      "compatible_pipeline_count": 2
    },
    {
      "id": "sim.thermal",
      "domain": "sim",
      "name": "Thermal Analysis",
      "description": "Heat transfer and thermal stress analysis",
      "input_requirements": [...],
      "kpi_metrics": ["max_temp", "thermal_gradient", "heat_flux"],
      "criteria_templates": [...],
      "compatible_pipeline_count": 1
    }
  ],
  "total": 3
}
```

### POST /v0/intent-specs/{id}/evaluate -- Evaluate Criteria
```json
// Request
{
  "metrics": {
    "max_stress": 187.3,
    "safety_factor": 1.34,
    "convergence": 8
  }
}

// Response 200
{
  "results": [
    {
      "criterion_id": "uuid",
      "metric": "max_stress",
      "operator": "lt",
      "threshold": 250,
      "metric_value": 187.3,
      "evaluation": "pass",
      "passed": true,
      "margin": 62.7,
      "unit": "MPa",
      "borderline": false
    },
    {
      "criterion_id": "uuid",
      "metric": "safety_factor",
      "operator": "gt",
      "threshold": 1.2,
      "metric_value": 1.34,
      "evaluation": "pass",
      "passed": true,
      "margin": 0.14,
      "unit": "",
      "borderline": true
    },
    {
      "criterion_id": "uuid",
      "metric": "convergence",
      "operator": "lt",
      "threshold": 50,
      "metric_value": 8,
      "evaluation": "pass",
      "passed": true,
      "margin": 42,
      "unit": "iterations",
      "borderline": false
    }
  ],
  "overall_passed": true,
  "composite_score": 0.95
}
```

---

## Section 7: Data Models & Migrations

### Existing Tables (verify schema)
```sql
-- intent_specs table (exists -- verify all columns present)
CREATE TABLE intent_specs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    card_id         UUID REFERENCES cards(id) ON DELETE SET NULL,
    intent_type     VARCHAR(100) NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    goal            TEXT NOT NULL DEFAULT '',
    inputs          JSONB NOT NULL DEFAULT '[]',
    constraints     JSONB NOT NULL DEFAULT '{}',
    acceptance_criteria JSONB NOT NULL DEFAULT '[]',
    preferences     JSONB NOT NULL DEFAULT '{}',
    governance      JSONB NOT NULL DEFAULT '{}',
    context         JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'locked', 'active', 'completed', 'failed')),
    locked_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intent_specs_board ON intent_specs(board_id);
CREATE INDEX idx_intent_specs_card ON intent_specs(card_id);
CREATE INDEX idx_intent_specs_type ON intent_specs(intent_type);
CREATE INDEX idx_intent_specs_status ON intent_specs(status);

-- intent_types table (may need seeding)
CREATE TABLE intent_types (
    id                  VARCHAR(100) PRIMARY KEY,
    domain              VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    input_requirements  JSONB NOT NULL DEFAULT '[]',
    kpi_metrics         JSONB NOT NULL DEFAULT '[]',
    criteria_templates  JSONB NOT NULL DEFAULT '[]',
    constraint_schema   JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intent_types_domain ON intent_types(domain);
```

### Seed Data
```sql
-- Seed IntentType registry
INSERT INTO intent_types (id, domain, name, description, input_requirements, kpi_metrics, criteria_templates) VALUES
('sim.fea', 'sim', 'Finite Element Analysis', 'Structural simulation using finite element method',
 '[{"name":"geometry","type":"artifact:step","required":true},{"name":"material","type":"json:material","required":true},{"name":"loads","type":"json:load_case","required":true}]',
 '["max_stress","safety_factor","convergence","max_displacement"]',
 '[{"metric":"max_stress","operator":"lt","threshold":null,"unit":"MPa","weight":0.5},{"metric":"safety_factor","operator":"gt","threshold":null,"unit":"","weight":0.3}]'),

('sim.cfd', 'sim', 'Computational Fluid Dynamics', 'Fluid flow and thermal simulation',
 '[{"name":"geometry","type":"artifact:step","required":true},{"name":"boundary_conditions","type":"json:bc","required":true}]',
 '["max_temp","pressure_drop","flow_rate","max_velocity"]',
 '[{"metric":"max_temp","operator":"lt","threshold":null,"unit":"C","weight":0.5}]'),

('sim.thermal', 'sim', 'Thermal Analysis', 'Heat transfer and thermal stress analysis',
 '[{"name":"geometry","type":"artifact:step","required":true},{"name":"thermal_loads","type":"json:thermal","required":true}]',
 '["max_temp","thermal_gradient","heat_flux"]',
 '[{"metric":"max_temp","operator":"lt","threshold":null,"unit":"C","weight":0.5}]'),

('cad.geometry_check', 'cad', 'Geometry Validation', 'Validate CAD geometry integrity and quality',
 '[{"name":"geometry","type":"artifact:step","required":true}]',
 '["watertight","manifold","min_thickness","surface_quality"]',
 '[{"metric":"watertight","operator":"eq","threshold":true,"unit":"","weight":0.5}]'),

('cad.dfm_analysis', 'cad', 'Design for Manufacturing', 'Manufacturability analysis',
 '[{"name":"geometry","type":"artifact:step","required":true},{"name":"process","type":"json:mfg_process","required":true}]',
 '["min_wall_thickness","draft_angle","undercuts","tooling_access"]',
 '[{"metric":"min_wall_thickness","operator":"gte","threshold":null,"unit":"mm","weight":0.4}]'),

('nde.thickness_estimation', 'nde', 'Wall Thickness Measurement', 'Ultrasonic wall thickness estimation',
 '[{"name":"scan_data","type":"artifact:nde_scan","required":true}]',
 '["min_thickness","max_thickness","avg_thickness","std_deviation"]',
 '[{"metric":"min_thickness","operator":"gte","threshold":null,"unit":"mm","weight":0.6}]'),

('nde.defect_detection', 'nde', 'Defect Identification', 'Automated defect detection from NDE data',
 '[{"name":"scan_data","type":"artifact:nde_scan","required":true}]',
 '["defect_count","max_defect_size","defect_density"]',
 '[{"metric":"defect_count","operator":"lte","threshold":null,"unit":"count","weight":0.5}]'),

('nde.srb_image_from_duplex', 'nde', 'SRB Image Processing', 'SRB image reconstruction from duplex scans',
 '[{"name":"duplex_data","type":"artifact:duplex","required":true}]',
 '["resolution","snr","contrast_ratio"]',
 '[{"metric":"snr","operator":"gt","threshold":null,"unit":"dB","weight":0.5}]'),

('research.doe_study', 'research', 'Design of Experiments', 'Systematic parameter exploration',
 '[{"name":"design_space","type":"json:doe","required":true}]',
 '["r_squared","p_value","effect_size","confidence_interval"]',
 '[{"metric":"r_squared","operator":"gt","threshold":null,"unit":"","weight":0.4}]'),

('research.hypothesis_test', 'research', 'Hypothesis Testing', 'Statistical hypothesis validation',
 '[{"name":"dataset","type":"artifact:csv","required":true},{"name":"hypothesis","type":"json:hypothesis","required":true}]',
 '["p_value","test_statistic","effect_size","sample_size"]',
 '[{"metric":"p_value","operator":"lt","threshold":0.05,"unit":"","weight":0.5}]'),

('ml.training', 'ml', 'Model Training', 'Machine learning model training',
 '[{"name":"dataset","type":"artifact:csv","required":true},{"name":"config","type":"json:ml_config","required":true}]',
 '["accuracy","precision","recall","f1_score","training_loss"]',
 '[{"metric":"accuracy","operator":"gt","threshold":null,"unit":"","weight":0.4}]'),

('ml.inference', 'ml', 'Model Inference', 'Machine learning model inference',
 '[{"name":"model","type":"artifact:model","required":true},{"name":"input_data","type":"artifact:csv","required":true}]',
 '["latency_ms","throughput","accuracy"]',
 '[{"metric":"latency_ms","operator":"lt","threshold":null,"unit":"ms","weight":0.3}]');
```

---

## Section 8: NATS Subjects & Events

No new NATS subjects in Sprint 4.1. IntentSpec lifecycle events are tracked via the audit_events table:

| Event | Trigger | Payload |
|-------|---------|---------|
| `intent_spec.created` | POST /v0/intent-specs | `{ intent_spec_id, board_id, intent_type, version }` |
| `intent_spec.updated` | PATCH /v0/intent-specs/{id} | `{ intent_spec_id, board_id, version_old, version_new, changed_fields[] }` |
| `intent_spec.locked` | POST /v0/cards/{id}/lock-intent | `{ intent_spec_id, board_id, card_id, version, locked_at }` |
| `intent_spec.activated` | Plan generation starts (Sprint 4.3) | `{ intent_spec_id, execution_plan_id }` |
| `intent_spec.completed` | Evidence collection passes all criteria (Sprint 4.4) | `{ intent_spec_id, card_id }` |
| `intent_spec.failed` | Run fails or criteria not met (Sprint 4.4) | `{ intent_spec_id, card_id, reason }` |

---

## Section 9: Testing Strategy

### Unit Tests
| Test | Description | File |
|------|-------------|------|
| TestIntentSpecCreate | Create with valid payload, verify defaults (version=1, status=draft) | `intent_test.go` |
| TestIntentSpecUpdate | Update draft, verify version increments | `intent_test.go` |
| TestIntentSpecLock | Lock draft, verify locked_at set, status=locked | `intent_test.go` |
| TestIntentSpecLock_Incomplete | Lock without goal -> error 422 | `intent_test.go` |
| TestIntentSpecLock_AlreadyLocked | Lock a locked spec -> error 409 | `intent_test.go` |
| TestIntentSpecImmutability | PATCH locked spec -> error 409 for all content fields | `intent_test.go` |
| TestIntentSpecActivate | Transition locked -> active | `intent_test.go` |
| TestIntentSpecComplete | Transition active -> completed | `intent_test.go` |
| TestIntentSpecFail | Transition active -> failed | `intent_test.go` |
| TestIntentSpecInvalidTransition | draft -> active (skip locked) -> error | `intent_test.go` |
| TestCriterionEvaluate_Lt | 187.3 lt 250 -> pass, margin=62.7 | `criterion_test.go` |
| TestCriterionEvaluate_Lte | 250 lte 250 -> pass, margin=0 | `criterion_test.go` |
| TestCriterionEvaluate_Gt | 1.34 gt 1.2 -> pass, margin=0.14 | `criterion_test.go` |
| TestCriterionEvaluate_Gte | 1.2 gte 1.2 -> pass, margin=0 | `criterion_test.go` |
| TestCriterionEvaluate_Eq | 250.0 eq 250.0 -> pass (epsilon) | `criterion_test.go` |
| TestCriterionEvaluate_Neq | 187.3 neq 250 -> pass | `criterion_test.go` |
| TestCriterionEvaluate_In | "Al6061" in ["Al6061","Ti64"] -> pass | `criterion_test.go` |
| TestCriterionEvaluate_Between | 187.3 between [100,300] -> pass | `criterion_test.go` |
| TestCriterionEvaluate_Borderline | 230 lt 250 -> warning (within 10%) | `criterion_test.go` |
| TestCriterionEvaluate_Fail | 300 lt 250 -> fail | `criterion_test.go` |
| TestIntentTypeListAll | List all intent types, verify count | `intent_type_test.go` |
| TestIntentTypeFilterByPrefix | prefix=sim -> sim.fea, sim.cfd, sim.thermal | `intent_type_test.go` |
| TestIntentTypeGetDetails | Get sim.fea -> verify input_requirements, kpi_metrics | `intent_type_test.go` |

### Integration Tests
| Test | Description |
|------|-------------|
| TestIntentSpecE2E | Create board -> create IntentSpec -> update -> lock -> verify immutability -> assign to card |
| TestIntentTypeResolution | Create IntentSpec with sim.fea -> query intent type -> verify compatible pipelines |
| TestCriterionEvaluationE2E | Create IntentSpec with criteria -> send metrics -> verify results with margins |

---

## Section 10: Acceptance Criteria

- [ ] IntentSpecs created with goal, inputs, constraints, acceptance criteria, preferences, governance, context
- [ ] IntentSpec lifecycle enforced: `draft -> locked (immutable) -> active -> completed/failed`
- [ ] Locked IntentSpecs reject all content mutations (409 Conflict)
- [ ] `locked_at` timestamp set on lock transition
- [ ] Version increments on every update, frozen after lock
- [ ] IntentTypes queryable by hierarchy prefix (`sim/*`, `cad/*`, `nde/*`, etc.)
- [ ] IntentType detail includes input_requirements, kpi_metrics, criteria_templates, constraint_schema
- [ ] All 8 operators evaluate correctly: lt, lte, gt, gte, eq, neq, in, between
- [ ] Evaluation returns: evaluation (pass/fail/warning/info), passed boolean, margin
- [ ] Borderline detection: warning when metric passes but margin < 10% of threshold
- [ ] Frontend IntentSpec editor renders all fields with correct input types
- [ ] Frontend IntentType selector shows hierarchical tree with search
- [ ] IntentType selection auto-populates acceptance criteria template

---

## Section 11: Dependencies & Risks

### Dependencies
| Dependency | Source | Impact if Missing |
|------------|--------|-------------------|
| Boards CRUD | Existing board service | Cannot create IntentSpecs without boards -- must exist |
| Cards table | Existing card model | card_id FK on IntentSpec -- must exist (nullable OK) |
| Pipeline registry | Existing pipeline service | IntentType.compatible_pipelines lookup -- degrade gracefully |
| Artifact service | Phase 1 | IntentSpec.inputs.artifact_ref resolution -- degrade gracefully |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| IntentType seed data incomplete | Low | Medium | Seed all 12 known types; add extensibility for user-defined types later |
| AcceptanceCriterion float precision | Medium | Low | Use epsilon comparison (1e-9) for eq/neq; document float behavior |
| Frontend editor complexity | Medium | Medium | Build incrementally: goal+criteria first, then inputs+constraints, then governance |

---

## Section 12: Definition of Done

- [ ] All backend unit tests pass (22+ tests)
- [ ] All integration tests pass (3 tests)
- [ ] IntentSpec full lifecycle verified with immutability enforcement
- [ ] IntentType registry seeded with 12 types across 5 domains
- [ ] AcceptanceCriterion evaluation works for all 8 operators with edge cases
- [ ] Frontend IntentSpec editor wired to backend with real data
- [ ] Frontend IntentType selector renders hierarchical tree
- [ ] API contracts documented and verified
- [ ] Audit events emitted for all IntentSpec state transitions
- [ ] Code reviewed and merged to main

---

# ============================================================
# SPRINT 4.2: Cards, Dependencies & State Machine
# ============================================================

**Sprint Number:** 4.2
**Title:** Cards, Dependencies & State Machine
**Duration:** 3-4 days (~2026-05-14 to 2026-05-17)
**Goal:** Implement the rich card system with 6 types, 8-status state machine, and dependency DAG with topological ordering and blocked state propagation.

---

## Section 1: Objectives & Scope

### Primary Objectives
1. Verify and harden the card 8-state machine with all valid/invalid transitions
2. Implement and verify card dependency DAG with cycle detection and topological sort
3. Verify all 6 card types with their type-specific behavior
4. Wire frontend card grid with real status badges and dependency arrows
5. Wire frontend card detail page with IntentSpec display, KPIs, and execution state

### Scope Boundaries
- **In scope:** Card CRUD, state machine enforcement, dependency DAG, 6 card types, blocked propagation
- **Out of scope:** Plan generation (Sprint 4.3), Evidence collection (Sprint 4.4), Gate evaluation (Sprint 4.4)
- **Depends on:** Sprint 4.1 (IntentSpec linked to each card)

### Success Metrics
- All 8 statuses and valid transitions enforced; invalid transitions rejected with descriptive errors
- Cycle detection prevents circular dependencies
- Topological sort produces valid execution ordering
- Blocked status propagates correctly when dependency incomplete
- All 6 card types render with distinct icons and behavior

---

## Section 2: User Stories & Requirements

### US-4.2.1: Card 8-State Machine
**As the** system,
**I want to** enforce a strict state machine for card status transitions,
**So that** cards follow a predictable lifecycle from draft to completion.

**Details -- All Valid Transitions:**
```
  draft ---------> ready          IntentSpec locked, configuration complete
  draft ---------> blocked        Dependency not met (computed)
  draft ---------> skipped        User or system skips

  ready ---------> queued         Plan generated, waiting for execution
  ready ---------> blocked        Dependency became unavailable
  ready ---------> skipped        User or system skips

  queued --------> running        Execution started
  queued --------> blocked        Resource unavailable
  queued --------> skipped        User or system skips

  running -------> completed      All acceptance criteria met
  running -------> failed         Execution error or criteria not met
  running -------> blocked        External dependency failed mid-run
  running -------> skipped        User aborts

  failed --------> ready          Retry (re-enter plan generation)
  failed --------> skipped        User decides not to retry

  completed -----> skipped        Override (rare, user decision)
```

**Invalid transitions (must be rejected):**
- draft -> running (cannot skip ready/queued)
- draft -> completed (cannot skip execution)
- ready -> running (must go through queued)
- ready -> completed (must execute first)
- queued -> completed (must run first)
- completed -> draft (no backward)
- completed -> ready (no backward)
- completed -> failed (final state, except -> skipped)
- skipped -> any (terminal state)

### US-4.2.2: Card Dependency DAG
**As a** board contributor,
**I want to** define dependencies between cards,
**So that** cards execute in the correct order and block when upstream cards are incomplete.

**Details:**
- `depends_on: card_id[]` defines upstream dependencies
- Cycle detection: adding a dependency that creates a cycle returns 409
- Topological sort: cards sorted for execution based on dependency edges
- Blocked propagation: when a dependency is incomplete, downstream card status -> `blocked`
- Unblocked propagation: when dependency completes, downstream card re-evaluates -> may transition to `ready`
- DAG visualization: frontend renders cards with directional arrows showing dependencies

### US-4.2.3: 6 Card Types
**As a** board contributor,
**I want to** create different types of validation cards,
**So that** each card type has appropriate behavior and visual treatment.

**Details -- 6 Card Types:**
| Type | Description | Special Behavior | Icon |
|------|-------------|------------------|------|
| `analysis` | Standard validation activity (FEA, CFD) | Standard plan generation -> workflow execution | Beaker/flask |
| `comparison` | Compare two or more results | Multiple IntentSpecs or input sets, comparison metrics | Balance scale |
| `sweep` | Parameter sweep / DOE | Generates multiple runs with varied parameters | Grid/matrix |
| `agent` | Autonomous agent task | Uses AgentRuntime instead of direct workflow; references agent_id + agent_version | Brain |
| `gate` | Governance checkpoint card | No execution plan; evaluates gate requirements directly | Shield/lock |
| `milestone` | Tracking milestone | No execution; marks a project milestone when all depends_on complete | Flag |

### US-4.2.4: Frontend Card Grid
**As a** board contributor,
**I want to** see all cards in a grid layout with status badges and dependency arrows,
**So that** I can quickly understand the board's validation state.

### US-4.2.5: Frontend Card Detail Page
**As a** board contributor,
**I want to** see full card details including IntentSpec, KPIs, linked runs, and evidence,
**So that** I can understand the card's execution history and current state.

---

## Section 3: Architecture & Technical Design

### Card State Machine Implementation

```go
// ValidTransitions defines the state machine for card status.
var ValidTransitions = map[string][]string{
    "draft":     {"ready", "blocked", "skipped"},
    "ready":     {"queued", "blocked", "skipped"},
    "queued":    {"running", "blocked", "skipped"},
    "running":   {"completed", "failed", "blocked", "skipped"},
    "failed":    {"ready", "skipped"},
    "completed": {"skipped"},
    "blocked":   {"ready", "draft", "skipped"}, // unblock restores previous valid state
    "skipped":   {},                             // terminal state
}

// TransitionCard validates and performs a card status transition.
func (s *CardService) TransitionCard(ctx context.Context, cardID uuid.UUID, newStatus string) error {
    card, err := s.store.GetCard(ctx, cardID)
    if err != nil {
        return err
    }

    allowed := ValidTransitions[card.Status]
    if !contains(allowed, newStatus) {
        return fmt.Errorf("invalid transition: %s -> %s (allowed: %v)", card.Status, newStatus, allowed)
    }

    // Additional transition preconditions
    switch newStatus {
    case "ready":
        // IntentSpec must be locked (except for gate/milestone types)
        if card.CardType != "gate" && card.CardType != "milestone" {
            if err := s.verifyIntentSpecLocked(ctx, card); err != nil {
                return err
            }
        }
        // All dependencies must be completed
        if err := s.verifyDependenciesMet(ctx, card); err != nil {
            return err
        }
    case "queued":
        // ExecutionPlan must exist (except gate/milestone)
        if card.CardType != "gate" && card.CardType != "milestone" {
            if card.ExecutionPlanID == nil {
                return fmt.Errorf("no execution plan for card %s", cardID)
            }
        }
    }

    return s.store.UpdateCardStatus(ctx, cardID, newStatus)
}
```

### Dependency DAG with Cycle Detection

```go
// AddDependency adds a dependency edge and checks for cycles.
func (s *CardService) AddDependency(ctx context.Context, cardID, dependsOnID uuid.UUID) error {
    // Prevent self-dependency
    if cardID == dependsOnID {
        return fmt.Errorf("card cannot depend on itself")
    }

    // Check both cards exist and are on the same board
    card, _ := s.store.GetCard(ctx, cardID)
    dep, _ := s.store.GetCard(ctx, dependsOnID)
    if card.BoardID != dep.BoardID {
        return fmt.Errorf("cards must be on the same board")
    }

    // Build adjacency list and check for cycles using DFS
    allCards, _ := s.store.ListCardsByBoard(ctx, card.BoardID)
    graph := buildAdjacencyList(allCards)

    // Tentatively add the new edge
    graph[dependsOnID] = append(graph[dependsOnID], cardID)

    if hasCycle(graph) {
        return fmt.Errorf("adding dependency %s -> %s would create a cycle", dependsOnID, cardID)
    }

    return s.store.AddCardDependency(ctx, cardID, dependsOnID)
}

// TopologicalSort returns cards in execution order.
func (s *CardService) TopologicalSort(ctx context.Context, boardID uuid.UUID) ([]Card, error) {
    cards, _ := s.store.ListCardsByBoard(ctx, boardID)
    // Kahn's algorithm for topological sort
    inDegree := map[uuid.UUID]int{}
    adj := map[uuid.UUID][]uuid.UUID{}

    for _, c := range cards {
        inDegree[c.ID] = len(c.DependsOn)
        for _, depID := range c.DependsOn {
            adj[depID] = append(adj[depID], c.ID)
        }
    }

    queue := []uuid.UUID{}
    for _, c := range cards {
        if inDegree[c.ID] == 0 {
            queue = append(queue, c.ID)
        }
    }

    sorted := []Card{}
    for len(queue) > 0 {
        current := queue[0]
        queue = queue[1:]
        sorted = append(sorted, cardMap[current])
        for _, neighbor := range adj[current] {
            inDegree[neighbor]--
            if inDegree[neighbor] == 0 {
                queue = append(queue, neighbor)
            }
        }
    }

    if len(sorted) != len(cards) {
        return nil, fmt.Errorf("cycle detected in card dependency graph")
    }
    return sorted, nil
}
```

### Blocked State Propagation

```go
// PropagateBlockedState checks dependencies and updates blocked status.
func (s *CardService) PropagateBlockedState(ctx context.Context, boardID uuid.UUID) error {
    cards, _ := s.store.ListCardsByBoard(ctx, boardID)
    cardMap := toMap(cards)

    for _, card := range cards {
        if card.Status == "skipped" || card.Status == "completed" {
            continue // terminal or done, no change
        }
        for _, depID := range card.DependsOn {
            dep := cardMap[depID]
            if dep.Status != "completed" && dep.Status != "skipped" {
                // Dependency not met
                if card.Status != "blocked" {
                    s.store.UpdateCardStatus(ctx, card.ID, "blocked")
                }
                break
            }
        }
        // Check if all deps now complete -> unblock
        allMet := true
        for _, depID := range card.DependsOn {
            dep := cardMap[depID]
            if dep.Status != "completed" {
                allMet = false
                break
            }
        }
        if allMet && card.Status == "blocked" {
            // Restore to draft or ready based on IntentSpec status
            if card.IntentSpecID != nil {
                spec, _ := s.intentService.Get(ctx, *card.IntentSpecID)
                if spec.Status == "locked" {
                    s.store.UpdateCardStatus(ctx, card.ID, "ready")
                } else {
                    s.store.UpdateCardStatus(ctx, card.ID, "draft")
                }
            } else {
                s.store.UpdateCardStatus(ctx, card.ID, "draft")
            }
        }
    }
    return nil
}
```

---

## Section 4: Backend Tasks

| # | Task | File | What Exists | What to Do | Complexity | Est. |
|---|------|------|-------------|------------|------------|------|
| B1 | Verify card 8-state machine | `internal/service/card.go` | Card service with some transitions | Test all 14 valid transitions. Verify all invalid transitions are rejected with descriptive error. Add precondition checks: ready requires locked IntentSpec + deps met, queued requires ExecutionPlan. | M | 4h |
| B2 | Card dependency DAG with cycle detection | `internal/service/card.go` | Dependencies exist with cycle detection | Test: add dependencies -> verify topological sort produces correct order -> add cyclic dependency -> verify 409 error. Test: self-dependency rejected. Test: cross-board dependency rejected. Verify Kahn's algorithm handles disconnected subgraphs. | M | 4h |
| B3 | Blocked state propagation | `internal/service/card.go` | Partial blocked handling | Implement PropagateBlockedState: when card completes or fails, re-evaluate all downstream cards. Blocked -> ready when all deps complete. Ready -> blocked when dep fails. Test: chain A -> B -> C, A completes -> B unblocks, A fails -> B blocked, B blocked -> C blocked. | M | 4h |
| B4 | 6 card types with type-specific behavior | `internal/service/card.go` | Card types exist | Test each type: analysis (standard plan+workflow), comparison (multiple inputs), sweep (parameter variations), agent (uses agent_id, not workflow), gate (no plan, evaluates requirements), milestone (no execution, completes when deps complete). Verify type-specific validation: agent cards require agent_id, gate cards require gate linkage. | M | 3h |
| B5 | Topological sort endpoint | `internal/service/card.go` | May not have dedicated endpoint | Add or verify: GET /v0/boards/{id}/cards/sorted returns cards in topological order. Include dependency metadata in response (depends_on, depended_by, is_blocked). | S | 2h |

---

## Section 5: Frontend Tasks

| # | Task | File | What to Do | Complexity | Est. |
|---|------|------|------------|------------|------|
| F1 | Card grid with status badges | Board Studio components | Wire real data to existing card grid: 6 card type icons (beaker for analysis, scale for comparison, grid for sweep, brain for agent, shield for gate, flag for milestone). 8 status colors (draft=gray, ready=blue, queued=amber, running=blue-pulse, completed=green, failed=red, blocked=orange, skipped=gray-strikethrough). Show KPI summary badges per card (pass/fail counts). | M | 5h |
| F2 | Card dependency DAG view | Board Studio components | Render dependency arrows between cards using SVG or canvas overlay. Arrows: from depended-on card to dependent card. Color arrows: green if dependency met, red if blocking. Layout: auto-position cards based on topological sort levels. Toggle between grid view and DAG view. | L | 6h |
| F3 | Card detail page | Board Studio pages | Wire existing partial page: IntentSpec display (read-only after lock, editable if draft), KPIs with pass/fail indicators (green check / red x per metric), linked runs table (run_id, status, duration, cost, timestamp), evidence table (metric, value, threshold, evaluation badge), execution state timeline (draft -> ready -> queued -> running -> result). Add retry button (failed -> ready transition). Add skip button (with confirmation). Show depends_on cards with status badges. | M | 5h |

---

## Section 6: API Contracts

### PATCH /v0/cards/{id}/status -- Transition Card Status
```json
// Request
{
  "status": "ready"
}

// Response 200
{
  "id": "uuid",
  "status": "ready",
  "previous_status": "draft",
  "transitioned_at": "2026-05-15T10:00:00Z"
}

// Error 409 (invalid transition)
{
  "error": "invalid_transition",
  "message": "Cannot transition from 'draft' to 'running'. Allowed: ready, blocked, skipped",
  "current_status": "draft",
  "requested_status": "running",
  "allowed_transitions": ["ready", "blocked", "skipped"]
}

// Error 422 (precondition not met)
{
  "error": "precondition_failed",
  "message": "Cannot transition to 'ready': IntentSpec is not locked",
  "details": { "intent_spec_status": "draft" }
}
```

### POST /v0/cards/{id}/dependencies -- Add Dependency
```json
// Request
{
  "depends_on_card_id": "uuid"
}

// Response 200
{
  "card_id": "uuid",
  "depends_on": ["uuid1", "uuid2"],
  "is_blocked": false
}

// Error 409 (cycle detected)
{
  "error": "cycle_detected",
  "message": "Adding dependency would create cycle: CardA -> CardB -> CardC -> CardA",
  "cycle_path": ["CardA", "CardB", "CardC", "CardA"]
}
```

### GET /v0/boards/{id}/cards/sorted -- Topological Sort
```json
// Response 200
{
  "cards": [
    {
      "id": "uuid",
      "title": "FEA Stress Test",
      "card_type": "analysis",
      "status": "completed",
      "level": 0,
      "depends_on": [],
      "depended_by": ["uuid-cfd", "uuid-fatigue"],
      "is_blocked": false
    },
    {
      "id": "uuid-cfd",
      "title": "CFD Flow Analysis",
      "card_type": "analysis",
      "status": "running",
      "level": 1,
      "depends_on": ["uuid"],
      "depended_by": ["uuid-dfm"],
      "is_blocked": false
    },
    {
      "id": "uuid-dfm",
      "title": "DFM Check",
      "card_type": "analysis",
      "status": "blocked",
      "level": 2,
      "depends_on": ["uuid-cfd"],
      "depended_by": [],
      "is_blocked": true,
      "blocked_by": ["uuid-cfd"]
    }
  ],
  "levels": 3,
  "total": 4
}
```

---

## Section 7: Data Models & Migrations

### Existing Tables (verify schema)
```sql
-- cards table
CREATE TABLE cards (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id          UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    intent_spec_id    UUID REFERENCES intent_specs(id),
    card_type         VARCHAR(20) NOT NULL
                      CHECK (card_type IN ('analysis', 'comparison', 'sweep', 'agent', 'gate', 'milestone')),
    intent_type       VARCHAR(100),
    agent_id          UUID,
    agent_version     VARCHAR(50),
    title             VARCHAR(500) NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'ready', 'queued', 'running', 'completed', 'failed', 'blocked', 'skipped')),
    ordinal           INT NOT NULL DEFAULT 0,
    config            JSONB NOT NULL DEFAULT '{}',
    kpis              JSONB NOT NULL DEFAULT '[]',
    depends_on        UUID[] NOT NULL DEFAULT '{}',
    execution_plan_id UUID,
    run_ids           UUID[] NOT NULL DEFAULT '{}',
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_board ON cards(board_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_type ON cards(card_type);
```

---

## Section 8: NATS Subjects & Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `card.created` | POST /v0/cards | `{ card_id, board_id, card_type, title }` |
| `card.status_changed` | PATCH /v0/cards/{id}/status | `{ card_id, board_id, old_status, new_status }` |
| `card.dependency_added` | POST /v0/cards/{id}/dependencies | `{ card_id, depends_on_id, board_id }` |
| `card.dependency_removed` | DELETE /v0/cards/{id}/dependencies/{depId} | `{ card_id, depends_on_id, board_id }` |
| `card.blocked` | PropagateBlockedState | `{ card_id, board_id, blocked_by[] }` |
| `card.unblocked` | PropagateBlockedState | `{ card_id, board_id, new_status }` |

---

## Section 9: Testing Strategy

### Unit Tests
| Test | Description |
|------|-------------|
| TestCardTransition_DraftToReady | Valid transition with locked IntentSpec |
| TestCardTransition_ReadyToQueued | Valid transition with ExecutionPlan |
| TestCardTransition_QueuedToRunning | Valid transition |
| TestCardTransition_RunningToCompleted | Valid transition |
| TestCardTransition_RunningToFailed | Valid transition |
| TestCardTransition_FailedToReady | Retry valid |
| TestCardTransition_Invalid_DraftToRunning | Rejected |
| TestCardTransition_Invalid_CompletedToDraft | Rejected |
| TestCardTransition_Invalid_SkippedToAnything | Terminal state |
| TestCardTransition_ReadyRequiresLockedIntent | Precondition check |
| TestCardTransition_QueuedRequiresPlan | Precondition check |
| TestCardDependency_Add | A depends on B |
| TestCardDependency_CycleDetection | A->B->C->A rejected |
| TestCardDependency_SelfDependency | A->A rejected |
| TestCardDependency_CrossBoard | Different boards rejected |
| TestTopologicalSort_Linear | A->B->C sorts to [A,B,C] |
| TestTopologicalSort_Diamond | A->{B,C}->D sorts correctly |
| TestTopologicalSort_Disconnected | {A,B} with no deps |
| TestBlockedPropagation_Chain | A fails -> B blocked -> C blocked |
| TestBlockedPropagation_Unblock | A completes -> B unblocks |
| TestCardType_Analysis | Standard plan generation |
| TestCardType_Agent | Requires agent_id |
| TestCardType_Gate | No execution plan |
| TestCardType_Milestone | Completes when deps complete |

### Integration Tests
| Test | Description |
|------|-------------|
| TestCardLifecycleE2E | Create card -> lock intent -> ready -> queued -> running -> completed |
| TestDependencyDAGE2E | Create 4 cards with deps -> verify blocked/unblocked chain -> complete in order |
| TestCardTypeBehavior | Create each of 6 types -> verify type-specific behavior |

---

## Section 10: Acceptance Criteria

- [ ] 6 card types render with correct icons and type-specific behavior
- [ ] 8-status state machine enforced -- all 14 valid transitions work, all invalid transitions rejected
- [ ] Invalid transitions return descriptive error with allowed transitions list
- [ ] Precondition checks: ready requires locked IntentSpec, queued requires ExecutionPlan
- [ ] Dependencies block downstream cards until upstream completes
- [ ] Cycle detection prevents circular dependencies (409 error with cycle path)
- [ ] Topological sort returns cards in valid execution order
- [ ] Blocked status propagates correctly through dependency chains
- [ ] Unblocked status restores cards to appropriate state (draft or ready) when deps complete
- [ ] DAG view shows dependency arrows with color coding (green=met, red=blocking)
- [ ] Card detail page shows IntentSpec, KPIs, runs, evidence, and execution state
- [ ] Retry button transitions failed cards back to ready

---

## Section 11: Dependencies & Risks

### Dependencies
| Dependency | Source | Impact if Missing |
|------------|--------|-------------------|
| IntentSpec service | Sprint 4.1 | Cannot verify IntentSpec lock precondition |
| Board service | Existing | Cannot create cards without board |
| Agent service | Phase 3 | Agent cards need agent_id validation -- degrade gracefully |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Concurrent status transitions | Medium | High | Use optimistic locking (version column) on card updates |
| Large DAGs performance | Low | Medium | Kahn's algorithm is O(V+E), adequate for boards with <100 cards |
| Blocked propagation cascades | Medium | Medium | Batch propagation with single transaction, not recursive triggers |

---

## Section 12: Definition of Done

- [ ] All 14 valid card transitions tested and working
- [ ] All invalid transitions rejected with correct error responses
- [ ] Cycle detection proven with unit tests
- [ ] Topological sort produces correct ordering for linear, diamond, and disconnected DAGs
- [ ] Blocked propagation tested for chains of 3+ cards
- [ ] All 6 card types have type-specific validation and behavior
- [ ] Frontend card grid renders with real data, status badges, and type icons
- [ ] Frontend DAG view renders dependency arrows
- [ ] Frontend card detail page wired with all sections
- [ ] Code reviewed and merged to main

---

# ============================================================
# SPRINT 4.3: Plan Generation & Execution
# ============================================================

**Sprint Number:** 4.3
**Title:** Plan Generation & Execution
**Duration:** 3-4 days (~2026-05-17 to 2026-05-20)
**Goal:** Generate ExecutionPlans from IntentSpec + Pipeline through the 9-step generation process, compile to workflows, run preflight checks, and execute with full artifact+evidence chain.

---

## Section 1: Objectives & Scope

### Primary Objectives
1. Verify the complete 9-step plan generation pipeline
2. Verify plan compilation from PlanNodes to WorkflowDSL YAML to compiled workflow
3. Verify plan execution chain: CreateWorkflow -> CreateVersion -> Compile -> Publish -> StartRun -> EvidenceCollector
4. Verify preflight validation with blocker/warning categorization
5. Wire frontend plan viewer, preflight report, and execution progress

### Scope Boundaries
- **In scope:** Plan generation, compilation, preflight, execution launch
- **Out of scope:** Evidence collection (Sprint 4.4 -- though the execution chain triggers it), Gate evaluation (Sprint 4.4)
- **Depends on:** Sprint 4.1 (IntentSpec), Sprint 4.2 (Card state machine), Phase 2 (Workflow engine)

### Success Metrics
- 9-step plan generation produces valid ExecutionPlan from any IntentSpec+Pipeline combination
- Plan compiles to executable WorkflowDSL
- Preflight catches all blockers before execution
- Plan execution produces artifacts and triggers evidence collection

---

## Section 2: User Stories & Requirements

### US-4.3.1: 9-Step Plan Generation
**As a** board contributor,
**I want the** system to auto-generate an execution plan from my IntentSpec,
**So that** the right tools run in the right order with the right parameters.

**Details -- 9 Steps (Exhaustive):**

```
STEP 1: VALIDATE CARD TYPE
  Input: Card (card_type, intent_type)
  Logic:
    - card_type="analysis" + any simulation/cad/nde intent_type -> VALID
    - card_type="comparison" + any intent_type -> VALID (multiple inputs)
    - card_type="sweep" + any intent_type -> VALID (parameter variations)
    - card_type="agent" + any intent_type -> REDIRECT to agent execution
    - card_type="gate" -> INVALID (gates don't have execution plans)
    - card_type="milestone" -> INVALID (milestones don't execute)
  Output: validation result or error

STEP 2: LOAD INTENTSPEC
  Input: Card.intent_spec_id
  Logic:
    - Fetch IntentSpec from database
    - Verify status == "locked"
    - If status != "locked" -> ERROR: "IntentSpec must be locked before plan generation"
    - Load full spec: goal, inputs, constraints, acceptance_criteria, preferences, governance
  Output: locked IntentSpec

STEP 3: AUTO-SELECT PIPELINE
  Input: IntentSpec.intent_type
  Logic:
    - Query ToolShelf: POST /v0/toolshelf/resolve with intent_type
    - Get recommended[], alternatives[], unavailable_with_reasons[]
    - Select pipeline with highest trust_level from recommended[]
    - If user has override preference (stored in card.config.pipeline_override) -> use that
    - If no pipelines available -> ERROR: "No compatible pipelines for intent_type {type}"
    - Store selected pipeline_id in ExecutionPlan
  Output: selected Pipeline with steps

STEP 4: INSTANTIATE PIPELINE STEPS -> PlanNodes + PlanEdges
  Input: Pipeline.steps[]
  Logic:
    For each PipelineStep:
      - Resolve tool_id to specific ToolVersion (latest published matching version constraint)
      - If tool version unavailable -> ERROR: "Tool {name}@{version} not available"
      - Create PlanNode:
        { node_id: gen_uuid(), tool_id, tool_version, role: step.role,
          parameters: step.config_template, is_editable: true, is_required: true,
          status: "pending" }
      - Sanitize node_id: replace dots/special chars with underscores (Phase 0 fix)
    For each PipelineStep.depends_on:
      - Create PlanEdge: { from_node_id: dep_step.node_id, to_node_id: step.node_id }
  Output: PlanNode[], PlanEdge[]

STEP 5: BIND INTENTSPEC INPUTS -> NODE PORTS
  Input: IntentSpec.inputs[], PlanNodes[]
  Logic:
    For each IntentInput:
      - Find matching PlanNode port by name/type convention:
        geometry -> validate_input.geometry_file (or first preprocess node)
        material -> solve_node.material_id
        loads -> solve_node.load_case
      - If input has artifact_ref -> resolve to artifact download URL
      - Store binding: { intent_input_name -> node_id.port_name }
    Store all bindings in ExecutionPlan.bindings map
  Output: ExecutionPlan.bindings

STEP 6: APPLY PARAMETER OVERRIDES
  Input: Card.config.parameter_overrides (optional), PlanNodes[]
  Logic:
    For each override (node_id, param_key, param_value):
      - Find PlanNode by node_id
      - Verify node.is_editable == true
      - Verify param_key exists in node.parameters
      - Override: node.parameters[param_key] = param_value
      - Log override in plan metadata for audit
    If no overrides -> skip (no-op)
  Output: PlanNodes[] with overridden parameters

STEP 7: INSERT VALIDATION NODES
  Input: PlanNodes[], IntentSpec.inputs[]
  Logic:
    Create validation PlanNode(s) at the START of the DAG:
      - role = "validate_input"
      - Checks: file format correct, file size within limits, required fields present
      - For each input type:
        artifact:step -> validate STEP file can be opened
        artifact:stl -> validate STL mesh integrity
        json:material -> validate JSON schema for material properties
        scalar:float -> validate numeric range
    Add PlanEdges from validation nodes to first processing node
    Purpose: fail-fast before expensive compute runs
  Output: PlanNodes[] with validation nodes prepended

STEP 8: INSERT EVIDENCE NODES
  Input: PlanNodes[], IntentSpec.acceptance_criteria[]
  Logic:
    Create evidence PlanNode(s) after solve/postprocess nodes:
      - role = "evidence"
      - tool: metric-evaluator (or built-in evidence extractor)
      - parameters: { criteria: IntentSpec.acceptance_criteria,
                      source_nodes: [solve_node_id, postprocess_node_id] }
    Add PlanEdges from postprocess/solve nodes to evidence node
    The evidence node will extract metrics and create CardEvidence records
    (actual collection happens in Sprint 4.4, but the node is placed now)
  Output: PlanNodes[] with evidence nodes appended

STEP 9: INSERT GOVERNANCE NODES
  Input: IntentSpec.governance, Board.mode
  Logic:
    Determine if approval nodes are needed:
    - If governance.requires_approval == true -> add approval node
    - If governance.risk_policy == "high_risk" AND board.mode == "study" -> add approval node
    - If governance.risk_policy in ["medium_risk", "high_risk"] AND board.mode == "release" -> add approval node
    - If board.mode == "release" AND governance has side_effects -> add approval node
    Approval node:
      - role = "approval"
      - status = "pending" (requires human action)
      - blocks downstream evidence/report nodes
    Add PlanEdges: evidence_node -> approval_node -> report_node (if any)
    If mode == "explore" -> NO governance nodes (advisory only)
  Output: final PlanNodes[] + PlanEdges[]

FINAL OUTPUT:
  ExecutionPlan {
    id: gen_uuid()
    card_id: card.id
    pipeline_id: selected_pipeline.id
    nodes: PlanNode[]     (with all inserted nodes)
    edges: PlanEdge[]     (with all inserted edges)
    bindings: map         (IntentSpec inputs -> node ports)
    expected_outputs: []  (derived from pipeline + evidence nodes)
    cost_estimate: sum(node.tool.cost_per_run)
    time_estimate: sum(node.tool.avg_duration) with parallelism
    status: "draft"
    workflow_id: null     (set after compilation)
    run_id: null          (set after execution start)
  }
```

### US-4.3.2: Plan Compilation to Workflow
**As the** system,
**I want to** compile an ExecutionPlan into a Workflow,
**So that** the plan can be executed by the existing workflow engine.

**Details:**
- PlanNodes -> WorkflowDSL YAML nodes (with tool references, parameters, edges)
- Node IDs sanitized: `[^a-z0-9_-]` -> `_` (Phase 0 fix applied)
- Bindings mapped to workflow input expressions
- Compile -> Publish workflow (status: published)
- Store workflow_id in ExecutionPlan

### US-4.3.3: Plan Execution Chain
**As the** system,
**I want to** execute a plan through the full chain,
**So that** tools run, artifacts are produced, and evidence collection is triggered.

**Details -- Execution Chain:**
```
1. ExecutePlan(planID) called
2. CreateWorkflow from plan nodes/edges -> workflow_id
3. CreateVersion with workflow DSL YAML
4. Compile version (5-stage compiler from Phase 2)
5. Publish version (status: published)
6. StartRun(workflow_id, version, inputs from bindings)
7. Scheduler dispatches nodes via NATS
8. Rust runner executes Docker containers
9. Artifacts uploaded to MinIO
10. On run completion -> EvidenceCollectorService.OnRunCompleted (Sprint 4.4)
```

### US-4.3.4: Plan Preflight
**As a** board contributor,
**I want to** see a preflight check before executing a plan,
**So that** I know about blockers and warnings before wasting compute.

**Details -- Preflight Checks:**
| Category | Check | Blocker/Warning |
|----------|-------|-----------------|
| Schema | IntentSpec has all required fields | Blocker |
| Schema | All acceptance criteria have valid operators | Blocker |
| Artifacts | All input artifacts exist and are accessible | Blocker |
| Artifacts | Input file formats match expected types | Blocker |
| Units | IntentSpec units match tool expected units | Warning |
| Units | Acceptance criteria units consistent with KPIs | Warning |
| Quota | Tenant has sufficient compute budget | Blocker |
| Quota | Estimated cost within card/board limits | Warning |
| Governance | Required approvals configured for risk level | Warning |
| Governance | Board mode consistent with governance requirements | Warning |
| Tools | All tool versions available and published | Blocker |
| Tools | Tool trust_level meets minimum for board mode | Warning |

---

## Section 3: Architecture & Technical Design

### Plan Generation Sequence

```
Card (ready) ──> PlanGenerator.Generate(cardID)
                    │
                    ├── Step 1: ValidateCardType(card)
                    ├── Step 2: LoadIntentSpec(card.intent_spec_id)
                    ├── Step 3: SelectPipeline(intentSpec.intent_type)
                    ├── Step 4: InstantiateNodes(pipeline.steps)
                    ├── Step 5: BindInputs(intentSpec.inputs, nodes)
                    ├── Step 6: ApplyOverrides(card.config, nodes)
                    ├── Step 7: InsertValidationNodes(nodes, intentSpec.inputs)
                    ├── Step 8: InsertEvidenceNodes(nodes, intentSpec.acceptance_criteria)
                    ├── Step 9: InsertGovernanceNodes(intentSpec.governance, board.mode)
                    │
                    └── Return: ExecutionPlan { nodes, edges, bindings, status="draft" }

ExecutionPlan (draft) ──> Preflight.Validate(plan)
                              │
                              ├── SchemaChecks
                              ├── ArtifactChecks
                              ├── UnitChecks
                              ├── QuotaChecks
                              ├── GovernanceChecks
                              ├── ToolChecks
                              │
                              └── Return: PreflightReport { blockers[], warnings[], passes[] }

ExecutionPlan (validated) ──> PlanCompiler.Compile(plan)
                                  │
                                  ├── PlanNodes -> WorkflowDSL YAML
                                  ├── CreateWorkflow
                                  ├── CreateVersion
                                  ├── Compile (5-stage)
                                  ├── Publish
                                  │
                                  └── Return: workflow_id, version_id

ExecutionPlan (executing) ──> PlanExecutor.Execute(plan)
                                  │
                                  ├── StartRun(workflow_id, version, inputs)
                                  ├── Card.status -> "running"
                                  ├── Scheduler dispatches via NATS
                                  ├── ... execution ...
                                  ├── On complete -> Card.status -> "completed"/"failed"
                                  │
                                  └── Trigger: EvidenceCollector.OnRunCompleted
```

---

## Section 4: Backend Tasks

| # | Task | File | What Exists | What to Do | Complexity | Est. |
|---|------|------|-------------|------------|------------|------|
| B1 | Verify 9-step plan generation | `internal/service/plan_generator.go` | Plan generator exists | Test all 9 steps sequentially. Step 1: validate card_type vs intent_type compatibility (analysis/comparison/sweep valid, gate/milestone invalid). Step 2: load locked IntentSpec (reject if not locked). Step 3: query ToolShelf, select highest-trust pipeline (test override). Step 4: instantiate nodes from pipeline steps, resolve tool versions, sanitize node IDs. Step 5: bind IntentSpec inputs to node ports (test geometry, material, load mappings). Step 6: apply parameter overrides (test editable/non-editable). Step 7: insert validate_input nodes at DAG start. Step 8: insert evidence nodes after solve/postprocess. Step 9: insert governance nodes based on risk_policy + board mode (explore=none, study=high_risk, release=medium+high). Verify final ExecutionPlan has correct node count, edge count, bindings. | L | 8h |
| B2 | Plan compilation to workflow | `internal/service/plan_compiler.go` | Compiler exists with Phase 0 fix | Test: PlanNodes -> WorkflowDSL YAML generation. Verify node IDs sanitized (no dots). Verify edges map to YAML dependencies. Test: YAML -> Compile (5-stage) -> Publish. Verify bindings resolve IntentSpec inputs to workflow input expressions. Test with sim.fea pipeline (5+ nodes). | M | 4h |
| B3 | Plan execution chain | `internal/service/plan_generator.go` | ExecutePlan exists (fixed in Phase 0) | Test complete chain: ExecutePlan -> CreateWorkflow -> CreateVersion -> Compile -> Publish -> StartRun. Verify: plan.status transitions (draft -> validated -> executing -> completed/failed). Verify: card.status transitions (queued -> running -> completed/failed). Verify: run_id stored in plan and card. Test error handling: what happens if Compile fails? If StartRun fails? Ensure proper rollback. | M | 4h |
| B4 | Plan preflight validation | `internal/service/preflight.go` | Preflight exists | Test all 12 checks across 6 categories. Test: missing artifact -> blocker. Test: wrong file format -> blocker. Test: unit mismatch -> warning. Test: insufficient quota -> blocker. Test: tool not published -> blocker. Test: low trust tool in release mode -> warning. Verify PreflightReport structure: blockers[], warnings[], passes[] with human-readable messages and suggested fixes. | M | 4h |

---

## Section 5: Frontend Tasks

| # | Task | File | What to Do | Complexity | Est. |
|---|------|------|------------|------------|------|
| F1 | Plan viewer in card detail | Board Studio components (PlanExecutionPanel) | Wire existing panel: render plan as DAG visualization. Each node shows: tool name, version, role badge (color-coded: solve=blue, validate=yellow, evidence=green, approval=purple, preprocess=gray, postprocess=gray, report=teal). Node status badges (pending/running/completed/failed). Editable parameter fields on is_editable nodes. Show bindings: which IntentSpec inputs map to which node ports (connection lines). Node click -> expand to show parameters, tool info, run status. | L | 6h |
| F2 | Preflight report display | Board Studio components (PreflightResults) | Wire existing component: three sections -- Blockers (red, with stop icon, descriptive message, suggested fix), Warnings (amber, with warning icon, advisory message), Passes (green, with check icon, brief confirmation). Auto-fix buttons where applicable (e.g., "Fix unit mismatch" -> auto-convert). Show overall verdict: "Ready to execute" (no blockers) or "X blockers must be resolved" (blocked). Execute button disabled when blockers exist. | M | 4h |
| F3 | Plan execution progress | Board Studio components (ExecutionProgress) | Wire existing component: per-node progress indicator (icon + status badge + duration). Overall percentage bar (completed_nodes / total_nodes). ETA calculation based on historical tool durations. Log streaming panel: real-time log output from running nodes (via SSE from workflow engine). Error display: when node fails, show error message, suggest retry or skip. Cancel button: abort running execution. | M | 4h |

---

## Section 6: API Contracts

### POST /v0/cards/{id}/generate-plan -- Generate ExecutionPlan
```json
// Response 201
{
  "execution_plan": {
    "id": "uuid",
    "card_id": "uuid",
    "pipeline_id": "uuid",
    "pipeline_name": "Standard FEA Validation Pipeline",
    "nodes": [
      {
        "node_id": "node_001_validate_input",
        "tool_id": "uuid",
        "tool_name": "input-validator",
        "tool_version": "1.2.0",
        "role": "validate_input",
        "parameters": { "format": "step", "max_size_mb": 500 },
        "is_editable": false,
        "is_required": true,
        "status": "pending"
      },
      {
        "node_id": "node_002_mesh_gen",
        "tool_id": "uuid",
        "tool_name": "mesh-generator",
        "tool_version": "3.1.0",
        "role": "preprocess",
        "parameters": { "element_size": 2.0, "quality_target": 0.95 },
        "is_editable": true,
        "is_required": true,
        "status": "pending"
      },
      {
        "node_id": "node_003_fea_solver",
        "tool_id": "uuid",
        "tool_name": "fea-solver",
        "tool_version": "3.1.0",
        "role": "solve",
        "parameters": { "solver_type": "linear_static", "max_iterations": 1000 },
        "is_editable": true,
        "is_required": true,
        "status": "pending"
      },
      {
        "node_id": "node_004_postprocess",
        "tool_id": "uuid",
        "tool_name": "result-extractor",
        "tool_version": "1.0.0",
        "role": "postprocess",
        "parameters": {},
        "is_editable": false,
        "is_required": true,
        "status": "pending"
      },
      {
        "node_id": "node_005_evidence",
        "tool_id": "uuid",
        "tool_name": "metric-evaluator",
        "tool_version": "1.0.0",
        "role": "evidence",
        "parameters": {
          "criteria": [
            { "metric": "max_stress", "operator": "lt", "threshold": 250, "unit": "MPa" },
            { "metric": "safety_factor", "operator": "gt", "threshold": 1.2 }
          ]
        },
        "is_editable": false,
        "is_required": true,
        "status": "pending"
      }
    ],
    "edges": [
      { "from": "node_001_validate_input", "to": "node_002_mesh_gen" },
      { "from": "node_002_mesh_gen", "to": "node_003_fea_solver" },
      { "from": "node_003_fea_solver", "to": "node_004_postprocess" },
      { "from": "node_004_postprocess", "to": "node_005_evidence" }
    ],
    "bindings": {
      "geometry": "node_001_validate_input.geometry_file",
      "material": "node_003_fea_solver.material",
      "loads": "node_003_fea_solver.load_case"
    },
    "expected_outputs": ["stress_map", "mesh_output", "metric_results"],
    "cost_estimate": 4.50,
    "time_estimate": "12m",
    "status": "draft"
  }
}
```

### POST /v0/execution-plans/{id}/preflight -- Run Preflight
```json
// Response 200
{
  "plan_id": "uuid",
  "verdict": "blocked",
  "blockers": [
    {
      "category": "artifacts",
      "check": "input_artifact_exists",
      "message": "Input artifact 'geometry' (art_cad_001) not found",
      "fix": "Upload a STEP geometry file to the board"
    }
  ],
  "warnings": [
    {
      "category": "tools",
      "check": "tool_trust_level",
      "message": "mesh-generator@3.1.0 has trust_level 'tested' (recommended: 'verified' for study mode)",
      "fix": "Consider using mesh-generator@3.0.2 which is 'verified'"
    },
    {
      "category": "units",
      "check": "unit_consistency",
      "message": "Criterion 'convergence' uses unit 'iterations' which differs from tool output unit 'count'",
      "fix": "Update acceptance criterion unit to 'count'"
    }
  ],
  "passes": [
    { "category": "schema", "check": "intent_spec_complete", "message": "IntentSpec has all required fields" },
    { "category": "schema", "check": "criteria_operators_valid", "message": "All operators valid" },
    { "category": "quota", "check": "compute_budget", "message": "Sufficient budget ($4.50 of $100.00 remaining)" },
    { "category": "governance", "check": "approval_configured", "message": "No approval required (standard risk, study mode)" }
  ],
  "blocker_count": 1,
  "warning_count": 2,
  "pass_count": 4
}
```

### POST /v0/execution-plans/{id}/execute -- Execute Plan
```json
// Response 202 (Accepted)
{
  "plan_id": "uuid",
  "status": "executing",
  "workflow_id": "uuid",
  "version_id": "uuid",
  "run_id": "uuid",
  "card_status": "running",
  "estimated_duration": "12m",
  "stream_url": "/v0/runs/{run_id}/events"
}
```

---

## Section 7: Data Models & Migrations

### Existing Tables (verify schema)
```sql
-- execution_plans table
CREATE TABLE execution_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    pipeline_id     UUID REFERENCES pipelines(id),
    nodes           JSONB NOT NULL DEFAULT '[]',
    edges           JSONB NOT NULL DEFAULT '[]',
    bindings        JSONB NOT NULL DEFAULT '{}',
    expected_outputs JSONB NOT NULL DEFAULT '[]',
    cost_estimate   FLOAT,
    time_estimate   VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'validated', 'executing', 'completed', 'failed')),
    workflow_id     UUID,
    run_id          UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_execution_plans_card ON execution_plans(card_id);
CREATE INDEX idx_execution_plans_status ON execution_plans(status);

-- pipelines table (verify exists)
CREATE TABLE pipelines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id),
    name        VARCHAR(500) NOT NULL,
    intent_type VARCHAR(100) NOT NULL,
    trust_level VARCHAR(20) NOT NULL DEFAULT 'untested'
                CHECK (trust_level IN ('untested', 'community', 'tested', 'verified', 'certified')),
    is_builtin  BOOLEAN NOT NULL DEFAULT false,
    steps       JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipelines_intent_type ON pipelines(intent_type);
CREATE INDEX idx_pipelines_trust ON pipelines(trust_level);
```

---

## Section 8: NATS Subjects & Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `execution_plan.generated` | POST /v0/cards/{id}/generate-plan | `{ plan_id, card_id, board_id, pipeline_id, node_count }` |
| `execution_plan.validated` | POST /v0/execution-plans/{id}/preflight (no blockers) | `{ plan_id, card_id, warning_count }` |
| `execution_plan.executing` | POST /v0/execution-plans/{id}/execute | `{ plan_id, card_id, workflow_id, run_id }` |
| `execution_plan.completed` | All nodes done | `{ plan_id, card_id, board_id, duration, status }` |
| `execution_plan.failed` | Node failure | `{ plan_id, card_id, board_id, failed_node_id, error }` |

Existing NATS subjects used:
- `airaie.jobs.tool.execution` -- dispatched by scheduler for each PlanNode
- `airaie.results.completed` -- emitted on tool completion (triggers Sprint 4.4 evidence)
- `airaie.events.{runId}` -- real-time streaming for execution progress

---

## Section 9: Testing Strategy

### Unit Tests
| Test | Description |
|------|-------------|
| TestPlanGen_Step1_ValidAnalysis | analysis + sim.fea -> valid |
| TestPlanGen_Step1_InvalidGate | gate + sim.fea -> invalid |
| TestPlanGen_Step1_InvalidMilestone | milestone -> invalid |
| TestPlanGen_Step2_LoadLocked | Load locked IntentSpec -> success |
| TestPlanGen_Step2_RejectDraft | Load draft IntentSpec -> error |
| TestPlanGen_Step3_SelectPipeline | Select highest-trust pipeline |
| TestPlanGen_Step3_UserOverride | Pipeline override from card.config |
| TestPlanGen_Step3_NoPipeline | No compatible pipelines -> error |
| TestPlanGen_Step4_InstantiateNodes | 5 pipeline steps -> 5 PlanNodes + edges |
| TestPlanGen_Step4_SanitizeNodeIDs | Dots replaced with underscores |
| TestPlanGen_Step5_BindInputs | geometry -> validate_input.geometry_file |
| TestPlanGen_Step5_ArtifactRef | artifact_ref resolved to download URL |
| TestPlanGen_Step6_ApplyOverrides | element_size overridden on editable node |
| TestPlanGen_Step6_RejectNonEditable | Override on non-editable node rejected |
| TestPlanGen_Step7_InsertValidation | validate_input node added at DAG start |
| TestPlanGen_Step8_InsertEvidence | evidence node added after solve |
| TestPlanGen_Step9_ExploreMode | No governance nodes in explore mode |
| TestPlanGen_Step9_StudyHighRisk | Approval node added for high_risk in study |
| TestPlanGen_Step9_ReleaseMode | Approval node added for medium+high in release |
| TestPlanCompile_ToYAML | PlanNodes -> valid WorkflowDSL YAML |
| TestPlanCompile_NodeIDs | No special chars in compiled node IDs |
| TestPlanExecute_FullChain | Generate -> Preflight -> Compile -> Execute -> Run started |
| TestPreflight_MissingArtifact | Missing input artifact -> blocker |
| TestPreflight_InsufficientQuota | Over budget -> blocker |
| TestPreflight_UnitMismatch | Unit inconsistency -> warning |
| TestPreflight_AllPass | Valid plan -> verdict "ready" |
| TestPreflight_ToolNotPublished | Draft tool version -> blocker |

### Integration Tests
| Test | Description |
|------|-------------|
| TestPlanGenerationE2E | Create board -> card -> IntentSpec -> lock -> generate plan -> verify 9 steps produced correct plan |
| TestPlanExecutionE2E | Generate plan -> preflight (pass) -> compile -> execute -> verify run started + artifacts |
| TestPlanFailureRecovery | Execute plan -> tool fails -> card status=failed -> retry -> new plan -> re-execute |

---

## Section 10: Acceptance Criteria

- [ ] 9-step plan generation produces valid ExecutionPlan from IntentSpec + Pipeline
- [ ] Step 1: Card type validation (analysis/comparison/sweep valid, gate/milestone invalid)
- [ ] Step 2: Locked IntentSpec loaded (draft rejected)
- [ ] Step 3: Pipeline auto-selected by trust level (user override supported)
- [ ] Step 4: Pipeline steps instantiated as PlanNodes with sanitized IDs
- [ ] Step 5: IntentSpec inputs bound to node ports
- [ ] Step 6: Parameter overrides applied to editable nodes only
- [ ] Step 7: Validation nodes inserted at DAG start
- [ ] Step 8: Evidence nodes inserted after solve/postprocess
- [ ] Step 9: Governance nodes inserted based on risk policy + board mode
- [ ] Plan compiles to valid WorkflowDSL YAML
- [ ] Compiled workflow can be published and executed
- [ ] Preflight catches all blockers before execution
- [ ] Plan execution produces artifacts and sets card status to running
- [ ] Plan execution chain triggers evidence collection on completion

---

## Section 11: Dependencies & Risks

### Dependencies
| Dependency | Source | Impact if Missing |
|------------|--------|-------------------|
| IntentSpec (locked) | Sprint 4.1 | Cannot run Step 2 |
| Card state machine | Sprint 4.2 | Cannot transition card queued->running |
| ToolShelf resolution | Phase 1 (Sprint 1.3) | Cannot run Step 3 (pipeline selection) |
| Workflow compiler | Phase 2 (Sprint 2.1) | Cannot compile plan to workflow |
| Workflow scheduler | Phase 2 (Sprint 2.2+) | Cannot execute compiled workflow |
| Pipeline registry | Existing | Must have at least 1 pipeline per intent_type |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| No pipelines seeded for intent types | High | High | Create seed data with at least 1 pipeline per IntentType |
| Plan compiler node ID collision | Low | High | Use UUID-based node IDs with role prefix |
| ToolShelf returns empty results | Medium | Medium | Graceful error with "no compatible tools" message |
| Execution chain partial failure | Medium | High | Transactional steps with rollback on failure |

---

## Section 12: Definition of Done

- [ ] 9-step plan generation tested with unit tests for each step
- [ ] Plan compilation produces valid WorkflowDSL YAML
- [ ] Preflight validation catches all 12 check types
- [ ] Plan execution chain works end-to-end: generate -> preflight -> compile -> execute
- [ ] Card status transitions correctly through plan lifecycle
- [ ] Frontend plan viewer renders DAG with node roles and status
- [ ] Frontend preflight report shows blockers/warnings/passes
- [ ] Frontend execution progress shows per-node status and logs
- [ ] Error handling tested: tool unavailable, compile failure, run failure
- [ ] Code reviewed and merged to main

---

# ============================================================
# SPRINT 4.4: Evidence Collection & Gates
# ============================================================

**Sprint Number:** 4.4
**Title:** Evidence Collection & Gates
**Duration:** 3-4 days (~2026-05-20 to 2026-05-23)
**Goal:** Auto-collect evidence from completed runs, evaluate governance gates, implement board mode enforcement, and calculate board readiness using the weighted 5-category formula.

---

## Section 1: Objectives & Scope

### Primary Objectives
1. Verify the complete 10-step evidence collection pipeline
2. Verify CardEvidence evaluation (pass/fail/warning/info with margin)
3. Implement gate auto-evaluation for evidence gates
4. Implement gate manual approval for review and compliance gates
5. Implement board mode enforcement (Explore=advisory, Study=enforced, Release=all must pass)
6. Implement board readiness gauge with weighted 5-category calculation
7. Wire frontend evidence panel, gate review panel, and readiness gauge

### Scope Boundaries
- **In scope:** Evidence collection, CardEvidence, gate evaluation (evidence/review/compliance), board mode enforcement, readiness calculation
- **Out of scope:** Release packet generation (Sprint 4.5)
- **Depends on:** Sprint 4.1 (IntentSpec + AcceptanceCriterion), Sprint 4.2 (Card state machine), Sprint 4.3 (Plan execution -> run completion)

### Success Metrics
- Evidence auto-collected within seconds of run completion
- CardEvidence evaluations match criterion definitions exactly
- Evidence gates auto-pass when all linked criteria pass
- Manual approval flow works for review and compliance gates
- Board mode enforcement correctly blocks/allows based on mode
- Readiness gauge produces correct weighted percentage

---

## Section 2: User Stories & Requirements

### US-4.4.1: 10-Step Evidence Collection
**As the** system,
**I want to** automatically collect evidence when a workflow run completes,
**So that** CardEvidence records are created without human intervention.

**Details -- 10 Steps (Exhaustive):**

```
STEP 1: RUN COMPLETION EVENT
  Trigger: RunService emits airaie.results.completed
  Payload: { run_id, card_id, board_id, outputs[], metrics{}, status }
  Guard: Only process if run has a card_id (board-linked run)
  If no card_id -> ignore (standalone run, no evidence needed)

STEP 2: QUEUE ASYNC HANDLER
  Action: FireEvidenceCollection queues async processing
  Why async: evidence collection should not block the run completion response
  Implementation: NATS consumer subscribes to airaie.results.completed
  Deduplication: idempotent on (run_id, card_id) -- skip if already processed

STEP 3: LOAD EVIDENCE PLAN NODES
  Action: Load all PlanNodes with role="evidence" from the card's ExecutionPlan
  If no evidence nodes -> log warning, skip to Step 9 (audit only)
  Each evidence node defines which metrics to extract and how

STEP 4: EXTRACT METRICS FROM OUTPUTS
  Action: For each evidence node, extract metrics from run outputs
  Sources:
    - Tool output artifacts (JSON files with metric keys)
    - Run metadata (status, duration, cost)
    - Tool-specific metric extraction (solver logs, result files)
  Mapping: Match extracted metric keys to card KPIs and IntentSpec acceptance_criteria
  Example:
    Run output: { "max_stress": 187.3, "safety_factor": 1.34, "convergence": 8 }
    Card KPIs: ["max_stress", "safety_factor"]
    Criteria: [{ metric: "max_stress", op: "lt", threshold: 250 }, ...]

STEP 5: CREATE CardEvidence RECORDS
  Action: For each metric matching an AcceptanceCriterion, create CardEvidence:
    CardEvidence {
      card_id: card.id
      run_id: run.id
      artifact_id: source artifact (if applicable)
      criterion_id: matching AcceptanceCriterion.id
      metric_key: "max_stress"
      metric_value: 187.3
      metric_unit: "MPa"
      threshold: 250
      operator: "lt"
      evaluation: EvaluateCriterion(criterion, metric_value).evaluation
      passed: EvaluateCriterion(criterion, metric_value).passed
      metadata: { solver: "fea-solver@3.1", mesh_elements: 45000, run_duration: "8m32s" }
      version: 1 (or increment if re-run)
    }
  Uses: AcceptanceCriterion evaluation from Sprint 4.1 (8 operators)

STEP 6: UPDATE TRUST SCORE
  Action: TrustUpdater updates tool trust metrics
  For each tool used in the plan:
    success_rate_new = (success_rate_old * run_count + outcome) / (run_count + 1)
    Where outcome = 1 if all metrics passed, 0 if any failed
  Updates: tool_versions.success_rate in database
  This feeds back into ToolShelf ranking for future resolution

STEP 7: CHECK BORDERLINE METRICS
  Action: For each CardEvidence, check if metric is borderline
  Borderline: metric passed but margin < 10% of threshold
  Example: max_stress=230, threshold=250, margin=20, margin/threshold=8% -> BORDERLINE
  If borderline: set CardEvidence.evaluation = "warning" (not "pass")
  Record: flag in metadata { borderline: true, margin_pct: 0.08 }

STEP 8: ESCALATE IF NEEDED
  Action: If any metric is borderline or failed:
    - Check board mode
    - If mode=study AND metric borderline -> auto-flag for human review
    - If mode=release AND any metric failed -> escalate to board owner
    - If governance.risk_policy=high_risk AND metric borderline -> escalate
  Implementation:
    - Create audit event: "Evidence borderline, review recommended"
    - If auto_escalate configured: trigger gate re-evaluation
    - Send notification to approval queue

STEP 9: EMIT AUDIT EVENTS
  Action: Create audit_events for all CardEvidence records
  Events:
    - card_evidence.created: for each new CardEvidence record
    - card_evidence.borderline: for borderline metrics (separate alert)
    - card_evidence.failed: for failed metrics
  Payload: { card_id, board_id, metric_key, metric_value, evaluation, margin }
  These events appear in the board's activity timeline

STEP 10: INVALIDATE READINESS CACHE
  Action: Invalidate the board's readiness calculation cache
  Why: new evidence changes the readiness score
  Implementation: delete cached readiness value for board_id
  Next query for readiness will recompute from current state
  Also trigger: gate re-evaluation for auto-evaluate gates
```

### US-4.4.2: CardEvidence Evaluation
**As the** system,
**I want to** evaluate each metric against its acceptance criterion,
**So that** evidence records have clear pass/fail/warning/info status.

**Details:**
- Uses EvaluateCriterion from Sprint 4.1 (8 operators)
- Evaluation results:
  - `pass`: metric satisfies criterion with comfortable margin
  - `fail`: metric violates criterion
  - `warning`: metric satisfies criterion but is borderline (within 10% of threshold)
  - `info`: informational metric, no pass/fail judgment (when criterion weight=0 or no threshold)
- Composite score: weighted average of all criterion evaluations
  `composite = SUM(criterion.weight * (1 if passed else 0)) / SUM(criterion.weight)`

### US-4.4.3: Gate Auto-Evaluation
**As the** system,
**I want to** automatically evaluate evidence gates when new evidence arrives,
**So that** gates pass without human intervention when criteria are met.

**Details:**
- Gate types: evidence, review, compliance
- Evidence gate auto-evaluation:
  1. Load gate requirements
  2. For each requirement:
     - `run_succeeded`: check if linked card's latest run status == "completed"
     - `artifact_exists`: check if named artifact exists in board attachments
     - `metric_threshold`: check CardEvidence for metric -> evaluate against threshold
     - `all_criteria_passed`: check all CardEvidence for linked card -> all passed
  3. If ALL requirements satisfied -> gate status = PASSED
  4. If ANY requirement not satisfied -> gate status remains PENDING or FAILED
  5. Auto-evaluate triggered by: evidence collection (Step 10), explicit POST /v0/gates/{id}/evaluate

### US-4.4.4: Gate Manual Approval
**As a** reviewer,
**I want to** review evidence and approve or reject a gate,
**So that** governance checkpoints require human judgment.

**Details:**
- Review gate: requires human sign-off from qualified reviewer
  1. Reviewer sees: all CardEvidence for linked cards, artifacts, evidence records
  2. Reviewer can: APPROVE (with comment), REJECT (with reason), WAIVE (with justification)
  3. On approve: check if all role requirements met -> gate status = PASSED
  4. On reject: gate status = FAILED, card may need to re-run
  5. On waive: gate status = WAIVED, audit record created with justification
- Compliance gate: combines auto-evaluation with mandatory sign-offs
  1. Auto-check: all prior gates passed
  2. Manual: all required roles have signed off (quality_manager, project_lead, etc.)
  3. Gate passes ONLY when both auto-checks AND all sign-offs complete

### US-4.4.5: Board Mode Enforcement
**As the** system,
**I want to** enforce governance based on the current board mode,
**So that** Explore is permissive, Study enforces gates, and Release requires everything.

**Details:**
```
MODE: EXPLORE
  Gates: ADVISORY -- shown in UI but not enforced
  Evidence: collected but gates don't block progression
  IntentSpecs: can remain draft (not required to lock)
  Agent threshold: 0.5 (exploratory)
  Cards: can transition freely without gate checks

MODE: STUDY
  Gates: ENFORCED -- must pass for certain card transitions
  Evidence: required for gate evaluation
  IntentSpecs: MUST be locked before execution
  Agent threshold: 0.75 (systematic)
  Cards: require evidence gates to pass before downstream progresses
  High_risk actions: require approval

MODE: RELEASE
  Gates: ALL MUST PASS -- no exceptions (except waiver with audit)
  Evidence: all cards must have complete evidence
  IntentSpecs: all must be locked
  Agent threshold: 0.90 (conservative)
  Cards: all must be completed or skipped
  Artifacts: can be locked (frozen snapshots)
  Release packet: can be built

MODE ESCALATION:
  Explore -> Study: requires >= 1 card AND >= 1 gate defined
  Study -> Release: requires ALL gates status == PASSED
  NEVER backward: Study -> Explore is NOT allowed
  Each escalation logged in audit trail
```

### US-4.4.6: Board Readiness Gauge
**As a** board contributor,
**I want to** see a readiness percentage for the board,
**So that** I know how close we are to being ready for release.

**Details -- Weighted 5-Category Formula:**
```
CATEGORY WEIGHTS:
  design:        0.30    Cards with card_type in (analysis, comparison, sweep)
  validation:    0.30    Evidence gates (type="evidence")
  compliance:    0.15    Compliance gates (type="compliance")
  manufacturing: 0.10    Cards with intent_type matching cad.dfm* or manufacturing*
  approvals:     0.15    Review gates (type="review") + compliance gate sign-offs

CALCULATION:
  For each category:
    category_pass_rate = passed_items / total_items
    If total_items == 0 -> category_pass_rate = 0 (not 1; missing items mean not ready)

  readiness = SUM(category_weight * category_pass_rate)

EXAMPLE:
  design:        3/4 analysis cards completed    = 0.75  * 0.30 = 0.225
  validation:    2/3 evidence gates passed       = 0.667 * 0.30 = 0.200
  compliance:    0/1 compliance gate passed      = 0.00  * 0.15 = 0.000
  manufacturing: 0/1 DFM card completed          = 0.00  * 0.10 = 0.000
  approvals:     1/2 review sign-offs obtained   = 0.50  * 0.15 = 0.075

  READINESS = 0.225 + 0.200 + 0.000 + 0.000 + 0.075 = 0.500 (50%)

IMPLEMENTATION:
  - Computed on-demand (not stored)
  - Cached with invalidation on: evidence created, gate evaluated, card status changed
  - Returned by: GET /v0/boards/{id} (in readiness_score field)
  - Also: GET /v0/boards/{id}/readiness (detailed breakdown)
```

---

## Section 3: Architecture & Technical Design

### Evidence Collection Sequence

```
airaie.results.completed
    │
    ▼
EvidenceCollectorService.OnRunCompleted(event)
    │
    ├── Step 1: Validate event has card_id
    ├── Step 2: Queue async handler (dedup by run_id+card_id)
    │
    ▼
handleEvidenceCollection(run_id, card_id)
    │
    ├── Step 3: Load card -> execution_plan -> evidence PlanNodes
    ├── Step 4: Extract metrics from run outputs
    │
    ├── Step 5: For each criterion in IntentSpec.acceptance_criteria:
    │     ├── Match metric_key from outputs
    │     ├── EvaluateCriterion(criterion, metric_value)
    │     └── INSERT INTO card_evidence (...)
    │
    ├── Step 6: For each tool in plan:
    │     └── TrustUpdater.Update(tool_version_id, success)
    │
    ├── Step 7: For each CardEvidence:
    │     └── Check borderline (margin < 10% threshold)
    │
    ├── Step 8: If borderline or failed:
    │     ├── Check board mode + risk policy
    │     └── Escalate if needed (notification + gate flag)
    │
    ├── Step 9: Emit audit events:
    │     ├── card_evidence.created (per record)
    │     ├── card_evidence.borderline (if applicable)
    │     └── card_evidence.failed (if applicable)
    │
    └── Step 10: InvalidateReadinessCache(board_id)
                 TriggerGateReEvaluation(board_id)
```

### Gate Evaluation Logic

```go
// EvaluateGate checks all requirements and updates gate status.
func (s *GateService) EvaluateGate(ctx context.Context, gateID uuid.UUID) (*Gate, error) {
    gate, _ := s.store.GetGate(ctx, gateID)
    requirements, _ := s.store.ListGateRequirements(ctx, gateID)

    board, _ := s.boardService.Get(ctx, gate.BoardID)

    // In Explore mode, gates are advisory only
    if board.Mode == "explore" {
        gate.Advisory = true
    }

    allSatisfied := true
    for i, req := range requirements {
        satisfied := false

        switch req.Type {
        case "run_succeeded":
            // Check if the linked card's latest run succeeded
            cardID := req.Config["card_id"]
            card, _ := s.cardService.Get(ctx, cardID)
            satisfied = card.Status == "completed"

        case "artifact_exists":
            // Check if the named artifact exists on the board
            artifactName := req.Config["artifact_name"]
            attachments, _ := s.boardService.ListAttachments(ctx, gate.BoardID)
            for _, att := range attachments {
                if att.Name == artifactName {
                    satisfied = true
                    break
                }
            }

        case "metric_threshold":
            // Check CardEvidence for the specified metric
            metric := req.Config["metric"]
            operator := req.Config["operator"]
            threshold := req.Config["value"]
            evidence, _ := s.evidenceService.GetLatestByMetric(ctx, gate.BoardID, metric)
            if evidence != nil {
                result := EvaluateCriterion(AcceptanceCriterion{
                    Operator:  operator,
                    Threshold: threshold,
                }, evidence.MetricValue)
                satisfied = result.Passed
            }

        case "all_criteria_passed":
            // Check if all CardEvidence for linked card are passed
            cardID := req.Config["card_id"]
            allEvidence, _ := s.evidenceService.ListByCard(ctx, cardID)
            satisfied = len(allEvidence) > 0
            for _, ev := range allEvidence {
                if !ev.Passed {
                    satisfied = false
                    break
                }
            }

        case "role_signed":
            // Check if a specific role has approved
            role := req.Config["role"]
            approvals, _ := s.store.ListGateApprovals(ctx, gateID)
            for _, approval := range approvals {
                if approval.Role == role && approval.Decision == "approved" {
                    satisfied = true
                    break
                }
            }

        case "all_prior_gates_passed":
            // Check all other gates on the board
            allGates, _ := s.store.ListGatesByBoard(ctx, gate.BoardID)
            satisfied = true
            for _, g := range allGates {
                if g.ID != gateID && g.Status != "passed" && g.Status != "waived" {
                    satisfied = false
                    break
                }
            }
        }

        requirements[i].Satisfied = satisfied
        if !satisfied {
            allSatisfied = false
        }
    }

    // Update gate status
    if allSatisfied {
        gate.Status = "passed"
    } else if gate.Status == "evaluating" {
        // Check if any requirement that was previously satisfied is now not
        anyFailed := false
        for _, req := range requirements {
            if !req.Satisfied && req.PreviouslySatisfied {
                anyFailed = true
                break
            }
        }
        if anyFailed {
            gate.Status = "failed"
        }
    }

    s.store.UpdateGate(ctx, gate)
    s.store.UpdateGateRequirements(ctx, requirements)
    return gate, nil
}
```

### Readiness Calculation

```go
// CalculateReadiness computes the weighted 5-category readiness score.
func (s *BoardService) CalculateReadiness(ctx context.Context, boardID uuid.UUID) (*ReadinessReport, error) {
    cards, _ := s.cardService.ListByBoard(ctx, boardID)
    gates, _ := s.gateService.ListByBoard(ctx, boardID)

    // Category: Design (0.30)
    // Cards with type analysis, comparison, or sweep
    designCards := filter(cards, func(c Card) bool {
        return c.CardType == "analysis" || c.CardType == "comparison" || c.CardType == "sweep"
    })
    designPassed := count(designCards, func(c Card) bool { return c.Status == "completed" })
    designTotal := len(designCards)
    designRate := safeDiv(designPassed, designTotal) // 0 if total == 0

    // Category: Validation (0.30)
    // Evidence gates
    evidenceGates := filter(gates, func(g Gate) bool { return g.Type == "evidence" })
    validationPassed := count(evidenceGates, func(g Gate) bool {
        return g.Status == "passed" || g.Status == "waived"
    })
    validationTotal := len(evidenceGates)
    validationRate := safeDiv(validationPassed, validationTotal)

    // Category: Compliance (0.15)
    // Compliance gates
    complianceGates := filter(gates, func(g Gate) bool { return g.Type == "compliance" })
    compliancePassed := count(complianceGates, func(g Gate) bool {
        return g.Status == "passed" || g.Status == "waived"
    })
    complianceTotal := len(complianceGates)
    complianceRate := safeDiv(compliancePassed, complianceTotal)

    // Category: Manufacturing (0.10)
    // Cards with intent_type starting with "cad.dfm" or card_type related to manufacturing
    mfgCards := filter(cards, func(c Card) bool {
        return strings.HasPrefix(c.IntentType, "cad.dfm") ||
               strings.HasPrefix(c.IntentType, "cad.geometry")
    })
    mfgPassed := count(mfgCards, func(c Card) bool { return c.Status == "completed" })
    mfgTotal := len(mfgCards)
    mfgRate := safeDiv(mfgPassed, mfgTotal)

    // Category: Approvals (0.15)
    // Review gates + compliance gate sign-offs
    reviewGates := filter(gates, func(g Gate) bool { return g.Type == "review" })
    // Count sign-off requirements across all review + compliance gates
    totalSignoffs := 0
    obtainedSignoffs := 0
    for _, g := range append(reviewGates, complianceGates...) {
        reqs, _ := s.gateService.ListRequirements(ctx, g.ID)
        for _, req := range reqs {
            if req.Type == "role_signed" {
                totalSignoffs++
                if req.Satisfied {
                    obtainedSignoffs++
                }
            }
        }
    }
    approvalRate := safeDiv(obtainedSignoffs, totalSignoffs)

    // Weighted sum
    readiness := designRate*0.30 +
                 validationRate*0.30 +
                 complianceRate*0.15 +
                 mfgRate*0.10 +
                 approvalRate*0.15

    return &ReadinessReport{
        Score: readiness,
        Categories: []CategoryScore{
            {Name: "design", Weight: 0.30, Passed: designPassed, Total: designTotal, Rate: designRate},
            {Name: "validation", Weight: 0.30, Passed: validationPassed, Total: validationTotal, Rate: validationRate},
            {Name: "compliance", Weight: 0.15, Passed: compliancePassed, Total: complianceTotal, Rate: complianceRate},
            {Name: "manufacturing", Weight: 0.10, Passed: mfgPassed, Total: mfgTotal, Rate: mfgRate},
            {Name: "approvals", Weight: 0.15, Passed: obtainedSignoffs, Total: totalSignoffs, Rate: approvalRate},
        },
    }, nil
}

func safeDiv(num, denom int) float64 {
    if denom == 0 {
        return 0.0 // Missing items = not ready
    }
    return float64(num) / float64(denom)
}
```

---

## Section 4: Backend Tasks

| # | Task | File | What Exists | What to Do | Complexity | Est. |
|---|------|------|-------------|------------|------------|------|
| B1 | Verify 10-step evidence collection | `internal/service/evidence_collector.go` | Evidence collector exists | Test all 10 steps sequentially. Step 1: event with card_id triggers processing, event without card_id ignored. Step 2: async handler queued, dedup on run_id+card_id. Step 3: load evidence PlanNodes from ExecutionPlan. Step 4: extract metrics from run outputs (JSON parsing). Step 5: create CardEvidence with EvaluateCriterion for each criterion (test all 8 operators). Step 6: TrustUpdater updates tool success_rate. Step 7: borderline check (margin < 10% threshold). Step 8: escalation for borderline in study/release mode. Step 9: audit events emitted. Step 10: readiness cache invalidated + gate re-evaluation triggered. | L | 8h |
| B2 | CardEvidence evaluation | `internal/service/evidence_collector.go` | CardEvidence model exists | Test: create CardEvidence with metric_value vs threshold+operator -> verify evaluation (pass/fail/warning/info) and passed boolean. Test: warning for borderline metrics. Test: info for criteria with weight=0. Test: composite score calculation (weighted average of pass/fail). Test: evidence versioning (re-run increments version). | M | 4h |
| B3 | Gate auto-evaluation | `internal/service/gate.go` | Gate service exists | Test evidence gate: all requirements satisfied -> PASSED. Test: requirement types (run_succeeded, artifact_exists, metric_threshold, all_criteria_passed, role_signed, all_prior_gates_passed). Test: partial satisfaction -> PENDING. Test: previously satisfied requirement fails -> FAILED. Test: auto-trigger from evidence collection. | M | 4h |
| B4 | Gate manual approval | `internal/service/gate.go` | Approval handling exists | Test review gate: reviewer approves -> check if all role_signed requirements met -> PASSED. Test: reviewer rejects -> FAILED. Test: waiver with justification -> WAIVED. Test compliance gate: auto-checks pass + all sign-offs collected -> PASSED. Test: partial sign-offs -> PENDING. Test: approval history recorded (who, when, comment). | M | 4h |
| B5 | Board mode enforcement | `internal/service/board_mode.go` | Mode service exists | Test Explore: gates advisory (not blocking). Test Study: gates enforced (block card progression). Test Release: all gates must pass. Test escalation: Explore->Study (requires cards+gates), Study->Release (requires all gates passed). Test one-way: Study->Explore REJECTED. Test agent threshold injection: Explore=0.5, Study=0.75, Release=0.90 with ADDITIVE logic (board only tightens, never loosens). | M | 4h |
| B6 | Board readiness calculation | `internal/service/board.go` or `internal/service/readiness.go` | Readiness display exists | Implement 5-category weighted calculation. Test: empty board = 0%. Test: all cards+gates passed = 100%. Test: partial completion matches expected weighted sum. Test: zero items in a category -> rate=0 (not 1). Test: cache invalidation on evidence/gate/card changes. Test: detailed breakdown returned in API. | M | 4h |

---

## Section 5: Frontend Tasks

| # | Task | File | What to Do | Complexity | Est. |
|---|------|------|------------|------------|------|
| F1 | Evidence panel in board detail | Board Studio components | Wire existing evidence panel: table with columns (card title, metric, value, threshold, operator, evaluation badge [pass=green, fail=red, warning=amber, info=blue], margin, linked artifact, linked run). Click row -> navigate to card detail or run detail. Filter by: card, evaluation status, metric name. Sort by: timestamp, metric, evaluation. Show evidence version (v1, v2 for re-runs). Borderline badge for warning items. | M | 5h |
| F2 | Gate review panel | Board Studio components | Wire existing gate components: requirement checklist with pass/fail indicators per requirement (green check for satisfied, red x for not). Show requirement type icon (run, artifact, metric, role). Approve/Reject/Waive buttons (visible only to users with appropriate role). Approval dialog: comment textarea (required), confirmation checkbox. Approval history: who approved, when, with what comment. Gate status badge (PENDING=gray, EVALUATING=blue-pulse, PASSED=green, FAILED=red, WAIVED=amber). For compliance gates: show both auto-check results and sign-off status. | M | 5h |
| F3 | Board readiness gauge | Board Studio components | Wire existing readiness display: circular gauge (0-100%) with color gradient (red<33%, amber<66%, green>=66%). 5-category breakdown bar chart below gauge: design (0.30), validation (0.30), compliance (0.15), manufacturing (0.10), approvals (0.15). Each category shows: weight, passed/total, percentage. Tooltip on category: list items contributing to that category. Animate gauge when value changes. Show "Ready for Release" badge when score >= 100%. | S | 3h |

---

## Section 6: API Contracts

### GET /v0/boards/{id}/cards/{cardId}/evidence -- List CardEvidence
```json
// Response 200
{
  "evidence": [
    {
      "id": "uuid",
      "card_id": "uuid",
      "run_id": "uuid",
      "artifact_id": "uuid",
      "criterion_id": "uuid",
      "metric_key": "max_stress",
      "metric_value": 187.3,
      "metric_unit": "MPa",
      "threshold": 250,
      "operator": "lt",
      "evaluation": "pass",
      "passed": true,
      "margin": 62.7,
      "borderline": false,
      "metadata": {
        "solver": "fea-solver@3.1",
        "mesh_elements": 45000,
        "run_duration": "8m32s"
      },
      "version": 1,
      "created_at": "2026-05-20T14:30:00Z"
    },
    {
      "id": "uuid",
      "card_id": "uuid",
      "run_id": "uuid",
      "criterion_id": "uuid",
      "metric_key": "safety_factor",
      "metric_value": 1.22,
      "metric_unit": "",
      "threshold": 1.2,
      "operator": "gt",
      "evaluation": "warning",
      "passed": true,
      "margin": 0.02,
      "borderline": true,
      "metadata": { "note": "Borderline: margin 1.7% of threshold" },
      "version": 1,
      "created_at": "2026-05-20T14:30:00Z"
    }
  ],
  "total": 2,
  "all_passed": true,
  "composite_score": 0.85,
  "borderline_count": 1
}
```

### POST /v0/gates/{id}/evaluate -- Evaluate Gate
```json
// Response 200
{
  "gate": {
    "id": "uuid",
    "board_id": "uuid",
    "name": "Structural Evidence Gate",
    "type": "evidence",
    "status": "passed",
    "advisory": false,
    "evaluated_at": "2026-05-20T14:35:00Z",
    "requirements": [
      {
        "id": "uuid",
        "type": "run_succeeded",
        "config": { "card_id": "uuid" },
        "satisfied": true,
        "detail": "FEA Stress Test run completed successfully"
      },
      {
        "id": "uuid",
        "type": "all_criteria_passed",
        "config": { "card_id": "uuid" },
        "satisfied": true,
        "detail": "3/3 acceptance criteria passed"
      },
      {
        "id": "uuid",
        "type": "artifact_exists",
        "config": { "artifact_name": "stress_map" },
        "satisfied": true,
        "detail": "stress_map_v2.vtk exists (8.2 MB)"
      }
    ]
  }
}
```

### POST /v0/gates/{id}/approve -- Manual Approval
```json
// Request
{
  "requirement_id": "uuid",
  "decision": "approved",
  "comment": "CFD results confirm thermal compliance. Max temperature 78C well within 85C limit."
}

// Response 200
{
  "gate_id": "uuid",
  "approval": {
    "id": "uuid",
    "requirement_id": "uuid",
    "actor": "user:santhosh",
    "role": "lead_engineer",
    "decision": "approved",
    "comment": "CFD results confirm thermal compliance...",
    "created_at": "2026-05-21T10:00:00Z"
  },
  "gate_status": "passed",
  "remaining_requirements": 0
}
```

### POST /v0/boards/{id}/escalate-mode -- Escalate Board Mode
```json
// Request
{
  "target_mode": "study"
}

// Response 200
{
  "board_id": "uuid",
  "previous_mode": "explore",
  "current_mode": "study",
  "escalated_at": "2026-05-21T12:00:00Z",
  "validation": {
    "cards_exist": true,
    "gates_exist": true,
    "all_gates_passed": null
  }
}

// Error 409 (backward escalation)
{
  "error": "invalid_escalation",
  "message": "Cannot de-escalate from 'study' to 'explore'. Mode escalation is one-way only.",
  "current_mode": "study",
  "requested_mode": "explore",
  "allowed_escalations": ["release"]
}

// Error 422 (precondition not met)
{
  "error": "escalation_precondition_failed",
  "message": "Cannot escalate to 'release': 2 gates have not passed",
  "failing_gates": [
    { "name": "Thermal Evidence Gate", "status": "pending" },
    { "name": "Release Compliance Gate", "status": "pending" }
  ]
}
```

### GET /v0/boards/{id}/readiness -- Board Readiness Breakdown
```json
// Response 200
{
  "board_id": "uuid",
  "readiness_score": 0.500,
  "readiness_pct": 50,
  "categories": [
    {
      "name": "design",
      "weight": 0.30,
      "passed": 3,
      "total": 4,
      "rate": 0.75,
      "weighted_score": 0.225,
      "items": [
        { "id": "uuid", "title": "FEA Stress Test", "type": "card", "status": "completed" },
        { "id": "uuid", "title": "CFD Flow Analysis", "type": "card", "status": "completed" },
        { "id": "uuid", "title": "Fatigue Analysis", "type": "card", "status": "completed" },
        { "id": "uuid", "title": "DFM Check", "type": "card", "status": "draft" }
      ]
    },
    {
      "name": "validation",
      "weight": 0.30,
      "passed": 2,
      "total": 3,
      "rate": 0.667,
      "weighted_score": 0.200,
      "items": [
        { "id": "uuid", "title": "Structural Evidence Gate", "type": "gate", "status": "passed" },
        { "id": "uuid", "title": "Fatigue Validation Gate", "type": "gate", "status": "passed" },
        { "id": "uuid", "title": "Thermal Evidence Gate", "type": "gate", "status": "pending" }
      ]
    },
    {
      "name": "compliance",
      "weight": 0.15,
      "passed": 0,
      "total": 1,
      "rate": 0.00,
      "weighted_score": 0.000,
      "items": [
        { "id": "uuid", "title": "Release Compliance Gate", "type": "gate", "status": "pending" }
      ]
    },
    {
      "name": "manufacturing",
      "weight": 0.10,
      "passed": 0,
      "total": 1,
      "rate": 0.00,
      "weighted_score": 0.000,
      "items": [
        { "id": "uuid", "title": "DFM Check", "type": "card", "status": "draft" }
      ]
    },
    {
      "name": "approvals",
      "weight": 0.15,
      "passed": 1,
      "total": 2,
      "rate": 0.50,
      "weighted_score": 0.075,
      "items": [
        { "id": "uuid", "title": "Lead Engineer sign-off", "type": "signoff", "status": "obtained" },
        { "id": "uuid", "title": "Quality Manager sign-off", "type": "signoff", "status": "pending" }
      ]
    }
  ]
}
```

---

## Section 7: Data Models & Migrations

### Existing Tables (verify schema)
```sql
-- card_evidence table
CREATE TABLE card_evidence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    run_id          UUID NOT NULL,
    artifact_id     UUID,
    criterion_id    UUID,
    metric_key      VARCHAR(200) NOT NULL,
    metric_value    JSONB NOT NULL,
    metric_unit     VARCHAR(50) NOT NULL DEFAULT '',
    threshold       JSONB,
    operator        VARCHAR(20),
    evaluation      VARCHAR(20) NOT NULL DEFAULT 'info'
                    CHECK (evaluation IN ('pass', 'fail', 'warning', 'info')),
    passed          BOOLEAN NOT NULL DEFAULT false,
    metadata        JSONB NOT NULL DEFAULT '{}',
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_evidence_card ON card_evidence(card_id);
CREATE INDEX idx_card_evidence_run ON card_evidence(run_id);
CREATE INDEX idx_card_evidence_metric ON card_evidence(metric_key);

-- gates table
CREATE TABLE gates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id    UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name        VARCHAR(500) NOT NULL,
    type        VARCHAR(20) NOT NULL
                CHECK (type IN ('evidence', 'review', 'compliance')),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'evaluating', 'passed', 'failed', 'waived')),
    auto_evaluate BOOLEAN NOT NULL DEFAULT false,
    waivable    BOOLEAN NOT NULL DEFAULT true,
    timeout_hours INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gates_board ON gates(board_id);
CREATE INDEX idx_gates_status ON gates(status);

-- gate_requirements table
CREATE TABLE gate_requirements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id     UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL
                CHECK (type IN ('run_succeeded', 'artifact_exists', 'metric_threshold',
                               'all_criteria_passed', 'role_signed', 'all_prior_gates_passed')),
    config      JSONB NOT NULL DEFAULT '{}',
    satisfied   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gate_requirements_gate ON gate_requirements(gate_id);

-- gate_approvals table
CREATE TABLE gate_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id         UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    requirement_id  UUID REFERENCES gate_requirements(id),
    actor           VARCHAR(200) NOT NULL,
    role            VARCHAR(100),
    decision        VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'waived')),
    comment         TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gate_approvals_gate ON gate_approvals(gate_id);
```

---

## Section 8: NATS Subjects & Events

| Subject | Direction | Payload |
|---------|-----------|---------|
| `airaie.results.completed` | Consumed | `{ run_id, card_id, board_id, outputs[], metrics{}, status }` -- triggers evidence collection |

| Audit Event | Trigger | Payload |
|-------------|---------|---------|
| `card_evidence.created` | Evidence Step 5 | `{ evidence_id, card_id, board_id, metric_key, value, evaluation }` |
| `card_evidence.borderline` | Evidence Step 7 | `{ evidence_id, card_id, metric_key, margin_pct }` |
| `card_evidence.failed` | Evidence Step 5 | `{ evidence_id, card_id, metric_key, value, threshold, operator }` |
| `gate.evaluated` | Gate evaluation | `{ gate_id, board_id, status, requirements_summary }` |
| `gate.approved` | Manual approval | `{ gate_id, board_id, actor, role, decision, comment }` |
| `gate.rejected` | Manual rejection | `{ gate_id, board_id, actor, role, decision, comment }` |
| `gate.waived` | Manual waiver | `{ gate_id, board_id, actor, justification }` |
| `board.mode_escalated` | Mode escalation | `{ board_id, old_mode, new_mode, actor }` |

---

## Section 9: Testing Strategy

### Unit Tests
| Test | Description |
|------|-------------|
| TestEvidence_Step1_WithCardID | Event with card_id -> process |
| TestEvidence_Step1_WithoutCardID | Event without card_id -> ignore |
| TestEvidence_Step2_Dedup | Same run_id+card_id -> process only once |
| TestEvidence_Step3_LoadNodes | Load evidence PlanNodes from plan |
| TestEvidence_Step4_ExtractMetrics | Parse JSON metrics from run output |
| TestEvidence_Step5_CreateRecords | Create CardEvidence with all 8 operators |
| TestEvidence_Step6_TrustUpdate | Tool success_rate updated (Bayesian) |
| TestEvidence_Step7_Borderline | Margin < 10% -> warning |
| TestEvidence_Step7_NotBorderline | Margin > 10% -> pass |
| TestEvidence_Step8_EscalateStudy | Borderline in study mode -> escalate |
| TestEvidence_Step8_NoEscalateExplore | Borderline in explore -> no escalation |
| TestEvidence_Step9_AuditEvents | Audit events emitted for each record |
| TestEvidence_Step10_CacheInvalidated | Readiness cache cleared |
| TestGateEval_EvidenceGate_AllPass | All requirements met -> PASSED |
| TestGateEval_EvidenceGate_Partial | Some requirements not met -> PENDING |
| TestGateEval_RunSucceeded | Card completed -> satisfied |
| TestGateEval_ArtifactExists | Artifact on board -> satisfied |
| TestGateEval_MetricThreshold | CardEvidence passes threshold -> satisfied |
| TestGateEval_AllCriteriaPassed | All card evidence passed -> satisfied |
| TestGateEval_RoleSigned | Approval with role exists -> satisfied |
| TestGateEval_AllPriorGates | All other gates passed -> satisfied |
| TestGateApproval_Approve | Reviewer approves -> check gate status |
| TestGateApproval_Reject | Reviewer rejects -> gate FAILED |
| TestGateApproval_Waive | Waiver with justification -> gate WAIVED |
| TestBoardMode_ExploreAdvisory | Gates shown but not enforced |
| TestBoardMode_StudyEnforced | Gates block progression |
| TestBoardMode_ReleaseAllPass | All gates must be passed |
| TestBoardMode_EscalateForward | Explore -> Study -> Release works |
| TestBoardMode_EscalateBackward | Study -> Explore rejected |
| TestBoardMode_EscalateRequirements | Study->Release requires all gates passed |
| TestBoardMode_AgentThreshold | Explore=0.5, Study=0.75, Release=0.90 |
| TestBoardMode_AdditiveThreshold | Board can only tighten agent threshold |
| TestReadiness_EmptyBoard | 0% |
| TestReadiness_AllComplete | 100% |
| TestReadiness_Partial | Weighted calculation matches expected |
| TestReadiness_ZeroCategory | Empty category -> rate=0 |
| TestReadiness_CacheInvalidation | New evidence -> recalculate |

### Integration Tests
| Test | Description |
|------|-------------|
| TestEvidenceCollectionE2E | Run completes -> evidence auto-collected -> CardEvidence records created -> gate auto-evaluated |
| TestGateApprovalFlowE2E | Evidence gate passes -> review gate awaits -> reviewer approves -> compliance gate checks sign-offs -> all pass |
| TestBoardModeEscalationE2E | Create board in explore -> add cards+gates -> escalate to study -> complete evidence -> escalate to release |
| TestReadinessProgressionE2E | Board readiness progresses from 0% to 100% as cards complete and gates pass |

---

## Section 10: Acceptance Criteria

- [ ] Evidence auto-collected when workflow runs complete (10-step process verified)
- [ ] CardEvidence evaluates correctly against all 8 acceptance criteria operators
- [ ] Borderline metrics detected (within 10% of threshold) and flagged as "warning"
- [ ] Trust scores updated for tools after each run completion
- [ ] Gates auto-evaluate for evidence gates when evidence arrives
- [ ] Gate requirement types all work: run_succeeded, artifact_exists, metric_threshold, all_criteria_passed, role_signed, all_prior_gates_passed
- [ ] Manual approval works for review gates (approve/reject/waive with comment)
- [ ] Compliance gates require both auto-checks and manual sign-offs
- [ ] Board readiness uses weighted 5-category formula (design 0.30, validation 0.30, compliance 0.15, manufacturing 0.10, approvals 0.15)
- [ ] Readiness returns 0% for empty boards, 100% for fully complete boards
- [ ] Mode escalation is one-way (Explore->Study->Release, never backward)
- [ ] Explore mode: gates advisory only
- [ ] Study mode: gates enforced, IntentSpecs must be locked
- [ ] Release mode: all gates must pass, no exceptions
- [ ] Agent threshold injection: ADDITIVE (board mode can only tighten, never loosen)
- [ ] Audit events emitted for all evidence, gate, and mode changes

---

## Section 11: Dependencies & Risks

### Dependencies
| Dependency | Source | Impact if Missing |
|------------|--------|-------------------|
| AcceptanceCriterion evaluation | Sprint 4.1 | Cannot evaluate evidence |
| Card state machine | Sprint 4.2 | Cannot update card status on evidence |
| Plan execution -> run completion | Sprint 4.3 | No runs to collect evidence from |
| NATS airaie.results.completed | Phase 2 | Cannot trigger evidence collection |
| Artifact service | Phase 1 | Cannot check artifact_exists requirement |
| Tool trust update | Phase 1 | Cannot update success_rate |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Evidence collection race condition | Medium | High | Dedup on run_id+card_id, use DB transaction |
| Gate evaluation ordering | Medium | Medium | Re-evaluate gates in dependency order |
| Readiness cache staleness | Low | Low | Invalidate aggressively on any change |
| Borderline threshold sensitivity | Medium | Low | Make 10% configurable per board |

---

## Section 12: Definition of Done

- [ ] 10-step evidence collection pipeline tested end-to-end
- [ ] All 6 gate requirement types verified
- [ ] Manual approval flow works for review and compliance gates
- [ ] Board mode enforcement verified for all 3 modes
- [ ] One-way escalation enforced with correct preconditions
- [ ] Readiness calculation matches weighted formula exactly
- [ ] Frontend evidence panel renders with evaluation badges
- [ ] Frontend gate review panel renders with approval buttons
- [ ] Frontend readiness gauge renders with 5-category breakdown
- [ ] Agent threshold injection tested with ADDITIVE logic
- [ ] All audit events emitted correctly
- [ ] Code reviewed and merged to main

---

# ============================================================
# SPRINT 4.5: Release Packet & Board Context
# ============================================================

**Sprint Number:** 4.5
**Title:** Release Packet & Board Context
**Duration:** 2-3 days (~2026-05-23 to 2026-05-26)
**Goal:** Build release packets for manufacturing handoff and provide board context to workflows and agents, completing the full governance loop from intent to release.

---

## Section 1: Objectives & Scope

### Primary Objectives
1. Implement release packet generation (lock artifacts -> BOM -> proof bundle -> sign-offs -> ZIP)
2. Wire board context into workflow expressions (`$board.meta.*`, `$board.artifacts.*`)
3. Wire board context into agent prompts (board_name, goal, mode, evidence, gates)
4. Verify scheduler completion -> evidence collection chain
5. Wire frontend release packet builder page and board mode escalation UI

### Scope Boundaries
- **In scope:** Release packet, board context in expressions and agent prompts, scheduler->evidence chain
- **Out of scope:** Board composition/parent-child (Phase 7), Board replay/fork (Phase 7)
- **Depends on:** Sprint 4.4 (Evidence + Gates + Mode), Phase 2 (Workflow scheduler), Phase 3 (Agent runtime)

### Success Metrics
- Release packet generated as complete ZIP with all required components
- Board context resolves correctly in workflow expressions
- Agent prompts include relevant board context
- Full chain works: scheduler completes -> evidence auto-collected

---

## Section 2: User Stories & Requirements

### US-4.5.1: Release Packet Generation
**As a** board owner in Release mode,
**I want to** build a release packet containing locked artifacts, BOM, proof bundle, and sign-offs,
**So that** manufacturing receives a complete, auditable handoff package.

**Details -- 5-Step Release Packet Generation:**
```
STEP 1: LOCK ARTIFACTS
  Purpose: Create frozen, immutable snapshots of all board artifacts
  Process:
    For each selected artifact on the board:
      a. Verify artifact exists in MinIO
      b. Compute SHA-256 hash of current content
      c. Create locked copy: copy to release-specific MinIO path
         Path: releases/{board_id}/{release_id}/{artifact_name}
      d. Store lock record: { artifact_id, locked_hash, locked_at, locked_by }
      e. Mark artifact as locked (prevent future modification)
    Locked artifacts cannot be modified or replaced.
    The SHA-256 hash serves as tamper detection.
  Output: locked_artifacts[] with SHA-256 hashes

STEP 2: GENERATE BOM (Bill of Materials)
  Purpose: Structured list of all components, materials, and specifications
  Process:
    a. Extract from board metadata (boards.meta_json):
       - material, dimensions, geometry_type, standard
    b. Extract from card results:
       - Component names, material specs, quantities
    c. Format as structured BOM:
       | Component | Material | Dimensions | Qty | Specification |
    d. Include specification references (ISO, ASTM, etc.)
  Output: BOM as JSON + rendered PDF/CSV

STEP 3: COMPILE PROOF BUNDLE
  Purpose: Comprehensive evidence of all validation activities
  Process:
    a. Collect all gate evaluations with timestamps:
       For each gate: { name, type, status, evaluated_at, requirements_satisfied }
    b. Collect all CardEvidence summaries:
       For each card: { title, intent_type, criteria, evidence[] with pass/fail }
    c. Collect all approval records:
       For each approval: { gate, actor, role, decision, comment, timestamp }
    d. Include IntentSpec summaries:
       For each locked IntentSpec: { goal, criteria, version, locked_at }
    e. Generate proof document (JSON + optional PDF)
  Output: proof_bundle.json + proof_bundle.pdf

STEP 4: COLLECT SIGN-OFFS
  Purpose: Record of all human approvals required for release
  Process:
    a. Aggregate all gate approvals from gate_approvals table
    b. For each reviewer: { name, role, gate, decision, comment, timestamp }
    c. Verify: all required sign-offs obtained (no pending role_signed requirements)
    d. If any sign-off missing -> block release packet export
  Output: sign_offs[] with audit trail

STEP 5: GENERATE ZIP ARCHIVE
  Purpose: Single downloadable package for manufacturing handoff
  Process:
    a. Create ZIP file structure:
       release-{board_name}-{version}.zip
       ├── artifacts/
       │   ├── stress_map_v2.vtk
       │   ├── mesh_output.stl
       │   └── fatigue_report.pdf
       ├── bom/
       │   ├── bom.json
       │   └── bom.csv
       ├── proof/
       │   ├── proof_bundle.json
       │   └── proof_bundle.pdf
       ├── sign_offs/
       │   └── approval_records.json
       ├── audit/
       │   └── audit_trail.json
       ├── tolerances/
       │   └── (user-uploaded GD&T files)
       └── manifest.json (SHA-256 hashes of all files)
    b. Generate manifest.json with checksums for tamper detection
    c. Upload ZIP to MinIO at releases/{board_id}/{release_id}/
    d. Return presigned download URL
  Output: release packet ZIP with download URL
```

### US-4.5.2: Board Context in Workflow Expressions
**As a** workflow designer,
**I want to** reference board data in workflow node parameters,
**So that** workflow nodes can access board metadata and artifacts dynamically.

**Details:**
```
EXPRESSION RESOLUTION:
  When a workflow run has board_id, the scheduler resolves these expressions:

  {{ $board.meta.material }}           -> "Al6061-T6"
  {{ $board.meta.threshold }}          -> 250
  {{ $board.meta.standard }}           -> "ISO 12345"
  {{ $board.meta.load_case }}          -> "500N axial"
  {{ $board.artifacts.geometry }}      -> presigned URL for art_cad_001
  {{ $board.artifacts.mesh }}          -> presigned URL for art_mesh_002
  {{ $board.mode }}                    -> "study"
  {{ $board.readiness }}               -> 0.65
  {{ $board.name }}                    -> "Structural Validation Study"
  {{ $card.intent_spec.goal }}         -> "Validate bracket stress"
  {{ $card.intent_spec.constraints }}  -> { "load": 500, "direction": "axial" }
  {{ $card.intent_spec.constraints.load }} -> 500

RESOLUTION MECHANISM:
  1. Scheduler receives node dispatch request
  2. Check if run has board_id
  3. If yes: query board API for current board state
  4. Resolve all $board.* and $card.* expressions in node parameters
  5. Pass resolved parameters to tool execution
```

### US-4.5.3: Board Context in Agent Prompts
**As an** agent running within a board context,
**I want to** see the board's current state in my prompt,
**So that** I can make informed decisions based on what has been validated.

**Details:**
```
CONTEXT INJECTION:
  When AgentRuntimeService detects run has board_id:

  Injected context (JSON in agent prompt):
  {
    "board_name": "Structural Validation Study",
    "board_goal": "Validate bracket meets ISO 12345",
    "board_mode": "study",
    "board_readiness": 0.65,
    "confidence_threshold": 0.75,
    "completed_cards": [
      { "title": "FEA Stress Test", "result": "PASS",
        "key_metrics": { "max_stress": "187.3 MPa (< 250)", "safety_factor": "1.34 (> 1.2)" } }
    ],
    "pending_cards": [
      { "title": "CFD Flow Analysis", "status": "running", "intent_type": "sim.cfd" }
    ],
    "passed_gates": ["Structural Evidence", "Fatigue Validation"],
    "pending_gates": ["Thermal Evidence", "Release Compliance"],
    "recent_evidence": [
      { "card": "FEA Stress Test", "metric": "max_stress", "value": 187.3, "evaluation": "pass" }
    ],
    "available_artifacts": [
      { "name": "bracket_v3.step", "type": "input" },
      { "name": "stress_map.vtk", "type": "result" }
    ]
  }

  Agent threshold override (ADDITIVE):
    If agent.confidence_threshold < board_mode_threshold:
      use board_mode_threshold (tighter)
    Else:
      use agent.confidence_threshold (already tighter)
```

### US-4.5.4: Scheduler Completion to Evidence Chain
**As the** system,
**I want to** verify that workflow completion automatically triggers evidence collection,
**So that** the chain from scheduler -> run complete -> evidence is seamless.

**Details:**
```
CHAIN VERIFICATION:
  1. Scheduler finalizes workflow (all nodes complete)
     -> scheduler.finalizeWorkflow(runID)
  2. Scheduler calls onRunCompleted callback
     -> scheduler.onRunCompleted(runID, status, outputs)
  3. RunService emits NATS event
     -> NATS publish: airaie.results.completed { run_id, card_id, board_id, ... }
  4. EvidenceCollectorService consumes event
     -> EvidenceCollectorService.OnRunCompleted(event)
  5. Evidence collection runs (10-step process from Sprint 4.4)
  6. Gate re-evaluation triggered
  7. Readiness recalculated

  This chain must work without manual intervention.
  Test: trigger a workflow run -> verify CardEvidence records appear automatically.
```

### US-4.5.5: Frontend Release Packet Builder
**As a** board owner in Release mode,
**I want to** build a release packet through a guided UI,
**So that** I can lock artifacts, review BOM, check proof bundle, and export ZIP.

### US-4.5.6: Frontend Board Mode Escalation UI
**As a** board owner,
**I want to** escalate the board mode through a guided UI with validation,
**So that** I understand the requirements before escalating.

---

## Section 3: Architecture & Technical Design

### Release Packet Generation Sequence

```
BoardOwner clicks "Build Release Packet"
    │
    ▼
ReleaseService.CreateReleasePacket(boardID)
    │
    ├── Verify: board.mode == "release"
    ├── Verify: all gates passed
    │
    ├── Step 1: LockArtifacts(boardID)
    │     ├── List board_attachments
    │     ├── For each: copy to releases/ path
    │     ├── Compute SHA-256 hashes
    │     └── Mark as locked
    │
    ├── Step 2: GenerateBOM(boardID)
    │     ├── Extract board metadata
    │     ├── Extract card/evidence data
    │     └── Format as JSON + CSV
    │
    ├── Step 3: CompileProofBundle(boardID)
    │     ├── Collect gate evaluations
    │     ├── Collect CardEvidence summaries
    │     ├── Collect approval records
    │     ├── Collect IntentSpec summaries
    │     └── Generate JSON + PDF
    │
    ├── Step 4: CollectSignOffs(boardID)
    │     ├── Aggregate gate_approvals
    │     ├── Verify all required sign-offs
    │     └── Block if incomplete
    │
    ├── Step 5: GenerateZIP(boardID, components)
    │     ├── Create ZIP structure
    │     ├── Include all artifacts
    │     ├── Generate manifest.json with SHA-256s
    │     ├── Upload to MinIO
    │     └── Return presigned URL
    │
    └── Return: ReleasePacket { id, url, manifest, created_at }
```

### Board Context Resolution in Scheduler

```go
// resolveboardContext resolves $board.* expressions for board-linked runs.
func (s *Scheduler) resolveBoardContext(ctx context.Context, runID uuid.UUID, params map[string]interface{}) (map[string]interface{}, error) {
    run, _ := s.runStore.Get(ctx, runID)
    if run.BoardID == nil {
        return params, nil // no board context
    }

    // Fetch board data
    board, _ := s.boardService.Get(ctx, *run.BoardID)
    readiness, _ := s.boardService.CalculateReadiness(ctx, *run.BoardID)

    // Fetch card data if available
    var card *Card
    var intentSpec *IntentSpec
    if run.CardID != nil {
        card, _ = s.cardService.Get(ctx, *run.CardID)
        if card.IntentSpecID != nil {
            intentSpec, _ = s.intentService.Get(ctx, *card.IntentSpecID)
        }
    }

    // Build context map
    boardCtx := map[string]interface{}{
        "board": map[string]interface{}{
            "name":      board.Name,
            "mode":      board.Mode,
            "readiness": readiness.Score,
            "meta":      board.MetaJSON, // full metadata map
            "artifacts": s.resolveArtifactRefs(ctx, *run.BoardID),
        },
    }
    if intentSpec != nil {
        boardCtx["card"] = map[string]interface{}{
            "intent_spec": map[string]interface{}{
                "goal":        intentSpec.Goal,
                "constraints": intentSpec.Constraints,
                "inputs":      intentSpec.Inputs,
            },
        }
    }

    // Resolve expressions in params
    resolved := resolveExpressions(params, boardCtx)
    return resolved, nil
}
```

### Agent Context Injection

```go
// injectBoardContext adds board state to agent prompt context.
func (s *AgentRuntimeService) injectBoardContext(ctx context.Context, agentCtx *AgentContext, boardID uuid.UUID) error {
    board, _ := s.boardService.Get(ctx, boardID)
    readiness, _ := s.boardService.CalculateReadiness(ctx, boardID)
    cards, _ := s.cardService.ListByBoard(ctx, boardID)
    gates, _ := s.gateService.ListByBoard(ctx, boardID)

    // Separate completed and pending cards
    completedCards := []map[string]interface{}{}
    pendingCards := []map[string]interface{}{}
    for _, c := range cards {
        entry := map[string]interface{}{
            "title":       c.Title,
            "status":      c.Status,
            "intent_type": c.IntentType,
        }
        if c.Status == "completed" {
            evidence, _ := s.evidenceService.ListByCard(ctx, c.ID)
            metrics := map[string]string{}
            for _, ev := range evidence {
                metrics[ev.MetricKey] = fmt.Sprintf("%v %s (%s)", ev.MetricValue, ev.MetricUnit, ev.Evaluation)
            }
            entry["key_metrics"] = metrics
            entry["result"] = "PASS"
            completedCards = append(completedCards, entry)
        } else {
            pendingCards = append(pendingCards, entry)
        }
    }

    // Separate passed and pending gates
    passedGates := []string{}
    pendingGates := []string{}
    for _, g := range gates {
        if g.Status == "passed" || g.Status == "waived" {
            passedGates = append(passedGates, g.Name)
        } else {
            pendingGates = append(pendingGates, g.Name)
        }
    }

    // Recent evidence
    recentEvidence := []map[string]interface{}{}
    allEvidence, _ := s.evidenceService.ListByBoard(ctx, boardID)
    for i, ev := range allEvidence {
        if i >= 10 { break } // last 10
        recentEvidence = append(recentEvidence, map[string]interface{}{
            "card":       ev.CardTitle,
            "metric":     ev.MetricKey,
            "value":      ev.MetricValue,
            "evaluation": ev.Evaluation,
        })
    }

    // Inject into agent context
    agentCtx.BoardContext = &BoardContext{
        BoardName:       board.Name,
        BoardGoal:       board.Goal,
        BoardMode:       board.Mode,
        BoardReadiness:  readiness.Score,
        CompletedCards:  completedCards,
        PendingCards:    pendingCards,
        PassedGates:     passedGates,
        PendingGates:    pendingGates,
        RecentEvidence:  recentEvidence,
    }

    // Agent threshold override (ADDITIVE)
    modeThresholds := map[string]float64{
        "explore": 0.50,
        "study":   0.75,
        "release": 0.90,
    }
    boardThreshold := modeThresholds[board.Mode]
    if boardThreshold > agentCtx.ConfidenceThreshold {
        agentCtx.ConfidenceThreshold = boardThreshold
    }

    return nil
}
```

---

## Section 4: Backend Tasks

| # | Task | File | What Exists | What to Do | Complexity | Est. |
|---|------|------|-------------|------------|------------|------|
| B1 | Release packet generation | `internal/service/release.go` | Release service exists (partial) | Implement 5-step process: (1) Lock artifacts -- copy to release path in MinIO, compute SHA-256, mark as locked. (2) Generate BOM from board metadata + card results, format as JSON+CSV. (3) Compile proof bundle -- aggregate gate evaluations, CardEvidence summaries, approval records, IntentSpec summaries. (4) Collect sign-offs -- aggregate gate_approvals, verify completeness, block if missing. (5) Generate ZIP -- create structured archive with manifest.json (SHA-256 hashes), upload to MinIO, return presigned download URL. Test: full release packet for a board with 4 cards, 4 gates, multiple artifacts. Verify: ZIP structure, manifest integrity, locked artifacts immutable. | L | 8h |
| B2 | Board context in workflow expressions | `internal/workflow/scheduler.go` | Not yet wired | Implement resolveBoardContext: when run has board_id, query board API, resolve `{{ $board.meta.* }}`, `{{ $board.artifacts.* }}`, `{{ $board.mode }}`, `{{ $board.readiness }}`, `{{ $card.intent_spec.* }}` expressions in node parameters before dispatch. Test: create board with metadata -> create workflow with board expressions -> run -> verify expressions resolved to actual values. | M | 4h |
| B3 | Board context in agent prompts | `internal/service/runtime.go` | Partial implementation | Implement injectBoardContext: when agent run has board_id, inject board_name, goal, mode, completed_cards (with key_metrics), pending_cards, passed_gates, pending_gates, recent_evidence, available_artifacts into agent context. Implement threshold override (ADDITIVE: board mode can only tighten, never loosen). Test: agent in study mode gets threshold 0.75, agent in release mode gets 0.90, agent with own threshold 0.85 in study mode keeps 0.85. | M | 4h |
| B4 | Scheduler completion to evidence chain | `internal/workflow/scheduler.go` | onRunCompleted callback exists | Verify complete chain: scheduler.finalizeWorkflow -> onRunCompleted -> RunService emits airaie.results.completed -> EvidenceCollectorService.OnRunCompleted -> CardEvidence created -> gate re-evaluated -> readiness recalculated. Test end-to-end: trigger workflow run -> wait for completion -> verify CardEvidence records exist -> verify gate status updated -> verify readiness changed. | M | 4h |

---

## Section 5: Frontend Tasks

| # | Task | File | What to Do | Complexity | Est. |
|---|------|------|------------|------------|------|
| F1 | Release Packet builder page | Board Studio pages (ReleasePacketPage) | Wire existing page with guided multi-step flow: Step 1 -- Artifact locking: checklist of all board artifacts with lock toggle, SHA-256 display, size, type. "Lock All" button. Step 2 -- BOM viewer: table with component, material, dimensions, qty, spec. Edit button for manual additions. Step 3 -- Tolerance attachment: file upload zone for GD&T drawings and tolerance specs. Step 4 -- Proof bundle: auto-generated summary of all gate evaluations and CardEvidence. Expandable sections per gate. Step 5 -- Sign-off records: table of all approvals (who, role, gate, decision, comment, timestamp). Step 6 -- Export: "Generate Release Packet" button -> loading -> download link for ZIP. Show manifest preview before export. Disable export if any required sign-offs missing. | L | 7h |
| F2 | Board mode escalation UI | Board Studio components | Wire existing mode dropdown: current mode display (Explore=green, Study=amber, Release=red). Escalation button with validation: Explore->Study requires cards+gates (show count), Study->Release requires all gates passed (show status). Confirmation dialog with checklist: "You are about to escalate to {mode}. This action cannot be undone." Show what changes: "Gates will become enforced", "IntentSpecs must be locked", "All gates must pass". Disable backward escalation (grayed out with tooltip). Show mode history in audit trail section. | M | 4h |

---

## Section 6: API Contracts

### POST /v0/boards/{id}/release-packet -- Build Release Packet
```json
// Request
{
  "artifact_ids": ["uuid1", "uuid2", "uuid3"],
  "bom_overrides": {
    "additional_components": [
      { "component": "Fastener M6", "material": "Steel 8.8", "dimensions": "M6x20", "qty": 8, "spec": "ISO 4762" }
    ]
  },
  "tolerance_attachment_ids": ["uuid-tol-1"],
  "notes": "Release for manufacturing batch #2026-05"
}

// Response 201
{
  "release_packet": {
    "id": "uuid",
    "board_id": "uuid",
    "status": "generated",
    "version": 1,
    "created_at": "2026-05-25T10:00:00Z",
    "created_by": "user:santhosh",
    "components": {
      "locked_artifacts": [
        { "artifact_id": "uuid1", "name": "stress_map_v2.vtk", "size_bytes": 8600000, "sha256": "a1b2c3..." },
        { "artifact_id": "uuid2", "name": "mesh_output.stl", "size_bytes": 3200000, "sha256": "b2c3d4..." },
        { "artifact_id": "uuid3", "name": "fatigue_report.pdf", "size_bytes": 1100000, "sha256": "c3d4e5..." }
      ],
      "bom": {
        "components": [
          { "component": "Base Plate", "material": "Al6061-T6", "dimensions": "160x80x5mm", "qty": 1, "spec": "ISO 12345" },
          { "component": "Fastener M6", "material": "Steel 8.8", "dimensions": "M6x20", "qty": 8, "spec": "ISO 4762" }
        ]
      },
      "proof_bundle": {
        "gates": [
          { "name": "Structural Evidence Gate", "type": "evidence", "status": "passed", "evaluated_at": "..." },
          { "name": "Thermal Evidence Gate", "type": "review", "status": "passed", "approved_by": "santhosh" },
          { "name": "Fatigue Validation Gate", "type": "evidence", "status": "passed" },
          { "name": "Release Compliance Gate", "type": "compliance", "status": "passed", "sign_offs": 2 }
        ],
        "evidence_summary": {
          "total_metrics": 8,
          "passed": 8,
          "failed": 0,
          "warnings": 1
        },
        "intent_specs": [
          { "card": "FEA Stress Test", "goal": "Validate structural stress", "version": 1, "locked_at": "..." }
        ]
      },
      "sign_offs": [
        { "name": "Santhosh", "role": "lead_engineer", "gate": "Thermal Evidence", "decision": "approved", "timestamp": "..." },
        { "name": "Maria Chen", "role": "quality_manager", "gate": "Release Compliance", "decision": "approved", "timestamp": "..." },
        { "name": "James Wilson", "role": "project_lead", "gate": "Release Compliance", "decision": "approved", "timestamp": "..." }
      ],
      "audit_event_count": 35
    },
    "manifest": {
      "files": [
        { "path": "artifacts/stress_map_v2.vtk", "sha256": "a1b2c3...", "size": 8600000 },
        { "path": "artifacts/mesh_output.stl", "sha256": "b2c3d4...", "size": 3200000 },
        { "path": "bom/bom.json", "sha256": "d4e5f6...", "size": 1200 },
        { "path": "proof/proof_bundle.json", "sha256": "e5f6g7...", "size": 5600 }
      ],
      "total_size_bytes": 25100000,
      "generated_at": "2026-05-25T10:05:00Z"
    },
    "download_url": "https://minio.airaie.local/releases/board_id/release_id/structural-validation-release-v1.zip?...",
    "download_url_expires_at": "2026-05-25T22:05:00Z"
  }
}
```

### GET /v0/boards/{id}/context -- Board Context (for scheduler/agent)
```json
// Response 200
{
  "board": {
    "id": "uuid",
    "name": "Structural Validation Study",
    "mode": "study",
    "readiness": 0.65,
    "meta": {
      "material": "Al6061-T6",
      "geometry_type": "bracket",
      "dimensions": "160x80x5mm",
      "load_case": "500N axial",
      "standard": "ISO 12345",
      "threshold_stress_mpa": 250
    },
    "artifacts": {
      "geometry": { "id": "art_cad_001", "name": "bracket_v3.step", "url": "presigned..." },
      "mesh": { "id": "art_mesh_002", "name": "mesh_output.stl", "url": "presigned..." },
      "stress_map": { "id": "art_stress_003", "name": "stress_map_v2.vtk", "url": "presigned..." }
    }
  },
  "card": {
    "intent_spec": {
      "goal": "Validate structural stress under 500N axial load",
      "constraints": { "load": 500, "unit": "N", "direction": "axial" },
      "inputs": [...]
    }
  },
  "completed_cards": [...],
  "pending_cards": [...],
  "passed_gates": [...],
  "pending_gates": [...],
  "recent_evidence": [...]
}
```

---

## Section 7: Data Models & Migrations

### New/Updated Tables
```sql
-- release_packets table (may need creation or verification)
CREATE TABLE IF NOT EXISTS release_packets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    version         INT NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'generating', 'generated', 'exported')),
    locked_artifacts JSONB NOT NULL DEFAULT '[]',
    bom             JSONB NOT NULL DEFAULT '{}',
    proof_bundle    JSONB NOT NULL DEFAULT '{}',
    sign_offs       JSONB NOT NULL DEFAULT '[]',
    manifest        JSONB NOT NULL DEFAULT '{}',
    download_path   VARCHAR(1000),
    notes           TEXT NOT NULL DEFAULT '',
    created_by      VARCHAR(200) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_release_packets_board ON release_packets(board_id);

-- locked_artifacts table (for individual artifact lock records)
CREATE TABLE IF NOT EXISTS locked_artifacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_packet_id UUID NOT NULL REFERENCES release_packets(id) ON DELETE CASCADE,
    artifact_id     UUID NOT NULL,
    original_path   VARCHAR(1000) NOT NULL,
    locked_path     VARCHAR(1000) NOT NULL,
    sha256_hash     VARCHAR(64) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    locked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_by       VARCHAR(200) NOT NULL
);

CREATE INDEX idx_locked_artifacts_release ON locked_artifacts(release_packet_id);
CREATE INDEX idx_locked_artifacts_artifact ON locked_artifacts(artifact_id);
```

---

## Section 8: NATS Subjects & Events

| Subject | Direction | Purpose |
|---------|-----------|---------|
| `airaie.results.completed` | Consumed by EvidenceCollector | Triggers evidence chain (verified in B4) |
| `airaie.execution.completed` | Published by Scheduler | Full ExecutionPlan completion |

| Audit Event | Trigger | Payload |
|-------------|---------|---------|
| `release_packet.created` | POST /v0/boards/{id}/release-packet | `{ release_id, board_id, artifact_count, created_by }` |
| `release_packet.exported` | ZIP download first accessed | `{ release_id, board_id, download_by }` |
| `artifact.locked` | Release Step 1 | `{ artifact_id, release_id, sha256, locked_by }` |
| `board.context_resolved` | Scheduler resolves expressions | `{ run_id, board_id, expressions_count }` |

---

## Section 9: Testing Strategy

### Unit Tests
| Test | Description |
|------|-------------|
| TestRelease_Step1_LockArtifacts | Artifacts copied, SHA-256 computed, marked locked |
| TestRelease_Step1_AlreadyLocked | Re-locking same artifact -> idempotent |
| TestRelease_Step2_GenerateBOM | BOM from metadata + card results |
| TestRelease_Step3_ProofBundle | Gate evaluations + evidence + approvals compiled |
| TestRelease_Step4_SignOffs | All sign-offs aggregated, missing detected |
| TestRelease_Step4_MissingSignOff | Block export when sign-off missing |
| TestRelease_Step5_GenerateZIP | Valid ZIP structure with manifest |
| TestRelease_Step5_ManifestHashes | All files have correct SHA-256 in manifest |
| TestRelease_RequiresReleaseMode | Reject if board.mode != "release" |
| TestRelease_RequiresAllGatesPassed | Reject if any gate not passed |
| TestBoardContext_ResolveMetaExpr | `$board.meta.material` -> "Al6061-T6" |
| TestBoardContext_ResolveArtifactExpr | `$board.artifacts.geometry` -> presigned URL |
| TestBoardContext_ResolveModeExpr | `$board.mode` -> "study" |
| TestBoardContext_ResolveReadiness | `$board.readiness` -> 0.65 |
| TestBoardContext_ResolveIntentSpec | `$card.intent_spec.goal` -> goal text |
| TestBoardContext_ResolveNestedConstraint | `$card.intent_spec.constraints.load` -> 500 |
| TestBoardContext_NoBoardID | No board_id -> expressions unchanged |
| TestAgentContext_InjectBoardInfo | Agent prompt includes board context |
| TestAgentContext_ThresholdExplore | Board explore -> threshold 0.50 |
| TestAgentContext_ThresholdStudy | Board study -> threshold 0.75 |
| TestAgentContext_ThresholdRelease | Board release -> threshold 0.90 |
| TestAgentContext_AdditiveThreshold | Agent 0.85 + study 0.75 -> agent keeps 0.85 |
| TestAgentContext_TightenThreshold | Agent 0.60 + release 0.90 -> use 0.90 |
| TestSchedulerChain_CompletionToEvidence | Run complete -> evidence created |
| TestSchedulerChain_EvidenceToGate | Evidence -> gate re-evaluated |
| TestSchedulerChain_GateToReadiness | Gate passed -> readiness updated |

### Integration Tests
| Test | Description |
|------|-------------|
| TestReleasePacketE2E | Complete board with all evidence/gates -> build release packet -> verify ZIP contents |
| TestBoardContextInWorkflow | Create board with metadata -> workflow with $board expressions -> run -> verify resolved |
| TestBoardContextInAgent | Create board -> agent card -> run agent -> verify prompt includes board context |
| TestFullChainE2E | Create board -> card -> lock intent -> generate plan -> execute -> evidence collected -> gate passed -> escalate to release -> build release packet |

---

## Section 10: Acceptance Criteria

- [ ] Release packet generated as ZIP with all 5 components (locked artifacts, BOM, proof bundle, sign-offs, audit trail)
- [ ] Artifacts locked with SHA-256 hashes; locked artifacts cannot be modified
- [ ] BOM generated from board metadata and card results
- [ ] Proof bundle includes all gate evaluations, CardEvidence, and IntentSpec summaries
- [ ] Sign-offs verified complete before export allowed
- [ ] Manifest.json includes SHA-256 hashes for all files in ZIP (tamper detection)
- [ ] Release packet requires board.mode == "release" and all gates passed
- [ ] Board context resolves correctly in workflow expressions ($board.meta.*, $board.artifacts.*, etc.)
- [ ] Board context injected into agent prompts with full board state
- [ ] Agent threshold follows ADDITIVE logic (board mode only tightens, never loosens)
- [ ] Scheduler completion -> evidence collection chain works end-to-end without manual intervention
- [ ] Frontend release packet builder walks through all steps with guided UI
- [ ] Frontend mode escalation shows validation requirements and confirmation dialog
- [ ] One-way escalation enforced in UI (backward option disabled)

---

## Section 11: Dependencies & Risks

### Dependencies
| Dependency | Source | Impact if Missing |
|------------|--------|-------------------|
| Evidence collection | Sprint 4.4 | No CardEvidence for proof bundle |
| Gate evaluation | Sprint 4.4 | Cannot verify all gates passed |
| Board mode | Sprint 4.4 | Cannot enforce release mode requirement |
| Workflow scheduler | Phase 2 | Cannot wire expression resolution |
| Agent runtime | Phase 3 | Cannot inject board context |
| MinIO/S3 | Infrastructure | Cannot lock artifacts or generate ZIP |
| Readiness calculation | Sprint 4.4 | Cannot provide $board.readiness |

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Large ZIP generation timeout | Medium | Medium | Stream ZIP generation, use background job for large boards |
| MinIO copy failure during artifact locking | Low | High | Transactional: rollback all locks if any copy fails |
| Expression resolution performance | Medium | Low | Cache board context per run (board state unlikely to change mid-run) |
| Agent context too large for prompt | Low | Medium | Limit recent_evidence to last 10, truncate long lists |

---

## Section 12: Definition of Done

- [ ] Release packet generation works end-to-end (5-step process)
- [ ] ZIP file contains correct structure with all components
- [ ] Manifest.json has valid SHA-256 hashes
- [ ] Board context resolves in workflow expressions
- [ ] Board context injected into agent prompts
- [ ] Agent threshold ADDITIVE override tested
- [ ] Scheduler -> evidence chain verified end-to-end
- [ ] Frontend release packet builder renders all steps
- [ ] Frontend mode escalation UI with validation
- [ ] Error handling: release blocked when preconditions not met
- [ ] All audit events emitted
- [ ] Code reviewed and merged to main

---

# ============================================================
# PHASE 4 SUMMARY & CROSS-SPRINT DEPENDENCIES
# ============================================================

## Sprint Dependency Chain

```
Sprint 4.1 (IntentSpec)
    │
    │ IntentSpec CRUD + lifecycle
    │ IntentType registry
    │ AcceptanceCriterion evaluation
    │
    ▼
Sprint 4.2 (Cards)
    │
    │ Card state machine (8 states)
    │ Card dependency DAG
    │ 6 card types
    │
    ▼
Sprint 4.3 (Plans)
    │
    │ 9-step plan generation
    │ Plan compilation
    │ Plan execution chain
    │ Preflight validation
    │
    ▼
Sprint 4.4 (Evidence & Gates)
    │
    │ 10-step evidence collection
    │ CardEvidence evaluation
    │ Gate auto-evaluation
    │ Manual approval
    │ Board mode enforcement
    │ Readiness calculation
    │
    ▼
Sprint 4.5 (Release & Context)
    │
    │ Release packet (5 steps)
    │ Board context in expressions
    │ Board context in agent prompts
    │ Scheduler -> evidence chain
    │
    ▼
Phase 4 COMPLETE
    │
    ▼
Phase 5: Integration & E2E
```

## Key Metrics Across Phase 4

| Metric | Count |
|--------|-------|
| Total backend tasks | 21 |
| Total frontend tasks | 12 |
| Total unit tests (estimated) | 90+ |
| Total integration tests | 14 |
| New/verified API endpoints | 15+ |
| NATS events | 20+ audit event types |
| Data models | 8 tables verified/created |

## Phase 4 Exit Criteria

- [ ] IntentSpec lifecycle fully operational (create -> lock -> execute -> complete/fail)
- [ ] All 6 card types working with 8-status state machine
- [ ] 9-step plan generation produces executable plans from any IntentSpec+Pipeline
- [ ] 10-step evidence collection auto-triggers on run completion
- [ ] All 3 gate types evaluate correctly (evidence, review, compliance)
- [ ] Board mode enforcement works (Explore/Study/Release with one-way escalation)
- [ ] Readiness gauge calculates correctly with weighted 5-category formula
- [ ] Release packet exportable as ZIP with locked artifacts and proof bundle
- [ ] Board context available in workflow expressions and agent prompts
- [ ] Full chain: intent -> plan -> execute -> evidence -> gate -> release works end-to-end
