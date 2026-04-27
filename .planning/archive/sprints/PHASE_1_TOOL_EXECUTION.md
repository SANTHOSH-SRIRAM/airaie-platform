# PHASE 1 — TOOL EXECUTION GOLDEN PATH

## Sprint Execution Documents

> **Phase Objective:** Prove that a tool can be registered with a full ToolContract, executed in a Docker container via the Rust runner, produce artifacts stored in MinIO, and be discovered through the 5-stage ToolShelf resolution engine.
>
> **Phase Start Date:** 2026-04-14 (after Phase 0 completes)
> **Phase Duration:** 10 working days (3 sprints)
> **Phase Dependency:** Phase 0 — all critical blockers (B1-B4) resolved
>
> **Team Roles Referenced:**
> - **BE** — Backend Engineer (Go control plane + Rust data plane)
> - **FE** — Frontend Engineer (React/TypeScript platform app)
> - **QA** — Quality Assurance Engineer
> - **TL** — Tech Lead (code review, architecture decisions)

---
---

# Sprint 1.1 — Tool Registration & Contract Validation

**Sprint Duration:** 2026-04-14 to 2026-04-17 (4 working days)
**Sprint Goal:** A user can register a tool with a full 7-section ToolContract, have it validated by 12 lint checks, assign a trust level, and declare supported intents. The frontend provides a 4-step wizard that drives this end-to-end.

---

## 1. Sprint Overview

| Attribute | Value |
|-----------|-------|
| Sprint ID | `S-1.1` |
| Sprint Name | Tool Registration & Contract Validation |
| Duration | 4 working days (2026-04-14 — 2026-04-17) |
| Velocity Target | 48 story points (12 pts/day) |
| Goal | Register tool with full 7-section ToolContract, validated by 12 lint checks |
| Entry Criteria | Phase 0 complete: node ID sanitization fixed, stub fallback removed, Rust runner verified, LLM provider wired |
| Exit Criteria | A tool registered via API and frontend wizard passes all 12 lint checks, has trust_level, has supported_intents queryable |

**Key Deliverables:**
- Backend: Full 7-section ToolContract validation in `registry.go`, 12 lint checks in `validator/`, trust_level on tool versions, supported_intents on capabilities
- Frontend: 4-step RegisterToolPage wizard (Details, Contract, Execution, Review)
- APIs: Enhanced `POST /v0/tools`, `POST /v0/tools/{id}/versions`, `POST /v0/tools/{id}/versions/{v}/publish`, `POST /v0/validate/contract`

---

## 2. Scope Breakdown

### Epic E-1.1.1: ToolContract 7-Section Validation

**Description:** Ensure that every tool registered on the platform provides a complete, valid ToolContract covering all 7 mandatory sections. The contract is the tool's interface declaration to the platform.

#### User Stories

**US-1.1.1: As a tool author, I want the platform to validate all 7 sections of my ToolContract on registration so that incomplete or malformed contracts are rejected before they enter the registry.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.1.1a | Parse and validate `metadata` section (tool_id format `^[a-z][a-z0-9_-]{2,63}$`, semver for version, non-empty name/description, valid domain_tags array) | Rejects tool_id with uppercase, dots, or <3 chars. Rejects non-semver versions. Rejects empty name. |
| T-1.1.1b | Parse and validate `interface` section (port names unique within inputs/outputs, types from allowed set `[artifact, string, number, json, boolean]`, required flag on inputs, JSONSchema for complex types) | Rejects duplicate port names. Rejects unknown types. Validates JSONSchema if present. |
| T-1.1.1c | Parse and validate `runtime` section (adapter from `[docker, python, wasm, remote-api]`, image non-empty for docker, resources bounded: cpu 0.5-32, memory 64-32768 MB, timeout 10-3600s) | Rejects unknown adapter. Rejects Docker tool without image. Rejects cpu=0 or memory=33000. |
| T-1.1.1d | Parse and validate `capabilities` section (supported_intents array, each intent formatted as `domain.subtype`, version_compatibility range) | Rejects intent without dot separator. Rejects empty intents array on published tools. |
| T-1.1.1e | Parse and validate `governance` section (sandbox policy complete: network, filesystem, pids_limit; license field; owner non-empty) | Rejects missing sandbox policy. Rejects missing owner on publish. |
| T-1.1.1f | Parse and validate `testing` section (at least one test case with inputs/expected_outputs for publish, test_timeout) | Warning on draft if missing. Error on publish if missing. |
| T-1.1.1g | Parse and validate `documentation` section (non-empty description, usage_example for published tools) | Warning on draft. Error on publish if usage_example missing. |

**US-1.1.2: As a platform operator, I want a dedicated contract validation endpoint so that tool authors can check their contract before submitting.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.1.2a | Wire `POST /v0/validate/contract` to the new 7-section validator | Returns `{ valid: bool, errors: [], warnings: [] }`. Does not persist anything. |
| T-1.1.2b | Return structured errors with section path (e.g., `metadata.tool_id`) and error code (e.g., `INVALID_FORMAT`) | Each error has `{ section, field, code, message, severity }`. |

---

### Epic E-1.1.2: 12 Lint Checks

**Description:** Implement 12 named lint checks that run on every tool registration and version creation. Each check is independently identifiable and produces a pass/fail/warning result.

#### User Stories

**US-1.1.3: As a tool author, I want 12 specific lint checks to run on my contract so that I get clear, actionable feedback on what to fix.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.1.3a | Implement `metadata_complete` check — all required metadata fields present and non-empty | Fails if name, description, or tool_id missing |
| T-1.1.3b | Implement `version_semver` check — version string follows semver format `MAJOR.MINOR.PATCH` | Fails on `1.0`, `v1.0.0` (no `v` prefix in storage), `abc` |
| T-1.1.3c | Implement `inputs_typed` check — every input port has a valid type declaration | Fails if any input has empty or unknown type |
| T-1.1.3d | Implement `outputs_typed` check — every output port has a valid type declaration | Fails if any output has empty or unknown type |
| T-1.1.3e | Implement `constraints_valid` check — resource constraints within platform bounds | Warns if resources exceed recommended limits (cpu>16, memory>16384) |
| T-1.1.3f | Implement `schema_valid` check — JSONSchema references resolve and are valid JSON Schema Draft-07 | Fails if JSONSchema is syntactically invalid |
| T-1.1.3g | Implement `adapter_known` check — adapter type is in the platform's supported adapter list | Fails on `"adapter": "unknown"` |
| T-1.1.3h | Implement `resources_bounded` check — cpu, memory, timeout within platform hard limits | Fails if cpu>32, memory>32768, timeout>3600 |
| T-1.1.3i | Implement `intents_formatted` check — each intent matches `domain.subtype` pattern | Fails on `"fea"` (no dot), `".fea"` (empty domain) |
| T-1.1.3j | Implement `errors_defined` check — tool declares at least one error code/message pair | Warning if missing (not blocking for draft) |
| T-1.1.3k | Implement `tests_present` check — at least one test case defined with inputs and expected outputs | Warning on draft, error on publish |
| T-1.1.3l | Implement `governance_complete` check — sandbox, license, owner all present | Error on publish, warning on draft |

**US-1.1.4: As a tool author, I want lint results returned as structured JSON so the frontend can display per-check status.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.1.4a | Return lint results as `{ checks: [{ name, status: "pass"|"fail"|"warn", message }] }` from both registration and validation endpoints | Each of 12 checks appears in the response. Frontend can map name to display label. |
| T-1.1.4b | Block registration/version-creation if any check has status `"fail"` | API returns 422 with lint results in body. Version is not created. |

---

### Epic E-1.1.3: Trust Level Tracking

**Description:** Every tool version carries a trust_level that progresses through a defined lifecycle: `untested -> community -> tested -> verified -> certified`. Trust level affects ToolShelf ranking and agent scoring.

#### User Stories

**US-1.1.5: As a platform operator, I want each tool version to have a trust_level so that untested tools are ranked lower in ToolShelf resolution.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.1.5a | Add `trust_level` field to `ToolVersion` Go model (enum: untested, community, tested, verified, certified). Default `untested` on creation. | Model includes field, DB column exists (verified from migration). |
| T-1.1.5b | Expose `trust_level` in `GET /v0/tools/{id}` and `GET /v0/tools/{id}/versions` API responses | JSON response includes `"trust_level": "untested"` on new versions. |
| T-1.1.5c | Add `PATCH /v0/tools/{id}/versions/{v}/trust-level` endpoint for operator trust escalation | Only allows forward progression (untested->community->...->certified). Returns 400 on backward transition. |
| T-1.1.5d | Validate trust_level on publish: only `community` or above can be published | `POST /v0/tools/{id}/versions/{v}/publish` returns 422 if trust_level is `untested`. |

---

### Epic E-1.1.4: Supported Intents

**Description:** Tools declare which intent types they can serve (e.g., `sim.fea`, `cad.geometry_check`). This enables ToolShelf to match tools to board card intents.

#### User Stories

**US-1.1.6: As a board operator, I want tools to declare their supported intents so that ToolShelf can match the right tool to my card's intent type.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.1.6a | Add `supported_intents` field to ToolVersion Go model (JSONB array of strings). Validate format `domain.subtype`. | DB column `tool_versions.supported_intents` populated. Format validated. |
| T-1.1.6b | Expose in ToolContract schema as `capabilities.supported_intents` | JSON response nests intents under capabilities section. |
| T-1.1.6c | Add `GET /v0/tools?intent_type=sim.fea` query parameter for filtering tools by intent | Returns only tools where any version supports the given intent type. |
| T-1.1.6d | Index `tool_versions.supported_intents` with GIN index for fast JSONB containment queries | `CREATE INDEX idx_tool_versions_intents ON tool_versions USING GIN(supported_intents)` exists or is created in migration. |

---

### Epic E-1.1.5: Frontend — Register Tool Wizard

**Description:** A full-page 4-step wizard that guides the user through tool registration. Replaces the existing modal with a richer, more capable page-level experience.

#### User Stories

**US-1.1.7: As a tool author, I want a step-by-step wizard to register my tool so that I can provide all required contract information without confusion.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.1.7a | Build `RegisterToolPage.tsx` with 4-step wizard shell: stepper component, back/next navigation, step validation before advancing | Steps visible, active step highlighted, cannot advance past step with validation errors. |
| T-1.1.7b | Step 1 — Details: name (required, 3-64 chars), description (required, 10-500 chars), category selector (6 options from `ToolCategory`), adapter selector (4 options from `ToolAdapter`), domain_tags multi-select | All fields validate on blur. Category/adapter use existing `ToolCategory`/`ToolAdapter` types. |
| T-1.1.7c | Step 2 — Contract: input ports editor (add/remove rows, name/type/required per port), output ports editor (same), JSONSchema editor for complex types (CodeMirror with JSON mode) | Can add up to 20 input ports and 10 output ports. Type dropdown shows 5 port types. JSONSchema validated on change. |
| T-1.1.7d | Step 3 — Execution: Docker image field (required for Docker adapter), CPU slider (0.5-32, step 0.5), memory slider (64-32768 MB, step 64), timeout input (10-3600s), sandbox policy toggles (network deny/allow, filesystem sandbox/readonly/shared, pids_limit input) | Sliders show current value. Docker image required only when adapter=docker. Pids limit defaults to 256. |
| T-1.1.7e | Step 4 — Review: read-only summary of all entered data, raw JSON contract preview (syntax highlighted), "Validate" button calls `POST /v0/validate/contract`, "Register" button calls `POST /v0/tools` then `POST /v0/tools/{id}/versions` | Validate shows lint check results (12 checks with pass/fail/warn). Register disabled until validation passes. On success, redirects to tool detail page. |
| T-1.1.7f | Add route `/tools/register` in `App.tsx` and "Register Tool" button on `ToolRegistryPage.tsx` | Navigation from tool list to registration wizard works. Back button returns to list. |

**US-1.1.8: As a tool author, I want inline validation feedback on each wizard step so that I can fix errors before proceeding.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.1.8a | Client-side validation for Step 1: name length, description length, category/adapter selected | Red border on invalid fields, error message below field, Next button disabled. |
| T-1.1.8b | Client-side validation for Step 2: at least one input port, all port names non-empty and unique, all types selected | Duplicate port name highlighted in red. Empty name prevents advancing. |
| T-1.1.8c | Client-side validation for Step 3: Docker image non-empty (when adapter=docker), resources within bounds | Out-of-range slider values snapped to bounds. Image field required indicator for Docker. |
| T-1.1.8d | Server-side validation on Step 4: display lint check results from `POST /v0/validate/contract` | 12 lint checks displayed as checklist with green check, red X, or yellow warning icons. |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort (hrs) | Inputs | Output | Definition of Done |
|---------|-------------|-------|-------------|--------|--------|-------------------|
| T-1.1.1a | Validate metadata section | BE | 3 | ToolContract JSON, schema spec | Validation function in `validator/metadata.go` | Unit tests pass for valid/invalid metadata. 100% of invalid cases rejected. |
| T-1.1.1b | Validate interface section | BE | 4 | ToolContract JSON, port type enum | Validation function in `validator/interface.go` | Unit tests for duplicate ports, unknown types, invalid JSONSchema. |
| T-1.1.1c | Validate runtime section | BE | 3 | ToolContract JSON, adapter list, resource bounds | Validation function in `validator/runtime.go` | Unit tests for unknown adapters, out-of-bound resources, missing image. |
| T-1.1.1d | Validate capabilities section | BE | 2 | ToolContract JSON, intent format regex | Validation function in `validator/capabilities.go` | Unit tests for malformed intents, empty intents array. |
| T-1.1.1e | Validate governance section | BE | 2 | ToolContract JSON | Validation function in `validator/governance.go` | Unit tests for missing sandbox, missing owner, missing license. |
| T-1.1.1f | Validate testing section | BE | 2 | ToolContract JSON, publish flag | Validation function in `validator/testing.go` | Warning on draft, error on publish. Unit tests for both paths. |
| T-1.1.1g | Validate documentation section | BE | 1 | ToolContract JSON, publish flag | Validation function in `validator/documentation.go` | Warning on draft, error on publish for missing usage_example. |
| T-1.1.2a | Wire POST /v0/validate/contract | BE | 2 | HTTP handler, validator chain | Handler + tests | Returns structured validation result. Integration test with curl. |
| T-1.1.2b | Structured error response | BE | 2 | Validation results | Error DTO with section/field/code | Each error locatable to exact field path. |
| T-1.1.3a-l | 12 lint checks (batch) | BE | 8 | Validator functions, check registry | `validator/lint.go` with 12 named checks | Each check independently testable. Aggregated result returned. |
| T-1.1.4a | Structured lint response DTO | BE | 1 | Lint check results | JSON DTO | Frontend can parse and display per-check status. |
| T-1.1.4b | Block on lint failure | BE | 1 | Lint results, registration flow | 422 response on failure | Version not created when any check fails. |
| T-1.1.5a | Trust level Go model | BE | 2 | Migration, model definition | Updated `model/tool.go` | Field in model, default value set, enum validated. |
| T-1.1.5b | Trust level in API response | BE | 1 | Model change | Updated serializers | trust_level visible in GET responses. |
| T-1.1.5c | Trust level escalation endpoint | BE | 3 | Model, auth context | `PATCH /v0/tools/{id}/versions/{v}/trust-level` | Forward-only transitions enforced. 400 on backward. |
| T-1.1.5d | Trust level publish guard | BE | 1 | Publish handler, trust level | Updated publish logic | 422 if trust_level=untested on publish. |
| T-1.1.6a | Supported intents model | BE | 2 | Migration, model | Updated `model/tool.go` | JSONB array stored and validated. |
| T-1.1.6b | Intents in contract schema | BE | 1 | Schema definition | Updated ToolContract schema | Nested under capabilities in response. |
| T-1.1.6c | Intent type query filter | BE | 2 | GIN index, query builder | `GET /v0/tools?intent_type=` | Correct filtering verified with test data. |
| T-1.1.6d | GIN index migration | BE | 1 | Migration file | New migration | Index created, EXPLAIN shows index scan. |
| T-1.1.7a | Wizard shell component | FE | 4 | Design spec | `RegisterToolPage.tsx` with stepper | 4 steps navigable, validation gates progression. |
| T-1.1.7b | Step 1 — Details form | FE | 4 | Form fields spec, types | Step 1 component | All fields render, validate, and persist in wizard state. |
| T-1.1.7c | Step 2 — Contract editor | FE | 6 | Port types, JSONSchema | Step 2 component with dynamic rows | Add/remove ports, type selection, JSONSchema editor works. |
| T-1.1.7d | Step 3 — Execution config | FE | 4 | Resource bounds, adapter rules | Step 3 component with sliders | Conditional Docker image field. Resource sliders with labels. |
| T-1.1.7e | Step 4 — Review & Submit | FE | 5 | All wizard state, API hooks | Step 4 with validate + register buttons | Validate calls API, shows 12 checks. Register creates tool + version. |
| T-1.1.7f | Route and navigation wiring | FE | 2 | App.tsx routes | Route `/tools/register` added | Navigation from tool list works, back button works. |
| T-1.1.8a-d | Client-side validation (all steps) | FE | 4 | Validation rules | Inline error display per field | Errors shown on blur, Next disabled on invalid. |

