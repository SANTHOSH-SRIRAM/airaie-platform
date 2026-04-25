import type { Workflow, WorkflowStep } from '@/types/workflow';
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

interface RawDslNode {
  id: string;
  tool?: string;
  inputs?: Record<string, unknown>;
  depends_on?: string[];
  timeout?: number;
}

interface RawDsl {
  kind?: string;
  nodes?: RawDslNode[];
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

function decodeDsl(b64: string | undefined): RawDsl | null {
  if (!b64) return null;
  try {
    return JSON.parse(atob(b64)) as RawDsl;
  } catch {
    return null;
  }
}

function humanizeNodeId(id: string): string {
  return id
    .replace(/^node_\d+_/, '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || id;
}

// Lay nodes out left-to-right by topological depth, top-to-bottom by sibling index.
function dslToSteps(dsl: RawDsl | null): WorkflowStep[] {
  const nodes = dsl?.nodes ?? [];
  if (nodes.length === 0) return [];

  const depthOf = new Map<string, number>();
  const compute = (id: string, seen = new Set<string>()): number => {
    if (depthOf.has(id)) return depthOf.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const node = nodes.find((n) => n.id === id);
    const deps = node?.depends_on ?? [];
    const d = deps.length ? Math.max(...deps.map((p) => compute(p, seen) + 1)) : 0;
    depthOf.set(id, d);
    return d;
  };
  nodes.forEach((n) => compute(n.id));

  const COL_WIDTH = 220;
  const ROW_HEIGHT = 110;
  const X0 = 80;
  const Y0 = 80;
  const siblingsByDepth = new Map<number, number>();

  // Build connection map from inverse depends_on so each step lists its outgoing edges.
  const outgoingByNode = new Map<string, string[]>();
  nodes.forEach((n) => {
    (n.depends_on ?? []).forEach((parent) => {
      const arr = outgoingByNode.get(parent) ?? [];
      arr.push(n.id);
      outgoingByNode.set(parent, arr);
    });
  });

  return nodes.map((node) => {
    const depth = depthOf.get(node.id) ?? 0;
    const sibling = siblingsByDepth.get(depth) ?? 0;
    siblingsByDepth.set(depth, sibling + 1);

    return {
      id: node.id,
      name: humanizeNodeId(node.id),
      type: 'action',
      status: 'pending',
      action: node.tool,
      config: (node.inputs ?? {}) as Record<string, unknown>,
      position: { x: X0 + depth * COL_WIDTH, y: Y0 + sibling * ROW_HEIGHT },
      connections: outgoingByNode.get(node.id) ?? [],
      duration: node.timeout,
    };
  });
}

export async function fetchWorkflow(id: string): Promise<Workflow> {
  const env = await api<RawWorkflowDetailEnvelope>(`/v0/workflows/${id}`, { method: 'GET' });
  const w = env.workflow;
  // Pick latest published version, else highest version, else versions[0].
  const versions = env.versions ?? [];
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const latest = sorted.find((v) => v.status === 'published') ?? sorted[0];
  const dsl = decodeDsl(latest?.dsl);
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
    steps: dslToSteps(dsl),
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
