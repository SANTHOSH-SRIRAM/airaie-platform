export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  projectId?: string;
  projectName?: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  runCount: number;
  avgDuration?: number;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop' | 'parallel';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  action?: string;
  config?: Record<string, unknown>;
  position: { x: number; y: number };
  connections: string[];
  duration?: number;
  error?: string;
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config?: Record<string, unknown>;
  isEnabled: boolean;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  projectId?: string;
  steps?: Partial<WorkflowStep>[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  steps?: WorkflowStep[];
  triggers?: WorkflowTrigger[];
}

export interface WorkflowListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'all';
  projectId?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastRunAt';
  sortOrder?: 'asc' | 'desc';
}

export interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkflowRunResult {
  id: string;
  workflowId: string;
  status: 'completed' | 'failed';
  startedAt: string;
  completedAt: string;
  duration: number;
  stepResults: WorkflowStepResult[];
  error?: string;
}

// --- ReactFlow editor types (Phase 3) ---

import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeType } from '@constants/nodeCategories';

export interface WorkflowNodeData {
  label: string;
  subtype: string;
  nodeType: WorkflowNodeType;
  version?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  inputs: Record<string, unknown>;
  resourceLimits?: { cpu: number; memoryMb: number; timeoutSeconds: number };
  retryPolicy?: { maxRetries: number; waitBetweenSeconds: number };
  metadata?: { createdAt?: string; lastRunAt?: string; avgCostUsd?: number };
}

export type WorkflowEditorNode = Node<WorkflowNodeData>;
export type WorkflowEditorEdge = Edge;

export interface WorkflowEditorMetadata {
  id: string;
  name: string;
  version: string;
  versionStatus: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStepResult {
  stepId: string;
  status: 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt: string;
  duration: number;
  output?: unknown;
  error?: string;
}
