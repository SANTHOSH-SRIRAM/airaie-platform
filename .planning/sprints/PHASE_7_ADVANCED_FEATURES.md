# PHASE 7: ADVANCED FEATURES - Complete Sprint Documentation

> 11 per-feature sprints extending the Airaie platform with power-user and ecosystem capabilities.
> Phase 7 begins after Phase 6 completion (~2026-06-23). Duration: Ongoing, per-feature sprints (3-5 days each).
> Generated: 2026-04-06

---

## Table of Contents

- [Sprint 7.1: Board Composition (Parent-Child, Max 3 Levels)](#sprint-71-board-composition)
- [Sprint 7.2: Board Replay from IntentSpec](#sprint-72-board-replay-from-intentspec)
- [Sprint 7.3: Board Fork for Experimentation](#sprint-73-board-fork-for-experimentation)
- [Sprint 7.4: Multi-Agent Coordination](#sprint-74-multi-agent-coordination)
- [Sprint 7.5: Agent Template Library (16 STEM Templates)](#sprint-75-agent-template-library)
- [Sprint 7.6: Tool SDK + CLI](#sprint-76-tool-sdk--cli)
- [Sprint 7.7: Workflow Templates Marketplace](#sprint-77-workflow-templates-marketplace)
- [Sprint 7.8: Advanced Analytics Dashboards](#sprint-78-advanced-analytics-dashboards)
- [Sprint 7.9: WebSocket Upgrade from SSE](#sprint-79-websocket-upgrade-from-sse)
- [Sprint 7.10: Audit Log Viewer](#sprint-710-audit-log-viewer)
- [Sprint 7.11: Cost Tracking Dashboard](#sprint-711-cost-tracking-dashboard)

---
---

# Sprint 7.1: Board Composition

**Complexity:** M | **Duration:** 4 days | **Depends on:** Phase 4 (Board Governance Layer)

---

## 1. Sprint Overview

**Goal:** Enable hierarchical board structures where a parent board can contain child boards up to 3 nesting levels, with cascading gate evaluation and aggregate readiness calculation.

**Business Value:** Engineering programs routinely decompose into sub-systems (e.g., airframe board contains wing board, fuselage board, tail board). Board composition lets teams mirror their actual program structure inside Airaie, with governance rolling up naturally from leaf boards to the program-level board.

**Scope Summary:**
- Database schema for `parent_board_id` and `nesting_level` columns
- API endpoints for attaching/detaching child boards, querying the composition tree
- Cascade gate evaluation: parent gate can require all child gates to pass
- Aggregate readiness: parent board readiness is a weighted roll-up of child board readiness scores
- Frontend tree visualization and drill-down navigation

---

## 2. Scope Breakdown

### Epic 7.1.1: Board Hierarchy Data Model

**US-7.1.1-01:** As a program manager, I want to attach an existing board as a child of a parent board so that I can model sub-system decomposition.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.1.1-01a | Add `parent_board_id` (nullable FK) and `nesting_level` (int, default 0) columns to `boards` table via migration | Migration runs cleanly; column exists; FK constraint references `boards(id)`; index on `parent_board_id` created |
| T-7.1.1-01b | Add depth validation in `BoardService.AttachChild()` — reject if resulting depth > 3 | Attempting to attach at depth 4 returns HTTP 422 with error `max_nesting_depth_exceeded` |
| T-7.1.1-01c | Add cycle detection — reject if attaching board A as child of B when B is already a descendant of A | Cycle attempt returns HTTP 422 with error `circular_reference_detected` |

**US-7.1.1-02:** As a user, I want to detach a child board from its parent so that I can reorganize the program structure.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.1.1-02a | Implement `BoardService.DetachChild()` — sets `parent_board_id = NULL`, recalculates `nesting_level` for the detached subtree | After detach, child board `nesting_level` is 0; all grandchildren are recalculated; parent aggregate readiness recomputes |

**US-7.1.1-03:** As a user, I want to query the full composition tree for a board so that I can see the hierarchy.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.1.1-03a | Implement `BoardService.GetCompositionTree(boardID)` using recursive CTE query | Returns nested JSON: `{ board, children: [{ board, children: [...] }] }` up to 3 levels |
| T-7.1.1-03b | Add `GET /v0/boards/{id}/tree` endpoint | Returns 200 with composition tree; 404 if board not found |

### Epic 7.1.2: Cascade Gate Evaluation

**US-7.1.2-01:** As a quality manager, I want parent gates to require all corresponding child gates to pass before the parent gate can pass, so that governance is enforced at every level.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.1.2-01a | Add `cascade_mode` enum (`none`, `require_children`, `advisory_children`) to `gates` table | Migration adds column with default `none`; existing gates unaffected |
| T-7.1.2-01b | Modify `GateService.Evaluate()` to check child board gates when `cascade_mode = require_children` | Parent gate evaluation queries all child boards for matching gate type; returns `blocked_by_children` status if any child gate is not passed |
| T-7.1.2-01c | Add `GET /v0/boards/{id}/gates/cascade-status` endpoint returning roll-up of all descendant gate statuses | Returns `{ gate_id, status, children: [{ board_id, gate_id, status }] }` for each gate |

### Epic 7.1.3: Aggregate Readiness

**US-7.1.3-01:** As a program manager, I want the parent board readiness to reflect the weighted average of its child board readiness scores, so that I can track overall program health.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.1.3-01a | Add `readiness_weight` (float, default 1.0) column to boards table for weighting child contributions | Migration adds column; API accepts weight on attach |
| T-7.1.3-01b | Modify `BoardService.CalculateReadiness()` to blend own readiness (40%) with weighted child average (60%) when children exist | Parent readiness = 0.4 * own_readiness + 0.6 * weighted_avg(child_readiness). Leaf boards use 100% own readiness. |
| T-7.1.3-01c | Implement readiness cache invalidation — when child readiness changes, parent readiness cache is invalidated up the tree | Updating a leaf board's evidence triggers readiness recalculation up to root; verified with integration test |

### Epic 7.1.4: Composition UI

**US-7.1.4-01:** As a user, I want to see the board hierarchy as an interactive tree and drill into child boards.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.1.4-01a | Build `BoardCompositionTree` component using a collapsible tree layout (react-d3-tree or custom SVG) | Renders up to 3 levels; each node shows board name, mode badge, readiness gauge |
| T-7.1.4-01b | Add "Attach Child Board" dialog with board search/select and weight slider | User can search boards, select one, set weight, confirm; board appears in tree |
| T-7.1.4-01c | Add drill-down: clicking a child board node navigates to `/board-studio/{childId}?from=parent&parentId=X` | Navigation works; breadcrumb shows "Back to [Parent Board]" |
| T-7.1.4-01d | Add cascade gate status panel showing roll-up view of all descendant gates | Panel shows hierarchical gate status with green/yellow/red indicators per level |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.1.1-01a | Add parent_board_id and nesting_level columns | Backend | 2h | Existing boards migration | SQL migration file, updated Go model | Migration passes, column queryable, FK enforced |
| T-7.1.1-01b | Board depth validation in AttachChild | Backend | 3h | Board model, tree query | AttachChild service method | Unit test: depth 1,2,3 pass; depth 4 rejects with 422 |
| T-7.1.1-01c | Cycle detection in AttachChild | Backend | 2h | Recursive CTE | Cycle check in AttachChild | Unit test: A->B->C->A rejected; A->B->C->D allowed |
| T-7.1.1-02a | DetachChild with subtree recalculation | Backend | 2h | Board tree | DetachChild service method | Integration test: detach recalculates nesting_level for subtree |
| T-7.1.1-03a | GetCompositionTree recursive CTE | Backend | 3h | Board store | Tree query in store layer | Returns correct nested structure for 3-level hierarchy |
| T-7.1.1-03b | GET /v0/boards/{id}/tree endpoint | Backend | 1h | GetCompositionTree service | HTTP handler + route | Returns 200 with tree JSON; 404 for missing board |
| T-7.1.2-01a | Add cascade_mode to gates table | Backend | 1h | Gate model | Migration + model update | Column exists, default `none`, enum validated |
| T-7.1.2-01b | Cascade gate evaluation logic | Backend | 4h | Gate service, tree query | Modified Evaluate() | Parent gate blocked when any child gate fails in require_children mode |
| T-7.1.2-01c | Cascade gate status endpoint | Backend | 2h | Gate service, tree query | GET endpoint | Returns hierarchical gate status for full subtree |
| T-7.1.3-01a | Add readiness_weight column | Backend | 1h | Board model | Migration | Column exists, default 1.0, validated 0.0-10.0 |
| T-7.1.3-01b | Aggregate readiness calculation | Backend | 3h | Readiness service | Modified CalculateReadiness() | Weighted blend formula verified with 3-level hierarchy test |
| T-7.1.3-01c | Readiness cache invalidation | Backend | 3h | Redis/in-memory cache | Cache invalidation chain | Leaf change propagates to root within 500ms |
| T-7.1.4-01a | BoardCompositionTree component | Frontend | 4h | Tree API response | React component | Renders 3 levels, collapsible, shows name/mode/readiness |
| T-7.1.4-01b | Attach Child Board dialog | Frontend | 3h | Board search API | Dialog component | Search, select, weight, confirm flow works |
| T-7.1.4-01c | Drill-down navigation | Frontend | 2h | React Router | Navigation with breadcrumb | Click child navigates; breadcrumb returns to parent |
| T-7.1.4-01d | Cascade gate status panel | Frontend | 3h | Cascade status API | Panel component | Shows hierarchical gate status with color indicators |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260623_board_composition.sql
ALTER TABLE boards ADD COLUMN parent_board_id UUID REFERENCES boards(id) ON DELETE SET NULL;
ALTER TABLE boards ADD COLUMN nesting_level INTEGER NOT NULL DEFAULT 0 CHECK (nesting_level >= 0 AND nesting_level <= 3);
ALTER TABLE boards ADD COLUMN readiness_weight FLOAT NOT NULL DEFAULT 1.0 CHECK (readiness_weight >= 0.0 AND readiness_weight <= 10.0);
CREATE INDEX idx_boards_parent_board_id ON boards(parent_board_id);

ALTER TABLE gates ADD COLUMN cascade_mode VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (cascade_mode IN ('none', 'require_children', 'advisory_children'));
```

### Backend Architecture

**New Service Methods (internal/service/board.go):**
- `AttachChild(parentID, childID, weight) error` — validates depth <= 3, no cycles, sets parent_board_id
- `DetachChild(parentID, childID) error` — nullifies parent_board_id, recalculates subtree nesting_level
- `GetCompositionTree(boardID) (*BoardTree, error)` — recursive CTE returning nested board structure

**Recursive CTE for Tree Query:**
```sql
WITH RECURSIVE board_tree AS (
  SELECT id, name, parent_board_id, nesting_level, 0 AS depth
  FROM boards WHERE id = $1
  UNION ALL
  SELECT b.id, b.name, b.parent_board_id, b.nesting_level, bt.depth + 1
  FROM boards b INNER JOIN board_tree bt ON b.parent_board_id = bt.id
  WHERE bt.depth < 3
)
SELECT * FROM board_tree ORDER BY depth, name;
```

**Cycle Detection:** Before attaching, walk up from the proposed parent to root. If the proposed child's ID appears anywhere in that ancestor chain, reject with `circular_reference_detected`.

**Modified Gate Evaluation (internal/service/gate.go):**
When `cascade_mode = require_children`: query all child boards, find gates with matching `gate_type`, verify all are `passed`. If any are not, gate status becomes `blocked_by_children`.

**Aggregate Readiness Formula:**
```
parent_readiness = 0.4 * own_5_category_readiness + 0.6 * sum(child_readiness * child_weight) / sum(child_weight)
```
For leaf boards (no children): `readiness = own_5_category_readiness` (existing calculation unchanged).

### Frontend Architecture

**New Components:**
- `src/components/board/BoardCompositionTree.tsx` — tree visualization using SVG with collapsible nodes
- `src/components/board/AttachChildDialog.tsx` — board search + weight slider dialog
- `src/components/board/CascadeGatePanel.tsx` — hierarchical gate roll-up display

**State Management:** Extend board Zustand store with `compositionTree`, `cascadeGateStatus` slices. React Query keys: `['board', boardId, 'tree']`, `['board', boardId, 'cascade-gates']`.

### API Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| POST | `/v0/boards/{id}/children` | `{ child_board_id, readiness_weight }` | 201: updated tree |
| DELETE | `/v0/boards/{id}/children/{childId}` | — | 204: no content |
| GET | `/v0/boards/{id}/tree` | — | 200: nested board tree |
| GET | `/v0/boards/{id}/gates/cascade-status` | — | 200: hierarchical gate status |
| GET | `/v0/boards/{id}/aggregate-readiness` | — | 200: `{ readiness, own, children_weighted }` |

---

## 5. UX/UI Requirements

**Board Studio Integration:**
- New "Composition" tab in board detail view, between "Evidence" and "Release" tabs
- Tree visualization: horizontal layout, left-to-right, with the current board as root
- Each tree node shows: board name (truncated to 30 chars), mode badge (Explore/Study/Release), readiness gauge (0-100% as circular mini-gauge), gate summary (2/3 passed)
- Clicking a node: single-click selects and shows summary in right panel; double-click navigates to child board
- "Attach Child" button at top of Composition tab; opens dialog with board search (debounced 300ms), weight slider (0.1-10.0), confirm button
- "Detach" action available via right-click context menu or three-dot menu on each child node
- Color coding: green node border = all gates passed, yellow = in progress, red = blocked/failed
- Breadcrumb trail when navigating into child boards: "Program Board > Wing Board > Spar Board"

**Responsive Behavior:**
- Tree collapses to indented list on screens < 768px
- Readiness gauges become text percentages on mobile

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | AttachChild with depth 1, 2, 3 | All succeed, nesting_level set correctly |
| Unit | AttachChild at depth 4 | Returns error `max_nesting_depth_exceeded` |
| Unit | AttachChild creating cycle A->B->A | Returns error `circular_reference_detected` |
| Unit | DetachChild recalculates subtree | All descendants have nesting_level decremented |
| Integration | GetCompositionTree with 3-level hierarchy | Returns correct nested JSON structure |
| Integration | Cascade gate: child gate fails, parent evaluated | Parent gate status = `blocked_by_children` |
| Integration | Cascade gate: all children pass, parent evaluated | Parent gate passes (if own requirements also met) |
| Integration | Aggregate readiness: 2 children (weight 1.0 and 2.0) | Readiness = 0.4*own + 0.6*(1.0*r1 + 2.0*r2)/3.0 |
| Integration | Readiness propagation: update leaf evidence | Root board readiness recalculated within 500ms |
| E2E (Playwright) | Attach child board via UI dialog | Child appears in tree, readiness updates |
| E2E (Playwright) | Drill into child board | Navigation occurs, breadcrumb shows parent |
| E2E (Playwright) | Cascade gate panel loads | Shows hierarchical gate status correctly |
| Performance | Tree query with 50 boards across 3 levels | Response < 200ms |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Recursive CTE performance degrades with large hierarchies | Low (max 3 levels limits tree size) | Medium | Add composite index on (parent_board_id, nesting_level); materialized view for trees > 20 boards |
| Readiness cache invalidation storms when many leaves update simultaneously | Medium | Medium | Debounce readiness recalculation with 2-second window; batch invalidation |
| Circular reference detection misses edge cases with concurrent requests | Low | High | Use advisory lock per board during attach operations; validate in transaction |
| Users create overly deep nesting expectations | Low | Low | Hard limit at 3 levels enforced at DB constraint level; clear error messaging |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 4 Board Governance (Sprint 4.1-4.5) | Predecessor | Must be complete | Board, Gate, Evidence, Readiness services must all be functional |
| `boards` table with existing columns | Database | Exists | Adding columns to existing table |
| `gates` table with evaluation logic | Database | Exists | Extending with cascade_mode |
| Board Studio frontend pages | Frontend | Exists | Adding new tab and components |
| React Router navigation | Frontend | Exists | Extending with parent context params |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Database + Core Service | T-7.1.1-01a, T-7.1.1-01b, T-7.1.1-01c, T-7.1.1-02a | Migration applied, AttachChild/DetachChild with validation |
| Day 2 | Tree Query + Gate Cascade | T-7.1.1-03a, T-7.1.1-03b, T-7.1.2-01a, T-7.1.2-01b | Tree endpoint working, cascade gate evaluation |
| Day 3 | Readiness + API Completion | T-7.1.2-01c, T-7.1.3-01a, T-7.1.3-01b, T-7.1.3-01c | Aggregate readiness, cache invalidation, cascade status endpoint |
| Day 4 | Frontend + QA | T-7.1.4-01a, T-7.1.4-01b, T-7.1.4-01c, T-7.1.4-01d | Composition tree UI, attach dialog, drill-down, gate panel, all tests passing |

---

## 10. Definition of Done

- [ ] Parent-child board relationships persist with FK constraint
- [ ] Maximum 3 nesting levels enforced at DB and service layers
- [ ] Cycle detection prevents circular references
- [ ] Cascade gate evaluation blocks parent gates when child gates fail (require_children mode)
- [ ] Aggregate readiness uses weighted formula (40% own + 60% children)
- [ ] Readiness cache invalidates up the tree within 2 seconds of leaf change
- [ ] All 5 new API endpoints return correct responses
- [ ] Tree visualization renders up to 3 levels with board metadata
- [ ] Drill-down navigation works with breadcrumb back-navigation
- [ ] All unit tests pass (8 tests)
- [ ] All integration tests pass (5 tests)
- [ ] All E2E tests pass (3 tests)
- [ ] No regressions in existing board functionality

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260623_board_composition.sql`
- [ ] Backend: `BoardService` methods — AttachChild, DetachChild, GetCompositionTree
- [ ] Backend: Modified `GateService.Evaluate()` with cascade logic
- [ ] Backend: Modified `BoardService.CalculateReadiness()` with aggregate formula
- [ ] Backend: 5 new HTTP handlers and routes
- [ ] Frontend: `BoardCompositionTree` component
- [ ] Frontend: `AttachChildDialog` component
- [ ] Frontend: `CascadeGatePanel` component
- [ ] Frontend: Board Studio "Composition" tab integration
- [ ] Tests: 8 unit tests, 5 integration tests, 3 E2E tests
- [ ] API documentation updated with 5 new endpoints

---

## 12. Optional

- **Board Templates from Composition:** Save a multi-level board hierarchy as a reusable template (e.g., "Structural Validation Program" template with predefined sub-boards)
- **Cross-Board Evidence Linking:** Allow evidence from a child board to satisfy acceptance criteria on a parent board card
- **Composition Diff View:** Compare two board trees side-by-side to see structural differences

---
---

# Sprint 7.2: Board Replay from IntentSpec

**Complexity:** M | **Duration:** 4 days | **Depends on:** Phase 4 (Board Governance Layer)

---

## 1. Sprint Overview

**Goal:** Enable re-execution of a board's entire plan from an IntentSpec snapshot, producing a new set of results that can be diffed against previous runs, with full version tracking of replays.

**Business Value:** Engineering validation often requires re-running analyses after design changes, supplier updates, or regulatory feedback. Board replay lets teams re-execute the same validation plan against updated inputs and compare results systematically, maintaining a traceable audit trail of every replay and its outcomes.

**Scope Summary:**
- IntentSpec snapshot capture (immutable versioned copy at replay trigger)
- Replay execution engine that re-runs all cards from a snapshotted IntentSpec
- Result diffing: compare metric values, artifact hashes, and gate outcomes between replay versions
- Versioned replay history with lineage tracking
- Frontend replay trigger, version browser, and diff viewer

---

## 2. Scope Breakdown

### Epic 7.2.1: IntentSpec Snapshot System

**US-7.2.1-01:** As an engineer, I want to capture an immutable snapshot of the IntentSpec at replay time so that I have a record of exactly what was re-executed.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.2.1-01a | Create `board_replay_snapshots` table: `id`, `board_id`, `intent_spec_snapshot` (JSONB), `input_artifacts_snapshot` (JSONB), `created_at`, `triggered_by` | Migration runs; table created with FK to boards |
| T-7.2.1-01b | Implement `ReplayService.CaptureSnapshot(boardID)` — deep-copies IntentSpec, input artifact references, and board metadata into snapshot record | Snapshot contains full IntentSpec, artifact SHA-256 hashes, board mode, constraints |
| T-7.2.1-01c | Add `replay_version` (int, auto-increment per board) to `board_replays` table | Each replay for a board gets monotonically increasing version number |

**US-7.2.1-02:** As a user, I want to view the history of all snapshots taken for a board.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.2.1-02a | Implement `GET /v0/boards/{id}/replays` — paginated list of replays with version, status, timestamp, triggered_by | Returns list sorted by version desc; supports `?limit=20&offset=0` |

### Epic 7.2.2: Replay Execution Engine

**US-7.2.2-01:** As an engineer, I want to trigger a replay that re-executes all cards from the IntentSpec snapshot with current tools and configurations.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.2.2-01a | Create `board_replays` table: `id`, `board_id`, `snapshot_id`, `replay_version`, `status` (queued/running/completed/failed), `started_at`, `completed_at`, `summary` (JSONB) | Migration runs; status enforced via CHECK constraint |
| T-7.2.2-01b | Implement `ReplayService.TriggerReplay(boardID, options)` — captures snapshot, creates replay record, re-generates execution plans for all active cards, dispatches them | Replay creates new runs linked to replay_id; uses current tool versions but snapshotted IntentSpec inputs |
| T-7.2.2-01c | Add `replay_id` FK column to `runs` table so replay-generated runs are linked back to the replay | Runs created during replay have non-null replay_id; original runs have null replay_id |
| T-7.2.2-01d | Implement replay status tracking — aggregate card run statuses into overall replay status | Replay status = running while any card run is active; completed when all succeed; failed if any fail |

**US-7.2.2-02:** As an engineer, I want to replay only specific cards (not the entire board) for targeted re-validation.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.2.2-02a | Add `card_ids` optional filter to `TriggerReplay(boardID, { card_ids: [...] })` | When card_ids provided, only those cards are re-executed; when omitted, all active cards replay |

### Epic 7.2.3: Result Diffing

**US-7.2.3-01:** As an engineer, I want to compare results between two replay versions so that I can see what changed.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.2.3-01a | Implement `ReplayService.DiffReplays(boardID, versionA, versionB)` — compares metric values, artifact hashes, gate outcomes per card | Returns per-card diff: `{ card_id, metrics: [{ name, value_a, value_b, delta, delta_pct }], artifacts_changed: bool, gate_outcome_a, gate_outcome_b }` |
| T-7.2.3-01b | Add `GET /v0/boards/{id}/replays/diff?v1=X&v2=Y` endpoint | Returns structured diff JSON; 400 if versions don't exist |
| T-7.2.3-01c | Implement trend detection across 3+ replays — flag metrics that are trending in a concerning direction | Trend analysis: if metric degrades for 3 consecutive replays, flag as `degrading`; if improving for 3, flag as `improving` |

### Epic 7.2.4: Replay UI

**US-7.2.4-01:** As a user, I want a replay panel in Board Studio to trigger replays, browse versions, and view diffs.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.2.4-01a | Build "Replay" tab in Board Studio with replay trigger button, version history table, and status indicators | Trigger button disabled during active replay; version table shows version, status, timestamp, triggered_by |
| T-7.2.4-01b | Build replay diff viewer — side-by-side comparison of two selected versions | Two-column layout: left = version A, right = version B; per-card metrics with green/red delta indicators |
| T-7.2.4-01c | Build replay trend chart — line chart showing key metric values across replay versions | X-axis = replay version, Y-axis = metric value; degrading trends highlighted in red |
| T-7.2.4-01d | Add replay progress indicator — real-time status of ongoing replay with per-card progress | Progress bar with card count (3/7 complete), per-card status badges, estimated time remaining |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.2.1-01a | Create board_replay_snapshots table | Backend | 1h | DB schema | Migration file | Table created with correct columns and constraints |
| T-7.2.1-01b | CaptureSnapshot service method | Backend | 3h | IntentSpec, artifacts | Snapshot record | Deep copy verified; snapshot immutable after creation |
| T-7.2.1-01c | Add replay_version auto-increment | Backend | 1h | board_replays table | Version column | Each replay gets next sequential version per board |
| T-7.2.1-02a | GET /v0/boards/{id}/replays endpoint | Backend | 2h | Replay store | HTTP handler | Paginated list, sorted by version desc |
| T-7.2.2-01a | Create board_replays table | Backend | 1h | DB schema | Migration file | Table with status enum, FK to boards and snapshots |
| T-7.2.2-01b | TriggerReplay service method | Backend | 4h | Snapshot, plan generator | Replay orchestration | New runs created, linked to replay_id, dispatched |
| T-7.2.2-01c | Add replay_id to runs table | Backend | 1h | Runs migration | Column addition | FK constraint, nullable, indexed |
| T-7.2.2-01d | Replay status aggregation | Backend | 2h | Run status events | Status update logic | Correct aggregate status computed from child runs |
| T-7.2.2-02a | Card-filtered replay | Backend | 2h | TriggerReplay | Filter logic | Only specified cards re-executed; others skipped |
| T-7.2.3-01a | DiffReplays service method | Backend | 4h | CardEvidence from both versions | Diff structure | Per-card metric comparison with delta and percentage |
| T-7.2.3-01b | Diff API endpoint | Backend | 1h | DiffReplays service | HTTP handler | Returns structured diff; validates version existence |
| T-7.2.3-01c | Trend detection across replays | Backend | 3h | Multiple replay results | Trend flags | Degrading/improving detected over 3+ replays |
| T-7.2.4-01a | Replay tab with trigger and history | Frontend | 3h | Replay API | React components | Trigger button, version table, status indicators |
| T-7.2.4-01b | Diff viewer component | Frontend | 4h | Diff API | Side-by-side view | Two-column comparison with delta highlighting |
| T-7.2.4-01c | Trend chart component | Frontend | 3h | Replays API | Line chart | Recharts line chart with trend highlighting |
| T-7.2.4-01d | Replay progress indicator | Frontend | 2h | Replay status API + SSE | Progress component | Real-time progress with per-card status |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260624_board_replay.sql
CREATE TABLE board_replay_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    intent_spec_snapshot JSONB NOT NULL,
    input_artifacts_snapshot JSONB NOT NULL,
    board_metadata_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_by UUID REFERENCES users(id)
);

CREATE TABLE board_replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    snapshot_id UUID NOT NULL REFERENCES board_replay_snapshots(id),
    replay_version INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    card_filter UUID[] DEFAULT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, replay_version)
);

CREATE INDEX idx_board_replays_board_id ON board_replays(board_id);
ALTER TABLE runs ADD COLUMN replay_id UUID REFERENCES board_replays(id);
CREATE INDEX idx_runs_replay_id ON runs(replay_id);
```

### Backend Architecture

**New Service: `internal/service/replay.go`**

Key methods:
- `CaptureSnapshot(boardID) (*ReplaySnapshot, error)` — reads current IntentSpec, iterates all input artifacts to capture SHA-256 hashes, captures board mode/constraints/metadata
- `TriggerReplay(boardID, opts ReplayOptions) (*BoardReplay, error)` — calls CaptureSnapshot, creates replay record, calls PlanGenerator.ExecutePlan for each active card (or filtered cards), links resulting runs to replay_id
- `GetReplayStatus(replayID) (*ReplayStatus, error)` — aggregates run statuses
- `DiffReplays(boardID, v1, v2) (*ReplayDiff, error)` — loads CardEvidence for both versions, computes per-metric deltas
- `AnalyzeTrends(boardID, metricName) (*MetricTrend, error)` — queries last N replays for the metric, detects 3-consecutive degradation/improvement

**Replay Execution Flow:**
1. User triggers replay -> CaptureSnapshot saves IntentSpec as-is
2. For each card (or filtered set): generate execution plan from snapshot's IntentSpec
3. Compile each plan to workflow, publish, dispatch (reusing existing Phase 4 pipeline)
4. Runs tagged with replay_id
5. On run completion: evidence collected as normal (existing Phase 4 evidence collector)
6. Replay status updated from aggregate run statuses via NATS event listener

**Diff Algorithm:**
```go
type MetricDiff struct {
    Name      string  `json:"name"`
    ValueA    float64 `json:"value_a"`
    ValueB    float64 `json:"value_b"`
    Delta     float64 `json:"delta"`
    DeltaPct  float64 `json:"delta_pct"`
    Direction string  `json:"direction"` // improved, degraded, unchanged
}
```
Compare by matching CardEvidence records on `card_id + metric_name`. Delta = ValueB - ValueA. Direction determined by acceptance criteria operator (if threshold is `lte`, a decrease is `improved`).

### API Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| POST | `/v0/boards/{id}/replays` | `{ card_ids?: string[] }` | 201: `{ replay_id, version, status }` |
| GET | `/v0/boards/{id}/replays` | `?limit=20&offset=0` | 200: paginated replay list |
| GET | `/v0/boards/{id}/replays/{version}` | — | 200: replay detail with run statuses |
| GET | `/v0/boards/{id}/replays/diff` | `?v1=X&v2=Y` | 200: structured diff |
| GET | `/v0/boards/{id}/replays/{version}/snapshot` | — | 200: full snapshot content |
| GET | `/v0/boards/{id}/replays/trends` | `?metric=von_mises_stress` | 200: trend data across versions |

---

## 5. UX/UI Requirements

**Replay Tab in Board Studio:**
- Position: between "Gates" and "Release" tabs
- Top section: "Trigger Replay" button (primary blue), options dropdown for card filter
- Active replay indicator: animated progress bar when replay is running, with per-card status badges
- Version history table columns: Version (#1, #2...), Status (badge), Triggered By (avatar + name), Started At, Duration, Cards Replayed (count), Actions (view, diff)

**Diff Viewer:**
- Accessed by selecting two versions and clicking "Compare"
- Split-pane layout: Version A (left, lighter background) vs Version B (right)
- Per-card accordion: expand to see metric-by-metric comparison
- Delta indicators: green arrow down for improved metrics, red arrow up for degraded (relative to acceptance criteria direction)
- Artifact changes: show "Modified" badge with link to artifact diff (binary diff shows SHA mismatch)

**Trend Chart:**
- Located below version history when 3+ replays exist
- Recharts line chart: one line per key metric
- Acceptance threshold shown as horizontal dashed line
- Data points clickable to navigate to specific replay detail
- Degrading metrics auto-highlighted with red line color

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | CaptureSnapshot captures all IntentSpec fields | Snapshot JSONB matches current IntentSpec exactly |
| Unit | Replay version auto-increments per board | Board A: replay 1,2,3; Board B: replay 1 (independent) |
| Unit | DiffReplays with identical results | All deltas = 0, direction = unchanged |
| Unit | DiffReplays with improved metric | Delta negative (for lte criteria), direction = improved |
| Unit | Trend detection: 3 consecutive degradations | Metric flagged as `degrading` |
| Integration | TriggerReplay creates runs linked to replay_id | Runs table has replay_id set; runs execute through normal pipeline |
| Integration | Card-filtered replay only executes specified cards | Only 2 of 5 cards have new runs; other 3 unchanged |
| Integration | Replay status transitions correctly | queued -> running (first run starts) -> completed (all runs done) |
| E2E | Trigger replay from UI, wait for completion | Progress indicator shows real-time; version appears in history |
| E2E | Compare two versions in diff viewer | Side-by-side shows correct metric deltas |
| E2E | Trend chart renders with 3+ replays | Chart displays with correct data points and trend highlighting |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Replay of large boards (20+ cards) overwhelms runner capacity | Medium | High | Add concurrency limit to ReplayService (max 5 concurrent card replays); queue excess |
| IntentSpec changes between snapshot and execution (race condition) | Low | Medium | Snapshot is captured atomically in single transaction; execution uses snapshot, not live IntentSpec |
| Diff comparison fails when card structure changes between replays | Medium | Medium | Match cards by stable card_id; report "new card" or "removed card" when no match found |
| Replay storage grows large with many versions | Low | Low | Add retention policy config: default keep last 50 replays per board; archive older to cold storage |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 4 Board Governance | Predecessor | Must be complete | IntentSpec, Cards, Gates, Evidence Collector all required |
| Plan Generator (Sprint 4.3) | Service | Must be functional | Replay re-uses PlanGenerator.ExecutePlan |
| Evidence Collector (Sprint 4.4) | Service | Must be functional | Replay relies on automatic evidence collection post-run |
| SSE streaming (Phase 5) | Frontend | Should be available | Replay progress uses SSE for real-time updates |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Database + Snapshot | T-7.2.1-01a, T-7.2.2-01a, T-7.2.2-01c, T-7.2.1-01b, T-7.2.1-01c | Migrations applied, CaptureSnapshot working |
| Day 2 | Replay Engine | T-7.2.2-01b, T-7.2.2-01d, T-7.2.2-02a, T-7.2.1-02a | TriggerReplay dispatches runs, status tracking works, card filter works |
| Day 3 | Diffing + Trends | T-7.2.3-01a, T-7.2.3-01b, T-7.2.3-01c | Diff endpoint returns per-card comparison, trend detection works |
| Day 4 | Frontend + QA | T-7.2.4-01a, T-7.2.4-01b, T-7.2.4-01c, T-7.2.4-01d | Replay tab, diff viewer, trend chart, progress indicator, all tests passing |

---

## 10. Definition of Done

- [ ] IntentSpec snapshots are immutable and contain full board state at capture time
- [ ] Replay triggers re-execution of all (or filtered) cards from snapshot
- [ ] Runs created by replay are linked via replay_id
- [ ] Replay version numbers auto-increment per board
- [ ] Replay status correctly aggregates from constituent run statuses
- [ ] Diff API returns per-card metric comparison with delta and direction
- [ ] Trend analysis detects 3-consecutive degradation/improvement patterns
- [ ] All 6 API endpoints return correct responses
- [ ] Frontend replay tab allows trigger, version browsing, and diff viewing
- [ ] All unit tests pass (5 tests)
- [ ] All integration tests pass (3 tests)
- [ ] All E2E tests pass (3 tests)

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260624_board_replay.sql`
- [ ] Backend: `internal/service/replay.go` — ReplayService with all methods
- [ ] Backend: `internal/store/replay.go` — ReplayStore with DB queries
- [ ] Backend: `internal/model/replay.go` — ReplaySnapshot, BoardReplay, ReplayDiff models
- [ ] Backend: 6 HTTP handlers and routes
- [ ] Frontend: Replay tab integration in Board Studio
- [ ] Frontend: `ReplayDiffViewer` component
- [ ] Frontend: `ReplayTrendChart` component
- [ ] Frontend: `ReplayProgressIndicator` component
- [ ] Tests: 5 unit, 3 integration, 3 E2E tests

---

## 12. Optional

- **Scheduled Replays:** Configure automatic replay on a cron schedule (e.g., nightly re-validation after CI deploys new tool versions)
- **Replay Branching:** Create a fork from a specific replay version to explore alternative inputs
- **Replay Notifications:** Slack/email notification when replay completes or detects degrading trends

---
---

# Sprint 7.3: Board Fork for Experimentation

**Complexity:** M | **Duration:** 4 days | **Depends on:** Phase 4 (Board Governance Layer)

---

## 1. Sprint Overview

**Goal:** Allow users to fork (branch) an existing board to experiment with alternative configurations, inputs, or validation approaches, while maintaining lineage to the source board and providing a mechanism to merge successful results back.

**Business Value:** Engineering teams often need to explore "what if" scenarios — different materials, different mesh densities, alternative acceptance thresholds — without contaminating the primary validation board. Board fork lets them branch off, experiment freely, and merge winning results back to the main line.

**Scope Summary:**
- Fork creation: deep-copy board with all cards, IntentSpecs, gates, and configuration
- Lineage tracking: fork maintains reference to source board and fork point
- Divergence tracking: detect which cards/gates/evidence differ between fork and source
- Merge-back: selectively adopt results from fork into source board
- Frontend fork management UI with divergence visualization

---

## 2. Scope Breakdown

### Epic 7.3.1: Fork Creation

**US-7.3.1-01:** As an engineer, I want to fork a board to create an independent copy for experimentation.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.3.1-01a | Create `board_forks` table: `id`, `source_board_id`, `forked_board_id`, `fork_point_snapshot_id` (references replay_snapshots or new snapshot), `status` (active/merged/abandoned), `created_at`, `created_by` | Migration runs; FK constraints valid |
| T-7.3.1-01b | Implement `ForkService.CreateFork(sourceBoardID, name, description)` — deep-copies board, all cards (with new IDs), IntentSpecs, gate configurations; does NOT copy evidence or run history | Fork board created with new ID; all cards cloned with fresh IDs; lineage record in board_forks; source board unchanged |
| T-7.3.1-01c | Add `forked_from_board_id` and `fork_status` columns to `boards` table for quick lookup | Fork boards identifiable via non-null forked_from_board_id |
| T-7.3.1-01d | Capture fork-point snapshot of source board state (reuse ReplaySnapshot from Sprint 7.2 or independent snapshot) | Snapshot captures source board state at fork time for later divergence comparison |

**US-7.3.1-02:** As a user, I want to see all forks of a board and their current status.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.3.1-02a | Implement `GET /v0/boards/{id}/forks` — list all forks with status, name, readiness, last activity | Returns list of forks sorted by creation date; includes fork status and summary metrics |

### Epic 7.3.2: Lineage and Divergence Tracking

**US-7.3.2-01:** As an engineer, I want to see how a forked board has diverged from its source board.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.3.2-01a | Implement `ForkService.GetDivergence(forkBoardID)` — compares fork board's current state against fork-point snapshot | Returns divergence report: `{ cards_added: [], cards_removed: [], cards_modified: [{ card_id, changes: [...] }], gates_changed: [], intent_changes: [] }` |
| T-7.3.2-01b | Add `GET /v0/boards/{id}/forks/{forkId}/divergence` endpoint | Returns divergence JSON; highlights what changed since fork |
| T-7.3.2-01c | Track card-level mapping between source and fork via `source_card_id` column on cards in forked boards | Cards in fork reference their source card for diff/merge operations |

### Epic 7.3.3: Merge-Back Mechanism

**US-7.3.3-01:** As an engineer, I want to selectively merge results from a fork back into the source board.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.3.3-01a | Implement `ForkService.PreviewMerge(forkBoardID)` — shows what would change in source board if fork results were adopted | Returns merge preview: `{ cards_to_update: [{ source_card_id, fork_card_id, evidence_count, metric_improvements: [] }], new_cards: [], conflicts: [] }` |
| T-7.3.3-01b | Implement `ForkService.MergeBack(forkBoardID, options)` — applies selected fork results to source board | Options include: `card_ids` (selective), `merge_evidence` (bool), `merge_gate_outcomes` (bool); creates new evidence records on source board linked to fork runs |
| T-7.3.3-01c | Add conflict detection — if source board has changed since fork point, flag conflicting cards | Conflicts detected when both source and fork have new evidence for the same card; user must resolve |
| T-7.3.3-01d | Update fork status to `merged` after successful merge; `abandoned` if user discards | Status transitions enforced; merged forks become read-only |

### Epic 7.3.4: Fork UI

**US-7.3.4-01:** As a user, I want to manage forks from the Board Studio interface.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.3.4-01a | Add "Fork" button to Board Studio toolbar; opens fork creation dialog (name, description) | Fork created on confirm; user navigated to forked board with "Forked from [Source]" banner |
| T-7.3.4-01b | Build fork management panel showing all forks of current board | Table: fork name, status badge, readiness, last activity, divergence summary, actions (view, merge, abandon) |
| T-7.3.4-01c | Build divergence viewer — visual diff between fork and source | Side-by-side card comparison; changed cards highlighted; metrics shown with deltas |
| T-7.3.4-01d | Build merge preview dialog — shows what will change, allows card selection, conflict resolution | Checklist of cards to merge with evidence counts; conflict indicators with resolution options (keep source/keep fork) |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.3.1-01a | Create board_forks table | Backend | 1h | DB schema | Migration file | Table created, FK constraints valid |
| T-7.3.1-01b | CreateFork service method | Backend | 4h | Board, cards, intents | Deep copy + lineage record | Fork created; all cards cloned; source unchanged |
| T-7.3.1-01c | Add forked_from columns to boards | Backend | 1h | boards table | Migration + model update | Columns exist, indexed |
| T-7.3.1-01d | Fork-point snapshot capture | Backend | 2h | Snapshot service | Snapshot at fork time | Snapshot captured; used for divergence baseline |
| T-7.3.1-02a | List forks endpoint | Backend | 2h | Fork store | HTTP handler | Returns paginated fork list with summary |
| T-7.3.2-01a | GetDivergence service method | Backend | 4h | Snapshot, current state | Divergence report | Detects added/removed/modified cards and gates |
| T-7.3.2-01b | Divergence API endpoint | Backend | 1h | GetDivergence | HTTP handler | Returns structured divergence JSON |
| T-7.3.2-01c | source_card_id tracking | Backend | 2h | Card model | Column + clone logic | Forked cards reference source cards |
| T-7.3.3-01a | PreviewMerge service method | Backend | 3h | Divergence, evidence | Merge preview | Shows what would change with card-level detail |
| T-7.3.3-01b | MergeBack service method | Backend | 4h | Merge preview, options | Applied merge | Evidence copied, gate outcomes updated, audit trail |
| T-7.3.3-01c | Conflict detection | Backend | 3h | Source changes, fork changes | Conflict list | Detects concurrent modifications; flags for resolution |
| T-7.3.3-01d | Fork status management | Backend | 1h | Fork model | Status transitions | merged/abandoned states enforced; merged = read-only |
| T-7.3.4-01a | Fork button and creation dialog | Frontend | 2h | Fork API | Dialog + navigation | Fork created; navigates to new board with banner |
| T-7.3.4-01b | Fork management panel | Frontend | 3h | Forks list API | Table component | Shows all forks with status, readiness, actions |
| T-7.3.4-01c | Divergence viewer | Frontend | 4h | Divergence API | Side-by-side diff | Cards compared with highlighted changes |
| T-7.3.4-01d | Merge preview dialog | Frontend | 3h | Merge preview API | Dialog with checklist | Card selection, conflict resolution, confirm |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260625_board_fork.sql
CREATE TABLE board_forks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_board_id UUID NOT NULL REFERENCES boards(id),
    forked_board_id UUID NOT NULL REFERENCES boards(id),
    fork_point_snapshot_id UUID REFERENCES board_replay_snapshots(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'abandoned')),
    merge_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_board_forks_source ON board_forks(source_board_id);
CREATE INDEX idx_board_forks_forked ON board_forks(forked_board_id);

ALTER TABLE boards ADD COLUMN forked_from_board_id UUID REFERENCES boards(id);
ALTER TABLE boards ADD COLUMN fork_status VARCHAR(20) DEFAULT NULL CHECK (fork_status IS NULL OR fork_status IN ('active', 'merged', 'abandoned'));
ALTER TABLE cards ADD COLUMN source_card_id UUID REFERENCES cards(id);
```

### Backend Architecture

**New Service: `internal/service/fork.go`**

**CreateFork Algorithm:**
1. Validate source board exists and is in Study or Release mode
2. Capture fork-point snapshot (reuse ReplaySnapshot or create board-state snapshot)
3. Create new board with `forked_from_board_id = sourceBoardID`, name = `[Source Name] (Fork: [User Name])`
4. Clone all cards: for each source card, create new card with same IntentSpec, same type, status reset to `draft`, `source_card_id` set to original
5. Clone gate configurations (not gate evaluations)
6. Clone board metadata and constraints
7. Insert board_forks record
8. Return new forked board

**Divergence Detection Algorithm:**
1. Load fork-point snapshot
2. Load current fork board state
3. Compare card-by-card using `source_card_id` mapping:
   - Cards in fork with no source: `cards_added`
   - Source cards not in fork: `cards_removed`
   - Cards with matching source but different IntentSpec/status/evidence: `cards_modified` with per-field change list
4. Compare gate configurations
5. Compare board-level settings (mode, constraints)

**Merge-Back Algorithm:**
1. PreviewMerge: for each fork card marked for merge, compare evidence and gate outcomes against source card
2. Conflict detection: if source card has new evidence since fork point, flag as conflict
3. On confirmed merge:
   - Copy CardEvidence records from fork to source board (new IDs, source references preserved)
   - Update gate evaluations on source board
   - Recalculate source board readiness
   - Mark fork as `merged`
   - Create audit log entry with merge details

### API Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| POST | `/v0/boards/{id}/forks` | `{ name, description }` | 201: `{ fork_id, forked_board_id }` |
| GET | `/v0/boards/{id}/forks` | `?status=active` | 200: paginated fork list |
| GET | `/v0/boards/{id}/forks/{forkId}/divergence` | — | 200: divergence report |
| POST | `/v0/boards/{id}/forks/{forkId}/merge/preview` | `{ card_ids?: [] }` | 200: merge preview |
| POST | `/v0/boards/{id}/forks/{forkId}/merge` | `{ card_ids, merge_evidence, merge_gate_outcomes, conflict_resolutions }` | 200: merge result |
| PATCH | `/v0/boards/{id}/forks/{forkId}` | `{ status: "abandoned" }` | 200: updated fork |

---

## 5. UX/UI Requirements

**Fork Creation:**
- "Fork Board" button in Board Studio toolbar (branch icon)
- Dialog: name field (pre-filled with "[Board Name] — Experiment"), description textarea, "Create Fork" button
- After creation: redirect to forked board with persistent banner: "This is a fork of [Source Board]. View source | Merge back | Abandon"

**Fork Management Panel:**
- New "Forks" tab in Board Studio (after Composition tab)
- Table columns: Fork Name, Status (Active/Merged/Abandoned badges), Readiness (gauge), Cards Changed (count), Last Updated, Actions
- Row click opens divergence viewer

**Divergence Viewer:**
- Two-panel layout: Source Board (left, read-only) vs Fork (right, editable context)
- Cards displayed as matching pairs; new/removed cards shown with add/remove indicators
- Modified cards show inline diff: changed fields highlighted in yellow
- Metrics comparison table within each modified card

**Merge Dialog:**
- Step 1: Review changes — list of cards with checkboxes, evidence counts, metric improvements
- Step 2: Resolve conflicts — for each conflicting card, radio buttons: "Keep Source", "Keep Fork", "Keep Both"
- Step 3: Confirm — summary of changes to be applied, "Merge" button
- Post-merge: banner updates to "Merged into [Source Board]", fork becomes read-only

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | CreateFork clones all cards with source_card_id | Fork has same number of cards; each has source_card_id set |
| Unit | CreateFork does not copy evidence or run history | Fork cards have zero evidence and zero runs |
| Unit | GetDivergence detects added card in fork | cards_added contains the new card |
| Unit | GetDivergence detects modified IntentSpec | cards_modified shows IntentSpec field changes |
| Unit | Conflict detection when source has new evidence | Conflict flagged for affected card |
| Integration | CreateFork + modify fork + GetDivergence | Full flow: fork, change card, see divergence |
| Integration | MergeBack copies evidence to source | Source board has new evidence records from fork |
| Integration | MergeBack with conflict resolution | Conflicts resolved per user choice; correct evidence retained |
| Integration | Abandoned fork becomes read-only | API rejects modifications to abandoned fork boards |
| E2E | Fork board from UI | New board created; banner shown; cards cloned |
| E2E | View divergence after modifying fork | Divergence viewer shows changes correctly |
| E2E | Merge fork back to source | Merge dialog works; source board updated; fork marked merged |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Deep copy of large boards (50+ cards) is slow | Medium | Medium | Use batch INSERT with COPY command; target < 2 seconds for 50-card fork |
| Merge conflicts are confusing for users | Medium | Medium | Clear UI showing side-by-side comparison; default to "Keep Both" which preserves all evidence |
| Orphaned forks accumulate over time | High | Low | Add "Stale Fork" warning after 30 days of inactivity; admin cleanup tool |
| Source board changes make merge impossible | Low | High | Fork-point snapshot enables accurate divergence detection; conflicts surfaced, not hidden |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 4 Board Governance | Predecessor | Must be complete | Board, Card, Gate, Evidence services |
| Sprint 7.2 ReplaySnapshot (optional) | Soft dependency | Preferred | Reuse snapshot mechanism; can implement independent snapshot if 7.2 not complete |
| Board cards with IntentSpec | Service | Must be functional | Fork clones card+IntentSpec pairs |
| Evidence Collector | Service | Must be functional | Merge copies evidence records |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Database + Fork Creation | T-7.3.1-01a, T-7.3.1-01c, T-7.3.1-01b, T-7.3.1-01d | Migrations, CreateFork with deep copy and lineage |
| Day 2 | Divergence + Fork List | T-7.3.2-01c, T-7.3.2-01a, T-7.3.2-01b, T-7.3.1-02a | Divergence detection, source_card_id tracking, API endpoints |
| Day 3 | Merge Mechanism | T-7.3.3-01a, T-7.3.3-01b, T-7.3.3-01c, T-7.3.3-01d | Preview, merge-back, conflict detection, status management |
| Day 4 | Frontend + QA | T-7.3.4-01a, T-7.3.4-01b, T-7.3.4-01c, T-7.3.4-01d | Fork UI, divergence viewer, merge dialog, all tests passing |

---

## 10. Definition of Done

- [ ] Board fork creates deep copy with all cards, IntentSpecs, and gate configurations
- [ ] Fork does not copy evidence, runs, or gate evaluations (clean slate for experimentation)
- [ ] Fork-point snapshot captured for divergence baseline
- [ ] Divergence detection identifies added, removed, and modified cards
- [ ] Merge preview shows exactly what would change in source board
- [ ] Conflict detection flags cards with concurrent modifications
- [ ] Selective merge allows choosing specific cards and conflict resolutions
- [ ] Fork status transitions (active -> merged/abandoned) enforced
- [ ] Merged forks become read-only
- [ ] All 6 API endpoints return correct responses
- [ ] Frontend fork creation, management, divergence viewing, and merge all functional
- [ ] All unit, integration, and E2E tests pass

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260625_board_fork.sql`
- [ ] Backend: `internal/service/fork.go` — ForkService with all methods
- [ ] Backend: `internal/store/fork.go` — ForkStore with DB queries
- [ ] Backend: `internal/model/fork.go` — BoardFork, Divergence, MergePreview models
- [ ] Backend: 6 HTTP handlers and routes
- [ ] Frontend: Fork creation dialog and toolbar button
- [ ] Frontend: Fork management panel (Forks tab)
- [ ] Frontend: `DivergenceViewer` component
- [ ] Frontend: `MergePreviewDialog` component
- [ ] Tests: 5 unit, 4 integration, 3 E2E tests

---

## 12. Optional

- **Fork Comparison Matrix:** Compare 3+ forks side-by-side in a matrix view to find the best experimental outcome
- **Auto-Fork on Mode Escalation:** Automatically fork a board when transitioning from Explore to Study, preserving the exploration state
- **Fork Templates:** Save a fork's modifications as a reusable "experiment template" for other boards

---
---

# Sprint 7.4: Multi-Agent Coordination

**Complexity:** L | **Duration:** 5 days | **Depends on:** Phase 3 (Agent Intelligence Layer)

---

## 1. Sprint Overview

**Goal:** Enable multiple agents to work together on complex engineering tasks through a coordinator agent that allocates sub-tasks, manages shared memory, and resolves conflicts between agent proposals.

**Business Value:** Complex engineering analyses (e.g., multi-physics simulation optimization) require expertise across multiple domains — structural, thermal, fluid dynamics. Multi-agent coordination lets domain-specialist agents collaborate under a coordinator that decomposes the problem, delegates to specialists, resolves conflicting recommendations, and synthesizes a unified result.

**Scope Summary:**
- Coordinator agent: decomposes goals into sub-tasks, assigns to specialist agents
- Task allocation protocol: matching sub-tasks to agent capabilities with load balancing
- Shared memory space: agents can read/write to a coordination-scoped memory
- Conflict resolution: when agents disagree, coordinator applies resolution strategies
- Consensus building: weighted voting based on agent confidence and domain expertise
- Frontend multi-agent session view with coordination timeline

---

## 2. Scope Breakdown

### Epic 7.4.1: Coordinator Agent Framework

**US-7.4.1-01:** As a platform engineer, I want a coordinator agent type that can decompose a complex goal into sub-tasks and delegate to specialist agents.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.4.1-01a | Create `agent_coordinations` table: `id`, `coordinator_agent_id`, `goal`, `status`, `task_decomposition` (JSONB), `resolution` (JSONB), `created_at`, `completed_at` | Migration runs; table supports coordination lifecycle |
| T-7.4.1-01b | Create `coordination_tasks` table: `id`, `coordination_id`, `assigned_agent_id`, `task_description`, `status`, `result` (JSONB), `confidence`, `started_at`, `completed_at` | Migration runs; tracks individual sub-task assignments |
| T-7.4.1-01c | Implement `CoordinatorService.DecomposeGoal(coordinationID, goal)` — uses LLM to decompose a complex goal into sub-tasks with required capabilities per task | Returns task list: `[{ description, required_capabilities: [], priority, depends_on: [] }]` |
| T-7.4.1-01d | Add `agent_role` enum to AgentSpec: `specialist`, `coordinator`, `reviewer` | AgentSpec validation allows role declaration; coordinator agents must have decomposition capability |
| T-7.4.1-01e | Implement coordination lifecycle state machine: `created -> decomposing -> delegating -> executing -> resolving -> completed/failed` | Status transitions enforced; invalid transitions rejected |

**US-7.4.1-02:** As a coordinator agent, I want to select the best specialist agents for each sub-task based on their capabilities and past performance.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.4.1-02a | Implement `CoordinatorService.AllocateTasks(coordinationID)` — matches sub-tasks to available agents by capability overlap, trust score, and current load | Each task assigned to best-matching available agent; load balancing prevents single agent from getting > 50% of tasks |
| T-7.4.1-02b | Add `capabilities` JSONB column to `agents` table for declaring agent expertise domains | Capabilities declared as `["structural_analysis", "thermal_simulation", "material_selection"]`; queryable via GIN index |
| T-7.4.1-02c | Implement agent availability check — skip agents that are currently executing other coordinations | Busy agents deprioritized; if only available agent, queue task |

### Epic 7.4.2: Shared Memory Space

**US-7.4.2-01:** As a specialist agent in a coordination, I want to access shared memory so that I can see other agents' findings and build on them.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.4.2-01a | Create `coordination_memory` table: `id`, `coordination_id`, `agent_id`, `key`, `value` (JSONB), `memory_type` (finding/constraint/recommendation), `created_at` | Shared memory scoped to coordination; any participating agent can read; only contributing agent can update own entries |
| T-7.4.2-01b | Implement `SharedMemoryService.Write(coordinationID, agentID, key, value, type)` — agent writes finding to shared space | Entry created; other agents can query it; duplicate key from same agent updates existing entry |
| T-7.4.2-01c | Implement `SharedMemoryService.Read(coordinationID, query)` — semantic search across coordination memory | Returns relevant memory entries sorted by relevance; supports filtering by memory_type and agent_id |
| T-7.4.2-01d | Inject shared memory context into agent prompts during coordination execution | Agent LLM prompt includes: `[Shared Findings] Agent-X found: ... Agent-Y recommends: ...` |

### Epic 7.4.3: Conflict Resolution

**US-7.4.3-01:** As a coordinator, I want to detect and resolve conflicts between specialist agent recommendations.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.4.3-01a | Implement `ConflictDetector.Detect(coordinationID)` — identifies contradictory recommendations from different agents | Detects: numerical conflicts (agent A says thickness=2mm, agent B says thickness=5mm), categorical conflicts (agent A recommends Steel, agent B recommends Aluminum), constraint conflicts (agent A's solution violates agent B's constraint) |
| T-7.4.3-01b | Implement 3 resolution strategies: `coordinator_decides` (LLM-based reasoning), `weighted_vote` (confidence-weighted), `domain_authority` (highest expertise agent wins) | Each strategy produces a resolution with rationale; strategy selectable per coordination |
| T-7.4.3-01c | Implement `CoordinatorService.Resolve(coordinationID, strategy)` — applies resolution strategy and produces final unified recommendation | Resolution includes: chosen values, rationale per conflict, contributing agents, confidence score |
| T-7.4.3-01d | Add conflict resolution audit trail — log every conflict detection and resolution with full context | Audit entries created for each conflict and resolution; queryable per coordination |

### Epic 7.4.4: Multi-Agent UI

**US-7.4.4-01:** As a user, I want to view and manage multi-agent coordinations from the Agent Studio.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.4.4-01a | Build "Coordination" page in Agent Studio — create coordination with goal, select coordinator agent, view specialist assignments | Goal input, coordinator selection dropdown, auto-decomposition trigger, task assignment table |
| T-7.4.4-01b | Build coordination timeline — visual timeline showing task decomposition, agent assignments, execution progress, conflict resolution | Gantt-style timeline: rows per agent, blocks per task, conflict markers, resolution markers |
| T-7.4.4-01c | Build shared memory viewer — real-time view of coordination memory with agent attributions | Table: key, value, agent, type, timestamp; auto-refreshes; filterable by agent or type |
| T-7.4.4-01d | Build conflict resolution panel — shows detected conflicts with resolution options | Conflict cards: agent A vs agent B, values, confidence scores; resolution strategy selector; "Resolve" button |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.4.1-01a | Create agent_coordinations table | Backend | 1h | DB schema | Migration file | Table with lifecycle columns |
| T-7.4.1-01b | Create coordination_tasks table | Backend | 1h | DB schema | Migration file | Task tracking with agent assignment |
| T-7.4.1-01c | DecomposeGoal with LLM | Backend | 4h | LLM provider, goal | Task decomposition | LLM decomposes goal into 3-8 sub-tasks with capabilities |
| T-7.4.1-01d | Agent role enum | Backend | 1h | AgentSpec model | Updated model + validation | specialist/coordinator/reviewer roles validated |
| T-7.4.1-01e | Coordination lifecycle state machine | Backend | 2h | Coordination model | State transitions | All 6 transitions enforced |
| T-7.4.1-02a | AllocateTasks with capability matching | Backend | 4h | Agent capabilities, tasks | Task assignments | Best agent matched per task; load balanced |
| T-7.4.1-02b | Capabilities column + GIN index | Backend | 1h | Agents table | Migration + query | Capabilities queryable via contains operator |
| T-7.4.1-02c | Agent availability check | Backend | 2h | Active coordinations | Availability filter | Busy agents deprioritized |
| T-7.4.2-01a | Create coordination_memory table | Backend | 1h | DB schema | Migration file | Scoped memory storage |
| T-7.4.2-01b | SharedMemory Write method | Backend | 2h | Memory model | Write service | Entries created/updated per agent |
| T-7.4.2-01c | SharedMemory Read with semantic search | Backend | 3h | pgvector, query | Ranked results | Relevant entries returned, filtered |
| T-7.4.2-01d | Shared memory injection into prompts | Backend | 2h | Memory entries, runtime | Extended prompt | Agent prompt includes shared findings |
| T-7.4.3-01a | ConflictDetector | Backend | 4h | Agent results | Conflict list | Numerical, categorical, constraint conflicts detected |
| T-7.4.3-01b | 3 resolution strategies | Backend | 4h | Conflicts, agent data | Resolution per conflict | Each strategy produces resolution with rationale |
| T-7.4.3-01c | Resolve coordination | Backend | 3h | Strategy, conflicts | Unified recommendation | Final result with per-conflict rationale |
| T-7.4.3-01d | Conflict audit trail | Backend | 2h | Conflict/resolution events | Audit log entries | Full context logged per conflict |
| T-7.4.4-01a | Coordination page | Frontend | 4h | Coordination API | React page | Goal input, coordinator select, task table |
| T-7.4.4-01b | Coordination timeline | Frontend | 4h | Task status API | Gantt component | Per-agent rows, task blocks, conflict markers |
| T-7.4.4-01c | Shared memory viewer | Frontend | 3h | Memory API | Table component | Real-time memory display with filters |
| T-7.4.4-01d | Conflict resolution panel | Frontend | 3h | Conflict API | Card component | Conflict display, strategy selection, resolve action |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260626_multi_agent_coordination.sql
ALTER TABLE agents ADD COLUMN capabilities JSONB DEFAULT '[]'::jsonb;
CREATE INDEX idx_agents_capabilities ON agents USING GIN (capabilities);
ALTER TABLE agents ADD COLUMN agent_role VARCHAR(20) NOT NULL DEFAULT 'specialist' CHECK (agent_role IN ('specialist', 'coordinator', 'reviewer'));

CREATE TABLE agent_coordinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordinator_agent_id UUID NOT NULL REFERENCES agents(id),
    goal TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'decomposing', 'delegating', 'executing', 'resolving', 'completed', 'failed')),
    task_decomposition JSONB,
    resolution JSONB,
    resolution_strategy VARCHAR(30) DEFAULT 'coordinator_decides' CHECK (resolution_strategy IN ('coordinator_decides', 'weighted_vote', 'domain_authority')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id)
);

CREATE TABLE coordination_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordination_id UUID NOT NULL REFERENCES agent_coordinations(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES agents(id),
    task_description TEXT NOT NULL,
    required_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INTEGER NOT NULL DEFAULT 0,
    depends_on UUID[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'running', 'completed', 'failed', 'skipped')),
    result JSONB,
    confidence FLOAT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE coordination_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordination_id UUID NOT NULL REFERENCES agent_coordinations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    memory_type VARCHAR(30) NOT NULL CHECK (memory_type IN ('finding', 'constraint', 'recommendation', 'warning')),
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(coordination_id, agent_id, key)
);

CREATE INDEX idx_coordination_memory_embedding ON coordination_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

### Backend Architecture

**New Services:**

1. **`internal/service/coordinator.go`** — CoordinatorService
   - `CreateCoordination(coordinatorAgentID, goal) (*Coordination, error)`
   - `DecomposeGoal(coordinationID) ([]CoordinationTask, error)` — sends goal to coordinator agent's LLM with decomposition prompt; parses structured output into sub-tasks
   - `AllocateTasks(coordinationID) error` — matches tasks to agents using capability overlap score: `overlap = |task_caps ∩ agent_caps| / |task_caps|`; breaks ties by trust score; enforces max 50% tasks per agent
   - `ExecuteCoordination(coordinationID) error` — dispatches tasks respecting dependency order; runs independent tasks in parallel via goroutines
   - `Resolve(coordinationID, strategy) (*Resolution, error)`

2. **`internal/service/shared_memory.go`** — SharedMemoryService
   - `Write(coordinationID, agentID, key, value, memoryType) error`
   - `Read(coordinationID, query, filters) ([]MemoryEntry, error)` — embeds query via LLM, cosine similarity search on coordination_memory
   - `GetAll(coordinationID) ([]MemoryEntry, error)`

3. **`internal/service/conflict.go`** — ConflictDetector
   - `Detect(coordinationID) ([]Conflict, error)` — compares all task results pairwise; detects numerical (>10% deviation), categorical (different choices), and constraint violations
   - `ResolveByCoordinator(conflicts, coordinatorAgentID) ([]Resolution, error)` — LLM-based: sends conflicts to coordinator with all context
   - `ResolveByVote(conflicts, taskResults) ([]Resolution, error)` — weighted: `resolution = argmax(Σ agent_confidence × agent_trust_in_domain)`
   - `ResolveByAuthority(conflicts, agentCapabilities) ([]Resolution, error)` — agent with highest capability match to conflict domain wins

**Coordination Execution Flow:**
1. User creates coordination with goal and coordinator agent
2. Coordinator agent decomposes goal via LLM -> produces sub-tasks
3. AllocateTasks matches agents to sub-tasks
4. Tasks dispatched respecting dependency order (topological sort)
5. Each agent executes its task using existing agent runtime (Phase 3)
6. Agents write findings to shared memory during execution
7. After all tasks complete, ConflictDetector runs
8. If conflicts found, resolution strategy applied
9. Final unified result produced and stored

### API Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| POST | `/v0/coordinations` | `{ coordinator_agent_id, goal, resolution_strategy }` | 201: coordination created |
| GET | `/v0/coordinations/{id}` | — | 200: coordination detail with tasks |
| POST | `/v0/coordinations/{id}/decompose` | — | 200: task decomposition result |
| POST | `/v0/coordinations/{id}/allocate` | — | 200: task assignments |
| POST | `/v0/coordinations/{id}/execute` | — | 202: execution started |
| POST | `/v0/coordinations/{id}/resolve` | `{ strategy }` | 200: resolution result |
| GET | `/v0/coordinations/{id}/tasks` | — | 200: task list with statuses |
| GET | `/v0/coordinations/{id}/memory` | `?type=finding&agent_id=X` | 200: memory entries |
| POST | `/v0/coordinations/{id}/memory` | `{ key, value, memory_type }` | 201: memory entry created |
| GET | `/v0/coordinations/{id}/conflicts` | — | 200: detected conflicts |

---

## 5. UX/UI Requirements

**Coordination Page (`/agent-studio/coordinations`):**
- "New Coordination" button at top
- Creation dialog: goal textarea, coordinator agent dropdown (filtered to role=coordinator), resolution strategy selector
- Active coordination cards showing goal, status badge, progress (3/5 tasks complete)

**Coordination Detail View:**
- Header: goal, coordinator agent name, status, duration
- Task table: agent avatar, task description, status badge, confidence score, duration
- Timeline (Gantt-style): horizontal bars per agent, task blocks with color-coded status, dependency arrows between tasks, conflict markers (warning triangles) at resolution points
- Real-time updates via SSE during execution

**Shared Memory Panel:**
- Split panel below timeline
- Table: key, value (expandable JSON), agent (avatar + name), type (badge), timestamp
- Filter bar: memory type dropdown, agent filter, search input
- Auto-refreshes every 3 seconds during active coordination

**Conflict Resolution Panel:**
- Appears when conflicts detected (after execution phase)
- Conflict cards: "Agent A recommends X (confidence: 0.85) vs Agent B recommends Y (confidence: 0.72)"
- Resolution strategy selector with description of each
- "Resolve All" button; resolution rationale shown after application

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | DecomposeGoal produces valid sub-tasks | Tasks have description, capabilities, priorities |
| Unit | AllocateTasks matches by capability overlap | Agent with highest overlap assigned; load balanced |
| Unit | AllocateTasks enforces 50% max per agent | With 4 tasks and 2 agents, each gets max 2 |
| Unit | ConflictDetector finds numerical conflict | 2mm vs 5mm flagged (>10% deviation) |
| Unit | ConflictDetector finds categorical conflict | Steel vs Aluminum flagged |
| Unit | WeightedVote resolution picks highest weighted | Higher confidence + trust agent's value chosen |
| Integration | Full coordination: decompose -> allocate -> execute -> resolve | All phases complete; final resolution produced |
| Integration | Shared memory written by agent A, read by agent B | Agent B's prompt includes agent A's findings |
| Integration | Coordination with task dependencies | Dependent tasks wait for prerequisites |
| E2E | Create coordination from UI, run to completion | All UI elements update correctly through lifecycle |
| E2E | View conflicts and resolve from UI | Conflict cards display; resolution applied |
| Performance | 5 agents, 10 tasks, 50 memory entries | Coordination completes < 60 seconds (excluding LLM time) |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| LLM decomposition produces poor task breakdown | Medium | High | Add human review step after decomposition; allow manual task editing before execution |
| Conflict resolution by LLM is inconsistent | Medium | Medium | Weight historical resolution patterns; allow user override of any LLM resolution |
| Shared memory grows too large for prompt injection | Low | Medium | Limit injected memory to top-5 most relevant entries per agent step |
| Agent execution timeout stalls entire coordination | Medium | High | Per-task timeout (5 min default); coordinator can mark timed-out task as failed and proceed |
| Circular task dependencies in decomposition | Low | Medium | Validate dependency graph with cycle detection before allocation |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 3 Agent Intelligence (Sprint 3.1-3.4) | Predecessor | Must be complete | Agent runtime, scoring, memory, sessions all required |
| LLM provider configuration | Service | Must be functional | Coordinator needs LLM for decomposition and resolution |
| pgvector for memory embeddings | Infrastructure | Exists | Reuse existing pgvector setup from agent memory |
| NATS for task dispatch | Infrastructure | Exists | Reuse existing NATS subjects for agent execution |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Database + Coordinator Framework | T-7.4.1-01a, T-7.4.1-01b, T-7.4.1-01d, T-7.4.1-01e, T-7.4.1-02b | Migrations, agent roles, coordination state machine |
| Day 2 | Decomposition + Allocation | T-7.4.1-01c, T-7.4.1-02a, T-7.4.1-02c | Goal decomposition via LLM, task allocation with load balancing |
| Day 3 | Shared Memory + Execution | T-7.4.2-01a, T-7.4.2-01b, T-7.4.2-01c, T-7.4.2-01d | Memory CRUD, semantic search, prompt injection, coordination execution |
| Day 4 | Conflict Resolution | T-7.4.3-01a, T-7.4.3-01b, T-7.4.3-01c, T-7.4.3-01d | Conflict detection, 3 strategies, audit trail |
| Day 5 | Frontend + QA | T-7.4.4-01a, T-7.4.4-01b, T-7.4.4-01c, T-7.4.4-01d | Coordination page, timeline, memory viewer, conflict panel, all tests passing |

---

## 10. Definition of Done

- [ ] Coordinator agent decomposes goals into sub-tasks via LLM
- [ ] Task allocation matches agents by capability with load balancing
- [ ] Coordination lifecycle follows 6-state machine
- [ ] Shared memory allows cross-agent reading/writing with semantic search
- [ ] Shared findings injected into agent prompts during coordination
- [ ] Conflict detection identifies numerical, categorical, and constraint conflicts
- [ ] Three resolution strategies (coordinator_decides, weighted_vote, domain_authority) produce valid resolutions
- [ ] All 10 API endpoints return correct responses
- [ ] Frontend coordination page, timeline, memory viewer, and conflict panel all functional
- [ ] All unit tests pass (6 tests), integration tests pass (3 tests), E2E tests pass (2 tests)

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260626_multi_agent_coordination.sql`
- [ ] Backend: `internal/service/coordinator.go` — CoordinatorService
- [ ] Backend: `internal/service/shared_memory.go` — SharedMemoryService
- [ ] Backend: `internal/service/conflict.go` — ConflictDetector + 3 resolution strategies
- [ ] Backend: `internal/model/coordination.go` — Coordination, CoordinationTask, CoordinationMemory, Conflict, Resolution models
- [ ] Backend: `internal/store/coordination.go` — CoordinationStore with all queries
- [ ] Backend: 10 HTTP handlers and routes
- [ ] Frontend: Coordination page with creation dialog
- [ ] Frontend: `CoordinationTimeline` component (Gantt-style)
- [ ] Frontend: `SharedMemoryViewer` component
- [ ] Frontend: `ConflictResolutionPanel` component
- [ ] Tests: 6 unit, 3 integration, 2 E2E, 1 performance test

---

## 12. Optional

- **Agent Negotiation Protocol:** Instead of top-down conflict resolution, enable agents to negotiate directly with each other in a structured debate format
- **Coordination Templates:** Save successful coordination patterns (e.g., "Multi-physics optimization" with predefined agent roles and task decomposition structure)
- **Hierarchical Coordination:** Allow coordinator agents to delegate to sub-coordinators for very large problems (coordination of coordinations)

---
---

# Sprint 7.5: Agent Template Library (16 STEM Templates)

**Complexity:** M | **Duration:** 4 days | **Depends on:** Phase 3 (Agent Intelligence Layer)

---

## 1. Sprint Overview

**Goal:** Build a curated library of 16 pre-configured STEM agent templates that users can browse, preview, customize, and instantiate with one click, covering core engineering domains including FEA, CFD, materials science, manufacturing, and quality.

**Business Value:** Most engineering teams repeatedly configure similar agents for common analyses. Pre-built templates eliminate setup friction, encode best practices (scoring weights, tool preferences, policy thresholds), and give new users a fast path to productive agent usage.

**Scope Summary:**
- 16 STEM agent templates with full AgentSpec configurations
- Template metadata: domain tags, complexity rating, required tools, sample goals
- Template marketplace UI: browse, search, filter, preview, instantiate
- Template customization: fork a template, adjust parameters, save as custom template
- Template versioning and community ratings

---

## 2. Scope Breakdown

### Epic 7.5.1: Template Data Model and Storage

**US-7.5.1-01:** As a platform engineer, I want to store agent templates with full AgentSpec, metadata, and versioning.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.5.1-01a | Create `agent_templates` table: `id`, `name`, `slug`, `description`, `domain_tags` (JSONB), `complexity` (S/M/L), `agent_spec` (JSONB), `required_tools` (JSONB), `sample_goals` (JSONB), `version`, `author`, `is_official` (bool), `rating_avg`, `rating_count`, `usage_count`, `created_at`, `updated_at` | Migration runs; all columns present |
| T-7.5.1-01b | Create `agent_template_ratings` table: `id`, `template_id`, `user_id`, `rating` (1-5), `review` (text), `created_at` | One rating per user per template enforced via unique constraint |
| T-7.5.1-01c | Implement `TemplateService.Create/Get/List/Update/Delete` CRUD operations | Full CRUD with validation; slug must be unique; domain_tags validated against known taxonomy |

**US-7.5.1-02:** As a user, I want to instantiate an agent from a template with one click.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.5.1-02a | Implement `TemplateService.Instantiate(templateID, customizations)` — creates a new agent from template's AgentSpec with optional parameter overrides | New agent created with template's config; customizations applied; `created_from_template_id` set on agent |
| T-7.5.1-02b | Add `created_from_template_id` FK column to `agents` table | Column exists, nullable, FK to agent_templates |

### Epic 7.5.2: 16 STEM Template Definitions

**US-7.5.2-01:** As an engineer, I want access to 16 pre-built STEM agent templates covering common engineering domains.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.5.2-01a | Define Template 1: **FEA Optimization Agent** — selects mesh density, solver parameters, convergence criteria for structural analysis | AgentSpec: goal_template="Optimize FEA for {component}", scoring_weights={compat:0.4, trust:0.3, cost:0.1, latency:0.1, risk:0.1}, tools=[mesh_generator, fea_solver, result_analyzer], threshold=0.75 |
| T-7.5.2-01b | Define Template 2: **CFD Analysis Agent** — configures turbulence models, boundary conditions, mesh refinement for fluid dynamics | AgentSpec: domain_tags=["cfd","fluid_dynamics"], tools=[cfd_preprocessor, openfoam_solver, paraview_postprocessor], threshold=0.80 |
| T-7.5.2-01c | Define Template 3: **Material Selection Agent** — evaluates materials against multi-criteria (strength, weight, cost, manufacturability) | AgentSpec: scoring_strategy="cost_optimized", tools=[material_db_query, property_comparator, cost_estimator], threshold=0.70 |
| T-7.5.2-01d | Define Template 4: **Tolerance Stack-Up Agent** — analyzes geometric tolerance chains for assemblability | AgentSpec: tools=[tolerance_analyzer, monte_carlo_sim, stack_up_reporter], threshold=0.85 |
| T-7.5.2-01e | Define Template 5: **Fatigue Life Prediction Agent** — estimates component fatigue life using S-N curves and Miner's rule | AgentSpec: tools=[fatigue_calculator, sn_curve_lookup, life_predictor], threshold=0.80 |
| T-7.5.2-01f | Define Template 6: **Thermal Management Agent** — designs cooling strategies, predicts thermal gradients | AgentSpec: tools=[thermal_solver, heat_sink_designer, pcb_thermal_analyzer], threshold=0.75 |
| T-7.5.2-01g | Define Template 7: **DFM Review Agent** — evaluates designs for manufacturing feasibility across processes | AgentSpec: tools=[dfm_checker, moldflow_analyzer, process_selector], threshold=0.70 |
| T-7.5.2-01h | Define Template 8: **Weld Quality Inspector Agent** — analyzes weld inspection data for compliance | AgentSpec: domain_tags=["nde","welding"], tools=[weld_data_reader, defect_classifier, compliance_checker], threshold=0.90 |
| T-7.5.2-01i | Define Template 9: **Vibration Analysis Agent** — performs modal and harmonic analysis | AgentSpec: tools=[modal_solver, harmonic_analyzer, resonance_detector], threshold=0.80 |
| T-7.5.2-01j | Define Template 10: **Corrosion Assessment Agent** — evaluates corrosion risk based on environment and material pairing | AgentSpec: tools=[corrosion_model, galvanic_calculator, coating_recommender], threshold=0.75 |
| T-7.5.2-01k | Define Template 11: **Weight Optimization Agent** — minimizes component weight while meeting structural requirements | AgentSpec: scoring_strategy="cost_optimized" (cost=weight proxy), tools=[topology_optimizer, stress_checker, weight_calculator], threshold=0.75 |
| T-7.5.2-01l | Define Template 12: **Additive Manufacturing Agent** — evaluates AM feasibility, generates support structures, estimates build time | AgentSpec: tools=[am_feasibility, support_generator, build_time_estimator, cost_calculator], threshold=0.70 |
| T-7.5.2-01m | Define Template 13: **Test Plan Generator Agent** — creates test plans based on requirements and risk analysis | AgentSpec: domain_tags=["testing","quality"], tools=[requirement_parser, risk_analyzer, test_plan_generator], threshold=0.75 |
| T-7.5.2-01n | Define Template 14: **Dimensional Inspection Agent** — analyzes CMM data against GD&T specifications | AgentSpec: tools=[cmm_data_reader, gdt_evaluator, inspection_reporter], threshold=0.85 |
| T-7.5.2-01o | Define Template 15: **Supply Chain Risk Agent** — evaluates supplier reliability, lead times, and geopolitical risk | AgentSpec: tools=[supplier_scorer, lead_time_estimator, risk_aggregator], threshold=0.70 |
| T-7.5.2-01p | Define Template 16: **Regulatory Compliance Agent** — checks designs against industry standards (ASME, ISO, MIL-STD) | AgentSpec: tools=[standard_lookup, compliance_checker, gap_analyzer], threshold=0.90 |

### Epic 7.5.3: Template Marketplace UI

**US-7.5.3-01:** As a user, I want to browse, search, and filter the agent template library.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.5.3-01a | Build Template Gallery page (`/agent-studio/templates`) with card grid layout | Cards show: name, description (truncated), domain tags, complexity badge, rating stars, usage count |
| T-7.5.3-01b | Add search bar (debounced 300ms) and filter sidebar (domain tags, complexity, rating range) | Search matches name and description; filters are combinable; results update in real-time |
| T-7.5.3-01c | Build Template Detail page — full AgentSpec preview, sample goals, required tools list, ratings/reviews | Detail page shows all template metadata; "Use This Template" button prominent |

**US-7.5.3-02:** As a user, I want to customize and instantiate a template.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.5.3-02a | Build Template Customization dialog — adjust scoring weights, threshold, tool preferences before instantiation | Sliders for scoring weights, threshold input, tool preference toggles; "Create Agent" button |
| T-7.5.3-02b | Build rating/review submission form on Template Detail page | Star rating (1-5) + optional review text; one per user; updates template rating_avg |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.5.1-01a | Create agent_templates table | Backend | 1h | DB schema | Migration | Table with all columns, indexes on slug and domain_tags |
| T-7.5.1-01b | Create ratings table | Backend | 1h | DB schema | Migration | Unique constraint on (template_id, user_id) |
| T-7.5.1-01c | Template CRUD service | Backend | 3h | Template model | Service methods | Full CRUD with validation, pagination, sorting |
| T-7.5.1-02a | Instantiate template service | Backend | 3h | Template, agent service | Instantiate method | Creates agent with template config + customizations |
| T-7.5.1-02b | created_from_template_id column | Backend | 1h | Agents table | Migration | FK column added |
| T-7.5.2-01a-p | Define 16 STEM templates as seed data | Backend | 6h | Domain knowledge | Seed SQL/Go file | 16 templates with complete AgentSpec, metadata, sample goals |
| T-7.5.3-01a | Template Gallery page | Frontend | 4h | Template list API | Gallery page | Card grid with metadata badges |
| T-7.5.3-01b | Search and filter | Frontend | 3h | Template list API | Search + filter UI | Debounced search, combinable filters |
| T-7.5.3-01c | Template Detail page | Frontend | 3h | Template detail API | Detail page | Full spec preview, ratings, "Use" button |
| T-7.5.3-02a | Customization dialog | Frontend | 3h | Template detail, agent create API | Dialog component | Weight sliders, threshold, tool prefs |
| T-7.5.3-02b | Rating form | Frontend | 2h | Rating API | Form component | Star rating + review, one per user |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260627_agent_templates.sql
CREATE TABLE agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    domain_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    complexity VARCHAR(1) NOT NULL CHECK (complexity IN ('S', 'M', 'L')),
    agent_spec JSONB NOT NULL,
    required_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    sample_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    author VARCHAR(200) NOT NULL DEFAULT 'Airaie',
    is_official BOOLEAN NOT NULL DEFAULT false,
    rating_avg FLOAT NOT NULL DEFAULT 0.0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_templates_domain_tags ON agent_templates USING GIN (domain_tags);
CREATE INDEX idx_agent_templates_slug ON agent_templates(slug);

CREATE TABLE agent_template_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, user_id)
);

ALTER TABLE agents ADD COLUMN created_from_template_id UUID REFERENCES agent_templates(id);
```

### Template Seed Data Structure (example for FEA Optimization Agent)

```json
{
    "name": "FEA Optimization Agent",
    "slug": "fea-optimization",
    "description": "Selects optimal mesh density, solver parameters, and convergence criteria for finite element structural analysis. Balances accuracy against computational cost, adapting strategy based on component geometry complexity and material nonlinearity.",
    "domain_tags": ["fea", "structural", "simulation", "optimization"],
    "complexity": "M",
    "agent_spec": {
        "goal_template": "Optimize FEA analysis for {component_name} under {load_conditions}",
        "scoring": {
            "strategy": "weighted",
            "weights": { "compatibility": 0.4, "trust": 0.3, "cost": 0.1, "latency": 0.1, "risk": 0.1 },
            "min_threshold": 0.75,
            "llm_blend_weight": 0.3
        },
        "policy": {
            "auto_approve_threshold": 0.85,
            "escalate_threshold": 0.60,
            "max_cost_per_run": 50.00,
            "max_retries": 2
        },
        "memory": {
            "episodic_ttl_hours": 168,
            "semantic_extraction_after": 3,
            "max_context_memories": 5
        },
        "preferred_tools": ["mesh_generator", "fea_solver", "result_analyzer", "convergence_checker"],
        "constraints": ["mesh_quality > 0.7", "convergence_residual < 1e-6", "element_aspect_ratio < 10"]
    },
    "required_tools": ["mesh_generator", "fea_solver", "result_analyzer"],
    "sample_goals": [
        "Optimize mesh for bracket under 10kN tensile load",
        "Run convergence study for turbine blade thermal stress",
        "Select solver parameters for nonlinear contact analysis"
    ],
    "is_official": true
}
```

### API Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| GET | `/v0/agent-templates` | `?domain=fea&complexity=M&q=search&sort=rating&limit=20&offset=0` | 200: paginated template list |
| GET | `/v0/agent-templates/{slug}` | — | 200: template detail |
| POST | `/v0/agent-templates` | Full template body | 201: created template |
| PUT | `/v0/agent-templates/{id}` | Updated fields | 200: updated template |
| DELETE | `/v0/agent-templates/{id}` | — | 204: deleted |
| POST | `/v0/agent-templates/{id}/instantiate` | `{ customizations: { scoring: {...}, policy: {...} } }` | 201: `{ agent_id }` |
| POST | `/v0/agent-templates/{id}/ratings` | `{ rating: 4, review: "Great template" }` | 201: rating created |
| GET | `/v0/agent-templates/{id}/ratings` | `?limit=20&offset=0` | 200: paginated ratings |

---

## 5. UX/UI Requirements

**Template Gallery Page (`/agent-studio/templates`):**
- Grid layout: 3 columns on desktop, 2 on tablet, 1 on mobile
- Template card: name (bold), description (2-line clamp), domain tag pills (max 3 visible + "+N"), complexity badge (S=green, M=yellow, L=red), star rating (5 stars), usage count with user icon
- Top bar: search input (placeholder "Search templates..."), filter dropdowns (Domain, Complexity, Min Rating)
- Sort options: "Most Popular", "Highest Rated", "Newest", "Alphabetical"
- "Official" badge (Airaie logo) on official templates; "Community" badge on user-submitted

**Template Detail Page:**
- Hero section: name, description, domain tags, complexity, rating, "Use This Template" primary button
- "Agent Configuration" section: collapsible JSON viewer showing full AgentSpec with syntax highlighting
- "Required Tools" section: tool cards (name, trust level, available badge) — green checkmark if tool is registered in current project, red X if missing with "Register Tool" link
- "Sample Goals" section: clickable sample goals that pre-fill the customization dialog
- "Ratings & Reviews" section: star distribution histogram, individual reviews with user avatar and date

**Customization Dialog:**
- Opened by "Use This Template" button
- Name input (pre-filled with template name)
- Scoring weight sliders (5 sliders, sum constrained to 1.0 — auto-adjust last slider)
- Threshold input (range 0.5-1.0, step 0.05)
- Tool preference checkboxes (toggle preferred tools)
- "Advanced" collapsible: JSON editor for full AgentSpec override
- "Create Agent" button at bottom

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | Template CRUD — create with valid data | Template persisted; slug unique |
| Unit | Template CRUD — create with duplicate slug | Returns 409 Conflict |
| Unit | Instantiate template — no customizations | Agent created with exact template config |
| Unit | Instantiate template — with scoring weight override | Agent created with overridden weights, other config from template |
| Unit | Rating — one per user enforced | Second rating from same user returns 409 |
| Unit | Rating average recalculated on new rating | rating_avg and rating_count updated correctly |
| Integration | Seed 16 templates, list with domain filter | Correct templates returned for each domain |
| Integration | Instantiate template -> run agent | Agent executes with template configuration |
| Integration | Search templates by keyword | Matching templates returned by name/description |
| E2E | Browse gallery, click template, customize, create agent | Agent created; redirects to agent detail |
| E2E | Submit rating and review | Rating appears on template; average updates |
| E2E | Filter by domain "fea" + complexity "M" | Only matching templates shown |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Required tools not registered in user's project | High | Medium | Show "missing tools" warning with registration links; template still instantiatable (agent will fail at execution if tools missing) |
| Template AgentSpec format diverges from agent runtime expectations | Low | High | Validate template agent_spec against AgentSpec JSON schema on create/update |
| Community templates with poor configurations | Medium | Low | Rating system surfaces quality; require minimum 3 ratings before showing in "Top Rated" sort |
| 16 templates hard to maintain as platform evolves | Medium | Medium | Store templates as seed data in version-controlled file; migration re-seeds on update |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 3 Agent Intelligence | Predecessor | Must be complete | AgentSpec, runtime, scoring, policy all required |
| Agent CRUD endpoints | Service | Exists | Instantiate creates agent via existing service |
| User authentication (Phase 6) | Service | Should be available | Ratings require user_id; can use stub user if auth not ready |
| Tool registry (Phase 1) | Service | Exists | Required tools checked against registry |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Database + CRUD | T-7.5.1-01a, T-7.5.1-01b, T-7.5.1-01c, T-7.5.1-02b | Migrations, template CRUD service, ratings |
| Day 2 | 16 Templates + Instantiation | T-7.5.2-01a through T-7.5.2-01p, T-7.5.1-02a | All 16 templates defined and seeded, instantiation service |
| Day 3 | Frontend Gallery + Detail | T-7.5.3-01a, T-7.5.3-01b, T-7.5.3-01c | Template gallery page with search/filter, detail page |
| Day 4 | Customization + Rating + QA | T-7.5.3-02a, T-7.5.3-02b | Customization dialog, rating form, all tests passing |

---

## 10. Definition of Done

- [ ] 16 STEM agent templates seeded with complete AgentSpec configurations
- [ ] Template CRUD API fully functional with validation
- [ ] Template instantiation creates configured agent with one API call
- [ ] Customization overrides applied correctly during instantiation
- [ ] Rating system enforces one rating per user per template
- [ ] Template gallery displays cards with metadata, search, and filters
- [ ] Template detail page shows full configuration, required tools, and ratings
- [ ] Customization dialog allows parameter adjustment before creation
- [ ] All API endpoints return correct responses
- [ ] All unit, integration, and E2E tests pass

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260627_agent_templates.sql`
- [ ] Backend: `internal/service/template.go` — TemplateService with CRUD + Instantiate
- [ ] Backend: `internal/store/template.go` — TemplateStore
- [ ] Backend: `internal/model/template.go` — AgentTemplate, TemplateRating models
- [ ] Backend: Seed data file with 16 STEM template definitions
- [ ] Backend: 8 HTTP handlers and routes
- [ ] Frontend: Template Gallery page (`/agent-studio/templates`)
- [ ] Frontend: Template Detail page (`/agent-studio/templates/{slug}`)
- [ ] Frontend: `TemplateCustomizationDialog` component
- [ ] Frontend: `TemplateRatingForm` component
- [ ] Tests: 6 unit, 3 integration, 3 E2E tests

---

## 12. Optional

- **Community Template Submission:** Allow users to publish their own agents as templates (with review/approval workflow)
- **Template Composition:** Combine multiple templates into a multi-agent coordination preset
- **Template Analytics:** Track which templates lead to highest gate pass rates and surface as recommendations
- **Template Auto-Suggestion:** Based on IntentSpec domain, automatically suggest relevant agent templates

---
---

# Sprint 7.6: Tool SDK + CLI

**Complexity:** L | **Duration:** 5 days | **Depends on:** Phase 1 (Tool Execution Golden Path)

---

## 1. Sprint Overview

**Goal:** Build a developer SDK and CLI tool (`airaie`) that enables tool authors to scaffold, develop, test, build, and publish tools to the Airaie registry from their local development environment, with contract validation, local Docker testing, and one-command publishing.

**Business Value:** The Airaie platform is only as valuable as its tool ecosystem. The Tool SDK removes friction from tool development by providing a standardized workflow: `airaie tool init` creates a project skeleton, `airaie tool test` validates locally in Docker, `airaie tool build` packages the container, and `airaie tool publish` registers to the platform. This empowers domain engineers to contribute tools without needing deep platform knowledge.

**Scope Summary:**
- CLI binary: `airaie` with subcommands `tool init`, `tool test`, `tool build`, `tool publish`
- Contract scaffolding: generates ToolContract skeleton from interactive prompts
- Local Docker testing: runs tool in Docker with mock inputs, validates outputs against contract
- Build pipeline: packages Docker image, tags with version
- Publish pipeline: pushes image to registry, registers tool via API
- SDK library: helper functions for reading inputs, writing outputs, reporting progress

---

## 2. Scope Breakdown

### Epic 7.6.1: CLI Framework and Tool Init

**US-7.6.1-01:** As a tool developer, I want to run `airaie tool init` to scaffold a new tool project with all required files.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.6.1-01a | Create CLI project structure using Go with cobra framework: `cmd/airaie/main.go`, `cmd/tool.go`, `cmd/tool_init.go`, `cmd/tool_test_cmd.go`, `cmd/tool_build.go`, `cmd/tool_publish.go` | CLI binary compiles; `airaie --help` shows available commands |
| T-7.6.1-01b | Implement `airaie tool init [name]` — interactive prompts for tool metadata (name, version, domain, adapter type, description) | Creates directory with: `toolcontract.yaml`, `Dockerfile`, `README.md`, `src/` skeleton, `.airaie/config.yaml` |
| T-7.6.1-01c | Generate `toolcontract.yaml` skeleton with all 7 sections pre-filled with example values and comments | Contract YAML includes: metadata, interface (inputs/outputs), runtime, capabilities, governance, testing, errors sections |
| T-7.6.1-01d | Generate Dockerfile template based on adapter type (Python, Rust, Go, generic) | Python: FROM python:3.11-slim with pip install; Rust: multi-stage build; Go: multi-stage build; generic: FROM ubuntu |
| T-7.6.1-01e | Generate SDK helper file based on adapter type: `src/airaie_sdk.py` (Python), `src/airaie_sdk.rs` (Rust), `src/airaie_sdk.go` (Go) | Helper provides: `read_inputs()`, `write_outputs()`, `report_progress()`, `log()` functions |

**US-7.6.1-02:** As a tool developer, I want a configuration file that stores my API credentials and platform URL.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.6.1-02a | Implement `airaie config set --api-url https://... --api-key sk-...` storing config in `~/.airaie/config.yaml` | Config persisted; used by publish command; API key stored with file permissions 0600 |
| T-7.6.1-02b | Implement `airaie config show` displaying current configuration (API key masked) | Shows api_url, api_key (last 4 chars visible), default_project |

### Epic 7.6.2: Contract Validation and Local Testing

**US-7.6.2-01:** As a tool developer, I want to run `airaie tool test` to validate my tool contract and execute the tool locally in Docker.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.6.2-01a | Implement `airaie tool validate` — runs 12 lint checks against `toolcontract.yaml` in current directory | Outputs: pass/fail per check with descriptive messages; exit code 0 on all pass, 1 on any fail |
| T-7.6.2-01b | Implement `airaie tool test` — builds Docker image, runs container with mock inputs from `tests/` directory, validates outputs against contract | Builds image locally; mounts `tests/fixtures/input/` as inputs; runs container with resource limits from contract; validates output files match contract output schema |
| T-7.6.2-01c | Create test fixture format: `tests/fixtures/` directory with `input/` (mock input files) and `expected/` (expected output files or schema) | `airaie tool init` generates example fixtures; `airaie tool test` uses them automatically |
| T-7.6.2-01d | Implement output validation: check output files exist, match declared types, pass JSON schema validation if applicable | Validation report: files present (pass/fail), type match (pass/fail), schema valid (pass/fail per output) |
| T-7.6.2-01e | Implement resource limit enforcement during test: apply CPU, memory, and timeout limits from contract runtime section | Container runs with --cpus, --memory, --timeout matching contract; timeout kill tested |

### Epic 7.6.3: Build and Publish Pipeline

**US-7.6.3-01:** As a tool developer, I want to run `airaie tool build` to package my tool as a versioned Docker image.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.6.3-01a | Implement `airaie tool build` — builds Docker image tagged as `airaie-tool-{name}:{version}` from Dockerfile in current directory | Image built successfully; tagged with name and version from toolcontract.yaml; build output streamed to terminal |
| T-7.6.3-01b | Add `--push` flag to push image to configured container registry (default: platform's registry) | Image pushed to registry; progress shown; registry URL from config |

**US-7.6.3-02:** As a tool developer, I want to run `airaie tool publish` to register my tool on the Airaie platform.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.6.3-02a | Implement `airaie tool publish` — validates contract, builds image, pushes to registry, calls `POST /v0/tools` with full ToolContract, then `POST /v0/tools/{id}/versions` | Tool registered on platform; version created; output shows tool ID and version |
| T-7.6.3-02b | Add `--dry-run` flag that validates and shows what would be published without actually doing it | Dry run outputs: tool name, version, contract summary, image tag, target API URL; no side effects |
| T-7.6.3-02c | Implement version conflict detection — if tool+version already exists, prompt for version bump or `--force` flag | Duplicate version returns error with suggestion to bump; `--force` overwrites |

### Epic 7.6.4: SDK Helper Libraries

**US-7.6.4-01:** As a tool developer, I want an SDK library that handles input/output, progress reporting, and logging within my tool container.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.6.4-01a | Python SDK (`airaie_sdk.py`): `read_inputs(input_dir)` reads files from mounted input directory, returns dict keyed by port name | Reads files from /workspace/inputs/; detects JSON, CSV, binary; returns typed dict |
| T-7.6.4-01b | Python SDK: `write_outputs(output_dir, outputs)` writes result files to mounted output directory | Writes to /workspace/outputs/; creates manifest.json mapping port names to files |
| T-7.6.4-01c | Python SDK: `report_progress(percentage, message)` writes progress to stdout in structured format | Outputs: `{"type":"progress","percentage":45,"message":"Meshing complete"}` — Rust runner parses this |
| T-7.6.4-01d | Python SDK: `log(level, message)` writes structured log entry | Outputs: `{"type":"log","level":"info","message":"...","timestamp":"..."}` |
| T-7.6.4-01e | Publish Python SDK to PyPI as `airaie-sdk` package | `pip install airaie-sdk` works; version matches CLI version |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.6.1-01a | CLI project structure with cobra | Backend | 3h | Go project | CLI binary | `airaie --help` shows commands |
| T-7.6.1-01b | `airaie tool init` with prompts | Backend | 4h | User input | Scaffolded project | Directory created with all files |
| T-7.6.1-01c | ToolContract YAML skeleton | Backend | 2h | Template data | YAML template | All 7 sections with examples |
| T-7.6.1-01d | Dockerfile templates per adapter | Backend | 2h | Adapter types | 4 Dockerfile templates | Correct base image and build steps per adapter |
| T-7.6.1-01e | SDK helper files per adapter | Backend | 3h | SDK spec | Python/Rust/Go helper files | read_inputs, write_outputs, report_progress, log |
| T-7.6.1-02a | Config set command | Backend | 2h | CLI framework | Config persistence | API URL and key stored securely |
| T-7.6.1-02b | Config show command | Backend | 1h | Config file | Display output | Masked API key display |
| T-7.6.2-01a | Contract validation (12 checks) | Backend | 3h | toolcontract.yaml | Validation report | All 12 checks with descriptive output |
| T-7.6.2-01b | Local Docker test execution | Backend | 4h | Docker, contract | Test report | Container runs with mock inputs; outputs validated |
| T-7.6.2-01c | Test fixture format and generation | Backend | 2h | Init command | Fixture directory | Example fixtures created; format documented |
| T-7.6.2-01d | Output validation logic | Backend | 3h | Contract schema | Validation checks | Files, types, schemas validated |
| T-7.6.2-01e | Resource limit enforcement in test | Backend | 2h | Contract runtime | Docker flags | CPU, memory, timeout applied and tested |
| T-7.6.3-01a | Build command | Backend | 2h | Dockerfile | Docker image | Image tagged with name:version |
| T-7.6.3-01b | Push to registry | Backend | 2h | Built image | Pushed image | Image in registry; progress shown |
| T-7.6.3-02a | Publish command (full pipeline) | Backend | 4h | Config, contract, image | Registered tool | Tool and version created on platform |
| T-7.6.3-02b | Dry-run flag | Backend | 1h | Publish logic | Dry-run output | Summary shown; no side effects |
| T-7.6.3-02c | Version conflict detection | Backend | 2h | Tool API | Conflict handling | Duplicate detected; bump suggested |
| T-7.6.4-01a | Python SDK read_inputs | SDK | 2h | SDK spec | Python module | Reads all input types correctly |
| T-7.6.4-01b | Python SDK write_outputs | SDK | 2h | SDK spec | Python module | Writes outputs with manifest |
| T-7.6.4-01c | Python SDK report_progress | SDK | 1h | SDK spec | Python module | Structured progress output |
| T-7.6.4-01d | Python SDK log | SDK | 1h | SDK spec | Python module | Structured log output |
| T-7.6.4-01e | Publish to PyPI | SDK | 2h | Package config | Published package | pip install works |

---

## 4. Technical Implementation Plan

### CLI Architecture

```
airaie-cli/
├── cmd/
│   ├── root.go           # Root command, version, global flags
│   ├── config.go         # airaie config set/show
│   ├── tool.go           # airaie tool (parent command)
│   ├── tool_init.go      # airaie tool init [name]
│   ├── tool_validate.go  # airaie tool validate
│   ├── tool_test.go      # airaie tool test
│   ├── tool_build.go     # airaie tool build [--push]
│   └── tool_publish.go   # airaie tool publish [--dry-run] [--force]
├── internal/
│   ├── scaffold/         # Project scaffolding templates
│   │   ├── contract.yaml.tmpl
│   │   ├── dockerfile.python.tmpl
│   │   ├── dockerfile.rust.tmpl
│   │   ├── dockerfile.go.tmpl
│   │   ├── dockerfile.generic.tmpl
│   │   ├── sdk.python.tmpl
│   │   └── fixtures.tmpl
│   ├── validator/        # Contract validation (12 checks)
│   ├── runner/           # Local Docker test execution
│   ├── builder/          # Docker image build + push
│   └── publisher/        # API client for tool registration
├── sdk/
│   └── python/
│       ├── airaie_sdk/
│       │   ├── __init__.py
│       │   ├── io.py     # read_inputs, write_outputs
│       │   ├── progress.py # report_progress
│       │   └── logging.py  # log
│       ├── setup.py
│       └── pyproject.toml
├── go.mod
├── go.sum
└── main.go
```

### Scaffolded Project Structure (output of `airaie tool init mesh-generator`)

```
mesh-generator/
├── toolcontract.yaml     # Full 7-section ToolContract
├── Dockerfile            # Adapter-appropriate Dockerfile
├── src/
│   ├── main.py           # Entry point (Python adapter)
│   └── airaie_sdk.py     # Bundled SDK helpers (or pip dependency)
├── tests/
│   └── fixtures/
│       ├── input/        # Mock input files
│       │   └── geometry.step
│       └── expected/     # Expected output schema
│           └── output_schema.json
├── .airaie/
│   └── config.yaml       # Local tool config
└── README.md
```

### Contract Validation (12 Checks)

1. `metadata_complete` — name, version, description, domain_tags all present
2. `version_semver` — version matches `^[0-9]+\.[0-9]+\.[0-9]+$`
3. `inputs_typed` — every input port has `type` (artifact/number/string/json/boolean)
4. `outputs_typed` — every output port has `type`
5. `constraints_valid` — resource constraints within platform limits (CPU <= 16, memory <= 64GB, timeout <= 3600s)
6. `schema_valid` — contract YAML parses against ToolContract JSON schema
7. `adapter_known` — adapter type is one of: docker, python, rust, wasm
8. `resources_bounded` — cpu_cores > 0, memory_mb > 0, timeout_sec > 0
9. `intents_formatted` — supported_intents match pattern `domain.type` (e.g., `sim.fea`)
10. `errors_defined` — at least one error code defined with message
11. `tests_present` — `tests/fixtures/input/` directory exists with at least one file
12. `governance_complete` — sandbox policy declared (none/standard/strict)

### Local Docker Test Flow

```
airaie tool test
  1. Validate toolcontract.yaml (all 12 checks)
  2. Build Docker image: docker build -t airaie-tool-test .
  3. Create temp directories for output
  4. Run container:
     docker run --rm \
       --cpus={contract.runtime.cpu_cores} \
       --memory={contract.runtime.memory_mb}m \
       --network=none \
       -v ./tests/fixtures/input:/workspace/inputs:ro \
       -v ./tmp/output:/workspace/outputs \
       --stop-timeout {contract.runtime.timeout_sec} \
       airaie-tool-test
  5. Validate outputs:
     - Check all declared output ports have corresponding files
     - Validate JSON outputs against declared schemas
     - Compare against expected/ if present
  6. Report: pass/fail per check with timing
```

### API Endpoints (used by CLI)

The CLI calls existing Phase 1 API endpoints:
- `POST /v0/tools` — register tool (used by `airaie tool publish`)
- `POST /v0/tools/{id}/versions` — create version (used by `airaie tool publish`)
- `POST /v0/tools/{id}/versions/{v}/publish` — publish version
- `POST /v0/validate/contract` — validate contract remotely

---

## 5. UX/UI Requirements

**CLI UX (terminal-based):**

`airaie tool init`:
```
$ airaie tool init mesh-generator
? Tool name: mesh-generator
? Description: Generates FEA mesh from CAD geometry
? Domain: sim.fea
? Adapter type: (python/rust/go/generic) python
? Version: 0.1.0

Creating mesh-generator/
  -> toolcontract.yaml  (7-section contract template)
  -> Dockerfile          (Python 3.11 base)
  -> src/main.py         (entry point with SDK)
  -> tests/fixtures/     (example test fixtures)
  -> .airaie/config.yaml (local config)

Done! Next steps:
  1. Edit toolcontract.yaml with your inputs/outputs
  2. Implement src/main.py
  3. Add test fixtures to tests/fixtures/input/
  4. Run: airaie tool test
```

`airaie tool test`:
```
$ airaie tool test
Validating toolcontract.yaml...
  [PASS] metadata_complete
  [PASS] version_semver (0.1.0)
  ...
  [PASS] All 12 checks passed

Building Docker image...
  -> airaie-tool-mesh-generator:0.1.0 (built in 12.3s)

Running with fixtures (tests/fixtures/input/)...
  -> Container started (CPU: 2, Memory: 2048MB, Timeout: 300s)
  -> Progress: 25% - Loading geometry
  -> Progress: 50% - Generating mesh
  -> Progress: 100% - Complete
  -> Container exited (code: 0, duration: 4.2s)

Validating outputs...
  [PASS] mesh.vtk exists (artifact, 2.3MB)
  [PASS] metrics.json valid against schema
  [PASS] All outputs match contract

TEST PASSED (total: 16.5s)
```

`airaie tool publish`:
```
$ airaie tool publish
Validating... 12/12 checks passed
Building... airaie-tool-mesh-generator:0.1.0
Pushing to registry... done (2.3MB)
Registering on platform... done

Tool published!
  ID: tool_abc123
  Version: 0.1.0
  URL: https://app.airaie.io/tools/mesh-generator
```

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | `airaie tool init` scaffolds Python project | All expected files created with correct content |
| Unit | `airaie tool init` scaffolds Rust project | Rust-specific Dockerfile and SDK generated |
| Unit | Contract validation: valid contract | All 12 checks pass |
| Unit | Contract validation: missing metadata | `metadata_complete` fails with descriptive message |
| Unit | Contract validation: invalid semver | `version_semver` fails |
| Unit | Contract validation: CPU > 16 cores | `constraints_valid` fails |
| Integration | `airaie tool test` with passing tool | Container runs, outputs validated, TEST PASSED |
| Integration | `airaie tool test` with failing tool (missing output) | Output validation fails with clear message |
| Integration | `airaie tool test` with timeout | Container killed after timeout, TIMEOUT reported |
| Integration | `airaie tool build` produces tagged image | `docker images` shows correct tag |
| Integration | `airaie tool publish` registers tool on platform | Tool visible in API response |
| Integration | `airaie tool publish --dry-run` | Summary shown, no tool registered |
| E2E | Full lifecycle: init -> implement -> test -> build -> publish | Tool registered and executable on platform |
| Unit | Python SDK `read_inputs` reads JSON file | Returns parsed dict |
| Unit | Python SDK `write_outputs` creates manifest | manifest.json lists all output files |
| Unit | Python SDK `report_progress` outputs structured JSON | Valid JSON with type, percentage, message |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Docker not available on developer machine | Medium | High | Detect Docker availability on `airaie tool test`; provide clear installation instructions; future: podman support |
| ToolContract schema evolves, breaking CLI validation | Medium | Medium | Version the schema; CLI checks schema_version compatibility; `airaie update` command for CLI updates |
| Large Docker images slow to push | Medium | Low | Show progress bar; add --compress flag; recommend multi-stage builds in Dockerfile template |
| Network issues during publish | Low | Medium | Retry with exponential backoff (3 attempts); resume support for image push |
| Windows/Linux path differences in Docker volume mounts | Medium | Medium | Normalize paths in CLI; test on both platforms |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 1 Tool Registration API | Predecessor | Must be complete | CLI calls POST /v0/tools and /versions endpoints |
| Phase 1 Contract Validation API | Predecessor | Must be complete | CLI can validate remotely via POST /v0/validate/contract |
| Docker Engine | External | Must be installed | Required for test and build commands |
| Container Registry | Infrastructure | Must be configured | For image push; can be platform-hosted or external |
| Go 1.21+ | Build tool | Available | CLI built in Go |
| PyPI account | External | Required for SDK publish | For `pip install airaie-sdk` |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | CLI Framework + Init | T-7.6.1-01a, T-7.6.1-01b, T-7.6.1-01c, T-7.6.1-01d, T-7.6.1-01e | CLI compiles, `airaie tool init` scaffolds projects |
| Day 2 | Config + Validation | T-7.6.1-02a, T-7.6.1-02b, T-7.6.2-01a, T-7.6.2-01c | Config management, 12-check contract validation, fixture format |
| Day 3 | Local Docker Testing | T-7.6.2-01b, T-7.6.2-01d, T-7.6.2-01e | `airaie tool test` runs container, validates outputs, enforces limits |
| Day 4 | Build + Publish | T-7.6.3-01a, T-7.6.3-01b, T-7.6.3-02a, T-7.6.3-02b, T-7.6.3-02c | Build and publish pipeline, dry-run, version conflict detection |
| Day 5 | Python SDK + QA | T-7.6.4-01a, T-7.6.4-01b, T-7.6.4-01c, T-7.6.4-01d, T-7.6.4-01e | Python SDK published, all tests passing, E2E lifecycle verified |

---

## 10. Definition of Done

- [ ] `airaie tool init` scaffolds complete project with contract, Dockerfile, SDK, fixtures
- [ ] 4 adapter templates (Python, Rust, Go, generic) generate correct files
- [ ] `airaie tool validate` runs 12 lint checks with descriptive output
- [ ] `airaie tool test` builds Docker image, runs with mock inputs, validates outputs
- [ ] Resource limits (CPU, memory, timeout) enforced during local test
- [ ] `airaie tool build` produces tagged Docker image
- [ ] `airaie tool publish` registers tool on platform via API
- [ ] `--dry-run` flag shows summary without side effects
- [ ] Version conflict detection prevents duplicate versions
- [ ] Python SDK published to PyPI with read_inputs, write_outputs, report_progress, log
- [ ] Config management stores API credentials securely
- [ ] All unit, integration, and E2E tests pass

---

## 11. Deliverables Checklist

- [ ] Go CLI binary: `airaie` with 7 subcommands
- [ ] Scaffold templates: 4 Dockerfiles, 3 SDK helpers, contract YAML, fixture structure
- [ ] Contract validator: 12 lint checks
- [ ] Docker test runner: local execution with output validation
- [ ] Build pipeline: image build + push
- [ ] Publish pipeline: validate -> build -> push -> register
- [ ] Python SDK: `airaie-sdk` package on PyPI
- [ ] Config management: `~/.airaie/config.yaml`
- [ ] Tests: 10 unit, 5 integration, 1 E2E lifecycle test
- [ ] CLI documentation: `airaie --help` with examples per command

---

## 12. Optional

- **`airaie tool watch`:** Auto-rebuild and re-test on file changes (development mode)
- **Rust and Go SDK Packages:** Publish Rust crate `airaie-sdk` and Go module `github.com/airaie/sdk`
- **Template Gallery Integration:** `airaie tool init --from-template mesh-generator` pulls templates from platform
- **CI/CD Integration:** GitHub Action for `airaie tool publish` in CI pipelines

---
---

# Sprint 7.7: Workflow Templates Marketplace

**Complexity:** M | **Duration:** 4 days | **Depends on:** Phase 2 (Workflow Engine Completion)

---

## 1. Sprint Overview

**Goal:** Build a marketplace of reusable workflow templates that users can browse, preview, parameterize, and import into their projects with one click, accelerating workflow creation by providing battle-tested DAG patterns.

**Business Value:** Engineering teams repeatedly build similar workflow patterns (mesh-solve-analyze, sweep-compare-report). A template marketplace captures institutional knowledge in reusable form, reducing setup time from hours to seconds and ensuring teams benefit from proven configurations.

**Scope Summary:**
- Workflow template data model with parameterized variables
- Template gallery with search, filter, and category browsing
- Template preview with DAG visualization and parameter documentation
- One-click import with parameter customization
- Template rating and usage tracking

---

## 2. Scope Breakdown

### Epic 7.7.1: Template Data Model

**US-7.7.1-01:** As a platform engineer, I want to store workflow templates with parameterized variables and versioning.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.7.1-01a | Create `workflow_templates` table: `id`, `name`, `slug`, `description`, `category`, `domain_tags` (JSONB), `workflow_dsl` (JSONB), `parameters` (JSONB array of `{ name, type, default, description, required }`), `node_count`, `estimated_duration_min`, `version`, `author`, `is_official`, `rating_avg`, `rating_count`, `usage_count`, `preview_image_url`, `created_at` | Migration runs; all columns present with correct types |
| T-7.7.1-01b | Create `workflow_template_ratings` table with same structure as agent template ratings | One rating per user per template |
| T-7.7.1-01c | Implement `WorkflowTemplateService` with CRUD, search (full-text on name+description), and filter (category, domain_tags, complexity) | Full CRUD; search returns ranked results; filters combinable |
| T-7.7.1-01d | Define template categories: `simulation`, `optimization`, `inspection`, `manufacturing`, `testing`, `data-processing`, `reporting` | Categories validated on create/update |

**US-7.7.1-02:** As a user, I want to import a template into my project as a new workflow with my parameter values.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.7.1-02a | Implement `WorkflowTemplateService.Instantiate(templateID, paramValues)` — substitutes parameter values into workflow DSL, creates new workflow, creates version, compiles | New workflow created with parameters replaced; version in `compiled` status; all tool references validated |
| T-7.7.1-02b | Implement parameter substitution engine — replace `{{ param.name }}` tokens in workflow DSL with user-provided values | All parameter tokens replaced; type validation (number params must be numeric, etc.); missing required params return error |

### Epic 7.7.2: Seed Templates

**US-7.7.2-01:** As an engineer, I want access to pre-built workflow templates for common engineering patterns.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.7.2-01a | Template: **FEA Analysis Pipeline** — Mesh Generation -> FEA Solve -> Result Analysis -> Report Generation | 4-node linear DAG; params: component_name, material, load_type, mesh_density |
| T-7.7.2-01b | Template: **CFD Sweep** — Geometry Prep -> Parallel CFD runs (3 conditions) -> Result Comparison -> Report | 6-node DAG with fan-out; params: geometry_file, flow_velocities[], turbulence_model |
| T-7.7.2-01c | Template: **Material Comparison Study** — Property Query (N materials) -> Parallel FEA -> Comparison Matrix -> Ranking Report | Fan-out pattern; params: materials[], load_case, acceptance_criteria |
| T-7.7.2-01d | Template: **Tolerance Stack-Up Analysis** — CAD Import -> GD&T Extract -> Monte Carlo Sim -> Stack Report | 4-node linear; params: assembly_file, num_iterations, confidence_level |
| T-7.7.2-01e | Template: **Weld Inspection Pipeline** — Data Import -> Defect Detection -> Classification -> Compliance Report | 4-node linear; params: inspection_data_path, standard (AWS_D1.1/ISO_5817), accept_level |
| T-7.7.2-01f | Template: **Design Optimization Loop** — Initial Analysis -> Optimizer -> Re-analyze -> Convergence Check (loop) -> Final Report | 5-node with loop; params: objective, constraints[], max_iterations, convergence_threshold |
| T-7.7.2-01g | Template: **Multi-Physics Coupled Analysis** — Thermal -> Structural -> Fatigue -> Assessment Report | 4-node serial with data passing; params: thermal_load, structural_load, fatigue_cycles |
| T-7.7.2-01h | Template: **Batch Test Report Generator** — Load Results (N) -> Parallel Processing -> Aggregation -> PDF Report | Fan-in pattern; params: result_files[], report_template, title |

### Epic 7.7.3: Marketplace UI

**US-7.7.3-01:** As a user, I want to browse, search, preview, and import workflow templates.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.7.3-01a | Build Template Gallery page (`/workflow-studio/templates`) with category sidebar and card grid | Categories in left sidebar with counts; cards show name, description, node count, estimated duration, rating |
| T-7.7.3-01b | Build Template Detail page with interactive DAG preview (read-only XYFlow canvas showing the workflow structure) | DAG visualization of template nodes; parameter table with descriptions and defaults; "Use Template" button |
| T-7.7.3-01c | Build Parameter Customization dialog — form auto-generated from template parameters | Each parameter rendered as appropriate input (text, number, file selector, multi-select for arrays); required params marked; defaults pre-filled |
| T-7.7.3-01d | Build one-click import: fill parameters -> create workflow -> redirect to workflow editor | Workflow created; user redirected to `/workflow-studio/{newId}` with template-derived DAG loaded |
| T-7.7.3-01e | Build rating system on Template Detail page | Star rating + review; average recalculated; one per user |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.7.1-01a | Create workflow_templates table | Backend | 1h | DB schema | Migration | Table with all columns and indexes |
| T-7.7.1-01b | Create ratings table | Backend | 1h | DB schema | Migration | Unique constraint enforced |
| T-7.7.1-01c | WorkflowTemplateService CRUD | Backend | 3h | Template model | Service methods | CRUD + search + filter working |
| T-7.7.1-01d | Define categories | Backend | 1h | Domain knowledge | Enum validation | 7 categories validated |
| T-7.7.1-02a | Instantiate template | Backend | 4h | Template, workflow service | Instantiation method | Workflow created with params substituted |
| T-7.7.1-02b | Parameter substitution engine | Backend | 3h | Template DSL | Substitution logic | Tokens replaced, types validated |
| T-7.7.2-01a-h | 8 seed workflow templates | Backend | 6h | Domain knowledge | Seed data | 8 complete template definitions with DAGs |
| T-7.7.3-01a | Template Gallery page | Frontend | 4h | Templates API | Gallery page | Category sidebar, card grid |
| T-7.7.3-01b | Template Detail with DAG preview | Frontend | 4h | Template detail API | Detail page with XYFlow | DAG rendered, params shown |
| T-7.7.3-01c | Parameter Customization dialog | Frontend | 3h | Template params | Form dialog | Auto-generated form with validation |
| T-7.7.3-01d | One-click import flow | Frontend | 2h | Instantiate API | Import flow | Workflow created and editor opened |
| T-7.7.3-01e | Rating system UI | Frontend | 2h | Rating API | Rating form | Stars + review, one per user |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260628_workflow_templates.sql
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('simulation', 'optimization', 'inspection', 'manufacturing', 'testing', 'data-processing', 'reporting')),
    domain_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    workflow_dsl JSONB NOT NULL,
    parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
    node_count INTEGER NOT NULL DEFAULT 0,
    estimated_duration_min INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    author VARCHAR(200) NOT NULL DEFAULT 'Airaie',
    is_official BOOLEAN NOT NULL DEFAULT false,
    rating_avg FLOAT NOT NULL DEFAULT 0.0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    preview_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_domain_tags ON workflow_templates USING GIN (domain_tags);
CREATE INDEX idx_workflow_templates_name_desc ON workflow_templates USING GIN (to_tsvector('english', name || ' ' || description));

CREATE TABLE workflow_template_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, user_id)
);
```

### Parameter Substitution Engine

Template workflow DSL contains parameter tokens: `{{ param.component_name }}`, `{{ param.mesh_density }}`, etc.

```go
func SubstituteParameters(dsl map[string]interface{}, params []TemplateParam, values map[string]interface{}) (map[string]interface{}, error) {
    // 1. Validate all required params are provided
    // 2. Validate value types match param declarations
    // 3. Deep-walk DSL JSON, replacing {{ param.X }} tokens
    // 4. For array params (e.g., materials[]), expand fan-out nodes
    // 5. Return substituted DSL ready for compilation
}
```

Array parameters trigger node duplication: if a template has a fan-out pattern with `{{ param.materials[] }}`, and the user provides `["Steel", "Aluminum", "Titanium"]`, the engine duplicates the parallel node for each value.

### API Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| GET | `/v0/workflow-templates` | `?category=simulation&q=fea&sort=popular&limit=20&offset=0` | 200: paginated list |
| GET | `/v0/workflow-templates/{slug}` | — | 200: template detail with DSL and params |
| POST | `/v0/workflow-templates` | Full template body | 201: created |
| POST | `/v0/workflow-templates/{id}/instantiate` | `{ parameters: { component_name: "bracket", ... } }` | 201: `{ workflow_id, version_id }` |
| POST | `/v0/workflow-templates/{id}/ratings` | `{ rating: 5, review: "Excellent" }` | 201: rating created |
| GET | `/v0/workflow-templates/{id}/ratings` | `?limit=20` | 200: paginated ratings |
| GET | `/v0/workflow-templates/categories` | — | 200: category list with counts |

---

## 5. UX/UI Requirements

**Gallery Page (`/workflow-studio/templates`):**
- Left sidebar: category list with document icon and count (e.g., "Simulation (3)", "Optimization (2)")
- Top bar: search input, sort dropdown (Popular/Highest Rated/Newest)
- Card grid (3 columns): template name, 2-line description, node count icon, duration estimate, category pill, rating stars, "Official" badge where applicable
- Empty state: "No templates match your search. Try different keywords or browse all categories."

**Template Detail Page:**
- Top: name, description, category pill, rating, usage count, "Use This Template" primary button
- DAG Preview: read-only XYFlow canvas rendering the template's workflow nodes and edges; nodes labeled with tool names; parameter tokens shown as `{component_name}` placeholders
- Parameters Table: name, type, description, default value, required badge
- "Required Tools" section: tool cards with availability check (green/red)
- Reviews section: star distribution + individual reviews

**Parameter Dialog (on "Use This Template"):**
- Modal overlay
- Form auto-generated from parameters array:
  - `string` -> text input
  - `number` -> number input with step
  - `file` -> artifact file selector
  - `array` -> tag input (add/remove items)
  - `enum` -> select dropdown
- Required params have asterisk; all pre-filled with defaults
- "Create Workflow" button at bottom
- On success: redirect to workflow editor with new workflow loaded

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | Template CRUD with valid data | Created, retrieved, updated, deleted |
| Unit | Parameter substitution: string param | Token replaced with value |
| Unit | Parameter substitution: array param fan-out | Nodes duplicated per array item |
| Unit | Parameter substitution: missing required param | Error returned with param name |
| Unit | Parameter substitution: wrong type | Error returned with expected type |
| Integration | Instantiate template -> compile workflow | Workflow compiles successfully with substituted values |
| Integration | Search templates by keyword "FEA" | Matching templates returned |
| Integration | Filter by category "simulation" | Only simulation templates returned |
| E2E | Browse gallery, select template, fill params, create | Workflow created; editor loads with correct DAG |
| E2E | Rate template and see updated average | Rating saved; average recalculated on page |
| E2E | Category sidebar navigation | Clicking category filters results |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Template DAG references tools not available in user's project | High | Medium | Show "missing tools" warning during instantiation; template still importable but workflow won't compile until tools registered |
| Array parameter expansion creates excessively large DAGs | Low | Medium | Cap array expansion at 20 items; show warning for 10+ |
| Template DSL format diverges from compiler expectations | Medium | Medium | Validate template DSL on creation against compiler schema; re-validate on instantiate |
| Users expect templates to work out-of-the-box without tool registration | High | Medium | Prominent "Required Tools" section; one-click tool registration links where possible |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 2 Workflow Engine | Predecessor | Must be complete | Workflow creation, compilation, versioning |
| Workflow Compiler (Sprint 2.1) | Service | Must be functional | Instantiated templates must compile |
| XYFlow canvas (Sprint 2.1) | Frontend | Must be functional | Template preview uses read-only canvas |
| Tool Registry (Phase 1) | Service | Must be functional | Required tools checked against registry |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Database + Service | T-7.7.1-01a, T-7.7.1-01b, T-7.7.1-01c, T-7.7.1-01d | Migrations, CRUD service, categories |
| Day 2 | Templates + Instantiation | T-7.7.2-01a-h, T-7.7.1-02a, T-7.7.1-02b | 8 seed templates, instantiation with param substitution |
| Day 3 | Frontend Gallery + Detail | T-7.7.3-01a, T-7.7.3-01b, T-7.7.3-01e | Gallery page, detail page with DAG preview, rating form |
| Day 4 | Import Flow + QA | T-7.7.3-01c, T-7.7.3-01d | Parameter dialog, one-click import, all tests passing |

---

## 10. Definition of Done

- [ ] 8 workflow templates seeded with complete DAG definitions and parameterization
- [ ] Parameter substitution engine handles strings, numbers, arrays with type validation
- [ ] Array parameters trigger correct node fan-out in DAG
- [ ] Template instantiation creates compiled workflow ready for publishing
- [ ] Template gallery displays with category navigation, search, and filters
- [ ] Template detail page shows interactive DAG preview via XYFlow
- [ ] One-click import creates workflow and redirects to editor
- [ ] Rating system functional with one-per-user constraint
- [ ] All API endpoints return correct responses
- [ ] All unit, integration, and E2E tests pass

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260628_workflow_templates.sql`
- [ ] Backend: `internal/service/workflow_template.go` — WorkflowTemplateService
- [ ] Backend: `internal/service/param_substitution.go` — parameter substitution engine
- [ ] Backend: Seed data with 8 workflow template definitions
- [ ] Backend: 7 HTTP handlers and routes
- [ ] Frontend: Template Gallery page
- [ ] Frontend: Template Detail page with DAG preview
- [ ] Frontend: `ParameterCustomizationDialog` component
- [ ] Frontend: Rating form component
- [ ] Tests: 5 unit, 3 integration, 3 E2E tests

---

## 12. Optional

- **User Template Publishing:** Allow users to save their own workflows as templates and share with the community
- **Template Versioning:** Support multiple versions of a template; auto-notify users when templates they've used have updates
- **Template Dependency Resolution:** Auto-register required tools when importing a template (if tools are available in the platform's global registry)

---
---

# Sprint 7.8: Advanced Analytics Dashboards

**Complexity:** M | **Duration:** 4 days | **Depends on:** Phase 6 (Production Readiness)

---

## 1. Sprint Overview

**Goal:** Build executive-grade analytics dashboards with drill-down capabilities, covering platform usage, workflow performance, agent effectiveness, board governance health, and cost metrics, with export functionality for reporting.

**Business Value:** Engineering managers need visibility into how the platform is being used, where bottlenecks exist, which tools/agents deliver the best results, and how costs are tracking against budgets. Advanced analytics transform raw platform data into actionable insights.

**Scope Summary:**
- Executive summary dashboard with KPI tiles and trend lines
- Workflow performance dashboard: run success rates, durations, bottleneck analysis
- Agent effectiveness dashboard: scoring accuracy, learning curves, decision quality
- Board governance dashboard: gate pass rates, evidence quality, time-to-release
- Export to PDF and CSV for stakeholder reporting
- Drill-down from summary to detail with contextual filtering

---

## 2. Scope Breakdown

### Epic 7.8.1: Analytics Data Pipeline

**US-7.8.1-01:** As a platform engineer, I want pre-aggregated analytics data so that dashboards load quickly.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.8.1-01a | Create `analytics_daily` materialized view aggregating key metrics per day: total_runs, success_rate, avg_duration, total_cost, active_users, active_workflows, active_boards, gate_pass_rate | Materialized view created; refreshes on schedule (hourly); query returns data within 100ms |
| T-7.8.1-01b | Create `analytics_workflow_performance` view: per-workflow success_rate, avg_duration, p50/p95 duration, total_runs, failure_reasons (JSONB), most_used_tools | View joins runs, node_runs, tools; indexed for quick filtering |
| T-7.8.1-01c | Create `analytics_agent_effectiveness` view: per-agent avg_confidence, approval_rate, replan_rate, memory_utilization, tool_selection_accuracy | View joins agent sessions, runs, proposals; accuracy = proposals where selected tool succeeded |
| T-7.8.1-01d | Create `analytics_board_governance` view: per-board time_to_gate_pass, evidence_quality_avg, readiness_trend, gate_pass_rate, time_in_mode | View joins boards, gates, evidence; time metrics calculated from timestamps |
| T-7.8.1-01e | Implement `AnalyticsService.GetDashboardData(timeRange, filters)` — returns all dashboard metrics for the given period | Returns structured JSON with sections for each dashboard area; supports filters by project, team, date range |

### Epic 7.8.2: Dashboard Pages

**US-7.8.2-01:** As an engineering manager, I want an executive summary dashboard showing platform health at a glance.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.8.2-01a | Build Executive Dashboard page with KPI tiles: Total Runs (with trend), Success Rate (with trend), Active Workflows, Active Boards, Avg Duration, Total Cost | 6 KPI tiles at top; each shows current value, percentage change vs previous period, sparkline trend |
| T-7.8.2-01b | Build trend charts: daily run volume (bar), success rate (line), cost accumulation (area), active users (line) | 4 charts in 2x2 grid; time range selector (7d/30d/90d/custom); hover tooltips with exact values |
| T-7.8.2-01c | Build "Top Performers" tables: top 5 workflows by success rate, top 5 agents by confidence, top 5 boards by readiness | 3 tables at bottom; clickable rows navigate to respective detail pages |

**US-7.8.2-02:** As an engineering manager, I want to drill down into workflow performance details.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.8.2-02a | Build Workflow Performance dashboard: per-workflow metrics table with sortable columns, success rate bar chart, duration distribution histogram | Table: workflow name, runs, success%, avg duration, p95 duration, cost; chart: top 10 by run count |
| T-7.8.2-02b | Build bottleneck analyzer: identifies slowest nodes across all workflows, most-failed nodes, most-retried nodes | Table: node name, workflow, avg duration, failure count, retry count; sorted by impact (duration * run_count) |
| T-7.8.2-02c | Build failure analysis panel: failure reasons grouped by category with frequency | Pie chart of failure reasons; table with reason, count, percentage, affected workflows |

**US-7.8.2-03:** As an engineering manager, I want to drill down into agent effectiveness.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.8.2-03a | Build Agent Effectiveness dashboard: per-agent metrics, confidence trend over time, learning curve visualization | Table: agent, sessions, avg confidence, approval rate, replan rate; line chart: confidence over time showing learning |
| T-7.8.2-03b | Build decision quality panel: proposals approved vs rejected, escalation rate, human override rate | Bar chart: approved/rejected/escalated per agent; trend showing if agent is improving |

**US-7.8.2-04:** As an engineering manager, I want to see board governance metrics.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.8.2-04a | Build Board Governance dashboard: per-board gate pass rates, time-to-release, evidence quality scores | Table: board, mode, readiness, gate pass rate, time since creation; stacked bar: gates by status per board |
| T-7.8.2-04b | Build readiness timeline: readiness score over time for selected boards | Line chart: readiness 0-100% over time; multiple boards selectable for comparison |

### Epic 7.8.3: Export Functionality

**US-7.8.3-01:** As a manager, I want to export dashboard data to PDF and CSV for stakeholder reporting.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.8.3-01a | Implement CSV export for any analytics table | Download button on each table; CSV contains all columns and rows matching current filters |
| T-7.8.3-01b | Implement PDF export for each dashboard page | "Export PDF" button generates PDF with current charts rendered as images, tables as formatted text, header with date range and filters |
| T-7.8.3-01c | Implement scheduled report delivery — configure weekly email with dashboard PDF | Settings: recipient email, frequency (daily/weekly/monthly), dashboard selection; PDF attached to email |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.8.1-01a | analytics_daily materialized view | Backend | 3h | Runs, boards, users tables | Materialized view + refresh job | View created; hourly refresh; < 100ms query |
| T-7.8.1-01b | analytics_workflow_performance view | Backend | 2h | Runs, node_runs, tools | View | Per-workflow metrics accurate |
| T-7.8.1-01c | analytics_agent_effectiveness view | Backend | 2h | Agent sessions, proposals, runs | View | Per-agent metrics accurate |
| T-7.8.1-01d | analytics_board_governance view | Backend | 2h | Boards, gates, evidence | View | Per-board metrics accurate |
| T-7.8.1-01e | AnalyticsService.GetDashboardData | Backend | 3h | All views | Service method | Structured JSON with all dashboard sections |
| T-7.8.2-01a | Executive KPI tiles | Frontend | 3h | Analytics API | KPI components | 6 tiles with trends and sparklines |
| T-7.8.2-01b | Trend charts (4 charts) | Frontend | 4h | Analytics API | Recharts components | Bar, line, area charts with time range |
| T-7.8.2-01c | Top Performers tables | Frontend | 2h | Analytics API | Table components | 3 tables with clickable rows |
| T-7.8.2-02a | Workflow Performance dashboard | Frontend | 3h | Workflow analytics API | Dashboard page | Metrics table, bar chart, histogram |
| T-7.8.2-02b | Bottleneck analyzer | Frontend | 3h | Node analytics API | Analysis panel | Slowest/failed/retried nodes identified |
| T-7.8.2-02c | Failure analysis | Frontend | 2h | Failure data API | Pie chart + table | Failure reasons grouped |
| T-7.8.2-03a | Agent Effectiveness dashboard | Frontend | 3h | Agent analytics API | Dashboard page | Per-agent metrics + learning curve |
| T-7.8.2-03b | Decision quality panel | Frontend | 2h | Decision data API | Panel | Approved/rejected/escalated visualization |
| T-7.8.2-04a | Board Governance dashboard | Frontend | 3h | Board analytics API | Dashboard page | Gate pass rates, readiness, time metrics |
| T-7.8.2-04b | Readiness timeline | Frontend | 2h | Readiness history API | Line chart | Multi-board comparison over time |
| T-7.8.3-01a | CSV export | Frontend | 2h | Table data | Download function | CSV matches current filters |
| T-7.8.3-01b | PDF export | Frontend + Backend | 4h | Dashboard data, chart images | PDF generation | PDF contains charts + tables |
| T-7.8.3-01c | Scheduled reports | Backend | 3h | PDF generation, email service | Cron job | Weekly PDF emailed to configured recipients |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260629_analytics_views.sql
CREATE MATERIALIZED VIEW analytics_daily AS
SELECT
    date_trunc('day', r.created_at) AS day,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE r.status = 'completed') * 100.0 / NULLIF(COUNT(*), 0) AS success_rate,
    AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at))) AS avg_duration_sec,
    SUM(r.cost_actual) AS total_cost,
    COUNT(DISTINCT r.created_by) AS active_users,
    COUNT(DISTINCT r.workflow_id) AS active_workflows,
    COUNT(DISTINCT r.board_id) FILTER (WHERE r.board_id IS NOT NULL) AS active_boards
