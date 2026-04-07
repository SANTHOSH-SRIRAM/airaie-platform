# AIRAIE Sprint Documentation Index

> Complete sprint documentation for the Airaie platform implementation roadmap.
> Generated: 2026-04-07 | Source: AIRAIE_MASTER_SPRINT_PLAN.md
> Total: 8 phases, 34 sprints, 20,918 lines of documentation

---

## Timeline Overview

```
Week 1         Phase 0: Unblock (3-5 days)
                    |
Week 2-3       Phase 1: Tool Execution Golden Path (8-12 days)
                    |
               ______|______
              |             |
Week 4-6   Phase 2:      Phase 3:         <-- PARALLEL
           Workflows     Agents
              |_____________|
                    |
Week 7-9       Phase 4: Board Governance (12-18 days)
                    |
Week 10-11     Phase 5: Integration & E2E (8-12 days)
                    |
Week 12-14     Phase 6: Production Readiness (10-15 days)
                    |
Week 15+       Phase 7: Advanced Features (ongoing)
```

**MVP (Phases 0-5):** ~10-12 weeks | **Production (Phases 0-6):** ~14-16 weeks

---

## Sprint Documents

### Phase 0: Unblock - Fix Critical Blockers
| Sprint | File | Duration | Key Deliverables |
|--------|------|----------|-----------------|
| **0.1** Fix Blockers | [PHASE_0_SPRINT_0.1_UNBLOCK.md](PHASE_0_SPRINT_0.1_UNBLOCK.md) | Apr 7-11 (5 days) | Node ID sanitization, stub removal, Rust runner verification, LLM provider wiring |

**Stats:** 1 sprint, 1,445 lines, 16 tasks, 29.5 hrs, 15 test cases

---

### Phase 1: Tool Execution Golden Path
| Sprint | File | Duration | Key Deliverables |
|--------|------|----------|-----------------|
| **1.1** Tool Registration & Contract Validation | [PHASE_1_TOOL_EXECUTION.md](PHASE_1_TOOL_EXECUTION.md) | Apr 14-17 (4 days) | 7-section ToolContract, 12 lint checks, trust levels, RegisterTool wizard |
| **1.2** Tool Execution & Artifact Management | Same file | Apr 18-22 (3 days) | Docker execution, presigned URLs, SHA-256, cost tracking, Bayesian trust |
| **1.3** ToolShelf Resolution Engine | Same file | Apr 23-25 (3 days) | 5-stage resolution (DISCOVER-FILTER-RANK-EXPLAIN-ASSEMBLE), 3 strategies |

**Stats:** 3 sprints, 2,477 lines, 30+ tasks per sprint, full API specs

---

### Phase 2: Workflow Engine Completion
| Sprint | File | Duration | Key Deliverables |
|--------|------|----------|-----------------|
| **2.1** Compilation & Validation | [PHASE_2_WORKFLOW_ENGINE.md](PHASE_2_WORKFLOW_ENGINE.md) | Apr 28-30 (3 days) | 5-stage compiler, 7-check validator, dual expression syntax, preflight |
| **2.2** Execution & Scheduling | Same file | May 1-3 (3 days) | Topological scheduler, NATS dispatch, 8-state NodeRun machine, retry |
| **2.3** Expression System & Data Flow | Same file | May 5-8 (4 days) | CodeMirror 6 editor, board/gate/cost expressions, ParameterForm |
| **2.4** Versioning & Triggers | Same file | May 9-12 (3 days) | Version lifecycle, webhook/cron/event triggers |

**Stats:** 4 sprints, 2,752 lines, 26 tasks (15 BE + 11 FE), 145 hrs

---

### Phase 3: Agent Intelligence Layer
| Sprint | File | Duration | Key Deliverables |
|--------|------|----------|-----------------|
| **3.1** Scoring & Tool Selection | [PHASE_3_AGENT_INTELLIGENCE.md](PHASE_3_AGENT_INTELLIGENCE.md) | Apr 28-30 (3 days) | 5-dimension scoring, LLM blend, deterministic fallback |
| **3.2** Proposal Generation & Policy Engine | Same file | May 1-3 (3 days) | ActionProposal, 4 policy verdicts, board mode override |
| **3.3** Agent Memory (pgvector) | Same file | May 4-6 (3 days) | pgvector embeddings, episodic TTL, semantic extraction, auto-learning |
| **3.4** Multi-Turn Sessions & Replanning | Same file | May 7-9 (3 days) | Session management, context accumulation, replanning, decision trace |

**Stats:** 4 sprints, 3,283 lines, exact scoring formulas, pgvector SQL schemas

> **Note:** Phase 2 and Phase 3 run IN PARALLEL (different engineers/teams)

---

### Phase 4: Board Governance Layer
| Sprint | File | Duration | Key Deliverables |
|--------|------|----------|-----------------|
| **4.1** IntentSpec & IntentType Registry | [PHASE_4_BOARD_GOVERNANCE.md](PHASE_4_BOARD_GOVERNANCE.md) | May 12-14 (3 days) | IntentSpec lifecycle, hierarchical types, acceptance criteria |
| **4.2** Cards, Dependencies & State Machine | Same file | May 15-17 (3 days) | 6 card types, 8-status machine, dependency DAG |
| **4.3** Plan Generation & Execution | Same file | May 19-21 (3 days) | 9-step plan generation, plan-to-workflow compilation, preflight |
| **4.4** Evidence Collection & Gates | Same file | May 22-24 (3 days) | 10-step evidence collection, gate evaluation, board mode enforcement |
| **4.5** Release Packet & Board Context | Same file | May 26-28 (3 days) | Release ZIP, artifact locking, BOM, board context in expressions/agents |

