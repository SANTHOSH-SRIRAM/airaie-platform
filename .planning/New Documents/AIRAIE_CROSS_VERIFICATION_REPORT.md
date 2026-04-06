# AIRAIE CROSS-VERIFICATION REPORT (v2 — Definitive)

> Deep audit of 4 system documents against 8 reference sources (4 reference docs + 4 planning doc folders).
> All 10 architectural questions resolved by stakeholder.
> Date: 2026-04-06

---

## 1. SOURCE HIERARCHY (Established)

```
TIER 1 (Definitive — planning docs):
  airaie-kernel/.planning/docs/planning/doc/v1/agent-studio/  (12 files)
  airaie-kernel/.planning/docs/planning/doc/v1/board/          (11 files)
  airaie-kernel/.planning/docs/planning/doc/v1/studio/         (3 files)
  airaie-kernel/.planning/docs/planning/doc/v1/tool/           (10 files)

TIER 2 (Reference — backend docs):
  AIRAIE_KERNEL_BACKEND_REFERENCE.md
  AIRAIE_MVP_BACKEND_FRONTEND_FLOW.md
  AIRAIE_N8N_WORKFLOW_MAPPING.md
  AIRAIE_COMPREHENSIVE_SPRINT_PLAN.md

TIER 3 (To be updated — new docs):
  AIRAIE_TOOL_SYSTEM_ARCHITECTURE.md
  AIRAIE_WORKFLOW_SYSTEM_ARCHITECTURE.md
  AIRAIE_AGENT_SYSTEM_ARCHITECTURE.md
  AIRAIE_BOARD_SYSTEM_ARCHITECTURE.md
```

---

## 2. RESOLVED DECISIONS (10/10)

| # | Question | Decision | Impact on New Docs |
|---|----------|----------|-------------------|
| 1 | IntentSpec | **YES — include as core concept** | Board doc gets IntentSpec model, lifecycle, API. Card model gets intent_spec_id. |
| 2 | ToolContract port types | **3-type (artifact/parameter/metric) + JSONSchema** | Tool doc rewritten with 3 port types, constraints object, value_schema. |
| 3 | Agent memory types | **Dual system: episodic/semantic (pgvector) + fact/preference/lesson/error_pattern** | Agent doc gets pgvector memory with embedding-based retrieval AND 4 sub-types. |
| 4 | Agent scoring | **5 dimensions (compat 0.4 + trust 0.3 + cost 0.2 + latency 0.1 + risk penalty)** | Agent doc updated with 5-dim scoring + risk penalty. |
| 5 | Agent reasoning | **5-phase (THINK-SELECT-VALIDATE-PROPOSE-EXPLAIN) + 13-step pipeline** | Agent doc replaces 8-step loop with 5-phase cycle + 13-step execution. |
| 6 | Board mode → agent policy | **YES — include governance inheritance** | Board doc adds confidence thresholds per mode that auto-inject into agent policy. |
| 7 | Card types | **Rich model (6 types, 8 statuses, deps DAG, IntentSpec, ExecutionPlan)** | Board doc gets full card model matching kernel backend. |
| 8 | Trust formula | **Bayesian: (successes + 5) / (total + 10)** | Agent + Tool docs get explicit formula. |
| 9 | NATS subjects | **Namespaced: airaie.jobs.tool.execution, etc.** | All docs updated to namespaced subjects. |
| 10 | ToolShelf | **YES — include 5-stage algorithm** | Tool doc gets ToolShelf section. Agent doc references it. |

---

## 3. CONFLICTS RESOLVED

All 18 conflicts from the v1 report are now resolved. Here's the summary:

