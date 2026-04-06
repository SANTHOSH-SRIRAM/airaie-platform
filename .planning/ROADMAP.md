# Roadmap: AirAIE Platform v2 Frontend

## Overview

Rebuild the AirAIE platform frontend to match the v2 Figma design. The journey starts by building the centralized UI controller (AppShell + state), then the dashboard, then each major feature area (workflow editor, runs, agent playground, tool registry). Each phase delivers a testable, user-facing capability.

## Phases

- [ ] **Phase 1: Centralized UI Controller** — Unified AppShell with top nav, sidebar, right panel, bottom bar, vertical toolbar, and centralized Zustand UI state
- [ ] **Phase 2: Dashboard** — Stats cards, active runs, recent workflows, agent activity, governance alerts, system status bar
- [ ] **Phase 3: Workflow Editor** — Visual DAG editor with ReactFlow, node palette, properties panel, save/publish/run actions
- [ ] **Phase 4: Workflow Runs** — Execution list, live DAG status, log viewer, node metrics, cancel/retry actions
- [ ] **Phase 5: Agent Playground** — Chat interface, tool call proposals, session management, decision trace inspector, live metrics
- [ ] **Phase 6: Tool Registry** — Filterable tool grid, version history, tool contract, execution config, sandbox policy
- [ ] **Phase 7: Integration and Polish** — Cross-screen navigation, error handling, loading states, responsive refinements, dark mode pass

## Phase Details

### Phase 1: Centralized UI Controller
**Goal**: Every page renders inside a unified AppShell with centralized state — no per-page layout code
**Depends on**: Nothing (first phase, builds on v1 scaffold)
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04
**Success Criteria** (what must be TRUE):
  1. All routes render inside AppShell with correct top nav, sidebar, and optional panels
  2. Sidebar content changes based on route context (navigation on dashboard, node palette on editor, etc.)
  3. Right panel can be toggled open/closed and receives content from any page
  4. Bottom action bar renders page-specific actions without layout duplication
  5. UI state (sidebar collapsed, panel open, active tab) persists across navigation
**Plans**: TBD

### Phase 2: Dashboard
**Goal**: Users see a live operational dashboard with real metrics, active runs, and governance alerts
**Depends on**: Phase 1
**Requirements**: REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-15
**Success Criteria** (what must be TRUE):
  1. Four stats cards display workflow/agent/run/board counts from API
  2. Active runs widget shows currently running workflows with progress and cost
  3. Recent workflows list shows latest workflows with version and status
  4. Agent activity feed shows recent agent actions with confidence scores
  5. System status bar shows API health, NATS, runner slots, storage
**Plans**: TBD

### Phase 3: Workflow Editor
**Goal**: Users can visually build and edit workflow pipelines as node graphs
**Depends on**: Phase 1
**Requirements**: REQ-20, REQ-21, REQ-22, REQ-23, REQ-24
**Success Criteria** (what must be TRUE):
  1. ReactFlow canvas renders workflow nodes with proper types and connections
  2. Users can drag nodes from palette sidebar onto canvas and connect them
  3. Selecting a node shows its properties in the right panel with editable fields
  4. Save and Publish buttons call the correct API endpoints
  5. Run Workflow button triggers pipeline execution
**Plans**: TBD

### Phase 4: Workflow Runs
**Goal**: Users can monitor workflow execution in real time with logs and node metrics
**Depends on**: Phase 3
**Requirements**: REQ-30, REQ-31, REQ-32, REQ-33, REQ-34
**Success Criteria** (what must be TRUE):
  1. Execution list shows all runs with status, duration, and cost
  2. DAG visualization updates live with node status (running/completed/failed)
  3. Log viewer streams logs in real time with auto-scroll
  4. Node detail panel shows inputs, outputs, and metrics for selected node
  5. Cancel and Retry actions work on active runs
**Plans**: TBD

### Phase 5: Agent Playground
**Goal**: Users can interact with AI agents via chat, review tool proposals, and monitor decision traces
**Depends on**: Phase 1
**Requirements**: REQ-40, REQ-41, REQ-42, REQ-43, REQ-44
**Success Criteria** (what must be TRUE):
  1. Chat interface supports user messages and agent responses with tool call proposals
  2. Tool call proposals display confidence scores, reasoning, inputs, cost, alternatives
  3. Session list allows switching between conversations
  4. Inspector panel shows decision trace timeline and live metrics
  5. Stop/Clear/Approve All actions work correctly
**Plans**: TBD

### Phase 6: Tool Registry
**Goal**: Users can browse, filter, and inspect available tools with full contract details
**Depends on**: Phase 1
**Requirements**: REQ-50, REQ-51, REQ-52, REQ-53, REQ-54
**Success Criteria** (what must be TRUE):
  1. Tool cards render in a responsive grid with icons, descriptions, tags, and usage stats
  2. Filter sidebar filters by status, category, and adapter type
  3. Properties panel shows version history, tool contract, execution config
  4. "Use in Workflow" navigates to editor with tool pre-selected
  5. "Test Run" triggers a test execution
**Plans**: TBD

### Phase 7: Integration and Polish
**Goal**: Cross-cutting concerns: navigation flows, error handling, responsive layout, dark mode
**Depends on**: Phase 2, 3, 4, 5, 6
**Requirements**: NFR-01, NFR-02, NFR-03, NFR-04, NFR-05
**Success Criteria** (what must be TRUE):
  1. All cross-screen navigation flows work (dashboard -> workflow -> run -> back)
  2. Every API call has loading/error states with retry capability
  3. Main bundle <500KB gzipped with ReactFlow and recharts lazy-loaded
  4. Sidebar and panels work at 1280px minimum width
  5. Dark mode renders correctly on all screens
**Plans**: TBD
