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
- [x] **Phase 8: Card-as-Page** — Replace BoardDetailPage's CardDetail side-sheet with a per-card route (`/cards/:cardId`) that becomes the configuration-first surface for an entire chain instance (Intent + Plan + Run + Results + Evidence + Gates). Wave 1 (08-01) shipped the foundation: route, navigation, top bar with functional Run state machine, sidebar context blocks, ?legacy=1 fallback. Wave 2 (08-02) shipped body composition (Hero, AvailableInputsTable, AvailableMethodsTable, KPI form, Sequence/Status, action bar, lifecycle, mode rules, card-scoped gate hooks). Both surfaces (CardTopBar + CardActionBar) share a single `useCardRunState` hook so a Run started from either flips both within one render cycle.
- [x] **Phase 9: Renderer Registry MVP (concept Phase 2a)** — Replace CardStatusPanel's bullet-list-of-artifact-download-links Results subsection with a renderer registry that picks the right component per `(intent_type, artifact_kind)` and mounts it inline. Wave 1 (09-01) shipped 5 lazy-loaded renderers (image, json-metrics, csv-chart, csv-table, fallback), 3 per-intent layouts (cfd_analysis, fea_static, parameter_sweep), and a `render-csv` Vite manualChunk for `papaparse`. `pickRenderer(artifact, intent)` honors a 4-tier priority: manifest hint → exact (intent_type, kind) → kind-only → always-true fallback. ResultsSection extracts a pure `planResults` helper for unit-testable dispatch. 38 net-new tests, 289 total passing. Heavy renderers (3D CAD, PDF, scientific viz) deferred to Phase 2b–2f.
- [x] **Phase 10: Card Canvas (Tiptap-direct block editor)** — SHIPPED 2026-04-28. Replaced the structured-sections Card-page (Phase 8) with a single flowing Notion-like canvas built on Tiptap directly. Typed governance blocks (Intent / Input / KPI / Method / Run / Result / Evidence / Gate / EmbedCard / EmbedRecord / AiAssist on Cards; CardsGrid / CardsGraph / GatesRollup / EvidenceRollup / ArtifactPool on Boards) compose freely with text/heading/list/callout/divider. Slash menus on both surfaces (Card: 16 items with Intent/Method/Run cardinality; Board: 10 items). Optimistic-concurrency persistence via `cards.body_blocks` + `boards.body_blocks` JSONB columns with 409 VERSION_CONFLICT surfaced through `<ConflictResolutionModal>` (discard / overwrite / merge-auto). Auto-migration generates a default block tree from existing entity state on first canvas open. **The Tiptap canvas is the default route for both `/cards/:id` and `/boards/:id`** as of Wave 10-07-flip; `?legacy=1` keeps the structured Phase 8 page reachable as an escape hatch for one release window. Outstanding polish: 10-04b (drag-drop palette), 10-06-rest (Mode locks + perf pass), 10-07-cleanup (delete Phase 8 components). All gates green throughout (tsc default + strict, vitest 410, npm build).

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

### Phase 8: Card-as-Page
**Goal**: A Card is the entire chain instance — Intent + Plan + Run + Results + Evidence + Gates — rendered as one configuration-first page rather than a row + side-sheet. Validates the Phase 1 mental model from `doc/concepts/03-CARDS-AS-PAGES.md` cheaply before investing in the renderer registry.
**Depends on**: Phases 1, 2, 3, 4 (foundations + Boards + Workflow Editor + Workflow Runs)
**Requirements**: REQ-01, REQ-02, REQ-04, NFR-04
**Success Criteria** (what must be TRUE):
  1. `/cards/:cardId` route renders for every existing Card without TypeError
  2. Functional Run button on day one — 4-stage state machine (Draft Intent → Generate Plan → Run Card → Cancel), no stubs
  3. Sidebar swaps to card-detail context: ThisBoardNav (sibling cards with active highlight) + ThisCardStatusPill (live status pill)
  4. BoardDetailPage Cards click navigates; legacy side-sheet behind `?legacy=1` fallback for one release
  5. Mode-aware affordances apply (Wave 2): Explore allows everything, Study locks Inputs+Intent after first Run, Release hides manual Evidence
  6. `tsc --noEmit` clean (default + strict tsconfig.app.json), vitest run passes
