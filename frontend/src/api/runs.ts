import type { RunEntry, RunDetail, RunLogLine } from '@/types/run';
import { apiOrMock } from '@api/client';

const MOCK_RUNS: RunEntry[] = [
  { id: 'run_a1b2c3', workflowId: 'wf_fea', workflowName: 'FEA Validation Pipeline', status: 'running', startedAt: new Date(Date.now() - 120_000).toISOString(), duration: 120, nodesCompleted: 3, nodesTotal: 5, costUsd: 1.24, triggeredBy: 'Webhook' },
  { id: 'run_a1b1d4', workflowId: 'wf_fea', workflowName: 'FEA Validation Pipeline', status: 'succeeded', startedAt: new Date(Date.now() - 900_000).toISOString(), completedAt: new Date(Date.now() - 858_000).toISOString(), duration: 42, nodesCompleted: 5, nodesTotal: 5, costUsd: 2.30, triggeredBy: 'Manual' },
  { id: 'run_a1b0e5', workflowId: 'wf_fea', workflowName: 'FEA Validation Pipeline', status: 'failed', startedAt: new Date(Date.now() - 3_600_000).toISOString(), completedAt: new Date(Date.now() - 3_540_000).toISOString(), duration: 60, nodesCompleted: 2, nodesTotal: 5, costUsd: 0.85, triggeredBy: 'Schedule' },
  { id: 'run_a0f9f6', workflowId: 'wf_fea', workflowName: 'FEA Validation Pipeline', status: 'succeeded', startedAt: new Date(Date.now() - 10_800_000).toISOString(), duration: 38, nodesCompleted: 5, nodesTotal: 5, costUsd: 1.95, triggeredBy: 'Webhook' },
  { id: 'run_a0f8g7', workflowId: 'wf_fea', workflowName: 'FEA Validation Pipeline', status: 'succeeded', startedAt: new Date(Date.now() - 18_000_000).toISOString(), duration: 72, nodesCompleted: 5, nodesTotal: 5, costUsd: 3.20, triggeredBy: 'Manual' },
];

const MOCK_DETAIL: RunDetail = {
  id: 'run_a1b2c3', workflowId: 'wf_fea', workflowName: 'FEA Validation Pipeline', status: 'running',
  startedAt: new Date(Date.now() - 120_000).toISOString(), duration: 120, costUsd: 1.24, nodesCompleted: 3, nodesTotal: 5, triggeredBy: 'Webhook',
  nodes: [
    { nodeId: 'trig_webhook', nodeName: 'Webhook', nodeType: 'trigger', status: 'completed', startedAt: new Date(Date.now() - 120_000).toISOString(), duration: 0.1, inputs: { endpoint: '/validate' }, outputs: { body: '1 item' }, metrics: { cpuPercent: 2, memoryMb: 64, costUsd: 0.01, attempt: 1 }, attempts: [{ attempt: 1, status: 'completed', startedAt: new Date(Date.now() - 120_000).toISOString(), duration: 0.1 }] },
    { nodeId: 'step_mesh', nodeName: 'Mesh Generator', nodeType: 'tool', status: 'completed', startedAt: new Date(Date.now() - 119_000).toISOString(), duration: 7, inputs: { geometry: 'art_cad_001' }, outputs: { mesh: '45,000 elements' }, metrics: { cpuPercent: 85, memoryMb: 512, costUsd: 0.30, attempt: 1 }, attempts: [{ attempt: 1, status: 'completed', startedAt: new Date(Date.now() - 119_000).toISOString(), duration: 7 }] },
    { nodeId: 'step_fea', nodeName: 'FEA Solver', nodeType: 'tool', status: 'running', startedAt: new Date(Date.now() - 112_000).toISOString(), duration: 9, inputs: { mesh_file: 'art_def456', threshold: 128 }, outputs: null, metrics: { cpuPercent: 92, memoryMb: 1400, costUsd: 0.44, attempt: 1 }, attempts: [{ attempt: 1, status: 'running', startedAt: new Date(Date.now() - 112_000).toISOString() }] },
    { nodeId: 'step_opt', nodeName: 'AI Optimizer', nodeType: 'agent', status: 'pending', inputs: { goal: 'Minimize weight' }, outputs: null, metrics: null, attempts: [] },
    { nodeId: 'step_evidence', nodeName: 'Evidence Gate', nodeType: 'governance', status: 'pending', inputs: { criteria: 'ISO 12345' }, outputs: null, metrics: null, attempts: [] },
  ],
};

