export type RunStatus = 'running' | 'succeeded' | 'failed' | 'waiting' | 'cancelled';
export type RunNodeStatus = 'running' | 'completed' | 'failed' | 'pending' | 'skipped';

export interface RunEntry {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  duration: number; // seconds
  nodesCompleted: number;
  nodesTotal: number;
  costUsd: number;
  triggeredBy: string;
}

export interface RunNodeDetail {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: RunNodeStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // seconds
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown> | null;
  metrics: RunNodeMetrics | null;
  attempts: RunNodeAttempt[];
}

export interface RunNodeMetrics {
  cpuPercent: number;
  memoryMb: number;
  costUsd: number;
  attempt: number;
}

export interface RunNodeAttempt {
  attempt: number;
  status: RunNodeStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
}

export interface RunLogLine {
  timestamp: string;
  nodeId: string;
  nodeName: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface RunDetail {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  duration: number;
  costUsd: number;
  nodesCompleted: number;
  nodesTotal: number;
  triggeredBy: string;
  nodes: RunNodeDetail[];
}

export interface RunListParams {
  workflowId: string;
  status?: RunStatus | 'all';
  page?: number;
  limit?: number;
}

export interface RunListResponse {
  runs: RunEntry[];
  total: number;
}

export type RunStatusFilter = 'all' | 'running' | 'succeeded' | 'failed';
