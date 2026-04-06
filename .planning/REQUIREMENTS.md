# Requirements: AirAIE Platform v2 Frontend

## Notation
- **REQ-XX**: Functional requirement
- **NFR-XX**: Non-functional requirement
- Priority: P0 (must have), P1 (should have), P2 (nice to have)

---

## Centralized UI Controller

### REQ-01: Unified AppShell (P0)
Single layout shell that renders: top navigation bar, collapsible left sidebar, main content zone, optional right inspector panel, optional bottom action bar, and right vertical icon toolbar. All screens share this shell — no per-page layout duplication.

### REQ-02: Top Navigation Bar (P0)
Horizontal nav with: AIRAIE logo (left), page tabs (Dashboard, Workflows, Agents, Tools, Boards), search bar with Cmd+K shortcut, notification bell, user avatar. Active tab has underline indicator.

### REQ-03: Centralized UI State Store (P0)
Single Zustand store managing: sidebar collapsed/expanded, sidebar content type (navigation/nodes/sessions/filters), right panel visible/hidden, right panel content, bottom bar visible/actions, active page/tab, modal stack. All panels respond to route changes.

### REQ-04: Right Vertical Toolbar (P1)
Persistent vertical icon strip on the right edge of every screen. Icons for: inspector toggle, search, zoom, code view, settings. Context-sensitive — icons change per screen.

---

## Dashboard

### REQ-10: Dashboard Stats Cards (P0)
Four metric cards at top: Workflows (count + active), Agents (count + decisions today), Runs (7-day count + success rate), Boards (count + pending approval). Each card has an icon, number, and subtitle.

### REQ-11: Active Runs Widget (P0)
List of currently running workflows with: run ID, node progress (e.g., "3/5 nodes"), elapsed time, cost. Progress bar visualization. Link to run detail.

### REQ-12: Recent Workflows Widget (P0)
List of recent workflows with: name, version, status dot (published/draft), node count, relative timestamp. Click navigates to workflow editor.

### REQ-13: Agent Activity Widget (P1)
Live feed of agent actions: agent name, action (selected tool, escalated), confidence score badge, timestamp. "View All" link.

### REQ-14: Governance Widget (P1)
Governance studies/boards requiring attention: name, gate progress (e.g., "2/4 gates passed"), approval status badge, action buttons (Study/Explore/Review).

### REQ-15: System Status Bar (P1)
Bottom bar showing: system operational status, API latency, NATS connection, runner slots (used/total), storage usage.

---

## Workflow Editor

### REQ-20: Visual DAG Editor (P0)
Interactive node graph using ReactFlow (@xyflow/react). Nodes represent workflow steps (Webhook, Tools, AI Optimizer). Edges show data flow connections. Nodes draggable, connectable. Supports zoom/pan.

### REQ-21: Node Palette Sidebar (P0)
Left sidebar in editor mode showing available nodes grouped by category: Triggers (Webhook, Schedule, Event Listener), Tools (FEA Solver, CFD Engine, etc.), Agents, Logic, Governance, Data. Searchable. Drag from palette to canvas.

### REQ-22: Node Properties Panel (P0)
Right panel showing selected node details: Selection header (name, type), Tool Version dropdown, Input Parameters (key-value with types), Resource Limits (CPU, Memory, Timeout), Retry Policy, Metadata (created, last run, avg cost).

### REQ-23: Editor Top Bar (P0)
Pipeline name with version badge, Editor/Runs/Eval tab switcher, Save button, Publish button, user avatar. Back arrow to navigate to workflow list.

### REQ-24: Editor Bottom Bar (P0)
"Run Workflow" primary action button, "Chat" button for AI assistant, node/connection count display.

---

## Workflow Runs

### REQ-30: Execution List (P0)
Left sidebar listing all runs with: run ID, status (Running/Succeeded/Failed/Waiting), duration, node progress, cost. Filter by status. Most recent first.