FROM runs r
WHERE r.created_at >= NOW() - INTERVAL '365 days'
GROUP BY date_trunc('day', r.created_at);

CREATE UNIQUE INDEX idx_analytics_daily_day ON analytics_daily(day);

CREATE VIEW analytics_workflow_performance AS
SELECT
    w.id AS workflow_id,
    w.name AS workflow_name,
    COUNT(r.id) AS total_runs,
    COUNT(*) FILTER (WHERE r.status = 'completed') * 100.0 / NULLIF(COUNT(*), 0) AS success_rate,
    AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at))) AS avg_duration_sec,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (r.completed_at - r.started_at))) AS p50_duration_sec,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (r.completed_at - r.started_at))) AS p95_duration_sec,
    SUM(r.cost_actual) AS total_cost
FROM workflows w
LEFT JOIN runs r ON r.workflow_id = w.id
GROUP BY w.id, w.name;

-- Refresh materialized view hourly (configured via pg_cron or application-level scheduler)
-- SELECT cron.schedule('refresh_analytics_daily', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily');
```

### Backend Architecture

**New Service: `internal/service/analytics.go`**

Key methods:
- `GetExecutiveSummary(timeRange) (*ExecutiveSummary, error)` — queries analytics_daily for KPI tiles and trends
- `GetWorkflowPerformance(filters) (*WorkflowPerformanceReport, error)` — queries analytics_workflow_performance with optional workflow/project filters
- `GetAgentEffectiveness(filters) (*AgentEffectivenessReport, error)` — queries analytics_agent_effectiveness
- `GetBoardGovernance(filters) (*BoardGovernanceReport, error)` — queries analytics_board_governance
- `ExportPDF(dashboardType, timeRange, filters) ([]byte, error)` — renders dashboard data to PDF using go-pdf library
- `ExportCSV(dataType, filters) ([]byte, error)` — serializes query results to CSV

**PDF Generation:** Use `github.com/jung-kurt/gofpdf` for server-side PDF. Charts rendered as PNG via headless browser (Playwright) capturing the frontend chart components, then embedded in PDF. Alternatively, use chart rendering library in Go for simpler charts.

### API Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| GET | `/v0/analytics/executive` | `?from=2026-06-01&to=2026-06-30&project_id=X` | 200: executive summary JSON |
| GET | `/v0/analytics/workflows` | `?from=...&to=...&workflow_id=X` | 200: workflow performance data |
| GET | `/v0/analytics/agents` | `?from=...&to=...&agent_id=X` | 200: agent effectiveness data |
| GET | `/v0/analytics/boards` | `?from=...&to=...&board_id=X` | 200: board governance data |
| GET | `/v0/analytics/export/csv` | `?type=workflows&from=...&to=...` | 200: CSV file download |
| GET | `/v0/analytics/export/pdf` | `?dashboard=executive&from=...&to=...` | 200: PDF file download |
| POST | `/v0/analytics/scheduled-reports` | `{ email, frequency, dashboards }` | 201: schedule created |

---

## 5. UX/UI Requirements

**Analytics Navigation:**
- New "Analytics" section in main sidebar with sub-pages: Executive, Workflows, Agents, Boards
- Each page has consistent header: page title, time range picker (7d/30d/90d/custom date range), project filter, "Export" dropdown (CSV/PDF)

**Executive Dashboard (`/analytics`):**
- 6 KPI tiles in a responsive row: Total Runs (number + trend arrow + percentage), Success Rate (% + gauge), Active Workflows (count), Active Boards (count), Avg Duration (with unit), Total Cost ($)
- 4 trend charts (2x2 grid): Run Volume (vertical bars), Success Rate (line with threshold), Cost Accumulation (stacked area), Active Users (line)
- Time range selector affects all charts simultaneously
- Click any KPI tile to drill into relevant detail dashboard

**Workflow Performance Dashboard (`/analytics/workflows`):**
- Sortable data table: workflow name, total runs, success rate (bar), avg duration, p95 duration, total cost, last run
- Bar chart: top 10 workflows by run count
- Duration distribution: histogram showing run duration distribution with p50/p95 lines
- Bottleneck panel: collapsible accordion showing slowest/most-failed nodes
- Row click navigates to individual workflow run history

**Agent Effectiveness Dashboard (`/analytics/agents`):**
- Metrics table: agent name, sessions, avg confidence (colored: green > 0.8, yellow > 0.6, red < 0.6), approval rate, replan rate
- Learning curve chart: confidence over time (x: session number, y: avg confidence) — shows whether agent improves
- Decision quality bars: per-agent stacked bar (approved green / rejected red / escalated yellow)

**Board Governance Dashboard (`/analytics/boards`):**
- Board table: name, mode badge, readiness gauge, gate pass rate, days since creation, evidence count
- Readiness timeline: multi-select board comparison, line chart over time
- Gate status stacked bars: per-board breakdown of gate statuses (passed/pending/failed/waived)

**Export:**
- CSV: downloads immediately with current filter applied
- PDF: generates server-side, shows spinner (1-3 seconds), downloads when ready
- PDF layout: header (Airaie logo, date range, filters applied), KPI tiles, charts as images, tables

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | analytics_daily materialized view with test data | Correct aggregations per day |
| Unit | Workflow performance percentiles (p50, p95) | Correct percentile calculation |
| Unit | Agent effectiveness: approval rate calculation | Correct ratio of approved proposals |
| Unit | CSV export with filters | CSV contains only filtered rows |
| Integration | GetExecutiveSummary with 30-day range | All KPI fields populated, trends calculated |
| Integration | Materialized view refresh | New runs reflected after refresh |
| Integration | PDF export generates valid PDF | PDF opens, contains charts and tables |
| E2E | Executive dashboard loads with real data | All KPI tiles and charts render |
| E2E | Drill down from executive to workflow detail | Click navigates to workflow performance page |
| E2E | Export CSV from workflow dashboard | CSV downloads with correct data |
| E2E | Time range change updates all charts | All charts reflect new date range |
| Performance | Dashboard load with 10K runs in database | Page loads < 2 seconds |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Materialized view refresh takes too long with large datasets | Medium | Medium | REFRESH CONCURRENTLY allows reads during refresh; add WHERE clause to limit to last 365 days |
| Dashboard queries slow without proper indexes | Medium | High | Create indexes on (created_at, status, workflow_id, board_id) on runs table; use materialized views for heavy aggregations |
| PDF generation fails for complex dashboards | Low | Medium | Fallback to simpler PDF layout without chart images; render tables as text |
| Scheduled email delivery fails | Low | Low | Retry 3 times; log failures; admin notification on repeated failures |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 6 Production Readiness | Predecessor | Must be complete | Auth, monitoring, stable data layer required |
| Runs table with complete data | Database | Must exist | Analytics queries run against runs, node_runs, agents, boards |
| Prometheus metrics (Sprint 6.2) | Service | Complementary | Analytics dashboards supplement Prometheus/Grafana with business metrics |
| Email service | Infrastructure | Required for scheduled reports | SMTP or transactional email provider configured |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Analytics Views + Service | T-7.8.1-01a through T-7.8.1-01e | Materialized views, analytics service, all query endpoints |
| Day 2 | Executive + Workflow Dashboards | T-7.8.2-01a, T-7.8.2-01b, T-7.8.2-01c, T-7.8.2-02a | KPI tiles, trend charts, top performers, workflow metrics |
| Day 3 | Agent + Board Dashboards + Drill-down | T-7.8.2-02b, T-7.8.2-02c, T-7.8.2-03a, T-7.8.2-03b, T-7.8.2-04a, T-7.8.2-04b | Bottleneck analysis, agent learning curves, board governance |
| Day 4 | Export + QA | T-7.8.3-01a, T-7.8.3-01b, T-7.8.3-01c | CSV export, PDF export, scheduled reports, all tests passing |

---

## 10. Definition of Done

- [ ] Materialized views created and refreshing hourly
- [ ] Executive dashboard shows 6 KPI tiles with trends and 4 time-series charts
- [ ] Workflow performance dashboard shows per-workflow metrics with bottleneck analysis
- [ ] Agent effectiveness dashboard shows learning curves and decision quality
- [ ] Board governance dashboard shows gate pass rates and readiness timelines
- [ ] Drill-down navigation from summary to detail works
- [ ] Time range selector updates all charts on each dashboard
- [ ] CSV export downloads correctly filtered data
- [ ] PDF export generates valid PDF with charts and tables
- [ ] All API endpoints return correct responses
- [ ] All unit, integration, and E2E tests pass
- [ ] Dashboard loads < 2 seconds with 10K runs

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260629_analytics_views.sql` with materialized views
- [ ] Backend: `internal/service/analytics.go` — AnalyticsService
- [ ] Backend: `internal/store/analytics.go` — queries against views
- [ ] Backend: PDF generation utility
- [ ] Backend: CSV export utility
- [ ] Backend: 7 HTTP handlers and routes
- [ ] Frontend: Executive Dashboard page (`/analytics`)
- [ ] Frontend: Workflow Performance page (`/analytics/workflows`)
- [ ] Frontend: Agent Effectiveness page (`/analytics/agents`)
- [ ] Frontend: Board Governance page (`/analytics/boards`)
- [ ] Frontend: Export buttons (CSV + PDF)
- [ ] Frontend: Time range picker component
- [ ] Tests: 4 unit, 3 integration, 4 E2E, 1 performance test

---

## 12. Optional

- **Custom Dashboard Builder:** Allow users to create custom dashboards by dragging and dropping available chart widgets
- **Real-Time Dashboard:** WebSocket-powered live updates for currently running workflows (if Sprint 7.9 is complete)
- **Anomaly Detection:** Automatically flag unusual patterns (spike in failure rate, cost anomaly, agent confidence drop)
- **Team-Level Analytics:** Break down metrics by team/user for capacity planning

---
---

# Sprint 7.9: WebSocket Upgrade from SSE

**Complexity:** M | **Duration:** 4 days | **Depends on:** Phase 5 (Integration & E2E Flows)

---

## 1. Sprint Overview

**Goal:** Upgrade the real-time communication layer from Server-Sent Events (SSE) to WebSocket, enabling bidirectional communication, client-initiated messages (pause/cancel runs, request status), connection multiplexing, and improved reliability with reconnection and heartbeat protocols.

**Business Value:** SSE is unidirectional (server to client only), limiting the platform to push-only updates. WebSocket enables two-way communication — clients can send commands (cancel run, request status, acknowledge events) without separate HTTP requests, reducing latency and server load. WebSocket also supports multiplexing multiple subscriptions over a single connection.

**Scope Summary:**
- WebSocket server endpoint with connection lifecycle management
- Subscription system: clients subscribe to channels (run, board, coordination)
- Bidirectional messages: client can send commands via WebSocket
- Connection management: heartbeat, reconnection, authentication
- SSE fallback for clients that cannot use WebSocket
- Frontend WebSocket client with automatic reconnection

---

## 2. Scope Breakdown

### Epic 7.9.1: WebSocket Server

**US-7.9.1-01:** As a platform engineer, I want a WebSocket server that handles authenticated connections with channel subscriptions.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.9.1-01a | Implement WebSocket upgrade endpoint at `/ws` using gorilla/websocket; authenticate via JWT in query parameter or first message | Connection established; invalid JWT rejected with close code 4001; connection added to connection manager |
| T-7.9.1-01b | Implement ConnectionManager: tracks active connections, maps connections to user IDs, handles graceful shutdown | Connection count tracked; user can have multiple connections; graceful shutdown closes all connections |
| T-7.9.1-01c | Implement subscription system: client sends `{"type":"subscribe","channel":"run:{runId}"}` to receive events for that channel | Client receives events only for subscribed channels; multiple subscriptions per connection supported |
| T-7.9.1-01d | Implement channel types: `run:{id}` (run events), `board:{id}` (board updates), `coordination:{id}` (multi-agent events), `user:{id}` (personal notifications) | Each channel type routes relevant events to subscribers |
| T-7.9.1-01e | Implement heartbeat: server sends ping every 30 seconds; client must respond with pong within 10 seconds or connection is closed | Stale connections cleaned up; active connections maintained; heartbeat configurable |

**US-7.9.1-02:** As a platform engineer, I want WebSocket to consume NATS events and broadcast to relevant subscribers.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.9.1-02a | Implement NATS-to-WebSocket bridge: subscribe to `airaie.events.*`, route events to appropriate WebSocket channels | NATS event for run X delivered to all clients subscribed to `run:X` |
| T-7.9.1-02b | Implement event serialization: all WebSocket messages use JSON with `{ type, channel, payload, timestamp }` envelope | Consistent message format; type is one of: event, command, response, error, heartbeat |

### Epic 7.9.2: Bidirectional Commands

**US-7.9.2-01:** As a frontend developer, I want to send commands via WebSocket instead of separate HTTP requests.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.9.2-01a | Implement command routing: client sends `{"type":"command","action":"cancel_run","payload":{"run_id":"..."}}` | Command routed to appropriate service; response sent back via WebSocket |
| T-7.9.2-01b | Implement supported commands: `cancel_run`, `pause_run`, `resume_run`, `request_status`, `acknowledge_event` | Each command executes the corresponding service method; response includes success/error |
| T-7.9.2-01c | Implement rate limiting per connection: max 60 commands per minute | Excess commands return `{"type":"error","code":"rate_limited","retry_after":N}` |
| T-7.9.2-01d | Implement command authorization: verify user has permission for the requested action | Unauthorized commands return error with `permission_denied` code |

### Epic 7.9.3: Connection Resilience

**US-7.9.3-01:** As a frontend developer, I want the WebSocket connection to handle disconnections gracefully.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.9.3-01a | Implement server-side connection state preservation: on disconnect, hold subscription state for 60 seconds for reconnection | Reconnecting client (same JWT) re-attaches to previous subscriptions; missed events replayed from NATS JetStream |
| T-7.9.3-01b | Implement missed event replay: on reconnection, client sends `{"type":"reconnect","last_event_id":"..."}` and server replays events since that ID | Events delivered in order; no duplicates; gap filled |
| T-7.9.3-01c | Implement connection metrics: track total connections, active subscriptions, messages/second, reconnection rate | Metrics exposed via Prometheus; dashboardable in Grafana |

### Epic 7.9.4: Frontend WebSocket Client

**US-7.9.4-01:** As a frontend developer, I want a React hook that manages WebSocket connections with auto-reconnection.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.9.4-01a | Implement `useWebSocket` React hook: connects, authenticates, manages subscriptions, handles reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s) | Hook returns: `{ connected, subscribe, unsubscribe, send, lastEvent }` |
| T-7.9.4-01b | Implement `useRunEvents(runId)` hook wrapping useWebSocket for run-specific events | Returns: `{ events, latestEvent, status, isConnected }`; auto-subscribes to `run:{runId}` |
| T-7.9.4-01c | Implement `useBoardEvents(boardId)` hook for board-specific events | Returns board event stream; auto-subscribes to `board:{boardId}` |
| T-7.9.4-01d | Replace all existing SSE event sources with WebSocket hooks in: Run Monitor, Board Studio, Agent Playground, Coordination Timeline | All real-time features use WebSocket; SSE code removed or kept as fallback |
| T-7.9.4-01e | Implement SSE fallback: detect WebSocket failure, fall back to existing SSE endpoints | Automatic fallback; user sees no difference; console logs indicate fallback active |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.9.1-01a | WebSocket upgrade endpoint | Backend | 3h | gorilla/websocket | /ws endpoint | JWT auth, connection established |
| T-7.9.1-01b | ConnectionManager | Backend | 3h | WebSocket connections | Manager service | Multi-connection per user, graceful shutdown |
| T-7.9.1-01c | Subscription system | Backend | 3h | Connection, channels | Subscribe/unsubscribe | Events routed per subscription |
| T-7.9.1-01d | Channel types | Backend | 2h | Event types | Channel routing | 4 channel types working |
| T-7.9.1-01e | Heartbeat protocol | Backend | 2h | Connection | Ping/pong | Stale connections cleaned up |
| T-7.9.1-02a | NATS-to-WebSocket bridge | Backend | 3h | NATS consumer | Bridge service | NATS events routed to subscribers |
| T-7.9.1-02b | Message envelope format | Backend | 1h | Message spec | Serialization | Consistent JSON envelope |
| T-7.9.2-01a | Command routing | Backend | 3h | Command spec | Router | Commands dispatched to services |
| T-7.9.2-01b | 5 supported commands | Backend | 3h | Service methods | Command handlers | All 5 commands functional |
| T-7.9.2-01c | Rate limiting | Backend | 2h | Connection state | Rate limiter | 60/min enforced per connection |
| T-7.9.2-01d | Command authorization | Backend | 2h | RBAC service | Auth check | Permission verified per command |
| T-7.9.3-01a | Connection state preservation | Backend | 3h | ConnectionManager | State cache | 60s reconnection window |
| T-7.9.3-01b | Missed event replay | Backend | 3h | NATS JetStream | Replay logic | Events replayed from last_event_id |
| T-7.9.3-01c | Connection metrics | Backend | 2h | ConnectionManager | Prometheus metrics | 4 metrics exposed |
| T-7.9.4-01a | useWebSocket hook | Frontend | 4h | WebSocket API | React hook | Connect, auth, subscribe, reconnect |
| T-7.9.4-01b | useRunEvents hook | Frontend | 2h | useWebSocket | Specialized hook | Run event subscription |
| T-7.9.4-01c | useBoardEvents hook | Frontend | 2h | useWebSocket | Specialized hook | Board event subscription |
| T-7.9.4-01d | Replace SSE with WebSocket | Frontend | 4h | Existing SSE code | Updated components | All real-time features on WebSocket |
| T-7.9.4-01e | SSE fallback | Frontend | 2h | SSE code | Fallback logic | Auto-detect and fall back |

