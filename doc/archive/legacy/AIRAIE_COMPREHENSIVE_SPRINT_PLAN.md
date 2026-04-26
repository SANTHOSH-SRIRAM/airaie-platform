# AIRAIE Platform v2 — Comprehensive Sprint Plan

> 12-sprint roadmap covering all four domains: Workflows, Agents, Tools, Boards.
> Adopts n8n editor UX patterns. Keeps AIRAIE Go+Rust execution backbone.
> Aligned with existing 7-phase roadmap. Fills all identified gaps.
> Generated: 2026-04-05

---

## Sprint Overview

| Sprint | Name | Duration | Domain | Dependencies |
|--------|------|----------|--------|-------------|
| **S1** | Foundation & API Wiring | 1 week | Cross-cutting | None |
| **S2** | Workflow Canvas Core | 1 week | Workflows | S1 |
| **S3** | NDV & Parameter Forms | 1 week | Workflows | S2 |
| **S4** | Workflow Execution & SSE | 1 week | Workflows | S3 |
| **S5** | Workflow Compile/Publish/YAML | 1 week | Workflows | S4 |
| **S6** | Tool Registry & Resolution | 1 week | Tools | S1 |
| **S7** | Agent Builder & Playground | 1 week | Agents | S1 |
| **S8** | Agent Execution & Sessions | 1 week | Agents | S7, S4 |
| **S9** | Board Governance Foundation | 1 week | Boards | S1 |
| **S10** | Board Cards, Plans & Evidence | 1 week | Boards | S9, S4 |
| **S11** | Cross-Domain Integration | 1 week | All | S5, S6, S8, S10 |
| **S12** | Polish, Performance & Dark Mode | 1 week | All | S11 |

```
Week:  1    2    3    4    5    6    7    8    9    10   11   12
       ┌─S1─┐
       │Foundation                                              
       └──┬─┘                                                   
          ├──────┬──────┬──────┬──────┐                         
          │      │      │      │      │                         
       ┌──┴─┐┌──┴─┐         ┌─┴──┐┌──┴─┐                      
       │ S2 ││ S6 │         │ S7 ││ S9 │                      
       │Canv││Tool│         │Agnt││Bord│                      
       └──┬─┘└──┬─┘         └─┬──┘└──┬─┘                      
       ┌──┴─┐   │          ┌──┴─┐ ┌──┴─┐                      
       │ S3 │   │          │ S8 │ │S10 │                      
       │NDV │   │          │AgEx│ │BdCd│                      
       └──┬─┘   │          └──┬─┘ └──┬─┘                      
       ┌──┴─┐   │             │      │                         
       │ S4 │   │             │      │                         
       │SSE │   │             │      │                         
       └──┬─┘   │             │      │                         
       ┌──┴─┐   │             │      │                         
       │ S5 │   │             │      │                         
       │YAML│   │             │      │                         
       └──┬─┘   │             │      │                         
          └─────┴─────────────┴──────┤                         
                                  ┌──┴─┐                       
                                  │S11 │                       
                                  │Intg│                       
                                  └──┬─┘                       
                                  ┌──┴─┐                       
                                  │S12 │                       
                                  │Plsh│                       
                                  └────┘                       
```

**Note:** S2-S5 (Workflows) are sequential. S6 (Tools), S7-S8 (Agents), S9-S10 (Boards) can run in parallel with each other after S1.

---

## S1: Foundation & API Wiring

**Goal**: Establish the data layer that every domain depends on — real API clients, shared stores, SSE infrastructure, and n8n-style handle format utilities.

**Phase mapping**: Extends Phase 1 (Centralized UI Controller) + cross-cutting infrastructure

### S1.1 — API Client Factory & Error Handling
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Create typed API client with interceptors | `src/api/client.ts` | Axios instance with base URL `/v0`, timeout 30s, `X-Project-Id` header, error transform to `ApiError` type |
| 2 | Create `ApiError` class with structured codes | `src/types/api.ts` | Match kernel error codes: `BOARD_NOT_FOUND`, `INVALID_TRANSITION`, `QUOTA_EXCEEDED`, etc. |
| 3 | Create `tryApiOrFallback<T>` utility | `src/api/helpers.ts` | Try real API, fall back to mock if `VITE_USE_MOCKS=true` or connection refused. Console warn on fallback. |
| 4 | Add `VITE_USE_MOCKS` env flag | `.env.development` | Default `true` for dev, `false` for staging |

### S1.2 — Shared Types (from Kernel Models)
| # | Task | File | Details |
|---|------|------|---------|
| 5 | Board types | `src/types/board.ts` | `Board`, `BoardMode`, `BoardSummary`, `BoardRecord`, `BoardAttachment` matching kernel models |
| 6 | Card types | `src/types/card.ts` | `Card`, `CardStatus`, `CardKPI`, `CardEvidence`, `CardDependency` |
| 7 | Gate types | `src/types/gate.ts` | `Gate`, `GateStatus`, `GateRequirement`, `GateApproval` |
| 8 | Intent types | `src/types/intent.ts` | `IntentSpec`, `AcceptanceCriterion`, `GovernanceSpec`, `IntentInput` |
| 9 | Plan types | `src/types/plan.ts` | `ExecutionPlan`, `PlanNode`, `PlanEdge`, `PreflightResult` |
| 10 | Execution types | `src/types/execution.ts` | `SSEEvent`, `NodeRunState`, `RunStatus`, `LogEntry`, `ArtifactEntry`, `EvidenceEntry` — all SSE event shapes |
| 11 | Canvas types | `src/types/canvas.ts` | `CanvasNodeData`, `CanvasConnectionPort`, `HandleFormat`, `CanvasNodeRenderType` (n8n-inspired) |
| 12 | Expression types | `src/types/expression.ts` | `ExpressionToken`, `ExpressionContext` |

### S1.3 — Handle Format & Canvas Utilities
| # | Task | File | Details |
|---|------|------|---------|
| 13 | Handle encoder/decoder | `src/utils/handleFormat.ts` | `encodeHandle('outputs', 'main', 0)` → `"outputs/main/0"`. Decode reverse. Connection types: `main`, `ai_model`, `ai_tool`, `ai_policy`, `ai_memory` |
| 14 | Canvas mapping utility | `src/utils/canvasMapping.ts` | `workflowToCanvas(workflow)` → ReactFlow nodes/edges. `canvasToWorkflow(nodes, edges)` → API format. Generate handles from ToolContract ports. |
| 15 | Node validation utility | `src/utils/nodeValidation.ts` | Validate node config against ToolContract JSON Schema. Return `{valid, errors[]}` |