**Stats:** 5 sprints, 3,724 lines, 21 BE + 12 FE tasks, 90+ unit tests

---

### Phase 5: Integration & End-to-End Flows
| Sprint | File | Duration | Key Deliverables |
|--------|------|----------|-----------------|
| **5.1** Cross-Component Integration | [PHASE_5_INTEGRATION_E2E.md](PHASE_5_INTEGRATION_E2E.md) | May 26-29 (4 days) | E2E chains, Dashboard wiring, Approval Queue, Artifact Browser |
| **5.2** Cross-Page Studio Navigation | Same file | May 30-Jun 1 (3 days) | useStudioContext hook, breadcrumbs, notification system |
| **5.3** End-to-End Validation | Same file | Jun 2-7 (5 days) | 3 mock tools, FEA workflow, validation board, full lifecycle test |

**Stats:** 3 sprints, 1,883 lines, complete mock ToolContracts, FEA workflow YAML

---

### Phase 6: Production Readiness
| Sprint | File | Duration | Key Deliverables |
|--------|------|----------|-----------------|
| **6.1** Authentication & Authorization | [PHASE_6_PRODUCTION_READINESS.md](PHASE_6_PRODUCTION_READINESS.md) | Jun 9-13 (5 days) | JWT (RS256/HS256), API keys, 3-tier RBAC, gate roles |
| **6.2** Testing & Monitoring | Same file | Jun 14-18 (5 days) | 35 Playwright E2E tests, 16 Prometheus metrics, 4 Grafana dashboards |
| **6.3** Deployment & Security | Same file | Jun 19-23 (5 days) | K8s manifests, Helm charts, CI/CD, security hardening, OpenAPI docs |

**Stats:** 3 sprints, 1,732 lines, 270 story points, 38 BE + 16 FE tasks

---

### Phase 7: Advanced Features
| Sprint | File | Duration | Key Deliverables |
|--------|------|----------|-----------------|
| **7.1** Board Composition | [PHASE_7_ADVANCED_FEATURES.md](PHASE_7_ADVANCED_FEATURES.md) | 4 days | Parent-child boards, max 3 levels, cascade gate evaluation |
| **7.2** Board Replay | Same file | 4 days | Re-execute from IntentSpec, diff previous results |
| **7.3** Board Fork | Same file | 4 days | Branch board, maintain lineage, merge results |
| **7.4** Multi-Agent Coordination | Same file | 5 days | Coordinator agent, task allocation, conflict resolution |
| **7.5** Agent Template Library | Same file | 4 days | 16 STEM templates, template marketplace |
| **7.6** Tool SDK + CLI | Same file | 5 days | airaie tool init/test/build/publish |
| **7.7** Workflow Templates Marketplace | Same file | 4 days | Template gallery, parameterization, one-click import |
| **7.8** Advanced Analytics Dashboards | Same file | 5 days | Executive dashboards, drill-down, export |
| **7.9** WebSocket Upgrade | Same file | 4 days | Upgrade SSE to WebSocket, bidirectional |
| **7.10** Audit Log Viewer | Same file | 3 days | Queryable, filterable, exportable audit trail |
| **7.11** Cost Tracking Dashboard | Same file | 4 days | Per-tool/workflow/project cost rollups, budgets |

**Stats:** 11 sprints, 3,622 lines, ~45 days total (parallelizable to 6-7 weeks)

---

## Aggregate Statistics

| Metric | Value |
|--------|-------|
| **Total Phases** | 8 (0-7) |
| **Total Sprints** | 34 |
| **Total Documentation** | 20,918 lines |
| **Total File Size** | ~1.04 MB |
| **Time to MVP (Phases 0-5)** | ~10-12 weeks |
| **Time to Production (Phases 0-6)** | ~14-16 weeks |
| **Phases 2+3 Parallelization** | Saves 2-3 weeks |

---

## Quick Reference: Dependency Graph

```
Phase 0 ──> Phase 1 ──┬──> Phase 2 ──┬──> Phase 4 ──> Phase 5 ──> Phase 6 ──> Phase 7
                       └──> Phase 3 ──┘
```

| Phase | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| 0 | Nothing | Nothing |
| 1 | Phase 0 | Nothing |
| 2 | Phase 1 | **Phase 3** |
| 3 | Phase 1 | **Phase 2** |
| 4 | Phase 2 + Phase 3 | Nothing |
| 5 | Phase 4 | Nothing |
| 6 | Phase 5 | Nothing |
| 7.1-7.3 | Phase 4 | Stream A (sequential) |
| 7.4-7.5 | Phase 3 | Stream B (parallel) |
| 7.6-7.7 | Phase 1-2 | Stream C (parallel) |
| 7.8, 7.10-7.11 | Phase 6 | Stream D |
| 7.9 | Phase 5 | Stream E |

---

## How to Use These Documents

1. **Product Managers:** Review Sprint Overviews and Deliverables Checklists for scope tracking
2. **Engineering Leads:** Use Execution Plans and Critical Paths for sprint planning
3. **Backend Engineers:** Follow Technical Implementation Plans and Task Planning tables
4. **Frontend Engineers:** Follow UX/UI Requirements and Component specifications
5. **QA Engineers:** Use QA & Testing Plans with specific test cases and test data
6. **DevOps:** Focus on Phase 6 for deployment, monitoring, and CI/CD details
7. **Scrum Masters:** Track progress using Deliverables Checklists (checkbox format)

---

*Generated: 2026-04-07*
*Source: AIRAIE_MASTER_SPRINT_PLAN.md*
*Architecture references: 7 documents in doc/implementation/new_design/*