---

## 4. Technical Implementation Plan

### Backend Architecture

**WebSocket Server (internal/ws/server.go):**

```go
type WSServer struct {
    upgrader     websocket.Upgrader
    connections  *ConnectionManager
    subscriptions *SubscriptionManager
    natsBridge   *NATSBridge
    commands     *CommandRouter
}

func (s *WSServer) HandleUpgrade(w http.ResponseWriter, r *http.Request) {
    // 1. Extract JWT from ?token= query param
    // 2. Validate JWT, extract user_id
    // 3. Upgrade to WebSocket
    // 4. Create Connection object
    // 5. Register with ConnectionManager
    // 6. Start read/write goroutines
}
```

**ConnectionManager (internal/ws/connection_manager.go):**
```go
type ConnectionManager struct {
    mu          sync.RWMutex
    connections map[string]*Connection       // connID -> Connection
    userConns   map[string]map[string]bool   // userID -> set of connIDs
    stale       map[string]*StaleState       // connID -> preserved state (60s TTL)
}
```

**Message Envelope:**
```json
{
    "type": "event|command|response|error|heartbeat",
    "id": "evt_abc123",
    "channel": "run:uuid-here",
    "action": "node_completed",
    "payload": { ... },
    "timestamp": "2026-06-30T10:00:00Z"
}
```