**Total Effort:** ~70 hours (BE: 37h, FE: 29h, buffer: 4h)

---

## 4. Technical Implementation Plan

### 4.1 Architecture

```
┌──────────────────────────────────────────────────────┐
│  Frontend: RegisterToolPage.tsx                       │
│  ├── Step1Details  → local state                      │
│  ├── Step2Contract → local state + JSONSchema editor  │
│  ├── Step3Execution → local state + sliders           │
│  └── Step4Review   → POST /v0/validate/contract       │
│                    → POST /v0/tools                    │
│                    → POST /v0/tools/{id}/versions      │
├──────────────────────────────────────────────────────┤
│  Backend: Go Control Plane                            │
│  ├── handler/tool_handler.go                          │
│  │   ├── CreateTool → validator chain → registry.go   │
│  │   ├── CreateVersion → lint checks → version store  │
│  │   ├── PublishVersion → trust check → publish       │
│  │   └── ValidateContract → validator → lint → result │
│  ├── service/registry.go                              │
│  │   ├── RegisterTool(ctx, req) → validate → store    │
│  │   └── UpdateTrustLevel(ctx, toolID, ver, level)    │
│  ├── validator/                                       │
│  │   ├── contract.go      (orchestrator)              │
│  │   ├── metadata.go      (section 1)                 │
│  │   ├── interface.go     (section 2)                 │
│  │   ├── runtime.go       (section 3)                 │
│  │   ├── capabilities.go  (section 4)                 │
│  │   ├── governance.go    (section 5)                 │
│  │   ├── testing.go       (section 6)                 │
│  │   ├── documentation.go (section 7)                 │
│  │   └── lint.go          (12 named checks)           │
│  └── model/tool.go                                    │
│      ├── Tool { ID, Name, Description, Owner, ... }   │
│      ├── ToolVersion { Version, TrustLevel, ... }     │
│      └── ToolContract { 7 sections }                  │
├──────────────────────────────────────────────────────┤
│  Database: PostgreSQL                                 │
│  ├── tools (id, name, description, owner, ...)        │
│  ├── tool_versions (tool_id, version, trust_level,    │
│  │     supported_intents JSONB, contract_json, ...)    │
│  └── GIN index on supported_intents                   │
└──────────────────────────────────────────────────────┘
```

### 4.2 API Specifications

#### POST /v0/tools
```
Request:
{
  "name": "FEA Solver",
  "description": "Finite element analysis for structural simulation",
  "owner": "team-simulations",
  "category": "simulation",
  "adapter": "docker",
  "domain_tags": ["sim.fea", "structural"]
}

Response 201:
{
  "id": "tool_fea_solver",
  "name": "FEA Solver",
  "description": "Finite element analysis for structural simulation",
  "owner": "team-simulations",
  "category": "simulation",
  "adapter": "docker",
  "created_at": "2026-04-15T10:00:00Z"
}

Response 422 (validation failure):
{
  "error": "validation_failed",
  "message": "Tool registration failed validation",
  "details": {
    "errors": [
      { "section": "metadata", "field": "name", "code": "REQUIRED", "message": "Name is required" }
    ]
  }
}
```

#### POST /v0/tools/{id}/versions
```
Request:
{
  "version": "1.0.0",
  "contract_json": "{...full 7-section contract...}",
  "supported_intents": ["sim.fea", "sim.structural"]
}

Response 201:
{
  "tool_id": "tool_fea_solver",
  "version": "1.0.0",
  "trust_level": "untested",
  "status": "draft",
  "supported_intents": ["sim.fea", "sim.structural"],
  "lint_results": {
    "checks": [
      { "name": "metadata_complete", "status": "pass", "message": "All metadata fields present" },
      { "name": "version_semver", "status": "pass", "message": "Version follows semver" },
      ...
    ],
    "passed": true,
    "error_count": 0,
    "warning_count": 0
  },
  "created_at": "2026-04-15T10:01:00Z"
}

Response 422 (lint failure):
{
  "error": "lint_failed",
  "message": "Contract failed 2 lint checks",
  "lint_results": {
    "checks": [...],
    "passed": false,
    "error_count": 2,
    "warning_count": 1
  }
}
```

#### POST /v0/tools/{id}/versions/{v}/publish
```
Request: (empty body)

Response 200:
{
  "tool_id": "tool_fea_solver",
  "version": "1.0.0",
  "status": "published",
  "trust_level": "community",
  "published_at": "2026-04-15T10:05:00Z"
}

Response 422 (trust too low):
{
  "error": "trust_level_insufficient",
  "message": "Cannot publish tool with trust_level 'untested'. Minimum: 'community'."
}
```

#### POST /v0/validate/contract
```
Request:
{
  "contract_json": "{...full 7-section contract...}",
  "check_publish_requirements": false
}

Response 200:
{
  "valid": true,
  "sections": {
    "metadata": { "valid": true, "errors": [], "warnings": [] },
    "interface": { "valid": true, "errors": [], "warnings": [] },
    "runtime": { "valid": true, "errors": [], "warnings": [] },
    "capabilities": { "valid": true, "errors": [], "warnings": [] },
    "governance": { "valid": false, "errors": [{ "field": "license", "code": "RECOMMENDED", "message": "License recommended for published tools" }], "warnings": [] },
    "testing": { "valid": true, "errors": [], "warnings": [{ "field": "test_cases", "code": "RECOMMENDED", "message": "Add test cases before publishing" }] },
    "documentation": { "valid": true, "errors": [], "warnings": [] }
  },
  "lint": {
    "checks": [ ... 12 checks ... ],
    "passed": true,
    "error_count": 0,
    "warning_count": 1
  }
}
```

#### PATCH /v0/tools/{id}/versions/{v}/trust-level
```
Request:
{
  "trust_level": "community"
}

Response 200:
{
  "tool_id": "tool_fea_solver",
  "version": "1.0.0",
  "trust_level": "community",
  "previous_trust_level": "untested",
  "updated_at": "2026-04-15T10:03:00Z"
}

Response 400 (backward transition):
{
  "error": "invalid_trust_transition",
  "message": "Cannot downgrade trust_level from 'community' to 'untested'. Trust levels can only increase."
}
```

### 4.3 Database Changes

**Migration: `XXX_add_trust_and_intents.sql`**

```sql
-- Verify trust_level column exists (from existing migration), add if missing
ALTER TABLE tool_versions
  ADD COLUMN IF NOT EXISTS trust_level VARCHAR(20) DEFAULT 'untested'
    CHECK (trust_level IN ('untested', 'community', 'tested', 'verified', 'certified'));

-- Verify supported_intents column exists, add if missing
ALTER TABLE tool_versions
  ADD COLUMN IF NOT EXISTS supported_intents JSONB DEFAULT '[]'::jsonb;

-- GIN index for fast intent containment queries
CREATE INDEX IF NOT EXISTS idx_tool_versions_supported_intents
  ON tool_versions USING GIN (supported_intents);

-- Add domain_tags to tools table
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS domain_tags JSONB DEFAULT '[]'::jsonb;
```

### 4.4 Frontend Components

**New Files:**
- `frontend/src/pages/RegisterToolPage.tsx` — Main 4-step wizard page
- `frontend/src/components/tools/WizardStepper.tsx` — Reusable step indicator
- `frontend/src/components/tools/ContractPortEditor.tsx` — Dynamic input/output port editor with add/remove rows
- `frontend/src/components/tools/ResourceSlider.tsx` — CPU/memory/timeout slider with value display
- `frontend/src/components/tools/LintResultsPanel.tsx` — 12-check lint results display
- `frontend/src/components/tools/ContractJsonPreview.tsx` — Syntax-highlighted JSON preview

**Modified Files:**
- `frontend/src/pages/ToolRegistryPage.tsx` — Add "Register Tool" button navigating to `/tools/register`
- `frontend/src/App.tsx` — Add route for `/tools/register`
- `frontend/src/types/tool.ts` — Add `TrustLevel` type, `SupportedIntent` type, expand `ToolContract` to 7 sections
- `frontend/src/api/tools.ts` — Add `validateContract()` function, update `createToolVersion()` to include `supported_intents`
- `frontend/src/hooks/useTools.ts` — Add `useValidateContract()` mutation hook

**Type Additions (`frontend/src/types/tool.ts`):**
```typescript
export type TrustLevel = 'untested' | 'community' | 'tested' | 'verified' | 'certified';

export interface ToolContractFull {
  metadata: {
    tool_id: string;
    name: string;
    description: string;
    version: string;
    domain_tags: string[];
  };
  interface: {
    inputs: ToolContractField[];
    outputs: ToolContractField[];
  };
  runtime: {
    adapter: ToolAdapter;
    image?: string;
    resources: { cpu: number; memory_mb: number; timeout_seconds: number };
  };
  capabilities: {
    supported_intents: string[];
    version_compatibility?: string;
  };
  governance: {
    sandbox: { network: 'deny' | 'allow'; filesystem: 'sandbox' | 'readonly' | 'shared'; pids_limit: number };
    license?: string;
    owner: string;
  };
  testing: {
    test_cases: Array<{ name: string; inputs: Record<string, unknown>; expected_outputs: Record<string, unknown> }>;
    test_timeout?: number;
  };
  documentation: {
    description: string;
    usage_example?: string;
  };
}

export interface LintCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  sections: Record<string, { valid: boolean; errors: Array<{ field: string; code: string; message: string }>; warnings: Array<{ field: string; code: string; message: string }> }>;
  lint: { checks: LintCheck[]; passed: boolean; error_count: number; warning_count: number };
}
```

### 4.5 Backend Logic

**Validator Chain (`validator/contract.go`):**
```go
type ContractValidator struct {
    sections []SectionValidator
    linter   *Linter
}

func (v *ContractValidator) Validate(ctx context.Context, contract *ToolContract, opts ValidationOpts) *ValidationResult {
    result := &ValidationResult{}
    for _, sv := range v.sections {
        sectionResult := sv.Validate(ctx, contract, opts)
        result.Sections[sv.Name()] = sectionResult
        if !sectionResult.Valid {
            result.Valid = false
        }
    }
    result.Lint = v.linter.RunAll(ctx, contract, opts)
    if !result.Lint.Passed {
        result.Valid = false
    }
    return result
}
```

**Linter (`validator/lint.go`):**
```go
type LintCheck struct {
    Name    string
    RunFunc func(ctx context.Context, contract *ToolContract, opts ValidationOpts) CheckResult
}

type Linter struct {
    checks []LintCheck // 12 registered checks
}

func NewLinter() *Linter {
    return &Linter{
        checks: []LintCheck{
            {Name: "metadata_complete", RunFunc: checkMetadataComplete},
            {Name: "version_semver", RunFunc: checkVersionSemver},
            {Name: "inputs_typed", RunFunc: checkInputsTyped},
            {Name: "outputs_typed", RunFunc: checkOutputsTyped},
            {Name: "constraints_valid", RunFunc: checkConstraintsValid},
            {Name: "schema_valid", RunFunc: checkSchemaValid},
            {Name: "adapter_known", RunFunc: checkAdapterKnown},
            {Name: "resources_bounded", RunFunc: checkResourcesBounded},
            {Name: "intents_formatted", RunFunc: checkIntentsFormatted},
            {Name: "errors_defined", RunFunc: checkErrorsDefined},
            {Name: "tests_present", RunFunc: checkTestsPresent},
            {Name: "governance_complete", RunFunc: checkGovernanceComplete},
        },
    }
}
```

### 4.6 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Contract JSON is malformed/unparseable | Return 400 with `"error": "invalid_json"` before validation runs |
| Version already exists for this tool | Return 409 Conflict with existing version details |
| Tool ID collision (two tools with same generated ID) | Return 409 Conflict, suggest appending numeric suffix |
| Empty inputs array (tool has no inputs) | Allowed — some tools (e.g., random generators) have no inputs |
| JSONSchema in contract references external $ref | Reject with `schema_valid` lint check — only inline schemas supported |
| Frontend wizard abandoned mid-way | No server state created until Step 4 submit. Client state lost on navigation away (with confirmation dialog). |
| Contract exceeds 1 MB | Return 413 Payload Too Large. Max contract size enforced at handler level. |
| Concurrent version creation for same tool | Database unique constraint on (tool_id, version) prevents duplicates |
| Unicode in tool name | Allowed in name/description. tool_id is auto-generated from name with ASCII-only slug. |

---

## 5. UX/UI Requirements

### 5.1 Screens

**Screen: Register Tool Wizard (`/tools/register`)**

Layout: Full-width page with centered content area (max-width 720px). Top: horizontal stepper showing 4 steps. Middle: current step form. Bottom: Back/Next buttons, Cancel link.

**Step 1 — Details:**
- Name input (text field, autofocus)
- Description textarea (4 rows, character counter)
- Category dropdown (6 options, default "simulation")
- Adapter dropdown (4 options, default "docker")
- Domain tags multi-select (type to search/add, pill display)

**Step 2 — Contract:**
- Two sections: "Input Ports" and "Output Ports"
- Each section: table with columns [Name, Type, Required, Actions]
- "Add Port" button below each table
- Type column: dropdown with 5 port types
- Required column: toggle (inputs only, outputs are always produced)
- Optional: JSONSchema editor (collapsed by default, expand per-port)

**Step 3 — Execution:**
- Docker Image field (text input, visible only when adapter=docker)
- CPU: slider 0.5-32 with step 0.5, current value displayed
- Memory: slider 64-32768 MB with step 64, formatted display (e.g., "2,048 MB")
- Timeout: number input 10-3600 seconds
- Network Policy: toggle (deny/allow), default deny
- Filesystem: radio group (sandbox/readonly/shared), default sandbox
- PIDs Limit: number input, default 256

**Step 4 — Review:**
- Read-only summary card for each section
- "View Raw JSON" toggle to show/hide syntax-highlighted contract JSON
- "Validate Contract" button (calls API, shows results inline)
- Lint Results: 12-row checklist, each with check name, status icon, message
- "Register Tool" button (disabled until validation passes, shows loading spinner on click)

### 5.2 Component Details

**WizardStepper:**
- Horizontal bar with 4 circles connected by lines
- Active step: filled primary color circle with step number
- Completed step: green circle with checkmark icon
- Future step: grey outline circle with step number
- Step labels below each circle

**ContractPortEditor:**
- Dynamic table rows with inline editing
- Add row button appends empty row with focus on name field
- Remove row button (trash icon) with confirmation on last port
- Drag handle for reordering (optional, nice-to-have)

**LintResultsPanel:**
- Vertical list of 12 checks
- Each row: status icon (green check / red X / yellow warning triangle) + check name (formatted: `metadata_complete` -> "Metadata Complete") + message
- Summary bar at top: "X passed, Y failed, Z warnings"

### 5.3 User Flows

**Happy Path:**
1. User clicks "Register Tool" on ToolRegistryPage
2. User fills in Details (Step 1) -> clicks Next
3. User adds input/output ports (Step 2) -> clicks Next
4. User configures Docker image and resources (Step 3) -> clicks Next
5. User reviews summary -> clicks "Validate Contract"
6. All 12 lint checks pass -> "Register Tool" button enables
7. User clicks "Register Tool" -> tool created -> redirected to tool detail page

**Validation Failure Path:**
1. User reaches Step 4 -> clicks "Validate Contract"
2. 2 lint checks fail (e.g., inputs_typed, resources_bounded)
3. Failed checks shown in red with fix suggestions
4. User clicks "Back" to Step 2, fixes input types
5. User returns to Step 4, re-validates -> all pass -> registers

### 5.4 States

| State | Visual |
|-------|--------|
| Empty wizard (initial) | All fields empty, Step 1 active, Next disabled until required fields filled |
| Validation in progress | "Validate Contract" button shows spinner, lint results area shows skeleton |
| Validation passed | All 12 checks green, summary "12/12 passed", Register button enabled (primary color) |
| Validation failed | Failed checks red, summary "10/12 passed, 2 failed", Register button disabled |
| Registration in progress | Register button shows spinner, all inputs disabled |
| Registration success | Toast notification "Tool registered successfully", redirect to tool detail |
| Registration error | Error banner at top of Step 4 with server error message, inputs re-enabled |

