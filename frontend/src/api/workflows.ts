import type { Workflow } from '@/types/workflow';
import { api, apiClient } from '@api/client';

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

interface RawWorkflow {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface RawWorkflowDetailEnvelope {
  workflow: RawWorkflow;
  versions?: Array<{ id: string; version: number; dsl?: string; status?: string }>;
}

export async function fetchWorkflow(id: string): Promise<Workflow> {
  const env = await api<RawWorkflowDetailEnvelope>(`/v0/workflows/${id}`, { method: 'GET' });
  const w = env.workflow;
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    status: 'idle',
    projectId: w.project_id,
    ownerId: '',
    ownerName: '',
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    runCount: 0,
    steps: [],
    triggers: [],
  };
}

export function saveWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
  return api(`/v0/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function runWorkflow(id: string): Promise<{ runId: string }> {
  return api(`/v0/workflows/${id}/run`, { method: 'POST' });
}

// --- Version management ---

export function listWorkflowVersions(workflowId: string): Promise<WorkflowVersion[]> {
  return api(`/v0/workflows/${workflowId}/versions`, { method: 'GET' });
}

export function createWorkflowVersion(workflowId: string, dslYaml: string): Promise<WorkflowVersion> {
  return apiClient.post(`/v0/workflows/${workflowId}/versions`, { dsl_yaml: dslYaml });
}

export function publishWorkflowVersion(workflowId: string, version: number): Promise<void> {
  return apiClient.post(`/v0/workflows/${workflowId}/versions/${version}/publish`);
}

// --- Compile & Validate ---

export function compileWorkflow(workflowId: string, version: number): Promise<CompileResult> {
  return api(
    '/v0/workflows/compile',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: workflowId, version }),
    },
  );
}

export function validateWorkflow(dslYaml: string): Promise<ValidateResult> {
  return api(
    '/v0/workflows/validate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dsl_yaml: dslYaml }),
    },
  );
}

// --- Workflow CRUD ---

export function createWorkflow(data: { name: string; description?: string }): Promise<{ id: string }> {
  return apiClient.post('/v0/workflows', data);
}

export function deleteWorkflow(id: string): Promise<void> {
  return apiClient.delete(`/v0/workflows/${id}`);
}

// --- Trigger management ---

export interface TriggerEntry {
  id: string;
  workflow_id: string;
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function listTriggers(workflowId: string): Promise<TriggerEntry[]> {
  return api(`/v0/workflows/${workflowId}/triggers`, { method: 'GET' });
}

export function createTrigger(
  workflowId: string,
  data: { type: TriggerEntry['type']; config: Record<string, unknown>; is_enabled: boolean },
): Promise<TriggerEntry> {
  return api(
    `/v0/workflows/${workflowId}/triggers`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
  );
}

export function updateTrigger(
  workflowId: string,
  triggerId: string,
  data: Partial<TriggerEntry>,
): Promise<TriggerEntry> {
  return api(
    `/v0/workflows/${workflowId}/triggers/${triggerId}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
  );
}

export function deleteTrigger(workflowId: string, triggerId: string): Promise<void> {
  return api(
    `/v0/workflows/${workflowId}/triggers/${triggerId}`,
    { method: 'DELETE' },
  );
}
