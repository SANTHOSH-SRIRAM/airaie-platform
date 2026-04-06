import type { Node, Edge } from '@xyflow/react';
import { encodeHandle } from './handleFormat';

export interface WorkflowApiNode {
  id: string;
  name: string;
  type: string;
  tool_ref?: string;
  agent_ref?: string;
  position: { x: number; y: number };
  parameters?: Record<string, unknown>;
  depends_on?: string[];
  resource_limits?: { cpu: number; memory_mb: number; timeout_s: number };
  retry_policy?: { max_retries: number; delay_ms: number };
}

export interface WorkflowApiFormat {
  id: string;
  name: string;
  version: string;
  version_status: 'draft' | 'compiled' | 'published';
  nodes: WorkflowApiNode[];
  created_at: string;
  updated_at: string;
}

export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  toolRef?: string;
  agentRef?: string;
  version?: string;
  inputs: Record<string, unknown>;
  resourceLimits?: { cpu: number; memoryMb: number; timeoutSeconds: number };
  retryPolicy?: { maxRetries: number; delaySeconds: number };
}

/**
 * Convert API workflow format -> ReactFlow nodes + edges
 */
export function workflowApiToCanvas(workflow: WorkflowApiFormat): {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<CanvasNodeData>[] = workflow.nodes.map((apiNode) => ({
    id: apiNode.id,
    type: mapNodeType(apiNode.type),
    position: { x: apiNode.position.x, y: apiNode.position.y },
    data: {
      label: apiNode.name,
      nodeType: apiNode.type,
      toolRef: apiNode.tool_ref,
      agentRef: apiNode.agent_ref,
      inputs: apiNode.parameters ?? {},
      resourceLimits: apiNode.resource_limits
        ? {
            cpu: apiNode.resource_limits.cpu,
            memoryMb: apiNode.resource_limits.memory_mb,
            timeoutSeconds: apiNode.resource_limits.timeout_s,
          }
        : undefined,
      retryPolicy: apiNode.retry_policy
        ? {
            maxRetries: apiNode.retry_policy.max_retries,
            delaySeconds: Math.round(apiNode.retry_policy.delay_ms / 1000),
          }
        : undefined,
    },
  }));

  // Build edges from depends_on arrays
  const edges: Edge[] = [];
  for (const apiNode of workflow.nodes) {
    if (apiNode.depends_on) {
      for (const depId of apiNode.depends_on) {
        edges.push({
          id: `e_${depId}_${apiNode.id}`,
          source: depId,
          target: apiNode.id,
          sourceHandle: encodeHandle('outputs', 'main', 0),
          targetHandle: encodeHandle('inputs', 'main', 0),
          type: 'smoothstep',
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Convert ReactFlow nodes + edges -> API workflow format
 */
export function canvasToWorkflowApi(
  nodes: Node<CanvasNodeData>[],
  edges: Edge[],
  metadata: { id: string; name: string; version: string; versionStatus: string }
): WorkflowApiFormat {
  // Build dependency map from edges
  const depsMap = new Map<string, string[]>();
  for (const edge of edges) {
    const deps = depsMap.get(edge.target) ?? [];
    deps.push(edge.source);
    depsMap.set(edge.target, deps);
  }

  const apiNodes: WorkflowApiNode[] = nodes.map((node) => ({
    id: node.id,
    name: node.data.label,
    type: node.data.nodeType,
    tool_ref: node.data.toolRef,
    agent_ref: node.data.agentRef,
    position: { x: node.position.x, y: node.position.y },
    parameters: Object.keys(node.data.inputs).length > 0 ? node.data.inputs : undefined,
    depends_on: depsMap.get(node.id),
    resource_limits: node.data.resourceLimits
      ? {
          cpu: node.data.resourceLimits.cpu,
          memory_mb: node.data.resourceLimits.memoryMb,
          timeout_s: node.data.resourceLimits.timeoutSeconds,
        }
      : undefined,
    retry_policy: node.data.retryPolicy
      ? {
          max_retries: node.data.retryPolicy.maxRetries,
          delay_ms: node.data.retryPolicy.delaySeconds * 1000,
        }
      : undefined,
  }));

  return {
    id: metadata.id,
    name: metadata.name,
    version: metadata.version,
    version_status: metadata.versionStatus as 'draft' | 'compiled' | 'published',
    nodes: apiNodes,
    created_at: '', // server-managed
    updated_at: '', // server-managed
  };
}

/** Map API node type -> ReactFlow custom node type */
function mapNodeType(apiType: string): string {
  const typeMap: Record<string, string> = {
    trigger: 'trigger',
    tool: 'tool',
    agent: 'agent',
    logic: 'logic',
    gate: 'gate',
    data: 'data',
    if: 'logic',
    switch: 'logic',
    merge: 'logic',
    upload: 'data',
    transform: 'data',
  };
  return typeMap[apiType] ?? 'tool';
}

/** Generate a unique node ID */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Snap position to grid */
export function snapToGrid(x: number, y: number, gridSize: number = 40): { x: number; y: number } {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}