---

## 6. QA & Testing Plan

### 6.1 Unit Tests (Backend)

| Test Suite | File | Tests | Coverage Target |
|------------|------|-------|-----------------|
| Metadata validator | `validator/metadata_test.go` | Valid metadata, missing name, invalid tool_id format (10 cases), non-semver version, empty domain_tags | 100% |
| Interface validator | `validator/interface_test.go` | Valid interface, duplicate port names, unknown type, empty inputs (allowed), invalid JSONSchema | 100% |
| Runtime validator | `validator/runtime_test.go` | Valid runtime, unknown adapter, missing Docker image, out-of-bound cpu/memory/timeout (boundary values) | 100% |
| Capabilities validator | `validator/capabilities_test.go` | Valid intents, malformed intents (no dot, empty domain), empty array | 100% |
| Governance validator | `validator/governance_test.go` | Valid governance, missing sandbox, missing owner on publish, missing license (warning) | 100% |
| Testing validator | `validator/testing_test.go` | Valid tests, missing tests (warn on draft, error on publish), invalid test_timeout | 100% |
| Documentation validator | `validator/documentation_test.go` | Valid docs, missing description, missing usage_example (warn on draft, error on publish) | 100% |
| Linter | `validator/lint_test.go` | All 12 checks pass, each check fails individually, aggregation logic, error vs warning severity | 100% |
| Trust level | `service/registry_test.go` | Forward transitions (untested->community->tested->verified->certified), backward rejection, publish guard | 100% |

### 6.2 Integration Tests (Backend)

| Test | Description | Assertions |
|------|-------------|------------|
| `TestCreateToolWithFullContract` | POST /v0/tools with all 7 sections | 201 response, tool persisted in DB, all fields present |
| `TestCreateVersionWithLintChecks` | POST /v0/tools/{id}/versions with valid contract | 201 response, 12 lint checks all pass, version in DB |
| `TestCreateVersionLintFailure` | POST /v0/tools/{id}/versions with invalid contract | 422 response, lint_results show failures, version NOT in DB |
| `TestValidateContractEndpoint` | POST /v0/validate/contract with various contracts | Correct section-level and lint-level results, no side effects |
| `TestPublishWithInsufficientTrust` | POST /v0/tools/{id}/versions/{v}/publish on untested tool | 422 response, version remains draft |
| `TestPublishAfterTrustEscalation` | PATCH trust to community -> publish | 200 response, version status=published |
| `TestQueryToolsByIntentType` | GET /v0/tools?intent_type=sim.fea | Returns only tools with matching intent, uses GIN index |
| `TestTrustLevelBackwardRejection` | PATCH trust from community to untested | 400 response, trust unchanged |

### 6.3 Frontend Tests

| Test | Framework | Description |
|------|-----------|-------------|
| Wizard navigation | Vitest + Testing Library | Step 1-4 navigation, back/next, validation gates |
| Step 1 validation | Vitest + Testing Library | Required fields, character limits, dropdown selection |
| Step 2 port editor | Vitest + Testing Library | Add/remove ports, duplicate name detection, type selection |
| Step 3 conditional fields | Vitest + Testing Library | Docker image shown only for Docker adapter |
| Step 4 validate flow | Vitest + MSW | Mock API call, display lint results, enable/disable register button |
| Step 4 register flow | Vitest + MSW | Mock API calls (create tool, create version), success redirect, error display |
| E2E wizard flow | Playwright | Full wizard completion from ToolRegistryPage to tool detail page redirect |

### 6.4 Manual Testing Checklist

- [ ] Register a Docker tool with all 7 contract sections filled — tool appears in registry
- [ ] Register a Python tool — adapter-specific fields correct
- [ ] Attempt to register with invalid tool name (spaces, uppercase) — blocked with clear error
- [ ] Attempt to register with duplicate port names — blocked at Step 2
- [ ] Validate a contract with missing governance — shows warning
- [ ] Attempt to publish untested tool — blocked with 422
- [ ] Escalate trust to community then publish — succeeds
- [ ] Query tools by intent type — correct filtering
- [ ] Navigate back from Step 3 to Step 1 — form state preserved

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Existing contract validation in `registry.go` conflicts with new validator | Medium | Medium | Refactor: extract existing validation into `validator/` package, replace inline checks with new validators. Keep old checks as fallback during transition. |
| 7-section contract schema not finalized | Low | High | Schema is derived from architecture docs. Lock schema on Day 1 of sprint. Any changes after Day 1 require TL approval. |
| Frontend wizard state management complexity | Medium | Low | Use React useState with a single `FormState` object (pattern already used in `RegisterToolModal.tsx`). No need for form library — wizard is linear. |
| GIN index on JSONB may not work for containment queries | Low | Medium | Test with `@>` operator in development. PostgreSQL 16 GIN indexes well-supported. Fallback: use `jsonb_array_elements_text` with standard B-tree index. |
| Trust level migration fails on existing data | Low | Low | Migration uses `ADD COLUMN IF NOT EXISTS` with DEFAULT. Existing rows get `untested`. Non-destructive. |

---

## 8. Dependencies

| Dependency | Type | Status | Owner | Impact if Blocked |
|------------|------|--------|-------|-------------------|
| Phase 0 complete (B1-B4 resolved) | Prerequisite | Expected done by 2026-04-13 | BE | Cannot start sprint — tool execution pipeline needed for validation |
| PostgreSQL schema access | Infrastructure | Available | DevOps | Cannot add migrations |
| `validator/` package structure | Internal | New — created in this sprint | BE | Central to all validation work — build first on Day 1 |
| `RegisterToolModal.tsx` existing code | Internal | Exists | FE | Reference for form patterns — can be extended or replaced by wizard |
| `useCreateTool` and `useCreateToolVersion` hooks | Internal | Exist in `useTools.ts` | FE | Wizard Step 4 depends on these hooks |
| `apiClient.post` and `apiOrMock` | Internal | Exist in `api/client.ts` | FE | All API calls use these utilities |

---

## 9. Sprint Execution Plan

### Day 1 (2026-04-14): Foundation

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE Stream 1 | Create `validator/` package structure, implement metadata + interface validators (T-1.1.1a, T-1.1.1b) | None |
| BE Stream 2 | Add trust_level to Go model, write migration (T-1.1.5a, T-1.1.6d) | None |
| FE Stream 1 | Build wizard shell component and Step 1 Details form (T-1.1.7a, T-1.1.7b) | None |

### Day 2 (2026-04-15): Core Validation

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE Stream 1 | Implement runtime + capabilities + governance validators (T-1.1.1c, T-1.1.1d, T-1.1.1e) | Day 1 validator package |
| BE Stream 2 | Implement 12 lint checks (T-1.1.3a through T-1.1.3l) | Day 1 validator package |
| FE Stream 1 | Build Step 2 Contract editor (T-1.1.7c) | Day 1 wizard shell |
| FE Stream 2 | Build Step 3 Execution config (T-1.1.7d) | Day 1 wizard shell |

### Day 3 (2026-04-16): Integration

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE Stream 1 | Implement testing + documentation validators (T-1.1.1f, T-1.1.1g), wire POST /v0/validate/contract (T-1.1.2a, T-1.1.2b) | Day 2 validators |
| BE Stream 2 | Wire trust_level API (T-1.1.5b, T-1.1.5c, T-1.1.5d), supported_intents model + query (T-1.1.6a, T-1.1.6b, T-1.1.6c) | Day 1 migration |
| FE Stream 1 | Build Step 4 Review + Submit (T-1.1.7e), wire validation API call | Day 2 contract editor |
| FE Stream 2 | Add route, navigation, client-side validation (T-1.1.7f, T-1.1.8a-d) | Day 2 wizard steps |

### Day 4 (2026-04-17): Testing & Polish

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE + QA | Integration tests for all endpoints, lint check unit tests | Day 3 all backend done |
| FE + QA | Frontend tests (Vitest), E2E test (Playwright), bug fixes | Day 3 all frontend done |
| All | Manual testing checklist, code review, documentation | All streams complete |

### Critical Path

```
Day 1: validator/ package → Day 2: 12 lint checks → Day 3: wire to API → Day 4: integration tests
Day 1: wizard shell → Day 2: Step 2+3 → Day 3: Step 4 + API wiring → Day 4: E2E test
```

**Parallel Streams:** Backend validation and frontend wizard are independent until Day 3 when frontend calls backend APIs. Trust level and intents work is independent from validation work.

---

## 10. Definition of Done

- [ ] All 7 ToolContract sections validated on tool registration
- [ ] 12 lint checks run and block invalid contracts (returns 422 with structured results)
- [ ] `POST /v0/validate/contract` returns section-level and lint-level validation
- [ ] `trust_level` field on ToolVersion: default `untested`, forward-only transitions, publish requires `community+`
- [ ] `supported_intents` field on ToolVersion: JSONB array, format validated, queryable via `GET /v0/tools?intent_type=`
- [ ] GIN index on `supported_intents` created and verified with EXPLAIN
- [ ] Frontend 4-step wizard completes end-to-end: Details -> Contract -> Execution -> Review -> Register
- [ ] Client-side validation on all wizard steps prevents progression with invalid data
- [ ] Server-side lint results displayed in Step 4 with per-check status
- [ ] Unit test coverage >= 90% for all new validator code
- [ ] Integration tests pass for all 4 API endpoints (create tool, create version, publish, validate)
- [ ] Frontend tests pass (Vitest unit + Playwright E2E)
- [ ] Code reviewed and approved by TL
- [ ] No P0/P1 bugs open

---

## 11. Deliverables Checklist

| # | Deliverable | Type | Status |
|---|------------|------|--------|
| 1 | `validator/` package with 7 section validators | Backend | [ ] |
| 2 | `validator/lint.go` with 12 named checks | Backend | [ ] |
| 3 | Updated `service/registry.go` with full validation chain | Backend | [ ] |
| 4 | Updated `model/tool.go` with TrustLevel, SupportedIntents | Backend | [ ] |
| 5 | Migration for trust_level, supported_intents, GIN index | Backend | [ ] |
| 6 | `POST /v0/validate/contract` handler wired | Backend | [ ] |
| 7 | `PATCH /v0/tools/{id}/versions/{v}/trust-level` handler | Backend | [ ] |
| 8 | `GET /v0/tools?intent_type=` query filter | Backend | [ ] |
| 9 | `RegisterToolPage.tsx` with 4-step wizard | Frontend | [ ] |
| 10 | `WizardStepper.tsx`, `ContractPortEditor.tsx`, `ResourceSlider.tsx`, `LintResultsPanel.tsx` components | Frontend | [ ] |
| 11 | Updated `types/tool.ts` with TrustLevel, ToolContractFull, LintCheck, ValidationResult | Frontend | [ ] |
| 12 | Updated `api/tools.ts` with `validateContract()` function | Frontend | [ ] |
| 13 | Route `/tools/register` in App.tsx | Frontend | [ ] |
| 14 | Backend unit tests (validator/, lint, trust, intents) | Testing | [ ] |
| 15 | Backend integration tests (4 endpoints) | Testing | [ ] |
| 16 | Frontend unit tests (Vitest) | Testing | [ ] |
| 17 | E2E test (Playwright wizard flow) | Testing | [ ] |

---

## 12. Optional — Metrics & Release

### Sprint Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Story points completed | >= 45 of 48 | End of sprint |
| Lint check coverage | 12/12 implemented | Code review |
| Validation accuracy | 0 false positives, 0 false negatives on test suite | Integration tests |
| Wizard completion rate | >= 80% of started wizards complete | Analytics event tracking (optional) |
| API response time (validate/contract) | < 200ms p95 | Load test |

### Release Notes (Draft)

**Sprint 1.1 Release — Tool Registration & Contract Validation**
- Full 7-section ToolContract validation on tool registration
- 12 lint checks providing actionable, per-field feedback
- Trust level lifecycle (untested -> community -> tested -> verified -> certified)
- Supported intents declaration enabling ToolShelf discovery
- 4-step tool registration wizard in the platform UI
- Contract validation endpoint for pre-submission checking

---
---

# Sprint 1.2 — Tool Execution & Artifact Management

**Sprint Duration:** 2026-04-18 to 2026-04-22 (3 working days)
**Sprint Goal:** Execute a registered tool in a Docker container via NATS dispatch to the Rust runner, collect artifacts in MinIO with SHA-256 integrity, track execution cost, and update tool trust scores. The frontend provides a full Tool Detail page with test run capability and a table view for the tool list.

---

## 1. Sprint Overview

| Attribute | Value |
|-----------|-------|
| Sprint ID | `S-1.2` |
| Sprint Name | Tool Execution & Artifact Management |
| Duration | 3 working days (2026-04-18 — 2026-04-22, skipping weekend 04-19/04-20) |
| Velocity Target | 42 story points (14 pts/day) |
| Goal | Execute tool in Docker, collect artifacts with SHA-256, track cost, update trust |
| Entry Criteria | Sprint 1.1 complete: tools can be registered with full contracts, validated, and published |
| Exit Criteria | A registered tool executes in Docker via NATS, artifacts stored in MinIO with SHA-256, cost tracked, trust score updated after run, Tool Detail page renders full tool information with test run |

**Key Deliverables:**
- Backend: Presigned URL generation for artifact I/O, sandbox enforcement verification, SHA-256 on artifact finalization, cost calculation on run completion, Bayesian trust score update
- Frontend: ToolDetailPage with contract viewer/version history/usage stats/test run, ToolsPage table view with quick inspector
- Verification: End-to-end tool execution through the NATS/Rust/Docker pipeline

---

## 2. Scope Breakdown

### Epic E-1.2.1: Tool Execution Pipeline

**Description:** Verify and harden the tool execution pipeline: job dispatch via NATS, Docker container execution by the Rust runner, artifact upload/download via MinIO presigned URLs.

#### User Stories

**US-1.2.1: As a platform user, I want to execute a registered tool and have it run in an isolated Docker container so that tool execution is secure and reproducible.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.2.1a | Verify presigned URL generation for input artifacts (download URLs) — the Go control plane generates MinIO presigned download URLs and includes them in the NATS job payload | Rust runner can download input artifacts from the presigned URL. URL expires after 15 minutes. Invalid URL returns 403. |
| T-1.2.1b | Verify presigned URL generation for output artifacts (upload URLs) — the Go control plane generates MinIO presigned upload URLs and includes them in the NATS job payload | Rust runner can upload output artifacts to the presigned URL. URL includes size and content-type constraints. |
| T-1.2.1c | Verify Docker sandbox enforcement in Rust runner — `--cpus`, `--memory`, `--network=none` (when sandbox.network=deny), `--pids-limit` all applied to Docker run command | Container respects CPU limit (verified with CPU stress test). Memory limit triggers OOM kill. Network deny prevents outbound connections. PIDs limit prevents fork bombs. |
| T-1.2.1d | Verify timeout enforcement — Rust runner kills container after `timeout_seconds` elapses | Container running beyond timeout is killed. Run status set to FAILED with reason `TIMEOUT`. Partial artifacts cleaned up. |
| T-1.2.1e | Verify OOM kill handling — Docker OOM kills are detected and reported | Run status set to FAILED with reason `OOM_KILLED`. Memory usage metric captured. |

**US-1.2.2: As a platform user, I want to dispatch a tool run via the API and track its status so that I can monitor execution progress.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.2.2a | Verify `POST /v0/runs` creates a run record, publishes NATS job message, returns run ID with status QUEUED | Run record in DB with status=QUEUED. NATS message published on `airaie.jobs.tool.execution`. Response includes run_id. |
| T-1.2.2b | Verify `GET /v0/runs/{id}` returns full run details including status, timing, inputs, outputs, cost | Response includes: status, created_at, started_at, completed_at, inputs, outputs, cost_estimate, cost_actual, tool_id, tool_version. |
| T-1.2.2c | Verify NATS result consumption — Rust runner publishes result on `airaie.results.completed`, Go control plane consumes and updates run record | Run status transitions from QUEUED -> RUNNING -> SUCCEEDED (or FAILED). Timing fields populated. Output artifact IDs attached. |

---

### Epic E-1.2.2: Artifact Management

**Description:** Artifacts produced by tool execution are stored in MinIO with content integrity verification (SHA-256 hash). Artifacts can be downloaded via presigned URLs.

#### User Stories

