# AIRAIE ← n8n Workflow Architecture Mapping

> How we adopt n8n's workflow editor patterns while keeping AIRAIE's Go+Rust execution engine, governance model, and engineering domain logic.
> Generated: 2026-04-05

---

## 1. Architecture Philosophy

**What we take from n8n:**
- Visual DAG editor UX (canvas, node palette, NDV, expression system)
- Real-time execution feedback via push events
- Data pinning for testing
- Undo/redo history
- Node type description → auto-generated parameter forms

**What we keep from AIRAIE:**
- Go control plane + Rust data plane (not in-process JS)
- NATS JetStream for job dispatch (not Bull/Redis)
- Artifact references, not in-memory blobs
- Board governance (gates, evidence, mode escalation)
- Agent system (proposals, policy engine, memory)
- ToolShelf resolution (5-stage scoring)
- YAML DSL → AST compilation pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    WHAT WE ADOPT FROM N8N                     │
│                                                               │
│  Canvas UX │ Node Palette │ NDV Panel │ Expression Editor    │
│  Push Events │ Data Pinning │ Undo/Redo │ Node Descriptions  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                   WHAT WE KEEP FROM AIRAIE                    │
│                                                               │
│  Go Scheduler │ Rust Workers │ NATS Dispatch │ Docker Exec   │
│  Artifact Lineage │ Board Governance │ Agent Proposals       │
│  ToolShelf │ Evidence Collection │ Mode Escalation            │
│  YAML DSL │ AST Compilation │ Preflight Validation           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. n8n → AIRAIE Concept Mapping

| n8n Concept | n8n Implementation | AIRAIE Equivalent | Key Difference |
|-------------|-------------------|-------------------|----------------|
| **Workflow** | JSON (nodes + connections) | JSON (canvas) + YAML DSL (execution) | AIRAIE has dual representation: visual + compiled |
| **Node** | INode with INodeType | WorkflowEditorNode with ToolContract | AIRAIE nodes backed by versioned, containerized tools |
| **Connection** | `{node, type, index}` | `{source, sourceHandle, target, targetHandle}` | ReactFlow format; handles encode `mode/type/index` |
| **Execution** | In-process JS via WorkflowExecute | Distributed via NATS → Rust → Docker | AIRAIE: isolated containers, not same process |
| **Expression** | `{{ $json.field }}` evaluated in JS | `{{ $json.field }}` evaluated in Go | Same syntax, different runtime |
| **Pin Data** | Stored in workflow.pinData per node | Stored in workflow canvas state | Same concept for testing |
| **Push Events** | WebSocket / SSE via sendDataToUI | SSE via `/v0/runs/{id}/events` | AIRAIE uses SSE exclusively |
| **Node Type** | INodeTypeDescription (500+ built-in) | ToolContract (registered per project) | AIRAIE: project-scoped tool registry |
| **Credential** | Encrypted in DB, injected at runtime | Encrypted in DB (AES), planned | Same pattern |
| **Trigger** | Webhook/Cron/Polling nodes | Trigger node + NATS event source | AIRAIE extends with engineering events |
| **Binary Data** | In-memory base64 blobs | Artifact references (S3 IDs) | Critical: AIRAIE handles multi-GB files |
| **Error Workflow** | Separate error handling workflow | Run retry + agent replanning | AIRAIE: structured retry + AI replanning |

---

## 3. Frontend Architecture Mapping

### 3.1 n8n Frontend Stack → AIRAIE Frontend Stack

| Layer | n8n | AIRAIE |
|-------|-----|--------|
| Framework | Vue 3 + Composition API | React 19 + Hooks |
| State | Pinia stores | Zustand stores |
| Canvas | Vue Flow (@vue-flow/core) | React Flow (@xyflow/react) |
| Styling | CSS variables + Element Plus | Tailwind CSS + custom tokens |
| Server State | Manual fetch + push | React Query 5 + SSE |
| Routing | Vue Router | React Router |
| i18n | @n8n/i18n | (planned) |
| Expression Editor | CodeMirror 6 | CodeMirror 6 (planned) |
| Design System | @n8n/design-system | @airaie/ui |

