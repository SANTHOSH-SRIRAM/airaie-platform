import type { RunEntry, RunDetail, RunLogLine } from '@/types/run';
import { API_CONFIG } from '@constants/api';

const BASE = API_CONFIG.BASE_URL;

async function tryApiOrMock<T>(url: string, options: RequestInit, mockData: T): Promise<T> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(API_CONFIG.TIMEOUT) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch { return mockData; }
}

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
  tryApiOrMock(`${BASE}/workflows/${workflowId}/runs`, { method: 'GET' }, MOCK_RUNS);

export const fetchRunDetail = (runId: string): Promise<RunDetail> =>
  tryApiOrMock(`${BASE}/runs/${runId}`, { method: 'GET' }, MOCK_DETAIL);

export const fetchRunLogs = (runId: string): Promise<RunLogLine[]> =>
  tryApiOrMock(`${BASE}/runs/${runId}/logs`, { method: 'GET' }, MOCK_LOGS);

export const cancelRun = (runId: string): Promise<void> =>
  tryApiOrMock(`${BASE}/runs/${runId}/cancel`, { method: 'POST' }, undefined);

export const retryRun = (runId: string): Promise<{ runId: string }> =>
  tryApiOrMock(`${BASE}/runs/${runId}/retry`, { method: 'POST' }, { runId: `run_${Date.now()}` });