**US-1.2.3: As a platform user, I want artifacts to be stored with SHA-256 integrity hashes so that I can verify artifact authenticity.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.2.3a | Verify artifact finalization computes SHA-256 hash — when Rust runner reports artifact upload complete, Go control plane computes/verifies SHA-256 and stores in artifact record | Artifact record includes `sha256` field. Hash matches independent computation of artifact content. |
| T-1.2.3b | Verify `GET /v0/artifacts/{id}` returns artifact metadata including SHA-256 hash | Response includes: id, name, type, size_bytes, sha256, created_at, run_id, tool_id. |
| T-1.2.3c | Verify `GET /v0/artifacts/{id}/download-url` returns a presigned MinIO download URL | URL is valid for 15 minutes. Downloading via URL returns the correct artifact content. Content-Type header matches artifact type. |
| T-1.2.3d | Verify content-hash immutability — once artifact is finalized with a SHA-256, it cannot be overwritten | Attempt to re-upload to same artifact key returns 409 Conflict. Artifact record remains unchanged. |

---

### Epic E-1.2.3: Cost Tracking

**Description:** Every tool run has both an estimated cost (computed before execution from resource allocation and expected duration) and an actual cost (computed after execution from real resource usage and actual duration).

#### User Stories

**US-1.2.4: As a platform operator, I want cost tracked per run so that I can bill teams and optimize resource usage.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.2.4a | Compute `cost_estimate` before execution: `cpu_cores * estimated_duration_sec * cpu_rate + memory_gb * estimated_duration_sec * mem_rate` | cost_estimate populated on run creation (before execution starts). Uses tool's resource limits and average duration. |
| T-1.2.4b | Compute `cost_actual` after execution: `cpu_cores * actual_duration_sec * cpu_rate + memory_gb * actual_duration_sec * mem_rate` | cost_actual populated on run completion. Uses actual duration from started_at to completed_at. |
| T-1.2.4c | Expose cost fields in `GET /v0/runs/{id}` response | Both `cost_estimate` and `cost_actual` fields present. cost_actual is null while run is in progress. |
| T-1.2.4d | Define cost rate constants (configurable via env vars): `AIRAIE_CPU_RATE_PER_SEC=0.00001`, `AIRAIE_MEM_RATE_PER_GB_SEC=0.000005` | Rates loaded from environment. Default values used if env vars missing. |

---

### Epic E-1.2.4: Trust Score Update

**Description:** After each tool run completes, the tool version's trust score (success_rate) is updated using a Bayesian formula that converges toward the true success rate over many runs.

#### User Stories

**US-1.2.5: As a platform operator, I want tool trust scores to update automatically after each run so that ToolShelf rankings reflect real-world reliability.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.2.5a | Implement Bayesian trust update: `new_rate = (old_rate * run_count + outcome) / (run_count + 1)` where outcome=1 for success, outcome=0 for failure | After a successful run on a tool with 90% rate and 10 runs: new_rate = (0.9*10+1)/11 = 0.9091. After a failure: new_rate = (0.9*10+0)/11 = 0.8182. |
| T-1.2.5b | Increment `run_count` on tool version after each run completion | run_count field accurately reflects total completed runs. |
| T-1.2.5c | Update `success_rate` field on `tool_versions` table | success_rate transitions from 1.0 (default) toward actual rate. Updated atomically to prevent race conditions. |
| T-1.2.5d | Trigger trust update asynchronously on run completion (goroutine with panic recovery) | Trust update does not block run completion response. Panics in trust update are recovered and logged, not propagated. |

---

### Epic E-1.2.5: Frontend — Tool Detail Page

**Description:** A comprehensive tool detail page showing all tool information, version history, contract details, execution configuration, usage statistics, and a test run interface.

#### User Stories

**US-1.2.6: As a platform user, I want a detailed tool page so that I can understand a tool's capabilities, review its contract, and run a test execution.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.2.6a | Build `ToolDetailPage.tsx` with route `/tools/:id` — page shell with tab navigation: Overview, Contract, Versions, Runs, Settings | Page loads tool data via `useToolDetail(id)`. All tabs render. URL updates on tab change. |
| T-1.2.6b | Overview tab: tool name, description, adapter badge, category badge, trust level badge, status badge, key metrics (success rate %, avg duration, total runs, cost per run) | All fields render from API data. Trust level uses color coding (untested=grey, community=blue, tested=green, verified=purple, certified=gold). |
| T-1.2.6c | Contract tab: input ports table (name, type, required, description), output ports table (name, type, description), raw JSON view toggle | Tables render from contract data. JSON view uses syntax highlighting. |
| T-1.2.6d | Versions tab: version history list (version, status, trust_level, published_at, run_count), publish button for draft versions | List sorted by version (descending). Publish button calls `POST /v0/tools/{id}/versions/{v}/publish`. |
| T-1.2.6e | Runs tab: recent runs table (run_id, status, duration, cost, created_at), link to run detail | Table sorted by created_at descending. Status shown as colored badge. |
| T-1.2.6f | Test Run panel (sidebar or collapsible section): auto-generated input form from contract (text field for strings, number input for numbers, file upload zone for artifacts, JSON editor for json type), "Run Tool" button, output preview on completion | Form fields generated dynamically from `contract.inputs`. Run button calls `POST /v0/runs`. Output section updates when run completes (polling every 2s). |

**US-1.2.7: As a platform user, I want the tools list to support table view with a quick inspector so that I can quickly scan and compare tools.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.2.7a | Add table view toggle to `ToolRegistryPage.tsx` — switch between existing card view and new table view | Toggle button (grid icon / list icon). Active view persisted in UI store. |
| T-1.2.7b | Table view: columns [Name, Category, Adapter, Status, Trust Level, Success Rate, Runs, Cost/Run, Version] with sortable headers | All columns render. Clicking header sorts ascending/descending. Default sort by name. |
| T-1.2.7c | Quick inspector panel: clicking a table row opens a right-side panel showing tool summary (name, description, contract summary, key metrics, "View Detail" link) | Panel slides in from right. Shows condensed tool info. "View Detail" navigates to `/tools/:id`. Click outside closes panel. |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort (hrs) | Inputs | Output | Definition of Done |
|---------|-------------|-------|-------------|--------|--------|-------------------|
| T-1.2.1a | Verify presigned download URL generation | BE | 3 | MinIO client, artifact record | Verified URL generation in `service/run.go` | Integration test: generate URL -> download artifact -> content matches |
| T-1.2.1b | Verify presigned upload URL generation | BE | 3 | MinIO client, job payload | Verified URL generation in `service/run.go` | Integration test: generate URL -> upload content -> artifact accessible |
| T-1.2.1c | Verify Docker sandbox enforcement | BE | 4 | Rust runner, Docker adapter | Verified sandbox flags in `docker.rs` | Test: CPU limit, memory OOM, network isolation, PIDs limit |
| T-1.2.1d | Verify timeout enforcement | BE | 2 | Rust runner timeout logic | Verified timeout kill | Test: long-running container killed at timeout |
| T-1.2.1e | Verify OOM kill handling | BE | 2 | Rust runner error handling | OOM detection code path verified | Test: memory-hogging container detected as OOM |
| T-1.2.2a | Verify POST /v0/runs dispatch | BE | 3 | Run handler, NATS publisher | Verified dispatch flow | Integration test: POST -> DB record -> NATS message |
| T-1.2.2b | Verify GET /v0/runs/{id} response | BE | 2 | Run handler, model | Full run detail response | Response includes all required fields |
| T-1.2.2c | Verify NATS result consumption | BE | 4 | NATS consumer, run service | Verified result processing | E2E test: dispatch -> execute -> result -> DB update |
| T-1.2.3a | Verify SHA-256 on finalization | BE | 3 | Artifact service, MinIO | SHA-256 hash stored | Hash matches independent computation |
| T-1.2.3b | Verify GET /v0/artifacts/{id} | BE | 1 | Artifact handler | Full artifact metadata response | SHA-256, size, type all present |
| T-1.2.3c | Verify artifact download URL | BE | 2 | MinIO presigned URL | Working download URL | Download returns correct content with correct Content-Type |
| T-1.2.3d | Verify content-hash immutability | BE | 2 | Artifact finalization logic | 409 on re-upload | Attempting to overwrite finalized artifact fails |
| T-1.2.4a | Cost estimate calculation | BE | 2 | Resource limits, rate constants | cost_estimate populated | Correct calculation verified with known inputs |
| T-1.2.4b | Cost actual calculation | BE | 2 | Run timing, rate constants | cost_actual populated | Correct calculation with actual duration |
| T-1.2.4c | Cost fields in API response | BE | 1 | Run model, handler | Updated GET response | Both fields present, cost_actual null during execution |
| T-1.2.4d | Cost rate env var config | BE | 1 | Env var loading | Rate constants configurable | Defaults work when env vars absent |
| T-1.2.5a | Bayesian trust update formula | BE | 3 | Run outcome, current trust | Updated success_rate | Formula verified with known inputs (multiple scenarios) |
| T-1.2.5b | Run count increment | BE | 1 | Run completion event | Updated run_count | Atomic increment on each completion |
| T-1.2.5c | Success rate DB update | BE | 2 | Trust formula result | Updated tool_versions row | Atomic update prevents race conditions |
| T-1.2.5d | Async trust update goroutine | BE | 2 | Run completion handler | Async update with panic recovery | Panic in trust update does not crash server |
| T-1.2.6a | ToolDetailPage shell | FE | 4 | Route, useToolDetail hook | Page with tab navigation | Page loads, all tabs render, URL updates |
| T-1.2.6b | Overview tab | FE | 3 | Tool data | Overview component | All fields render with correct formatting and badges |
| T-1.2.6c | Contract tab | FE | 3 | Contract data | Contract viewer component | Port tables render, JSON toggle works |
| T-1.2.6d | Versions tab | FE | 3 | Version data | Version list component | Sorted list, publish button works |
| T-1.2.6e | Runs tab | FE | 2 | Run data | Runs table component | Sorted by date, status badges, links |
| T-1.2.6f | Test Run panel | FE | 6 | Contract inputs, run API | Dynamic form + run + output display | Form generated from contract, run dispatched, output shown on completion |
| T-1.2.7a | Table view toggle | FE | 2 | UI store, ToolRegistryPage | View toggle component | Switches between card and table view |
| T-1.2.7b | Table view implementation | FE | 4 | Tool list data | Sortable table component | All columns render, sorting works |
| T-1.2.7c | Quick inspector panel | FE | 3 | Tool summary data | Slide-in panel component | Panel opens on row click, shows summary, closes on outside click |

**Total Effort:** ~74 hours (BE: 44h, FE: 30h)

---

## 4. Technical Implementation Plan

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend                                                        │
│  ├── ToolDetailPage.tsx (/tools/:id)                             │
│  │   ├── OverviewTab (metrics, badges, description)              │
│  │   ├── ContractTab (input/output port tables, JSON viewer)     │
│  │   ├── VersionsTab (version list, publish actions)             │
│  │   ├── RunsTab (recent runs table)                             │
│  │   └── TestRunPanel (dynamic input form → POST /v0/runs)       │
│  └── ToolRegistryPage.tsx                                        │
│      ├── CardView (existing)                                     │
│      ├── TableView (new, sortable columns)                       │
│      └── QuickInspector (slide-in panel on row click)            │
├─────────────────────────────────────────────────────────────────┤
│  Backend: Go Control Plane                                       │
│  ├── POST /v0/runs                                               │
│  │   ├── Validate tool_id + version exist                        │
│  │   ├── Generate presigned upload URLs for outputs               │
│  │   ├── Generate presigned download URLs for input artifacts     │
│  │   ├── Create Run record (status=QUEUED, cost_estimate)        │
│  │   └── Publish to NATS airaie.jobs.tool.execution              │
│  ├── NATS Consumer (airaie.results.completed)                    │
│  │   ├── Update Run record (status, timing, outputs)             │
│  │   ├── Compute cost_actual                                     │
│  │   ├── Finalize artifacts (SHA-256)                            │
│  │   └── Async: Update trust score (Bayesian)                   │
│  └── GET /v0/artifacts/{id}/download-url                         │
│      └── Generate presigned MinIO download URL (15-min TTL)      │
├─────────────────────────────────────────────────────────────────┤
│  Rust Data Plane (runner)                                        │
│  ├── NATS Consumer (airaie.jobs.tool.execution)                  │
│  │   ├── Download input artifacts via presigned URLs             │
│  │   ├── docker run with sandbox flags                           │
│  │   │   ├── --cpus={cpu_limit}                                  │
│  │   │   ├── --memory={memory_limit}                             │
│  │   │   ├── --network={none|bridge}                             │
│  │   │   ├── --pids-limit={pids_limit}                           │
│  │   │   └── --timeout={timeout_seconds}                         │
│  │   ├── Stream stdout/stderr logs                               │
│  │   ├── Upload output artifacts via presigned URLs              │
│  │   └── Publish result to airaie.results.completed              │
│  └── Error handling: OOM detection, timeout kill, crash recovery │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure                                                  │
│  ├── NATS JetStream                                              │
│  │   ├── airaie.jobs.tool.execution (job dispatch)               │
│  │   └── airaie.results.completed (result delivery)              │
│  └── MinIO                                                       │
│      ├── Bucket: airaie-artifacts                                │
│      ├── Presigned upload URLs (15-min TTL, size limit)          │
│      └── Presigned download URLs (15-min TTL)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 API Specifications

#### POST /v0/runs
```
Request:
{
  "tool_id": "tool_fea_solver",
  "tool_version": "1.0.0",
  "inputs": {
    "mesh_file": { "artifact_id": "art_abc123" },
    "threshold": 250.0,
    "output_format": "vtk"
  },
  "resource_overrides": {
    "cpu": 4,
    "memory_mb": 4096,
    "timeout_seconds": 600
  }
}

Response 201:
{
  "id": "run_xyz789",
  "tool_id": "tool_fea_solver",
  "tool_version": "1.0.0",
  "status": "QUEUED",
  "inputs": { ... },
  "cost_estimate": 0.024,
  "created_at": "2026-04-20T14:00:00Z"
}
```

#### GET /v0/runs/{id}
```
Response 200:
{
  "id": "run_xyz789",
  "tool_id": "tool_fea_solver",
  "tool_version": "1.0.0",
  "status": "SUCCEEDED",
  "inputs": { "mesh_file": { "artifact_id": "art_abc123" }, "threshold": 250.0 },
  "outputs": {
    "result": { "artifact_id": "art_def456" },
    "metrics": { "max_stress": 245.3, "max_displacement": 0.012 }
  },
  "cost_estimate": 0.024,
  "cost_actual": 0.018,
  "created_at": "2026-04-20T14:00:00Z",
  "started_at": "2026-04-20T14:00:02Z",
  "completed_at": "2026-04-20T14:00:17Z",
  "duration_seconds": 15,
  "error": null
}
```

#### GET /v0/artifacts/{id}
```
Response 200:
{
  "id": "art_def456",
  "name": "result.vtk",
  "type": "application/octet-stream",
  "size_bytes": 2457600,
  "sha256": "a3f2b8c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  "run_id": "run_xyz789",
  "tool_id": "tool_fea_solver",
  "created_at": "2026-04-20T14:00:17Z",
  "finalized": true
}
```

#### GET /v0/artifacts/{id}/download-url
```
Response 200:
{
  "url": "https://minio.local:9000/airaie-artifacts/art_def456/result.vtk?X-Amz-Algorithm=...",
  "expires_at": "2026-04-20T14:15:17Z"
}
```

### 4.3 Database Changes

No new migrations required for Sprint 1.2. The `runs`, `artifacts`, and `tool_versions` tables already have the required columns (`cost_estimate`, `cost_actual`, `sha256`, `success_rate`, `run_count`). This sprint verifies and utilizes existing schema.

### 4.4 Frontend Components

**New Files:**
- `frontend/src/pages/ToolDetailPage.tsx` — Full tool detail page with tab navigation
- `frontend/src/components/tools/OverviewTab.tsx` — Tool overview with metrics and badges
- `frontend/src/components/tools/ContractViewer.tsx` — Contract port tables with JSON toggle
- `frontend/src/components/tools/VersionHistory.tsx` — Version list with publish actions
- `frontend/src/components/tools/RunsTable.tsx` — Recent runs table with status badges
- `frontend/src/components/tools/TestRunPanel.tsx` — Dynamic input form with run execution and output display
- `frontend/src/components/tools/ToolTableView.tsx` — Sortable table view for tool list
- `frontend/src/components/tools/QuickInspector.tsx` — Right-side slide-in panel for tool summary

**Modified Files:**
- `frontend/src/pages/ToolRegistryPage.tsx` — Add table view toggle, integrate TableView and QuickInspector
- `frontend/src/App.tsx` — Add route `/tools/:id` for ToolDetailPage
- `frontend/src/types/tool.ts` — Add `Run` type, `Artifact` type, expand `Tool` with trust_level
- `frontend/src/api/tools.ts` — Add `createRun()`, `fetchRun()`, `fetchArtifact()`, `fetchArtifactDownloadUrl()`
- `frontend/src/hooks/useTools.ts` — Add `useRunDetail(id)`, `useToolRuns(toolId)` query hooks, `useCreateRun()` mutation