**NATS-to-WebSocket Bridge:**
```go
func (b *NATSBridge) Start() {
    // Subscribe to airaie.events.>
    // For each event:
    //   1. Parse event to determine channel (run:X, board:Y, etc.)
    //   2. Find all connections subscribed to that channel
    //   3. Broadcast event to each connection
    //   4. Store event ID in JetStream for replay
}
```

**Command Router:**
```go
var supportedCommands = map[string]CommandHandler{
    "cancel_run":      CancelRunHandler,
    "pause_run":       PauseRunHandler,
    "resume_run":      ResumeRunHandler,
    "request_status":  RequestStatusHandler,
    "acknowledge_event": AcknowledgeHandler,
}
```

### Frontend Architecture

**useWebSocket Hook:**
```typescript
function useWebSocket(options?: { autoReconnect?: boolean; maxRetries?: number }) {
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const subscriptions = useRef(new Map<string, (event: WSEvent) => void>());
    const reconnectAttempt = useRef(0);
    const lastEventId = useRef<string | null>(null);

    const connect = useCallback(() => {
        const token = getAuthToken();
        const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
        ws.onopen = () => { setConnected(true); reconnectAttempt.current = 0; resubscribe(); };
        ws.onclose = () => { setConnected(false); scheduleReconnect(); };
        ws.onmessage = (msg) => { routeMessage(JSON.parse(msg.data)); };
        wsRef.current = ws;
    }, []);

    const subscribe = useCallback((channel: string, handler: (event: WSEvent) => void) => {
        subscriptions.current.set(channel, handler);
        wsRef.current?.send(JSON.stringify({ type: 'subscribe', channel }));
    }, []);

    return { connected, subscribe, unsubscribe, send };
}
```

