import type {
  RunEntry,
  RunDetail,
  RunLogLine,
  RunNodeDetail,
  RunNodeMetrics,
  RunStatus,
  RunNodeStatus,
} from '@/types/run';
import { api } from '@api/client';

/* ---------- Status mapping helpers ---------- */
// Kernel returns UPPERCASE enum values, frontend types use lowercase.

const RUN_STATUS_MAP: Record<string, RunStatus> = {
  QUEUED: 'waiting',
  BLOCKED: 'waiting',
  RUNNING: 'running',
  RETRYING: 'running',
  SUCCEEDED: 'succeeded',
  SKIPPED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'cancelled',
};

const NODE_STATUS_MAP: Record<string, RunNodeStatus> = {
  QUEUED: 'pending',
  BLOCKED: 'pending',
  RUNNING: 'running',
  RETRYING: 'running',
  SUCCEEDED: 'completed',
  SKIPPED: 'skipped',
  FAILED: 'failed',
  CANCELED: 'failed',
};

function toRunStatus(s: string | undefined): RunStatus {
  if (!s) return 'waiting';
  return RUN_STATUS_MAP[s.toUpperCase()] ?? 'waiting';
}

function toNodeStatus(s: string | undefined): RunNodeStatus {
  if (!s) return 'pending';
  return NODE_STATUS_MAP[s.toUpperCase()] ?? 'pending';
}

function durationSeconds(startedAt?: string, completedAt?: string): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / 1000));
}