**Plans**:
  - [x] 08-01 — Foundation (route, navigation, top bar, sidebar augmentation) — Wave 1, shipped 2026-04-26 — see `phases/08-card-as-page/08-01-SUMMARY.md`
  - [x] 08-02 — Body composition (Hero, configuration tables, KPI form, sequence + status, action bar, lifecycle, mode rules, card-scoped gate hooks) — Wave 2, shipped 2026-04-26 — see `phases/08-card-as-page/08-02-SUMMARY.md`

### Phase 9: Renderer Registry MVP
**Goal**: Replace CardStatusPanel's bullet-list-of-artifact-download-links Results subsection with a renderer registry — `(intent_type, artifact_kind) → React component (lazy)`. Phase 2a of the conceptual rollout (`doc/concepts/04-RENDERER-REGISTRY.md`). Ships 5 renderers covering 80% of today's tools' output formats (image / JSON metrics / CSV-as-table / CSV-as-chart / fallback) and 3 per-intent layouts (cfd_analysis / fea_static / parameter_sweep). Heavy renderers (3D CAD, PDF, scientific viz, streaming, view-state lock) deferred to Phase 2b–2f.
**Depends on**: Phase 8 (Card-as-page provides the CardStatusPanel surface; useRunArtifacts provides RunArtifact[])
**Requirements**: REQ-01, REQ-04, NFR-04
**Success Criteria** (what must be TRUE):
  1. Registry data structure with `match(ctx)` predicate and `lazy()` component, 4-tier lookup priority
  2. 5 renderers in priority order (image, json-metrics, csv-chart, csv-table, fallback) — csv-chart BEFORE csv-table in array
  3. Per-`intent_type` layout config — at least 3 entries (cfd_analysis, fea_static, parameter_sweep)
  4. ResultsSection composes the layout (12-col grid) or falls through to auto-pick stacking for non-layout intents
  5. CardStatusPanel mounts `<ResultsSection>` instead of bullet-list (only on `run.status === 'completed'`)
  6. Each renderer is its own lazy chunk; `papaparse` segregated into a render-csv manualChunk
  7. `tsc --noEmit` clean (default + strict), vitest run passes, npm run build succeeds with verified `dist/assets/render-csv-*.js` chunk
**Plans**:
  - [x] 09-01 — Renderer Registry MVP (5 renderers + 3 layouts + ResultsSection + CardStatusPanel wiring) — Wave 1, shipped 2026-04-26 — see `phases/09-renderer-registry/09-01-SUMMARY.md`

### Phase 10: Card Canvas (Tiptap-direct block editor)
**Goal**: Replace the structured-sections Card-page (Phase 8) with a single flowing Notion-like canvas built on Tiptap directly (no BlockNote dependency). Typed governance blocks (Intent / Input / KPI / Method / Run / Result / Evidence / Gate / EmbedCard / EmbedRecord / AiAssist) compose freely with text/heading/list/callout/divider blocks. Validates the user's "page-feel, not card-stack-feel" feedback after seeing Phase 8. Long-term ownership of the block + UI layers; ProseMirror underneath handles cursor/selection/IME/paste/undo.
**Depends on**: Phase 8 (data plumbing — useCardRunState, useCardModeRules, hooks), Phase 9 (renderer registry — drives Result block content)
**Requirements**: REQ-01, REQ-04, NFR-04
**Success Criteria** (what must be TRUE):
  1. `/cards/:cardId?canvas=1` route renders the Tiptap canvas with auto-migrated body_blocks for any existing Card
  2. All 11 typed governance block kinds render with live data from their bound entities (real NodeViews land 10-02 onward)
  3. Slash menu inserts text + typed blocks per Mode rules
  4. Right palette drags into canvas, creating typed blocks at drop position
  5. `body_blocks` persists with optimistic concurrency; reload restores exact state; 409 on stale-version save
  6. Mode-rule edit locks visually applied (🔒 + tooltip) per typed block
  7. Board canvas mirrors Card canvas with Board-specific block kinds (cardsGrid, cardsGraph, gatesRollup, evidenceRollup, artifactPool)
  8. Editor chunk lazy-loaded; main bundle delta < 5 KB
  9. All gates green (frontend tsc default + strict, vitest, npm build; kernel go build, go test -short)
  10. Phase 10-07 removes the Phase 8 structured page after canvas is verified