### 4.5 Backend Logic

**Cost Calculation (`service/run.go`):**
```go
const (
    DefaultCPURatePerSec = 0.00001  // $0.036/hr per CPU core
    DefaultMemRatePerGBSec = 0.000005 // $0.018/hr per GB
)

func (s *RunService) computeCostEstimate(tool *model.ToolVersion) float64 {
    cpuCores := float64(tool.Resources.CPU)
    memGB := float64(tool.Resources.MemoryMB) / 1024.0
    estimatedDuration := float64(tool.AvgDurationSeconds)
    if estimatedDuration == 0 {
        estimatedDuration = float64(tool.Resources.TimeoutSeconds) / 2.0 // estimate half of timeout
    }
    return cpuCores*estimatedDuration*s.cpuRate + memGB*estimatedDuration*s.memRate
}

func (s *RunService) computeCostActual(run *model.Run) float64 {
    duration := run.CompletedAt.Sub(run.StartedAt).Seconds()
    cpuCores := float64(run.ResourceAllocation.CPU)
    memGB := float64(run.ResourceAllocation.MemoryMB) / 1024.0
    return cpuCores*duration*s.cpuRate + memGB*duration*s.memRate
}
```

**Bayesian Trust Update (`service/registry.go`):**
```go
func (s *RegistryService) updateTrustScore(ctx context.Context, toolID, version string, success bool) error {
    return s.store.Transaction(ctx, func(tx Store) error {
        tv, err := tx.GetToolVersionForUpdate(ctx, toolID, version) // SELECT ... FOR UPDATE
        if err != nil {
            return err
        }
        outcome := 0.0
        if success {
            outcome = 1.0
        }
        newRate := (tv.SuccessRate*float64(tv.RunCount) + outcome) / float64(tv.RunCount+1)
        tv.SuccessRate = newRate
        tv.RunCount = tv.RunCount + 1
        return tx.UpdateToolVersion(ctx, tv)
    })
}
```

### 4.6 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Rust runner crashes mid-execution | NATS message remains unacked. DLQ handler moves to dead letter after 3 attempts. Run set to FAILED with `RUNNER_CRASH` reason. |
| MinIO presigned URL expires during long upload | Upload fails. Rust runner retries with new URL request (up to 2 retries). On final failure, run set to FAILED with `ARTIFACT_UPLOAD_FAILED`. |
| Container exits with non-zero exit code | Rust runner reports failure. Run status FAILED with exit code in error field. Partial output artifacts still finalized if present. |
| SHA-256 mismatch on artifact (tampering or corruption) | Artifact finalization fails. Artifact marked as `corrupted`. Run set to FAILED with `ARTIFACT_INTEGRITY_FAILED`. |
| Concurrent trust updates for same tool version | `SELECT ... FOR UPDATE` row lock ensures serial updates. Second goroutine waits for first to complete. |
| Tool version not found for given tool_id + version | `POST /v0/runs` returns 404 with message identifying which version was not found. |
| Run for a draft (unpublished) tool version | Allowed for testing purposes. Run record tagged with `is_test_run=true`. Does not affect trust score. |

---

## 5. UX/UI Requirements

### 5.1 Screens

**Screen: Tool Detail Page (`/tools/:id`)**

Layout: Full-width page. Left: main content area with tab navigation. Right (optional): Test Run collapsible sidebar.

**Top Section (always visible):**
- Tool name (large heading)
- Status badge (Published / Draft / Deprecated)
- Adapter badge with icon
- Category badge
- Trust level badge with color
- Action buttons: "Test Run" (toggles sidebar), "Edit" (navigates to edit page), "Deprecate" (confirmation dialog)

**Overview Tab:**
- Description (multi-line text)
- Metrics grid (2x2): Success Rate (%), Average Duration (formatted), Total Runs (count), Cost per Run ($)
- Supported intents list (pills)
- Domain tags list (pills)

**Contract Tab:**
- Two-section layout: Input Ports (table), Output Ports (table)
- Table columns: Port Name, Type (with type icon), Required (check/dash), Description
- "View Raw JSON" toggle at top — expands to syntax-highlighted JSON of full contract
- Port type uses color coding: artifact=blue, string=green, number=orange, json=purple, boolean=grey

**Versions Tab:**
- Table: Version (monospace), Status (badge), Trust Level (badge), Published Date, Run Count
- Sorted by version descending (latest first)
- Draft versions show "Publish" button inline
- Clicking version shows a detail expandable row with contract diff (if multiple versions exist)

**Runs Tab:**
- Table: Run ID (monospace, truncated), Status (colored badge: QUEUED=grey, RUNNING=blue pulse, SUCCEEDED=green, FAILED=red), Duration, Cost, Created At
- Clicking run navigates to run detail page (or expands inline with inputs/outputs)
- Pagination: 20 per page

**Test Run Panel (right sidebar):**
- Header: "Test Run" with close button
- Dynamic form generated from contract inputs:
  - `artifact` type: file upload dropzone (drag & drop or click to browse)
  - `string` type: text input
  - `number` type: number input with step=any
  - `json` type: JSON editor (textarea with syntax validation)
  - `boolean` type: toggle switch
- Required fields marked with asterisk
- "Run" button (primary, full width) — disabled until all required fields filled
- Progress section (appears after run starts):
  - Status badge with pulse animation for RUNNING
  - Duration counter (live updating)
  - Cancel button
- Output section (appears after run completes):
  - Output port values rendered by type
  - Artifact outputs: name + download link
  - JSON outputs: formatted display
  - Metrics summary

**Screen: Tools List — Table View**

Layout: Same page as existing ToolRegistryPage. New toggle in header to switch view.

**Table View:**
- Compact rows with columns: [checkbox], Name (with adapter icon), Category, Adapter, Status, Trust, Success%, Runs, Cost/Run, Version
- Row click opens QuickInspector panel (right side, 320px width)
- Column headers clickable for sort (arrow indicator)
- Alternating row background for readability

**Quick Inspector Panel:**
- Slides in from right edge
- Tool name, description (2 lines truncated), adapter + category badges
- Mini metrics: success rate, total runs, avg duration
- Contract summary: "X inputs, Y outputs"
- Supported intents (pill list)
- "View Full Detail" button -> navigates to `/tools/:id`
- Close button (X) in top-right corner

### 5.2 User Flows

**Test Run Happy Path:**
1. User navigates to `/tools/tool_fea_solver`
2. Clicks "Test Run" button -> right sidebar opens
3. Uploads a mesh file artifact (drag-drop)
4. Enters threshold: 250
5. Selects output_format: "vtk"
6. Clicks "Run" button -> button shows spinner
7. Status transitions: QUEUED (grey) -> RUNNING (blue pulse, ~15s) -> SUCCEEDED (green)
8. Output section appears: result artifact (download link), metrics JSON (formatted)
9. User clicks download link -> artifact downloads

**Test Run Failure Path:**
1-6. Same as above
7. Status transitions: QUEUED -> RUNNING -> FAILED (red)
8. Error section appears with error message: "Container exceeded memory limit (OOM killed)"
9. User adjusts resource overrides in collapsible "Advanced" section and retries

### 5.3 States

| State | Visual |
|-------|--------|
| Page loading | Skeleton placeholders for header, tabs, content |
| Tool not found | 404 page with "Tool not found" message and back link |
| Test run idle | Empty sidebar with form inputs |
| Test run in progress | Animated status badge, live duration counter, disabled form |
| Test run succeeded | Green status, output section expanded, download links |
| Test run failed | Red status, error message, "Retry" button |
| Table view empty | "No tools registered" message with "Register Tool" CTA |
| Quick inspector open | Right panel visible (320px), table area compressed |

---

## 6. QA & Testing Plan

### 6.1 Unit Tests (Backend)

| Test Suite | File | Tests |
|------------|------|-------|
| Presigned URL generation | `service/run_test.go` | Valid URL for uploads/downloads, expiry time correct, bucket/key correct |
| Cost calculation | `service/run_test.go` | Estimate with known inputs, actual with known duration, zero-duration edge case, custom rates |
| Trust score update | `service/registry_test.go` | Bayesian formula with success, failure, edge cases (first run, 100th run), concurrent updates |
| Artifact finalization | `service/artifact_test.go` | SHA-256 computation, immutability check, corrupted artifact handling |

### 6.2 Integration Tests (Backend)

| Test | Description | Assertions |
|------|-------------|------------|
| `TestToolRunEndToEnd` | POST /v0/runs -> NATS dispatch -> Rust runner (mocked) -> result -> run complete | Run transitions through all states, cost populated, artifacts finalized |
| `TestArtifactSHA256OnFinalize` | Upload artifact -> finalize -> verify hash | SHA-256 in DB matches hash of uploaded content |
| `TestArtifactDownloadURL` | Create artifact -> GET download URL -> download content | Content matches original upload, Content-Type correct |
| `TestArtifactImmutability` | Finalize artifact -> attempt re-upload | 409 Conflict returned, original artifact unchanged |
| `TestCostTracking` | Execute tool with known resources -> verify cost | cost_estimate within 10% of expected, cost_actual calculated from real timing |
| `TestTrustScoreUpdate` | Execute tool (success) -> check trust | success_rate and run_count updated correctly |
| `TestTrustScoreFailure` | Execute tool (failure) -> check trust | success_rate decreased, run_count incremented |

### 6.3 Frontend Tests

| Test | Framework | Description |
|------|-----------|-------------|
| ToolDetailPage rendering | Vitest + Testing Library | All tabs render, correct data displayed, loading state |
| Test Run form generation | Vitest + Testing Library | Form fields generated from contract inputs, correct input types |
| Test Run execution flow | Vitest + MSW | Mock POST /v0/runs and GET polling, status transitions displayed |
| Table view rendering | Vitest + Testing Library | Columns render, sorting works, row click opens inspector |
| Quick inspector | Vitest + Testing Library | Panel opens on click, shows data, closes on outside click |
| E2E tool detail + test run | Playwright | Navigate to tool -> test run -> verify output appears |

### 6.4 Manual Testing Checklist

- [ ] Execute FEA Solver tool from ToolDetailPage test run — artifacts appear
- [ ] Execute a tool that exceeds memory limit — OOM error displayed
- [ ] Execute a tool that exceeds timeout — timeout error displayed
- [ ] Verify artifact SHA-256 matches file content (download + hash)
- [ ] Verify cost_estimate before run and cost_actual after run
- [ ] Verify trust score decreases after a failed run
- [ ] Table view: sort by each column — order correct
- [ ] Quick inspector: click row -> panel shows tool summary

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Rust runner not fully operational after Phase 0 | Medium | Critical | Mock the NATS result for frontend testing. Prioritize Rust runner verification on Day 1. Fallback: Python adapter for initial testing. |
| MinIO presigned URL generation fails in local dev | Low | Medium | Docker Compose already includes MinIO. Verify MinIO accessible at startup. Add health check. |
| Docker-in-Docker issues in development environment | Medium | Medium | Use Docker socket mounting. Document dev setup requirements. CI uses dedicated Docker host. |
| Trust score race condition under concurrent runs | Low | Medium | `SELECT FOR UPDATE` prevents concurrent writes. Load test with 10 parallel runs to verify. |
| Dynamic form generation from contract is complex | Medium | Low | Limit to 5 known port types initially. `json` type uses plain textarea. No nested schema support in v1. |

---

## 8. Dependencies

| Dependency | Type | Status | Owner | Impact if Blocked |
|------------|------|--------|-------|-------------------|
| Sprint 1.1 complete | Prerequisite | Expected done by 2026-04-17 | Team | Cannot create tool versions to execute |
| Rust runner operational (Phase 0 B3) | Prerequisite | Expected verified | BE | Core of this sprint — no execution without runner |
| NATS JetStream running | Infrastructure | Available in Docker Compose | DevOps | Job dispatch/result consumption blocked |
| MinIO running | Infrastructure | Available in Docker Compose | DevOps | Artifact storage blocked |
| `useToolDetail(id)` hook | Internal | Exists in `useTools.ts` | FE | ToolDetailPage depends on this hook |
| `createRun()` API function | Internal | Does not exist yet — create in this sprint | FE | Test Run panel depends on this |

---

## 9. Sprint Execution Plan

### Day 1 (2026-04-18): Execution Pipeline Verification

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE Stream 1 | Verify presigned URL generation (T-1.2.1a, T-1.2.1b), verify NATS dispatch (T-1.2.2a) | MinIO + NATS running |
| BE Stream 2 | Verify Docker sandbox enforcement (T-1.2.1c), timeout (T-1.2.1d), OOM (T-1.2.1e) | Rust runner + Docker |
| FE Stream 1 | Build ToolDetailPage shell + Overview tab + Contract tab (T-1.2.6a, T-1.2.6b, T-1.2.6c) | useToolDetail hook exists |

### Day 2 (2026-04-21): Artifacts, Cost, Trust + Frontend

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE Stream 1 | Verify SHA-256, artifact immutability, download URLs (T-1.2.3a-d) | Day 1 presigned URLs working |
| BE Stream 2 | Implement cost tracking (T-1.2.4a-d), Bayesian trust update (T-1.2.5a-d) | Day 1 NATS result consumption working |
| FE Stream 1 | Build Versions tab + Runs tab (T-1.2.6d, T-1.2.6e), add route | Day 1 page shell done |
| FE Stream 2 | Build Test Run panel (T-1.2.6f) | Day 1 contract tab done (for port types) |

### Day 3 (2026-04-22): Table View, Integration, Testing

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE + QA | Integration tests for run pipeline, artifact verification, cost and trust | Day 1-2 backend complete |
| FE Stream 1 | Build table view + quick inspector (T-1.2.7a-c) | Day 1-2 tool list exists |
| FE + QA | Frontend tests, E2E test, manual testing checklist | Day 1-2 frontend complete |
| All | Bug fixes, code review, sprint demo prep | All streams converging |

### Critical Path

```
Day 1: Presigned URLs + NATS dispatch → Day 2: SHA-256 + cost + trust → Day 3: Integration tests
Day 1: Detail page shell → Day 2: Test Run panel + tabs → Day 3: E2E test
```

---

## 10. Definition of Done

- [ ] Tool executes in Docker via NATS dispatch to Rust runner
- [ ] Presigned URLs generated for artifact upload/download (verified with MinIO)
- [ ] Docker sandbox enforced: CPU, memory, network, PIDs limits verified
- [ ] Timeout enforcement kills container after configured timeout
- [ ] OOM kills detected and reported correctly
- [ ] Artifacts stored with SHA-256 hash on finalization
- [ ] Artifacts are immutable after finalization (409 on re-upload)
- [ ] Artifact download via presigned URL returns correct content
- [ ] Cost estimate computed before execution, cost actual computed after
- [ ] Trust score updates via Bayesian formula after each run completion
- [ ] ToolDetailPage renders with 5 tabs: Overview, Contract, Versions, Runs, Settings
- [ ] Test Run panel generates dynamic form from contract, dispatches run, shows output
- [ ] Tools list supports table view with sortable columns
- [ ] Quick inspector panel opens on table row click
- [ ] Integration tests pass for run pipeline, artifacts, cost, trust
- [ ] Frontend tests pass (Vitest + Playwright)
- [ ] Code reviewed and approved by TL
- [ ] No P0/P1 bugs open

---

## 11. Deliverables Checklist

| # | Deliverable | Type | Status |
|---|------------|------|--------|
| 1 | Verified presigned URL generation (upload + download) | Backend | [ ] |
| 2 | Verified Docker sandbox enforcement (CPU, memory, network, PIDs) | Backend | [ ] |
| 3 | Verified timeout and OOM handling | Backend | [ ] |
| 4 | Verified NATS dispatch and result consumption | Backend | [ ] |
| 5 | SHA-256 verification on artifact finalization | Backend | [ ] |
| 6 | Artifact immutability enforcement | Backend | [ ] |
| 7 | Cost estimate + cost actual computation | Backend | [ ] |
| 8 | Cost rate configuration via env vars | Backend | [ ] |
| 9 | Bayesian trust score update (async, panic-safe) | Backend | [ ] |
| 10 | `ToolDetailPage.tsx` with 5 tabs | Frontend | [ ] |
| 11 | Test Run panel with dynamic form and output display | Frontend | [ ] |
| 12 | Table view for tools list with sortable columns | Frontend | [ ] |
| 13 | Quick inspector panel | Frontend | [ ] |
| 14 | Route `/tools/:id` in App.tsx | Frontend | [ ] |
| 15 | API functions: `createRun`, `fetchRun`, `fetchArtifact`, `fetchArtifactDownloadUrl` | Frontend | [ ] |
| 16 | Backend integration tests (run pipeline, artifacts, cost, trust) | Testing | [ ] |
| 17 | Frontend tests (Vitest + Playwright) | Testing | [ ] |

