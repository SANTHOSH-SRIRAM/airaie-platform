# n8n Complete Product & UI Documentation

> **Purpose**: Product-level analysis of all screens, components, and user interactions for building a similar workflow automation platform.
> **Version analyzed**: 2.15.0 | **Date**: 2026-03-31

---

## Table of Contents

1. [Main Screens Identification](#1-main-screens-identification)
2. [Screen → Component Breakdown](#2-screen--component-breakdown)
3. [User Interaction Flows](#3-user-interaction-flows)
4. [Execution Screen Analysis](#4-execution-screen-analysis)
5. [Evaluation / Testing Screen](#5-evaluation--testing-screen)
6. [Agent / Chat / Workflow System](#6-agent--chat--workflow-system)
7. [Agent Creation Flow](#7-agent-creation-flow)
8. [Component Hierarchy](#8-component-hierarchy)
9. [Internal Behavior (Simplified)](#9-internal-behavior-simplified)
10. [Modal & Dialog Catalog](#10-modal--dialog-catalog)

---

## 1. MAIN SCREENS IDENTIFICATION

### Complete Screen Map

n8n has **74+ named views** (130+ total navigable screens including modals) organized into these major screen groups:

```
┌─────────────────────────────────────────────────────────────┐
│                    n8n APPLICATION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AUTH SCREENS          MAIN SCREENS         SETTINGS         │
│  ├── Sign In           ├── Home/Dashboard   ├── Personal    │
│  ├── Sign Up           ├── Workflow Editor   ├── Users       │
│  ├── Setup             ├── Executions        ├── API Keys    │
│  ├── Forgot Password   ├── Evaluation        ├── Community   │
│  ├── Change Password   ├── Templates         ├── SSO/LDAP   │
│  ├── SAML Onboarding   ├── Credentials       ├── Log Stream │
│  └── MFA               ├── Projects          ├── Source Ctrl │
│                        ├── Workflow History   ├── Ext Secrets│
│                        ├── Insights          ├── AI Settings │
│                        └── Resource Center   ├── Workers     │
│                                              ├── Security    │
│                                              └── Resolvers   │
└─────────────────────────────────────────────────────────────┘
```

### Screen Detail Table

| # | Screen | Route | Purpose | When User Uses It |
|---|--------|-------|---------|-------------------|
| 1 | **Home / Dashboard** | `/home/workflows` | Browse, search, organize workflows | First screen after login; workflow management hub |
| 2 | **Workflow Editor** | `/workflow/:name` | Build workflows with visual canvas | Creating or editing automation workflows |
| 3 | **New Workflow** | `/workflow/new` | Create a new blank workflow | Starting a new automation from scratch |
| 4 | **Execution List** | `/workflow/:name/executions` | View past executions of a workflow | Checking if automations ran successfully |
| 5 | **Execution Preview** | `/workflow/:name/executions/:id` | View detail of one execution | Debugging a specific run |
| 6 | **Execution Debug** | `/workflow/:name/debug/:id` | Debug mode with editor | Step-through debugging on canvas |
| 7 | **Evaluation** | `/workflow/:name/evaluation` | AI workflow testing & metrics | Testing AI agent workflows |
| 8 | **Test Run Detail** | `/workflow/:name/evaluation/test-runs/:runId` | View specific test run results | Reviewing AI evaluation results |
| 9 | **Workflow History** | `/workflow/:workflowId/history` | Version history with diff | Rolling back changes |
| 10 | **Templates Search** | `/templates/` | Browse workflow templates | Finding pre-built workflows |
| 11 | **Template Detail** | `/templates/:id` | View single template | Previewing a template before use |
| 12 | **Template Setup** | `/templates/:id/setup` | Configure template before import | Customizing template credentials |
| 13 | **Collections** | `/collections/:id` | Template collections | Browsing curated template groups |
| 14 | **Credentials** | (within Projects) | Manage saved credentials | Creating/editing API keys & secrets |
| 15 | **Projects** | `/projects/...` | Team project management | Organizing workflows into teams |
| 16 | **Folders** | (within Projects) | Organize workflows into folders | Structuring large workflow collections |
| 17 | **Variables** | (within Projects) | Environment variables | Managing shared configuration values |
| 18 | **Insights** | (within Projects) | Analytics dashboard | Monitoring workflow performance |
| 19 | **Chat Hub** | `/home/chat` | Chat with AI agents | Conversational AI interactions |
| 20 | **Chat Conversation** | `/home/chat/:id` | Specific conversation | Continuing a chat session |
| 21 | **Workflow Agents** | `/home/chat/workflow-agents` | Workflow-based agents | Managing workflow agents |
| 22 | **Personal Agents** | `/home/chat/personal-agents` | Personal AI agents | Managing personal agents |
| 23 | **Data Tables** | `/home/datatables` | Data table management | Viewing/creating data tables |
| 24 | **Data Table Detail** | `/projects/:id/datatables/:id` | Table rows & schema | Editing table data |
| 25 | **Insights Dashboard** | `/insights/:type?` | Analytics dashboard | Monitoring workflow performance |
| 26 | **Resource Center** | `/resource-center` | Help & learning resources | Finding documentation & guides |
| 27 | **Sign In** | `/signin` | Authentication | Logging into the platform |
| 28 | **Setup** | `/setup` | First-time owner setup | Initial instance configuration |
| 29 | **Settings** | `/settings/...` | 15+ settings sub-pages | Platform administration |
| 30 | **Chat Hub Settings** | `/settings/chat` | Chat configuration | Configuring AI chat features |

### Layouts

The app uses **7 layout templates** (`packages/frontend/editor-ui/src/app/layouts/`):

| Layout | Used For | Structure |
|--------|----------|-----------|
| **BaseLayout** | All screens (wrapper) | Flex container with aside slot |
| **default** | Home, credentials, projects | Sidebar + Main content area |
| **workflow** | Editor, executions, evaluation | Full-width header + Canvas area |
| **settings** | All settings pages | Sidebar navigation + Settings content |
| **auth** | Login, signup, password reset | Centered card layout |
| **chat** | Chat Hub screens | Chat sidebar + conversation area |
| **demo** | Demo/preview mode | Minimal chrome for embedding |

### Global App Shell

Every screen is wrapped in the global `App.vue` shell:

```
App.vue
├── BaseLayout (flex container)
│   ├── #banners slot → AppBanners (trial, update, source control alerts)
│   ├── AppLayout (main content)
│   │   └── <RouterView /> → Current screen renders here
│   ├── AppModals (all modal dialogs, rendered globally)
│   ├── AppCommandBar (Ctrl+K command palette)
│   └── #aside slot → AppChatPanel (AI chat sidebar)
```

---

## 2. SCREEN → COMPONENT BREAKDOWN

### SCREEN: Home / Dashboard (`WorkflowsView`)

The first screen users see after login. Lists all workflows with organization tools.

```
WorkflowsView
├── ProjectHeader
│   ├── Project name / "Home" title
│   ├── Tab navigation: Workflows | Credentials | Executions | Variables
│   └── New Workflow button
│
├── ResourcesListLayout
│   ├── Search bar (text filter)
│   ├── Tag filter dropdown (WorkflowTagsDropdown)
│   ├── Sort options (name, date, status)
│   ├── View toggle (list / card)
│   │
│   ├── FolderBreadcrumbs (when inside a folder)
│   ├── FolderCard[] (folder navigation)
│   ├── WorkflowCard[] (workflow list items)
│   │   ├── Workflow name (clickable → opens editor)
│   │   ├── Status badge (active / inactive)
│   │   ├── Tags
│   │   ├── Last updated timestamp
│   │   ├── Owner avatar
│   │   └── Action menu (⋯): Open, Duplicate, Share, Move, Delete
│   │
│   └── Pagination controls
│
├── InsightsSummary (analytics metrics bar)
├── SuggestedWorkflows / TemplateRecommendation (onboarding)
└── EmptyStateLayout (shown when no workflows exist)
    ├── Illustration
    ├── "Create your first workflow" message
    └── Create Workflow button
```

**User Interactions**:
- Click "New Workflow" → navigates to `/workflow/new`
- Click workflow card → navigates to `/workflow/:name`
- Drag workflow card → reorder / move to folder
- Click tag → filter by tag
- Search box → real-time filter by name
- Click folder → navigate into folder
- Right-click / action menu → duplicate, share, delete, move

---

### SCREEN: Workflow Editor (`NodeView`)

The **core screen** of the entire application. Where users build automation workflows.

```
NodeView (main editor orchestrator — 1956 lines)
├── WorkflowCanvas
│   ├── Canvas.vue (VueFlow wrapper)
│   │   ├── CanvasBackground (grid pattern)
│   │   ├── MiniMap (bottom-right overview)
│   │   ├── CanvasControlButtons (zoom in/out/fit)
│   │   │
│   │   ├── [Nodes on canvas]
│   │   │   └── CanvasNode (for each node)
│   │   │       ├── CanvasNodeRenderer
│   │   │       │   ├── CanvasNodeDefault (standard nodes)
│   │   │       │   │   ├── Node icon (service logo)
│   │   │       │   │   ├── Node name label
│   │   │       │   │   ├── Subtitle (operation description)
│   │   │       │   │   ├── CanvasNodeStatusIcons (success/error/running badges)
│   │   │       │   │   └── CanvasNodeSettingsIcons (retry, continueOnFail indicators)
│   │   │       │   ├── CanvasNodeStickyNote (yellow note cards)
│   │   │       │   ├── CanvasNodeAddNodes ("+" placeholder button)
│   │   │       │   └── CanvasNodeChoicePrompt (choice selection UI)
│   │   │       │
│   │   │       ├── CanvasHandleRenderer (input/output ports)
│   │   │       │   ├── CanvasHandleMainInput (left port — circle/diamond)
│   │   │       │   ├── CanvasHandleMainOutput (right port — circle with +)
│   │   │       │   ├── CanvasHandleNonMainInput (AI-type ports)
│   │   │       │   └── CanvasHandleNonMainOutput
│   │   │       │
│   │   │       └── CanvasNodeToolbar (hover toolbar)
│   │   │           ├── Execute button
│   │   │           ├── Disable toggle
│   │   │           ├── Duplicate button
│   │   │           ├── Delete button
│   │   │           └── More options (⋯)
│   │   │
│   │   ├── [Edges between nodes]
│   │   │   └── CanvasEdge (for each connection)
│   │   │       ├── Bezier curve path
│   │   │       ├── CanvasEdgeToolbar (delete button on hover)
│   │   │       ├── CanvasEdgeTooltip (item count during execution)
│   │   │       └── CanvasArrowHeadMarker
│   │   │
│   │   └── CanvasConnectionLine (temporary line during drag-connect)
│   │
│   ├── [Execution Overlay Buttons — bottom center]
│   │   ├── CanvasRunWorkflowButton
│   │   │   ├── "Test workflow" / "Execute Workflow" button
│   │   │   └── Trigger selector dropdown (when multiple triggers)
│   │   ├── CanvasChatButton (Open/Hide Chat — for chat trigger workflows)
│   │   ├── CanvasStopCurrentExecutionButton
│   │   └── CanvasStopWaitingForWebhookButton
│   │
│   ├── [Collaboration Indicators]
│   │   ├── N8nCanvasCollaborationPill ("User X is editing")
│   │   └── N8nCanvasThinkingPill (AI builder thinking indicator)
│   │
│   ├── SetupWorkflowCredentialsButton (if credentials need setup)
│   └── ReadOnlyEnvironmentNotification (if source control locked)
│
├── NodeCreation (Node Creator Panel — slides from right)
│   └── NodeCreator
│       ├── SearchBar (search all nodes)
│       ├── Modes:
│       │   ├── NodesMode (browse by category)
│       │   │   ├── CategoryItem (e.g., "Marketing", "Data")
│       │   │   ├── SubcategoryItem
│       │   │   └── NodeItem (individual node)
│       │   │       ├── Node icon
│       │   │       ├── Node name
│       │   │       └── Node description
│       │   └── ActionsMode (AI-suggested actions)
│       │       └── ActionItem (contextual action)
│       └── CommunityNodeItem / LinkItem / OpenTemplateItem
│
├── NodeDetailsView (NDV — slides from right when node is opened)
│   └── NDVDraggablePanels (3-panel resizable layout)
│       ├── NDVHeader
│       │   ├── Node icon + name (editable)
│       │   ├── Back button (close NDV)
│       │   ├── Execute/Test button
│       │   └── Settings gear icon
│       │
│       ├── InputPanel (left panel)
│       │   ├── InputNodeSelect (dropdown: which parent's output)
│       │   ├── RunData
│       │   │   ├── Display mode tabs: Table | JSON | Schema
│       │   │   ├── Data table (rows and columns)
│       │   │   ├── MappingPill (draggable data references)
│       │   │   └── "No data yet" empty state
│       │   └── TriggerPanel (for trigger nodes)
│       │       ├── "Listen for test event" button
│       │       ├── Webhook test URL (copyable)
│       │       └── Activation help text
│       │
│       ├── Parameters Panel (center)
│       │   ├── ParameterInputList
│       │   │   └── [For each node property]:
│       │   │       └── ParameterInput
│       │   │           ├── String → text input / textarea
│       │   │           ├── Number → numeric input
│       │   │           ├── Boolean → toggle switch
│       │   │           ├── Options → dropdown select
│       │   │           ├── MultiOptions → multi-select
│       │   │           ├── JSON → CodeMirror JSON editor
│       │   │           ├── Collection → expandable group
│       │   │           ├── FixedCollection → structured group
│       │   │           ├── ResourceLocator → search/ID/URL picker
│       │   │           ├── ResourceMapper → field mapping UI
│       │   │           ├── Filter → filter builder
│       │   │           ├── AssignmentCollection → data mapping UI
│       │   │           ├── WorkflowSelector → workflow picker
│       │   │           └── Expression toggle → CodeMirror expression editor
│       │   ├── Credential selector (if node needs credentials)
│       │   └── NodeSettings (retry, error handling, etc.)
│       │
│       └── OutputPanel (right panel)
│           ├── RunData (same structure as InputPanel)
│           │   ├── Table view (RunDataTable — sortable, paginated)
│           │   ├── JSON view (RunDataJson — syntax highlighted, draggable paths)
│           │   ├── Schema view (VirtualSchema — hierarchical tree with virtual scroll)
│           │   ├── Binary view (RunDataBinary — file download + preview)
│           │   ├── HTML view (RunDataHtml — rendered in iframe)
│           │   ├── Markdown view (RunDataMarkdown — formatted text)
│           │   └── AI view (RunDataAi — rich LLM content blocks)
│           ├── NodeErrorView (when node execution failed)
│           │   ├── Error message
│           │   ├── Error details
│           │   └── Suggested fixes
│           └── Pin Data toggle (unpin/pin mock data)
│
└── FocusSidebar (left side panel)
    ├── AI Assistant panel
    ├── Logs panel
    └── Context menu actions
```

**Header Bar** (`MainHeader.vue` — part of workflow layout):
```
MainHeader
├── Back button (← to home)
├── WorkflowDetails
│   ├── Workflow name (inline editable — click to rename)
│   ├── Tags (clickable, editable badges)
│   └── Save status indicator ("Saved" / "Unsaved changes")
├── TabBar (tab navigation):
│   ├── Editor tab
│   ├── Executions tab
│   └── Evaluation tab (for AI workflows)
├── [Right side]:
│   ├── WorkflowHeaderDraftPublishActions
│   │   ├── Share button → opens share modal
│   │   ├── Save / Save as Draft button (Ctrl+S)
│   │   └── Publish / Activate toggle (production mode)
│   └── Options menu (⋯):
│       ├── Workflow Settings
│       ├── Workflow Description
│       ├── Import from URL
│       ├── Import from File
│       ├── Download as JSON
│       ├── Duplicate
│       ├── Move to...
│       └── Delete
```

**Canvas Control Buttons** (`CanvasControlButtons.vue` — top-left of canvas):
```
CanvasControlButtons
├── Zoom to fit (maximize icon)
├── Zoom in (+)
├── Zoom out (-)
├── Reset zoom (0)
├── Toggle zoom mode (Z)
├── Tidy up / Auto-layout (grid icon)
└── Expand all nodes
```

**Bottom Menu** (`BottomMenu.vue` — bottom bar):
```
BottomMenu
├── Help / Documentation links
├── Keyboard shortcuts reference
└── Settings access
```

**Note**: The NDV has **two versions** — `NodeDetailsView.vue` (V1 legacy) and `NodeDetailsViewV2.vue` (V2, currently active). The V2 version is used when the feature flag is enabled. Both share the same panel structure but V2 has improved layout and interaction patterns.

---

### SCREEN: Execution List (`WorkflowExecutionsView`)

View all past executions of a workflow.

```
WorkflowExecutionsView
├── Execution List Sidebar (left panel)
│   ├── Filter bar
│   │   ├── Status filter: All | Success | Error | Waiting | Running
│   │   ├── Date range picker
│   │   ├── Annotation filter
│   │   └── Search by execution ID
│   │
│   ├── Execution list items
│   │   └── ExecutionCard (for each execution)
│   │       ├── Status icon (green ✓ / red ✗ / blue ⟳ / yellow ⏳)
│   │       ├── Execution ID
│   │       ├── Start time
│   │       ├── Duration
│   │       ├── Mode (manual / trigger / webhook / retry)
│   │       └── Annotation tag (if any)
│   │
│   ├── Bulk actions bar (when items selected)
│   │   ├── Select all checkbox
│   │   ├── Delete selected
│   │   └── Stop selected
│   │
│   └── Pagination / infinite scroll
│
├── Execution Preview (right panel — WorkflowExecutionsPreview)
│   ├── Canvas view showing execution state
│   │   ├── Nodes with success/error badges
│   │   ├── Data flow indicators on edges
│   │   └── Node click → opens NDV with run data
│   ├── Execution metadata bar
│   │   ├── Status
│   │   ├── Started at / Finished at
│   │   ├── Duration
│   │   └── Mode
│   ├── Retry button (for failed executions)
│   │   ├── "Retry with current workflow"
│   │   └── "Retry with original workflow"
│   ├── Delete button
│   └── Annotation / rating controls
│       ├── Vote: thumbs up / thumbs down (enterprise)
│       └── Annotation tags (enterprise)
│
├── Logs Panel (when logs enabled — layout logs:true)
│   ├── LogsOverviewPanel (left — tree of all node executions)
│   │   ├── LogsViewExecutionSummary
│   │   │   ├── Total items processed
│   │   │   ├── Consumed tokens (AI models)
│   │   │   └── Execution status
│   │   └── LogsOverviewRows (hierarchical tree)
│   │       ├── Node icons + names
│   │       ├── Execution status per node
│   │       ├── Sub-execution indicators
│   │       └── Expand/collapse (keyboard: j/k, Space)
│   │
│   └── LogDetailsPanel (right — selected node detail)
│       ├── Node header (icon, name, token count)
│       ├── Input panel (data flowing in — all 7 display modes)
│       ├── Output panel (data flowing out)
│       └── Error display (if node failed)
│
└── Landing page (when no execution selected)
    ├── "Select an execution" message
    └── Quick stats summary
```

---

### SCREEN: Settings (15+ Sub-Screens)

Settings uses a sidebar navigation layout:

```
SettingsLayout
├── Settings Sidebar Navigation
│   ├── Personal Settings
│   ├── Users
│   ├── Usage & Plan
│   ├── API Keys
│   ├── AI Assistant
│   ├── Community Nodes
│   ├── Environments (Source Control)
│   ├── External Secrets
│   ├── SSO / SAML
│   ├── LDAP
│   ├── Log Streaming
│   ├── Workers
│   ├── Security
│   ├── Project Roles
│   ├── Credential Resolvers
│   └── Migration Report
│
└── Settings Content Area
    └── [Current settings page]
```

**Key Settings Sub-Screens**:

| Screen | Components | Purpose |
|--------|-----------|---------|
| **Personal** | Profile form, password change, theme toggle | User account settings |
| **Users** | User list, invite form, role selector | Team management |
| **API Keys** | API key list, create/revoke buttons | API authentication |
| **Community Nodes** | Package list, install dialog, update button | Third-party node management |
| **Source Control** | Git remote config, push/pull buttons, branch selector | Version control |
| **External Secrets** | Provider list, connection config, test button | Secret management (Vault, etc.) |
| **SSO** | SAML/OIDC config, certificate upload, login URL | Enterprise SSO |
| **Log Streaming** | Destination list, event filter, test event | Audit log export |
| **Workers** | Worker status list, capacity, last seen | Multi-worker monitoring |
| **AI** | Assistant config, model selection | AI feature settings |

---

### SCREEN: Projects

Project-based organization for team workflows:

```
ProjectsView
├── Project sidebar
│   ├── Personal space
│   ├── Shared with me
│   └── Team projects list
│       └── ProjectItem
│           ├── Project name
│           ├── Member count
│           └── Click → opens project
│
├── Project Detail Page
│   ├── ProjectHeader
│   │   ├── Project name
│   │   ├── Tab navigation: Workflows | Credentials | Executions | Variables
│   │   └── Settings gear (project settings)
│   │
│   ├── [Tab content]:
│   │   ├── Workflows tab → same as Home/Dashboard
│   │   ├── Credentials tab → Credential list with create/edit
│   │   ├── Executions tab → All executions in project
│   │   └── Variables tab → Key-value variable management
│   │
│   └── Project Settings
│       ├── Project name edit
│       ├── Members management
│       │   ├── Member list with roles
│       │   ├── Invite member form
│       │   └── Role selector (Admin, Editor, Viewer)
│       └── Delete project
```

---

### SCREEN: Credentials

Credential management (accessed from Projects or Home):

```
CredentialsView
├── Credential List
│   ├── Search bar
│   ├── Sort options
│   ├── CredentialCard[] (list items)
│   │   ├── Credential name
│   │   ├── Type icon (e.g., Slack, Gmail)
│   │   ├── Type name
│   │   ├── Last updated
│   │   ├── Shared indicator
│   │   └── Action menu: Edit, Duplicate, Delete, Move
│   └── "Create New Credential" button
│
├── Credential Edit Modal (opens as full-screen dialog)
│   ├── Credential type selector (if creating new)
│   ├── Name field
│   ├── [Dynamic fields based on credential type]:
│   │   ├── API Key field
│   │   ├── OAuth2 connect button
│   │   ├── Username/password fields
│   │   └── Custom fields per type
│   ├── Test Credential button → shows success/failure
│   ├── Sharing section → add users/projects
│   └── Save / Cancel buttons
```

---

### SCREEN: Templates

Browse and import pre-built workflows:

```
TemplatesSearchView
├── Search bar (full-text search)
├── Category filters (sidebar)
│   ├── Marketing
│   ├── Sales
│   ├── IT Ops
│   ├── Engineering
│   └── ... (many categories)
│
├── Template cards grid
│   └── TemplateCard
│       ├── Template name
│       ├── Description
│       ├── Preview image (workflow thumbnail)
│       ├── Node icons (services used)
│       ├── Popularity / downloads
│       └── "Use this workflow" button
│
└── TemplateWorkflowView (detail page)
    ├── Template name + description
    ├── Workflow preview (read-only canvas)
    ├── Required credentials list
    ├── Setup instructions
    └── "Use this workflow" → imports to user's workspace
```

---

### SCREEN: Chat Hub (`/home/chat`)

A dedicated chat interface for interacting with AI agents:

```
ChatView
├── Sidebar (left)
│   ├── "New Chat" button
│   ├── Conversation list
│   │   └── ConversationItem[]
│   │       ├── Agent name / title
│   │       ├── Last message preview
│   │       └── Timestamp
│   ├── Navigation tabs:
│   │   ├── Workflow Agents (chat workflows)
│   │   └── Personal Agents (user-created)
│   └── Settings gear → Chat Hub Settings
│
├── Chat Area (main)
│   ├── Chat header (agent name, model info)
│   ├── Message history
│   │   ├── User messages (right-aligned)
│   │   ├── AI responses (left-aligned, streaming)
│   │   ├── Tool call indicators (expandable)
│   │   └── System messages
│   ├── Chat input bar
│   │   ├── Text input (multiline)
│   │   ├── Send button
│   │   └── Attachment options
│   └── Model/provider selector
│
└── Agent Editor (modal)
    ├── Agent name
    ├── System instructions (textarea)
    ├── Model selector (dropdown)
    ├── Tools configuration
    │   ├── Available tools list
    │   └── Tool settings per tool
    ├── Suggestions (preset prompts)
    └── Save / Cancel buttons
```

### SCREEN: Data Tables (`/home/datatables`)

Spreadsheet-like data storage integrated with workflows:

```
DataTableView
├── Table list
│   ├── Search bar
│   ├── DataTableCard[]
│   │   ├── Table name
│   │   ├── Row count
│   │   ├── Last updated
│   │   └── Actions (edit, delete, download)
│   └── "Create Data Table" button
│
└── DataTableDetailsView (detail)
    ├── Table header (name, schema info)
    ├── Column definitions (schema editor)
    ├── Data grid (rows and columns — spreadsheet-like)
    ├── Add row button
    ├── Import CSV button
    ├── Download button
    └── Pagination
```

### SCREEN: Insights Dashboard (`/insights`)

Analytics for workflow execution metrics:

```
InsightsDashboard
├── Time period selector
├── Summary metrics cards
│   ├── Total executions
│   ├── Success rate
│   ├── Average duration
│   └── Error count
├── Charts
│   ├── Execution timeline (line chart)
│   ├── Status distribution (pie chart)
│   └── Top workflows by execution count
└── Detailed metrics table
```

---

## 3. USER INTERACTION FLOWS

### Flow: Creating a New Workflow

```
1. User is on Home screen
2. Clicks "New Workflow" button (or Ctrl+N)
3. System generates unique ID, navigates to /workflow/:newId?new=true
4. Empty canvas loads with grid background
5. "+ Add first step" placeholder appears at center
6. User clicks placeholder → Node Creator panel opens
7. User searches or browses for a trigger node
8. Selects trigger (e.g., "Webhook") → node placed on canvas
9. NDV opens showing trigger configuration
10. User configures the trigger
11. Clicks "Back to canvas" or presses Escape
12. Node appears on canvas with "+" button on right side output
13. User clicks "+" → Node Creator opens for next node
14. Workflow auto-saves periodically (or user presses Ctrl+S)
```

### Flow: Adding a Node

```
1. User initiates node creation via:
   ├── Click "+" button on canvas
   ├── Click "+" on a node's output handle
   ├── Press Tab key
   ├── Right-click canvas → "Add node"
   └── Drag from Node Creator to canvas

2. Node Creator panel slides in from the right
3. Panel shows:
   ├── Search input (focused, ready to type)
   ├── Recent nodes
   ├── Categorized node list
   └── AI-suggested actions (context-aware)

4. User types search query OR browses categories
5. Node list filters in real-time
6. User clicks a node type
7. Node appears on canvas at:
   ├── If opened from "+": connected to the triggering node
   └── If opened from canvas: placed at cursor position

8. NDV (Node Detail View) opens immediately
9. User configures node parameters
10. Workflow JSON updates: nodes[] gets new entry
```

### Flow: Connecting Two Nodes

```
1. User hovers over a node's output port (right side)
2. Port highlights with a "+" icon
3. User clicks and drags from output port
4. A bezier curve line follows the cursor
5. Line snaps to valid input ports on other nodes
6. Invalid ports are grayed out (type mismatch)
7. User releases on a valid input port
8. Connection established — permanent edge drawn
9. Workflow JSON updates: connections object adds entry
10. Edge shows animated dots during execution
```

### Flow: Executing a Workflow (Manual)

```
1. User clicks "Test workflow" button (bottom center of canvas)

2. IF multiple triggers exist:
   └── Dropdown appears: "Choose which trigger to start from"
   └── User selects a trigger

3. IF trigger is a webhook:
   └── Button changes to "Listening..." (waiting for request)
   └── Test URL displayed in trigger's NDV
   └── User sends request to test URL externally
   └── OR user clicks "Use test data" with pinned data

4. Execution begins:
   ├── Canvas enters "execution mode"
   ├── Active node gets blue spinner icon
   ├── WebSocket receives real-time events:
   │   ├── nodeExecuteBefore → node starts spinning
   │   ├── nodeExecuteAfter → node shows ✓ or ✗
   │   └── executionFinished → all badges finalized

5. User clicks on any node to see its execution data:
   └── NDV opens showing Input (from parent) and Output (this node's result)

6. IF execution fails:
   ├── Failed node shows red ✗ badge
   ├── Error message appears in NDV output panel
   └── Subsequent nodes show "Not executed" state
```

### Flow: Viewing Execution Output

```
1. After execution completes, user clicks a node
2. NDV opens with execution data:
   
   LEFT PANEL (Input):
   ├── Shows data received from parent node
   ├── Display modes: Table | JSON | Schema
   ├── Table mode: spreadsheet-like rows and columns
   └── Can switch to view different parent's output

   RIGHT PANEL (Output):
   ├── Shows data produced by this node
   ├── Same display modes: Table | JSON | Schema
   ├── Item count badge (e.g., "3 items")
   ├── Copy button (copy all data)
   ├── Download button (CSV/JSON)
   ├── Pin button (save as test data)
   └── MappingPill (drag fields to map to other nodes)

3. User can click between nodes on canvas to compare data
4. Execution data persists until next execution or "Clear data"
```

### Flow: Debugging a Failed Node

```
1. Execution fails — red ✗ appears on failed node
2. User clicks the failed node
3. NDV Output panel shows:
   ├── NodeErrorView component
   │   ├── Error type (e.g., "Authentication failed")
   │   ├── Error message detail
   │   ├── HTTP status code (if API error)
   │   ├── Response body (if available)
   │   ├── Stack trace (expandable)
   │   └── Hints / suggested fixes
4. User can:
   ├── Fix parameters → re-execute the node
   ├── Pin test data → bypass the node
   ├── Enable "Continue on fail" → error doesn't stop workflow
   └── Add error output → route errors to a handler node
```

### Flow: Editing Node Configuration

```
1. User double-clicks a node on canvas
2. NDV panel slides in from the right
3. Center panel shows parameter form:
   ├── Each parameter is a form field
   ├── Fields have labels, descriptions, and types
   ├── Conditional fields appear/disappear based on other values
   ├── Expression toggle (E) switches any field to expression mode
   └── Dynamic options load from backend (e.g., Slack channels)

4. User changes a parameter value
5. Value saved immediately to workflow store (Pinia)
6. If parameter triggers dependent loading:
   ├── API call to POST /node-parameter-options
   └── Dropdown options refresh

7. User presses Escape or clicks "Back" → NDV closes
8. Changes are in memory (not yet saved to server)
9. User presses Ctrl+S → workflow saved via PUT /workflows/:id
```

### Flow: Extracting Nodes to Sub-Workflow

```
1. User selects multiple nodes on canvas
2. Right-clicks → "Extract to sub-workflow" (or Alt+X)
3. WorkflowExtractionNameModal opens → user enters sub-workflow name
4. System analyzes connections:
   ├── Maps input connections to selected nodes
   ├── Maps output connections from selected nodes
   └── Identifies boundary edges
5. Creates NEW workflow with:
   ├── All selected nodes (moved)
   ├── Input mapper node (receives data)
   └── Output mapper node (returns data)
6. Replaces selected nodes in ORIGINAL workflow with:
   └── Single "Execute Workflow" node pointing to new sub-workflow
7. Connections re-wired automatically
8. Both workflows saved
```

### Flow: Activating a Workflow (Production Mode)

```
1. User clicks "Publish" / "Activate" toggle in header
2. Confirmation dialog may appear (if webhook conflicts)
3. Backend: POST /workflows/:id/activate
   ├── Registers webhook endpoints
   ├── Creates cron schedules
   ├── Starts polling triggers
   └── Marks workflow as active in DB

4. UI updates:
   ├── Toggle turns green/active
   ├── "Active" badge appears
   └── Production webhook URLs are now live

5. Workflow now runs automatically when triggers fire
```

### Flow: Using Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save workflow |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy selected nodes |
| `Ctrl+V` | Paste nodes |
| `Ctrl+A` | Select all nodes |
| `Delete` / `Backspace` | Delete selected nodes |
| `Tab` | Open Node Creator |
| `Ctrl+K` | Open Command Bar (search commands) |
| `D` | Disable/enable selected node |
| `P` | Pin/unpin data on selected node |
| `C` | Open/close chat (when chat trigger present) |
| `F` | Fit canvas to view all nodes |
| `+` / `-` | Zoom in / out |
| `Ctrl+Enter` | Execute workflow |
| `Escape` | Close NDV / Node Creator |
| `N` | Add node (canvas context) |
| `Shift+S` | Add sticky note |
| `R` | Replace node |
| `Space` | Rename selected node |
| `Alt+Shift+T` | Tidy up (auto-layout) |
| `Alt+Shift+U` | Copy webhook test URL |
| `Alt+U` | Copy webhook production URL |
| `Alt+X` | Extract selection to sub-workflow |
| `Alt+I` | Focus AI on selected nodes |
| `Ctrl+Alt+O` | Open About modal |
| `Ctrl+Alt+S` | Open Workflow Settings |

### Flow: Right-Click Context Menu

**On a node**:
```
Context Menu (node selected):
├── Open (enter NDV)
├── Execute to here
├── Rename
├── Disable/Enable
├── Pin/Unpin data
├── Copy
├── Duplicate
├── Replace node
├── Extract to sub-workflow
├── Open sub-workflow (if Execute Workflow node)
├── Copy webhook URL (if webhook node)
├── Delete
└── Focus AI on selected
```

**On empty canvas**:
```
Context Menu (canvas):
├── Add node
├── Add sticky note
├── Select all
├── Deselect all
├── Tidy up (auto-layout)
└── Paste
```

---

## 4. EXECUTION SCREEN ANALYSIS

### What the User Sees

The execution screen is split into **two panels**:

```
┌─────────────────────────┬─────────────────────────────────────┐
│   EXECUTION LIST        │       EXECUTION PREVIEW             │
│   (left sidebar)        │       (main area)                   │
│                         │                                     │
│  [Filter: All ▼]        │   ┌─────────────────────────────┐   │
│  [Date range]           │   │                             │   │
│                         │   │   Canvas with executed       │   │
│  ▸ #1234 ✓ 2.3s        │   │   workflow showing node      │   │
│  ▸ #1233 ✗ 0.5s  ←     │   │   status badges              │   │
│  ▸ #1232 ✓ 1.1s        │   │                             │   │
│  ▸ #1231 ✓ 3.0s        │   │   [Webhook] ✓ → [IF] ✓ →   │   │
│  ▸ #1230 ⏳ waiting     │   │   [Slack] ✓                 │   │
│                         │   │                             │   │
│                         │   └─────────────────────────────┘   │
│                         │                                     │
│                         │   Status: Error | Duration: 0.5s    │
│                         │   [Retry] [Delete]                  │
└─────────────────────────┴─────────────────────────────────────┘
```

### How "Choose First Step / Trigger" Works

When user clicks "Test workflow" and there are **multiple trigger nodes**:

```
1. System identifies all trigger nodes in the workflow
2. Dropdown appears above the Execute button:
   ┌────────────────────────────────┐
   │  Choose which trigger to use:  │
   │  ○ Webhook                     │
   │  ● Schedule Trigger            │
   │  ○ Manual Trigger              │
   └────────────────────────────────┘
3. User selects one trigger
4. System stores selection in workflowsStore.selectedTriggerNodeName
5. Execution starts from the selected trigger
6. For webhooks: system enters "listening" mode and shows test URL
7. For schedule/manual: execution starts immediately with mock data
```

### How Results Are Displayed Per Node

```
For each node after execution:

SUCCESS (✓ green):
├── Badge: green checkmark icon
├── Iteration count badge (if node ran > 1 time)
├── Item count: "3 items" in tooltip
├── NDV → Output panel shows data in 7 display modes
└── Edge shows animated dot flow

ERROR (✗ red):
├── Badge: red error icon
├── Tooltip shows error details with "Node issues:" header
├── Multiple errors grouped with "(xN)" count
├── NDV → Output panel shows NodeErrorView:
│   ├── Error message (red text)
│   ├── HTTP status code (if API error)
│   ├── Response body
│   ├── Stack trace (expandable)
│   ├── Node type & version info
│   ├── "Ask Assistant" button (AI help)
│   └── Copy error to clipboard
└── Child nodes show "Not executed" state

RUNNING (⟳ blue):
├── Badge: animated spinner
├── Semi-transparent scrim overlay (opacity 0.7)
├── Real-time via WebSocket push
└── User sees progress node-by-node

WARNING (⚠️ orange):
├── Badge: orange warning icon
├── Indicates node parameters changed since last execution ("dirty")
├── Shows "subject to change" tooltip
└── Iteration count if multiple runs

WAITING (⏳ yellow):
├── Badge: clock icon
├── Used for Wait nodes or paused executions
├── "Waiting for webhook/email" tooltip
└── Resumes when condition met or manually

PINNED (📌 blue):
├── Badge: pin icon (secondary color)
├── Node was skipped — used cached/pinned data
├── Output shows the pinned data instead of real execution
└── Tooltip on pin button: "Save this data to test nodes without re-running"

DISABLED (⏻ grey):
├── Badge: power icon (greyed out)
├── Strikethrough overlay on node
└── Node skipped during execution

NOT INSTALLED (⬇ orange):
├── Badge: download icon
├── Community node package not installed
└── Tooltip: "Click to install"

VALIDATION ERRORS (⚠ orange):
├── Badge: orange validation icon
├── Lists validation issues in tooltip
└── Node won't execute until issues resolved

REDACTED DATA:
├── Special state for credential-containing data
├── "Reveal data" button (if user has permission)
├── Dynamic credentials indicator
└── Settings link to configure data exposure
```

---

## 5. EVALUATION / TESTING SCREEN

### Overview

The Evaluation screen (`/workflow/:name/evaluation`) is for **testing AI workflows** systematically.

```
EvaluationsRootView
├── EvaluationsView (main evaluation editor)
│   ├── Test Definition Setup
│   │   ├── Select test workflow (which workflow to test)
│   │   ├── Configure test cases
│   │   │   ├── Input data set (JSON or reference)
│   │   │   ├── Expected output criteria
│   │   │   └── Evaluation metrics
│   │   └── Run configuration
│   │
│   ├── Test Runs List
│   │   └── TestRunCard[]
│   │       ├── Run timestamp
│   │       ├── Status (pass/fail/running)
│   │       ├── Score / metrics
│   │       └── Click → TestRunDetailView
│   │
│   └── "Run Test" button
│
└── TestRunDetailView (detail of one test run)
    ├── Overall score / metrics summary
    ├── Test case results table
    │   ├── Input data
    │   ├── Expected output
    │   ├── Actual output
    │   ├── Pass / Fail indicator
    │   └── Diff view (expected vs actual)
    └── Per-node execution data
```

### How Testing Works

```
1. User navigates to Evaluation tab
2. Defines test cases:
   ├── Input: what data to send to the workflow
   ├── Expected: what the output should match
   └── Metrics: how to score (exact match, contains, AI evaluation)

3. Clicks "Run Test"
4. System executes the workflow multiple times:
   ├── Once per test case
   ├── With specified input data
   └── Captures output at each node

5. Results compared against expected output
6. Score calculated and displayed

7. User reviews:
   ├── Which test cases passed/failed
   ├── What the actual output was
   └── Can click into individual runs for debugging
```

### Pin Data System (Input Simulation)

```
1. User right-clicks a node → "Pin data"
2. OR: After execution, clicks "Pin this data" on output panel
3. Pinned data saved in workflow JSON: workflow.pinData[nodeName]
4. During next execution:
   ├── Pinned node is SKIPPED (not actually executed)
   ├── Its pinned data is used as output instead
   └── Downstream nodes receive the pinned data
5. Visual indicator: purple pin badge on node
6. To unpin: right-click → "Unpin data" or click unpin in NDV
```

### Partial Execution

```
1. User right-clicks a node → "Execute to here"
2. System:
   ├── Finds the subgraph from trigger to clicked node
   ├── Reuses cached data from previous runs
   ├── Only re-executes "dirty" (changed) nodes
   └── Executes up to and including the clicked node

3. Visual: Only executed nodes show status badges
4. Nodes after the target remain in "not executed" state
```

---

## 6. AGENT / CHAT / WORKFLOW SYSTEM

### What is an Agent in n8n?

An **agent** in n8n is a **chat-based AI workflow** that:
- Has a **Chat Trigger** node as the entry point
- Contains **AI Agent** nodes (LangChain-based)
- Can use **tools** (other n8n nodes as functions the AI can call)
- Supports **memory** (conversation history)
- Produces **conversational responses**

**Agents are NOT a separate entity** — they are regular workflows with specific node types. The distinction is primarily in the UI presentation and the chat interface.

### How Agents Differ from Regular Workflows

| Aspect | Regular Workflow | Agent (Chat Workflow) |
|--------|-----------------|----------------------|
| **Trigger** | Webhook, Cron, Polling | Chat Trigger / Manual Chat Trigger |
| **Processing** | Linear data flow | AI reasoning + tool calls |
| **Output** | Data transformation | Conversational text response |
| **Interface** | Canvas only | Canvas + Chat panel |
| **Execution** | One-shot | Multi-turn conversation |
| **Tools** | N/A | Other nodes connected as AI tools |

### Chat System Architecture

```
Chat System Components:
├── AppChatPanel (global sidebar — always available)
│   └── ChatHubPanel
│       ├── Conversation list
│       ├── Active chat view
│       │   ├── Message history
│       │   ├── User message input
│       │   ├── AI response (streaming)
│       │   └── Tool call visualization
│       └── Session management
│
├── CanvasChatButton (canvas overlay)
│   └── Opens/closes the chat panel
│
├── Chat Trigger Nodes:
│   ├── Chat Trigger (n8n-nodes-langchain.chatTrigger)
│   │   └── Receives messages from chat interface
│   └── Manual Chat Trigger
│       └── For testing chat workflows
│
├── AI Agent Nodes:
│   ├── AI Agent (LangChain agent)
│   │   ├── Inputs: chat message + memory + tools
│   │   ├── Processing: LLM reasoning with tool use
│   │   └── Output: text response
│   ├── AI Chain nodes
│   ├── AI Memory nodes (buffer, window, vector store)
│   └── AI Tool nodes (connected as sub-nodes)
│
└── Chat Hub (backend):
    ├── Manages conversation sessions
    ├── Routes messages to workflows
    ├── Stores conversation history
    └── Streams responses back to UI
```

### How Chat Connects to Workflows

```
USER                    FRONTEND                   BACKEND
  │                        │                          │
  │ Types message          │                          │
  │───────────────────────►│                          │
  │                        │ POST /chat/message       │
  │                        │─────────────────────────►│
  │                        │                          │ Finds workflow with
  │                        │                          │ Chat Trigger
  │                        │                          │
  │                        │                          │ Executes workflow
  │                        │                          │ with message as input
  │                        │                          │
  │                        │    SSE: streaming chunks │
  │                        │◄─────────────────────────│
  │  Response appears      │                          │
  │◄───────────────────────│                          │
  │  (word by word)        │                          │
```

### AI Assistant (Separate from Chat Hub)

The **AI Assistant** is a built-in helper with **3 distinct modes**:

```
AI Assistant (assistant.store.ts)
├── Mode 1: ERROR HELPER
│   ├── Triggered automatically when node execution fails
│   ├── Receives: error context, node info, input data
│   ├── Analyzes error and suggests fixes
│   ├── Can apply code diffs directly
│   ├── Tracks re-execution after fix
│   └── Flow: Error → Panel opens → Fix suggested → Apply → Re-run
│
├── Mode 2: SUPPORT CHAT
│   ├── Triggered by: floating button, help icon on node
│   ├── Answers workflow building questions
│   ├── Provides node configuration guidance
│   ├── Context-aware: knows current workflow + active node
│   └── Offers quick reply suggestions
│
└── Mode 3: BUILDER (AI Workflow Builder — Enterprise)
    ├── Generates complete workflows from text descriptions
    ├── Uses LangGraph multi-agent system:
    │   ├── Supervisor agent (routes tasks)
    │   ├── Discovery agent (asks clarifying questions)
    │   ├── Planner agent (creates plan)
    │   ├── Builder agent (generates nodes + connections)
    │   └── Responder agent (explains changes)
    ├── Supports: Plan mode (plan first) + Build mode (direct)
    ├── Shows diffs before applying changes (AIBuilderDiffModal)
    └── Streams intermediate thinking steps

UI Locations:
├── FocusSidebar (left panel) → AssistantsHub with HubSwitcher
├── AskAssistantFloatingButton (bottom-left corner)
├── Expression editor → "Generate with AI" option
└── Node error panel → "Ask Assistant" button
```

### MCP (Model Context Protocol)

MCP enables n8n to **expose workflows as tools** to external AI systems:

```
MCP Access:
├── Settings → MCP configuration
├── Expose specific workflows as MCP tools
├── External AI systems can discover and call these tools
└── Bidirectional: n8n can also consume MCP tools
```

---

## 7. AGENT CREATION FLOW

### Step-by-Step: Creating a Chat Agent

```
1. User clicks "New Workflow" on Home screen
2. Navigates to empty canvas
3. Clicks "+ Add first step"
4. Node Creator opens

5. User selects "Chat Trigger" node
   └── This marks the workflow as a "chat workflow"
   └── Chat button appears on canvas

6. User clicks "+" after Chat Trigger
7. Selects "AI Agent" node
   └── Agent node appears with special sub-node ports:
       ├── Main input (from Chat Trigger)
       ├── AI Model port (requires LLM connection)
       ├── Memory port (optional)
       └── Tools port (optional, multiple)

8. User connects an LLM model:
   ├── Clicks AI Model port → Node Creator opens
   ├── Selects model (OpenAI, Anthropic, Ollama, etc.)
   ├── Configures API key via credentials
   └── Model node connects to Agent

9. User adds Tools:
   ├── Clicks Tools port → Node Creator opens
   ├── Selects tool nodes (HTTP Request, Code, Calculator, etc.)
   ├── Each tool connects as a sub-node to the Agent
   └── Agent can now call these tools during reasoning

10. User configures the Agent:
    ├── Opens Agent NDV
    ├── System Message: instructions for the AI
    ├── Max iterations: limit on reasoning steps
    ├── Human message template
    └── Output parsing options

11. User adds Memory (optional):
    ├── Clicks Memory port → Node Creator opens
    ├── Selects memory type (Buffer, Window, Vector Store)
    └── Enables multi-turn conversation

12. User tests via Chat:
    ├── Clicks "Open Chat" button
    ├── Chat panel opens on the side
    ├── Types a test message
    ├── Workflow executes:
    │   ├── Chat Trigger receives message
    │   ├── Agent processes with LLM
    │   ├── May call tools (visible in canvas execution)
    │   └── Returns response to chat
    └── User sees response in chat panel

13. User activates the workflow:
    ├── Clicks "Publish" / "Activate"
    ├── Chat endpoint becomes available
    └── Can be embedded or accessed via API
```

### Agent Node Configuration Fields (Workflow-Based Agent)

| Field | Purpose | How It's Used Internally |
|-------|---------|------------------------|
| **System Message** | Instructions for the AI agent | Prepended to LLM prompt as system role |
| **Max Iterations** | Limit reasoning/tool-call loops | Prevents infinite tool-calling loops |
| **Human Message** | Template for user message formatting | Wraps user input before sending to LLM |
| **Output Parser** | How to structure the AI response | Parses LLM text into structured JSON |
| **Return Intermediate Steps** | Show reasoning process | Includes tool calls and thoughts in output |
| **Model** | Which LLM to use (sub-node connection) | Connected via AI Model port |
| **Memory** | Conversation history storage | Connected via Memory port |
| **Tools** | Functions the AI can call | Connected via Tools port |

### Personal Agent Editor Fields (Chat Hub Agent — `AgentEditorModal.vue`)

| Field | Purpose | How It's Used Internally |
|-------|---------|------------------------|
| **Name** | Display name in chat hub | Stored in `ChatHubAgentDto.name` |
| **Description** | What the agent does | Shown in agent list cards |
| **Icon / Emoji** | Visual identifier | Emoji picker for agent avatar |
| **Model / Provider** | Which LLM to use | Dropdown: OpenAI, Anthropic, Google, custom |
| **Instructions** | System prompt / persona | Sent as system message to LLM |
| **Tools** | n8n workflows as callable tools | Selected via `ToolsManagerModal` — workflows become functions the LLM can call |
| **Suggestions** | Preset prompts for the user | Shown as quick-start buttons in chat |

**Agent Types in Chat Hub**:
```
ChatHubConversationModel:
├── provider: 'openai'      → Direct LLM provider
├── provider: 'anthropic'   → Direct LLM provider
├── provider: 'google'      → Direct LLM provider
├── provider: 'n8n'         → Workflow-based agent (uses Chat Trigger workflow)
├── provider: 'custom-agent' → User-created personal agent
└── Each has: model ID, optional workflowId, optional agentId
```

### What Happens After Saving

```
1. Workflow JSON saved to database:
   ├── Nodes include: Chat Trigger, AI Agent, LLM Model, Tools, Memory
   ├── Connections define the agent's capabilities
   └── Agent instructions stored in node parameters

2. When activated:
   ├── Chat Trigger registers webhook endpoint
   ├── Chat Hub can route messages to this workflow
   └── External chat widgets can connect

3. When a message arrives:
   ├── Chat Trigger emits message as INodeExecutionData
   ├── Agent node receives message
   ├── Sends to LLM with system prompt + tools description
   ├── LLM may call tools → sub-workflow executions
   ├── Agent iterates until response ready
   └── Response sent back through Chat Trigger's response mechanism
```

---

## 8. COMPONENT HIERARCHY

### Complete System Tree

```
n8n Application
│
├── 🔐 AUTH SCREENS
│   ├── SigninView (email + password + MFA)
│   ├── SignupView (invitation acceptance)
│   ├── SetupView (first-time owner setup)
│   ├── ForgotMyPasswordView
│   ├── ChangePasswordView
│   └── SamlOnboarding
│
├── 🏠 HOME / DASHBOARD
│   ├── WorkflowsView (main workflow list)
│   │   ├── ProjectHeader (title + tabs + actions)
│   │   ├── ResourcesListLayout
│   │   │   ├── Search + Filters
│   │   │   ├── FolderCard[] (folder navigation)
│   │   │   └── WorkflowCard[] (workflow items)
│   │   ├── InsightsSummary (metrics bar)
│   │   └── EmptyStateLayout (onboarding)
│   │
│   ├── CredentialsView (credential list)
│   │   └── CredentialCard[] + Edit Modal
│   │
│   └── FoldersView (folder management)
│
├── ✏️ WORKFLOW EDITOR
│   ├── NodeView (orchestrator)
│   │   ├── WorkflowCanvas
│   │   │   ├── Canvas (VueFlow)
│   │   │   │   ├── CanvasNode[]
│   │   │   │   │   ├── CanvasNodeDefault / StickyNote / AddNodes
│   │   │   │   │   ├── CanvasHandleRenderer (ports)
│   │   │   │   │   └── CanvasNodeToolbar (hover actions)
│   │   │   │   ├── CanvasEdge[] (connections)
│   │   │   │   │   └── CanvasEdgeToolbar
│   │   │   │   ├── CanvasBackground (grid)
│   │   │   │   ├── CanvasControlButtons (zoom)
│   │   │   │   └── MiniMap
│   │   │   │
│   │   │   ├── CanvasRunWorkflowButton
│   │   │   ├── CanvasChatButton
│   │   │   └── CanvasStopExecutionButton
│   │   │
│   │   ├── NodeCreation (Node Creator panel)
│   │   │   └── NodeCreator
│   │   │       ├── SearchBar
│   │   │       ├── NodesMode (categories + node list)
│   │   │       └── ActionsMode (AI suggestions)
│   │   │
│   │   ├── NodeDetailsView (NDV panel)
│   │   │   └── NDVDraggablePanels
│   │   │       ├── InputPanel (RunData)
│   │   │       ├── Parameters Panel (form fields)
│   │   │       └── OutputPanel (RunData)
│   │   │
│   │   └── FocusSidebar (AI assistant + logs)
│   │
│   └── Header
│       ├── Workflow name + tags
│       ├── Tab navigation (Editor | Executions | Evaluation)
│       ├── Share button
│       ├── Save button
│       └── Activate toggle
│
├── 📊 EXECUTIONS
│   ├── WorkflowExecutionsView
│   │   ├── Execution list sidebar
│   │   │   ├── Filters (status, date, annotations)
│   │   │   └── ExecutionCard[] (list items)
│   │   └── Execution preview area
│   │       ├── Canvas with execution data
│   │       └── Metadata + actions
│   │
│   └── ExecutionDebug (full editor with execution data)
│
├── 🧪 EVALUATION
│   ├── EvaluationsView
│   │   ├── Test definition setup
│   │   ├── Test runs list
│   │   └── Run test button
│   └── TestRunDetailView
│       ├── Score summary
│       └── Test case results
│
├── 🤖 AI / CHAT
│   ├── ChatView (dedicated chat screen — /home/chat)
│   │   ├── Conversation sidebar (list + tabs)
│   │   ├── Chat area (messages + input)
│   │   ├── AgentEditorModal (create/edit agents)
│   │   ├── ChatWorkflowAgentsView
│   │   └── ChatPersonalAgentsView
│   ├── AppChatPanel (global sidebar — always available)
│   │   └── ChatHubPanel
│   │       ├── Conversation list
│   │       ├── Chat view (messages)
│   │       └── Message input
│   ├── AI Assistant (FocusSidebar)
│   └── AI Workflow Builder (enterprise)
│
├── 📊 DATA TABLES
│   ├── DataTableView (table list)
│   └── DataTableDetailsView (rows, schema, import)
│
├── 📈 INSIGHTS
│   └── InsightsDashboard (metrics, charts, timeline)
│
├── 📋 TEMPLATES
│   ├── TemplatesSearchView (browse)
│   ├── TemplatesWorkflowView (detail)
│   ├── TemplatesCollectionView (curated sets)
│   └── SetupWorkflowFromTemplateView (import)
│
├── 👥 PROJECTS
│   ├── Project list sidebar
│   ├── Project detail (tabs: workflows, credentials, executions, variables)
│   └── Project settings (members, roles)
│
├── ⚙️ SETTINGS (15+ sub-screens)
│   ├── PersonalSettings
│   ├── UsersSettings
│   ├── ApiSettings
│   ├── CommunityNodesSettings
│   ├── SourceControlSettings
│   ├── ExternalSecretsSettings
│   ├── SsoSettings
│   ├── LdapSettings
│   ├── LogStreamingSettings
│   ├── WorkerView
│   ├── SecuritySettings
│   ├── AISettings
│   ├── ResolversSettings
│   ├── ProjectRolesSettings
│   ├── UsageAndPlanSettings
│   └── MigrationReportSettings
│
├── 📜 WORKFLOW HISTORY
│   └── WorkflowHistory (version list + diff view)
│
└── 🔧 GLOBAL OVERLAYS
    ├── AppModals (45+ modal dialogs — see Section 10)
    ├── AppCommandBar (Ctrl+K command palette)
    │   ├── Recent resources (workflows, credentials, data tables)
    │   ├── Node commands (add nodes by search)
    │   ├── Workflow commands (test, publish, duplicate, download, import)
    │   ├── Credential commands (open credentials used in workflow)
    │   └── Navigation commands (jump to any screen)
    ├── AppBanners (BannerStack — system alerts)
    │   ├── TrialBanner / TrialOverBanner
    │   ├── EmailConfirmationBanner
    │   ├── WorkflowAutoDeactivatedBanner
    │   ├── NonProductionLicenseBanner
    │   ├── DataTableStorageLimitBanner
    │   ├── CreditWarningBanner (AI credits low)
    │   └── DynamicBanner (custom from backend)
    ├── Toast notifications (bottom-right, auto-dismiss)
    │   ├── Success toasts (saved, published, shared)
    │   ├── Error toasts (with action buttons)
    │   └── Warning toasts
    └── Context menus (useContextMenuItems)
        ├── Node context menu (14 actions)
        ├── Multi-node context menu (7 actions)
        └── Canvas context menu (5 actions)
```

---

## 9. INTERNAL BEHAVIOR (SIMPLIFIED)

### What Happens Internally for Each Action

| User Action | What Updates | Backend Call | Visual Result |
|-------------|-------------|-------------|---------------|
| **Add node** | `workflow.nodes[]` gets new entry | None (local until save) | Node appears on canvas |
| **Move node** | `node.position = [x, y]` | None (local until save) | Node repositions with drag |
| **Connect nodes** | `workflow.connections[src].main[idx]` adds target | None (local until save) | Edge line drawn between ports |
| **Delete node** | Node removed from `workflow.nodes[]`, connections cleaned | None (local until save) | Node + connected edges disappear |
| **Edit parameter** | `node.parameters[name] = value` | May call `/node-parameter-options` for dynamic options | Form field updates |
| **Save workflow** | Full workflow JSON sent to server | `PUT /workflows/:id` | "Saved" indicator appears |
| **Execute workflow** | Triggers execution engine | `POST /workflows/:id/run` | Nodes show spinner → ✓/✗ |
| **Activate workflow** | Sets `active = true`, registers triggers | `POST /workflows/:id/activate` | Toggle turns green |
| **Pin data** | `workflow.pinData[nodeName] = data` | None (saved with workflow) | Pin badge on node |
| **Undo** | Reverts last change via history stack | None (local state) | Canvas reverts one step |
| **Open NDV** | Sets `ndvStore.activeNodeName` | None (state change) | NDV panel slides in |
| **Search nodes** | Filters `nodeTypesStore.nodeTypes` | None (client-side filter) | Node Creator list updates |
| **Add credential** | Credential encrypted + stored | `POST /credentials` | Credential available in node config |
| **Share workflow** | Updates sharing permissions | `POST /workflows/:id/share` | Shared indicator appears |
| **Import template** | Creates new workflow from template | `POST /workflows` | New workflow in editor |

### State Management Flow

```
USER ACTION
    │
    ▼
VUE COMPONENT (emits event)
    │
    ▼
COMPOSABLE / EVENT HANDLER
    │
    ├── Updates PINIA STORE (reactive state)
    │   ├── workflows.store → nodes, connections, settings
    │   ├── canvas.store → viewport, selection
    │   ├── ndv.store → active node, panel state
    │   ├── ui.store → modals, panels, theme
    │   └── nodeTypes.store → available node types
    │
    ├── Makes API CALL (if needed)
    │   ├── REST API → backend controller
    │   └── WebSocket → push events
    │
    └── Updates UI reactively
        ├── VueFlow re-renders canvas
        ├── Pinia triggers component updates
        └── CSS transitions animate changes
```

---

## 10. MODAL & DIALOG CATALOG

n8n has **30+ modals** for various operations:

### Workflow-Related Modals

| Modal | Trigger | Purpose |
|-------|---------|---------|
| **Workflow Settings** | Header menu → Settings | Execution timeout, error workflow, timezone |
| **Workflow Share** | Header → Share button | Add users/projects, set permissions |
| **Workflow Publish** | Header → Publish button | Confirm publishing to production |
| **Workflow Description** | Click description area | Edit workflow description |
| **Workflow Activation Conflict** | Activate when webhook conflict | Resolve conflicting webhook paths |
| **Duplicate Workflow** | Action menu → Duplicate | Name + project selection for copy |
| **Import from URL** | Header menu → Import URL | Paste URL to import workflow JSON |
| **Import cURL** | In HTTP Request node | Convert cURL command to node config |
| **Workflow Extraction** | Context menu → Extract | Name sub-workflow extracted from selection |
| **Workflow Diff** | History / Source control | Side-by-side comparison of versions |

### Credential Modals

| Modal | Trigger | Purpose |
|-------|---------|---------|
| **Setup Credentials** | Node needs credentials | Create/select credential for node |
| **Credential Edit** | Click credential | Full credential editor with test |

### System Modals

| Modal | Trigger | Purpose |
|-------|---------|---------|
| **About** | Settings → About | Version info, links |
| **What's New** | After update | Changelog / new features |
| **Versions** | Update available | Version update notification |
| **NPS Survey** | Periodic prompt | User satisfaction survey |
| **Change Password** | Settings → Change password | Password update form |
| **MFA Setup** | Settings → Enable MFA | TOTP setup with QR code |
| **Confirm Password** | Before destructive action | Re-authenticate for security |
| **Binary Data View** | Click binary data in NDV | Full-screen file/image preview |
| **From AI Parameters** | AI parameter generation | AI-generated parameter suggestions |
| **Command Bar** | Ctrl+K | Quick search for actions, workflows, nodes |
| **Log Stream Config** | Settings → Log streaming | Configure log destination |
| **External Secrets Provider** | Settings → External secrets | Configure secret provider |
| **Stop Many Executions** | Bulk stop in execution list | Confirm stopping multiple executions |
| **Workflow History Publish** | History → Restore version | Confirm restoring old version |
| **AI Builder Diff** | AI makes changes | Review AI-suggested changes before accepting |
| **Agent Editor** | Chat Hub → New Agent | Create/edit personal AI agents |
| **Model Selector** | Chat Hub → Model | Select LLM model by ID |
| **Tools Manager** | Chat Hub → Tools | Manage available tools for agents |
| **Tool Settings** | Agent editor → Configure tool | Per-tool configuration |
| **Provider Settings** | Chat Hub → Provider | Configure AI provider |
| **New Assistant Session** | Chat Hub → New | Start a new chat session |
| **MCP Connect Workflows** | MCP settings | Connect workflows as MCP tools |
| **Add Data Table** | Data Tables → Create | Create new data table |
| **Import CSV** | Data Table → Import | Import CSV into data table |
| **Download Data Table** | Data Table → Download | Export table as CSV/JSON |

### Command Bar (`AppCommandBar`)

Triggered by `Ctrl+K` — provides quick access to everything:

```
Command Bar (spotlight search):
├── Search workflows by name
├── Search nodes by name
├── Quick actions:
│   ├── Create new workflow
│   ├── Open settings
│   ├── View executions
│   ├── Import workflow
│   └── Toggle theme (light/dark)
├── Recent items
└── Keyboard navigation (↑↓ to browse, Enter to select)
```

---

## APPENDIX: Screen Route Map

| Route | View Component | Layout |
|-------|---------------|--------|
| `/` | Redirect → `/home/workflows` | — |
| `/home/workflows` | WorkflowsView | default |
| `/workflow/new` | NodeView | workflow |
| `/workflow/:name` | NodeView | workflow |
| `/workflow/:name/:nodeId` | NodeView (NDV open) | workflow |
| `/workflow/:name/executions` | WorkflowExecutionsView | workflow |
| `/workflow/:name/executions/:id` | WorkflowExecutionsPreview | workflow |
| `/workflow/:name/debug/:id` | NodeView (debug mode) | workflow |
| `/workflow/:name/evaluation` | EvaluationsView | workflow |
| `/workflow/:id/history` | WorkflowHistory | default |
| `/templates/` | TemplatesSearchView | default |
| `/templates/:id` | TemplatesWorkflowView | default |
| `/templates/:id/setup` | SetupWorkflowFromTemplateView | default |
| `/collections/:id` | TemplatesCollectionView | default |
| `/signin` | SigninView | auth |
| `/signup` | SignupView | auth |
| `/setup` | SetupView | auth |
| `/forgot-password` | ForgotMyPasswordView | auth |
| `/change-password` | ChangePasswordView | auth |
| `/settings` | Redirect → /settings/usage | settings |
| `/settings/personal` | SettingsPersonalView | settings |
| `/settings/users` | SettingsUsersView | settings |
| `/settings/api` | SettingsApiView | settings |
| `/settings/community-nodes` | SettingsCommunityNodesView | settings |
| `/settings/environments` | SettingsSourceControl | settings |
| `/settings/external-secrets` | SettingsExternalSecrets | settings |
| `/settings/sso` | SettingsSso | settings |
| `/settings/ldap` | SettingsLdapView | settings |
| `/settings/log-streaming` | SettingsLogStreamingView | settings |
| `/settings/workers` | WorkerView | settings |
| `/settings/ai` | SettingsAIView | settings |
| `/settings/security` | SecuritySettingsView | settings |
| `/settings/resolvers` | SettingsResolversView | settings |
| `/settings/usage` | SettingsUsageAndPlan | settings |
| `/settings/project-roles` | ProjectRolesView | settings |
| `/settings/migration-report` | MigrationReportView | settings |
| `/resource-center` | ResourceCenterView | default |
| `/saml/onboarding` | SamlOnboarding | auth |
| `/oauth/consent` | OAuthConsentView | default |

---

*Generated by deep analysis of n8n v2.15.0 frontend source code.*