**Plans**:
  - [x] 10-01 — Editor framework (Tiptap install + block schema + persistence + auto-migration + feature-flagged route) — Wave 1, shipped 2026-04-27 — see `phases/10-card-canvas/10-01-SUMMARY.md`
  - [x] 10-02 — Real NodeViews for Intent / Input / Result + minimal slash menu — Wave 2, shipped 2026-04-27 — see `phases/10-card-canvas/10-02-SUMMARY.md`
  - [x] 10-03 — Real NodeViews for KPI / Method / Run + full slash menu (16 items, cardinality on Intent/Method/Run; cardCanvasContext widened to 6 fields) — Wave 3, shipped 2026-04-27 — see `phases/10-card-canvas/10-03-SUMMARY.md`
  - [x] 10-04 — Real NodeViews for Evidence / Gate / EmbedCard / EmbedRecord (+ AiAssist stub; palette split into 10-04b) — Wave 4, shipped 2026-04-27 — see `phases/10-card-canvas/10-04-SUMMARY.md`. After this wave **all 11 typed-governance Tiptap nodes mount real per-kind NodeViews**.
  - [ ] 10-04b — Right-rail drag-drop palette (Board Pool / Tools / Run Outputs / Records / Text Blocks / AI Assist sections) — split-off (~2-3 dev-days). Slash menu already lets users insert any kind, so this is value-additive, not value-blocking.
  - [x] 10-05 — Full Board canvas, shipped 2026-04-28 across 5 sub-waves: **10-05a** backend (migration 032 + PATCH /v0/boards/{id}/body + BoardService.UpdateBoardBody + store impl); **10-05b** frontend BoardCanvasPage + CardsGridBlockView; **10-05c-light** Gates/Evidence/Artifact rollup NodeViews; **10-05c-rest** CardsGraph (xyflow DAG); **10-05c-final** Board slash menu (10 items, scope-agnostic popover refactor). All 5 Board NodeViews real; live-smoke verified.
  - [~] 10-06 — Partial. **10-06-slim** shipped 2026-04-28 (3-way merge UI on 409 VERSION_CONFLICT, wired into both BoardCanvasPage + CardCanvasPage via `<ConflictResolutionModal>`). **10-06-rest** pending: Mode-rule per-block lock chrome (🔒 + tooltip per NodeView reading `useCardModeRules`); perf pass (NodeView memo audit; IntersectionObserver lazy-mount for off-screen blocks). ~1.5 dev-days remaining.
  - [~] 10-07 — Partial. **10-07-flip** shipped 2026-04-28 (canvas is the default route for /cards/:id and /boards/:id; `?legacy=1` keeps the structured page reachable; CardTopBar's "Try canvas →" becomes "Back to canvas →" in legacy mode). **10-07-cleanup** pending: delete the Phase 8 structured-page components (CardHero, AvailableInputsTable, AvailableMethodsTable, etc. — ~10-12 files); remove `?legacy=1` branch from BoardDetailPage; drop `?canvas=0` handling. Destructive — gated on a soak window. ~0.5 dev-day remaining.