### REQ-31: Run DAG Visualization (P0)
Same DAG layout as editor but with live status: green checkmarks for completed nodes, blue spinner for running, gray for pending, red for failed. Animated edges for active data flow.

### REQ-32: Log Viewer (P0)
Bottom panel with live-streaming logs. Tabs: Logs, Artifacts, Cost, Timeline. Auto-scroll toggle. Monospace font. Timestamps. Color-coded by node. Copy and Download buttons.

### REQ-33: Node Detail Panel (P0)
Right panel showing active/selected node: status badge, input values, output (waiting/completed), metrics (Duration, CPU, Memory, Cost, Attempt count), execution history timeline.

### REQ-34: Run Action Bar (P0)
Bottom bar with: Cancel Run (red), Retry button, running status indicator with node progress.

---

## Agent Playground

### REQ-40: Chat Interface (P0)
Chat-style conversation view. User messages right-aligned, agent responses left-aligned with avatar. Tool Call Proposal cards inline in chat showing: selected tool, version, confidence score, reasoning, inputs, estimated cost, alternatives.

### REQ-41: Session List (P0)
Left sidebar listing sessions: name, message/tool call count, status (Active/completed), relative timestamp. Search sessions. "New Session" button in top bar.

### REQ-42: Inspector Panel (P0)
Right panel showing: session ID, name, message/tool call counts, Decision Trace timeline (context received → tool search → proposals → execution steps with status/timing), Live Metrics (iterations, total cost, budget remaining, duration, timeout), Policy Status (auto-approve threshold).

### REQ-43: Playground Action Bar (P0)
Bottom bar with: Stop Agent (red), Clear Session, Approve All buttons. Status indicator "Agent active - Step X/Y running". Chat input with send button.

### REQ-44: Agent Top Bar (P0)
Agent name with version badge, Builder/Playground/Evals/Runs tab switcher, session selector dropdown, "+ New Session" button.

---

## Tool Registry

### REQ-50: Tool Card Grid (P0)
Card layout showing tools: icon, name, description, version badge, adapter tags (docker/python/etc.), category tags, version count, cost per run, usage count. Status badge (Published/Draft/Deprecated).

### REQ-51: Filter Sidebar (P0)
Left sidebar with checkbox filters: Status (Published/Draft/Deprecated), Category (Simulation/Meshing/Analysis/Materials/ML-AI/Utilities), Adapter (Docker/Python/WASM/Remote API). Sort dropdown. "Clear all" link.

### REQ-52: Tool Properties Panel (P0)
Right panel showing selected tool: name with edit icon, type, Version History (version list with status/dates), Tool Contract (Inputs with types, Outputs with types), Execution config (Adapter, Image, Registry), Default Limits (CPU/Memory/Timeout), Sandbox Policy (Network deny/allow).

### REQ-53: Tool Action Bar (P0)
Bottom bar with: "Use in Workflow" button, "View Contract" button, "Test Run" button. Tool/published count.

### REQ-54: Register Tool (P1)
"+ Register Tool" button in top bar. Registration form or wizard for adding new tools.

---

## Non-Functional Requirements

### NFR-01: Performance (P0)
Main bundle <500KB gzipped. ReactFlow and recharts lazy-loaded. Page transitions <200ms. Dashboard stats update via polling (30s interval).

### NFR-02: Responsive Layout (P1)
Sidebar collapsible. Panels resizable. Minimum viewport: 1280px wide.

### NFR-03: Accessibility (P1)
WCAG 2.1 AA. Keyboard navigation for all interactive elements. ARIA labels on panels and toolbars. Focus management on panel open/close.

### NFR-04: Error Handling (P0)
All API calls show loading states, error states with retry. ErrorBoundary on each page. Graceful degradation when backend unavailable.

### NFR-05: Dark Mode (P2)
Existing theme system supports dark mode via CSS variables. Ensure all new components respect theme tokens.
