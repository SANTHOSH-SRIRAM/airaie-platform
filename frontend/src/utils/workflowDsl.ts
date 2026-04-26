/**
 * Workflow DSL <-> ReactFlow graph converter.
 *
 * Canonical authority: see
 * `airaie_platform/doc/implementation/new_design/WORKFLOW_DSL.md`.
 *
 * The DSL is the storage format persisted in `WorkflowVersion.dsl_json` (a
 * base64-encoded JSON blob in the kernel). The ReactFlow graph is the
 * runtime shape used by the editor canvas (`@xyflow/react`).
 *
 * This module exposes:
 *   - `dslToFlow(dsl)`   forward conversion, with depth-based auto-layout
 *     when DSL nodes lack positions.
 *   - `flowToDsl(input)` inverse conversion, lossless for graphs whose
 *     edges + positions are explicit.
 *   - `decodeDsl(b64)`   safely decode a base64 JSON DSL blob; returns
 *     `null` on invalid input.
 *   - `encodeDsl(dsl)`   serialise a DSL value as base64 JSON.
 *
 * Backward compatibility: older workflows store only `nodes[]` with
 * `depends_on` and no explicit `edges` array. `dslToFlow` back-fills
 * edges from `depends_on` so legacy workflows render correctly.
 */

import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from '@xyflow/react';

// --- Node kinds -------------------------------------------------------------

/**
 * The seven node kinds the canvas knows about. Keep this aligned with
 * `frontend/src/components/workflows/nodes/index.ts` (the ReactFlow
 * `nodeTypes` registry) and `WORKFLOW_DSL.md`.
 */
export type WorkflowDslNodeType =
  | 'trigger'
  | 'tool'
  | 'agent'
  | 'gate'
  | 'logic'
  | 'data'
  | 'stickyNote';

const KNOWN_NODE_TYPES: ReadonlySet<WorkflowDslNodeType> = new Set([
  'trigger',
  'tool',
  'agent',
  'gate',
  'logic',
  'data',
  'stickyNote',
]);

// --- UI <-> DSL field-name normalisation -----------------------------------
//
// The UI's NodeCategories use `'governance'` for what the DSL/kernel calls
// `'gate'`. Likewise the UI shape for retryPolicy is
// `{ maxRetries, waitBetweenSeconds }` while the kernel uses
// `{ max_attempts, delay_ms }`. We normalise on save (UI -> DSL) inside
// `flowToDsl` and reverse on load (DSL -> UI) inside `dslToFlow` so the
// converter contract is honest about what it produces.

/** UI shape — what `WorkflowNodeData.retryPolicy` carries on the canvas. */
export interface UiRetryPolicy {
  maxRetries: number;
  waitBetweenSeconds: number;
}

/** Kernel shape — what the DSL persists and the runner reads. */
export interface DslRetryPolicy {
  max_attempts: number;
  delay_ms: number;
}

/** UI -> DSL retry policy. */
export function normalizeRetryPolicyToDsl(p: UiRetryPolicy | undefined): DslRetryPolicy | undefined {
  if (!p) return undefined;
  return {
    max_attempts: p.maxRetries,
    delay_ms: Math.round((p.waitBetweenSeconds ?? 0) * 1000),
  };
}

/** DSL -> UI retry policy. Tolerates partial DSL shapes from old workflows. */
export function normalizeRetryPolicyToUi(p: unknown): UiRetryPolicy | undefined {
  if (!p || typeof p !== 'object') return undefined;
  const raw = p as Record<string, unknown>;
  // DSL shape
  if (typeof raw.max_attempts === 'number' || typeof raw.delay_ms === 'number') {
    return {
      maxRetries: typeof raw.max_attempts === 'number' ? raw.max_attempts : 0,
      waitBetweenSeconds: typeof raw.delay_ms === 'number' ? raw.delay_ms / 1000 : 0,
    };
  }
  // Already-UI shape (legacy DSLs)
  if (typeof raw.maxRetries === 'number' || typeof raw.waitBetweenSeconds === 'number') {
    return {
      maxRetries: typeof raw.maxRetries === 'number' ? raw.maxRetries : 0,
      waitBetweenSeconds: typeof raw.waitBetweenSeconds === 'number' ? raw.waitBetweenSeconds : 0,
    };
  }
  return undefined;
}