### 3.2 Store Mapping

| n8n Store (Pinia) | Purpose | AIRAIE Store (Zustand) | Status |
|-------------------|---------|----------------------|--------|
| `workflows.store` (62KB) | Workflow nodes, edges, connections, execution data | `workflowStore` | Exists (basic) |
| `ui.store` (21KB) | Modals, sidebar, notifications | `uiStore` | Exists |
| `nodeTypes.store` (14KB) | Node type registry, categories | **toolTypesStore** | **Missing** |
| `ndv.store` | Active node, input/output panel, draggable | **nodeInspectorStore** | **Missing** |
| `canvas.store` | Canvas viewport, zoom, selection | **canvasStore** | **Missing** |
| `history.store` | Undo/redo stack | **historyStore** | **Missing** |
| `pushConnection.store` | WebSocket/SSE connection state | **sseStore** | **Missing** |
| `executions.store` | Execution list, current execution | `runStore` (basic) + **executionStore** | Partial |
| `settings.store` | App config, feature flags | — | Not needed yet |
| `credentials.store` | Credential management | — | Not needed yet |

### 3.3 Component Mapping

| n8n Component | Purpose | AIRAIE Equivalent | Status |
|---------------|---------|-------------------|--------|
| **NodeView.vue** (65KB) | Main editor page | `WorkflowEditorPage.tsx` | Exists (basic) |
| **Canvas.vue** (30KB) | Vue Flow canvas wrapper | `WorkflowCanvas.tsx` | Exists (basic) |
| **WorkflowCanvas.vue** | Canvas data mapper | `useCanvasMapping` hook | **Missing** |
| **CanvasNode.vue** | Node rendering | `ToolNode.tsx`, `AgentNode.tsx`, etc. | Exists (basic) |
| **CanvasEdge.vue** | Edge rendering | Default ReactFlow edges | Basic |
| **CanvasHandles** | Connection ports | ReactFlow handles | Basic |
| **CanvasBackground.vue** | Grid background | ReactFlow `<Background>` | **Missing** |
| **CanvasControlButtons** | Run, Stop, Clear | `WorkflowEditorBottomBar.tsx` | Exists (stub) |
| **NDV Panel** | Node configuration | `NodePropertiesPanel.tsx` | Exists (basic) |
| **InputPanel.vue** | Input data from parent node | — | **Missing** |
| **OutputPanel.vue** | Execution output display | — | **Missing** |
| **ParameterInput.vue** (59KB) | Auto-generated parameter form | — | **Missing** (critical) |
| **ExpressionParameterInput.vue** | `{{ }}` editor | — | **Missing** |
| **NodePalette** (n8n: Node Creator) | Categorized node browser | `NodePalette.tsx` | Exists |
| **FocusPanel.vue** (24KB) | Alternative detail panel | — | Not needed |
| **ContextMenu** | Right-click menu | — | **Missing** |
| **MiniMap** | Canvas overview | — | **Missing** |
| **RunWorkflowButton** | Execute trigger | `WorkflowEditorBottomBar` | Exists (stub) |

---

## 4. Canvas Architecture — Detailed Mapping

### 4.1 n8n Canvas Data Model

```
n8n:
IWorkflowDb {                          AIRAIE equivalent:
  nodes: INodeUi[]                      WorkflowEditorNode[]
  connections: IConnections             WorkflowEditorEdge[]
  pinData: IPinData                     (planned)
  settings: IWorkflowSettings          WorkflowEditorMetadata
}

INodeUi {                              WorkflowEditorNode (ReactFlow Node):
  id: string                            id: string
  name: string                          data.label: string
  type: string                          data.nodeType: string
  typeVersion: number                   data.version: string
  parameters: INodeParameters           data.inputs: Record<string,unknown>
  position: [x, y]                      position: { x, y }
  disabled?: boolean                    (planned)
  pinData?: IDataObject                 (planned)
  // n8n-specific:
  issues?: INodeIssues                  (planned)
  color?: string                        (planned for sticky notes)
}
```