| Conflict | Resolution |
|----------|-----------|
| #1 Tool model structure | Use planning docs: Tool + ToolVersion + ToolContract (7 required sections) |
| #2 Tool contract structure | Use 3-type (artifact/parameter/metric) + JSONSchema |
| #3 NATS subjects | Use namespaced: airaie.jobs.tool.execution, etc. |
| #5 Run status | Add AWAITING_APPROVAL to match kernel |
| #6 NodeRun status | Add RETRYING, BLOCKED, CANCELED to match kernel |
| #7 Expression syntax | Dual syntax: DSL uses $inputs/$nodes, canvas uses $('Name').json — compiler translates |
| #8 Agent version type | Use integer (1, 2, 3) matching kernel, NOT semver |
| #9 Scoring weights | Use 5-dim from planning docs |
| #10 Memory types | Dual: episodic/semantic storage + fact/preference/lesson/error_pattern categorization |
| #11 Agent version lifecycle | draft → validated → published (from kernel, NO deprecated state) |
| #12 Board status | DRAFT and ARCHIVED only (no "active") — active state implied by mode |
| #13 Card model | Rich model with 6 types, 8 statuses, full state machine |
| #14 Gate types | evidence, review, compliance (from kernel) |
| #15 Gate status | PENDING, EVALUATING, PASSED, FAILED, WAIVED (no BLOCKED — blocked is computed) |
| #16 Readiness | Weighted 5-category formula from kernel |
| #17 Board status | Already resolved in #12 |
| #18 Evidence collection | 10-step process from kernel |

---

## 4. GAPS RESOLVED

| Gap | Resolution |
|-----|-----------|
| #1 Agent replanning | Include: ProposalGenerator.GenerateWithFailureContext — excludes failed tool, enriches context |
| #2 Board composition depth | Include: max depth 3 from kernel |
| #3 IntentSpec | Include: Full IntentSpec model with lifecycle |
| #4 Pipeline | Include: Pipeline model with steps, trust_level, data flow |
| #5 ExecutionPlan | Include: Full plan model with PlanNodes, PlanEdges, bindings |
| #6 ToolShelf | Include: 5-stage resolution algorithm |
| #7 CardEvidence | Include: Separate entity with criterion evaluation |
| #8 Trust levels | Include: untested → community → tested → verified → certified |
| #9 Board Type Registry | Include: TypeRegistry with verticals, board_types, gate_types |
| #10 Preflight validation | Include: 6 universal + domain-specific checks |

---

## 5. WHAT EACH NEW DOC NEEDS (Rewrite Spec)

### TOOL SYSTEM ARCHITECTURE — Changes Required

1. **ToolContract schema**: Replace 7-type with 3-type (artifact/parameter/metric) + JSONSchema
2. **ToolContract structure**: Use planning docs' 7 required sections (metadata, interface, runtime, capabilities, governance + 2 optional)
3. **Add `supported_intents`**: Tools declare which intent types they satisfy
4. **Add `trust_level`**: untested → community → tested → verified → certified
5. **Trust formula**: Add Bayesian formula (successes + 5) / (total + 10)
6. **NATS subjects**: Use namespaced airaie.jobs.tool.execution
7. **Add ToolShelf resolution**: 5-stage algorithm (DISCOVER → FILTER → RANK → EXPLAIN → ASSEMBLE)
8. **Add 9 runtime adapters**: docker, python, native, remote_api, notebook, workflow, cli, human_task, hardware_device
9. **Add tool tier taxonomy**: Tier 1 (Primitives), Tier 2 (Domain Operators), Tier 3 (Products/Composites)
10. **Add lifecycle**: Add potential `suspended` state between published and deprecated
11. **Add validation**: 12 lint checks from planning docs
12. **Job result status**: SUCCEEDED | FAILED | TIMEOUT | CANCELED (not just SUCCEEDED | FAILED)

### WORKFLOW SYSTEM ARCHITECTURE — Changes Required

1. **Run status**: Add AWAITING_APPROVAL
2. **NodeRun status**: Add RETRYING, BLOCKED, CANCELED (8 total states)
3. **Expression syntax**: Document dual syntax (DSL format + canvas format)
4. **NATS subjects**: Use namespaced
5. **Preflight**: Add 6 universal + domain checks
6. **ExecutionPlan**: Add as intermediary between workflow definition and execution
7. **Node states full machine**: Match kernel (draft→ready→queued→running→completed/failed/blocked/skipped)

### AGENT SYSTEM ARCHITECTURE — Changes Required

