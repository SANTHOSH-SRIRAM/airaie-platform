---
phase: 06-tool-registry
plan: 01
status: complete
completed_date: 2026-04-22
---

# Summary: Types, API, Hooks, Filter Sidebar, and Tool Cards

## What Was Built

All Wave 1 deliverables for the Tool Registry are complete and verified in the codebase.

### Files Delivered

| File | Lines | Notes |
|------|-------|-------|
| `frontend/src/types/tool.ts` | 170 | `ToolStatus`, `ToolVersion`, `ToolContract`, `ToolContractFull`, `ToolFilter`, `Tool`, `ToolLimits`, `ToolSandboxPolicy`, `TrustLevel` types; re-exported from `types/index.ts` |
| `frontend/src/api/tools.ts` | 322 | Real API layer calling `/v0/tools` and `/v0/tools/:id`; normalizes backend snake_case to camelCase; also includes resolution, contract, and run endpoints |
| `frontend/src/hooks/useTools.ts` | 203 | `useTools()` with client-side filter/sort via `applyFilters`; `useTool(id)` for single tool; additional hooks for contract, runs, resolution, lint |
| `frontend/src/store/toolRegistryStore.ts` | 34 | Zustand store with `selectedToolId`, `filterStatus`, `filterCategory`, `filterAdapter`, `search`, `sortBy`; `selectTool`, `toggleStatus`, `toggleCategory`, `toggleAdapter`, `setSearch`, `setSortBy`, `clearFilters` |
| `frontend/src/components/tools/FilterSidebar.tsx` | 168 | Checkbox groups for Status, Category, Adapter with live counts; Sort By selector; "Clear all" link; "Last sync" footer text |
| `frontend/src/components/tools/ToolCard.tsx` | 108 | Icon, name, description, version badge, adapter/category tags, usage stats row; selected state border highlight; `data-testid="tool-card"` |
| `frontend/src/components/tools/ToolCardGrid.tsx` | 92 | 2-column grid of ToolCard; loading skeleton; "No tools match your filters" empty state; `data-testid="tool-card-grid"` |
| `frontend/src/pages/ToolRegistryPage.tsx` | 536 | Full page with ToolCardGrid; sets sidebar to `'filters'`, bottom bar to `'tool-registry'` on mount; includes ToolRegistryTopBar inline |

## Deviations from Plan

### 1. Store field naming differs from plan spec
- Plan specified: `toggleStatusFilter`, `toggleCategoryFilter`, `toggleAdapterFilter`, `setSearchQuery` (and a wrapping `ToolFilter` interface in the store).
- Implementation uses: `toggleStatus`, `toggleCategory`, `toggleAdapter`, `setSearch`, `filterStatus`, `filterCategory`, `filterAdapter`.
- All downstream components (FilterSidebar, ToolCardGrid) use these same names consistently. Functionally equivalent.

### 2. API uses real backend — no MOCK_TOOLS
- Plan specified a `MOCK_TOOLS` array with 14 hard-coded tools and a `tryApiOrMock` fallback pattern.
- Implementation calls the real `/v0/tools` API endpoint. When the backend is unavailable, the error propagates (no silent mock fallback).
- This is a production improvement over the mock-first plan spec.

### 3. `types/tool.ts` has extended type set
- Beyond the plan's spec, the types file also includes `ToolContractFull`, `ContractPort`, `ContractValidationResult`, `TrustLevel`, `ToolDetail`, `ToolRunEntry`, `ToolDetailVersion`, `ResolutionResult`, `ResolutionStrategy` for the richer tool registry feature set built via quick tasks.

All core must-haves (types, API, hooks, store, FilterSidebar, ToolCard, ToolCardGrid, ToolRegistryPage) are fully satisfied.