### API / WebSocket Endpoint

| Type | Endpoint | Description |
|------|----------|-------------|
| WebSocket | `/ws?token=JWT` | Main WebSocket connection |
| SSE (fallback) | `/v0/events/stream?token=JWT&channels=run:X,board:Y` | SSE fallback for WebSocket-incapable clients |

---

## 5. UX/UI Requirements

**Connection Indicator:**
- Small dot in bottom-left corner of every page: green = connected, yellow = reconnecting, red = disconnected
- Tooltip on hover: "Real-time connected" / "Reconnecting (attempt 3/5)" / "Disconnected — using polling"
- Click opens connection details panel: connection type (WebSocket/SSE), subscriptions, messages/sec, latency

**Run Monitor Updates:**
- Node status badges update within 200ms of backend event (vs current 3s SSE poll)
- Log entries stream in real-time (no visible batching)
- "Cancel Run" button sends WebSocket command (no HTTP request visible to user)

**Board Studio Updates:**
- Evidence panel updates immediately when evidence collected
- Gate status changes reflected within 200ms
- Readiness gauge animates smoothly on update

**Agent Playground Updates:**
- Decision trace timeline updates in real-time during agent execution
- Shared memory viewer (multi-agent) updates immediately when any agent writes

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | WebSocket upgrade with valid JWT | Connection established, 101 status |
| Unit | WebSocket upgrade with invalid JWT | Connection rejected, close code 4001 |
| Unit | Subscribe to channel | Events for that channel delivered |
| Unit | Unsubscribe from channel | Events for that channel stop |
| Unit | Heartbeat timeout | Connection closed after 10s without pong |
| Unit | Rate limiting: 61 commands in 1 minute | 61st command returns rate_limited error |
| Integration | NATS event -> WebSocket delivery | Event published to NATS reaches subscribed client |
| Integration | Reconnection with event replay | Client reconnects; missed events replayed in order |
| Integration | cancel_run command via WebSocket | Run cancelled; confirmation sent back via WebSocket |
| Integration | Multiple clients subscribed to same run | All clients receive same events |
| E2E | Workflow run with WebSocket monitoring | Real-time updates visible in Run Monitor |
| E2E | Connection drop simulation (network throttle) | Auto-reconnects; no events lost |
| E2E | SSE fallback when WebSocket blocked | Falls back to SSE; same UI behavior |
| Performance | 100 concurrent WebSocket connections | All connections maintained; events delivered < 50ms latency |
| Performance | 1000 events/second throughput | No dropped events; memory stable |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Corporate firewalls/proxies block WebSocket | Medium | High | SSE fallback ensures functionality; WebSocket over port 443 (wss://) passes most proxies |
| Memory leak from abandoned connections | Medium | High | Heartbeat timeout cleans stale connections; ConnectionManager monitors total count with alert at 10K |
| Event replay from JetStream is slow for large gaps | Low | Medium | Cap replay to last 1000 events; if gap larger, full refresh via HTTP |
| WebSocket upgrade breaks existing SSE consumers | Medium | Medium | Keep SSE endpoints operational; deprecate after WebSocket proven stable for 2 weeks |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 5 Integration (SSE implementation) | Predecessor | Must exist | WebSocket replaces SSE; SSE kept as fallback |
| NATS JetStream | Infrastructure | Exists | Used for event replay on reconnection |
| JWT authentication (Phase 6) | Service | Must be functional | WebSocket auth via JWT |
| gorilla/websocket Go library | External | Available | Standard Go WebSocket library |
| Prometheus metrics (Phase 6) | Service | Should be available | Connection metrics exposed |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | WebSocket Server + Connection Management | T-7.9.1-01a, T-7.9.1-01b, T-7.9.1-01c, T-7.9.1-01d, T-7.9.1-01e | WebSocket endpoint, ConnectionManager, subscriptions, heartbeat |
| Day 2 | NATS Bridge + Bidirectional Commands | T-7.9.1-02a, T-7.9.1-02b, T-7.9.2-01a, T-7.9.2-01b, T-7.9.2-01c, T-7.9.2-01d | NATS-to-WS bridge, 5 commands, rate limiting, authorization |
| Day 3 | Resilience + Frontend Hooks | T-7.9.3-01a, T-7.9.3-01b, T-7.9.3-01c, T-7.9.4-01a, T-7.9.4-01b, T-7.9.4-01c | State preservation, event replay, metrics, React hooks |
| Day 4 | Migration + Fallback + QA | T-7.9.4-01d, T-7.9.4-01e | SSE replaced with WebSocket, fallback implemented, all tests passing |

---

## 10. Definition of Done

- [ ] WebSocket server accepts authenticated connections at `/ws`
- [ ] Channel subscription system routes events to correct clients
- [ ] Heartbeat protocol detects and cleans stale connections within 40 seconds
- [ ] NATS-to-WebSocket bridge delivers events to subscribers within 200ms
- [ ] 5 bidirectional commands functional (cancel, pause, resume, status, acknowledge)
- [ ] Rate limiting enforced at 60 commands/minute per connection
- [ ] Command authorization verifies user permissions
- [ ] Reconnection with missed event replay works within 60-second window
- [ ] Frontend hooks (useWebSocket, useRunEvents, useBoardEvents) function correctly
- [ ] All existing real-time features migrated from SSE to WebSocket
- [ ] SSE fallback activates automatically when WebSocket unavailable
- [ ] Connection metrics exposed in Prometheus
- [ ] All unit, integration, E2E, and performance tests pass

---

## 11. Deliverables Checklist

- [ ] Backend: `internal/ws/server.go` — WebSocket upgrade handler
- [ ] Backend: `internal/ws/connection_manager.go` — ConnectionManager
- [ ] Backend: `internal/ws/subscription_manager.go` — channel subscriptions
- [ ] Backend: `internal/ws/nats_bridge.go` — NATS-to-WebSocket event routing
- [ ] Backend: `internal/ws/command_router.go` — bidirectional command handling
- [ ] Backend: `internal/ws/heartbeat.go` — ping/pong lifecycle
- [ ] Backend: `internal/ws/metrics.go` — Prometheus metrics
- [ ] Frontend: `src/hooks/useWebSocket.ts` — core WebSocket hook
- [ ] Frontend: `src/hooks/useRunEvents.ts` — run-specific hook
- [ ] Frontend: `src/hooks/useBoardEvents.ts` — board-specific hook
- [ ] Frontend: Updated Run Monitor, Board Studio, Agent Playground, Coordination Timeline
- [ ] Frontend: SSE fallback logic
- [ ] Frontend: Connection status indicator component
- [ ] Tests: 6 unit, 4 integration, 3 E2E, 2 performance tests

---

## 12. Optional

- **Binary WebSocket Messages:** Support binary frames for large artifact streaming (reduces serialization overhead)
- **WebSocket Compression:** Enable per-message compression (permessage-deflate) for bandwidth reduction
- **Multi-Tab Deduplication:** Use BroadcastChannel API to share a single WebSocket across browser tabs
- **WebSocket Gateway:** Dedicated WebSocket gateway service for horizontal scaling independent of API servers

---
---

# Sprint 7.10: Audit Log Viewer

**Complexity:** S | **Duration:** 3 days | **Depends on:** Phase 6 (Production Readiness)

---

## 1. Sprint Overview

**Goal:** Build a queryable, filterable, and exportable audit trail that records all significant platform actions with who, what, when, and where context, and provide a UI for searching and reviewing the audit history.

**Business Value:** Engineering platforms in regulated industries (aerospace, automotive, medical devices) require comprehensive audit trails for compliance. The audit log viewer gives quality managers and compliance officers the ability to trace every action — who approved a gate, who modified a board, who published a tool — with full context and export capability.

**Scope Summary:**
- Comprehensive audit event capture for all significant platform actions
- Queryable audit log with full-text search and structured filters
- Audit log viewer UI with timeline, filters, and detail expansion
- Export to CSV and JSON for compliance reporting
- Retention policy configuration

---

## 2. Scope Breakdown

### Epic 7.10.1: Audit Event Capture

**US-7.10.1-01:** As a platform engineer, I want all significant actions to be recorded in an immutable audit log.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.10.1-01a | Create `audit_logs` table: `id`, `timestamp`, `actor_id` (FK users), `actor_email`, `action` (varchar), `resource_type` (varchar), `resource_id` (uuid), `resource_name` (varchar), `details` (JSONB), `ip_address`, `user_agent`, `project_id`, `session_id` | Migration runs; table partitioned by month for performance; immutable (no UPDATE/DELETE allowed via policy) |
| T-7.10.1-01b | Implement `AuditService.Log(event AuditEvent)` — async audit logging that never blocks the main request | Event logged asynchronously via channel buffer (size 10000); dropped events logged to stderr; < 1ms overhead on request |
| T-7.10.1-01c | Define 30+ audit event types organized by category | Categories: auth (login, logout, api_key_created), tools (tool_created, tool_published, tool_executed), workflows (workflow_created, version_published, run_started, run_completed), agents (agent_created, proposal_generated, proposal_approved, proposal_rejected), boards (board_created, mode_changed, gate_approved, gate_rejected, evidence_collected, release_created), admin (user_invited, role_changed, settings_updated) |
| T-7.10.1-01d | Instrument all existing handlers with audit logging middleware | Every mutating API endpoint (POST, PUT, PATCH, DELETE) emits an audit event; read-only endpoints optionally logged for sensitive resources |

### Epic 7.10.2: Audit Query API

**US-7.10.2-01:** As a compliance officer, I want to query the audit log with flexible filters and full-text search.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.10.2-01a | Implement `AuditService.Query(filters AuditFilters)` — supports filtering by: actor_id, action, resource_type, resource_id, date range, project_id, free text search on details JSONB | Queries return results within 200ms for 1M+ records; pagination via cursor (not offset) for consistency |
| T-7.10.2-01b | Implement `GET /v0/audit-logs` endpoint with query parameters | Supports: `?actor_id=X&action=gate_approved&resource_type=board&from=...&to=...&q=search_text&cursor=X&limit=50` |
| T-7.10.2-01c | Implement `GET /v0/audit-logs/{id}` for single event detail | Returns full event including JSONB details expanded |
| T-7.10.2-01d | Implement `GET /v0/audit-logs/export` for CSV/JSON export | `?format=csv&...filters...` returns downloadable file; limited to 10K rows per export |

### Epic 7.10.3: Retention and Compliance

**US-7.10.3-01:** As an admin, I want to configure audit log retention policies.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.10.3-01a | Implement retention policy: configurable retention period (default 2 years) with automated archival of older records to cold storage (S3/MinIO) | Records older than retention period archived as gzipped JSON to MinIO; archived records queryable via separate endpoint |
| T-7.10.3-01b | Add `GET /v0/audit-logs/stats` endpoint: total events, events per day average, storage size, oldest event | Quick overview for admin dashboard |

### Epic 7.10.4: Audit Log Viewer UI

**US-7.10.4-01:** As a compliance officer, I want a UI to browse, search, and filter the audit log.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.10.4-01a | Build Audit Log page (`/admin/audit-log`) with timeline view: each event as a card with actor avatar, action badge, resource link, timestamp | Timeline loads with most recent events; infinite scroll loads more; events colored by category |
| T-7.10.4-01b | Build filter bar: date range picker, actor selector (search users), action type multi-select, resource type dropdown, free text search | Filters are combinable; URL state synced for shareability; clear all button |
| T-7.10.4-01c | Build event detail expansion: click event to expand inline showing full JSONB details, related events (same resource), diff for changes | Details section shows before/after for updates; related events linked |
| T-7.10.4-01d | Build export buttons: "Export CSV" and "Export JSON" with current filters applied | Downloads file matching current filter; shows progress for large exports |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.10.1-01a | Create audit_logs table with partitioning | Backend | 2h | DB schema | Migration | Monthly partitions, immutability policy |
| T-7.10.1-01b | Async AuditService.Log | Backend | 3h | Channel buffer | Service method | < 1ms overhead, buffered writes |
| T-7.10.1-01c | Define 30+ event types | Backend | 2h | Platform actions | Event type enum | All categories covered |
| T-7.10.1-01d | Instrument handlers with audit middleware | Backend | 4h | All mutating endpoints | Middleware | All POST/PUT/PATCH/DELETE endpoints log events |
| T-7.10.2-01a | Query with filters | Backend | 3h | Audit table | Query service | < 200ms with 1M records |
| T-7.10.2-01b | GET /v0/audit-logs endpoint | Backend | 2h | Query service | HTTP handler | All filter params supported |
| T-7.10.2-01c | GET /v0/audit-logs/{id} detail | Backend | 1h | Audit store | HTTP handler | Full event with details |
| T-7.10.2-01d | Export endpoint | Backend | 2h | Query service | CSV/JSON export | Downloadable, 10K limit |
| T-7.10.3-01a | Retention policy + archival | Backend | 3h | MinIO, scheduler | Cron job | Old records archived to MinIO |
| T-7.10.3-01b | Stats endpoint | Backend | 1h | Audit store | HTTP handler | Summary stats returned |
| T-7.10.4-01a | Audit log timeline page | Frontend | 4h | Audit API | React page | Timeline with infinite scroll |
| T-7.10.4-01b | Filter bar | Frontend | 3h | Filter params | Filter components | Combinable, URL synced |
| T-7.10.4-01c | Event detail expansion | Frontend | 3h | Detail API | Expandable card | Before/after diff, related events |
| T-7.10.4-01d | Export buttons | Frontend | 1h | Export API | Download buttons | CSV/JSON with current filters |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260630_audit_logs.sql
CREATE TABLE audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID REFERENCES users(id),
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    resource_name VARCHAR(255),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    project_id UUID,
    session_id UUID
) PARTITION BY RANGE (timestamp);

