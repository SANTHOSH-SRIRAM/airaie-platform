# Phase 7 Integration Checklist

## Navigation Flows
- [ ] Dashboard "View All" on Active Runs -> navigates to /workflow-runs
- [ ] Dashboard "View All" on Recent Workflows -> navigates to /workflows
- [ ] Dashboard "View All" on Agent Activity -> navigates to /agents
- [ ] Dashboard "View All" on Governance -> navigates to /boards
- [ ] Click active run row -> navigates to /workflow-runs/:runId
- [ ] Click recent workflow row -> navigates to /workflow-studio/:workflowId
- [ ] Tool Registry "Use in Workflow" -> navigates to /workflow-studio?tool=:toolId
- [ ] Browser back/forward buttons work across all transitions

## Error Handling
- [ ] ErrorBoundary wraps every page route in App.tsx
- [ ] Dashboard stats shows error state with retry when API fails
- [ ] Active Runs widget shows error state with retry
- [ ] Recent Workflows widget shows error state with retry
- [ ] Agent Activity widget shows error state with retry
- [ ] Governance widget shows error state with retry
- [ ] ErrorBoundary retry button re-renders the page

## Loading States
- [ ] Lazy-loaded pages show PageSkeleton while loading
- [ ] Dashboard stats show skeleton while loading
- [ ] All dashboard widgets show skeleton while loading

## Performance
- [ ] `npx vite build` main chunk < 500KB gzipped
- [ ] ReactFlow in separate chunk (reactflow chunk)
- [ ] recharts in separate chunk (ui chunk)
- [ ] WorkflowEditorPage, WorkflowRunsPage, AgentPlaygroundPage, ToolRegistryPage are lazy-loaded
- [ ] React.memo on RunRow, WorkflowRow, ActivityRow, StudyRow, LogLine, ToolCard

## Responsive Layout
- [ ] Sidebar auto-collapses when window < 1280px
- [ ] Sidebar can be manually expanded/collapsed at any width
- [ ] Right panel resizable between 260px and 600px
- [ ] Main content area scrollable when content exceeds viewport

## Accessibility
- [ ] Skip-to-content link visible on Tab, focuses main content
- [ ] Sidebar has aria-label
- [ ] Right panel has role="complementary" and aria-label
- [ ] Bottom bar has role="toolbar" and aria-label
- [ ] Vertical toolbar has role="toolbar" and aria-label
- [ ] Search input has aria-label="Search"
- [ ] Escape key closes right panel
- [ ] Right panel receives focus when opened

## Dark Mode
- [ ] No `bg-white` in dashboard widgets (use bg-card-bg)
- [ ] No `bg-white` in layout chrome (use bg-surface)
- [ ] No `bg-white` in workflow components
- [ ] Toggle to dark mode: all text readable
- [ ] Toggle to dark mode: all borders visible
- [ ] Toggle to dark mode: sidebar stays dark (unchanged)
- [ ] Toggle to dark mode: stat cards render correctly
- [ ] System theme preference is respected when set to "system"