---

## 12. Optional — Metrics & Release

### Sprint Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tool execution success rate (test runs) | >= 90% | Count of successful test runs / total test runs |
| Artifact integrity verification | 100% SHA-256 match | All finalized artifacts match computed hash |
| Run status transition accuracy | 100% correct transitions | No runs stuck in intermediate state |
| API response time (POST /v0/runs) | < 500ms p95 | Load test |
| API response time (GET /v0/runs/{id}) | < 100ms p95 | Load test |

### Release Notes (Draft)

**Sprint 1.2 Release — Tool Execution & Artifact Management**
- Docker-based tool execution via NATS dispatch to Rust runner
- Sandbox enforcement: CPU limits, memory limits (OOM detection), network isolation, PIDs limits
- Artifact storage in MinIO with SHA-256 integrity verification
- Artifact immutability — finalized artifacts cannot be overwritten
- Cost tracking per run: estimated (pre-execution) + actual (post-execution)
- Bayesian trust score: tool reliability scores update automatically after each run
- Tool Detail page with contract viewer, version history, and test run interface
- Table view for tool registry with sortable columns and quick inspector panel

---
---

# Sprint 1.3 — ToolShelf Resolution Engine

**Sprint Duration:** 2026-04-23 to 2026-04-25 (3 working days)
**Sprint Goal:** Implement the 5-stage ToolShelf resolution engine (DISCOVER, FILTER, RANK, EXPLAIN, ASSEMBLE) with 3 resolution strategies and a frontend panel that displays ranked tool recommendations with score breakdowns and explanations.

---

## 1. Sprint Overview

| Attribute | Value |
|-----------|-------|
| Sprint ID | `S-1.3` |
| Sprint Name | ToolShelf Resolution Engine |
| Duration | 3 working days (2026-04-23 — 2026-04-25) |
| Velocity Target | 39 story points (13 pts/day) |
| Goal | 5-stage tool resolution with 3 strategies and frontend panel |
| Entry Criteria | Sprint 1.2 complete: tools execute in Docker, artifacts stored, trust scores updated |
| Exit Criteria | ToolShelf resolves tools by intent type through all 5 stages, 3 scoring strategies produce different rankings, explanations show per-factor attribution, frontend panel renders recommendations |

**Key Deliverables:**
- Backend: 5-stage resolution pipeline (DISCOVER->FILTER->RANK->EXPLAIN->ASSEMBLE), 3 scoring strategies (Weighted, Priority, CostOptimized), explanation with per-factor attribution and filtered-tool reasoning
- Frontend: ToolShelfPanel component showing recommended tools with score breakdowns, alternatives, and unavailable tools with reasons and action suggestions
- APIs: Enhanced `POST /v0/toolshelf/resolve`, `POST /v0/toolshelf/resolve/v2`, `GET /v0/toolshelf/resolve/{id}/explain`

---

## 2. Scope Breakdown

### Epic E-1.3.1: 5-Stage Resolution Pipeline

**Description:** The ToolShelf resolution engine resolves matching tools for a given intent type through a 5-stage pipeline. Each stage narrows and enriches the result set.

#### User Stories

**US-1.3.1: As a board card executor, I want the ToolShelf to find the best tool for my intent type so that the right tool is automatically selected for execution.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.3.1a | **DISCOVER stage** — Query `tool_versions.supported_intents` using GIN index with `@>` containment operator. Match intent_type from request against supported_intents JSONB array. Return all tool versions that support the given intent. | Query uses GIN index (verified with EXPLAIN). Returns all matching tool versions. No false negatives (tools with matching intent are always found). Empty result returns empty list (not error). |
| T-1.3.1b | **FILTER stage** — Apply 5 filters sequentially: (1) `trust_level` filter — exclude tools below minimum trust for the context (e.g., Release mode requires `verified+`); (2) `adapter_compatibility` — exclude tools whose adapter is not available in current environment; (3) `version_status` — include only `published` versions; (4) `tenant_access` — exclude tools the requesting user/team doesn't have access to (stub for now, pass-through); (5) `quota_availability` — exclude tools that would exceed cost/compute quota. Record filter reason for each excluded tool. | Each filter independently testable. Filtered-out tools collected with reason and filter_stage name. Tenant access is a pass-through stub. Quota check compares estimated cost against remaining budget. |
| T-1.3.1c | **RANK stage** — Compute composite score for each tool that passed filters. Default Weighted strategy formula: `score = trust_weight(trust_level) + success_rate * 80 + intent_confidence * 40 + preference_bonus - cost * 0.1 - time * 0.05`. Trust weight mapping: certified=100, verified=70, tested=30, community=10, untested=0. Preference bonus: +50 if tool is marked as preferred for this intent type. | Scores computed correctly for known inputs. Tools sorted by score descending. Ties broken by trust_level, then success_rate. |
| T-1.3.1d | **EXPLAIN stage** — For each ranked tool, produce per-factor attribution breakdown: `{ trust_contribution: N, success_contribution: N, intent_contribution: N, preference_contribution: N, cost_penalty: N, time_penalty: N, total: N }`. For each filtered-out tool, produce explanation: `{ reason: "trust_level_too_low", message: "Tool has trust_level 'untested', minimum for this context is 'tested'", suggested_action: "Run 10+ successful tests to increase trust_level" }`. | Attribution sums to total score. Every filtered tool has a reason, message, and suggested_action. |
| T-1.3.1e | **ASSEMBLE stage** — Construct final response with 3 lists: `recommended[]` (top tool), `alternatives[]` (remaining ranked tools, max 5), `unavailable_with_reasons[]` (filtered-out tools with explanations). Include resolution metadata: `resolved_at`, `intent_type`, `strategy_used`, `total_discovered`, `total_filtered`, `total_ranked`. | Response has all 3 lists. recommended is the single top-scored tool (or null if none pass). alternatives is the next 5. unavailable_with_reasons includes all filtered tools. Metadata is accurate. |

---

### Epic E-1.3.2: 3 Resolution Strategies

**Description:** ToolShelf supports 3 scoring strategies that produce different rankings based on different optimization goals.

#### User Stories

**US-1.3.2: As a platform operator, I want to choose between scoring strategies so that tool selection can be optimized for reliability, compatibility, or cost.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.3.2a | **Weighted strategy** (default) — Use the composite formula from T-1.3.1c. Balanced across all factors. | Same as T-1.3.1c ranking. This is the default when no strategy specified. |
| T-1.3.2b | **Priority strategy** — Rank by highest compatibility score (intent_confidence) first. On ties, break by trust_level (certified > verified > tested > community > untested). On further ties, break by success_rate. Does not consider cost. | For tools with equal intent_confidence, higher trust wins. Cost has zero influence. Verified with test case where cheap tool loses to expensive but higher-trust tool. |
| T-1.3.2c | **CostOptimized strategy** — Weighted formula with cost-heavy weights: `score = 0.2 * compatibility + 0.2 * trust_normalized + 0.6 * (1 - cost_normalized)`. Normalize cost: `cost_normalized = tool_cost / max_cost_in_set`. Normalize trust: `trust_normalized = trust_weight / 100`. Normalize compatibility: `compatibility = intent_confidence`. | Cheapest tools rank higher. Verified with test case where expensive high-trust tool loses to cheap medium-trust tool. |
| T-1.3.2d | Strategy selection via API — `POST /v0/toolshelf/resolve` accepts `strategy` parameter: `"weighted"`, `"priority"`, `"cost_optimized"`. Default `"weighted"`. | Each strategy produces different rankings for the same tool set. Invalid strategy returns 400. |

---

### Epic E-1.3.3: Pipeline-Aware Resolution (v2)

**Description:** The v2 resolution endpoint supports resolving tools for an entire pipeline (multiple steps), considering inter-step data compatibility and holistic optimization.

#### User Stories

**US-1.3.3: As a board card executor, I want pipeline-aware resolution so that tools selected for multi-step pipelines are compatible with each other.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.3.3a | `POST /v0/toolshelf/resolve/v2` accepts a pipeline specification: `{ steps: [{ intent_type, input_types, output_types }] }` and resolves tools for each step considering output-to-input type compatibility. | Step 2 candidates filtered to those whose input types are compatible with Step 1's output types. |
| T-1.3.3b | Cross-step type compatibility check — verify that selected tool's output port types can feed the next step's input port types. Artifact types are universally compatible. Typed ports (string, number, json) must match exactly. | Incompatible tools filtered with reason `output_type_mismatch`. |
| T-1.3.3c | Pipeline-level optimization — when using CostOptimized strategy, optimize total pipeline cost, not per-step cost. | Cheapest total pipeline may include individually non-cheapest tools. |

---

### Epic E-1.3.4: Explanation Endpoint

**Description:** A dedicated explanation endpoint that provides detailed reasoning for a resolution result, useful for debugging and audit.

#### User Stories

**US-1.3.4: As a platform operator, I want to understand why a specific tool was recommended or excluded so that I can tune tool contracts and trust levels.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.3.4a | Wire `GET /v0/toolshelf/resolve/{id}/explain` to return the detailed explanation for a cached resolution result. | Returns full explanation including per-factor attribution for all ranked tools and per-filter reasons for all excluded tools. |
| T-1.3.4b | Cache resolution results for 5 minutes with resolution ID. | Resolution ID returned in resolve response. Explain endpoint retrieves cached result. Cache expiry returns 404 with message. |
| T-1.3.4c | Explanation includes strategy comparison — show how rankings would differ under all 3 strategies. | Explanation response includes `strategy_comparison: { weighted: [...rankings], priority: [...rankings], cost_optimized: [...rankings] }`. |

---

### Epic E-1.3.5: Frontend — ToolShelf Panel

**Description:** A reusable UI panel component that displays ToolShelf resolution results, used in Board Studio (card execution), Agent Studio (tool selection), and standalone.

#### User Stories

**US-1.3.5: As a board card operator, I want to see recommended tools with score breakdowns so that I can understand why a tool was selected and override if needed.**

Tasks:
| Task ID | Task | Acceptance Criteria |
|---------|------|---------------------|
| T-1.3.5a | Build `ToolShelfPanel.tsx` component — receives intent_type as prop, calls `POST /v0/toolshelf/resolve`, displays results in 3 sections: Recommended, Alternatives, Unavailable. | Component renders after API call. Shows loading skeleton during fetch. Handles empty results gracefully ("No tools found for this intent"). |
| T-1.3.5b | Recommended section — show top tool with: name, version, trust level badge, score (large number), score breakdown bar chart (stacked horizontal bar showing trust, success, intent, preference, cost penalty, time penalty contributions). "Select" button. | Score breakdown visually shows how much each factor contributes. Hovering a segment shows exact value. Select button triggers `onSelect(tool)` callback. |
| T-1.3.5c | Alternatives section — show remaining ranked tools as compact cards: name, version, trust badge, score, "Use Instead" button. Collapsed by default, expandable. | Maximum 5 alternatives shown. Expand/collapse toggle. "Use Instead" calls `onSelect(tool)`. |
| T-1.3.5d | Unavailable section — show filtered-out tools with: name, reason (colored by filter type), suggested action as actionable text. | Trust filter: "Increase trust level by running more tests". Adapter filter: "Switch to Docker adapter". Version filter: "Publish a version first". |
| T-1.3.5e | Strategy selector — dropdown in panel header to switch between Weighted, Priority, CostOptimized. Re-resolves on change. | Changing strategy re-fetches with new strategy parameter. Rankings visually change. Current strategy displayed in header. |
| T-1.3.5f | Score comparison view — toggle to show side-by-side scores for top 3 tools across all 3 strategies (radar chart or comparison table). | Toggle shows multi-strategy comparison. Each tool shows 3 scores. Helps operators understand tradeoffs. |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort (hrs) | Inputs | Output | Definition of Done |
|---------|-------------|-------|-------------|--------|--------|-------------------|
| T-1.3.1a | DISCOVER stage — GIN index query | BE | 3 | Intent type, GIN index | Discovery query in `toolshelf.go` | EXPLAIN shows index scan. All matching tools returned. |
| T-1.3.1b | FILTER stage — 5 sequential filters | BE | 5 | Discovered tools, filter criteria | Filter chain in `toolshelf.go` | Each filter independently testable. Filtered tools have reasons. |
| T-1.3.1c | RANK stage — Weighted composite score | BE | 4 | Filtered tools, scoring formula | Ranking function in `toolshelf.go` | Scores match expected values for known inputs. |
| T-1.3.1d | EXPLAIN stage — Attribution + filter reasons | BE | 4 | Ranked tools, filtered tools | Explanation generator | Attribution sums to total. Every filtered tool has explanation. |
| T-1.3.1e | ASSEMBLE stage — Final response construction | BE | 2 | Ranked + filtered + metadata | Assembled response DTO | 3 lists present, metadata accurate, max 5 alternatives. |
| T-1.3.2a | Weighted strategy (default) | BE | 0 | Same as T-1.3.1c (included) | — | — (covered by RANK stage) |
| T-1.3.2b | Priority strategy | BE | 3 | Filter chain, trust hierarchy | Strategy implementation | Different ranking from Weighted. Cost ignored. |
| T-1.3.2c | CostOptimized strategy | BE | 3 | Filter chain, cost normalization | Strategy implementation | Cheap tools rank higher. Different from Weighted. |
| T-1.3.2d | Strategy selection API parameter | BE | 1 | Strategy enum, request parser | Strategy routing | 3 values accepted. Invalid returns 400. |
| T-1.3.3a | Pipeline-aware resolve v2 | BE | 4 | Pipeline spec, per-step resolution | v2 resolve handler | Multi-step resolution with type compatibility. |
| T-1.3.3b | Cross-step type compatibility | BE | 3 | Port type matching rules | Type compatibility checker | Artifact-artifact always compatible. Type mismatches filtered. |
| T-1.3.3c | Pipeline-level cost optimization | BE | 2 | CostOptimized + pipeline | Pipeline cost optimizer | Total pipeline cost minimized, not per-step. |
| T-1.3.4a | Wire explain endpoint | BE | 2 | Cached results, handler | GET explain handler | Returns full explanation for cached resolution. |
| T-1.3.4b | Resolution result cache (5-min TTL) | BE | 2 | In-memory cache (sync.Map or LRU) | Cache with TTL | Results retrievable by ID. Expired returns 404. |
| T-1.3.4c | Strategy comparison in explanation | BE | 2 | All 3 strategies, same tool set | Comparison output | All 3 rankings included in explain response. |
| T-1.3.5a | ToolShelfPanel shell | FE | 3 | API call, component structure | `ToolShelfPanel.tsx` shell | Loading, empty, and populated states render. |
| T-1.3.5b | Recommended section with score breakdown | FE | 5 | Ranked tool data, score attribution | Recommended tool card with stacked bar | Bar chart shows 6 factor contributions. Hover shows values. |
| T-1.3.5c | Alternatives section | FE | 2 | Alternative tools data | Collapsible alternatives list | Max 5, expand/collapse, "Use Instead" callback. |
| T-1.3.5d | Unavailable section with reasons | FE | 3 | Filtered tools data | Unavailable tools list | Reason, message, suggested action displayed per tool. |
| T-1.3.5e | Strategy selector | FE | 2 | Strategy enum, re-resolve callback | Dropdown in panel header | Changes strategy and re-fetches. |
| T-1.3.5f | Score comparison view | FE | 4 | Multi-strategy scores | Comparison table/chart | Side-by-side scores for top 3 tools across 3 strategies. |

**Total Effort:** ~59 hours (BE: 40h, FE: 19h)

---

## 4. Technical Implementation Plan