function safeDecodeBase64Json<T>(input: unknown): T | null {
  if (typeof input !== 'string' || !input) return null;
  try {
    const decoded = atob(input);
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

/* ---------- Run list ---------- */

interface RawRunListResponse {
  runs?: RawRun[];
}

export async function fetchRunList(workflowId: string): Promise<RunEntry[]> {
  const url = `/v0/runs?workflow_id=${encodeURIComponent(workflowId)}&run_type=workflow`;
  const res = await api<RawRunListResponse | RawRun[]>(url, { method: 'GET' });
  const list = Array.isArray(res) ? res : res?.runs ?? [];
  return list.map((raw) => mapRawRunToRunEntry(raw, workflowId));
}

export function mapRawRunToRunEntry(
  raw: RawRun & {
    workflow_id?: string;
    cost_actual?: number;
    actor?: string;
    completed_at?: string;
  },
  fallbackWorkflowId: string
): RunEntry {
  return {
    id: raw.id,
    workflowId: (raw as { workflow_id?: string }).workflow_id ?? fallbackWorkflowId,
    workflowName: '',
    status: toRunStatus(raw.status),
    startedAt: raw.started_at ?? new Date().toISOString(),
    completedAt: raw.completed_at,
    duration: durationSeconds(raw.started_at, raw.completed_at),
    // run-list shape doesn't include node_runs; ExecutionListItem tolerates 0
    nodesCompleted: 0,
    nodesTotal: 0,
    costUsd: raw.cost_actual ?? 0,
    triggeredBy: (raw as { actor?: string }).actor ?? 'system',
  };
}

/* ---------- Run detail ---------- */

interface RunEnvelope {
  run: RawRun & {
    workflow_id?: string;
    actor?: string;
    cost_actual?: number;
    completed_at?: string;
  };
  node_runs?: RawNodeRun[];
  artifacts?: unknown[]; // unused here; kept for shape parity
}

export async function fetchRunDetail(runId: string): Promise<RunDetail> {
  const envelope = await api<RunEnvelope>(`/v0/runs/${runId}`, { method: 'GET' });
  return mapRunEnvelopeToRunDetail(envelope);
}

export function mapRunEnvelopeToRunDetail(envelope: RunEnvelope): RunDetail {
  const run = envelope.run;
  const nodeRuns = envelope.node_runs ?? [];
  const nodes = nodeRuns.map(mapRawNodeRunToRunNodeDetail);

  return {
    id: run.id,
    workflowId: run.workflow_id ?? '',
    workflowName: '', // page overlays this from useWorkflow
    status: toRunStatus(run.status),
    startedAt: run.started_at ?? new Date().toISOString(),
    completedAt: run.completed_at,
    duration: durationSeconds(run.started_at, run.completed_at),
    costUsd: run.cost_actual ?? 0,
    nodesCompleted: nodes.filter((n) => n.status === 'completed').length,
    nodesTotal: nodes.length,
    triggeredBy: run.actor ?? 'system',
    nodes,
  };
}

export function mapRawNodeRunToRunNodeDetail(
  raw: RawNodeRun & { cost_actual?: number; cost_estimate?: number }
): RunNodeDetail {
  const decodedOutputs = safeDecodeBase64Json<RawNodeRunPort[]>(raw.outputs);
  const outputsRecord: Record<string, unknown> | null = Array.isArray(decodedOutputs)
    ? Object.fromEntries(
        decodedOutputs.map((p) => [p.name, p.value ?? p.artifact_id ?? null])
      )
    : null;

  const durationSec =
    raw.duration_ms != null
      ? Math.round(raw.duration_ms / 1000)
      : durationSeconds(raw.started_at, raw.completed_at);

  const metrics: RunNodeMetrics | null =
    raw.attempt > 0 || raw.cost_actual != null
      ? {
          cpuPercent: 0, // not exposed on the wire today
          memoryMb: 0, // not exposed on the wire today
          costUsd: raw.cost_actual ?? 0,
          attempt: raw.attempt ?? 1,
        }
      : null;

  return {
    nodeId: raw.node_id,
    nodeName: raw.node_id, // human name not on the wire; fall back to id
    nodeType: raw.tool_ref ?? 'tool',
    status: toNodeStatus(raw.status),
    startedAt: raw.started_at,
    completedAt: raw.completed_at,
    duration: durationSec,
    inputs: {}, // run.inputs is encoded at run-level not node-level; leave empty
    outputs: outputsRecord,
    metrics,
    attempts: [], // attempt-history endpoint not yet implemented in kernel
  };
}

/* ---------- Logs ---------- */

interface RawLogEvent {
  actor?: string;
  event_type?: string;
  payload?: unknown;
  timestamp?: string;
}

interface RawLogsResponse {
  logs?: RawLogEvent[];
  run_id?: string;
  status?: string;
}

export async function fetchRunLogs(runId: string): Promise<RunLogLine[]> {
  const res = await api<RawLogsResponse | RawLogEvent[]>(
    `/v0/runs/${runId}/logs`,
    { method: 'GET' }
  );
  const events = Array.isArray(res) ? res : res?.logs ?? [];
  return events.map(mapRawLogToRunLogLine);
}

export function mapRawLogToRunLogLine(ev: RawLogEvent): RunLogLine {
  const eventType = (ev.event_type ?? '').toLowerCase();
  const isFailure = eventType.includes('fail') || eventType.includes('error');
  let message = '';
  if (typeof ev.payload === 'string') {
    message = ev.payload;
  } else if (ev.payload != null) {
    try {
      message = JSON.stringify(ev.payload);
    } catch {
      message = String(ev.payload);
    }
  }
  if (!message && ev.event_type) message = ev.event_type;

  return {
    timestamp: ev.timestamp ?? new Date().toISOString(),
    nodeId: '',
    nodeName: ev.actor ?? 'system',
    level: isFailure ? 'error' : 'info',
    message,
  };
}

/* ---------- Artifacts ---------- */

export interface RunArtifact {
  id: string;
  project_id?: string;
  name?: string;
  type: string;
  content_hash?: string;
  size_bytes?: number;
  storage_uri?: string;
  created_by?: string;
  created_at: string;
  /**
   * Free-form metadata propagated from the producing Tool's ATP manifest
   * output port. The renderer registry reads `metadata.renderer_hint` to let
   * Tool authors override the heuristic renderer pick. Absent until the
   * kernel ships the propagation work (concepts/04 Phase 2d).
   */
  metadata?: Record<string, unknown>;
}

interface RawArtifactsResponse {
  artifacts?: RunArtifact[];
}

export async function fetchRunArtifacts(runId: string): Promise<RunArtifact[]> {
  const res = await api<RawArtifactsResponse | RunArtifact[]>(
    `/v0/runs/${runId}/artifacts`,
    { method: 'GET' }
  );
  return Array.isArray(res) ? res : res?.artifacts ?? [];
}

/* ---------- Cancel ---------- */

export const cancelRun = (runId: string): Promise<void> =>
  api(`/v0/runs/${runId}/cancel`, { method: 'POST' });

// retryRun is intentionally NOT exported. Kernel /v0/runs/{id}/retry is not registered (404).
// Restart-style retry is handled by RunActionBar via useRunWorkflow.start (POST /v0/workflows/{id}/run).

/* ---------- Real backend run detail (used by playground outputs panel) ---------- */
// PRESERVED for src/components/agents/InlineToolCallCard.tsx and
// src/components/agents/execution/RunOutputsPanel.tsx — do not remove.

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
