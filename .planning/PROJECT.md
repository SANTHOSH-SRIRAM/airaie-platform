# AirAIE Platform v2 Frontend

## Vision

Rebuild the AirAIE platform frontend from its current v1 scaffold into a production-grade unified platform matching the v2 Figma design. The platform serves engineers, researchers, and scientists who use governed engineering workflows across Engineering, Science, Technology, and Mathematics verticals.

## Problem

The v1 frontend has basic scaffolding (15 UI primitives, layout shell, routing, Zustand/React Query setup) but lacks real functionality. Pages like Dashboard are empty skeletons. Studio embedding is iframe-only. There is no workflow editor, no agent playground, no tool registry, no live execution monitoring. The v2 Figma design defines a complete, opinionated UI for all of these.

## Key Decisions

### Centralized UI Controller (Shell + State)
- **Unified AppShell**: Single layout component controlling sidebar, top nav, right inspector panel, bottom action bar, and vertical toolbar across ALL screens
- **Centralized UI State**: One Zustand store managing all panel visibility, sidebar state, active tabs, inspector content, modal stack, and navigation context
- **No per-page layout duplication**: Pages provide only their content zone; shell handles chrome

### Architecture
- **Tech Stack**: React 19 + TypeScript + Tailwind CSS + Vite (existing, no changes)
- **State**: Zustand 5 (UI state) + React Query 5.62 (server state)
- **Backend Proxy**: `/api` and `/v0` -> `http://localhost:8080`
- **Existing path aliases**: `@/`, `@components/`, `@pages/`, `@hooks/`, `@api/`, `@store/`

### Design System
- Keep existing CSS variable token system (tokens.css)
- Keep existing Tailwind config mapping
- Keep IBM Plex Sans / IBM Plex Mono fonts
- Extend with new component patterns from v2 design

## Source of Truth

- **Figma file**: https://www.figma.com/design/SnoKbaKM3fDeqIIDXHMkES/airaie
- **Existing v1 code**: `/Users/santhosh/airaie/airaie_platform/frontend/`
- **Design system docs**: `doc/implementation/CENTRALIZED_UI_DESIGN_SYSTEM.md`

## Screens (from Figma v2)

1. **Dashboard** — Stats cards, active runs, recent workflows, agent activity, governance alerts, system status bar
2. **Workflow Editor** — Visual DAG builder, node palette sidebar, properties panel, Run/Chat actions
3. **Workflow Runs** — Execution list, live DAG with node status, log viewer with Logs/Artifacts/Cost/Timeline tabs, node metrics
4. **Agent Playground** — Chat interface, tool call proposals with confidence scores, decision trace inspector, live metrics
5. **Tool Registry** — Filterable card grid, version history, tool contract (inputs/outputs), execution config, sandbox policy
6. **Boards** — (Design pending — 6th Figma screen not captured)

## Constraints

- Must reuse existing v1 infrastructure (Vite config, proxy, design tokens, routing)
- Studios (board-studio, workflow-studio, agent-studio) run on separate ports; embed via StudioFrame where needed
- Backend API at localhost:8080 — frontend must handle API not being ready gracefully
- Bundle size target: <500KB gzipped main bundle; heavy libs (ReactFlow, recharts) lazy-loaded