### 4.1 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend: ToolShelfPanel.tsx                                 │
│  ├── StrategySelector → dropdown                             │
│  ├── RecommendedToolCard → name, score, attribution bar      │
│  ├── AlternativesList → collapsible compact cards            │
│  ├── UnavailableList → reason + action per tool              │
│  └── ComparisonView → multi-strategy score table             │
│                                                              │
│  API Calls:                                                  │
│  ├── POST /v0/toolshelf/resolve                              │
│  ├── POST /v0/toolshelf/resolve/v2 (pipeline mode)           │
│  └── GET /v0/toolshelf/resolve/{id}/explain                  │
├──────────────────────────────────────────────────────────────┤
│  Backend: service/toolshelf.go                               │
│                                                              │
│  5-Stage Pipeline:                                           │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│  │ DISCOVER │ → │  FILTER  │ → │   RANK   │                 │
│  │          │   │          │   │          │                 │
│  │ GIN idx  │   │ 5 filters│   │ Strategy │                 │
│  │ @> query │   │ sequential   │ composite│                 │
│  └──────────┘   └──────────┘   └──────────┘                 │
│       ↓              ↓              ↓                        │
│  all_matches    filtered_out    ranked_list                  │
│                                                              │
│  ┌──────────┐   ┌──────────┐                                 │
│  │ EXPLAIN  │ → │ ASSEMBLE │                                 │
│  │          │   │          │                                 │
│  │ Per-tool │   │ 3 lists  │                                 │
│  │ attrib.  │   │ + meta   │                                 │
│  └──────────┘   └──────────┘                                 │
│       ↓              ↓                                       │
│  explanations    final_response                              │
│                                                              │
│  Strategies:                                                 │
│  ├── Weighted (default): balanced composite score            │
│  ├── Priority: compatibility first, tiebreak trust           │
│  └── CostOptimized: 60% cost weight                          │
│                                                              │
│  Cache:                                                      │
│  └── sync.Map with 5-min TTL for resolution results          │
├──────────────────────────────────────────────────────────────┤
│  Database: PostgreSQL                                        │
│  └── tool_versions (GIN index on supported_intents)          │
│      SELECT * FROM tool_versions                             │
│      WHERE supported_intents @> '["sim.fea"]'::jsonb         │
│      AND status = 'published'                                │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 API Specifications

#### POST /v0/toolshelf/resolve
```
Request:
{
  "intent_type": "sim.fea",
  "strategy": "weighted",
  "context": {
    "board_mode": "study",
    "min_trust_level": "tested",
    "max_cost": 5.0,
    "preferred_tools": ["tool_fea_solver"]
  },
  "inputs": [
    { "name": "geometry", "type": "artifact" },
    { "name": "material", "type": "string" }
  ],
  "constraints": {
    "max_duration_seconds": 600,
    "adapter": "docker"
  }
}

Response 200:
{
  "resolution_id": "res_abc123",
  "intent_type": "sim.fea",
  "strategy": "weighted",
  "resolved_at": "2026-04-24T10:00:00Z",
  "metadata": {
    "total_discovered": 8,
    "total_filtered_out": 4,
    "total_ranked": 4,
    "resolution_time_ms": 23
  },
  "recommended": {
    "tool_id": "tool_fea_solver",
    "tool_version": "1.0.0",
    "name": "FEA Solver",
    "trust_level": "verified",
    "success_rate": 0.96,
    "cost_estimate": 0.5,
    "time_estimate": "15s",
    "score": 284.45,
    "score_breakdown": {
      "trust_contribution": 70.0,
      "success_contribution": 76.8,
      "intent_contribution": 40.0,
      "preference_contribution": 50.0,
      "cost_penalty": -0.05,
      "time_penalty": -0.75,
      "total": 236.0
    },
    "match_reasons": ["supports sim.fea", "verified trust level", "preferred tool"],
    "confidence": 0.95
  },
  "alternatives": [
    {
      "tool_id": "tool_thermal",
      "tool_version": "2.0.0",
      "name": "Thermal Solver",
      "trust_level": "tested",
      "success_rate": 0.93,
      "cost_estimate": 1.7,
      "time_estimate": "56s",
      "score": 180.35,
      "score_breakdown": { ... },
      "match_reasons": ["supports sim.fea"],
      "confidence": 0.78
    }
  ],
  "unavailable_with_reasons": [
    {
      "tool_id": "tool_topo",
      "name": "Topology Optimizer",
      "reason": "trust_level_too_low",
      "message": "Tool has trust_level 'untested', minimum for Study mode is 'tested'",
      "filter_stage": "trust_level",
      "suggested_action": "Run 10+ successful tests to increase trust_level to 'tested'"
    },
    {
      "tool_id": "tool_surrogate",
      "name": "Surrogate Predictor",
      "reason": "version_not_published",
      "message": "Tool version v0.5.0 is in 'draft' status",
      "filter_stage": "version_status",
      "suggested_action": "Publish the tool version to make it available for resolution"
    }
  ]
}
```

#### POST /v0/toolshelf/resolve/v2
```
Request:
{
  "pipeline": {
    "steps": [
      {
        "step_id": "mesh",
        "intent_type": "cad.mesh",
        "input_types": [{ "name": "geometry", "type": "artifact" }],
        "output_types": [{ "name": "mesh", "type": "artifact" }]
      },
      {
        "step_id": "solve",
        "intent_type": "sim.fea",
        "input_types": [{ "name": "mesh_file", "type": "artifact" }],
        "output_types": [{ "name": "result", "type": "artifact" }, { "name": "metrics", "type": "json" }]
      },
      {
        "step_id": "analyze",
        "intent_type": "analysis.post_process",
        "input_types": [{ "name": "result", "type": "artifact" }],
        "output_types": [{ "name": "report", "type": "artifact" }]
      }
    ]
  },
  "strategy": "cost_optimized",
  "context": { "board_mode": "explore" }
}

Response 200:
{
  "resolution_id": "res_pipe_xyz",
  "steps": [
    {
      "step_id": "mesh",
      "recommended": { ... },
      "alternatives": [ ... ],
      "unavailable_with_reasons": [ ... ]
    },
    {
      "step_id": "solve",
      "recommended": { ... },
      "alternatives": [ ... ],
      "unavailable_with_reasons": [ ... ]
    },
    {
      "step_id": "analyze",
      "recommended": { ... },
      "alternatives": [ ... ],
      "unavailable_with_reasons": [ ... ]
    }
  ],
  "total_pipeline_cost": 0.9,
  "total_pipeline_time": "44s",
  "compatibility_warnings": []
}
```

#### GET /v0/toolshelf/resolve/{id}/explain
```
Response 200:
{
  "resolution_id": "res_abc123",
  "intent_type": "sim.fea",
  "strategy_used": "weighted",
  "resolved_at": "2026-04-24T10:00:00Z",
  "ranked_tools": [
    {
      "tool_id": "tool_fea_solver",
      "rank": 1,
      "score": 236.0,
      "breakdown": {
        "trust_contribution": { "value": 70.0, "explanation": "trust_level=verified, weight=70" },
        "success_contribution": { "value": 76.8, "explanation": "success_rate=0.96 * 80 = 76.8" },
        "intent_contribution": { "value": 40.0, "explanation": "intent_confidence=1.0 * 40 = 40.0" },
        "preference_contribution": { "value": 50.0, "explanation": "tool is preferred for sim.fea (+50)" },
        "cost_penalty": { "value": -0.05, "explanation": "cost=0.5 * 0.1 = 0.05" },
        "time_penalty": { "value": -0.75, "explanation": "time=15s * 0.05 = 0.75" }
      }
    }
  ],
  "filtered_tools": [
    {
      "tool_id": "tool_topo",
      "filter_stage": "trust_level",
      "reason": "trust_level 'untested' < minimum 'tested' for Study mode",
      "suggested_action": "Run 10+ successful tests to increase trust_level"
    }
  ],
  "strategy_comparison": {
    "weighted": [
      { "tool_id": "tool_fea_solver", "rank": 1, "score": 236.0 },
      { "tool_id": "tool_thermal", "rank": 2, "score": 180.35 }
    ],
    "priority": [
      { "tool_id": "tool_fea_solver", "rank": 1, "score": 1.0 },
      { "tool_id": "tool_thermal", "rank": 2, "score": 0.93 }
    ],
    "cost_optimized": [
      { "tool_id": "tool_thermal", "rank": 1, "score": 0.72 },
      { "tool_id": "tool_fea_solver", "rank": 2, "score": 0.68 }
    ]
  }
}

Response 404 (expired cache):
{
  "error": "resolution_not_found",
  "message": "Resolution res_abc123 not found or expired. Results are cached for 5 minutes."
}
```

### 4.3 Database Changes

No new migrations required. The GIN index on `tool_versions.supported_intents` was created in Sprint 1.1 (T-1.1.6d). This sprint uses the existing schema.

### 4.4 Frontend Components

**New Files:**
- `frontend/src/components/toolshelf/ToolShelfPanel.tsx` — Main panel component (accepts `intentType` prop, optional `strategy` prop)
- `frontend/src/components/toolshelf/RecommendedToolCard.tsx` — Detailed recommended tool display with score breakdown bar
- `frontend/src/components/toolshelf/ScoreBreakdownBar.tsx` — Stacked horizontal bar chart showing score factor contributions
- `frontend/src/components/toolshelf/AlternativesList.tsx` — Collapsible list of alternative tools
- `frontend/src/components/toolshelf/UnavailableList.tsx` — Filtered-out tools with reasons and suggested actions
- `frontend/src/components/toolshelf/StrategyComparison.tsx` — Multi-strategy score comparison view

**Modified Files:**
- `frontend/src/api/tools.ts` — Add `resolveToolsV2()` function, add `explainResolution()` function
- `frontend/src/hooks/useTools.ts` — Add `useToolShelfResolve(intentType, strategy)` query hook, `useResolutionExplanation(resolutionId)` query hook

**Type Additions (`frontend/src/types/tool.ts`):**
```typescript
export interface ScoreBreakdown {
  trust_contribution: number;
  success_contribution: number;
  intent_contribution: number;
  preference_contribution: number;
  cost_penalty: number;
  time_penalty: number;
  total: number;
}

export interface RankedTool {
  tool_id: string;
  tool_version: string;
  name: string;
  trust_level: TrustLevel;
  success_rate: number;
  cost_estimate: number;
  time_estimate: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  match_reasons: string[];
  confidence: number;
}

export interface UnavailableTool {
  tool_id: string;
  name: string;
  reason: string;
  message: string;
  filter_stage: string;
  suggested_action: string;
}

export type ResolutionStrategy = 'weighted' | 'priority' | 'cost_optimized';

export interface ToolResolutionResultFull {
  resolution_id: string;
  intent_type: string;
  strategy: ResolutionStrategy;
  resolved_at: string;
  metadata: {
    total_discovered: number;
    total_filtered_out: number;
    total_ranked: number;
    resolution_time_ms: number;
  };
  recommended: RankedTool | null;
  alternatives: RankedTool[];
  unavailable_with_reasons: UnavailableTool[];
}
```

### 4.5 Backend Logic

**5-Stage Pipeline (`service/toolshelf.go`):**
```go
type ToolShelfService struct {
    store       ToolVersionStore
    cache       *ResolutionCache
    strategies  map[string]ScoringStrategy
}

type ScoringStrategy interface {
    Score(ctx context.Context, tool *model.ToolVersion, req *ResolveRequest) float64
    Name() string
}

func (s *ToolShelfService) Resolve(ctx context.Context, req *ResolveRequest) (*ResolveResponse, error) {
    // Stage 1: DISCOVER
    discovered, err := s.discover(ctx, req.IntentType)
    if err != nil {
        return nil, err
    }

    // Stage 2: FILTER
    filtered, excluded := s.filter(ctx, discovered, req)

    // Stage 3: RANK
    strategy := s.strategies[req.Strategy]
    if strategy == nil {
        strategy = s.strategies["weighted"]
    }
    ranked := s.rank(ctx, filtered, strategy, req)

    // Stage 4: EXPLAIN
    explanations := s.explain(ctx, ranked, excluded, strategy)

    // Stage 5: ASSEMBLE
    response := s.assemble(ctx, ranked, excluded, explanations, req)

    // Cache result
    s.cache.Store(response.ResolutionID, response, 5*time.Minute)

    return response, nil
}
```

**Weighted Strategy:**
```go
type WeightedStrategy struct{}

func (w *WeightedStrategy) Score(ctx context.Context, tv *model.ToolVersion, req *ResolveRequest) float64 {
    trustWeight := map[string]float64{
        "certified": 100, "verified": 70, "tested": 30, "community": 10, "untested": 0,
    }
    score := trustWeight[tv.TrustLevel]
    score += tv.SuccessRate * 80
    score += calculateIntentConfidence(tv, req.IntentType) * 40
    if isPreferred(tv, req.Context.PreferredTools) {
        score += 50
    }
    score -= tv.CostPerRun * 0.1
    score -= float64(tv.AvgDurationSeconds) * 0.05
    return score
}
```

**Priority Strategy:**
```go
type PriorityStrategy struct{}

func (p *PriorityStrategy) Score(ctx context.Context, tv *model.ToolVersion, req *ResolveRequest) float64 {
    trustOrder := map[string]float64{
        "certified": 5, "verified": 4, "tested": 3, "community": 2, "untested": 1,
    }
    confidence := calculateIntentConfidence(tv, req.IntentType)
    // Primary: confidence (integer part), Secondary: trust (first decimal), Tertiary: success (second decimal)
    return confidence*1000 + trustOrder[tv.TrustLevel]*100 + tv.SuccessRate*10
}
```

**CostOptimized Strategy:**
```go
type CostOptimizedStrategy struct{}

func (c *CostOptimizedStrategy) Score(ctx context.Context, tv *model.ToolVersion, req *ResolveRequest) float64 {
    // Normalization happens in the ranking stage with access to all tools
    // This returns raw factors; the ranker normalizes
    return 0 // Placeholder — actual scoring done in rankWithNormalization
}

func (c *CostOptimizedStrategy) ScoreNormalized(tv *model.ToolVersion, maxCost float64, req *ResolveRequest) float64 {
    trustNorm := map[string]float64{
        "certified": 1.0, "verified": 0.7, "tested": 0.3, "community": 0.1, "untested": 0,
    }
    costNorm := 1.0
    if maxCost > 0 {
        costNorm = 1.0 - (tv.CostPerRun / maxCost)
    }
    compatNorm := calculateIntentConfidence(tv, req.IntentType)
    return 0.2*compatNorm + 0.2*trustNorm[tv.TrustLevel] + 0.6*costNorm
}
```

### 4.6 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| No tools match intent type (DISCOVER returns empty) | Return response with `recommended: null`, empty alternatives, metadata shows `total_discovered: 0`. |
| All discovered tools filtered out | Return response with `recommended: null`, empty alternatives, full `unavailable_with_reasons` list. |
| Only one tool passes filters | That tool is `recommended`. alternatives is empty. |
| Multiple tools with identical scores | Tiebreaker: trust_level > success_rate > tool_id (alphabetical). Deterministic ordering guaranteed. |
| Intent type is wildcard (e.g., `sim.*`) | DISCOVER uses LIKE query `supported_intents @> '["sim."]'` won't work. Use `jsonb_array_elements_text` with LIKE. |
| Extremely large tool catalog (1000+ tools) | DISCOVER is GIN-indexed (fast). FILTER and RANK operate on discovered subset (expected <50). Performance acceptable. |
| Cache collision (extremely unlikely with UUID) | Resolution IDs are UUIDs. Collision probability negligible. |
| Explain called after cache expiry | Return 404 with clear message and suggestion to re-resolve. |
| v2 pipeline with incompatible steps | Return `compatibility_warnings` listing which step transitions have type mismatches. Still returns results for each step independently. |

---

## 5. UX/UI Requirements

### 5.1 Screens

**Component: ToolShelf Panel (reusable, appears in Board Studio, Agent Studio, standalone)**

Layout: Vertical panel (400px width when sidebar, full width when standalone). Header with intent type and strategy selector. Three sections below.

**Header:**
- Intent type display: "Resolving tools for `sim.fea`" (monospace for intent type)
- Strategy selector: dropdown with 3 options (Weighted, Priority, Cost Optimized)
- Resolution metadata: "Found 4 of 8 tools in 23ms"

**Recommended Section:**
- Large card for top tool
- Tool name (bold, 16px) + version (monospace, muted)
- Trust level badge (colored by level)
- Score: large number (24px bold) with "/max" indicator
- Score breakdown: stacked horizontal bar showing 6 segments
  - Trust (blue): width proportional to contribution
  - Success Rate (green): width proportional
  - Intent Match (teal): width proportional
  - Preference Bonus (gold): width proportional (only shown if non-zero)
  - Cost Penalty (red, from right): width proportional
  - Time Penalty (orange, from right): width proportional
- Hover on any segment: tooltip with label and exact value
- Match reasons as small pills below the bar
- "Select Tool" primary button

**Alternatives Section:**
- Collapsed by default: "3 alternatives available" with expand chevron
- When expanded: compact tool cards (one per row)
  - Name + version + trust badge + score (inline)
  - "Use Instead" secondary button
  - Subtle separator between cards

**Unavailable Section:**
- Collapsed by default: "4 tools unavailable" with expand chevron
- When expanded: list items with muted styling
  - Tool name (muted text)
  - Reason tag (colored by filter_stage: trust=orange, adapter=red, version=yellow, access=grey, quota=red)
  - Suggested action text (small, italic, actionable where possible — e.g., link to tool page for "publish your tool")