1. **Version type**: Change from semver string to integer
2. **Version lifecycle**: draft → validated → published (remove deprecated)
3. **Scoring**: 5 dimensions (compat 0.4, trust 0.3, cost 0.2, latency 0.1, risk penalty)
4. **Trust formula**: Bayesian (successes + 5) / (total + 10)
5. **Memory**: Dual system — pgvector (episodic/semantic) + categorization (fact/preference/lesson/error_pattern)
6. **Reasoning cycle**: 5-phase THINK-SELECT-VALIDATE-PROPOSE-EXPLAIN + 13-step pipeline
7. **Replanning**: Add ProposalGenerator.GenerateWithFailureContext
8. **Policy verdicts**: APPROVED, NEEDS_APPROVAL, REJECTED, ESCALATE (4 verdicts)
9. **Board mode override**: Explore=0.5, Study=0.75, Release=0.90 confidence thresholds
10. **NATS subjects**: Namespaced
11. **ToolShelf integration**: Reference 5-stage algorithm for tool discovery
12. **AgentSpec schema**: Match planning docs (7 mandatory + 3 optional sections)

### BOARD SYSTEM ARCHITECTURE — Changes Required

1. **IntentSpec**: Add as core concept with full model and lifecycle
2. **Card model**: Rich 6-type, 8-status model with dependencies DAG
3. **CardEvidence**: Add separate entity for criterion evaluation
4. **ExecutionPlan**: Add plan generation from IntentSpec → Pipeline → Plan
5. **ToolShelf**: Add tool resolution for cards
6. **Gate types**: evidence, review, compliance (from kernel)
7. **Gate status**: Remove BLOCKED (computed, not stored)
8. **Board status**: DRAFT | ARCHIVED only
9. **Readiness**: Weighted 5-category formula
10. **Evidence collection**: 10-step process
11. **Board mode → agent thresholds**: Explore=0.5, Study=0.75, Release=0.90
12. **Composition depth**: max 3
13. **Pipeline**: Add Pipeline model for reusable tool chains
14. **Board Kernel**: 8-section invariant (Intent, Context, Inputs, ToolShelf, Plan, Validation, Runs, Governance)

---

## 6. IMPLEMENTATION READINESS (Post-Rewrite)

Once all 4 docs are rewritten with the above changes:

| Component | Status | Notes |
|-----------|--------|-------|
| Tool System | ✅ Ready | Aligned to planning docs' ToolContract v1 |
| Workflow System | ✅ Ready | Aligned to kernel execution engine |
| Agent System | ✅ Ready | Aligned to 5-phase cycle + 13-step pipeline |
| Board System | ✅ Ready | Aligned to IntentSpec-driven board kernel |
| Cross-component | ✅ Ready | ToolShelf bridges all components |

### What's Consistent Across ALL Sources ✅

- Go control plane + Rust data plane architecture
- NATS JetStream for async dispatch (namespaced subjects)
- PostgreSQL + MinIO storage
- Artifact references (not blobs) between nodes
- DAG-based workflow with topological ordering (Kahn's algorithm)
- 5-dimension hybrid scoring for agents
- Bayesian trust scoring
- Board governance modes (Explore → Study → Release)
- IntentSpec as universal contract
- ToolShelf as intelligent resolution engine
- Evidence auto-collection from workflow runs
- Gate-based governance with requirements
- pgvector for agent memory
- 9 runtime adapters (docker primary)
- SSE for real-time frontend updates

---

## 7. REWRITE STATUS

All 4 new documents will be rewritten in alignment with:
- Planning docs (Tier 1 — definitive)
- Kernel backend reference (Tier 2)
- 10 stakeholder decisions

**Estimated changes per document:**
- Tool doc: ~40% rewritten (contract structure, ToolShelf, trust levels, adapters)
- Workflow doc: ~15% rewritten (status values, NATS, preflight, expressions)
- Agent doc: ~50% rewritten (scoring, memory, reasoning cycle, replanning, board mode override)
- Board doc: ~60% rewritten (IntentSpec, rich cards, CardEvidence, Pipeline, ExecutionPlan, ToolShelf, readiness formula)

---

*Generated: 2026-04-06*
*Sources: 12 documents analyzed (4 planning folders + 4 reference docs + 4 new docs)*
*Decisions: 10/10 resolved by stakeholder*