const MOCK_LOGS: RunLogLine[] = [
  { timestamp: '10:42:01', nodeId: 'trig_webhook', nodeName: 'Webhook', level: 'info', message: 'Received POST /validate — 1 item' },
  { timestamp: '10:42:01', nodeId: 'step_mesh', nodeName: 'Mesh Generator', level: 'info', message: 'Starting container mesh-gen:1.0...' },
  { timestamp: '10:42:03', nodeId: 'step_mesh', nodeName: 'Mesh Generator', level: 'info', message: 'Downloading artifact art_cad_001 from S3...' },
  { timestamp: '10:42:08', nodeId: 'step_mesh', nodeName: 'Mesh Generator', level: 'info', message: 'Mesh generated: 45,000 elements, quality 0.95' },
  { timestamp: '10:42:08', nodeId: 'step_mesh', nodeName: 'Mesh Generator', level: 'info', message: 'SUCCEEDED — duration 7s, cost $0.30' },
  { timestamp: '10:42:09', nodeId: 'step_fea', nodeName: 'FEA Solver', level: 'info', message: 'Starting container fea-solver:2.1...' },
  { timestamp: '10:42:12', nodeId: 'step_fea', nodeName: 'FEA Solver', level: 'info', message: 'Loading mesh art_def456...' },
  { timestamp: '10:42:15', nodeId: 'step_fea', nodeName: 'FEA Solver', level: 'info', message: 'Running analysis... iteration 3/10' },
  { timestamp: '10:42:15', nodeId: 'step_fea', nodeName: 'FEA Solver', level: 'info', message: 'Solving stiffness matrix....' },
];

export const fetchRunList = (workflowId: string): Promise<RunEntry[]> =>
  apiOrMock(`/v0/workflows/${workflowId}/runs`, { method: 'GET' }, MOCK_RUNS);

export const fetchRunDetail = (runId: string): Promise<RunDetail> =>
  apiOrMock(`/v0/runs/${runId}`, { method: 'GET' }, MOCK_DETAIL);

export const fetchRunLogs = (runId: string): Promise<RunLogLine[]> =>
  apiOrMock(`/v0/runs/${runId}/logs`, { method: 'GET' }, MOCK_LOGS);

export const cancelRun = (runId: string): Promise<void> =>
  apiOrMock(`/v0/runs/${runId}/cancel`, { method: 'POST' }, undefined);

export const retryRun = (runId: string): Promise<{ runId: string }> =>
  apiOrMock(`/v0/runs/${runId}/retry`, { method: 'POST' }, { runId: `run_${Date.now()}` });

export interface RunArtifact {
  id: string;
  type: string;
  name?: string;
  size?: number;
  node_id?: string;
  created_at: string;
  download_url?: string;
}

const MOCK_ARTIFACTS: RunArtifact[] = [];

export const fetchRunArtifacts = (runId: string): Promise<RunArtifact[]> =>
  apiOrMock(`/v0/runs/${runId}/artifacts`, { method: 'GET' }, MOCK_ARTIFACTS);

/* ---------- Real backend run detail (used by playground outputs panel) ---------- */

export interface RawNodeRunPort {
  name: string;
  value?: unknown;
  artifact_id?: string;
}

export interface RawNodeRun {
  id: string;
  run_id: string;
  node_id: string;
  job_id?: string;
  tool_ref: string;
  status: 'QUEUED' | 'RUNNING' | 'BLOCKED' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED' | 'CANCELED' | 'RETRYING';
  attempt: number;
  outputs?: string;          // base64-encoded JSON of RawNodeRunPort[]
  exit_code?: number | null;
  error_message?: string;
  duration_ms?: number | null;
  started_at?: string;
  completed_at?: string;
}

export interface RawRun {
  id: string;
  status: string;
  run_type?: string;
  agent_id?: string;
  started_at?: string;
  completed_at?: string;
  cost_actual?: number;
}

export interface RunDetailResponse {
  run: RawRun;
  node_runs?: RawNodeRun[];
}

export async function fetchRunWithNodes(runId: string): Promise<RunDetailResponse> {
  const { apiClient } = await import('@api/client');
  return apiClient.get<RunDetailResponse>(`/v0/runs/${runId}`);
}

/** Decode a node_run's base64-encoded outputs blob into a list of port values. */
export function decodeNodeOutputs(outputs?: string): RawNodeRunPort[] {
  if (!outputs) return [];
  try {
    const json = atob(outputs);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
