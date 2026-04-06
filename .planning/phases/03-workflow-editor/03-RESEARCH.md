# Phase 3: Workflow Editor — Research

**Researched:** 2026-04-01
**Status:** Complete

## Key Findings

1. **ReactFlow NOT installed** — `@xyflow/react` must be added. Need lazy-load chunk in vite.config.
2. **WorkflowsPage exists** as management dashboard (list view), NOT an editor. External studio on port 3001 via iframe.
3. **Workflow types exist** in `src/types/workflow.ts` (Workflow, WorkflowStep, WorkflowTrigger) but need ReactFlow extensions.
4. **API layer empty** — no `api/workflows.ts`. Endpoints defined in constants but not implemented.
5. **Route `/workflow-studio`** already maps to `sidebarContentType: 'nodePalette'` — replace iframe with native editor.
6. **Phase 1 zones ready** — SidebarContentRouter has `sidebar-node-palette` placeholder, RightPanel body empty, BottomBar has slots.

## Architecture Decision

Replace `/workflow-studio` iframe with native ReactFlow editor. The ROUTE_SIDEBAR_MAP already switches sidebar to 'nodePalette' on this route.

## What Needs Building

| Component | Location | Notes |
|-----------|----------|-------|
| `@xyflow/react` install | package.json | + vite manual chunk |
| `workflowStore.ts` | src/store/ | Nodes, edges, selected node, unsaved flag |
| `WorkflowCanvas.tsx` | src/components/workflows/ | ReactFlow canvas with custom nodes |
| `NodePalette.tsx` | src/components/workflows/ | Mount in SidebarContentRouter 'nodePalette' slot |
| Custom node components | src/components/workflows/nodes/ | TriggerNode, ToolNode, AgentNode |
| `NodePropertiesPanel.tsx` | src/components/workflows/ | Mount in RightPanel when node selected |
| `WorkflowEditorTopBar.tsx` | src/components/workflows/ | Pipeline name, version, Editor/Runs/Eval tabs, Save/Publish |
| `WorkflowEditorBottomBar.tsx` | src/components/workflows/ | Run Workflow, Chat, node count |
| `api/workflows.ts` | src/api/ | CRUD operations with mock fallback |
| `hooks/useWorkflow.ts` | src/hooks/ | React Query hooks |
| Conversion utils | src/utils/ | API format ↔ ReactFlow nodes/edges |

## Constraints

- ReactFlow ~150-200KB — MUST lazy-load via dynamic import + vite chunk
- Existing `WorkflowStep` type has `position: {x, y}` and `connections: string[]` — can map to ReactFlow
- Canvas should handle 50-100 nodes before perf issues
- Node palette categories: Triggers, Tools, Agents, Logic, Governance, Data