### 4.2 Connection/Handle Model

```
n8n Canvas Handle Format:
  "outputs/main/0"  =  first main output
  "inputs/main/0"   =  first main input

AIRAIE ReactFlow Handle Format (adopt same pattern):
  sourceHandle: "outputs/main/0"
  targetHandle: "inputs/main/0"

For Agent nodes:
  "inputs/ai_model/0"   =  model sub-port
  "inputs/ai_tool/0"    =  first tool sub-port
  "inputs/ai_policy/0"  =  policy sub-port
  "inputs/ai_memory/0"  =  memory sub-port
```

### 4.3 Node Render Types

| n8n Render Type | AIRAIE Node Type | Visual |
|-----------------|-----------------|--------|
| `default` | `tool` | Rectangle, wrench icon, orange border |
| `default` | `agent` | Rectangle, brain icon, purple border, sub-ports |
| `default` | `trigger` | Rectangle, lightning icon, green border |
| `default` | `logic` | Diamond, IF/Switch/Merge |
| `default` | `gate` | Rectangle, shield icon, status badge |
| `default` | `data` | Rectangle, file icon |
| `stickyNote` | `sticky` | Yellow card, no ports |

### 4.4 Canvas Composables → React Hooks

| n8n Composable (Vue) | AIRAIE Hook (React) | Purpose |
|----------------------|---------------------|---------|
| `useCanvasMapping` | `useCanvasMapping` | Transform workflow data → ReactFlow format |
| `useCanvasLayout` | `useCanvasLayout` | Auto-arrange, tidy-up algorithms |
| `useCanvasTraversal` | `useCanvasTraversal` | Navigate graph (parent/child lookup) |
| `useCanvasOperations` | `useCanvasOperations` | Add/delete/move/connect/copy/paste |
| `useRunWorkflow` | `useRunWorkflow` | Execute workflow, handle SSE updates |
| `useNodeHelpers` | `useNodeHelpers` | Validation, subtitle generation |
| `useWorkflowHelpers` | `useWorkflowHelpers` | Save, diff, merge |
| `useHistory` | `useHistory` | Undo/redo with command pattern |
| `useNodeDirtiness` | `useNodeDirtiness` | Track which nodes need re-execution |
| `usePinnedData` | `usePinnedData` | Manage test data pinning |
| `useDataSchema` | `useDataSchema` | Infer schema from execution output |

---

## 5. Node Detail View (NDV) — Parameter Form Generation

This is n8n's most complex frontend pattern. Their `ParameterInput.vue` is 59KB and recursively generates forms from node type descriptions.

### 5.1 n8n Parameter Model → AIRAIE Tool Contract

```
n8n INodeProperties:                    AIRAIE ToolPort:
{                                       {
  displayName: string                     name: string
  name: string                            type: "artifact"|"parameter"|"metric"
  type: "string"|"number"|               required: boolean
        "boolean"|"collection"|           schema: JSONSchema
        "fixedCollection"|                description: string
        "options"|"resourceLocator"     }
  default: any
  required?: boolean
  displayOptions?: {                    Extended for AIRAIE:
    show: { [param]: value[] }          + resourceLimits (CPU, memory, timeout)
    hide: { [param]: value[] }          + retryPolicy (maxRetries, delay)
  }                                     + artifactSelector (S3 reference picker)
  options?: INodePropertyOptions[]      + expressionEnabled ({{ }} support)
  typeOptions?: {}
}
```

### 5.2 Parameter Rendering Strategy

**n8n approach** (recursive):
```
ParameterInput.vue
├── type === 'string'     → TextInput / ExpressionEditor
├── type === 'number'     → NumberInput
├── type === 'boolean'    → Toggle
├── type === 'options'    → Dropdown
├── type === 'collection' → CollectionParameter (recursive)
├── type === 'fixedCollection' → FixedCollectionParameter (recursive)
├── type === 'resourceLocator' → ResourceLocator
└── displayOptions         → show/hide conditionally
```