### S1.4 — New Stores
| # | Task | File | Details |
|---|------|------|---------|
| 16 | Execution store | `src/store/executionStore.ts` | `activeRunId`, `runStatus`, `nodeStates: Map<id, {status, outputs, progress}>`, `logs[]`, `artifacts[]`, `evidence[]`, `sseConnected`. Actions: `startRun`, `setNodeStatus`, `addLog`, `reset` |
| 17 | Canvas store | `src/store/canvasStore.ts` | `viewport`, `zoom`, `selectedNodes[]`, `isConnecting`, `draggedNodeType`. Actions: `setViewport`, `selectNodes`, `fitView` |
| 18 | Node inspector store | `src/store/nodeInspectorStore.ts` | `activeNodeId`, `inputPanel: {parentNodeId, runIndex, branchIndex}`, `outputPanel: {runIndex, branchIndex}`, `isDragging`. (n8n NDV store equivalent) |
| 19 | History store | `src/store/historyStore.ts` | `undoStack[]`, `redoStack[]`, `maxSize: 50`. Actions: `push(command)`, `undo()`, `redo()`, `canUndo`, `canRedo`. Command pattern. |
| 20 | Tool types store | `src/store/toolTypesStore.ts` | `toolTypes: Map<string, ToolTypeDescription>`, `categories[]`, `loaded`. Actions: `fetchToolTypes()` from `GET /v0/tools` + `GET /v0/node-types` |

### S1.5 — SSE Client Hook
| # | Task | File | Details |
|---|------|------|---------|
| 21 | SSE client hook | `src/hooks/useSSE.ts` | `useRunSSE(runId)` → `EventSource` connecting to `/v0/runs/{runId}/events`. Handlers for all 9 event types. Auto-reconnect on error. Returns `{connected, error}`. Writes to `executionStore`. |
| 22 | SSE event parser | `src/utils/sseParser.ts` | Parse SSE `event:` + `data:` into typed `SSEEvent` discriminated union |

**Deliverables**: Typed API client, 5 new stores, 5 new type files, SSE infrastructure, handle format system.
**Tests**: Unit tests for handleFormat, canvasMapping, sseParser, nodeValidation.
**Exit criteria**: `import { useRunSSE } from '@hooks/useSSE'` compiles. All stores have tests.

---

## S2: Workflow Canvas Core

**Goal**: n8n-style visual DAG editor — drag nodes from palette, connect them, select to inspect. This is the canvas foundation that everything else builds on.

**Phase mapping**: Phase 3, Wave 1-2

### S2.1 — Canvas Shell & Background
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Canvas wrapper component | `src/components/workflows/canvas/WorkflowCanvas.tsx` | `<ReactFlow>` with `<Background>`, `<MiniMap>`, `<Controls>`. Receives nodes/edges from workflowStore. |
| 2 | Canvas background | `src/components/workflows/canvas/CanvasBackground.tsx` | Grid pattern (40px grid like n8n), subtle dots |
| 3 | Canvas controls | `src/components/workflows/canvas/CanvasControls.tsx` | Zoom +/-, Fit View, Tidy Up, MiniMap toggle |
| 4 | Canvas context menu | `src/components/workflows/canvas/CanvasContextMenu.tsx` | Right-click: Execute to here, Disable node, Pin data, Delete, Copy, Paste |
| 5 | Connection line component | `src/components/workflows/canvas/CanvasConnectionLine.tsx` | Animated bezier during drag-to-connect |

### S2.2 — Node Components (6 types)
| # | Task | File | Details |
|---|------|------|---------|
| 6 | Base node wrapper | `src/components/workflows/nodes/BaseNode.tsx` | Shared chrome: border color, icon slot, label, version badge, status dot, handles |
| 7 | Trigger node | `src/components/workflows/nodes/TriggerNode.tsx` | Green border, lightning icon, 0 inputs / 1+ outputs. Subtypes: webhook, schedule, event, manual |
| 8 | Tool node | `src/components/workflows/nodes/ToolNode.tsx` | Orange border, wrench icon. Version badge. Input/output handles from ToolContract |
| 9 | Agent node | `src/components/workflows/nodes/AgentNode.tsx` | Purple border, brain icon. Sub-port handles: `[M] [T] [P] [Mem]` below main I/O |
| 10 | Logic node | `src/components/workflows/nodes/LogicNode.tsx` | Diamond shape. IF: 1 in, 2 out (true/false). Switch: 1 in, N out. Merge: N in, 1 out |
| 11 | Gate node | `src/components/workflows/nodes/GateNode.tsx` | Shield icon, status badge (green/yellow/red). 1 in, 1 out |
| 12 | Data node | `src/components/workflows/nodes/DataNode.tsx` | File icon. Upload (0 in, 1 out) or Transform (1 in, 1 out) |
| 13 | Sticky note node | `src/components/workflows/nodes/StickyNoteNode.tsx` | Yellow card, no ports, editable text (n8n pattern) |
| 14 | Node handle component | `src/components/workflows/nodes/NodeHandle.tsx` | Custom ReactFlow handle using `encodeHandle()` format. Visual: dot/diamond/plus variants |

### S2.3 — Node Palette (n8n Node Creator)
| # | Task | File | Details |
|---|------|------|---------|
| 15 | Node palette panel | `src/components/workflows/palette/NodePalette.tsx` | Categorized browser: Triggers, Tools, Agents, Logic, Governance, Data. Search filter. Collapsible sections. |
| 16 | Palette node item | `src/components/workflows/palette/PaletteNodeItem.tsx` | Draggable item with icon, name, description. `onDragStart` sets `dataTransfer` with node type |
| 17 | Tool category loader | `src/components/workflows/palette/useToolCategories.ts` | Hook that fetches tool types from `toolTypesStore`, groups by category, merges with static node types (triggers, logic, gates) |
| 18 | Drag-to-canvas handler | Update `WorkflowCanvas.tsx` | `onDrop` handler: reads dragged node type, creates `WorkflowEditorNode` with position at drop point, calls `workflowStore.addNode()` |

### S2.4 — Canvas Hooks (n8n composable equivalents)
| # | Task | File | Details |
|---|------|------|---------|
| 19 | useCanvasOperations | `src/hooks/useCanvasOperations.ts` | `addNode`, `deleteNode`, `duplicateNode`, `connectNodes`, `disconnectNodes`, `moveNode`. Each operation pushes to historyStore for undo. |
| 20 | useCanvasLayout | `src/hooks/useCanvasLayout.ts` | `autoArrange()` — Dagre layout for topological sort. `tidyUp()` — snap to grid. `fitView()` — zoom to fit all nodes |
| 21 | useCanvasTraversal | `src/hooks/useCanvasTraversal.ts` | `getParentNodes(nodeId)`, `getChildNodes(nodeId)`, `getUpstreamChain(nodeId)`, `getDownstreamChain(nodeId)`. Used by execution overlay |
| 22 | useHistory | `src/hooks/useHistory.ts` | Wraps historyStore. Provides `undo()`, `redo()`, Cmd+Z / Cmd+Shift+Z keyboard shortcuts |

