import type { Workflow, WorkflowEditorNode, WorkflowEditorEdge, WorkflowEditorMetadata } from '@/types/workflow';
import { findNodeDefinition } from '@constants/nodeCategories';

const NODE_PRESETS: Record<string, Partial<WorkflowEditorNode['data']>> = {
  'mesh-generator': {
    version: 'v1.0',
    status: 'completed',
    metadata: {
      createdAt: 'Today, 10:35 AM',
      lastRunAt: '18 min ago',
      avgCostUsd: 0.18,
    },
  },
  'fea-solver': {
    version: 'fea-solver@2.1.0',
    status: 'running',
    resourceLimits: { cpu: 4, memoryMb: 2048, timeoutSeconds: 300 },
    retryPolicy: { maxRetries: 3, waitBetweenSeconds: 10 },
    metadata: {
      createdAt: 'Today, 10:42 AM',
      lastRunAt: '12 min ago',
      avgCostUsd: 0.5,
    },
  },
  'ai-optimizer': {
    status: 'idle',
    metadata: {
      createdAt: 'Today, 10:48 AM',
      lastRunAt: '9 min ago',
      avgCostUsd: 0.34,
    },
  },
};

/**
 * Convert API Workflow to ReactFlow nodes + edges
 */
export function workflowToGraph(workflow: Workflow): {
  nodes: WorkflowEditorNode[];
  edges: WorkflowEditorEdge[];
  metadata: WorkflowEditorMetadata;
} {
  const nodes: WorkflowEditorNode[] = workflow.steps.map((step) => {
    const def = findNodeDefinition(step.action ?? step.type);
    return {
      id: step.id,
      type: def?.type ?? 'tool',
      position: step.position,
      data: {
        ...(NODE_PRESETS[step.action ?? step.type] ?? {}),
        label: step.name,
        subtype: step.action ?? step.type,
        nodeType: def?.type ?? 'tool',
        status: step.status === 'pending' ? 'idle' : step.status === 'running' ? 'running' : step.status === 'completed' ? 'completed' : step.status === 'failed' ? 'failed' : 'idle',
        inputs: (step.config ?? {}) as Record<string, unknown>,
      },
    };
  });

  // Add trigger nodes
  if (workflow.triggers) {
    workflow.triggers.forEach((trigger, i) => {
      nodes.unshift({
        id: trigger.id,
        type: 'trigger',
        position: { x: 50, y: 50 + i * 120 },
        data: {
          label: trigger.type.charAt(0).toUpperCase() + trigger.type.slice(1),
          subtype: trigger.type,
          nodeType: 'trigger',
          inputs: (trigger.config ?? {}) as Record<string, unknown>,
        },
      });
    });
  }

  const edges: WorkflowEditorEdge[] = [];
  workflow.steps.forEach((step) => {
    step.connections.forEach((targetId) => {
      edges.push({
        id: `e-${step.id}-${targetId}`,
        source: step.id,
        target: targetId,
      });
    });
  });

  const metadata: WorkflowEditorMetadata = {
    id: workflow.id,
    name: workflow.name,
    version: 'v3',
    versionStatus: 'draft',
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  };

  return { nodes, edges, metadata };
}

/**
 * Generate a unique node ID
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