-- Create partitions for next 24 months
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
-- ... (generated programmatically for 24 months)

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, timestamp DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp DESC);
CREATE INDEX idx_audit_logs_project ON audit_logs(project_id, timestamp DESC);
CREATE INDEX idx_audit_logs_details ON audit_logs USING GIN (details);

-- Prevent updates and deletes (immutability)
CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

### Backend Architecture

**Audit Service (internal/service/audit.go):**
```go
type AuditService struct {
    store    AuditStore
    buffer   chan AuditEvent
    wg       sync.WaitGroup
}

func NewAuditService(store AuditStore) *AuditService {
    s := &AuditService{
        store:  store,
        buffer: make(chan AuditEvent, 10000),
    }
    s.wg.Add(1)
    go s.processLoop()
    return s
}

func (s *AuditService) Log(event AuditEvent) {
    select {
    case s.buffer <- event:
        // Buffered successfully
    default:
        log.Error("audit buffer full, event dropped", "action", event.Action)
    }
}

func (s *AuditService) processLoop() {
    defer s.wg.Done()
    batch := make([]AuditEvent, 0, 100)
    ticker := time.NewTicker(500 * time.Millisecond)
    for {
        select {
        case event := <-s.buffer:
            batch = append(batch, event)
            if len(batch) >= 100 {
                s.store.InsertBatch(batch)
                batch = batch[:0]
            }
        case <-ticker.C:
            if len(batch) > 0 {
                s.store.InsertBatch(batch)
                batch = batch[:0]
            }
        }
    }
}
```