**Score Comparison Toggle:**
- Toggle button in header: "Compare Strategies"
- When active: shows comparison table below header
  - Columns: Tool Name, Weighted Score, Priority Score, Cost Score
  - Rows: top 3 tools
  - Winning strategy per tool highlighted
  - "The recommended tool changes if you switch to [X] strategy" callout when applicable

### 5.2 User Flows

**Resolution Happy Path:**
1. ToolShelfPanel mounts with `intentType="sim.fea"`
2. Loading skeleton displayed (3 seconds max)
3. Results render: FEA Solver recommended with score 236, 2 alternatives, 2 unavailable
4. User hovers over score bar segments to understand scoring
5. User clicks "Select Tool" -> `onSelect({ tool_id: "tool_fea_solver", tool_version: "1.0.0" })` called

**Strategy Switch Path:**
1. User selects "Cost Optimized" from strategy dropdown
2. Panel shows loading indicator
3. Results re-render: Thermal Solver now recommended (cheaper), FEA Solver is alternative
4. User clicks "Compare Strategies" toggle
5. Comparison table shows all 3 strategy rankings side by side

**Override Path (selecting alternative):**
1. User sees FEA Solver recommended
2. User expands alternatives, sees Thermal Solver
3. User clicks "Use Instead" on Thermal Solver
4. `onSelect({ tool_id: "tool_thermal", tool_version: "2.0.0" })` called

### 5.3 States

| State | Visual |
|-------|--------|
| Loading | Skeleton for recommended card (1 large), alternatives count (shimmer), unavailable count (shimmer) |
| No tools found | Empty state: "No tools found for `sim.fea`" with suggestion to register tools |
| All filtered out | Empty recommended section, unavailable section expanded by default with explanations |
| Single tool found | Recommended tool shown, "No alternatives available" message, no alternatives section |
| Strategy changing | Brief loading overlay on panel content, strategy dropdown shows spinner |
| Error | Error banner: "Failed to resolve tools. Retry?" with retry button |
| Comparison active | Comparison table visible below header, main content below table |

---

## 6. QA & Testing Plan

### 6.1 Unit Tests (Backend)

| Test Suite | File | Tests |
|------------|------|-------|
| DISCOVER stage | `service/toolshelf_test.go` | GIN query returns matching tools, empty intent returns empty, wildcard intent |
| FILTER stage | `service/toolshelf_test.go` | Each of 5 filters independently: trust filter (below threshold excluded), adapter filter, version filter (draft excluded), tenant pass-through, quota filter |
| RANK — Weighted | `service/toolshelf_test.go` | Score calculation with known inputs, trust weight mapping, preference bonus, cost/time penalty, sort order |
| RANK — Priority | `service/toolshelf_test.go` | Highest compatibility wins, tiebreak by trust, then success rate |
| RANK — CostOptimized | `service/toolshelf_test.go` | Cheapest tool ranks highest, normalization correct, edge case max_cost=0 |
| EXPLAIN | `service/toolshelf_test.go` | Attribution sums to total, filtered tools have explanations, suggested actions present |
| ASSEMBLE | `service/toolshelf_test.go` | 3 lists correct, max 5 alternatives, metadata accurate |
| Cache | `service/cache_test.go` | Store and retrieve within TTL, miss after TTL, concurrent access |

### 6.2 Integration Tests (Backend)

| Test | Description | Assertions |
|------|-------------|------------|
| `TestResolveWeighted` | POST /v0/toolshelf/resolve with strategy=weighted and seed data (5 tools, 3 matching intent) | Correct tool recommended, correct alternatives, correct unavailable |
| `TestResolvePriority` | Same data, strategy=priority | Different ranking than weighted (verifiable with known data) |
| `TestResolveCostOptimized` | Same data, strategy=cost_optimized | Cheapest tool ranked first |
| `TestResolveNoMatches` | POST with intent_type that no tool supports | recommended=null, empty alternatives, empty unavailable |
| `TestResolveAllFiltered` | POST with high min_trust on mostly untested tools | recommended=null, all in unavailable_with_reasons |
| `TestResolveV2Pipeline` | POST /v0/toolshelf/resolve/v2 with 3-step pipeline | Per-step recommendations, type compatibility checked |
| `TestExplainEndpoint` | Resolve -> explain with resolution_id | Full explanation returned, strategy comparison included |
| `TestExplainExpiredCache` | Explain with expired/invalid resolution_id | 404 with clear message |

### 6.3 Frontend Tests

| Test | Framework | Description |
|------|-----------|-------------|
| ToolShelfPanel loading state | Vitest + Testing Library | Skeleton renders on mount |
| ToolShelfPanel populated state | Vitest + MSW | Mock resolve API, verify recommended/alternatives/unavailable render |
| Score breakdown bar | Vitest + Testing Library | 6 segments render with correct widths, hover tooltip works |
| Strategy selector | Vitest + MSW | Changing strategy triggers re-fetch, results update |
| Alternatives expand/collapse | Vitest + Testing Library | Click toggle expands, click again collapses |
| Unavailable reasons | Vitest + Testing Library | Reason, message, suggested action displayed per tool |
| Select callback | Vitest + Testing Library | "Select Tool" and "Use Instead" trigger onSelect with correct tool |
| Empty state | Vitest + MSW | No tools found message renders when API returns empty |

### 6.4 Manual Testing Checklist

- [ ] Resolve `sim.fea` with Weighted strategy — FEA Solver recommended
- [ ] Switch to CostOptimized — ranking changes (cheaper tool may take top spot)
- [ ] Switch to Priority — ranking changes (highest compatibility tool tops)
- [ ] Hover over score breakdown bar segments — tooltips show values
- [ ] Expand alternatives — compact cards visible, "Use Instead" works
- [ ] Expand unavailable — reasons and suggested actions displayed
- [ ] Resolve intent with no matching tools — empty state message
- [ ] Resolve with all tools filtered out — unavailable section expanded by default
- [ ] Click "Compare Strategies" — comparison table shows 3 columns
- [ ] Verify explain endpoint returns full attribution breakdown

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| GIN index query performance on large dataset | Low | Medium | Current catalog is small (<20 tools). GIN index verified with EXPLAIN. For future scale: add query timeout (100ms) and return partial results. |
| Scoring formula produces unexpected rankings | Medium | Medium | Unit tests with known inputs verify exact scores. Manual testing with real tool data validates intuition. Formula weights are configurable (can be tuned in production). |
| Pipeline-aware resolution (v2) is complex | Medium | Low | v2 is built on top of per-step v1 resolution. Type compatibility is the only new logic. Ship v2 as beta if time-constrained. |
| Cache eviction under load | Low | Low | 5-minute TTL with UUID keys. sync.Map handles concurrent access. For scale: replace with Redis if needed in Phase 6. |
| Score breakdown bar chart rendering edge cases | Medium | Low | Handle zero scores (no segment rendered), negative penalties (rendered from right), very small contributions (<1% width gets minimum 2px). |
| CostOptimized normalization: division by zero if all tools are free | Low | Low | If max_cost = 0, set cost_normalized = 1.0 for all tools (all equally free). |

---

## 8. Dependencies

| Dependency | Type | Status | Owner | Impact if Blocked |
|------------|------|--------|-------|-------------------|
| Sprint 1.1 complete (GIN index, supported_intents) | Prerequisite | Expected done | BE | DISCOVER stage blocked — needs GIN index and intent data |
| Sprint 1.2 complete (trust scores, success_rate, cost) | Prerequisite | Expected done | BE | RANK stage blocked — needs real trust and cost data |
| `tool_versions` table with seed data | Data | Need at least 5 published tools with varied intents | QA | Cannot test resolution without diverse tool data |
| `resolveTools()` API function in `api/tools.ts` | Internal | Exists (basic) | FE | Needs enhancement for strategy parameter and full response type |
| `useResolveTools()` mutation in `useTools.ts` | Internal | Exists (basic) | FE | Needs enhancement for query (not mutation) pattern |

---

## 9. Sprint Execution Plan

### Day 1 (2026-04-23): Core Pipeline

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE Stream 1 | DISCOVER stage (T-1.3.1a), FILTER stage (T-1.3.1b) | GIN index from Sprint 1.1 |
| BE Stream 2 | Weighted strategy scoring (T-1.3.1c / T-1.3.2a), Priority strategy (T-1.3.2b) | None (pure logic) |
| FE Stream 1 | ToolShelfPanel shell (T-1.3.5a), Recommended section (T-1.3.5b) | None (can mock data) |

### Day 2 (2026-04-24): Strategies, Explain, Assemble

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE Stream 1 | EXPLAIN stage (T-1.3.1d), ASSEMBLE stage (T-1.3.1e), CostOptimized strategy (T-1.3.2c) | Day 1 RANK done |
| BE Stream 2 | Pipeline v2 (T-1.3.3a-c), explain endpoint (T-1.3.4a-c), cache (T-1.3.4b) | Day 1 core pipeline done |
| FE Stream 1 | Alternatives section (T-1.3.5c), Unavailable section (T-1.3.5d), Strategy selector (T-1.3.5e) | Day 1 panel shell done |

### Day 3 (2026-04-25): Integration, Comparison, Testing

| Stream | Tasks | Dependencies |
|--------|-------|-------------|
| BE + QA | Integration tests for all 3 strategies, v2 pipeline, explain endpoint | Day 1-2 backend complete |
| FE Stream 1 | Score comparison view (T-1.3.5f), wire to real API, polish | Day 1-2 frontend complete |
| All | Frontend tests, E2E testing, manual testing checklist, code review | All streams complete |

### Critical Path

```
Day 1: DISCOVER + FILTER → Day 2: EXPLAIN + ASSEMBLE + v2 → Day 3: Integration tests
Day 1: Panel shell + Recommended → Day 2: Alternatives + Unavailable → Day 3: Comparison + E2E
```

---

## 10. Definition of Done

- [ ] ToolShelf resolves tools through all 5 stages (DISCOVER -> FILTER -> RANK -> EXPLAIN -> ASSEMBLE)
- [ ] DISCOVER uses GIN index on supported_intents (verified with EXPLAIN ANALYZE)
- [ ] FILTER applies 5 filters and records reason for each excluded tool
- [ ] RANK produces correct scores for all 3 strategies (Weighted, Priority, CostOptimized)
- [ ] 3 strategies produce verifiably different rankings for the same tool set
- [ ] EXPLAIN returns per-factor attribution that sums to total score
- [ ] EXPLAIN returns reason, message, and suggested_action for each filtered tool
- [ ] ASSEMBLE returns recommended, alternatives (max 5), and unavailable_with_reasons
- [ ] Pipeline-aware resolution (v2) checks cross-step type compatibility
- [ ] Explain endpoint retrieves cached results by resolution_id
- [ ] Cache expires after 5 minutes, expired results return 404
- [ ] Strategy comparison shows rankings under all 3 strategies
- [ ] Frontend ToolShelfPanel renders recommended tool with score breakdown bar
- [ ] Frontend shows alternatives (collapsible) and unavailable tools (with reasons)
- [ ] Frontend strategy selector re-resolves on change
- [ ] Frontend comparison view shows multi-strategy scores
- [ ] Unit test coverage >= 90% for toolshelf.go and all strategies
- [ ] Integration tests pass for resolve, resolve/v2, and explain endpoints
- [ ] Frontend tests pass (Vitest + Playwright)
- [ ] Code reviewed and approved by TL
- [ ] No P0/P1 bugs open

---

## 11. Deliverables Checklist

| # | Deliverable | Type | Status |
|---|------------|------|--------|
| 1 | 5-stage resolution pipeline in `service/toolshelf.go` | Backend | [ ] |
| 2 | Weighted scoring strategy | Backend | [ ] |
| 3 | Priority scoring strategy | Backend | [ ] |
| 4 | CostOptimized scoring strategy | Backend | [ ] |
| 5 | 5 filter functions with reason tracking | Backend | [ ] |
| 6 | Explanation generator with attribution + filter reasons | Backend | [ ] |
| 7 | Response assembler (3 lists + metadata) | Backend | [ ] |
| 8 | Pipeline-aware resolution v2 with type compatibility | Backend | [ ] |
| 9 | Resolution result cache (5-min TTL) | Backend | [ ] |
| 10 | `GET /v0/toolshelf/resolve/{id}/explain` handler with strategy comparison | Backend | [ ] |
| 11 | `ToolShelfPanel.tsx` main component | Frontend | [ ] |
| 12 | `RecommendedToolCard.tsx` with score breakdown bar | Frontend | [ ] |
| 13 | `ScoreBreakdownBar.tsx` stacked horizontal bar chart | Frontend | [ ] |
| 14 | `AlternativesList.tsx` collapsible alternatives | Frontend | [ ] |
| 15 | `UnavailableList.tsx` with reasons and actions | Frontend | [ ] |
| 16 | `StrategyComparison.tsx` multi-strategy view | Frontend | [ ] |
| 17 | Updated `types/tool.ts` with resolution types | Frontend | [ ] |
| 18 | Updated `api/tools.ts` with v2 resolve and explain functions | Frontend | [ ] |
| 19 | Backend unit tests (all 5 stages, 3 strategies, cache) | Testing | [ ] |
| 20 | Backend integration tests (resolve, v2, explain) | Testing | [ ] |
| 21 | Frontend tests (Vitest + Playwright) | Testing | [ ] |

---

## 12. Optional — Metrics & Release

### Sprint Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Resolution latency p95 | < 100ms | Load test with 20 concurrent resolve requests |
| GIN index query time | < 10ms | EXPLAIN ANALYZE on DISCOVER query |
| Score accuracy | 100% match expected values | Unit tests with deterministic inputs |
| Strategy differentiation | 3 strategies produce different #1 for at least 1 test case | Integration test assertion |
| Frontend render time | < 500ms from API response to painted panel | Performance profiling |

### Release Notes (Draft)

**Sprint 1.3 Release — ToolShelf Resolution Engine**
- 5-stage tool resolution pipeline: DISCOVER (GIN-indexed intent matching), FILTER (trust/adapter/version/access/quota), RANK (composite scoring), EXPLAIN (per-factor attribution), ASSEMBLE (structured response)
- 3 scoring strategies: Weighted (balanced), Priority (compatibility-first), CostOptimized (cost-first)
- Pipeline-aware resolution (v2) with cross-step type compatibility checking
- Explanation endpoint with strategy comparison showing how rankings differ across strategies
- Frontend ToolShelf panel with score breakdown visualization, alternatives, and unavailable tool explanations
- Resolution result caching (5-minute TTL) for explain endpoint

---
---

# Phase 1 Summary

## Phase Completion Criteria

All 3 sprints must pass their respective Definition of Done. Additionally, the following end-to-end scenario must work:

1. **Register** a tool via the 4-step wizard (Sprint 1.1) with full 7-section ToolContract, passing all 12 lint checks
2. **Publish** the tool after escalating trust_level to `community`
3. **Execute** the tool via the Test Run panel (Sprint 1.2) in a Docker container via NATS dispatch
4. **Verify** artifact SHA-256 integrity, cost tracking, and trust score update
5. **Resolve** the tool via ToolShelf (Sprint 1.3) with the correct intent type, seeing it ranked as recommended

## Phase Metrics

| Metric | Target |
|--------|--------|
| Total story points delivered | >= 120 of 129 |
| Backend test coverage (new code) | >= 90% |
| Frontend test coverage (new code) | >= 80% |
| P0 bugs at phase end | 0 |
| P1 bugs at phase end | <= 2 (with mitigation plan) |
| API response time p95 (all new endpoints) | < 500ms |
| Tool execution success rate (test suite) | >= 95% |

## Handoff to Phase 2

Phase 1 outputs consumed by Phase 2 (Workflow Engine):
- **Tool execution pipeline** — workflows dispatch tools via the same `POST /v0/runs` and NATS pipeline
- **ToolShelf resolution** — workflow nodes use ToolShelf to auto-select tools for plan execution
- **Artifact management** — workflow artifact lineage builds on Sprint 1.2 artifact model
- **Trust scores** — workflow preflight checks tool trust levels before execution

Phase 1 outputs consumed by Phase 3 (Agent Intelligence):
- **ToolShelf resolution** — agents use ToolShelf as the `ToolSearcher` interface for tool selection
- **Trust scores** — agent 5-dimension scoring uses tool trust as one dimension
- **Tool execution** — agent `ActionProposal` executes tools via the same pipeline

*Phase 1 documents generated: 2026-04-06*
*Based on: AIRAIE Master Sprint Plan, codebase analysis of airaie-kernel + airaie-platform*