**AIRAIE approach** (adopt + extend):
```
ParameterForm.tsx
├── schema.type === 'string'    → TextInput / ExpressionEditor
├── schema.type === 'number'    → NumberInput
├── schema.type === 'integer'   → NumberInput (integer mode)
├── schema.type === 'boolean'   → Toggle
├── schema.type === 'object'    → CollectionForm (recursive)
├── schema.type === 'array'     → ArrayForm (recursive)
├── schema.enum               → Dropdown
├── port.type === 'artifact'  → ArtifactSelector (AIRAIE-specific)
├── port.type === 'metric'    → MetricInput (AIRAIE-specific)
├── hasExpression              → ExpressionEditor overlay
└── Contract-driven            → Generated from ToolContract JSON Schema
```

### 5.3 Expression System

**n8n expressions**: `{{ $json.field }}`, `{{ $('NodeName').json.field }}`
**AIRAIE expressions**: Same syntax + engineering extensions

```javascript
// Shared (adopt from n8n):
{{ $json.max_stress }}                     // Current item data
{{ $('FEA Solver').json.converged }}       // Specific node output
{{ $input.first().json.mesh_quality }}     // First input item

// AIRAIE extensions (keep our own):
{{ $artifacts.mesh_file }}                 // Artifact reference (S3 ID)
{{ $run.id }}                             // Current run metadata
{{ $gate('Evidence').status }}             // Gate evaluation result
{{ $board.mode }}                          // Board mode (explore/study/release)
{{ $cost.total }}                          // Accumulated run cost
{{ $agent.confidence }}                    // Agent scoring result
```

---

## 6. Execution Flow — n8n vs AIRAIE

### 6.1 n8n Execution Flow

```
User clicks "Execute" → POST /workflows/{id}/execute
  ↓
WorkflowRunner.run()
  ↓ (in-process)
WorkflowExecute.processRunExecutionData()
  ↓
Loop: nodeExecutionStack (FIFO queue)
  ├── Pop node → nodeType.execute(context) → in-process JS
  ├── Output → route to connected nodes
  ├── Multi-input? → waitingExecution until all inputs ready
  ├── Push: NodeExecuteBefore → WebSocket → Frontend
  ├── Push: NodeExecuteAfter → WebSocket → Frontend
  └── Repeat until stack empty
  ↓
Push: ExecutionFinished → WebSocket → Frontend
```

### 6.2 AIRAIE Execution Flow (keeps our architecture)

```
User clicks "Run" → POST /v0/workflows/{id}/run
  ↓
WorkflowService.StartWorkflowRun()
  ↓
Go Scheduler: AST → ExecutionPlan → topological levels
  ↓
For each level (parallelizable group):
  For each node in level:
    ├── Evaluate {{ }} expressions (Go runtime)
    ├── Gate/Logic? → execute in-process Go
    ├── Tool? → NATS "jobs.dispatch" → Rust Worker → Docker
    ├── Agent? → ProposalGenerator → PolicyEngine → dispatch
    └── Emit: node_started → NATS "events.{runId}" → SSE → Frontend
  ↓
Rust Worker:
  ├── Download artifacts from S3 → /in volume
  ├── Boot Docker container
  ├── stdout/stderr → NATS "events.{runId}"
  ├── Collect /out → SHA-256 hash → upload to MinIO
  └── Publish JobResult → NATS "results.completed"
  ↓
Go ResultHandler:
  ├── Update node status
  ├── Trigger downstream nodes
  ├── Evidence collection (if board-linked)
  └── Emit: node_completed → SSE → Frontend
  ↓
SSE: run_completed → Frontend
```

### 6.3 Push Event Mapping

