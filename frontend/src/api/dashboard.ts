import { apiClient } from '@api/client';
import type {
  DashboardStats,
  ActiveRun,
  RecentWorkflow,
  AgentActivityEntry,
  GovernanceStudy,
  SystemStatus,
} from '@/types/index';

/* ---------- Backend response types (raw shapes) ---------- */

interface RawRun {
  id: string;
  status: string;
  run_type?: string;
  agent_id?: string;
  started_at?: string;
  completed_at?: string;
  cost_actual?: number;
  duration_seconds?: number;
}

interface RawAgent {
  id: string;
  name: string;
}

interface RawWorkflow {
  id: string;
  name: string;
  current_version?: string;
  status?: string;
  node_count?: number;
  updated_at?: string;
}

interface RawBoard {
  id: string;
  name: string;
  status?: string;
  gates_passed?: number;
  gates_total?: number;
}

/* ---------- Helpers ---------- */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function safeArray<T>(path: string, key: string): Promise<T[]> {
  try {
    const res = await apiClient.get<Record<string, T[] | null>>(path);
    return (res?.[key] ?? []) as T[];
  } catch {
    return [];
  }
}

/* ---------- Dashboard data ---------- */

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [agents, runs, workflows, boards] = await Promise.all([
    safeArray<RawAgent>('/v0/agents', 'agents'),
    safeArray<RawRun>('/v0/runs?limit=200', 'runs'),
    safeArray<RawWorkflow>('/v0/workflows', 'workflows'),
    safeArray<RawBoard>('/v0/boards', 'boards'),
  ]);

  const now = Date.now();
  const runs7d = runs.filter((r) => {
    const ts = r.started_at ?? r.completed_at;
    if (!ts) return false;
    return now - new Date(ts).getTime() < SEVEN_DAYS_MS;
  });
  const succeeded7d = runs7d.filter((r) => r.status === 'SUCCEEDED').length;
  const successRate = runs7d.length > 0 ? Math.round((succeeded7d / runs7d.length) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const decisionsToday = runs.filter(
    (r) => r.run_type === 'agent' && r.started_at && new Date(r.started_at) >= today,
  ).length;

  const activeWorkflows = workflows.filter(
    (w) => w.status === 'active' || w.status === 'published',
  ).length;
  const pendingBoards = boards.filter(
    (b) => b.status === 'PENDING' || b.status === 'IN_REVIEW',
  ).length;

  return {
    workflows: { total: workflows.length, active: activeWorkflows },
    agents: { total: agents.length, decisionsToday },
    runs7d: { total: runs7d.length, successRate },
    boards: { total: boards.length, pendingApproval: pendingBoards },
  };
}

export async function fetchActiveRuns(): Promise<ActiveRun[]> {
  const runs = await safeArray<RawRun>('/v0/runs?limit=50', 'runs');
  const active = runs.filter(
    (r) => r.status === 'RUNNING' || r.status === 'QUEUED' || r.status === 'PENDING',
  );
  return active.slice(0, 5).map((r) => ({
    id: r.id,
    name: r.agent_id ? `Agent run ${r.agent_id.slice(0, 12)}` : `Run ${r.id.slice(0, 12)}`,
    runId: r.id,
    nodesCompleted: 0,
    nodesTotal: 1,
    elapsedSeconds: r.started_at
      ? Math.floor((Date.now() - new Date(r.started_at).getTime()) / 1000)
      : 0,
    costUsd: r.cost_actual ?? 0,
    status: r.status === 'RUNNING' ? 'running' : 'waiting',
    startedAt: r.started_at ?? new Date().toISOString(),
  }));
}

export async function fetchRecentWorkflows(): Promise<RecentWorkflow[]> {
  const workflows = await safeArray<RawWorkflow>('/v0/workflows', 'workflows');
  return workflows.slice(0, 5).map((w) => ({
    id: w.id,
    name: w.name,
    version: w.current_version ?? 'v1',
    versionStatus: (w.status === 'published' ? 'published' : 'draft') as 'published' | 'draft',
    nodeCount: w.node_count ?? 0,
    updatedAt: w.updated_at ?? new Date().toISOString(),
    status: w.status === 'active' || w.status === 'published' ? 'active' : 'idle',
  }));
}

export async function fetchAgentActivity(): Promise<AgentActivityEntry[]> {
  const [runs, agents] = await Promise.all([
    safeArray<RawRun>('/v0/runs?limit=50', 'runs'),
    safeArray<RawAgent>('/v0/agents', 'agents'),
  ]);
  const agentNameById = new Map(agents.map((a) => [a.id, a.name]));
  const agentRuns = runs
    .filter((r) => r.run_type === 'agent' && r.agent_id)
    .sort((a, b) => {
      const ta = new Date(a.started_at ?? 0).getTime();
      const tb = new Date(b.started_at ?? 0).getTime();
      return tb - ta;
    })
    .slice(0, 5);
  return agentRuns.map((r) => ({
    id: r.id,
    agentName: agentNameById.get(r.agent_id!) ?? r.agent_id!,
    action: r.status === 'SUCCEEDED' ? 'run completed' : `run ${r.status.toLowerCase()}`,
    confidence: r.status === 'SUCCEEDED' ? 1.0 : 0.5,
    timestamp: r.started_at ?? r.completed_at ?? new Date().toISOString(),
  }));
}

export async function fetchGovernance(): Promise<GovernanceStudy[]> {
  const boards = await safeArray<RawBoard>('/v0/boards', 'boards');
  return boards.slice(0, 5).map((b) => ({
    id: b.id,
    name: b.name,
    gatesPassed: b.gates_passed ?? 0,
    gatesTotal: b.gates_total ?? 0,
    approvalStatus: (b.status === 'IN_REVIEW'
      ? 'in-review'
      : b.status === 'PENDING'
      ? 'pending'
      : 'approved') as GovernanceStudy['approvalStatus'],
    actions: ['study', 'review'],
  }));
}

interface RawHealth {
  status: string;
  uptime?: string;
  checks?: {
    database?: { status?: string; latency?: string };
    nats?: { status?: string; reconnects?: number };
  };
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const h = await apiClient.get<RawHealth>('/v0/health');
    const dbHealthy = h.checks?.database?.status === 'healthy';
    const natsHealthy = h.checks?.nats?.status === 'healthy';
    const overall = dbHealthy && natsHealthy ? 'operational' : 'degraded';
    // Parse latency like "693µs" or "12ms" → ms
    const latencyStr = h.checks?.database?.latency ?? '0ms';
    const apiLatencyMs = latencyStr.endsWith('µs')
      ? Math.max(1, Math.round(parseFloat(latencyStr) / 1000))
      : Math.round(parseFloat(latencyStr) || 0);
    return {
      overall: overall as SystemStatus['overall'],
      apiLatencyMs,
      natsConnected: natsHealthy,
      runnerSlots: { used: 0, total: 4 },
      storageUsed: { bytes: 0, totalBytes: 0 },
    };
  } catch {
    return {
      overall: 'down',
      apiLatencyMs: 0,
      natsConnected: false,
      runnerSlots: { used: 0, total: 4 },
      storageUsed: { bytes: 0, totalBytes: 0 },
    };
  }
}