### S2.5 — Editor Page Assembly
| # | Task | File | Details |
|---|------|------|---------|
| 23 | Update WorkflowEditorPage | `src/pages/WorkflowEditorPage.tsx` | Wire: sidebar=NodePalette, center=WorkflowCanvas, right=NodePropertiesPanel. Load workflow from API on mount. |
| 24 | Editor top bar | `src/components/workflows/WorkflowEditorTopBar.tsx` | Workflow name (editable), version badge, dirty indicator, tabs (Editor / Runs / Eval), Save + Publish buttons |
| 25 | Editor bottom bar | `src/components/workflows/WorkflowEditorBottomBar.tsx` | "Run Workflow" button, node/edge count, chat button stub |

**Deliverables**: Full canvas editor with 7 node types, drag-drop from palette, connect/disconnect, undo/redo, context menu, auto-layout.
**Tests**: Canvas renders without crash. Drag-drop adds node. Connect/disconnect updates store. Undo/redo works.
**Exit criteria**: User can build a 5-node workflow visually.

---

## S3: NDV & Parameter Forms

**Goal**: n8n-style Node Detail View — click a node, see auto-generated config form from its ToolContract, configure parameters, resource limits, retry policy.

**Phase mapping**: Phase 3, Wave 3

### S3.1 — Node Inspector Shell
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Node inspector panel | `src/components/workflows/ndv/NodeInspector.tsx` | Right panel. Header: node name, type icon, close button. Tabs: Parameters, Input, Output. Resizable width. Uses nodeInspectorStore. |
| 2 | Inspector header | `src/components/workflows/ndv/InspectorHeader.tsx` | Node name (editable), type badge, version selector dropdown, status dot |
| 3 | Draggable split panels | `src/components/workflows/ndv/SplitPanels.tsx` | Resizable top/bottom split (n8n's NDVDraggablePanels). Top: Input data from parent. Bottom: Output data. |

### S3.2 — Parameter Form Generation (n8n ParameterInput equivalent)
| # | Task | File | Details |
|---|------|------|---------|
| 4 | Parameter form container | `src/components/workflows/ndv/ParameterForm.tsx` | Takes `ToolContract`, iterates `inputs[]`, renders `ParameterInput` for each. Sections: Inputs, Resource Limits, Retry Policy, Advanced. |
| 5 | Parameter input (recursive) | `src/components/workflows/ndv/ParameterInput.tsx` | Switch on JSONSchema type: string→TextInput, number→NumberInput, boolean→Toggle, object→nested form, array→list form, enum→Dropdown. Supports expression toggle. |
| 6 | Artifact selector | `src/components/workflows/ndv/ArtifactSelector.tsx` | AIRAIE-specific: browse/select S3 artifacts. Shows artifact ID, type, hash, size. |
| 7 | Expression toggle button | `src/components/workflows/ndv/ExpressionToggle.tsx` | Toggle between fixed value and `{{ }}` expression mode. Icon: `{=}` |
| 8 | Expression editor (basic) | `src/components/workflows/ndv/ExpressionEditor.tsx` | Textarea with syntax highlighting for `{{ }}`. Autocomplete for `$json`, `$input`, `$artifacts`, `$run`, `$board`. (Full CodeMirror in S5) |
| 9 | Resource limits section | `src/components/workflows/ndv/ResourceLimitsSection.tsx` | CPU (cores slider), Memory (MB input), Timeout (seconds input). Defaults from ToolContract |
| 10 | Retry policy section | `src/components/workflows/ndv/RetryPolicySection.tsx` | Max retries (number), wait between (seconds), exponential backoff toggle |

### S3.3 — Input/Output Panels (n8n InputPanel/OutputPanel)
| # | Task | File | Details |
|---|------|------|---------|
| 11 | Input panel | `src/components/workflows/ndv/InputPanel.tsx` | Shows parent node's output data. Parent selector dropdown (when multiple parents). Run/branch selectors. Table view of items. "No data yet — run workflow first" empty state. |
| 12 | Output panel | `src/components/workflows/ndv/OutputPanel.tsx` | Shows this node's execution output. Run/branch selectors. JSON tree view. Artifact links. "Pin output" button. |
| 13 | Data table view | `src/components/workflows/ndv/DataTable.tsx` | Table rendering of `json` items. Auto-detect columns from first item. Sortable headers. Row expansion for nested objects. |
| 14 | JSON tree view | `src/components/workflows/ndv/JsonTreeView.tsx` | Collapsible JSON tree for raw data inspection. Copy button per node. |
| 15 | useDataSchema hook | `src/hooks/useDataSchema.ts` | Infer schema from execution data: column names, types, sample values. Used by DataTable for column generation. |

### S3.4 — Wire Inspector to Canvas
| # | Task | File | Details |
|---|------|------|---------|
| 16 | Node click → open inspector | Update `WorkflowCanvas.tsx` | `onNodeClick` → `nodeInspectorStore.setActiveNode(id)` → `uiStore.openRightPanel('nodeInspector')` |
| 17 | Inspector reads tool contract | Update `NodeInspector.tsx` | Fetch contract from `toolTypesStore.getToolType(node.data.toolRef)`. Pass to ParameterForm. |
| 18 | Parameter changes → store | Update `ParameterForm.tsx` | `onChange` → `workflowStore.updateNodeData(nodeId, {inputs: newValues})` → marks dirty |

**Deliverables**: Complete NDV with auto-generated parameter forms, input/output panels, expression toggle, resource limits, retry config.
**Tests**: ParameterInput renders correct widget for each type. Form changes update store. Input panel shows parent data.
**Exit criteria**: Click node → see full config form → edit values → canvas node reflects changes.

---

## S4: Workflow Execution & SSE

**Goal**: Run a workflow and watch it execute in real time — nodes light up, logs stream, artifacts appear.

**Phase mapping**: Phase 4 (Workflow Runs)

### S4.1 — Wire Run API & SSE
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Workflow run API | `src/api/workflows.ts` | Wire `runWorkflow(id)` → `POST /v0/workflows/{id}/run`. Wire `fetchRunList`, `fetchRunDetail`, `fetchRunLogs` to real endpoints. Keep mock fallback. |
| 2 | Run hook with SSE | `src/hooks/useRunWorkflow.ts` | `useRunWorkflow(workflowId)`: POST to start run → get `runId` → connect SSE via `useRunSSE(runId)`. Returns `{run, start, cancel, isRunning}` |
| 3 | Wire "Run Workflow" button | Update `WorkflowEditorBottomBar.tsx` | Click → call `useRunWorkflow.start()` → navigate to Runs tab |
| 4 | Cancel/retry mutations | Update `src/hooks/useRuns.ts` | Wire `useCancelRun` → `POST /v0/runs/{id}/cancel`. Wire `useRetryRun` → `POST /v0/runs/{id}/retry` |

### S4.2 — Execution Overlay on Canvas
| # | Task | File | Details |
|---|------|------|---------|
| 5 | Execution overlay hook | `src/hooks/useExecutionOverlay.ts` | Reads `executionStore.nodeStates`, maps to ReactFlow node status. Returns `{nodeClassNames, edgeAnimations}` |
| 6 | Node status badge | `src/components/workflows/nodes/NodeStatusBadge.tsx` | Overlay on each node: spinner (running), green check (succeeded), red X (failed), gray clock (queued), progress % |
| 7 | Animated edges | Update `WorkflowCanvas.tsx` | Edges between running→next nodes get CSS animation (flowing dots) |
| 8 | Node run data badge | `src/components/workflows/nodes/NodeRunDataBadge.tsx` | Small badge showing output item count after completion (n8n pattern) |

### S4.3 — Run Monitor Page
| # | Task | File | Details |
|---|------|------|---------|
| 9 | Execution list sidebar | `src/components/workflows/runs/ExecutionList.tsx` | Wire to `useRunList(workflowId)`. Show status badge, duration, cost, node progress. Click to select. |
| 10 | Run DAG viewer | `src/components/workflows/runs/RunDAGViewer.tsx` | Same canvas layout as editor but read-only + execution overlay. Uses `useExecutionOverlay` |
| 11 | Log viewer with SSE | `src/components/workflows/runs/LogViewer.tsx` | Reads `executionStore.logs`. Auto-scroll. Level filter (info/warn/error). Node filter. Timestamp. Monospace. |
| 12 | Log toolbar | `src/components/workflows/runs/LogToolbar.tsx` | Auto-scroll toggle, level filter dropdown, node filter, search, copy all, download |
| 13 | Artifacts tab | `src/components/workflows/runs/ArtifactsTab.tsx` | Reads `executionStore.artifacts`. Table: name, type, size, hash, download link |
| 14 | Cost tab | `src/components/workflows/runs/CostTab.tsx` | Per-node cost breakdown. Bar chart. Total cost. Budget remaining. |
| 15 | Timeline tab | `src/components/workflows/runs/TimelineTab.tsx` | Gantt-style view of node execution times. Horizontal bars per node. Critical path highlighted. |
| 16 | Node detail panel | `src/components/workflows/runs/RunNodeDetailPanel.tsx` | Click node on DAG → show inputs, outputs, metrics (duration, CPU, memory, cost, attempt count) |

### S4.4 — Assemble Runs Page
| # | Task | File | Details |
|---|------|------|---------|
| 17 | Update WorkflowRunsPage | `src/pages/WorkflowRunsPage.tsx` | 4-panel: ExecutionList (left) + RunDAGViewer (top center) + LogViewer/tabs (bottom center) + RunNodeDetailPanel (right) |
| 18 | Tab switching (Editor ↔ Runs) | Update top bar | Editor tab → WorkflowEditorPage. Runs tab → WorkflowRunsPage. Share workflow context. |
| 19 | Run action bar | `src/components/workflows/runs/RunActionBar.tsx` | Cancel (red), Retry, status indicator "Running node 3/5" |

**Deliverables**: Real-time workflow execution with SSE, animated canvas, streaming logs, artifacts, cost, timeline.
**Tests**: SSE events update executionStore. Node badges reflect status. Logs appear in real time.
**Exit criteria**: Click "Run" → watch nodes execute → see logs stream → see artifacts produced.

---

## S5: Workflow Compile/Publish/YAML

**Goal**: Complete workflow lifecycle — save canvas state, compile to YAML DSL, validate, publish, manage versions.

**Phase mapping**: Phase 3 completion + versioning

### S5.1 — Save & Version Management
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Save workflow API | Update `src/api/workflows.ts` | Wire `saveWorkflow` → `PUT /v0/workflows/{id}` with canvas JSON. Wire version CRUD endpoints. |
| 2 | Version list component | `src/components/workflows/VersionList.tsx` | List versions with status badges (draft/compiled/published). Click to load version into canvas. |
| 3 | Save button wiring | Update top bar | Save → extract canvas state → API call → `markClean()`. Ctrl+S keyboard shortcut. |
| 4 | Auto-save (debounced) | `src/hooks/useAutoSave.ts` | Debounce 5s after last change. Only if `isDirty`. Shows "Saving..." indicator. |

### S5.2 — Compile & Validate
| # | Task | File | Details |
|---|------|------|---------|
| 5 | Canvas → YAML converter | `src/utils/canvasToYaml.ts` | Convert ReactFlow nodes/edges → AIRAIE YAML DSL format. Map node types, resolve connections, generate `depends_on`. |
| 6 | Compile button & flow | Update top bar | Compile → `canvasToYaml()` → `POST /v0/workflows/compile` → show result (success/errors) |
| 7 | Validation panel | `src/components/workflows/ValidationPanel.tsx` | Show compile/validate results: errors (red), warnings (yellow), lint suggestions. Click error → highlight node on canvas. |
| 8 | Validate on save | `src/hooks/useWorkflowValidation.ts` | Auto-validate after save. Show node issue badges (red dot) for nodes with errors. |

### S5.3 — Publish Flow
| # | Task | File | Details |
|---|------|------|---------|
| 9 | Publish button wiring | Update top bar | Publish → compile first (if not compiled) → `POST /v0/workflows/{id}/versions/{v}/publish` → update version badge |
| 10 | Publish confirmation modal | `src/components/workflows/PublishModal.tsx` | "Publishing v3 will make it available for execution. This is irreversible." Confirm/Cancel. |
| 11 | Version status in top bar | Update `WorkflowEditorTopBar.tsx` | Badge: "v3 (draft)" yellow, "v3 (compiled)" blue, "v3 (published)" green |

### S5.4 — YAML Editor (CodeMirror)
| # | Task | File | Details |
|---|------|------|---------|
| 12 | Install CodeMirror 6 | `package.json` | `@codemirror/view`, `@codemirror/lang-yaml`, `@codemirror/autocomplete`. Lazy-loaded chunk. |
| 13 | YAML editor component | `src/components/workflows/YamlEditor.tsx` | CodeMirror 6 YAML editor. Syntax highlighting. Show compiled YAML. Read-only mode for published. |
| 14 | YAML tab in editor | Update `WorkflowEditorPage.tsx` | New tab: Canvas | YAML | Runs | Eval. Canvas ↔ YAML sync. |
| 15 | Expression autocomplete | `src/utils/expressionAutocomplete.ts` | CodeMirror completions for `{{ }}`: `$json`, `$input`, `$artifacts`, `$run`, `$board`, `$gate`, `$cost`, `$agent` + node references |

### S5.5 — Data Pinning (n8n pattern)
| # | Task | File | Details |
|---|------|------|---------|
| 16 | usePinnedData hook | `src/hooks/usePinnedData.ts` | `pin(nodeId, data)`, `unpin(nodeId)`, `getPinnedData(nodeId)`. Stored in workflow canvas state. |
| 17 | Pin output button | Update `OutputPanel.tsx` | "Pin this output" → saves current output as test data. Shows "Pinned" badge on node. |
| 18 | Use pinned data in InputPanel | Update `InputPanel.tsx` | If parent has pinned data → show it instead of execution data. Badge: "Pinned data" |

**Deliverables**: Full workflow lifecycle (create → edit → save → compile → validate → publish → version). YAML editor. Data pinning.
**Tests**: Save persists canvas. Compile generates valid YAML. Publish transitions version. Pin/unpin works.
**Exit criteria**: User can save → compile → publish → run a workflow end-to-end.

---

## S6: Tool Registry & Resolution

**Goal**: Wire tool registry to real API. Add tool registration, version management, and resolution testing.

**Phase mapping**: Phase 6 (Tool Registry)

### S6.1 — API Wiring
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Tools API module | `src/api/tools.ts` | Wire all endpoints: `listTools`, `getTool`, `createTool`, `createVersion`, `publishVersion`, `deprecateVersion`, `submitTests`, `getTests`, `validateInputs`, `resolveTools` |
| 2 | Hooks update | `src/hooks/useTools.ts` | Add: `useCreateTool`, `useCreateVersion`, `usePublishVersion`, `useDeprecateVersion`, `useResolveTools` mutations |
| 3 | Pipeline API | `src/api/pipelines.ts` | `listPipelines`, `getPipeline`, `createPipeline`, `updatePipeline`, `deletePipeline` |

### S6.2 — Tool Registration Modal
| # | Task | File | Details |
|---|------|------|---------|
| 4 | Register tool modal | `src/components/tools/RegisterToolModal.tsx` | Step 1: Name, description, category, adapter. Step 2: Contract JSON editor (inputs/outputs). Step 3: Docker image, limits, sandbox. |
| 5 | Contract editor | `src/components/tools/ContractEditor.tsx` | Add/remove input ports and output ports. Per port: name, type (artifact/parameter/metric), required toggle, JSON Schema editor |
| 6 | Wire "Register Tool" button | Update `ToolRegistryPage.tsx` | Open modal → submit → refresh list |

### S6.3 — Version Management
| # | Task | File | Details |
|---|------|------|---------|
| 7 | Version management panel | `src/components/tools/VersionManagement.tsx` | List versions with status. Actions: Publish, Deprecate. Create new version form. |
| 8 | Version status transitions | UI flow | Draft → Publish button. Published → Deprecate button with message. Visual status badges. |
| 9 | Test results viewer | `src/components/tools/TestResultsViewer.tsx` | Table: test name, status (pass/fail), duration, message. Submit new test results form. |

### S6.4 — Resolution Tester
| # | Task | File | Details |
|---|------|------|---------|
| 10 | Resolution tester panel | `src/components/tools/ResolutionTester.tsx` | Input: intent_type, inputs, constraints. Output: recommended tool, alternatives, unavailable with diagnostics. |
| 11 | Score breakdown | `src/components/tools/ScoreBreakdown.tsx` | Per-tool: trust score, success rate, confidence, preference, cost penalty, time penalty → final score. Bar chart. |

**Deliverables**: Full tool CRUD, version lifecycle, contract editing, resolution testing.
**Tests**: Create tool → create version → publish → appears in registry. Resolution returns scored results.
**Exit criteria**: Register a new tool via UI → publish → resolve it for an intent type.

---

## S7: Agent Builder & Playground

**Goal**: Wire agent CRUD and playground to real APIs. Build the agent spec editor (n8n Agent Builder equivalent).

**Phase mapping**: Phase 5 (Agent Playground)

### S7.1 — API Wiring
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Agents API module | `src/api/agents.ts` | `listAgents`, `getAgent`, `createAgent`, `deleteAgent`, `createVersion`, `listVersions`, `getVersion`, `validateVersion`, `publishVersion`, `runAgent` |
| 2 | Sessions API module | `src/api/sessions.ts` | `createSession`, `getSession`, `sendMessage`, `approveAction`, `closeSession` — wire to real `/v0/agents/{id}/sessions/` endpoints |
| 3 | Memory API module | `src/api/agentMemory.ts` | `createMemory`, `listMemories`, `deleteMemory` |
| 4 | Agent hooks | `src/hooks/useAgents.ts` | `useAgentList`, `useAgent`, `useCreateAgent`, `useAgentVersions`, `usePublishAgentVersion` |
| 5 | Update playground hooks | `src/hooks/useAgentPlayground.ts` | Wire existing hooks to real API endpoints instead of mock-only |

### S7.2 — Agent Builder (Spec Editor)
| # | Task | File | Details |
|---|------|------|---------|
| 6 | Agent spec form | `src/components/agents/builder/AgentSpecForm.tsx` | Goal textarea, model selector (provider + model + weight slider), tools table (add/remove with permissions), scoring strategy, constraints (budget, timeout, max retries) |
| 7 | Tool permissions table | `src/components/agents/builder/ToolPermissionsTable.tsx` | Columns: Tool (selector), Version, Permissions (checkboxes: read/write/execute), Max Invocations. Add/remove rows. |
| 8 | Policy editor | `src/components/agents/builder/PolicyEditor.tsx` | Auto-approve threshold slider (0.0-1.0), require approval for checkboxes, escalation rules list (condition → action) |
| 9 | Scoring config | `src/components/agents/builder/ScoringConfig.tsx` | Strategy dropdown (weighted/priority/cost_optimized). Weight sliders: compatibility, trust, cost. LLM weight slider (0-1) |
| 10 | Version management | `src/components/agents/builder/AgentVersionPanel.tsx` | Version list, validate button, publish button. Status badges. |

### S7.3 — Memory Management
| # | Task | File | Details |
|---|------|------|---------|
| 11 | Memory browser | `src/components/agents/memory/MemoryBrowser.tsx` | List memories: type badge (fact/preference/lesson/error_pattern), content preview, tags, relevance score, source run link. Filter by type. |
| 12 | Memory detail | `src/components/agents/memory/MemoryDetail.tsx` | Full content, tags editor, relevance slider, delete button |
| 13 | Create memory form | `src/components/agents/memory/CreateMemoryForm.tsx` | Type selector, content textarea, tags input, relevance slider |

### S7.4 — Wire Builder Page
| # | Task | File | Details |
|---|------|------|---------|
| 14 | Update AgentStudioPage | `src/pages/AgentStudioPage.tsx` | Builder tab: wire AgentSpecForm. Playground tab: existing chat. Memory tab: MemoryBrowser. Versions in sidebar. |
| 15 | Update AgentsPage | `src/pages/AgentsPage.tsx` | Wire to `useAgentList` real API. Create agent modal → API call. |

**Deliverables**: Full agent CRUD, spec editor, policy config, memory management, version lifecycle.
**Tests**: Create agent → edit spec → validate → publish. Memory CRUD works.
**Exit criteria**: Build a complete agent spec with goal, tools, policy, constraints → publish → see in agent list.

---

## S8: Agent Execution & Sessions

**Goal**: Run agents, handle proposals/approvals, real-time decision trace, session management with SSE.

**Phase mapping**: Phase 5 completion

### S8.1 — Agent Execution Flow
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Run agent hook | `src/hooks/useRunAgent.ts` | `useRunAgent(agentId, version)`: dry_run=true → preview proposal. dry_run=false → execute. Returns `{proposal, decision, run}` |
| 2 | Proposal viewer | `src/components/agents/execution/ProposalViewer.tsx` | Display ActionProposal: actions table (tool, score, cost, justification), dependencies DAG, total score, estimated cost |
| 3 | Policy decision display | `src/components/agents/execution/PolicyDecisionDisplay.tsx` | Overall verdict badge (approved/needs_approval/blocked). Per-action decisions with rule name and reason |
| 4 | Approval flow | `src/components/agents/execution/ApprovalFlow.tsx` | If `needs_approval`: show pending actions → Approve/Reject buttons → `POST /v0/approvals/{id}/approve` |

### S8.2 — Session Chat with Real API
| # | Task | File | Details |
|---|------|------|---------|
| 5 | Wire chat to sessions API | Update `ChatInterface.tsx` | `sendMessage` → `POST /v0/agents/{id}/sessions/{sid}/messages`. Response includes tool proposals and agent reasoning. |
| 6 | SSE for sessions | `src/hooks/useSessionSSE.ts` | Connect to run SSE when agent dispatches tools. Update decision trace in real time. |
| 7 | Update decision trace | Update `DecisionTraceTimeline.tsx` | Wire to real API. Real-time updates via SSE. Steps: context_gather → tool_search → scoring → proposal → policy_check → dispatch → result_eval |
| 8 | Update live metrics | Update `LiveMetrics.tsx` | Wire to real API. Iterations from execution. Cost from run. Budget from agent constraints. |

### S8.3 — Eval Runner UI
| # | Task | File | Details |
|---|------|------|---------|
| 9 | Eval tab | `src/components/agents/eval/EvalTab.tsx` | Test case list, "Run All" button, results table (per-case: status, score, cost, tools used) |
| 10 | Eval case editor | `src/components/agents/eval/EvalCaseEditor.tsx` | Define test: inputs, expected output criteria (min_score, max_cost, max_actions, required_tools) |
| 11 | Eval summary | `src/components/agents/eval/EvalSummary.tsx` | Overall: total, passed, failed, pass rate, avg score, avg cost. Bar chart. |

**Deliverables**: Full agent execution with proposals, approvals, real-time sessions, eval runner.
**Tests**: Dry run shows proposal. Approval flow works. Session messages round-trip. Evals execute.
**Exit criteria**: Chat with agent → see proposal → approve → watch tool execution → see results.

---

## S9: Board Governance Foundation

**Goal**: Create the board data layer (API, types, store, hooks) and board CRUD pages wired to real API.

**Phase mapping**: New — fills the biggest gap

### S9.1 — Board Data Layer (currently zero)
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Board API module | `src/api/boards.ts` | `listBoards`, `getBoard`, `createBoard`, `updateBoard`, `deleteBoard`, `getBoardSummary`, `escalateMode`, `createFromIntent`, `listChildren`, `getEvidenceDiff`, `getTriage`, `getReproducibility` |
| 2 | Card API module | `src/api/cards.ts` | `listCards`, `getCard`, `createCard`, `updateCard`, `deleteCard`, `addDependency`, `removeDependency`, `listCardRuns`, `addEvidence`, `listEvidence`, `getReadyCards`, `getDependencyGraph` |
| 3 | Gate API module | `src/api/gates.ts` | `listGates`, `getGate`, `createGate`, `addRequirement`, `listRequirements`, `evaluateGate`, `approveGate`, `rejectGate`, `waiveGate`, `listApprovals` |
| 4 | Intent API module | `src/api/intents.ts` | `listIntents`, `getIntent`, `createIntent`, `updateIntent`, `lockIntent`, `deleteIntent`, `getIntentType`, `listIntentTypes` |
| 5 | Plan API module | `src/api/plans.ts` | `generatePlan`, `getPlan`, `editPlan`, `validatePlan`, `compilePlan`, `executePlan` |
| 6 | Board store | `src/store/boardStore.ts` | `boards[]`, `activeBoard`, `cards[]`, `gates[]`, `intents[]`, `activePlan`. Actions for CRUD + selection. |
| 7 | Board hooks | `src/hooks/useBoards.ts` | `useBoardList`, `useBoard`, `useCreateBoard`, `useBoardSummary`, `useEscalateMode` |
| 8 | Card hooks | `src/hooks/useCards.ts` | `useCardList`, `useCard`, `useCreateCard`, `useCardEvidence`, `useCardGraph` |
| 9 | Gate hooks | `src/hooks/useGates.ts` | `useGateList`, `useGate`, `useEvaluateGate`, `useApproveGate`, `useWaiveGate` |
| 10 | Vertical API | `src/api/verticals.ts` | `listVerticals`, `getVertical`, `listBoardTypes`, `listGateTypes`, `listIntentTypes` |

### S9.2 — Board Pages Wired to API
| # | Task | File | Details |
|---|------|------|---------|
| 11 | Update BoardsPage | `src/pages/BoardsPage.tsx` | Wire to `useBoardList`. Real board cards. Mode filter (explore/study/release). Create board button. |
| 12 | Update CreateBoardPage | `src/pages/CreateBoardPage.tsx` | Wire to `useCreateBoard`. Vertical selector from `useVerticals`. Board type from API. Gate type configuration. |
| 13 | Board from intent flow | `src/components/boards/CreateFromIntentModal.tsx` | Intent type selector → goal → governance level → creates board + intent + auto-gates |

### S9.3 — Board Detail Foundation
| # | Task | File | Details |
|---|------|------|---------|
| 14 | Update BoardDetailPage | `src/pages/BoardDetailPage.tsx` | Wire to `useBoard`, `useBoardSummary`. Real data for header, readiness gauge, mode badge. |
| 15 | Readiness gauge | `src/components/boards/ReadinessGauge.tsx` | Circular or bar gauge showing overall readiness %. Breakdown: design, validation, compliance, manufacturing, approvals |
| 16 | Mode badge & escalation | `src/components/boards/ModeBadge.tsx` | Current mode with escalation button. Confirmation modal for escalation. Shows mode config (gates, pinning, approvals) |

**Deliverables**: Complete board data layer (5 API modules, 1 store, 4 hook files). Board pages wired to real API.
**Tests**: Board list fetches from API. Create board persists. Board detail shows real summary.
**Exit criteria**: Create board → see it in list → open detail → see real readiness score.

---

## S10: Board Cards, Plans & Evidence

**Goal**: The full governance workflow — create cards, define intents, generate plans, execute, collect evidence, evaluate gates.

**Phase mapping**: Extends S9 with the core governance flow

### S10.1 — Card Management
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Card list component | `src/components/boards/cards/CardList.tsx` | Ordered cards with status badges, KPI summary, drag to reorder |
| 2 | Card detail panel | `src/components/boards/cards/CardDetail.tsx` | Title, description, status, KPIs (metric + target + actual + pass/fail), linked runs, evidence list |
| 3 | Create card modal | `src/components/boards/cards/CreateCardModal.tsx` | Card type selector (analysis/comparison/sweep/agent/gate/milestone), intent type, title, KPI definitions |
| 4 | Card dependency graph | `src/components/boards/cards/CardDependencyGraph.tsx` | ReactFlow mini-graph of card dependencies. Add/remove dependencies. Cycle detection warning. |
| 5 | Card status transitions | `src/components/boards/cards/CardStatusFlow.tsx` | Visual state machine. Buttons to advance status (draft→ready→queued, etc.) |

### S10.2 — Intent & Plan Flow
| # | Task | File | Details |
|---|------|------|---------|
| 6 | Intent spec editor | `src/components/boards/intents/IntentSpecEditor.tsx` | Goal textarea, input list (name, type, required, artifact ref), acceptance criteria table (metric, operator, threshold, unit), governance level selector |
| 7 | Lock intent flow | `src/components/boards/intents/LockIntentButton.tsx` | Validate inputs → lock → show locked badge. Cannot edit after lock. |
| 8 | Plan viewer | `src/components/boards/plans/PlanViewer.tsx` | DAG of plan nodes (ReactFlow mini-canvas). Node roles: validate_input, preprocess, solve, postprocess, report, evidence, approval |
| 9 | Plan editor | `src/components/boards/plans/PlanEditor.tsx` | Edit parameters (within tool contract bounds), insert/remove optional nodes, skip governance nodes warning |
| 10 | Preflight validation display | `src/components/boards/plans/PreflightResult.tsx` | Blockers (red) vs suggestions (yellow). Click blocker → highlight node |
| 11 | Execute plan button | `src/components/boards/plans/ExecutePlanButton.tsx` | Validate first → compile → start run → navigate to run monitor. Progress bar. |

### S10.3 — Evidence & Gate Management
| # | Task | File | Details |
|---|------|------|---------|
| 12 | Evidence panel | `src/components/boards/evidence/EvidencePanel.tsx` | List evidence for card: metric, value, unit, evaluation (pass/fail/warning), source run, source artifact. Filter by run. |
| 13 | Manual evidence form | `src/components/boards/evidence/AddEvidenceForm.tsx` | Metric key, value, unit, artifact selector. For manual evidence submission. |
| 14 | Gate panel | `src/components/boards/gates/GatePanel.tsx` | Gate name, type, status. Requirements checklist with satisfied/unsatisfied. Actions: Evaluate, Approve, Reject, Waive |
| 15 | Gate requirement editor | `src/components/boards/gates/RequirementEditor.tsx` | Add requirement: type (run_succeeded, artifact_exists, role_signed, metric_threshold), config |
| 16 | Approval flow | `src/components/boards/gates/ApprovalFlow.tsx` | Approve (with role), Reject (with rationale), Waive (with rationale — audit trail). History of approvals. |
| 17 | Evidence diff viewer | `src/components/boards/evidence/EvidenceDiffViewer.tsx` | Compare two boards: improved/degraded/unchanged/new/removed per metric. Color-coded table. |

### S10.4 — Full Board Flow Assembly
| # | Task | File | Details |
|---|------|------|---------|
| 18 | Board detail tabs | Update `BoardDetailPage.tsx` | Tabs: Overview (readiness, summary), Cards (list + detail), Gates (list + approvals), Evidence (cross-card view), History (audit trail) |
| 19 | Card → Plan → Run → Evidence flow | Integration | End-to-end: create card → define intent → generate plan → validate → execute → evidence collected → gate evaluated |

**Deliverables**: Full governance workflow UI. Card CRUD, intent editing, plan generation/execution, evidence tracking, gate management.
**Tests**: Create card → generate plan → execute → evidence appears → gate passes.
**Exit criteria**: Complete explore → study → release flow demonstrable.

---

## S11: Cross-Domain Integration

**Goal**: Connect all domains — workflow execution feeds into board evidence, agent decisions show in governance, tools are discoverable in workflow editor.

**Phase mapping**: Phase 7 (Integration) part 1

### S11.1 — Workflow → Board Integration
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Link run to card | `src/components/boards/cards/LinkRunModal.tsx` | Select a run from run list → `POST /v0/cards/{id}/runs` → evidence auto-collected |
| 2 | Evidence from runs | Automatic | When linked run completes, EvidenceCollector extracts metrics. Frontend polls for new evidence. |
| 3 | "Run from Card" button | `src/components/boards/cards/RunFromCardButton.tsx` | Generate plan → validate → execute → auto-link run to card |

### S11.2 — Tool → Workflow Integration
| # | Task | File | Details |
|---|------|------|---------|
| 4 | "Use in Workflow" deep link | Update `ToolRegistryActionBar.tsx` | Navigate to `/workflow-studio` with `?addTool={toolId}`. Canvas auto-creates tool node. |
| 5 | Tool palette from registry | Update `NodePalette.tsx` | Tools section populated from `toolTypesStore`. Shows real registered tools, not just mock data. |
| 6 | Tool contract in NDV | Update `NodeInspector.tsx` | When tool node selected, fetch real contract from API → generate parameter form dynamically |

### S11.3 — Agent → Workflow Integration
| # | Task | File | Details |
|---|------|------|---------|
| 7 | Agent node in workflows | Update `AgentNode.tsx` | Agent node config: select agent + version. Sub-ports populated from agent spec (model, tools, policy, memory). |
| 8 | Agent run results in workflow | Integration | When agent node in workflow executes, agent proposals and decisions visible in NDV output panel |

### S11.4 — Navigation & Breadcrumbs
| # | Task | File | Details |
|---|------|------|---------|
| 9 | Cross-screen navigation | `src/components/layout/Breadcrumb.tsx` | Dashboard → Workflows → Workflow X → Run Y. Boards → Board X → Card Y → Plan → Run Z. |
| 10 | Deep links from dashboard | Update `DashboardPage.tsx` | Active runs → click → run detail. Recent workflows → click → editor. Governance → click → board detail. |
| 11 | Notification center | `src/components/layout/NotificationCenter.tsx` | Gate needs approval, run completed, run failed, agent escalated. Click to navigate. |

### S11.5 — Search
| # | Task | File | Details |
|---|------|------|---------|
| 12 | Global search (Cmd+K) | `src/components/layout/GlobalSearch.tsx` | Search across workflows, agents, tools, boards, runs. Categorized results. Keyboard navigation. |

**Deliverables**: All domains connected. Navigation flows work end-to-end. Global search.
**Tests**: Dashboard → workflow → run → back works. Tool "Use in Workflow" creates node. Card run produces evidence.
**Exit criteria**: Demo the full user journey: create board → create card → generate plan → execute → evidence → gate → escalate.

---

## S12: Polish, Performance & Dark Mode

**Goal**: Production readiness — bundle optimization, error handling, accessibility, responsive layout, dark mode.

**Phase mapping**: Phase 7 (Integration) part 2

### S12.1 — Performance
| # | Task | File | Details |
|---|------|------|---------|
| 1 | Lazy-load heavy pages | All pages | React.lazy + Suspense for: WorkflowEditorPage, WorkflowRunsPage, AgentPlaygroundPage, BoardDetailPage |
| 2 | Lazy-load 3D/heavy libs | Vite config | Dynamic import for CodeMirror, ReactFlow (already chunked). Verify chunks in build output. |
| 3 | Bundle analysis | `vite.config.ts` | Add `rollup-plugin-visualizer`. Target: main bundle <500KB gzipped. |
| 4 | React Query optimization | All hooks | Verify staleTime, gcTime, refetchInterval are appropriate. Add `select` for minimal re-renders. |
| 5 | Virtualized lists | Long lists | Use `@tanstack/react-virtual` for: execution list (100+ runs), log viewer (10K+ lines), evidence list |

### S12.2 — Error Handling
| # | Task | File | Details |
|---|------|------|---------|
| 6 | ErrorBoundary per domain | All pages | Wrap each page in ErrorBoundary with "Something went wrong" + retry button |
| 7 | API error toasts | `src/hooks/useApiError.ts` | Global error handler: 4xx → descriptive toast. 5xx → "Server error, retrying...". Network error → "Connection lost". |
| 8 | Loading skeletons | All pages | Skeleton components matching final layout. Shown during initial load. |
| 9 | Empty states | All lists | "No workflows yet" / "No runs found" / "No agents configured" with action buttons |
| 10 | Offline indicator | `src/components/layout/OfflineBar.tsx` | Yellow bar when API unreachable. "Running with cached data. Reconnecting..." |

### S12.3 — Accessibility
| # | Task | File | Details |
|---|------|------|---------|
| 11 | ARIA labels | All interactive | `aria-label` on buttons, panels, tabs, modals. `role` on landmark regions. |
| 12 | Keyboard navigation | Canvas, NDV, lists | Tab order through palette → canvas → inspector. Escape closes panels. Arrow keys in lists. |
| 13 | Focus management | Panels, modals | Focus trapped in modals. Focus moves to panel on open. Focus returns on close. |
| 14 | Screen reader testing | Manual | Test with VoiceOver. Fix any unlabeled interactive elements. |

### S12.4 — Responsive & Dark Mode
| # | Task | File | Details |
|---|------|------|---------|
| 15 | Responsive sidebar | `src/components/layout/Sidebar.tsx` | Collapse to icons at <1400px. Full collapse at <1280px. |
| 16 | Responsive panels | Inspector, NDV | Stack vertically on narrow screens. Minimum content width. |
| 17 | Dark mode CSS variables | `src/styles/dark.css` | Define dark variants for all design tokens. `prefers-color-scheme` media query + manual toggle. |
| 18 | Dark mode verification | All components | Verify every component respects theme tokens. Fix hardcoded colors. |

### S12.5 — Documentation & Handoff
| # | Task | File | Details |
|---|------|------|---------|
| 19 | API integration guide | `doc/API_INTEGRATION.md` | How each frontend module maps to backend endpoints. Mock mode vs real mode. |
| 20 | Component catalog | Storybook or doc | Key components with props documentation. Usage examples. |

**Deliverables**: Production-ready frontend with <500KB bundle, full error handling, accessibility, dark mode.
**Tests**: Lighthouse score >90. No WCAG AA violations. Dark mode renders correctly. Bundle under budget.
**Exit criteria**: Ship to staging. Demo full user journey in dark mode with no errors.

---

## Sprint Metrics & Exit Criteria Summary

| Sprint | Key Metric | Exit Gate |
|--------|-----------|-----------|
| S1 | 5 stores compile, SSE hook works | `useRunSSE('test')` connects |
| S2 | 7 node types render on canvas | Build 5-node workflow visually |
| S3 | Parameter form auto-generates | Click node → edit form → canvas updates |
| S4 | SSE events animate nodes | Run → watch nodes execute in real time |
| S5 | Full lifecycle | Save → compile → publish → run end-to-end |
| S6 | Tool CRUD works | Register tool → publish → appears in palette |
| S7 | Agent spec saved | Build agent spec → validate → publish |
| S8 | Agent chat works | Chat → proposal → approve → tool executes |
| S9 | Board CRUD works | Create board → see readiness score |
| S10 | Governance flow | Card → plan → run → evidence → gate pass |
| S11 | Full journey | Dashboard → workflow → run → board → release |
| S12 | Production ready | <500KB, dark mode, accessibility, error handling |

---

## New Files Created Per Sprint

| Sprint | New Files | Modified Files | Total |
|--------|-----------|---------------|-------|
| S1 | ~15 (types, stores, utils, hooks) | ~5 | ~20 |
| S2 | ~18 (nodes, canvas, palette, hooks) | ~3 | ~21 |
| S3 | ~16 (NDV, parameter forms, panels) | ~3 | ~19 |
| S4 | ~14 (runs, SSE, overlay, tabs) | ~5 | ~19 |
| S5 | ~10 (YAML, versioning, pinning) | ~8 | ~18 |
| S6 | ~8 (registration, resolution, versions) | ~5 | ~13 |
| S7 | ~12 (builder, memory, spec form) | ~4 | ~16 |
| S8 | ~8 (execution, proposals, evals) | ~6 | ~14 |
| S9 | ~14 (API modules, store, hooks, pages) | ~4 | ~18 |
| S10 | ~17 (cards, plans, evidence, gates) | ~3 | ~20 |
| S11 | ~6 (search, nav, notifications) | ~12 | ~18 |
| S12 | ~6 (dark mode, a11y, docs) | ~20 | ~26 |
| **Total** | **~144** | **~78** | **~222** |

---

## Dependency Graph (What Blocks What)

```
S1 (Foundation)
├── S2 (Canvas) → S3 (NDV) → S4 (SSE/Runs) → S5 (Compile/YAML)
├── S6 (Tools) ─────────────────────────────────────────┐
├── S7 (Agent Builder) → S8 (Agent Execution) ─────────┤
└── S9 (Board Foundation) → S10 (Cards/Plans/Evidence) ─┤
                                                         │
                                                    S11 (Integration)
                                                         │
                                                    S12 (Polish)
```

**Critical path**: S1 → S2 → S3 → S4 → S5 → S11 → S12 (8 weeks sequential for workflows)

**Parallel tracks** (can run simultaneously after S1):
- Track A: S2 → S3 → S4 → S5 (Workflows, 4 weeks)
- Track B: S6 (Tools, 1 week)
- Track C: S7 → S8 (Agents, 2 weeks)
- Track D: S9 → S10 (Boards, 2 weeks)

**With 2 developers**: 8 weeks. **With 4 developers**: 6 weeks. **Solo**: 12 weeks.

---

*This sprint plan is the execution blueprint. Each sprint maps to existing roadmap phases, fills documented gaps, and adopts n8n patterns where specified in AIRAIE_N8N_WORKFLOW_MAPPING.md.*