| n8n Push Event | AIRAIE SSE Event | When |
|---------------|------------------|------|
| `NodeExecuteBefore` | `node_started` | Node begins execution |
| `NodeExecuteAfter` | `node_completed` | Node finishes (metadata only) |
| `NodeExecuteAfterData` | `node_completed` + output data | Node finishes (with outputs) |
| `ExecutionStarted` | `run_started` (implicit from SSE connect) | Run begins |
| `ExecutionFinished` | `run_completed` | All nodes done |
| `WorkflowExecutionError` | `node_failed` / `run_failed` | Error occurred |
| — | `node_progress` | AIRAIE-specific: progress % |
| — | `log_line` | AIRAIE-specific: container stdout |
| — | `artifact_produced` | AIRAIE-specific: file output |
| — | `evidence_collected` | AIRAIE-specific: metric extracted |
| — | `gate_evaluated` | AIRAIE-specific: gate check result |

---

## 7. Data Flow Between Nodes

### 7.1 n8n Item Model

```typescript
// n8n: Items flow in memory
INodeExecutionData {
  json: IDataObject        // Structured data
  binary?: IBinaryKeyData  // Binary blobs (base64, in-memory)
  pairedItem?: { item, input }  // Lineage tracking
}

// Array of items per output branch:
main: INodeExecutionData[][]
//     ↑ branch index       ↑ item index
```

### 7.2 AIRAIE Edge Envelope (keeps our model)

```typescript
// AIRAIE: Items flow as references
EdgeEnvelope {
  items: [{
    json: {                          // Same as n8n
      mesh_quality: 0.95,
      converged: true,
      max_stress_mpa: 187.3
    },
    artifacts: {                     // AIRAIE-specific: S3 references
      mesh_file: "art_abc123_sha256...",
      stress_map: "art_def456_sha256..."
    },
    metadata: {                      // AIRAIE-specific: execution context
      source_node: "fea_solver_1",
      run_id: "run_xyz789",
      cost_usd: 0.50,
      duration_ms: 15000
    }
  }]
}
```

**Critical difference**: n8n passes binary data in-memory (fine for Slack messages). AIRAIE passes artifact IDs (required for multi-GB CAD files, simulation meshes).

### 7.3 NDV Input/Output Panel

**n8n**: InputPanel shows parent node's `json` + `binary` data in table/JSON view.

**AIRAIE** (adapt):
- **Input Panel**: Shows parent node's `json` data + artifact preview links
- **Output Panel**: Shows execution `json` output + artifact download links
- **Artifact Preview**: Lazy-loaded viewers (3D for STL/GLTF, image for PNG, table for CSV)
- **Expression Mapping**: Drag from input panel → expression in parameter field (n8n pattern)

---

## 8. Implementation Plan — What to Build

### Phase 1: Canvas Foundation (adopt n8n patterns)

**New files to create:**

```
frontend/src/
├── hooks/
│   ├── useCanvasMapping.ts       ← Transform workflow → ReactFlow format
│   ├── useCanvasOperations.ts    ← Add/delete/move/connect nodes
│   ├── useCanvasLayout.ts        ← Auto-arrange, tidy-up
│   ├── useRunWorkflow.ts         ← Execute + SSE subscription
│   ├── useHistory.ts             ← Undo/redo command pattern
│   ├── usePinnedData.ts          ← Test data pinning
│   └── useNodeHelpers.ts         ← Validation, subtitle generation
├── store/
│   ├── canvasStore.ts            ← Viewport, zoom, selection
│   ├── executionStore.ts         ← Active run, node states, SSE
│   ├── nodeInspectorStore.ts     ← NDV active node, panels
│   ├── toolTypesStore.ts         ← Tool registry cache
│   └── historyStore.ts           ← Undo/redo stack
├── components/
│   ├── workflows/
│   │   ├── canvas/
│   │   │   ├── CanvasBackground.tsx      ← Grid background
│   │   │   ├── CanvasMiniMap.tsx          ← Overview minimap
│   │   │   ├── CanvasContextMenu.tsx      ← Right-click menu
│   │   │   ├── CanvasConnectionLine.tsx   ← Temp line while connecting
│   │   │   └── CanvasControls.tsx         ← Zoom/fit/tidy buttons
│   │   ├── nodes/
│   │   │   ├── BaseNode.tsx              ← Shared node chrome
│   │   │   ├── NodeHandle.tsx            ← Connection port (adopt n8n handle format)
│   │   │   ├── NodeStatusBadge.tsx       ← Execution status overlay
│   │   │   └── NodeRunDataBadge.tsx      ← Item count badge
│   │   ├── ndv/
│   │   │   ├── NodeInspector.tsx         ← Main NDV panel
│   │   │   ├── InputPanel.tsx            ← Parent node data
│   │   │   ├── OutputPanel.tsx           ← Execution output
│   │   │   ├── ParameterForm.tsx         ← Auto-generated from contract
│   │   │   ├── ParameterInput.tsx        ← Recursive parameter renderer
│   │   │   ├── ExpressionEditor.tsx      ← {{ }} CodeMirror editor
│   │   │   └── ArtifactSelector.tsx      ← S3 artifact picker (AIRAIE-specific)
│   │   └── execution/
│   │       ├── ExecutionOverlay.tsx       ← Node status badges on canvas
│   │       ├── ExecutionLog.tsx           ← Live log stream
│   │       └── SSEClient.tsx             ← EventSource manager
├── utils/
│   ├── canvasMapping.ts          ← Workflow ↔ ReactFlow transforms
│   ├── expressionParser.ts       ← Parse {{ }} expressions
│   ├── nodeValidation.ts         ← Validate node config against contract
│   └── handleFormat.ts           ← "outputs/main/0" handle encoding
└── types/
    ├── canvas.ts                 ← Canvas-specific types
    ├── execution.ts              ← Execution event types
    └── expression.ts             ← Expression AST types
```