**Audit Middleware (internal/middleware/audit.go):**
```go
func AuditMiddleware(auditSvc *AuditService) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Capture request context
            actor := auth.UserFromContext(r.Context())
            // Call next handler
            rw := &responseWriter{ResponseWriter: w}
            next.ServeHTTP(rw, r)
            // Log audit event (async)
            if r.Method != http.MethodGet {
                auditSvc.Log(AuditEvent{
                    ActorID:      actor.ID,
                    ActorEmail:   actor.Email,
                    Action:       deriveAction(r),
                    ResourceType: deriveResourceType(r),
                    ResourceID:   deriveResourceID(r),
                    Details:      captureDetails(r, rw),
                    IPAddress:    r.RemoteAddr,
                    UserAgent:    r.UserAgent(),
                })
            }
        })
    }
}
```

### 30+ Event Types

| Category | Actions |
|----------|---------|
| Auth | `user.login`, `user.logout`, `user.api_key_created`, `user.api_key_revoked` |
| Tools | `tool.created`, `tool.updated`, `tool.version_created`, `tool.version_published`, `tool.executed`, `tool.deleted` |
| Workflows | `workflow.created`, `workflow.updated`, `workflow.version_published`, `workflow.run_started`, `workflow.run_completed`, `workflow.run_cancelled`, `workflow.deleted` |
| Agents | `agent.created`, `agent.updated`, `agent.proposal_generated`, `agent.proposal_approved`, `agent.proposal_rejected`, `agent.proposal_escalated`, `agent.deleted` |
| Boards | `board.created`, `board.updated`, `board.mode_changed`, `board.card_created`, `board.gate_approved`, `board.gate_rejected`, `board.gate_waived`, `board.evidence_collected`, `board.release_created`, `board.deleted` |
| Admin | `user.invited`, `user.role_changed`, `project.created`, `project.settings_updated` |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v0/audit-logs` | Query with filters, cursor pagination |
| GET | `/v0/audit-logs/{id}` | Single event detail |
| GET | `/v0/audit-logs/export` | CSV/JSON export |
| GET | `/v0/audit-logs/stats` | Summary statistics |

---

## 5. UX/UI Requirements

**Audit Log Page (`/admin/audit-log`):**
- Full-width page, no sidebar (maximize content area)
- Filter bar at top: date range picker, actor search (typeahead), action dropdown (grouped by category), resource type dropdown, free text search
- Timeline view: chronological list, most recent first
- Each event card: actor avatar + email, action badge (color-coded by category: blue=auth, green=tools, purple=workflows, orange=agents, teal=boards, gray=admin), resource name (clickable link to resource), relative timestamp ("2 hours ago") with absolute on hover
- Click to expand: shows full JSONB details in formatted key-value layout, before/after diff for updates (side-by-side), "Related Events" collapsible showing other events for same resource
- Infinite scroll with "Loading more..." spinner
- URL state: all filters encoded in URL query params for bookmarking/sharing

**Export:**
- "Export" dropdown button (top right): "CSV" and "JSON" options
- Exports respect current filters
- Shows count of events to export before confirming
- Progress indicator for exports > 5K events

**Empty/Error States:**
- No results: "No audit events match your filters. Try adjusting the date range or removing filters."
- Loading: skeleton cards (3 pulsing placeholders)
- Error: "Failed to load audit log. [Retry]"

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | AuditService.Log does not block caller | Returns in < 1ms regardless of store latency |
| Unit | Buffer overflow drops events gracefully | Dropped event logged to stderr; no panic |
| Unit | Batch insert of 100 events | All 100 persisted in single INSERT |
| Unit | Immutability: UPDATE on audit_logs | No rows affected (rule prevents update) |
| Unit | Immutability: DELETE on audit_logs | No rows affected (rule prevents delete) |
| Integration | API request triggers audit event | Event visible in audit_logs table |
| Integration | Query with actor filter | Only events by that actor returned |
| Integration | Query with date range | Only events in range returned |
| Integration | Query with free text search on details | Matching events returned via GIN index |
| Integration | CSV export with filters | CSV contains correct filtered rows |
| E2E | Browse audit log, expand event | Event detail shows with formatted JSONB |
| E2E | Apply filters, see filtered results | URL updates; results match filters |
| E2E | Export CSV from UI | File downloads with correct data |
| Performance | Query with 1M records, filter by action + date | Response < 200ms |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Audit table grows very large (millions of rows/month) | High | Medium | Monthly partitioning allows dropping old partitions; archival to MinIO; GIN index on details for fast search |
| Audit logging overhead slows API requests | Low | High | Async buffered logging with < 1ms overhead; 10K buffer prevents backpressure |
| Sensitive data in audit details JSONB | Medium | High | Sanitize details before logging: redact passwords, API keys, PII per data classification policy |
| Partition creation missed for future months | Medium | Medium | Automated partition creation job runs monthly, creating 3 months ahead |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 6 Production Readiness | Predecessor | Must be complete | Auth (for actor_id), stable API layer |
| JWT Authentication | Service | Must be functional | Audit events capture authenticated user |
| MinIO | Infrastructure | Exists | Used for archival storage |
| All existing API handlers | Integration | Must be accessible | Middleware wraps all handlers |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Database + Audit Service | T-7.10.1-01a, T-7.10.1-01b, T-7.10.1-01c, T-7.10.1-01d | Partitioned table, async service, event types, middleware applied |
| Day 2 | Query API + Export + Retention | T-7.10.2-01a, T-7.10.2-01b, T-7.10.2-01c, T-7.10.2-01d, T-7.10.3-01a, T-7.10.3-01b | Query endpoint, export, archival, stats |
| Day 3 | Frontend + QA | T-7.10.4-01a, T-7.10.4-01b, T-7.10.4-01c, T-7.10.4-01d | Audit log page, filters, detail expansion, export buttons, all tests passing |

---

## 10. Definition of Done

- [ ] Audit log table created with monthly partitioning and immutability rules
- [ ] Async audit logging adds < 1ms overhead to API requests
- [ ] 30+ event types cover all significant platform actions
- [ ] All mutating API endpoints emit audit events via middleware
- [ ] Query API supports filtering by actor, action, resource, date range, and free text
- [ ] Cursor-based pagination handles 1M+ records efficiently
- [ ] CSV and JSON export functional with filter support
- [ ] Retention policy archives records older than configured period
- [ ] Audit log viewer displays timeline with filters and expandable details
- [ ] All unit, integration, E2E, and performance tests pass

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260630_audit_logs.sql` with partitioning and immutability
- [ ] Backend: `internal/service/audit.go` — async AuditService
- [ ] Backend: `internal/middleware/audit.go` — AuditMiddleware
- [ ] Backend: `internal/store/audit.go` — AuditStore with query + batch insert
- [ ] Backend: 4 HTTP handlers and routes
- [ ] Backend: Retention archival job
- [ ] Frontend: Audit Log page (`/admin/audit-log`)
- [ ] Frontend: Filter bar component
- [ ] Frontend: Event detail expansion component
- [ ] Frontend: Export functionality
- [ ] Tests: 5 unit, 4 integration, 3 E2E, 1 performance test

