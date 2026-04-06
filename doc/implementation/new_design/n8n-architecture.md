# n8n Complete Architecture & Technical Documentation

> **Purpose**: Deep system-level reverse-engineering of n8n for building a similar workflow automation platform.
> **Version analyzed**: 2.15.0 | **Date**: 2026-03-31

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Project Structure Analysis](#2-project-structure-analysis)
3. [Node System](#3-node-system)
4. [Workflow Engine](#4-workflow-engine)
5. [Editor UI (Canvas)](#5-editor-ui-canvas)
6. [Execution Flow](#6-execution-flow)
7. [Trigger System](#7-trigger-system)
8. [Execution UI / Debug Panel](#8-execution-ui--debug-panel)
9. [Data Flow & Storage](#9-data-flow--storage)
10. [Evaluation / Testing System](#10-evaluation--testing-system)
11. [API & Backend](#11-api--backend)
12. [Design Patterns Used](#12-design-patterns-used)
13. [Rebuilding Guide](#13-rebuilding-guide)
14. [Visual Flow Diagrams](#14-visual-flow-diagrams)

---

## 1. HIGH-LEVEL OVERVIEW

### What is n8n?

n8n is an **open-source workflow automation platform** that allows users to connect different services, APIs, and data sources through a visual node-based editor. Users build workflows by placing nodes on a canvas, connecting them with edges, and configuring each node's parameters. When executed, data flows through the graph from trigger nodes to action nodes.

### Core Purpose

- **Visual Workflow Automation**: Drag-and-drop interface for creating automation pipelines
- **Integration Hub**: 400+ built-in integrations (nodes) for external services
- **Self-Hosted**: Can be deployed on-premise for data control
- **Extensible**: Plugin architecture for custom nodes and credentials

### Architectural Overview

```
+---------------------------------------------------------------------+
|                        FRONTEND (Vue 3 + Pinia)                     |
|  +------------------+  +------------------+  +-------------------+  |
|  | Canvas Editor    |  | Node Detail View |  | Execution Panel   |  |
|  | (@vue-flow/core) |  | (NDV)            |  | (Run Data View)   |  |
|  +------------------+  +------------------+  +-------------------+  |
+------------------------------|--------------------------------------+
                               | REST API + WebSocket (Push)
+------------------------------|--------------------------------------+
|                        BACKEND (Node.js + Express)                  |
|  +------------------+  +------------------+  +-------------------+  |
|  | Controllers      |  | Services         |  | Webhook Server    |  |
|  | (REST endpoints) |  | (Business logic) |  | (Trigger handler) |  |
|  +------------------+  +------------------+  +-------------------+  |
|                               |                                     |
|  +------------------+  +------------------+  +-------------------+  |
|  | Execution Engine |  | Node Loader      |  | Active Workflows  |  |
|  | (WorkflowExecute)|  | (Node Registry)  |  | (Trigger Mgmt)    |  |
|  +------------------+  +------------------+  +-------------------+  |
+------------------------------|--------------------------------------+
                               |
+------------------------------|--------------------------------------+
|                     DATABASE LAYER (TypeORM)                        |
|  +------------------+  +------------------+  +-------------------+  |
|  | WorkflowEntity   |  | ExecutionEntity  |  | CredentialsEntity |  |
|  | (nodes, conns)   |  | (run data)       |  | (encrypted)       |  |
|  +------------------+  +------------------+  +-------------------+  |
|                SQLite (dev) / PostgreSQL (prod)                     |
+---------------------------------------------------------------------+
```

### Data Flow: Trigger to Output

```
1. TRIGGER EVENT (webhook received / cron fires / manual click)
         |
2. Backend creates Execution record in DB
         |
3. WorkflowExecute.run() initializes node execution stack
         |
4. EXECUTION LOOP:
   a. Pop next node from execution stack
   b. Gather input data from parent nodes' output
   c. Call node.execute() / node.trigger() / node.webhook()
   d. Store output in runData[nodeName]
   e. Push child nodes onto execution stack with output data
   f. Repeat until stack is empty
         |
5. Store final execution result in DB
         |
6. Push execution result to frontend via WebSocket
```

---

## 2. PROJECT STRUCTURE ANALYSIS

### Monorepo Architecture

n8n uses **pnpm workspaces** with **Turbo** for build orchestration. The repository is organized as:

```
n8n/
├── packages/
│   ├── @n8n/                    # Scoped internal packages
│   │   ├── api-types/           # Shared TypeScript interfaces (FE <-> BE)
│   │   ├── config/              # Centralized configuration management
│   │   ├── db/                  # Database entities, repositories, migrations
│   │   ├── di/                  # Dependency injection container
│   │   ├── decorators/          # Controller/route decorators
│   │   ├── errors/              # Shared error classes
│   │   ├── permissions/         # RBAC permission system
│   │   ├── nodes-langchain/     # AI/LangChain integration nodes
│   │   ├── task-runner/         # Sandboxed code execution (VM)
│   │   ├── constants/           # Shared constants
│   │   └── ...                  # ~30+ internal packages
│   ├── cli/                     # Express server, REST API, CLI commands
│   ├── core/                    # Workflow execution engine
│   ├── workflow/                # Core workflow types and interfaces
│   ├── nodes-base/              # 400+ built-in integration nodes
│   ├── node-dev/                # CLI tool for node development
│   ├── frontend/
│   │   ├── editor-ui/           # Vue 3 frontend application
│   │   └── @n8n/
│   │       ├── design-system/   # Vue component library
│   │       ├── i18n/            # Internationalization
│   │       ├── stores/          # Shared Pinia stores
│   │       ├── composables/     # Shared Vue composables
│   │       ├── rest-api-client/ # API client for backend
│   │       ├── chat/            # Chat widget component
│   │       └── storybook/       # Component storybook
│   ├── extensions/
│   │   └── insights/            # Analytics/insights extension
│   └── testing/
│       └── playwright/          # E2E test suite
├── pnpm-workspace.yaml          # Workspace configuration
├── turbo.json                   # Build orchestration
└── package.json                 # Root scripts
```

### Package Deep Dive

#### `packages/workflow` — Core Types & Interfaces

**Purpose**: Defines the fundamental data structures, interfaces, and utility functions that ALL other packages depend on. This is the "schema" layer.

**Key files**:
| File | Purpose |
|------|---------|
| `src/interfaces.ts` | 2500+ line file with ALL core interfaces: `INode`, `INodeType`, `INodeExecutionData`, `IConnection`, `IConnections`, etc. |
| `src/workflow.ts` | `Workflow` class — the in-memory representation of a workflow graph |
| `src/workflow-expression.ts` | Expression evaluation engine (`{{ $json.field }}` syntax) |
| `src/node-helpers.ts` | Helper functions for node property resolution |
| `src/common/` | Graph traversal utilities (`getParentNodes`, `getChildNodes`, `mapConnectionsByDestination`) |
| `src/constants.ts` | Node type constants, connection types |
| `src/errors/` | Error classes: `NodeOperationError`, `NodeApiError`, `ExpressionError` |

**Responsibilities**:
- Define the `INodeType` interface that all nodes implement
- Define `INodeExecutionData` — the data format flowing between nodes
- Define `IConnections` — the graph adjacency structure
- Provide the `Workflow` class for in-memory workflow manipulation
- Provide expression evaluation for `{{ }}` template syntax
- Graph traversal utilities for finding parent/child nodes

**Dependencies**: Minimal external dependencies (standalone foundation layer)

---

#### `packages/core` — Execution Engine

**Purpose**: The workflow execution engine that takes a `Workflow` object and runs it, executing nodes in the correct order.

**Key files**:
| File | Purpose |
|------|---------|
| `src/execution-engine/workflow-execute.ts` | `WorkflowExecute` class — THE core execution loop |
| `src/execution-engine/node-execute-functions.ts` | Functions provided to nodes during execution (`this.getInputData()`, etc.) |
| `src/execution-engine/partial-execution/` | Partial execution logic (execute subset of workflow) |
| `src/execution-engine/directed-graph.ts` | DAG representation for execution planning |
| `src/binary-data/` | Binary data handling (files, images) |
| `src/node-execution-context/` | Execution context implementations for each node type |

**Responsibilities**:
- Execute workflows by processing nodes in topological order
- Manage the node execution stack (BFS-like traversal)
- Pass data between nodes via `INodeExecutionData` arrays
- Handle retries, error outputs, and pinned data
- Support partial execution ("execute until here")
- Manage binary data storage and conversion

**Dependencies**: `packages/workflow` for types

---

#### `packages/cli` — Backend Server

**Purpose**: Express.js-based REST API server, CLI commands, webhook handling, and all backend business logic.

**Key files**:
| File | Purpose |
|------|---------|
| `src/server.ts` | Express server setup and middleware |
| `src/workflows/workflows.controller.ts` | CRUD endpoints for workflows (`/workflows`) |
| `src/workflows/workflow-execution.service.ts` | Orchestrates workflow execution |
| `src/executions/execution.service.ts` | Execution CRUD and data retrieval |
| `src/controllers/auth.controller.ts` | Authentication endpoints |
| `src/controllers/node-types.controller.ts` | Node type listing for frontend |
| `src/webhooks/webhook-service.ts` | Webhook registration and handling |
| `src/active-workflow-manager.ts` | Manages active (trigger-based) workflows |
| `src/push/` | WebSocket push service for real-time updates |
| `src/credential-types.ts` | Credential type loading |

**Responsibilities**:
- Serve REST API to the frontend
- Handle webhook endpoints for trigger nodes
- Manage workflow activation/deactivation
- Orchestrate workflow execution
- Credential encryption/decryption
- User authentication and authorization
- Push real-time updates via WebSocket

**Dependencies**: `packages/core`, `packages/workflow`, `packages/@n8n/db`

---

#### `packages/nodes-base` — Built-in Nodes

**Purpose**: Collection of 400+ built-in integration nodes (Slack, Gmail, HTTP Request, etc.) and their associated credentials.

**Structure**:
```
nodes-base/
├── nodes/
│   ├── Slack/
│   │   ├── Slack.node.ts          # Node implementation
│   │   ├── SlackTrigger.node.ts   # Trigger variant
│   │   ├── GenericFunctions.ts    # Shared API helpers
│   │   └── v2/                    # Versioned implementation
│   ├── HttpRequest/
│   │   └── HttpRequestV3.node.ts
│   ├── Set/
│   │   ├── Set.node.ts            # VersionedNodeType wrapper
│   │   ├── v1/SetV1.node.ts
│   │   └── v2/SetV2.node.ts
│   ├── Webhook/
│   │   └── Webhook.node.ts
│   ├── Cron/
│   │   └── Cron.node.ts
│   └── ... (400+ more)
├── credentials/
│   ├── SlackApi.credentials.ts
│   ├── HttpBasicAuth.credentials.ts
│   └── ... (credential type definitions)
└── package.json                   # Lists all nodes and credentials
```

**Responsibilities**:
- Implement all built-in nodes
- Define credential types for each service
- Provide node-specific API helper functions

---

#### `packages/frontend/editor-ui` — Frontend Application

**Purpose**: The main Vue 3 SPA that provides the visual workflow editor.

**Key directories**:
| Directory | Purpose |
|-----------|---------|
| `src/features/workflows/canvas/` | Canvas editor with @vue-flow/core |
| `src/features/ndv/` | Node Detail View (parameter editing panel) |
| `src/features/execution/` | Execution history and monitoring |
| `src/features/credentials/` | Credential management UI |
| `src/features/shared/nodeCreator/` | Node selection panel |
| `src/app/stores/` | Core Pinia stores (workflow, UI, canvas, etc.) |
| `src/app/views/` | Route views (WorkflowPage, ExecutionsPage, etc.) |

**Dependencies**: Vue 3, Pinia, @vue-flow/core, CodeMirror, Element Plus

---

#### `packages/@n8n/db` — Database Layer

**Purpose**: TypeORM entities, repositories, and migrations.

**Key entities**:
| Entity | Purpose |
|--------|---------|
| `WorkflowEntity` | Stores workflow name, nodes[], connections{}, settings |
| `ExecutionEntity` | Stores execution status, mode, timing, workflowId |
| `ExecutionData` | Stores full execution runData (input/output per node) |
| `CredentialsEntity` | Stores encrypted credential data |
| `User` | User accounts with role |
| `SharedWorkflow` | M:N relationship: users/projects <-> workflows |
| `WebhookEntity` | Registered webhook paths |
| `TagEntity` | Workflow tags |
| `Project` | Project/team for organizing workflows |

**Supported databases**: SQLite (development), PostgreSQL (production)

---

### Package Dependency Graph

```
                    packages/workflow          (Foundation: types & interfaces)
                         |
                    packages/core             (Execution engine)
                         |
              +----------+-----------+
              |                      |
        packages/cli            packages/nodes-base
        (Backend server)        (Node implementations)
              |
        packages/@n8n/db
        (Database layer)
              |
    packages/frontend/editor-ui
    (Vue 3 Frontend)
```

---

## 3. NODE SYSTEM

### What is a "Node"?

A **node** is the fundamental building block of n8n workflows. Each node represents:
- A **single operation** (e.g., "Send email", "Filter items", "HTTP request")
- An **integration point** with an external service
- A **data transformation** step

Nodes are connected in a directed acyclic graph (DAG). Data flows from one node's **output** to another node's **input** via **connections**.

### Node Architecture

Every node implements the `INodeType` interface defined in `packages/workflow/src/interfaces.ts`:

```typescript
// packages/workflow/src/interfaces.ts:1953
export interface INodeType {
    description: INodeTypeDescription;

    // Regular execution (most nodes)
    execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;

    // Trigger execution (cron, polling)
    trigger?(this: ITriggerFunctions): Promise<ITriggerResponse | undefined>;

    // Webhook execution (HTTP triggers)
    webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;

    // Polling execution (periodic checks)
    poll?(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;

    // AI/LangChain data supply
    supplyData?(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;

    // Dynamic options loading
    methods?: {
        loadOptions?: { [key: string]: (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]> };
        listSearch?: { [key: string]: (this: ILoadOptionsFunctions, filter?: string, paginationToken?: string) => ... };
        credentialTest?: { [key: string]: ICredentialTestFunction };
        resourceMapping?: { ... };
    };
}
```

### Node Type Description

The `description` property is the **metadata** that tells n8n how to render the node in the UI:

```typescript
// packages/workflow/src/interfaces.ts:2435
export interface INodeTypeDescription {
    displayName: string;              // "Edit Fields (Set)"
    name: string;                     // "set" (unique identifier)
    icon: string;                     // "fa:pen" or "file:slack.svg"
    group: string[];                  // ["input"] or ["trigger"]
    version: number | number[];       // [3, 3.1, 3.2, 3.3, 3.4]
    description: string;              // Human-readable description
    defaults: { name: string };       // Default node name when placed on canvas
    inputs: NodeConnectionType[];     // [NodeConnectionTypes.Main] — what inputs it accepts
    outputs: NodeConnectionType[];    // [NodeConnectionTypes.Main] — what outputs it produces
    properties: INodeProperties[];    // UI parameters (forms, dropdowns, etc.)
    credentials?: INodeCredentialDescription[];  // Required credentials
    subtitle?: string;                // Dynamic subtitle expression
    polling?: true;                   // Whether it's a polling trigger
    webhooks?: IWebhookDescription[]; // Webhook definitions
    requestDefaults?: HttpRequestOptions;  // For declarative REST nodes
}
```

### Node Properties System

Properties define the **configuration UI** for each node:

```typescript
export interface INodeProperties {
    displayName: string;              // "Operation"
    name: string;                     // "operation"
    type: NodePropertyTypes;          // "options", "string", "number", "boolean", etc.
    default: NodeParameterValueType;  // Default value
    description?: string;             // Help text
    options?: INodePropertyOptions[]; // For "options" type
    displayOptions?: {                // Conditional visibility
        show?: { [key: string]: NodeParameterValue[] };
        hide?: { [key: string]: NodeParameterValue[] };
    };
    noDataExpression?: boolean;       // Disable expression support
    required?: boolean;
    typeOptions?: INodePropertyTypeOptions;
}
```

**Property types**: `string`, `number`, `boolean`, `options`, `multiOptions`, `collection`, `fixedCollection`, `color`, `dateTime`, `json`, `notice`, `resourceLocator`, `resourceMapper`, `filter`, `assignmentCollection`

### Data Flow Between Nodes

Data flows as **arrays of items**. Each item is an `INodeExecutionData`:

```typescript
// packages/workflow/src/interfaces.ts:1449
export interface INodeExecutionData {
    json: IDataObject;                // The main data payload (key-value pairs)
    binary?: IBinaryKeyData;          // Optional binary data (files, images)
    error?: NodeApiError | NodeOperationError;
    pairedItem?: IPairedItemData;     // Tracks which input item produced this output
}
```

**Critical concept**: Nodes receive and return `INodeExecutionData[][]` — a **2D array**:
- **Outer array**: Output index (for nodes with multiple outputs, like IF node)
- **Inner array**: Items in that output

```
Node Output:  [                        ← Output branches
    [item1, item2, item3],            ← Branch 0: 3 items
    [item4, item5]                    ← Branch 1: 2 items (e.g., IF "false" branch)
]
```

### Connections Model

Connections are stored as a nested object indexed by **source node name**:

```typescript
// packages/workflow/src/interfaces.ts
export type NodeInputConnections = Array<IConnection[] | null>;

export interface INodeConnections {
    [outputType: string]: NodeInputConnections;  // e.g., "main"
}

export interface IConnections {
    [sourceNodeName: string]: INodeConnections;
}

export interface IConnection {
    node: string;           // Destination node name
    type: NodeConnectionType;  // "main", "ai_tool", "ai_memory", etc.
    index: number;          // Input index on destination node
}
```

**Example connection structure**:
```json
{
    "HTTP Request": {
        "main": [
            [
                { "node": "Edit Fields", "type": "main", "index": 0 }
            ]
        ]
    },
    "Edit Fields": {
        "main": [
            [
                { "node": "Slack", "type": "main", "index": 0 }
            ]
        ]
    }
}
```

This reads as: "HTTP Request" output 0 → "Edit Fields" input 0 → "Slack" input 0.

### Trigger Nodes vs Regular Nodes

| Aspect | Regular Node | Trigger Node |
|--------|-------------|--------------|
| **Method** | `execute()` | `trigger()`, `webhook()`, or `poll()` |
| **Inputs** | Has inputs (receives data from parent) | No inputs (`inputs: []`) |
| **Group** | `['input']` or `['transform']` | `['trigger']` |
| **Activation** | Runs during workflow execution | Runs continuously when workflow is active |
| **Data source** | Receives from parent node | Generates data from external event |

### Example: Regular Node (Edit Fields / Set)

```typescript
// packages/nodes-base/nodes/Set/v2/SetV2.node.ts
export class SetV2 implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Edit Fields (Set)',
        name: 'set',
        iconColor: 'blue',
        group: ['input'],
        version: [3, 3.1, 3.2, 3.3, 3.4],
        description: 'Modify, add, or remove item fields',
        defaults: { name: 'Edit Fields' },
        inputs: [NodeConnectionTypes.Main],      // One main input
        outputs: [NodeConnectionTypes.Main],     // One main output
        properties: [
            {
                displayName: 'Mode',
                name: 'mode',
                type: 'options',
                options: [
                    { name: 'Manual Mapping', value: 'manual' },
                    { name: 'JSON', value: 'raw' },
                ],
                default: 'manual',
            },
            // ... more properties
        ],
    };

    async execute(this: IExecuteFunctions) {
        const items = this.getInputData();     // Get input items from parent node
        const mode = this.getNodeParameter('mode', 0) as string;
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            // Process each item...
            const newItem = await processItem(items[i], i, options);
            returnData.push(newItem);
        }

        return [returnData];                   // Return output as [[items]]
    }
}
```

### Example: Trigger Node (Cron)

```typescript
// packages/nodes-base/nodes/Cron/Cron.node.ts
export class Cron implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Cron',
        name: 'cron',
        icon: 'fa:clock',
        group: ['trigger', 'schedule'],       // Trigger group
        version: 1,
        inputs: [],                            // NO inputs — it's a trigger
        outputs: [NodeConnectionTypes.Main],
        properties: [
            {
                displayName: 'Trigger Times',
                name: 'triggerTimes',
                type: 'fixedCollection',
                // ... cron schedule config
            },
        ],
    };

    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
        const triggerTimes = this.getNodeParameter('triggerTimes');
        const expressions = triggerTimes.item.map(toCronExpression);

        const executeTrigger = () => {
            // Emit data to start the workflow
            this.emit([this.helpers.returnJsonArray([{}])]);
        };

        // Register cron jobs
        expressions.forEach((expr) =>
            this.helpers.registerCron({ expression: expr }, executeTrigger)
        );

        return {
            manualTriggerFunction: async () => executeTrigger(),  // For manual testing
        };
    }
}
```

### Node Execution Lifecycle

```
1. Node is popped from execution stack
2. Input data gathered from parent nodes' outputs
3. Execution context created (IExecuteFunctions)
4. node.execute()/trigger()/webhook() called
5. Node accesses input via this.getInputData()
6. Node reads parameters via this.getNodeParameter(name, itemIndex)
7. Node performs its operation (API call, transform, etc.)
8. Node returns INodeExecutionData[][] (output items per branch)
9. Output stored in runData[nodeName]
10. Child nodes pushed onto execution stack with the output data
```

### Credential Type Definition

Credentials implement the `ICredentialType` interface (`packages/workflow/src/interfaces.ts:346`):

```typescript
export interface ICredentialType {
    name: string;                  // "slackApi"
    displayName: string;           // "Slack API"
    icon?: Icon;
    extends?: string[];            // Inherit from other credential types
    properties: INodeProperties[]; // Credential fields (API key, token, etc.)
    authenticate?: IAuthenticate;  // How to apply auth to requests
    preAuthentication?: (creds) => Promise<IDataObject>;  // Pre-auth step
    test?: ICredentialTestRequest; // Test if credential works
    httpRequestNode?: ICredentialHttpRequestNode;  // HTTP Request node support
}
```

Credentials are declared in `packages/nodes-base/credentials/` and registered in `package.json`.

### Node Loading & Registration

Nodes are **lazily loaded** for performance (`packages/core/src/nodes-loader/`):

```
1. Build time: Generate metadata files (nodes.json, types.json)
2. Startup: Read metadata (names, categories, versions) — NO class loading
3. On demand: Load actual node class only when needed (getNode())

Registration in package.json:
{
    "n8n": {
        "nodes": ["dist/nodes/Set/Set.node.js", ...],
        "credentials": ["dist/credentials/SlackApi.credentials.js", ...]
    }
}
```

The `LoadNodesAndCredentials` service discovers packages, reads their metadata, and provides `getNode(fullType)` where `fullType` = `"n8n-nodes-base.set"`.

### Node Connection Types

Beyond the standard `main` connection, n8n supports specialized connection types for AI:

```typescript
export enum NodeConnectionTypes {
    Main = 'main',              // Standard data flow
    AiAgent = 'ai_agent',
    AiChain = 'ai_chain',
    AiDocument = 'ai_document',
    AiEmbedding = 'ai_embedding',
    AiLanguageModel = 'ai_languageModel',
    AiMemory = 'ai_memory',
    AiOutputParser = 'ai_outputParser',
    AiRetriever = 'ai_retriever',
    AiTextSplitter = 'ai_textSplitter',
    AiTool = 'ai_tool',
    AiVectorStore = 'ai_vectorStore',
}
```

---

## 4. WORKFLOW ENGINE

### Workflow Class

The `Workflow` class (`packages/workflow/src/workflow.ts`) is the in-memory representation:

```typescript
export class Workflow {
    id: string;
    name: string | undefined;
    nodes: INodes = {};                    // Map<nodeName, INode>
    connectionsBySourceNode: IConnections;  // Adjacency list (source -> dest)
    connectionsByDestinationNode: IConnections;  // Inverted adjacency list
    nodeTypes: INodeTypes;                 // Node type registry
    expression: WorkflowExpression;        // Expression evaluator
    active: boolean;
    settings: IWorkflowSettings;
    staticData: IDataObject;               // Persistent data across executions
    pinData?: IPinData;                    // Pinned (mock) data for testing
}
```

### Workflow JSON Structure

A workflow is stored as JSON with this structure:

```json
{
    "id": "wf_abc123",
    "name": "My Workflow",
    "active": false,
    "nodes": [
        {
            "id": "node_1",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [240, 300],
            "parameters": {
                "httpMethod": "POST",
                "path": "my-hook"
            },
            "webhookId": "wh_xyz"
        },
        {
            "id": "node_2",
            "name": "Edit Fields",
            "type": "n8n-nodes-base.set",
            "typeVersion": 3.4,
            "position": [480, 300],
            "parameters": {
                "mode": "manual",
                "fields": {
                    "values": [
                        { "name": "greeting", "stringValue": "Hello!" }
                    ]
                }
            }
        },
        {
            "id": "node_3",
            "name": "Slack",
            "type": "n8n-nodes-base.slack",
            "typeVersion": 2.2,
            "position": [720, 300],
            "parameters": {
                "resource": "message",
                "operation": "send",
                "channel": { "__rl": true, "value": "#general" },
                "text": "={{ $json.greeting }}"
            },
            "credentials": {
                "slackApi": { "id": "cred_1", "name": "My Slack" }
            }
        }
    ],
    "connections": {
        "Webhook": {
            "main": [
                [
                    { "node": "Edit Fields", "type": "main", "index": 0 }
                ]
            ]
        },
        "Edit Fields": {
            "main": [
                [
                    { "node": "Slack", "type": "main", "index": 0 }
                ]
            ]
        }
    },
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": true,
        "callerPolicy": "workflowsFromSameOwner"
    },
    "pinData": {}
}
```

### Connection Representation Deep Dive

```
connections[SOURCE_NODE][OUTPUT_TYPE][OUTPUT_INDEX] = [
    { node: DEST_NODE, type: INPUT_TYPE, index: INPUT_INDEX }
]
```

**Example — IF node with branching**:
```json
{
    "IF": {
        "main": [
            [
                { "node": "Send Email", "type": "main", "index": 0 }
            ],
            [
                { "node": "Log Error", "type": "main", "index": 0 }
            ]
        ]
    }
}
```
- `main[0]` = "true" branch → Send Email
- `main[1]` = "false" branch → Log Error

### Execution Order Determination

The execution engine (`WorkflowExecute`) uses a **stack/queue-based traversal** that differs by version:
- **v1 (modern)**: Uses `push` → **BFS/queue** (breadth-first, level-by-level)
- **Legacy**: Uses `unshift` → **DFS/stack** (depth-first)

Core logic:

```typescript
// packages/core/src/execution-engine/workflow-execute.ts

// 1. Initialize with start node
const nodeExecutionStack: IExecuteData[] = [{
    node: startNode,
    data: { main: [[{ json: {} }]] },  // Initial empty data
    source: null,
}];

// 2. Execution loop
while (nodeExecutionStack.length !== 0) {
    const executionData = nodeExecutionStack.shift();  // Dequeue next node
    const executionNode = executionData.node;

    // 3. Execute the node
    const nodeSuccessData = await this.runNode(workflow, executionData, ...);

    // 4. Push child nodes onto the stack
    if (nodeSuccessData) {
        for (let outputIndex = 0; outputIndex < nodeSuccessData.length; outputIndex++) {
            const outputData = nodeSuccessData[outputIndex];
            if (!outputData) continue;

            // Find connected nodes for this output
            const connections = workflow.connectionsBySourceNode[executionNode.name]?.main?.[outputIndex];
            if (!connections) continue;

            for (const connection of connections) {
                nodeExecutionStack.push({
                    node: workflow.nodes[connection.node],
                    data: { main: [outputData] },
                    source: { main: [{ previousNode: executionNode.name }] },
                });
            }
        }
    }
}
```

### Branching and Merging

**Branching** (IF/Switch nodes): The node returns multiple output arrays. Each array index corresponds to a branch. Only branches with data trigger downstream nodes.

**Merging** (Merge node): Nodes with multiple inputs wait for data from all inputs before executing. The execution engine tracks "waiting" state for multi-input nodes.

```typescript
// Preparing waiting execution — node waits for all inputs
prepareWaitingExecutionData(nodeName: string, numberOfConnections: number) {
    this.runExecutionData.executionData!.waitingExecution[nodeName] = {
        main: Array(numberOfConnections).fill(null)
    };
}
```

### Expression System

n8n supports expressions like `{{ $json.name }}` in node parameters. These are evaluated at runtime:

```typescript
// Expression syntax examples:
"={{ $json.email }}"                    // Access current item's JSON data
"={{ $('HTTP Request').item.json.id }}" // Access specific node's output
"={{ $input.first().json.name }}"       // Access first item of input
"={{ $now.toISO() }}"                   // Built-in functions
"={{ $execution.id }}"                  // Execution metadata
"={{ $workflow.name }}"                 // Workflow metadata
```

**Available context variables during execution**:
| Variable | Description |
|----------|-------------|
| `$json` | Current item's JSON data |
| `$input` | All input items |
| `$binary` | Current item's binary data |
| `$node[name]` | Reference another node's data |
| `$('Node Name')` | Same as $node |
| `$execution` | Execution metadata (id, mode, resumeUrl) |
| `$workflow` | Workflow metadata (name, id, active) |
| `$now` | Current DateTime (Luxon) |
| `$today` | Current date at midnight |
| `$env` | Environment variables |
| `$vars` | User-defined variables |
| `$prevNode` | Previous node info |
| `$runIndex` | Current run index |
| `$itemIndex` | Current item index |

---

## 5. EDITOR UI (CANVAS)

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **Vue 3** | UI framework (Composition API) |
| **Pinia** | State management |
| **@vue-flow/core** | Canvas graph rendering (nodes + edges) |
| **CodeMirror 6** | Expression/code editor |
| **Element Plus** | UI component library (base) |
| **@n8n/design-system** | Custom component library |
| **Vite** | Build tool |

### Canvas Architecture

The canvas uses `@vue-flow/core` v1.48.0 (a Vue 3 wrapper around React Flow concepts) with **Dagre** for automatic graph layout.

**Main entry point**: `packages/frontend/editor-ui/src/main.ts`
**Main editor view**: `packages/frontend/editor-ui/src/app/views/NodeView.vue` (60KB — the central orchestrator)

```
NodeView.vue (Main editor view — handles all canvas events)
└── WorkflowCanvas.vue
    └── Canvas.vue
        └── <VueFlow>                          // @vue-flow/core
            ├── <template #node-custom>
            │   └── CanvasNode.vue             // Custom node renderer
            │       └── CanvasNodeRenderer.vue
            │           ├── CanvasNodeDefault.vue     // Standard node shape
            │           ├── CanvasNodeStickyNote.vue  // Sticky notes
            │           ├── CanvasNodeAddNodes.vue    // "+" placeholder
            │           └── CanvasNodeChoicePrompt.vue // Choice selection
            ├── <template #edge-custom>
            │   └── CanvasEdge.vue             // Custom edge renderer
            │       ├── CanvasEdgeToolbar.vue   // Delete button on edge
            │       └── CanvasEdgeTooltip.vue   // Connection info tooltip
            ├── CanvasConnectionLine.vue       // Edge being drawn (follows cursor)
            ├── CanvasBackground.vue           // Grid background (GRID_SIZE = 20px)
            ├── CanvasControlButtons.vue       // Zoom controls
            └── MiniMap (from @vue-flow/minimap)
```

**Canvas Event Bus** (`canvas.eventBus.ts`):
| Event | Purpose |
|-------|---------|
| `fitView` | Fit all nodes in viewport |
| `saved:workflow` | Workflow saved notification |
| `open:execution` | Open execution results |
| `nodes:select` | Select specific nodes |
| `nodes:action` | Perform action on nodes |
| `tidyUp` | Auto-layout using Dagre |
| `create:sticky` | Create sticky note |

**Key Canvas Composables**:
| Composable | Purpose |
|------------|---------|
| `useCanvasLayout.ts` | Dagre-based auto-layout with customizable spacing |
| `useCanvasOperations.ts` | Add/delete nodes, create/delete connections |
| `useCanvasMapping.ts` | Maps between canvas data and workflow data |
| `useCanvasNode.ts` | Single node state operations |
| `useCanvasTraversal.ts` | Graph traversal (BFS/DFS) |
| `useViewportAutoAdjust.ts` | Auto-pan viewport to fit nodes |
| `useZoomAdjustedValues.ts` | Zoom-relative calculations |

### Node Rendering

Each node on the canvas is a Vue component wrapped in a VueFlow node:

```
CanvasNode.vue
├── Handles (input/output ports)
│   ├── CanvasHandleMainInput.vue    // Left port (circle)
│   ├── CanvasHandleMainOutput.vue   // Right port (circle)
│   ├── CanvasHandleNonMainInput.vue // AI-type ports (diamond)
│   └── CanvasHandleNonMainOutput.vue
├── Node Body
│   └── CanvasNodeDefault.vue
│       ├── Icon (service logo or FontAwesome)
│       ├── Name label
│       ├── Subtitle (operation description)
│       ├── Status icons (error, success, pinned)
│       └── Settings icons (retry, continueOnFail)
└── CanvasNodeToolbar.vue            // Hover toolbar (delete, disable)
```

### State Management (Pinia Stores)

**Core stores**:

| Store | File | Purpose |
|-------|------|---------|
| `workflows.store` | `app/stores/workflows.store.ts` | THE main store — holds current workflow nodes, connections, execution data |
| `canvas.store` | `app/stores/canvas.store.ts` | Canvas viewport state (zoom, pan, selection) |
| `ui.store` | `app/stores/ui.store.ts` | UI state (active modals, sidebar, panels) |
| `nodeTypes.store` | `app/stores/nodeTypes.store.ts` | Available node types loaded from backend |
| `credentials.store` | `features/credentials/credentials.store.ts` | User's saved credentials |
| `executions.store` | `features/execution/executions/executions.store.ts` | Execution history and data |
| `ndv.store` | `features/ndv/shared/ndv.store.ts` | Node Detail View state (which node is open) |
| `nodeCreator.store` | `features/shared/nodeCreator/nodeCreator.store.ts` | Node picker panel state |
| `pushConnection.store` | `app/stores/pushConnection.store.ts` | WebSocket connection for real-time updates |

### What Happens When User Adds a Node

```
1. User opens Node Creator panel (click "+" or Tab key)
2. nodeCreator.store opens — shows categorized node list
3. User selects a node type (e.g., "Slack")
4. workflows.store.addNode() called:
   a. Creates INode object with unique ID, name, position
   b. Adds to workflows.store.workflow.nodes[]
   c. Triggers reactivity — VueFlow adds the node to canvas
5. Canvas re-renders with new node at cursor position
6. NDV (Node Detail View) opens for configuration
```

### What Happens When User Connects Two Nodes

```
1. User initiates drag from output handle (CanvasHandleMainOutput.vue)
2. ConnectStartEvent emitted: { nodeId, handleId, handleType: 'source' }
3. CanvasConnectionLine.vue renders bezier curve from port to cursor
4. User hovers target handle → handle highlights, validation checks run
5. User drops on input handle (CanvasHandleMainInput.vue)
6. VueFlow emits "connect" event with:
   { source: nodeA.id, target: nodeB.id, sourceHandle: "main/0", targetHandle: "main/0" }
7. Canvas.vue emits create:connection event
8. workflows.store.addConnection() called:
   a. Adds to workflow.connections[nodeA.name].main[outputIndex]:
      { node: nodeB.name, type: "main", index: inputIndex }
   b. Triggers reactivity — VueFlow renders permanent CanvasEdge.vue
9. Edge shows status styling (success/error/pinned/running during execution)
```

**Connection events lifecycle**: `create:connection:start` → `create:connection` → `create:connection:end` (or `create:connection:cancelled`)

### What Happens When User Edits Node Settings

```
1. User double-clicks a node on canvas
2. ndv.store.activeNodeName = nodeName
3. NDV (Node Detail View) panel slides open from right
4. NDV renders the node's properties as form fields:
   - ParameterInput.vue for each INodeProperties item
   - Conditional display via displayOptions
   - Expression editor (CodeMirror) for {{ }} fields
5. User changes a parameter value
6. workflows.store.setNodeParameter(nodeName, paramName, value)
7. If parameter triggers dynamic loading:
   - API call to /node-parameter-options
   - Updates dropdown/list options
8. User closes NDV → changes are in workflows.store (not yet saved to DB)
9. User clicks "Save" → API call PUT /workflows/:id
```

### Node Detail View (NDV) Architecture

**Location**: `packages/frontend/editor-ui/src/features/ndv/`

```
NDVDraggablePanels.vue (Main panel layout — 3-panel resizable)
├── NDVHeader.vue
│   ├── Node name (editable)
│   ├── Node icon
│   └── Execute/Test button
├── InputPanel.vue (left)
│   ├── InputNodeSelect.vue — select which parent's output to view
│   ├── RunData.vue
│   │   ├── Table view (ag-grid-vue3)
│   │   ├── Schema view (tree browser)
│   │   ├── JSON view (raw)
│   │   └── MappingPill.vue — draggable data references
│   └── TriggerPanel.vue — for trigger nodes (test URL, listen button)
├── Parameter Panel (center)
│   ├── ParameterInputList.vue
│   │   └── For each property in node.description.properties:
│   │       └── ParameterInput.vue
│   │           ├── String → text input
│   │           ├── Options → dropdown select
│   │           ├── Boolean → toggle
│   │           ├── Collection → expandable group
│   │           ├── ResourceLocator → search/ID/URL picker
│   │           ├── AssignmentCollection → data mapping UI
│   │           └── Expression mode toggle → CodeMirror editor
│   ├── Credentials selector
│   └── NodeSettings.vue (retry, error handling, etc.)
└── OutputPanel.vue (right)
    ├── RunData.vue (same as InputPanel)
    ├── BinaryDataDisplay.vue — file/image preview
    ├── NodeErrorView.vue — error messages with suggestions
    └── RunDataAi.vue — special AI/LLM response display
```

**NDV Store** (`useNDVStore()`):
- `activeNodeName` — currently editing node
- `mainPanelDimensions` — resizable panel sizes
- `input.nodeName` / `input.run` / `input.branch` — input panel state
- `output` — output panel state (same structure)
- `inputPanelDisplayMode` — 'schema' | 'table'
- `focusedMappableInput` — for drag-and-drop data mapping
- `focusedInputPath` — JSON path for expression mapping

---

## 6. EXECUTION FLOW

### Manual Execution: "Execute Workflow" Button Click

```
FRONTEND:
1. User clicks "Execute Workflow" button on canvas
2. workflowsStore.runWorkflow() called
3. Workflow JSON serialized from store
4. POST /workflows/:id/run sent to backend
   Body: { workflowData, startNodes, destinationNode, pinData }

BACKEND:
5. WorkflowExecutionService.executeManually() receives request
6. Creates Execution record in DB (status: "running")
7. Instantiates WorkflowExecute with mode="manual"
8. Calls workflowExecute.run({ workflow, startNode, pinData })

EXECUTION ENGINE (packages/core):
9. WorkflowExecute.run():
   a. Finds start node (trigger or first node)
   b. Initializes nodeExecutionStack with start node
   c. Calls processRunExecutionData(workflow)

10. processRunExecutionData() — THE MAIN LOOP:
    a. Runs hooks: workflowExecuteBefore
    b. While nodeExecutionStack is not empty:
       i.   Pop next node from stack
       ii.  Check timeout / cancellation
       iii. Check run filter (for partial execution)
       iv.  Ensure input data is available
       v.   Run hooks: nodeExecuteBefore
       vi.  Handle retries (maxTries, waitBetweenTries)
       vii. Check for pinned data (bypass execution)
       viii. Call this.runNode() → node.execute()
       ix.  Store output in resultData.runData[nodeName]
       x.   Push child nodes onto stack with output data
       xi.  Run hooks: nodeExecuteAfter

11. Execution completes:
    a. Final status set (success/error)
    b. Execution data saved to DB
    c. Hooks: workflowExecuteAfter

PUSH TO FRONTEND:
12. WebSocket push event sent to frontend:
    { type: "executionFinished", data: { executionId, runData } }
13. Frontend updates execution panel with results
14. Each node on canvas shows success/error badge
```

### Execution Modes

All valid execution modes (`packages/workflow/src/execution-context.ts`):

| Mode | Description |
|------|-------------|
| `manual` | User clicks "Execute Workflow" in UI |
| `trigger` | Webhook/scheduled trigger fires |
| `webhook` | Incoming webhook request |
| `cli` | Command-line execution |
| `retry` | Retrying a failed execution |
| `integrated` | API/SDK integration call |
| `internal` | n8n internal operations |
| `error` | Error handling workflow |
| `evaluation` | Workflow evaluation/testing |
| `chat` | Chat/conversational execution |

### Node Execution Context (What Nodes Can Access)

When a node's `execute()` runs, it receives an `IExecuteFunctions` context with:

```typescript
// packages/core/src/execution-engine/node-execution-context/execute-context.ts
class ExecuteContext implements IExecuteFunctions {
    // Data access
    getInputData(inputIndex?, connectionType?): INodeExecutionData[]
    getNodeParameter(name, itemIndex, fallback?, options?): any

    // Helpers
    helpers = {
        httpRequest(),           // Make HTTP requests
        httpRequestWithAuth(),   // HTTP with credential auth
        returnJsonArray(),       // Convert data to node format
        copyInputItems(),        // Clone input items
        createDeferredPromise(), // Async helpers
        binaryHelpers: { ... }, // Binary data operations
        dataTableHelpers: { ... }, // Data table support
    };

    // Credential access
    getCredentials(credentialType): Promise<ICredentialDataDecryptedObject>

    // Workflow context
    getContext(type): IContextObject      // Persistent node state
    getWorkflowStaticData(type): IDataObject  // Workflow-level persistent data

    // Streaming
    sendChunk(type, itemIndex, content): void  // For streaming responses
}
```

### Automatic Trigger Execution

```
ACTIVATION:
1. User activates workflow (toggle in UI)
2. PUT /workflows/:id/activate → backend
3. ActiveWorkflowManager.add(workflowId):
   a. Loads workflow from DB
   b. For each trigger node:
      - Webhook: Register webhook path in WebhookServer
      - Cron: Create cron job via node.trigger()
      - Polling: Set up polling interval via node.poll()

TRIGGER FIRES:
4. External event occurs (HTTP request / cron tick / poll returns data)
5. Trigger node's emit() or webhook handler returns data
6. ActiveWorkflowManager creates new execution
7. Same execution loop as manual (steps 6-11 above)
8. But mode="trigger" instead of "manual"
9. No WebSocket push to editor (unless user is viewing executions)
```

### Partial Execution ("Execute Until Here")

```
1. User right-clicks a node → "Execute to here"
2. POST /workflows/:id/run with destinationNode set
3. WorkflowExecute.runPartialWorkflow2():
   a. Find trigger node for the subgraph
   b. Build subgraph: findSubgraph(graph, destination, trigger)
   c. Find start nodes using existing runData + pinData
   d. Execute only the filtered subgraph
   e. Reuse cached data for unchanged nodes
```

### Error Handling During Execution

```typescript
// For each node execution:
try {
    nodeSuccessData = await this.runNode(workflow, executionData, ...);
} catch (error) {
    executionError = error;

    // Check node's error handling setting:
    if (node.onError === 'continueRegularOutput') {
        // Add error info to output and continue
        nodeSuccessData = [[{ json: { error: error.message } }]];
    } else if (node.onError === 'continueErrorOutput') {
        // Route to error output branch
        nodeSuccessData[errorOutputIndex] = [{ json: { error } }];
    } else {
        // Default: stop execution with error
        executionData.resultData.error = executionError;
        break;
    }
}
```

**Error workflow** (`packages/cli/src/execution-lifecycle/execute-error-workflow.ts`):
When a production execution fails, n8n can trigger a separate "error workflow":

```
1. Error detected: fullRunData.data.resultData.error exists
2. Lookup: workflow.settings.errorWorkflow (external) or internal error trigger
3. Guard: prevents infinite loops (error workflow can't error to itself)
4. Error data prepared:
   {
     execution: { id, url, error, lastNodeExecuted, mode },
     workflow: { id, name }
   }
5. Error workflow executed with error data as input
```

**Retry execution** (`POST /executions/:id/retry`):
```
1. Load original execution from DB
2. Find last successfully executed node (recovery point)
3. Create runData from last successful outputs
4. Set executionMode: 'retry', retryOf: originalExecutionId
5. Execute from failed point onward
6. If retry succeeds: sets retrySuccessId in original execution
```

---

## 7. TRIGGER SYSTEM

### Trigger Types

| Type | Interface | How it Works | Example |
|------|-----------|-------------|---------|
| **Manual** | `ITriggerFunctions` | `manualTriggerFunction()` called by user | Manual Trigger |
| **Webhook** | `IWebhookFunctions` | HTTP endpoint registered, request triggers | Webhook, Form Trigger |
| **Cron/Schedule** | `ITriggerFunctions` | Cron expression scheduled | Schedule Trigger, Cron |
| **Polling** | `IPollFunctions` | Periodic check for new data | Gmail Trigger, RSS Trigger |
| **Event** | `ITriggerFunctions` | Long-lived connection (WebSocket/SSE) | MQTT Trigger, Kafka Trigger |

### Webhook Triggers

```typescript
// Webhook node lifecycle:
webhookMethods = {
    default: {
        // Called when workflow is activated
        async checkExists(this: IHookFunctions): Promise<boolean> {
            // Check if webhook already registered on external service
        },
        async create(this: IHookFunctions): Promise<boolean> {
            // Register webhook on external service
            // Store webhook ID in staticData
        },
        async delete(this: IHookFunctions): Promise<boolean> {
            // Remove webhook from external service
        },
    }
};

// Called when webhook receives a request
async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const body = this.getBodyData();
    return {
        workflowData: [[{ json: body }]],  // Data to pass downstream
    };
}
```

**Webhook URL pattern**: `https://n8n.example.com/webhook/<webhook-path>`

**Webhook execution flow** (when HTTP request arrives):
```
1. HTTP request → /webhook/{path}
2. WebhookRequestHandler validates method, sets CORS
3. WebhookService.findWebhook(path, method) — cache first, then DB
4. Load workflow from DB (active/published version only)
5. Parse request body (JSON, form-data, binary uploads)
6. Create responsePromise (deferred promise for response)
7. WorkflowRunner.run(data) → executionId
8. Response mode determines when to respond:
   ├─ 'onReceived': return 200 immediately, execute in background
   ├─ 'lastNode': wait for workflow completion, return last node output
   └─ 'responseNode': wait for explicit Respond to Webhook node
9. Response sent to caller
```

### Polling Triggers

```typescript
async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    // Get last poll timestamp
    const staticData = this.getWorkflowStaticData('node');
    const lastPoll = staticData.lastPoll as number || 0;

    // Check for new data since last poll
    const newItems = await checkForNewData(lastPoll);

    // Update last poll time
    staticData.lastPoll = Date.now();

    if (newItems.length === 0) return null;  // No new data, don't trigger

    return [this.helpers.returnJsonArray(newItems)];
}
```

### How Triggers Start Workflows

```
ActiveWorkflowManager
├── Manages all active (published) workflows
├── For each workflow:
│   ├── Loads trigger nodes
│   ├── Creates appropriate listener:
│   │   ├── Webhook → WebhookServer.registerWebhook(path, handler)
│   │   ├── Cron → CronService.registerCron(expression, handler)
│   │   └── Polling → PollService.registerPoll(interval, handler)
│   └── When trigger fires:
│       ├── Creates execution record
│       ├── Instantiates WorkflowExecute
│       └── Runs workflow with trigger data as starting input
```

---

## 8. EXECUTION UI / DEBUG PANEL

### Execution Screen Architecture

```
WorkflowPage.vue
├── Canvas (left side)
│   └── Nodes show execution badges:
│       ├── Green checkmark = success
│       ├── Red X = error
│       ├── Blue spinner = running
│       └── Item count badge (e.g., "3 items")
│
└── When NDV is open during execution:
    ├── Input Panel
    │   ├── RunDataTable.vue — tabular view of input items
    │   ├── RunDataJson.vue — raw JSON view
    │   └── RunDataSchema.vue — schema/type view
    │
    └── Output Panel
        ├── RunDataTable.vue — tabular view of output items
        ├── RunDataJson.vue — raw JSON view
        ├── RunDataSchema.vue — schema/type view
        └── Error display (if node failed)
```

### How Inputs/Outputs Are Displayed

Each node's execution data is stored in `runData[nodeName]`:

```typescript
interface ITaskData {
    startTime: number;
    executionTime: number;
    executionStatus: 'success' | 'error' | 'waiting' | 'canceled';
    data: {
        main: INodeExecutionData[][];  // Output data per branch
    };
    source: ITaskDataConnectionsSource[];  // Which nodes provided input
    error?: ExecutionError;
    hints?: NodeExecutionHint[];
}

// runData structure:
{
    "Webhook": [taskData],          // First (and only) execution of Webhook
    "Edit Fields": [taskData],      // First execution of Edit Fields
    "IF": [taskData],
    "Slack": [taskData, taskData],  // Node ran twice (e.g., in a loop)
}
```

### Step-by-Step Execution Visualization

```
1. Execution starts → canvas enters "execution mode"
2. Active node gets blue spinner icon
3. As each node completes:
   a. Push event received via WebSocket: nodeExecuteAfter
   b. Node badge updates (green/red)
   c. If NDV is open, input/output panels update
4. Execution finishes:
   a. Push event: executionFinished
   b. All node badges finalized
   c. Execution summary shown at bottom
```

### Error Display

When a node fails:
- Node shows **red error badge** on canvas
- NDV output panel shows **error message** with:
  - Error description
  - Stack trace (in debug mode)
  - Suggested fixes (hints)
- If `continueOnFail` is enabled, error data flows to next node as error output

---

## 9. DATA FLOW & STORAGE

### Input/Output Data Structure

All data flows as **items** — each item is an `INodeExecutionData`:

```json
{
    "json": {
        "name": "John",
        "email": "john@example.com",
        "age": 30
    },
    "binary": {
        "attachment": {
            "data": "base64encodedstring...",
            "mimeType": "image/png",
            "fileName": "photo.png",
            "fileSize": "1024"
        }
    },
    "pairedItem": {
        "item": 0,
        "input": 0
    }
}
```

**Key**: The `json` property holds the main data payload. The `binary` property holds file/binary data. The `pairedItem` tracks item lineage (which input item produced this output item).

### Execution Data Storage

Execution data is stored in the database via two entities:

**ExecutionEntity** (metadata):
```
id | workflowId | status  | mode    | startedAt          | stoppedAt
1  | wf_abc     | success | manual  | 2024-01-01T10:00Z  | 2024-01-01T10:00:03Z
2  | wf_abc     | error   | trigger | 2024-01-01T11:00Z  | 2024-01-01T11:00:01Z
```

**ExecutionData** (full run data):
```
executionId | data (JSON)                           | workflowData (JSON)
1           | { runData: { ... }, startData: ... }  | { nodes: [...], connections: {...} }
```

The `data` column contains the complete `IRunExecutionData`:

```typescript
interface IRunExecutionData {
    startData?: {
        destinationNode?: string;
        runNodeFilter?: string[];
    };
    resultData: {
        runData: {
            [nodeName: string]: ITaskData[];  // Output per node per run
        };
        pinData?: IPinData;
        lastNodeExecuted?: string;
        error?: ExecutionError;
    };
    executionData?: {
        nodeExecutionStack: IExecuteData[];  // Remaining nodes to execute
        waitingExecution: { ... };           // Nodes waiting for input
        metadata: { ... };
    };
    waitTill?: Date;  // For "Wait" nodes that pause execution
}
```

### Past Execution Retrieval

```
Frontend: GET /executions?workflowId=xxx&status=success&limit=20
Backend:  ExecutionRepository.find({ where: { workflowId }, order: { id: "DESC" }, take: 20 })
Returns:  List of ExecutionEntity with optional embedded ExecutionData
```

### Binary Data Storage

Binary data can be stored in two modes:
1. **`default` mode**: Binary data stored inline in execution data (base64 in DB)
2. **`filesystem` mode**: Binary data stored as files on disk, referenced by ID in execution data

```typescript
// Binary data reference in filesystem mode:
{
    "binary": {
        "data": {
            "id": "binary_abc123",      // Reference to file on disk
            "mimeType": "image/png",
            "fileName": "photo.png"
        }
    }
}
```

---

## 10. EVALUATION / TESTING SYSTEM

### Manual Testing

Users test workflows by:

1. **Execute Workflow**: Runs the entire workflow from trigger to end
2. **Execute Node**: Runs a single node with its current input data
3. **Pin Data**: Set mock data for a node (bypasses actual execution)

### Pin Data System

```typescript
// Pinned data is stored per-node in the workflow:
workflow.pinData = {
    "Webhook": [
        { json: { name: "Test User", email: "test@example.com" } }
    ]
};

// During execution, pinned nodes skip actual execution:
if (pinData && pinData[executionNode.name] !== undefined) {
    nodeSuccessData = [pinData[executionNode.name]];  // Use pinned data directly
}
```

### Partial Execution

Users can execute a **subset** of the workflow:
- **"Execute to here"**: Execute all nodes from trigger to the selected node
- Uses `runPartialWorkflow2()` which:
  1. Builds a subgraph from trigger to destination
  2. Identifies start nodes (nodes that need re-execution)
  3. Reuses cached output for unchanged nodes
  4. Only executes "dirty" nodes in the subgraph

### Input Simulation

For trigger nodes that need external input (webhooks), the UI provides:
- **"Test" button**: Starts listening for the webhook, shows test URL
- **Simulated data**: Some triggers provide mock data for testing
- **Manual trigger**: All triggers implement `manualTriggerFunction` for testing

### Sub-Workflow Execution

The **Execute Workflow** node allows calling another workflow as a sub-workflow:

```
Execute Workflow Node (in parent workflow)
├── Source: 'database' (by ID) or 'parameter' (inline JSON)
├── Maps input data from parent to sub-workflow
├── Calls WorkflowExecutionService.runWorkflow()
├── Sub-workflow executes in same process (not queued)
├── Results returned as node output to parent workflow
└── Execute Workflow Trigger node receives data in sub-workflow
```

### Evaluation Framework (Enterprise)

n8n has an enterprise evaluation system (`features/ai/evaluation.ee`) for testing AI workflows:
- Define test cases with expected inputs/outputs
- Run workflows against test cases
- Compare actual vs expected results
- Track pass/fail rates over time

---

## 11. API & BACKEND

### Backend Architecture

**Framework**: Express.js with TypeScript
**ORM**: TypeORM (forked as `@n8n/typeorm`)
**DI**: Custom `@n8n/di` package (IoC container)
**Auth**: JWT + Cookie-based session

### Server Initialization

```typescript
// packages/cli/src/server.ts
export class Server {
    app: express.Application;

    constructor() {
        this.app = express();
        // Middleware
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(authMiddleware);
        // Static files (frontend)
        this.app.use(express.static('editor-ui/dist'));
    }

    async init() {
        // Load all controllers via DI
        // Register routes from @RestController decorators
        // Start webhook server
        // Activate active workflows
    }
}
```

### Key API Endpoints

| Method | Path | Controller | Purpose |
|--------|------|-----------|---------|
| `GET` | `/workflows` | WorkflowsController | List all workflows |
| `POST` | `/workflows` | WorkflowsController | Create new workflow |
| `GET` | `/workflows/:id` | WorkflowsController | Get single workflow |
| `PUT` | `/workflows/:id` | WorkflowsController | Update workflow |
| `DELETE` | `/workflows/:id` | WorkflowsController | Delete workflow |
| `POST` | `/workflows/:id/activate` | WorkflowsController | Activate workflow |
| `POST` | `/workflows/:id/deactivate` | WorkflowsController | Deactivate workflow |
| `POST` | `/workflows/:id/run` | WorkflowsController | Execute workflow manually |
| `GET` | `/executions` | ExecutionsController | List executions |
| `GET` | `/executions/:id` | ExecutionsController | Get execution detail |
| `DELETE` | `/executions/:id` | ExecutionsController | Delete execution |
| `POST` | `/executions/:id/retry` | ExecutionsController | Retry failed execution |
| `GET` | `/node-types` | NodeTypesController | List available node types |
| `POST` | `/node-parameter-options` | DynamicNodeParametersController | Load dynamic options |
| `GET` | `/credentials` | CredentialsController | List credentials |
| `POST` | `/credentials` | CredentialsController | Create credential |
| `POST` | `/credentials/test` | CredentialsController | Test credential |
| `POST` | `/login` | AuthController | User login |
| `POST` | `/logout` | AuthController | User logout |
| `GET` | `/me` | MeController | Current user info |
| `POST` | `/webhook/:path` | WebhookServer | Incoming webhooks (production) |
| `POST` | `/webhook-test/:path` | WebhookServer | Incoming webhooks (test) |
| `GET` | `/active-workflows` | ActiveWorkflowsController | List active workflows |

### Controller Decorator Pattern

```typescript
// packages/cli/src/workflows/workflows.controller.ts
@RestController('/workflows')
export class WorkflowsController {
    constructor(
        private readonly workflowService: WorkflowService,
        private readonly workflowExecutionService: WorkflowExecutionService,
        // ... injected dependencies
    ) {}

    @Get('/')
    async getAll(req: AuthenticatedRequest) { ... }

    @Post('/')
    async create(@Body dto: CreateWorkflowDto, req: AuthenticatedRequest) { ... }

    @Get('/:id')
    async getOne(@Param('id') id: string) { ... }

    @Put('/:id')
    async update(@Param('id') id: string, @Body dto: UpdateWorkflowDto) { ... }

    @Post('/:id/run')
    async runManually(@Param('id') id: string, @Body runData: ManualRunPayload) { ... }
}
```

### Authentication & Credential Handling

**User Auth** (`packages/cli/src/auth/auth.service.ts`):
- JWT tokens stored in **secure HTTP-only cookies**
- JWT payload: `{ id, hash, browserId?, usedMfa? }`
- `hash` derived from email + bcrypt password (invalidates on password change)
- `browserId` prevents session hijacking across browsers
- Rate limiting: IP-based (1000/5min) + Email-based (5/1min)
- MFA support: TOTP + recovery codes
- Auth handlers: Email/password, OAuth1, OAuth2, SAML (EE), LDAP (EE)

**Credential Encryption**:
```typescript
// Credentials are encrypted at rest using AES-256-CBC
// Encryption key derived from N8N_ENCRYPTION_KEY env var

class CredentialService {
    async save(credential: CredentialData): Promise<CredentialsEntity> {
        const encrypted = this.cipher.encrypt(credential.data);
        return this.repository.save({ ...credential, data: encrypted });
    }

    async decrypt(credential: CredentialsEntity): Promise<ICredentialDataDecryptedObject> {
        return this.cipher.decrypt(credential.data);
    }
}
```

### WebSocket Push Service

Real-time updates from backend to frontend:

```typescript
// Backend pushes events to connected frontends
pushService.broadcast('executionStarted', { executionId });
pushService.broadcast('nodeExecuteBefore', { executionId, nodeName });
pushService.broadcast('nodeExecuteAfter', { executionId, nodeName, data });
pushService.broadcast('executionFinished', { executionId, data: runData });
```

### Concurrency Control

```typescript
// packages/cli/src/concurrency/
class ConcurrencyControlService {
    // Limits concurrent workflow executions
    // Capacity reservation system
    // Queue for waiting executions when at capacity
}
```

### Queue/Worker Mode

For production deployments, n8n supports **queue mode** with Redis + pub/sub:

```
                        ┌──────────────┐
                        │  Main Server │ (API + Webhooks)
                        │  PubSubBus   │
                        └──────┬───────┘
                               │ Redis Pub/Sub
                        ┌──────┴───────┐
                   ┌────┤  Job Queue   ├────┐
                   │    └──────────────┘    │
            ┌──────┴──────┐          ┌──────┴──────┐
            │  Worker 1   │          │  Worker 2   │
            │ (JobProcess)│          │ (JobProcess)│
            └─────────────┘          └─────────────┘
```

**Key scaling components** (`packages/cli/src/scaling/`):
| Component | Purpose |
|-----------|---------|
| `ScalingService` | Detects scaled environment, coordinates instances |
| `WorkerServer` | Runs as separate process, receives jobs |
| `JobProcessor` | Consumes and executes workflow jobs |
| `PublisherService` | Publishes events to other instances via Redis |
| `SubscriberService` | Subscribes to events from other instances |
| `MultiMainSetup` (EE) | Multiple main processes with coordination |

### Event System

```
MessageEventBus (extends EventEmitter)
├── EventMessageExecution — execution lifecycle
├── EventMessageNode — node execution events
├── EventMessageWorkflow — workflow changes
├── EventMessageAudit — audit logging
└── EventMessageAiNode — AI node events

Event Relays:
├── TelemetryEventRelay → PostHog/analytics
├── LogStreamingEventRelay → external log services
└── WorkflowFailureNotificationEventRelay → alerts
```

### Webhook Variants

| Variant | Purpose | Path |
|---------|---------|------|
| `LiveWebhooks` | Production webhooks (active workflows) | `/webhook/<path>` |
| `TestWebhooks` | Development testing in editor | `/webhook-test/<path>` |
| `WaitingWebhooks` | Paused executions waiting for callback | `/webhook-waiting/<path>` |
| `WaitingForms` | Form submission webhooks | `/form-waiting/<path>` |

### Execution Storage Modes

Execution data can be stored in multiple locations (`ExecutionEntity.storedAt`):
- **`db`** — Full data in database (ExecutionData table, serialized with `flatted`)
- **`fs`** — Data on local filesystem (better for large executions)
- **`s3`** — Cloud object storage (future support)

---

## 12. DESIGN PATTERNS USED

### 1. Directed Acyclic Graph (DAG)

Workflows are DAGs where:
- **Nodes** = vertices
- **Connections** = directed edges
- **Execution** = topological traversal of the graph

```typescript
// packages/core/src/execution-engine/directed-graph.ts
export class DirectedGraph {
    private nodes: Map<string, INode>;
    private edges: Map<string, Set<string>>;

    static fromWorkflow(workflow: Workflow): DirectedGraph { ... }
    getNodes(): INode[] { ... }
    getChildren(nodeName: string): INode[] { ... }
    getParents(nodeName: string): INode[] { ... }
}
```

### 2. Plugin/Strategy Pattern (Node System)

Every node is a plugin implementing the `INodeType` interface. The engine doesn't know about specific nodes — it only calls the interface methods:

```
Engine → INodeType.execute() → returns INodeExecutionData[][]
         INodeType.trigger() → calls this.emit()
         INodeType.webhook() → returns IWebhookResponseData
```

### 3. Dependency Injection (IoC Container)

```typescript
// packages/@n8n/di
import { Container, Service } from '@n8n/di';

@Service()
export class WorkflowService {
    constructor(
        private readonly repository: WorkflowRepository,
        private readonly executionService: ExecutionService,
    ) {}
}

// Resolved automatically:
const service = Container.get(WorkflowService);
```

### 4. Observer Pattern (Event Bus)

Internal events for decoupled communication:

```typescript
// EventService emits events that listeners handle
eventService.emit('workflow-activated', { workflowId });
eventService.emit('execution-started', { executionId });
eventService.emit('node-executed', { nodeName, data });
```

### 5. Command Pattern (Undo/Redo)

The frontend uses a command/history pattern for canvas actions:

```typescript
// history.store.ts
interface Command {
    execute(): void;
    undo(): void;
}

// Example: adding a node
class AddNodeCommand implements Command {
    execute() { workflowStore.addNode(this.node); }
    undo() { workflowStore.removeNode(this.node.id); }
}
```

### 6. Decorator Pattern (Controllers)

Backend uses TypeScript decorators for route definitions:

```typescript
@RestController('/workflows')    // Class-level route prefix
@Licensed('feature:sharing')     // License check
@ProjectScope('workflow:read')   // Permission check
@Get('/:id')                     // HTTP method + path
```

### 7. Repository Pattern (Data Access)

TypeORM repositories abstract database access:

```typescript
@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
    async findById(id: string): Promise<WorkflowEntity | null> { ... }
    async getMany(options: ListQuery): Promise<WorkflowEntity[]> { ... }
}
```

### 8. State Machine (Execution Status)

```
new → running → success
                 ↘ error
                 ↘ canceled
                 ↘ waiting (paused, e.g., Wait node)
                    ↘ running (resumed)
```

---

## 13. REBUILDING GUIDE

### If You Want to Build a Similar System

This section provides a concrete implementation roadmap for building a workflow automation platform similar to n8n.

### Recommended Tech Stack

| Layer | Recommendation | Why |
|-------|---------------|-----|
| **Frontend** | Vue 3 or React | Component-based UI for canvas editor |
| **Canvas Library** | React Flow / @vue-flow/core | Battle-tested graph visualization |
| **State Management** | Pinia (Vue) / Zustand (React) | Simple, TypeScript-friendly |
| **Backend** | Node.js + Express/Fastify | JavaScript ecosystem for node execution |
| **Database** | PostgreSQL + TypeORM/Prisma | Relational data with JSON column support |
| **Queue** | BullMQ + Redis | For distributed execution |
| **WebSocket** | Socket.io or ws | Real-time execution updates |
| **Language** | TypeScript throughout | End-to-end type safety |

### Step-by-Step Implementation Roadmap

#### Phase 1: Core Foundation (Weeks 1-3)

**Goal**: Define the data model and build the execution engine.

```
1. Define Core Types
   ├── INode: { id, name, type, position, parameters, credentials }
   ├── IConnection: { sourceNode, sourceOutput, targetNode, targetInput }
   ├── IWorkflow: { id, name, nodes[], connections{}, settings }
   ├── INodeExecutionData: { json: {}, binary?: {} }
   └── INodeType: { description, execute() }

2. Build Workflow Class
   ├── In-memory graph representation
   ├── Connection adjacency list (both directions)
   ├── Method: getStartNode()
   ├── Method: getParentNodes(nodeName)
   └── Method: getChildNodes(nodeName)

3. Build Execution Engine
   ├── Stack-based BFS traversal
   ├── Input data gathering from parent outputs
   ├── Node execution with try/catch
   ├── Output routing to child nodes
   └── Execution state management (runData, status)

4. Build 3-5 Basic Nodes
   ├── ManualTrigger (start node)
   ├── Set (data transformation)
   ├── IF (conditional branching)
   ├── HTTP Request (external API calls)
   └── Code (JavaScript execution)
```

#### Phase 2: Backend Server (Weeks 4-6)

**Goal**: REST API for CRUD operations and execution.

```
5. Database Setup
   ├── Workflow table (id, name, nodes JSON, connections JSON)
   ├── Execution table (id, workflowId, status, data JSON)
   ├── Credential table (id, name, type, encryptedData)
   └── User table (id, email, passwordHash, role)

6. REST API
   ├── POST /workflows — Create workflow
   ├── GET /workflows/:id — Get workflow
   ├── PUT /workflows/:id — Update workflow
   ├── POST /workflows/:id/run — Execute workflow
   ├── GET /executions — List executions
   ├── GET /executions/:id — Get execution with data
   ├── POST /credentials — Save credential
   └── GET /node-types — List available node types

7. Execution Orchestration
   ├── Manual execution endpoint
   ├── Execution status tracking
   ├── WebSocket push for real-time updates
   └── Execution data storage
```

#### Phase 3: Visual Editor (Weeks 7-12)

**Goal**: Canvas-based workflow editor.

```
8. Canvas Setup
   ├── Install react-flow or @vue-flow/core
   ├── Custom node component (icon, name, ports)
   ├── Custom edge component (animated connection line)
   ├── Drag & drop from node palette
   ├── Connection drawing between ports
   └── Zoom, pan, selection, delete

9. Node Configuration Panel
   ├── Slide-in panel for editing node parameters
   ├── Dynamic form generation from INodeProperties
   ├── Property types: text, dropdown, toggle, JSON editor
   ├── Conditional visibility (displayOptions)
   └── Expression support ({{ $json.field }})

10. Workflow State Management
    ├── Store: currentWorkflow (nodes, connections)
    ├── Store: execution (runData, status)
    ├── Store: nodeTypes (available nodes)
    ├── Save/load workflow via API
    └── Undo/redo history

11. Execution Visualization
    ├── Run button → POST to backend
    ├── WebSocket listener for execution events
    ├── Node status badges (running, success, error)
    ├── Input/output data panels in node editor
    └── Data table view with JSON fallback
```

#### Phase 4: Trigger System (Weeks 13-16)

```
12. Trigger Infrastructure
    ├── Webhook server (HTTP endpoint registration)
    ├── Cron scheduler (cron expression engine)
    ├── Polling framework (periodic execution)
    ├── Workflow activation/deactivation
    └── Active workflow manager

13. Build Trigger Nodes
    ├── Webhook Trigger (register HTTP endpoint)
    ├── Schedule Trigger (cron expressions)
    └── Polling base class (template for polling triggers)
```

#### Phase 5: Production Features (Weeks 17-24)

```
14. Error Handling
    ├── Node retry (configurable maxTries, waitBetweenTries)
    ├── Error output branch
    ├── Continue on fail mode
    └── Error workflow (trigger on failure)

15. Credential System
    ├── AES-256 encryption for credential storage
    ├── Credential type definitions
    ├── OAuth2 flow support
    ├── Credential testing
    └── Per-node credential assignment

16. Expression Engine
    ├── {{ }} template syntax parser
    ├── $json, $input, $node context variables
    ├── JavaScript sandbox for expressions
    └── Built-in functions (date, string, math)

17. Scale & Deploy
    ├── Queue mode (BullMQ + Redis)
    ├── Worker processes for execution
    ├── Docker packaging
    └── Health check / monitoring
```

### Architecture Diagram for Your System

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Platform                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Frontend (Vue/React)                  │   │
│  │  ┌────────────┐ ┌─────────────┐ ┌────────────────┐  │   │
│  │  │  Canvas    │ │ Node Config │ │ Execution Panel│  │   │
│  │  │  Editor    │ │ Panel       │ │ (Data View)    │  │   │
│  │  └────────────┘ └─────────────┘ └────────────────┘  │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │ REST API + WebSocket               │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │                  Backend (Node.js)                     │   │
│  │  ┌───────────┐ ┌────────────┐ ┌──────────────────┐  │   │
│  │  │ API Layer │ │ Execution  │ │ Trigger Manager  │  │   │
│  │  │ (Express) │ │ Engine     │ │ (Webhook/Cron)   │  │   │
│  │  └───────────┘ └────────────┘ └──────────────────┘  │   │
│  │  ┌───────────┐ ┌────────────┐ ┌──────────────────┐  │   │
│  │  │ Node      │ │ Credential │ │ Queue (BullMQ)   │  │   │
│  │  │ Registry  │ │ Service    │ │ for scale-out    │  │   │
│  │  └───────────┘ └────────────┘ └──────────────────┘  │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │              Database (PostgreSQL)                     │   │
│  │  workflows | executions | credentials | users          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Node Plugin System                        │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │   │
│  │  │HTTP│ │Slack│ │Gmail│ │IF  │ │Code│ │Merge│ ...    │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Critical Design Decisions

1. **Node Interface First**: Define `INodeType` before anything else. This is your plugin API contract.
2. **Data format**: Standardize on `{ json: {}, binary?: {} }` item format early.
3. **Connections as adjacency list**: Store connections indexed by source node for efficient traversal.
4. **Stack-based execution**: Use a queue/stack for BFS traversal — simpler than recursive approaches.
5. **Expression sandbox**: Use a sandboxed JavaScript execution for `{{ }}` expressions.
6. **Separation of concerns**: Keep types (`workflow` pkg), engine (`core` pkg), and server (`cli` pkg) separate.

---

## 14. VISUAL FLOW DIAGRAMS

### Workflow Execution Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    EXECUTION PIPELINE                             │
│                                                                   │
│  ┌───────────┐     ┌──────────────┐     ┌───────────────────┐   │
│  │  TRIGGER  │────▶│  INIT STACK  │────▶│  EXECUTION LOOP   │   │
│  │  EVENT    │     │  with start  │     │                   │   │
│  │           │     │  node + data │     │  while (stack) {  │   │
│  └───────────┘     └──────────────┘     │    node = pop()   │   │
│                                          │    input = gather │   │
│                                          │    output = exec()│   │
│                                          │    push children  │   │
│                                          │  }                │   │
│                                          └────────┬──────────┘   │
│                                                   │              │
│                                          ┌────────▼──────────┐   │
│                                          │  FINALIZE         │   │
│                                          │  Save to DB       │   │
│                                          │  Push to frontend │   │
│                                          └───────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Node Execution Detail

```
┌─────────────────────────────────────────────────────────┐
│                  NODE EXECUTION                          │
│                                                          │
│  ┌──────────────────────┐                                │
│  │ Pop from stack       │                                │
│  │ { node, data, source }│                               │
│  └──────────┬───────────┘                                │
│             │                                            │
│  ┌──────────▼───────────┐     ┌─────────────────────┐   │
│  │ Check: is pinned?    ├─YES─▶ Use pinned data     │   │
│  └──────────┬───────────┘     └──────────┬──────────┘   │
│             │ NO                          │              │
│  ┌──────────▼───────────┐                │              │
│  │ Check: is disabled?  ├─YES─▶ Skip     │              │
│  └──────────┬───────────┘                │              │
│             │ NO                          │              │
│  ┌──────────▼───────────┐                │              │
│  │ Execute node         │                │              │
│  │ (with retry logic)   │                │              │
│  └──────────┬───────────┘                │              │
│             │                            │              │
│  ┌──────────▼────────────────────────────▼──────────┐   │
│  │ Store output in runData[nodeName]                │   │
│  └──────────┬───────────────────────────────────────┘   │
│             │                                            │
│  ┌──────────▼───────────┐                                │
│  │ For each output branch:                               │
│  │   For each connected child node:                      │
│  │     Push { childNode, outputData } onto stack         │
│  └──────────────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

### Connection System

```
NODE A                          NODE B
┌──────────────┐               ┌──────────────┐
│              │  Connection    │              │
│         OUT 0├───────────────▶IN 0          │
│              │               │              │
│         OUT 1├──┐            │              │
│              │  │            └──────────────┘
└──────────────┘  │
                  │            NODE C
                  │            ┌──────────────┐
                  │            │              │
                  └───────────▶IN 0          │
                               │              │
                               └──────────────┘

Data structure:
connections = {
    "Node A": {
        "main": [
            // Output 0:
            [ { node: "Node B", type: "main", index: 0 } ],
            // Output 1:
            [ { node: "Node C", type: "main", index: 0 } ]
        ]
    }
}
```

### UI Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION FLOW                          │
│                                                                   │
│  ADD NODE:                                                        │
│  ┌────────┐    ┌──────────┐    ┌───────────┐    ┌────────────┐  │
│  │ Click  │───▶│ Node     │───▶│ Select    │───▶│ Node added │  │
│  │ + btn  │    │ Creator  │    │ node type │    │ to canvas  │  │
│  └────────┘    │ Panel    │    │           │    │ + NDV opens│  │
│                └──────────┘    └───────────┘    └────────────┘  │
│                                                                   │
│  CONNECT NODES:                                                   │
│  ┌────────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐ │
│  │ Drag from  │───▶│ Temp     │───▶│ Drop on  │───▶│ Edge    │ │
│  │ output port│    │ edge     │    │ input    │    │ created │ │
│  └────────────┘    │ follows  │    │ port     │    └─────────┘ │
│                    │ cursor   │    └──────────┘                 │
│                    └──────────┘                                  │
│                                                                   │
│  EXECUTE:                                                         │
│  ┌────────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐ │
│  │ Click      │───▶│ POST     │───▶│ WS push  │───▶│ Nodes   │ │
│  │ Execute    │    │ /run     │    │ events   │    │ update  │ │
│  │ button     │    │          │    │ per node │    │ badges  │ │
│  └────────────┘    └──────────┘    └──────────┘    └─────────┘ │
│                                                                   │
│  EDIT NODE:                                                       │
│  ┌────────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐ │
│  │ Double     │───▶│ NDV      │───▶│ Edit     │───▶│ Store   │ │
│  │ click      │    │ opens    │    │ params   │    │ updated │ │
│  │ node       │    │ (slide)  │    │ (forms)  │    │ (Pinia) │ │
│  └────────────┘    └──────────┘    └──────────┘    └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Full System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           BROWSER                                     │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    Vue 3 Application                          │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │   │
│  │  │ VueFlow     │  │ Node Detail  │  │ Node Creator     │    │   │
│  │  │ Canvas      │  │ View (NDV)   │  │ Panel            │    │   │
│  │  │             │  │              │  │                  │    │   │
│  │  │ ┌────┐ ─── │  │ ┌──────────┐ │  │ Search/Category  │    │   │
│  │  │ │Node│     │  │ │Params    │ │  │ ┌──────────┐    │    │   │
│  │  │ └────┘ ─── │  │ │Form      │ │  │ │ Slack    │    │    │   │
│  │  │    │   ┌──┐│  │ │          │ │  │ │ Gmail    │    │    │   │
│  │  │    └──▶│  ││  │ │Input  Out│ │  │ │ HTTP     │    │    │   │
│  │  │        └──┘│  │ │Panel Pan │ │  │ │ IF       │    │    │   │
│  │  └─────────────┘  │ └──────────┘ │  │ └──────────┘    │    │   │
│  │                    └──────────────┘  └──────────────────┘    │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │              Pinia State Management                     │  │   │
│  │  │  workflows | canvas | nodeTypes | credentials | exec   │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────┬──────┬────────────────────────────┘   │
│                              │ REST │ WebSocket                       │
└──────────────────────────────┼──────┼────────────────────────────────┘
                               │      │
┌──────────────────────────────┼──────┼────────────────────────────────┐
│                     NODE.JS SERVER   │                                │
│  ┌───────────────────┐  ┌───────────┴────┐  ┌───────────────────┐   │
│  │   REST API        │  │ Push Service   │  │ Webhook Server    │   │
│  │   Controllers     │  │ (WebSocket)    │  │ /webhook/:path    │   │
│  │   /workflows      │  │               │  │ /webhook-test/... │   │
│  │   /executions     │  │ Events:       │  └─────────┬─────────┘   │
│  │   /credentials    │  │ - nodeExecBefore│          │              │
│  │   /node-types     │  │ - nodeExecAfter │          │              │
│  └────────┬──────────┘  │ - execFinished │          │              │
│           │              └───────────────┘          │              │
│  ┌────────▼────────────────────────────────────────┐│              │
│  │              Service Layer                       ││              │
│  │  WorkflowService | ExecutionService             ││              │
│  │  CredentialService | ActiveWorkflowManager      │◀──────────────┘
│  └────────┬─────────────────────────────────────────┘               │
│           │                                                          │
│  ┌────────▼─────────────────────────────────────────┐               │
│  │           Execution Engine (packages/core)        │               │
│  │                                                   │               │
│  │  WorkflowExecute.processRunExecutionData()       │               │
│  │  ┌─────────────────────────────────────┐         │               │
│  │  │ Node Execution Stack (BFS Queue)    │         │               │
│  │  │ [node1, node2, node3, ...]          │         │               │
│  │  └──────────────┬──────────────────────┘         │               │
│  │                 │                                 │               │
│  │  ┌──────────────▼──────────────────────┐         │               │
│  │  │ For each node:                       │         │               │
│  │  │   1. Pop from stack                  │         │               │
│  │  │   2. node.execute(inputData)         │         │               │
│  │  │   3. Store output in runData         │         │               │
│  │  │   4. Push children with output       │         │               │
│  │  └─────────────────────────────────────┘         │               │
│  └───────────────────────────────────────────────────┘               │
│           │                                                          │
│  ┌────────▼─────────────────────────────────────────┐               │
│  │              Database Layer (TypeORM)              │               │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │               │
│  │  │Workflows │ │Executions│ │Credentials (AES) │  │               │
│  │  │(JSON cols│ │(run data)│ │(encrypted at rest)│  │               │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │               │
│  │           PostgreSQL / SQLite                     │               │
│  └───────────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Item Flow Through Nodes

```
Trigger Node            Set Node               IF Node            Slack Node
┌──────────┐          ┌──────────┐          ┌──────────┐       ┌──────────┐
│          │          │          │          │          │       │          │
│ Output:  │──────────│ Input:   │          │ Input:   │       │ Input:   │
│ [{       │  items   │ [{       │──────────│ [{       │       │ [{       │
│   json: {│  flow    │   json: {│  items   │   json: {│  T    │   json: {│
│     body:│  ═══▶    │     body:│  flow    │     body:│ ═══▶  │     body:│
│     "hi" │          │     "hi",│  ═══▶    │     "hi",│       │     "hi",│
│   }      │          │     greet│          │     greet│       │     greet│
│ }]       │          │     "Hey"│          │     "Hey"│       │     "Hey"│
│          │          │   }      │          │   }      │       │   }      │
│          │          │ }]       │          │ }]       │       │ }]       │
│          │          │          │          │          │  F    │          │
│          │          │ Output:  │          │ Out[0]:T │ ═══▶  │          │
│          │          │ [{       │          │ Out[1]:F │ (none) │          │
│          │          │   json: {│          │          │       │          │
│          │          │     body,│          │          │       │          │
│          │          │     greet│          │          │       │          │
│          │          │   }      │          │          │       │          │
│          │          │ }]       │          │          │       │          │
└──────────┘          └──────────┘          └──────────┘       └──────────┘
```

---

## Appendix A: Key File Reference

| What | Path |
|------|------|
| Node interface | `packages/workflow/src/interfaces.ts:1953` (INodeType) |
| Node description | `packages/workflow/src/interfaces.ts:2435` (INodeTypeDescription) |
| Node data format | `packages/workflow/src/interfaces.ts:1449` (INodeExecutionData) |
| Workflow instance | `packages/workflow/src/interfaces.ts:1337` (INode) |
| Workflow class | `packages/workflow/src/workflow.ts:59` |
| Connection types | `packages/workflow/src/interfaces.ts:405-420` |
| Execution engine | `packages/core/src/execution-engine/workflow-execute.ts:99` |
| Main execution loop | `packages/core/src/execution-engine/workflow-execute.ts:1411` |
| Workflow entity (DB) | `packages/@n8n/db/src/entities/workflow-entity.ts` |
| Execution entity (DB) | `packages/@n8n/db/src/entities/execution-entity.ts` |
| Workflows controller | `packages/cli/src/workflows/workflows.controller.ts` |
| Canvas component | `packages/frontend/editor-ui/src/features/workflows/canvas/components/Canvas.vue` |
| Workflow store | `packages/frontend/editor-ui/src/app/stores/workflows.store.ts` |
| Node types store | `packages/frontend/editor-ui/src/app/stores/nodeTypes.store.ts` |
| Example node (Set) | `packages/nodes-base/nodes/Set/v2/SetV2.node.ts` |
| Example trigger (Cron) | `packages/nodes-base/nodes/Cron/Cron.node.ts` |
| Example webhook | `packages/nodes-base/nodes/Webhook/Webhook.node.ts` |
| Expression engine | `packages/workflow/src/workflow-expression.ts` |
| Graph traversal | `packages/workflow/src/common/` |
| DI container | `packages/@n8n/di/` |

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Node** | A single operation/integration step in a workflow |
| **Workflow** | A DAG of connected nodes that automates a process |
| **Execution** | A single run of a workflow, producing execution data |
| **Trigger** | A node that starts a workflow (webhook, cron, manual) |
| **NDV** | Node Detail View — the parameter editing panel |
| **Connection** | A directed edge between two nodes (output → input) |
| **Item** | A single data record (`{ json: {}, binary?: {} }`) |
| **Pin Data** | Mock data set on a node for testing (bypasses execution) |
| **Expression** | `{{ $json.field }}` syntax for dynamic values |
| **runData** | The collected output of all nodes after execution |
| **Active Workflow** | A published workflow with triggers listening for events |
| **Partial Execution** | Running only a subset of the workflow graph |
| **Paired Item** | Lineage tracking: which input item produced which output |

---

*Generated by deep analysis of n8n v2.15.0 source code.*
