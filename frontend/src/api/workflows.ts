import type { Workflow } from '@/types/workflow';
import { API_CONFIG } from '@constants/api';
import { apiOrMock, apiClient } from '@api/client';

const BASE = API_CONFIG.BASE_URL;

async function tryApiOrMock<T>(url: string, options: RequestInit, mockData: T): Promise<T> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(API_CONFIG.TIMEOUT) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return mockData;
  }
}

// --- Types ---

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version: number;
  status: 'draft' | 'compiled' | 'published';
  created_at: string;
}

export interface CompileResult {
  success: boolean;
  ast_json?: unknown;
  errors: { node_id?: string; message: string; severity: 'error' | 'warning' }[];
}

export interface ValidateResult {
  valid: boolean;
  errors: { node_id?: string; message: string; severity: 'error' | 'warning' }[];
  warnings: { node_id?: string; message: string; severity: 'warning' }[];
}

// --- Mock data ---

const MOCK_VERSIONS: WorkflowVersion[] = [
  { id: 'wv_3', workflow_id: 'wf_fea_validation', version: 3, status: 'draft', created_at: '2026-04-01T10:00:00Z' },
  { id: 'wv_2', workflow_id: 'wf_fea_validation', version: 2, status: 'published', created_at: '2026-03-28T08:00:00Z' },
  { id: 'wv_1', workflow_id: 'wf_fea_validation', version: 1, status: 'published', created_at: '2026-03-20T12:00:00Z' },
];

const MOCK_COMPILE_RESULT: CompileResult = { success: true, errors: [] };

const MOCK_VALIDATE_RESULT: ValidateResult = {
  valid: true,
  errors: [],
  warnings: [{ message: 'Node "step_opt" has no retry policy configured', severity: 'warning' }],
};

// --- Mock workflow for the editor ---

const MOCK_WORKFLOW: Workflow = {
  id: 'wf_fea_validation',
  name: 'FEA Validation Pipeline',
  description: 'Structural analysis pipeline with mesh generation and FEA solving',
  status: 'idle',
  ownerId: 'user_001',
  ownerName: 'Santhosh',
  createdAt: '2026-03-15T10:00:00Z',
  updatedAt: '2026-04-01T10:42:00Z',
  lastRunAt: '2026-04-01T10:30:00Z',
  runCount: 24,
  avgDuration: 42,
  steps: [
    { id: 'step_mesh', name: 'Mesh Generator', type: 'action', status: 'completed', action: 'mesh-generator', config: { geometry: 'art_cad_001', element_type: 'hex8' }, position: { x: 300, y: 120 }, connections: ['step_fea'], duration: 7 },
    { id: 'step_fea', name: 'FEA Solver', type: 'action', status: 'running', action: 'fea-solver', config: { mesh_file: '[art_abc123]', threshold: 128, output_format: 'VTK' }, position: { x: 295, y: 215 }, connections: ['step_opt'], duration: 12 },
    { id: 'step_opt', name: 'AI Optimizer', type: 'action', status: 'pending', action: 'ai-optimizer', config: { goal: 'Minimize weight' }, position: { x: 610, y: 305 }, connections: [] },
  ],
  triggers: [
    { id: 'trig_webhook', type: 'webhook', config: { endpoint: '/validate' }, isEnabled: true },
  ],
};

export function fetchWorkflow(id: string): Promise<Workflow> {
  return tryApiOrMock(`${BASE}/workflows/${id}`, { method: 'GET' }, {
    ...MOCK_WORKFLOW,
    id,
    name: id === MOCK_WORKFLOW.id
      ? MOCK_WORKFLOW.name
      : id
          .replace(/^wf[_-]?/i, '')
          .split(/[_-]/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ') || MOCK_WORKFLOW.name,
  });
}

export function saveWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
  return tryApiOrMock(`${BASE}/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, { ...MOCK_WORKFLOW, ...data } as Workflow);
}

export function runWorkflow(id: string): Promise<{ runId: string }> {
  return tryApiOrMock(`${BASE}/workflows/${id}/run`, { method: 'POST' }, { runId: `run_${Date.now()}` });
}

// --- Version management ---

export function listWorkflowVersions(workflowId: string): Promise<WorkflowVersion[]> {
  return apiOrMock(`/v0/workflows/${workflowId}/versions`, { method: 'GET' }, MOCK_VERSIONS);
}

export function createWorkflowVersion(workflowId: string, dslYaml: string): Promise<WorkflowVersion> {
  return apiClient.post(`/v0/workflows/${workflowId}/versions`, { dsl_yaml: dslYaml });
}

export function publishWorkflowVersion(workflowId: string, version: number): Promise<void> {
  return apiClient.post(`/v0/workflows/${workflowId}/versions/${version}/publish`);
}

// --- Compile & Validate ---

export function compileWorkflow(workflowId: string, version: number): Promise<CompileResult> {
  return apiOrMock(
    '/v0/workflows/compile',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: workflowId, version }),
    },
    MOCK_COMPILE_RESULT,
  );
}

export function validateWorkflow(dslYaml: string): Promise<ValidateResult> {
  return apiOrMock(
    '/v0/workflows/validate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dsl_yaml: dslYaml }),
    },
    MOCK_VALIDATE_RESULT,
  );
}

// --- Workflow CRUD ---

export function createWorkflow(data: { name: string; description?: string }): Promise<{ id: string }> {
  return apiClient.post('/v0/workflows', data);
}

export function deleteWorkflow(id: string): Promise<void> {
  return apiClient.delete(`/v0/workflows/${id}`);
}