---

## 12. Optional

- **Audit Log Alerts:** Configure alerts for specific event patterns (e.g., "notify when gate is waived", "alert on 5+ failed logins")
- **Audit Diff Viewer:** Visual side-by-side diff for update events showing exactly what changed
- **Compliance Report Generator:** Auto-generate compliance reports (ISO 9001, AS9100) from audit trail data
- **Audit Log API for External SIEM:** Webhook or API for streaming audit events to external security information and event management systems

---
---

# Sprint 7.11: Cost Tracking Dashboard

**Complexity:** M | **Duration:** 4 days | **Depends on:** Phase 1 (Tool Execution Golden Path)

---

## 1. Sprint Overview

**Goal:** Build a comprehensive cost tracking system with per-tool, per-workflow, per-project, and per-board cost roll-ups, budget management with configurable alerts, and a dashboard for monitoring spending against budgets.

**Business Value:** Engineering simulation and analysis workflows consume compute resources that have real costs. Without visibility and controls, teams can inadvertently overspend. The cost tracking dashboard provides real-time cost visibility at every granularity level, enables budget guardrails, and sends alerts before budgets are exhausted.

**Scope Summary:**
- Cost data model with per-run, per-tool, per-workflow, per-project, and per-board aggregation
- Budget configuration at project and board levels with alert thresholds
- Real-time cost tracking updated on run completion
- Cost dashboard with drill-down from project to board to workflow to individual runs
- Budget alerts via notification system (in-app, email)
- Cost forecasting based on historical usage patterns

---

## 2. Scope Breakdown

### Epic 7.11.1: Cost Data Model and Aggregation

**US-7.11.1-01:** As a platform engineer, I want cost data aggregated at multiple levels for reporting and budgeting.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.11.1-01a | Create `cost_records` table: `id`, `run_id` (FK), `tool_id` (FK), `workflow_id` (FK), `board_id` (FK nullable), `project_id` (FK), `cost_estimated` (decimal), `cost_actual` (decimal), `cost_breakdown` (JSONB: {compute, storage, llm, total}), `duration_sec`, `cpu_cores`, `memory_gb`, `created_at` | Migration runs; FK constraints valid; decimal(12,4) for cost precision |
| T-7.11.1-01b | Create `cost_budgets` table: `id`, `scope_type` (project/board/team), `scope_id` (UUID), `budget_amount` (decimal), `period` (monthly/quarterly/annual/total), `alert_threshold_pct` (int, e.g., 80), `critical_threshold_pct` (int, e.g., 95), `auto_pause` (bool — pause runs when budget exceeded), `created_at`, `updated_at` | Budget configurable per scope and period |
| T-7.11.1-01c | Create `cost_alerts` table: `id`, `budget_id` (FK), `alert_type` (warning/critical/exceeded), `current_spend`, `budget_amount`, `percentage`, `acknowledged` (bool), `created_at` | Alert records immutable; one per threshold crossing |
| T-7.11.1-01d | Implement `CostService.RecordCost(runID)` — called on run completion, calculates actual cost from run metrics and creates cost_record | Cost = (cpu_cores * duration_sec * cpu_rate) + (memory_gb * duration_sec * mem_rate) + (storage_bytes * storage_rate) + (llm_tokens * token_rate); rates configurable in platform settings |
| T-7.11.1-01e | Implement `CostService.GetAggregatedCosts(scope, scopeID, period)` — returns cost roll-ups at any level | Returns: total, by_tool, by_workflow, by_day; supports filtering by date range |

### Epic 7.11.2: Budget Management

**US-7.11.2-01:** As a project manager, I want to set budgets and receive alerts when spending approaches limits.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.11.2-01a | Implement budget CRUD: `POST/GET/PUT/DELETE /v0/cost/budgets` | Create budget for project or board; period validated; thresholds validated (alert < critical < 100) |
| T-7.11.2-01b | Implement `CostService.CheckBudget(scopeType, scopeID)` — called after each cost record, checks if any threshold crossed | If spend > alert_threshold: creates warning alert + notification. If spend > critical_threshold: creates critical alert. If spend > 100% and auto_pause: pauses queued runs |
| T-7.11.2-01c | Implement auto-pause: when budget exceeded and auto_pause=true, prevent new runs from starting | New run creation returns HTTP 402 with `budget_exceeded` error and remaining budget info |
| T-7.11.2-01d | Implement budget notifications: in-app toast + email to project owners when thresholds crossed | Notification created in notification system; email sent via email service |

### Epic 7.11.3: Cost Dashboard

**US-7.11.3-01:** As a project manager, I want a dashboard showing cost breakdown, trends, and budget status.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.11.3-01a | Build Cost Overview page (`/analytics/costs`) with KPI tiles: Total Spend (period), Budget Used (gauge), Remaining Budget, Daily Burn Rate, Projected Overage/Underage | 5 KPI tiles with period selector (this month/quarter/year) |
| T-7.11.3-01b | Build cost breakdown charts: by tool (pie), by workflow (horizontal bar), by day (area chart), by cost category (stacked bar: compute/storage/LLM) | 4 charts in 2x2 grid; interactive with hover tooltips |
| T-7.11.3-01c | Build budget status panel: per-budget progress bars with color coding (green < alert, yellow < critical, red > critical) | Progress bars with amount and percentage; "Edit Budget" link |
| T-7.11.3-01d | Build cost drill-down table: sortable by project/board/workflow/tool with cost, run count, avg cost per run | Click row to drill into detail; breadcrumb trail: Project > Board > Workflow > Runs |
| T-7.11.3-01e | Build cost forecast: trend extrapolation showing projected end-of-period spend based on daily burn rate | Line chart with actual (solid) and projected (dashed) lines; budget threshold horizontal line |

### Epic 7.11.4: Cost Reporting

**US-7.11.4-01:** As a finance team member, I want to export cost reports for accounting.

| Task ID | Task | Acceptance Criteria |
|---------|------|-------------------|
| T-7.11.4-01a | Implement `GET /v0/cost/reports` — generate cost report for period with grouping (by project, by tool, by user) | Returns structured report JSON; CSV export option |
| T-7.11.4-01b | Build cost report configuration in UI: select period, grouping, export format | Form: date range, group by (project/tool/user/workflow), format (CSV/PDF); generates and downloads |

---

## 3. Detailed Task Planning

| Task ID | Description | Owner | Effort | Inputs | Output | DoD |
|---------|-------------|-------|--------|--------|--------|-----|
| T-7.11.1-01a | Create cost_records table | Backend | 1h | DB schema | Migration | Table with all columns, indexed |
| T-7.11.1-01b | Create cost_budgets table | Backend | 1h | DB schema | Migration | Budget table with constraints |
| T-7.11.1-01c | Create cost_alerts table | Backend | 1h | DB schema | Migration | Alert records, immutable |
| T-7.11.1-01d | RecordCost service method | Backend | 3h | Run metrics, rates | Cost record | Correct cost calculation per component |
| T-7.11.1-01e | GetAggregatedCosts | Backend | 3h | Cost records | Aggregation queries | Multi-level roll-ups correct |
| T-7.11.2-01a | Budget CRUD endpoints | Backend | 2h | Budget model | 4 HTTP handlers | Full CRUD with validation |
| T-7.11.2-01b | CheckBudget threshold logic | Backend | 3h | Cost records, budgets | Alert creation | Thresholds detected, alerts created |
| T-7.11.2-01c | Auto-pause on budget exceeded | Backend | 2h | Budget check | Run prevention | 402 returned when budget exceeded |
| T-7.11.2-01d | Budget notifications | Backend | 2h | Alert events | Notifications + email | In-app and email notifications sent |
| T-7.11.3-01a | Cost overview KPI tiles | Frontend | 3h | Cost API | KPI components | 5 tiles with period selector |
| T-7.11.3-01b | Cost breakdown charts | Frontend | 4h | Cost API | Recharts components | 4 charts interactive |
| T-7.11.3-01c | Budget status panel | Frontend | 2h | Budget API | Progress bars | Color-coded budget progress |
| T-7.11.3-01d | Cost drill-down table | Frontend | 3h | Cost API | Sortable table | Multi-level drill-down |
| T-7.11.3-01e | Cost forecast chart | Frontend | 3h | Cost API | Line chart | Actual vs projected with threshold |
| T-7.11.4-01a | Cost report endpoint | Backend | 2h | Cost records | Report API | Structured report with grouping |
| T-7.11.4-01b | Report configuration UI | Frontend | 2h | Report API | Form component | Period, grouping, export |

---

## 4. Technical Implementation Plan

### Database Changes

```sql
-- Migration: 20260701_cost_tracking.sql
CREATE TABLE cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id),
    tool_id UUID REFERENCES tools(id),
    workflow_id UUID REFERENCES workflows(id),
    board_id UUID REFERENCES boards(id),
    project_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    cost_estimated DECIMAL(12,4) NOT NULL DEFAULT 0,
    cost_actual DECIMAL(12,4) NOT NULL DEFAULT 0,
    cost_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration_sec FLOAT NOT NULL DEFAULT 0,
    cpu_cores FLOAT NOT NULL DEFAULT 0,
    memory_gb FLOAT NOT NULL DEFAULT 0,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    llm_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_records_project ON cost_records(project_id, created_at DESC);
CREATE INDEX idx_cost_records_board ON cost_records(board_id, created_at DESC);
CREATE INDEX idx_cost_records_workflow ON cost_records(workflow_id, created_at DESC);
CREATE INDEX idx_cost_records_tool ON cost_records(tool_id, created_at DESC);
CREATE INDEX idx_cost_records_user ON cost_records(user_id, created_at DESC);

CREATE TABLE cost_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('project', 'board', 'team')),
    scope_id UUID NOT NULL,
    budget_amount DECIMAL(12,2) NOT NULL CHECK (budget_amount > 0),
    period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'annual', 'total')),
    alert_threshold_pct INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold_pct > 0 AND alert_threshold_pct < 100),
    critical_threshold_pct INTEGER NOT NULL DEFAULT 95 CHECK (critical_threshold_pct > 0 AND critical_threshold_pct <= 100),
    auto_pause BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(scope_type, scope_id, period)
);

CREATE TABLE cost_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES cost_budgets(id),
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('warning', 'critical', 'exceeded')),
    current_spend DECIMAL(12,4) NOT NULL,
    budget_amount DECIMAL(12,2) NOT NULL,
    percentage FLOAT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Backend Architecture

**Cost Service (internal/service/cost.go):**

```go
// Cost rates (configurable via platform settings)
type CostRates struct {
    CPUPerCoreSec    float64 // e.g., $0.00005 per core-second
    MemoryPerGBSec   float64 // e.g., $0.000006 per GB-second
    StoragePerGB     float64 // e.g., $0.023 per GB per month
    LLMPerToken      float64 // e.g., $0.00003 per token (Claude)
}

func (s *CostService) RecordCost(runID uuid.UUID) error {
    run := s.runStore.Get(runID)
    rates := s.getRates()

    computeCost := run.CPUCores * run.DurationSec * rates.CPUPerCoreSec
    memoryCost := run.MemoryGB * run.DurationSec * rates.MemoryPerGBSec
    storageCost := float64(run.StorageBytes) / 1e9 * rates.StoragePerGB / (30*24*3600) * run.DurationSec
    llmCost := float64(run.LLMTokens) * rates.LLMPerToken

    record := CostRecord{
        RunID:      runID,
        ToolID:     run.ToolID,
        WorkflowID: run.WorkflowID,
        BoardID:    run.BoardID,
        ProjectID:  run.ProjectID,
        CostActual: computeCost + memoryCost + storageCost + llmCost,
        CostBreakdown: map[string]float64{
            "compute": computeCost,
            "memory":  memoryCost,
            "storage": storageCost,
            "llm":     llmCost,
        },
        // ... other fields from run
    }

    s.store.Insert(record)
    return s.CheckBudget(run.ProjectID, "project")
}
```

**Budget Check Algorithm:**
1. Load applicable budget for scope (project/board)
2. Calculate current period spend: `SUM(cost_actual) WHERE scope AND period_start <= created_at <= NOW()`
3. Calculate percentage: `spend / budget_amount * 100`
4. If percentage > alert_threshold_pct and no existing warning alert this period: create warning alert, send notification
5. If percentage > critical_threshold_pct and no existing critical alert this period: create critical alert, send urgent notification
6. If percentage > 100 and auto_pause: mark scope as budget_exceeded; RunService checks this before dispatching

**Cost Forecasting:**
```go
func (s *CostService) Forecast(projectID uuid.UUID, period string) (*CostForecast, error) {
    // Calculate daily burn rate from last 14 days
    dailyCosts := s.store.GetDailyCosts(projectID, 14)
    avgDailyBurn := sum(dailyCosts) / 14
    // Calculate remaining days in period
    remaining := daysRemainingInPeriod(period)
    // Project end-of-period spend
    currentSpend := s.store.GetPeriodSpend(projectID, period)
    projected := currentSpend + (avgDailyBurn * remaining)
    return &CostForecast{
        CurrentSpend: currentSpend,
        DailyBurnRate: avgDailyBurn,
        ProjectedTotal: projected,
        RemainingDays: remaining,
    }, nil
}
```

### API Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| GET | `/v0/cost/summary` | `?scope=project&scope_id=X&period=monthly` | 200: cost summary with breakdown |
| GET | `/v0/cost/by-tool` | `?project_id=X&from=...&to=...` | 200: cost per tool |
| GET | `/v0/cost/by-workflow` | `?project_id=X&from=...&to=...` | 200: cost per workflow |
| GET | `/v0/cost/by-day` | `?project_id=X&from=...&to=...` | 200: daily cost series |
| GET | `/v0/cost/forecast` | `?project_id=X&period=monthly` | 200: forecast data |
| POST | `/v0/cost/budgets` | `{ scope_type, scope_id, budget_amount, period, ... }` | 201: budget created |
| GET | `/v0/cost/budgets` | `?scope_type=project&scope_id=X` | 200: budget list |
| PUT | `/v0/cost/budgets/{id}` | Updated fields | 200: budget updated |
| DELETE | `/v0/cost/budgets/{id}` | — | 204: deleted |
| GET | `/v0/cost/alerts` | `?budget_id=X&acknowledged=false` | 200: alert list |
| PATCH | `/v0/cost/alerts/{id}/acknowledge` | — | 200: alert acknowledged |
| GET | `/v0/cost/reports` | `?period=monthly&group_by=tool&format=json` | 200: report data |

---

## 5. UX/UI Requirements

**Cost Dashboard (`/analytics/costs`):**
- Period selector at top: "This Month", "This Quarter", "This Year", custom date range
- 5 KPI tiles: Total Spend ($X,XXX.XX), Budget Used (60% gauge), Remaining Budget ($X,XXX), Daily Burn Rate ($XX/day), Forecast (projected end-of-period total with over/under indicator)
- 4 charts in 2x2 grid:
  - **By Tool** (pie chart): top 5 tools by cost with "Other" slice
  - **By Workflow** (horizontal bar): top 10 workflows
  - **Daily Trend** (area chart): stacked by cost category (compute blue, storage green, LLM purple)
  - **By Category** (stacked bar): compute vs storage vs LLM breakdown per week

**Budget Status Panel:**
- Below charts; one row per active budget
- Each budget: scope name, progress bar (green/yellow/red), amount spent / budget amount, percentage, period, auto-pause badge (if enabled)
- "Edit" and "Delete" actions per budget
- "Add Budget" button opens creation dialog

**Cost Drill-Down Table:**
- Below budget panel
- Columns: Name, Type (project/board/workflow/tool), Runs, Total Cost, Avg Cost/Run, % of Total
- Sortable by any column
- Click to drill into: Project -> Boards in project -> Workflows in board -> Runs in workflow
- Breadcrumb: "All Projects > Project Alpha > Wing Board > FEA Workflow"

**Forecast Chart:**
- Separate section below drill-down table
- Line chart: X-axis = day of period, Y-axis = cumulative spend
- Solid line: actual spend to date
- Dashed line: projected spend based on burn rate
- Horizontal line: budget amount (red if projected to exceed)
- Shaded area between actual and projected shows uncertainty

**Budget Alerts:**
- In-app notification toast when threshold crossed
- Alert banner at top of cost dashboard: "WARNING: Project Alpha has used 82% of monthly budget ($820 / $1,000)"
- Alert bell badge in main navigation shows unacknowledged alert count

---

## 6. QA & Testing Plan

| Test Type | Test Case | Expected Result |
|-----------|-----------|----------------|
| Unit | RecordCost with known metrics | Cost calculated correctly per component |
| Unit | CheckBudget at 79% (below alert) | No alert created |
| Unit | CheckBudget at 81% (above alert threshold 80%) | Warning alert created |
| Unit | CheckBudget at 96% (above critical threshold 95%) | Critical alert created |
| Unit | CheckBudget at 101% with auto_pause | Budget exceeded; runs paused |
| Unit | Forecast with 14 days of data | Projected total matches burn_rate * remaining_days + current |
| Integration | Run completes -> cost recorded -> budget checked | Full pipeline: cost record created, budget checked, alert if threshold crossed |
| Integration | Auto-pause: try to start run with exceeded budget | Run creation returns 402 with budget_exceeded |
| Integration | Aggregated costs by tool for project | Correct totals per tool |
| E2E | Cost dashboard loads with real data | All KPI tiles, charts, and tables render correctly |
| E2E | Create budget from UI | Budget appears in status panel |
| E2E | Budget alert appears in notification | Toast shown; alert bell updated |
| E2E | Drill down from project to workflow runs | Navigation works; breadcrumb correct |
| Performance | Aggregation query with 100K cost records | Response < 500ms |

---

## 7. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Cost rates change frequently | Medium | Low | Rates stored in platform settings table, not hardcoded; rate changes apply to future runs only |
| Auto-pause disrupts active work | Medium | High | Auto-pause only prevents NEW runs; running workflows continue to completion; clear messaging explains why runs blocked |
| LLM token counting is imprecise | Medium | Low | Use provider-reported token counts where available; fallback to tiktoken estimate; document that LLM costs are approximate |
| Cost aggregation queries slow with large datasets | Medium | Medium | Pre-compute daily aggregates in materialized view (similar to Sprint 7.8); refresh hourly |

---

## 8. Dependencies

| Dependency | Type | Status | Notes |
|-----------|------|--------|-------|
| Phase 1 Tool Execution (cost_actual on runs) | Predecessor | Must be complete | Run records must have CPU, memory, duration metrics |
| Runs table with completion metrics | Database | Must exist | cost_records references runs |
| Notification system (Sprint 5.2) | Service | Should be available | Budget alerts sent via notifications; can log to console if not available |
| Email service | Infrastructure | Optional | Email alerts require SMTP config |
| Platform settings store | Service | Should exist | Cost rates stored in settings |

---

## 9. Sprint Execution Plan

| Day | Focus | Tasks | Deliverables |
|-----|-------|-------|-------------|
| Day 1 | Database + Cost Service | T-7.11.1-01a, T-7.11.1-01b, T-7.11.1-01c, T-7.11.1-01d, T-7.11.1-01e | Migrations, RecordCost, GetAggregatedCosts |
| Day 2 | Budget Management | T-7.11.2-01a, T-7.11.2-01b, T-7.11.2-01c, T-7.11.2-01d | Budget CRUD, threshold checking, auto-pause, notifications |
| Day 3 | Cost Dashboard | T-7.11.3-01a, T-7.11.3-01b, T-7.11.3-01c, T-7.11.3-01d, T-7.11.3-01e | KPI tiles, charts, budget panel, drill-down table, forecast |
| Day 4 | Reports + QA | T-7.11.4-01a, T-7.11.4-01b | Report endpoint, report UI, all tests passing |

---

## 10. Definition of Done

- [ ] Cost recorded on every run completion with per-component breakdown (compute, storage, LLM)
- [ ] Cost aggregation works at tool, workflow, board, and project levels
- [ ] Budgets configurable at project and board scopes with alert and critical thresholds
- [ ] Budget alerts created when thresholds crossed; notifications sent
- [ ] Auto-pause prevents new runs when budget exceeded (402 response)
- [ ] Cost dashboard shows KPI tiles, 4 breakdown charts, budget status panel
- [ ] Drill-down table navigates from project to individual runs
- [ ] Cost forecast projects end-of-period spend based on burn rate
- [ ] Cost reports exportable as CSV with configurable grouping
- [ ] All 12 API endpoints return correct responses
- [ ] All unit, integration, E2E, and performance tests pass

---

## 11. Deliverables Checklist

- [ ] SQL migration: `20260701_cost_tracking.sql`
- [ ] Backend: `internal/service/cost.go` — CostService with recording, aggregation, budgets, forecasting
- [ ] Backend: `internal/store/cost.go` — CostStore with queries
- [ ] Backend: `internal/model/cost.go` — CostRecord, CostBudget, CostAlert, CostForecast models
- [ ] Backend: 12 HTTP handlers and routes
- [ ] Backend: Budget notification integration
- [ ] Frontend: Cost Dashboard page (`/analytics/costs`)
- [ ] Frontend: KPI tiles, 4 chart components, budget status panel
- [ ] Frontend: Cost drill-down table with breadcrumb navigation
- [ ] Frontend: Forecast chart component
- [ ] Frontend: Budget management dialog
- [ ] Frontend: Report configuration form
- [ ] Tests: 6 unit, 3 integration, 4 E2E, 1 performance test

---

## 12. Optional

- **Cost Allocation Tags:** Tag runs with custom labels (team, department, cost center) for chargeback reporting
- **Cost Anomaly Detection:** Alert when a single run costs 3x the average for that tool/workflow
- **Cost Optimization Recommendations:** Suggest cheaper tool alternatives or off-peak scheduling to reduce costs
- **Historical Rate Tracking:** Maintain history of rate changes for accurate retrospective cost analysis

---
---

## Appendix: Phase 7 Summary Matrix

| Sprint | Feature | Days | Complexity | DB Tables | API Endpoints | Frontend Pages | Dependencies |
|--------|---------|------|-----------|-----------|---------------|---------------|-------------|
| 7.1 | Board Composition | 4 | M | +2 cols, +1 col on gates | 5 | 1 tab + 3 components | Phase 4 |
| 7.2 | Board Replay | 4 | M | +2 tables, +1 col on runs | 6 | 1 tab + 4 components | Phase 4 |
| 7.3 | Board Fork | 4 | M | +1 table, +2 cols on boards, +1 col on cards | 6 | 1 tab + 4 components | Phase 4 |
| 7.4 | Multi-Agent Coordination | 5 | L | +3 tables, +2 cols on agents | 10 | 1 page + 4 components | Phase 3 |
| 7.5 | Agent Template Library | 4 | M | +2 tables, +1 col on agents | 8 | 2 pages + 2 components | Phase 3 |
| 7.6 | Tool SDK + CLI | 5 | L | 0 (CLI project) | 0 (uses existing) | 0 (CLI only) | Phase 1 |
| 7.7 | Workflow Templates Marketplace | 4 | M | +2 tables | 7 | 2 pages + 2 components | Phase 2 |
| 7.8 | Advanced Analytics | 4 | M | +4 views | 7 | 4 pages + export | Phase 6 |
| 7.9 | WebSocket Upgrade | 4 | M | 0 | 1 WS endpoint | 3 hooks + migration | Phase 5 |
| 7.10 | Audit Log Viewer | 3 | S | +1 partitioned table | 4 | 1 page + 3 components | Phase 6 |
| 7.11 | Cost Tracking Dashboard | 4 | M | +3 tables | 12 | 1 page + 6 components | Phase 1 |

**Total Phase 7 Effort:** ~45 days (9 weeks if sequential; can be parallelized based on dependency chains)

**Parallelization Strategy:**
- **Stream A (Board features):** 7.1 -> 7.2 -> 7.3 (12 days, sequential — each builds on board infrastructure)
- **Stream B (Agent + Templates):** 7.4 || 7.5 (5 days parallel — independent agent features)
- **Stream C (Developer Tools):** 7.6 || 7.7 (5 days parallel — SDK and marketplace are independent)
- **Stream D (Platform features):** 7.8 -> 7.10 -> 7.11 (11 days, semi-sequential — analytics first, then audit and cost)
- **Stream E (Infrastructure):** 7.9 (4 days — can run any time after Phase 5)

**With 2 engineers and parallelization: ~6-7 weeks**

---

*Generated: 2026-04-06*
*Based on: AIRAIE_MASTER_SPRINT_PLAN.md Phase 7 feature list*
*Architecture reference: airaie-kernel (Go control plane) + airaie-platform (React unified app)*