/** UI nodeType -> canonical DSL nodeType. */
export function uiNodeTypeToDsl(t: string): WorkflowDslNodeType {
  if (t === 'governance') return 'gate';
  if (KNOWN_NODE_TYPES.has(t as WorkflowDslNodeType)) return t as WorkflowDslNodeType;
  // Unknown — let downstream validation throw.
  return t as WorkflowDslNodeType;
}

/** DSL nodeType -> UI nodeType (for canvas compatibility with NodeCategories). */
export function dslNodeTypeToUi(t: WorkflowDslNodeType): string {
  if (t === 'gate') return 'governance';
  return t;
}

// --- DSL types --------------------------------------------------------------

/** Optional 2D position. When absent, the converter auto-lays out by depth. */
export interface WorkflowDslPosition {
  x: number;
  y: number;
}

/**
 * Common fields shared by every DSL node.
 *
 * `subtype` is the catalogue entry within a kind (e.g. `fea-solver` for
 * a `tool`). It maps to ReactFlow `data.subtype`.
 *
 * `inputs` carries free-form configuration. Expression strings such as
 * `{{ $('NodeA').json.field }}` or `$inputs.x` are stored verbatim
 * here; the kernel's expression evaluator reads them at run time.
 */
export interface WorkflowDslNodeBase {
  id: string;
  type: WorkflowDslNodeType;
  subtype?: string;
  label?: string;
  /** @deprecated alongside `edges`, but kept for backward compatibility. */
  depends_on?: string[];
  position?: WorkflowDslPosition;
  inputs?: Record<string, unknown>;
  version?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  resourceLimits?: { cpu: number; memoryMb: number; timeoutSeconds: number };
  retryPolicy?: { maxRetries: number; waitBetweenSeconds: number };
  metadata?: Record<string, unknown>;
}

export interface WorkflowDslTriggerNode extends WorkflowDslNodeBase {
  type: 'trigger';
}

export interface WorkflowDslToolNode extends WorkflowDslNodeBase {
  type: 'tool';
  /** `tool_id@version` reference consumed by the kernel runner. */
  tool?: string;
  timeout?: number;
}

export interface WorkflowDslAgentNode extends WorkflowDslNodeBase {
  type: 'agent';
  /** `agent_id@version` reference. */
  agent?: string;
}

export interface WorkflowDslGateNode extends WorkflowDslNodeBase {
  type: 'gate';
}

export interface WorkflowDslLogicNode extends WorkflowDslNodeBase {
  type: 'logic';
}

export interface WorkflowDslDataNode extends WorkflowDslNodeBase {
  type: 'data';
}

export interface WorkflowDslStickyNoteNode extends WorkflowDslNodeBase {
  type: 'stickyNote';
  /** Free-form note body, rendered into a `<textarea>`. */
  text?: string;
  /** Sticky notes are resizable; persist the last size when present. */
  width?: number;
  height?: number;
}

export type WorkflowDslNode =
  | WorkflowDslTriggerNode
  | WorkflowDslToolNode
  | WorkflowDslAgentNode
  | WorkflowDslGateNode
  | WorkflowDslLogicNode
  | WorkflowDslDataNode
  | WorkflowDslStickyNoteNode;

export interface WorkflowDslEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, unknown>;
}

export interface WorkflowDsl {
  /** Always `"workflow"` for v1. Reserved for future kinds. */
  kind?: string;
  /** Schema version. v1 today; bump on incompatible changes. */
  version?: number;
  metadata?: Record<string, unknown>;
  config?: Record<string, unknown>;
  nodes: WorkflowDslNode[];
  edges?: WorkflowDslEdge[];
}

// --- ReactFlow data shape ---------------------------------------------------

/**
 * Shape stored on every ReactFlow node's `data` field. Mirrors
 * `WorkflowNodeData` from `src/types/workflow.ts` plus a few optional
 * fields that round-trip through the DSL.
 */