### Phase 2: Execution & Real-Time

**SSE Client** (replaces n8n's WebSocket push):
```typescript
// hooks/useSSE.ts
function useRunSSE(runId: string) {
  const [connected, setConnected] = useState(false);
  const executionStore = useExecutionStore();

  useEffect(() => {
    const es = new EventSource(`/v0/runs/${runId}/events`);
    
    es.addEventListener('node_started', (e) => {
      const data = JSON.parse(e.data);
      executionStore.setNodeStatus(data.node_id, 'running');
    });
    
    es.addEventListener('node_completed', (e) => {
      const data = JSON.parse(e.data);
      executionStore.setNodeStatus(data.node_id, data.status);
      executionStore.setNodeOutput(data.node_id, data.outputs);
    });
    
    es.addEventListener('log_line', (e) => {
      const data = JSON.parse(e.data);
      executionStore.addLog(data);
    });
    
    es.addEventListener('artifact_produced', (e) => {
      const data = JSON.parse(e.data);
      executionStore.addArtifact(data);
    });
    
    es.addEventListener('evidence_collected', (e) => {
      const data = JSON.parse(e.data);
      executionStore.addEvidence(data);
    });
    
    es.addEventListener('run_completed', (e) => {
      const data = JSON.parse(e.data);
      executionStore.setRunStatus(data.status);
    });
    
    es.addEventListener('done', () => es.close());
    es.onerror = () => { /* reconnect logic */ };
    
    setConnected(true);
    return () => es.close();
  }, [runId]);

  return { connected };
}
```

**Execution Store** (mirrors n8n's execution tracking):
```typescript
// store/executionStore.ts
interface ExecutionState {
  activeRunId: string | null;
  runStatus: RunStatus;
  nodeStates: Map<string, {
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
    outputs?: Record<string, unknown>;
    error?: string;
    startedAt?: string;
    completedAt?: string;
    progress?: number;
  }>;
  logs: LogEntry[];
  artifacts: ArtifactEntry[];
  evidence: EvidenceEntry[];
  sseConnected: boolean;
  
  // Actions:
  startRun(runId: string): void;
  setNodeStatus(nodeId: string, status: string): void;
  setNodeOutput(nodeId: string, outputs: Record<string, unknown>): void;
  addLog(entry: LogEntry): void;
  addArtifact(entry: ArtifactEntry): void;
  addEvidence(entry: EvidenceEntry): void;
  setRunStatus(status: RunStatus): void;
  reset(): void;
}
```

### Phase 3: NDV & Parameter Forms

**Contract-driven form generation** (AIRAIE's version of n8n's ParameterInput):

```typescript
// components/ndv/ParameterForm.tsx
function ParameterForm({ contract, values, onChange }) {
  return (
    <>
      {contract.inputs.map(port => (
        <ParameterInput
          key={port.name}
          port={port}
          value={values[port.name]}
          onChange={(v) => onChange(port.name, v)}
        />
      ))}
      <ResourceLimitsSection />   {/* AIRAIE-specific */}
      <RetryPolicySection />      {/* AIRAIE-specific */}
    </>
  );
}

// components/ndv/ParameterInput.tsx (recursive, like n8n's)
function ParameterInput({ port, value, onChange }) {
  const schema = port.schema;
  
  if (port.type === 'artifact') return <ArtifactSelector ... />;
  if (port.type === 'metric') return <MetricInput ... />;
  
  switch (schema?.type) {
    case 'string':  return hasExpression ? <ExpressionEditor /> : <TextInput />;
    case 'number':  return <NumberInput />;
    case 'integer': return <NumberInput integer />;
    case 'boolean': return <Toggle />;
    case 'object':  return <ObjectForm schema={schema.properties} />; // recursive
    case 'array':   return <ArrayForm schema={schema.items} />;       // recursive
    default:
      if (schema?.enum) return <Dropdown options={schema.enum} />;
      return <TextInput />;
  }
}
```

---

## 9. Key Architectural Decisions

### 9.1 Dual Representation (Canvas JSON + YAML DSL)

n8n stores everything in one JSON blob. AIRAIE separates:

```
Canvas State (what user sees):          Execution Contract (what runs):
{                                       apiVersion: airaie.workflow/v1
  nodes: [                              metadata:
    { id, position, data: {               name: fea-pipeline
        label, nodeType, inputs,          version: 3
        version, limits, retry          nodes:
    }}                                    - id: mesh_gen
  ],                                        tool: mesh-generator@1.0
  edges: [                                  inputs:
    { source, target,                         geometry: $inputs.cad_file
      sourceHandle, targetHandle              density: 0.8
    }                                       depends_on: []
  ],                                      - id: fea_solver
  metadata: {                               tool: fea-solver@2.1
    id, name, version, status               inputs:
  }                                           mesh: $nodes.mesh_gen.outputs.mesh
}                                           depends_on: [mesh_gen]
```

**Save** = persist canvas JSON (positions, visual config).  
**Compile** = transform canvas → YAML DSL → validate → AST.  
**Publish** = freeze AST as immutable version.  
**Run** = execute published AST.

### 9.2 ReactFlow Handle Format (adopt n8n pattern)

```typescript
// handleFormat.ts
function encodeHandle(mode: 'inputs' | 'outputs', type: string, index: number): string {
  return `${mode}/${type}/${index}`;
  // "outputs/main/0", "inputs/ai_tool/1"
}

function decodeHandle(handle: string): { mode: string; type: string; index: number } {
  const [mode, type, index] = handle.split('/');
  return { mode, type, index: parseInt(index) };
}

// Connection types:
const CONNECTION_TYPES = {
  MAIN: 'main',           // Standard data flow (json + artifact refs)
  AI_MODEL: 'ai_model',   // LLM model connection (agent sub-port)
  AI_TOOL: 'ai_tool',     // Tool available to agent (agent sub-port)
  AI_POLICY: 'ai_policy', // Governance policy (agent sub-port)
  AI_MEMORY: 'ai_memory', // Memory store (agent sub-port)
};
```

### 9.3 Node Type Resolution

n8n loads node types from built-in packages. AIRAIE loads from the Tool Registry API:

```typescript
// store/toolTypesStore.ts
interface ToolTypesState {
  toolTypes: Map<string, ToolTypeDescription>;  // tool_id → description
  categories: string[];
  loaded: boolean;
  
  // Actions:
  fetchToolTypes(): void;   // GET /v0/tools + GET /v0/node-types
  getToolType(toolRef: string): ToolTypeDescription;
  isTriggerType(type: string): boolean;
}

// ToolTypeDescription (AIRAIE's version of INodeTypeDescription)
interface ToolTypeDescription {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  contract: ToolContract;       // inputs[], outputs[] with JSON Schema
  resourceDefaults: ResourceLimits;
  retryDefaults: RetryPolicy;
  adapter: 'docker' | 'python' | 'wasm' | 'remote-api';
  // AIRAIE-specific:
  trustLevel: string;
  successRate: number;
  costEstimate: number;
}
```

### 9.4 Execution Status on Canvas

n8n overlays execution badges on nodes. AIRAIE does the same via SSE:

```typescript
// In useCanvasMapping:
function mapNodeExecutionStatus(
  node: WorkflowEditorNode,
  executionState: ExecutionState
): CanvasNodeData {
  const nodeState = executionState.nodeStates.get(node.id);
  return {
    ...node.data,
    execution: {
      status: nodeState?.status,
      running: nodeState?.status === 'running',
      progress: nodeState?.progress,
    },
    runData: {
      outputs: nodeState?.outputs,
      visible: !!nodeState,
    },
  };
}
```

---

## 10. What NOT to Copy from n8n

| n8n Pattern | Why We Skip It | AIRAIE Alternative |
|-------------|---------------|-------------------|
| In-process JS execution | Can't handle multi-GB engineering files | Rust workers + Docker containers |
| Binary data in memory | Engineering files are too large | S3 artifact references |
| Vue Flow | We're React, not Vue | React Flow (@xyflow/react) |
| Element Plus UI | Vue component library | Tailwind CSS + @airaie/ui |
| Bull/Redis queue | We already have NATS JetStream | NATS dispatch |
| TypeORM | We already have Go + PostgreSQL | Go stores + raw SQL |
| Webhook-as-trigger | Overly complex for MVP | Simple manual + cron triggers |
| Community nodes | Not needed for engineering domain | Project-scoped tool registry |
| Node versioning by typeVersion | Complex migration logic | Tool version as semver string |
| Credential injection | Not MVP | Planned for auth sprint |

---

## 11. Summary: The Hybrid Architecture

```
┌─────────────────────────── FRONTEND ───────────────────────────┐
│                                                                  │
│  ┌─ Canvas (React Flow) ──────────────────────────────────┐    │
│  │  n8n pattern: drag/drop nodes, connect edges,          │    │
│  │  handle format "outputs/main/0", execution badges,     │    │
│  │  minimap, context menu, undo/redo                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─ NDV (Node Inspector) ─────────────────────────────────┐    │
│  │  n8n pattern: auto-generated forms from contract,      │    │
│  │  expression editor, input/output panels                │    │
│  │  AIRAIE extension: artifact selector, resource limits, │    │
│  │  retry policy, agent sub-port config                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─ Execution (SSE Client) ───────────────────────────────┐    │
│  │  n8n pattern: real-time node status updates,           │    │
│  │  progressive execution tree, push events               │    │
│  │  AIRAIE extension: artifact events, evidence events,   │    │
│  │  gate evaluation events, container logs                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
├──────────────────────────── REST + SSE ────────────────────────┤
│                                                                  │
│  ┌─ Go Control Plane ─────────────────────────────────────┐    │
│  │  AIRAIE: YAML DSL compiler, DAG scheduler,             │    │
│  │  policy engine, evidence collector, board governance,   │    │
│  │  agent runtime, ToolShelf resolution                   │    │
│  └───────────────┬────────────────────────────────────────┘    │
│                  │ NATS JetStream                                │
│  ┌───────────────┴────────────────────────────────────────┐    │
│  │  Rust Data Plane                                        │    │
│  │  AIRAIE: Docker container execution, artifact I/O,     │    │
│  │  SHA-256 hashing, S3 upload, stdout streaming          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Result**: n8n's battle-tested UX patterns + AIRAIE's engineering-grade execution backbone.

---

*This document should be the implementation reference when building each component. For every frontend piece, check the n8n equivalent listed here, study its source, then adapt for React + AIRAIE's domain.*
