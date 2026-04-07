import type {
  DashboardStats,
  ActiveRun,
  RecentWorkflow,
  AgentActivityEntry,
  GovernanceStudy,
  SystemStatus,
} from '@/types/index';
import { API_CONFIG } from '@constants/api';

const BASE = API_CONFIG.BASE_URL;

async function fetchOrMock<T>(url: string, mockData: T): Promise<T> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(API_CONFIG.TIMEOUT) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return mockData;
  }
}

// --- Mock data ---

const MOCK_STATS: DashboardStats = {
  workflows: { total: 8, active: 3 },
  agents: { total: 3, decisionsToday: 47 },
  runs7d: { total: 156, successRate: 94 },
  boards: { total: 2, pendingApproval: 1 },
};

const MOCK_ACTIVE_RUNS: ActiveRun[] = [
  { id: 'run_001', name: 'FEA Validation Pipeline', runId: 'run_a1b2c3', nodesCompleted: 3, nodesTotal: 5, elapsedSeconds: 120, costUsd: 1.24, status: 'running', startedAt: new Date(Date.now() - 120_000).toISOString() },
  { id: 'run_002', name: 'CFD Analysis Flow', runId: 'run_b2c3d4', nodesCompleted: 1, nodesTotal: 3, elapsedSeconds: 45, costUsd: 0.56, status: 'running', startedAt: new Date(Date.now() - 45_000).toISOString() },
  { id: 'run_003', name: 'Material Testing Pipeline', runId: 'run_c3d4e5', nodesCompleted: 0, nodesTotal: 3, elapsedSeconds: 12, costUsd: 0.02, status: 'waiting', startedAt: new Date(Date.now() - 12_000).toISOString() },
];

const MOCK_RECENT_WORKFLOWS: RecentWorkflow[] = [
  { id: 'wf_001', name: 'FEA Validation Pipeline', version: 'v3', versionStatus: 'published', nodeCount: 5, updatedAt: new Date(Date.now() - 120_000).toISOString(), status: 'active' },
  { id: 'wf_002', name: 'CFD Analysis Flow', version: 'v1', versionStatus: 'draft', nodeCount: 3, updatedAt: new Date(Date.now() - 3_600_000).toISOString(), status: 'idle' },
  { id: 'wf_003', name: 'Material Testing Pipeline', version: 'v2', versionStatus: 'published', nodeCount: 7, updatedAt: new Date(Date.now() - 10_800_000).toISOString(), status: 'active' },
  { id: 'wf_004', name: 'Topology Optimization', version: 'v1', versionStatus: 'draft', nodeCount: 4, updatedAt: new Date(Date.now() - 86_400_000).toISOString(), status: 'idle' },
  { id: 'wf_005', name: 'Mesh Quality Check', version: 'v1', versionStatus: 'published', nodeCount: 2, updatedAt: new Date(Date.now() - 172_800_000).toISOString(), status: 'idle' },
];

const MOCK_AGENT_ACTIVITY: AgentActivityEntry[] = [
  { id: 'aa_001', agentName: 'FEA Optimizer', action: 'selected fea-solver', confidence: 0.92, timestamp: new Date(Date.now() - 120_000).toISOString() },
  { id: 'aa_002', agentName: 'FEA Optimizer', action: 'selected mesh-gen', confidence: 0.87, timestamp: new Date(Date.now() - 900_000).toISOString() },
  { id: 'aa_003', agentName: 'Design Advisor', action: 'escalated (low confidence)', confidence: 0.42, timestamp: new Date(Date.now() - 3_600_000).toISOString() },
  { id: 'aa_004', agentName: 'FEA Optimizer', action: 'selected result-analyzer', confidence: 0.91, timestamp: new Date(Date.now() - 10_800_000).toISOString() },
];

const MOCK_GOVERNANCE: GovernanceStudy[] = [
  { id: 'gov_001', name: 'Structural Validation Study', gatesPassed: 2, gatesTotal: 4, approvalStatus: 'pending', actions: ['study', 'explore', 'review'] },
  { id: 'gov_002', name: 'Thermal Analysis Board', gatesPassed: 0, gatesTotal: 2, approvalStatus: 'in-review', actions: ['explore', 'review'] },
];

const MOCK_SYSTEM_STATUS: SystemStatus = {
  overall: 'operational',
  apiLatencyMs: 12,
  natsConnected: true,
  runnerSlots: { used: 3, total: 4 },
  storageUsed: { bytes: 4_509_715_660, totalBytes: 10_737_418_240 },
};

// --- API functions ---

export function fetchDashboardStats(): Promise<DashboardStats> {
  return fetchOrMock(`${BASE}/dashboard/stats`, MOCK_STATS);
}

export function fetchActiveRuns(): Promise<ActiveRun[]> {
  return fetchOrMock(`${BASE}/dashboard/active-runs`, MOCK_ACTIVE_RUNS);
}

export function fetchRecentWorkflows(): Promise<RecentWorkflow[]> {
  return fetchOrMock(`${BASE}/dashboard/recent-workflows`, MOCK_RECENT_WORKFLOWS);
}

export function fetchAgentActivity(): Promise<AgentActivityEntry[]> {
  return fetchOrMock(`${BASE}/dashboard/agent-activity`, MOCK_AGENT_ACTIVITY);
}

export function fetchGovernance(): Promise<GovernanceStudy[]> {
  return fetchOrMock(`${BASE}/dashboard/governance`, MOCK_GOVERNANCE);
}

export function fetchSystemStatus(): Promise<SystemStatus> {
  return fetchOrMock(`${BASE}/dashboard/system-status`, MOCK_SYSTEM_STATUS);
}