export interface WorkflowFlowNodeData extends Record<string, unknown> {
  label: string;
  subtype: string;
  nodeType: WorkflowDslNodeType;
  version?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  inputs: Record<string, unknown>;
  resourceLimits?: { cpu: number; memoryMb: number; timeoutSeconds: number };
  retryPolicy?: { maxRetries: number; waitBetweenSeconds: number };
  metadata?: Record<string, unknown>;
  /** Sticky-note specific. Plain text body. */
  text?: string;
  /** Tool-specific. `tool_id@version` reference. */
  tool?: string;
  /** Tool-specific. Per-node execution timeout in seconds. */
  timeout?: number;
  /** Agent-specific. `agent_id@version` reference. */
  agent?: string;
}

export type WorkflowFlowNode = ReactFlowNode<WorkflowFlowNodeData>;
export type WorkflowFlowEdge = ReactFlowEdge;

// --- Layout constants -------------------------------------------------------

const COL_WIDTH = 220;
const ROW_HEIGHT = 110;
const X0 = 80;
const Y0 = 80;

// --- Helpers ----------------------------------------------------------------

function humanizeNodeId(id: string): string {
  const out = id
    .replace(/^node_\d+_/, '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return out || id;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Compute `{nodeId -> depth}` from `depends_on`. Used both by the
 * auto-layout and exported for tests of legacy back-fill.
 */
function computeDepths(nodes: WorkflowDslNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const depthOf = new Map<string, number>();

  const compute = (id: string, seen: Set<string>): number => {
    const cached = depthOf.get(id);
    if (cached !== undefined) return cached;
    if (seen.has(id)) return 0; // cycle guard; the validator will flag it
    seen.add(id);
    const node = byId.get(id);
    const deps = node?.depends_on ?? [];
    const d = deps.length
      ? Math.max(...deps.map((p) => compute(p, seen) + 1))
      : 0;
    depthOf.set(id, d);
    return d;
  };

  nodes.forEach((n) => compute(n.id, new Set()));
  return depthOf;
}

/**
 * Lay nodes out left-to-right by topological depth, top-to-bottom by
 * sibling index. Mirrors the algorithm from the legacy `dslToSteps`
 * in `api/workflows.ts` so existing workflows render in the same place.
 */
function autoLayout(nodes: WorkflowDslNode[]): Map<string, WorkflowDslPosition> {
  const depthOf = computeDepths(nodes);
  const siblingsByDepth = new Map<number, number>();
  const positions = new Map<string, WorkflowDslPosition>();

  nodes.forEach((node) => {
    const depth = depthOf.get(node.id) ?? 0;
    const sibling = siblingsByDepth.get(depth) ?? 0;
    siblingsByDepth.set(depth, sibling + 1);
    positions.set(node.id, {
      x: X0 + depth * COL_WIDTH,
      y: Y0 + sibling * ROW_HEIGHT,
    });
  });

  return positions;
}

function deriveEdgesFromDependsOn(nodes: WorkflowDslNode[]): WorkflowDslEdge[] {
  const edges: WorkflowDslEdge[] = [];
  nodes.forEach((node) => {
    (node.depends_on ?? []).forEach((parent) => {
      edges.push({
        id: `e-${parent}-${node.id}`,
        source: parent,
        target: node.id,
      });
    });
  });
  return edges;
}

// --- decode / encode --------------------------------------------------------

/**
 * Decode a base64 JSON DSL blob. Returns `null` when the input is empty,
 * not valid base64, or not a JSON object that looks like a DSL.
 *
 * Never throws — callers should treat `null` as "no DSL yet" and start
 * with an empty graph.
 */
export function decodeDsl(b64: string | undefined | null): WorkflowDsl | null {
  if (!b64) return null;
  let raw: string;
  try {
    const binary = atob(b64);
    // atob yields a Latin-1 string. Reverse the byte-mapping done in
    // encodeDsl and decode as UTF-8 so unicode round-trips.
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(parsed)) return null;
  const nodes = Array.isArray((parsed as { nodes?: unknown }).nodes)
    ? ((parsed as { nodes: unknown[] }).nodes as WorkflowDslNode[])
    : [];
  // Tolerate missing `nodes` (treat as empty workflow).
  return {
    kind: typeof (parsed as { kind?: unknown }).kind === 'string'
      ? (parsed as { kind: string }).kind
      : undefined,
    version: typeof (parsed as { version?: unknown }).version === 'number'
      ? (parsed as { version: number }).version
      : undefined,
    metadata: isObject((parsed as { metadata?: unknown }).metadata)
      ? ((parsed as { metadata: Record<string, unknown> }).metadata)
      : undefined,
    config: isObject((parsed as { config?: unknown }).config)
      ? ((parsed as { config: Record<string, unknown> }).config)
      : undefined,
    nodes,
    edges: Array.isArray((parsed as { edges?: unknown }).edges)
      ? ((parsed as { edges: WorkflowDslEdge[] }).edges)
      : undefined,
  };
}

/** Serialise a DSL value to base64 JSON. UTF-8 safe via TextEncoder. */
export function encodeDsl(dsl: WorkflowDsl): string {
  const json = JSON.stringify(dsl);
  // btoa cannot handle code points > 0xFF directly. Encode to UTF-8
  // bytes first, then map each byte to a Latin-1 char before btoa.
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- DSL -> ReactFlow -------------------------------------------------------

function dslNodeToFlow(
  node: WorkflowDslNode,
  position: WorkflowDslPosition,
): WorkflowFlowNode {
  const subtype = node.subtype ?? node.type;
  const label = node.label ?? humanizeNodeId(node.id);
  const data: WorkflowFlowNodeData = {
    label,
    subtype,
    nodeType: node.type,
    inputs: (node.inputs ?? {}) as Record<string, unknown>,
  };
  if (node.version !== undefined) data.version = node.version;
  if (node.status !== undefined) data.status = node.status;
  if (node.resourceLimits !== undefined) data.resourceLimits = node.resourceLimits;
  if (node.retryPolicy !== undefined) {
    const ui = normalizeRetryPolicyToUi(node.retryPolicy);
    if (ui) data.retryPolicy = ui;
  }
  if (node.metadata !== undefined) data.metadata = node.metadata;

  // Type-specific fields propagate onto `data` so the per-type node
  // components (ToolNode, AgentNode, StickyNoteNode, ...) can read them
  // without consulting the DSL.
  if (node.type === 'stickyNote') {
    if (node.text !== undefined) data.text = node.text;
  } else if (node.type === 'tool') {
    if (node.tool !== undefined) data.tool = node.tool;
    if (node.timeout !== undefined) data.timeout = node.timeout;
  } else if (node.type === 'agent') {
    if (node.agent !== undefined) data.agent = node.agent;
  }

  const flowNode: WorkflowFlowNode = {
    id: node.id,
    type: node.type,
    position,
    data,
  };

  if (node.type === 'stickyNote') {
    if (typeof node.width === 'number') flowNode.width = node.width;
    if (typeof node.height === 'number') flowNode.height = node.height;
  }

  return flowNode;
}

/**
 * Convert DSL into ReactFlow nodes + edges. Pure; safe to call from
 * loaders / Suspense boundaries.
 *
 * @throws if a node has an unknown `type` field.
 */
export function dslToFlow(dsl: WorkflowDsl): {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  metadata: Record<string, unknown>;
} {
  if (!isObject(dsl)) {
    throw new Error('dslToFlow: expected an object');
  }
  const sourceNodes = Array.isArray(dsl.nodes) ? dsl.nodes : [];

  // Validate types up front so partial state never reaches the canvas.
  for (const node of sourceNodes) {
    if (!node || typeof node.id !== 'string') {
      throw new Error('dslToFlow: every node must have a string id');
    }
    if (!KNOWN_NODE_TYPES.has(node.type)) {
      throw new Error(
        `dslToFlow: unknown node type "${String(node.type)}" on node "${node.id}"`,
      );
    }
  }

  // Auto-layout fills in any node that lacks a position.
  const laidOut = autoLayout(sourceNodes);

  const nodes: WorkflowFlowNode[] = sourceNodes.map((n) => {
    const pos = n.position ?? laidOut.get(n.id) ?? { x: X0, y: Y0 };
    return dslNodeToFlow(n, pos);
  });

  const edges: WorkflowFlowEdge[] = (() => {
    const explicit = Array.isArray(dsl.edges) ? dsl.edges : null;
    if (explicit && explicit.length > 0) {
      return explicit.map((e) => {
        const edge: WorkflowFlowEdge = {
          id: e.id,
          source: e.source,
          target: e.target,
        };
        if (e.sourceHandle !== undefined) edge.sourceHandle = e.sourceHandle;
        if (e.targetHandle !== undefined) edge.targetHandle = e.targetHandle;
        if (e.data !== undefined) edge.data = e.data;
        return edge;
      });
    }
    // Backward-compat: derive from depends_on when no explicit edges present.
    return deriveEdgesFromDependsOn(sourceNodes).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));
  })();

  return {
    nodes,
    edges,
    metadata: (isObject(dsl.metadata) ? dsl.metadata : {}) as Record<string, unknown>,
  };
}

// --- ReactFlow -> DSL -------------------------------------------------------

function flowNodeToDsl(node: WorkflowFlowNode): WorkflowDslNode {
  const data = (node.data ?? {}) as Partial<WorkflowFlowNodeData>;
  const rawType = (data.nodeType ?? (node.type as WorkflowDslNodeType | undefined) ?? 'tool') as string;
  // Normalise UI 'governance' -> canonical DSL 'gate' on save.
  const type = uiNodeTypeToDsl(rawType);
  if (!KNOWN_NODE_TYPES.has(type)) {
    throw new Error(
      `flowToDsl: unknown node type "${String(type)}" on node "${node.id}"`,
    );
  }

  const base: WorkflowDslNodeBase = {
    id: node.id,
    type,
    subtype: data.subtype,
    label: data.label,
    position: node.position,
    inputs: (data.inputs ?? {}) as Record<string, unknown>,
  };
  if (data.version !== undefined) base.version = data.version;
  if (data.status !== undefined) base.status = data.status;
  if (data.resourceLimits !== undefined) base.resourceLimits = data.resourceLimits;
  if (data.retryPolicy !== undefined) {
    // Normalise UI shape -> kernel shape on save. Cast through unknown so
    // the DSL retains the canonical { max_attempts, delay_ms } shape on the
    // wire, even though the static type union still reads as UiRetryPolicy.
    const dslRetry = normalizeRetryPolicyToDsl(data.retryPolicy as UiRetryPolicy);
    if (dslRetry) base.retryPolicy = dslRetry as unknown as UiRetryPolicy;
  }
  if (data.metadata !== undefined) base.metadata = data.metadata;

  switch (type) {
    case 'tool': {
      const out: WorkflowDslToolNode = { ...base, type: 'tool' };
      if (data.tool !== undefined) out.tool = data.tool;
      if (data.timeout !== undefined) out.timeout = data.timeout;
      return out;
    }
    case 'agent': {
      const out: WorkflowDslAgentNode = { ...base, type: 'agent' };
      if (data.agent !== undefined) out.agent = data.agent;
      return out;
    }
    case 'stickyNote': {
      const out: WorkflowDslStickyNoteNode = { ...base, type: 'stickyNote' };
      if (data.text !== undefined) out.text = data.text;
      if (typeof node.width === 'number') out.width = node.width;
      if (typeof node.height === 'number') out.height = node.height;
      return out;
    }
    case 'trigger':
      return { ...base, type: 'trigger' };
    case 'gate':
      return { ...base, type: 'gate' };
    case 'logic':
      return { ...base, type: 'logic' };
    case 'data':
      return { ...base, type: 'data' };
  }
}

function flowEdgeToDsl(edge: WorkflowFlowEdge): WorkflowDslEdge {
  const out: WorkflowDslEdge = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
  };
  if (edge.sourceHandle != null) out.sourceHandle = edge.sourceHandle;
  if (edge.targetHandle != null) out.targetHandle = edge.targetHandle;
  if (isObject(edge.data)) out.data = edge.data as Record<string, unknown>;
  return out;
}

/**
 * Convert a ReactFlow graph back to canonical DSL.
 *
 * Lossless for graphs that originated from `dslToFlow` and whose edges
 * + positions remained explicit. Round-tripping a graph that relied on
 * `depends_on` back-fill produces an `edges` array (which is the
 * preferred storage form going forward; `depends_on` is no longer
 * emitted).
 *
 * @throws if any node has an unknown `nodeType`.
 */
export function flowToDsl(input: {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  metadata?: Record<string, unknown>;
}): WorkflowDsl {
  if (!input || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
    throw new Error('flowToDsl: expected { nodes, edges }');
  }
  return {
    kind: 'workflow',
    version: 1,
    metadata: input.metadata ?? {},
    nodes: input.nodes.map(flowNodeToDsl),
    edges: input.edges.map(flowEdgeToDsl),
  };
}
