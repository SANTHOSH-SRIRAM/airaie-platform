/** Stats displayed in the 4-card row */
export interface DashboardStats {
  workflows: { total: number; active: number };
  agents: { total: number; decisionsToday: number };
  runs7d: { total: number; successRate: number };
  boards: { total: number; pendingApproval: number };
}

/** A currently-running workflow run */
export interface ActiveRun {
  id: string;
  name: string;
  runId: string;
  nodesCompleted: number;
  nodesTotal: number;
  elapsedSeconds: number;
  costUsd: number;
  status: 'running' | 'waiting' | 'queued';
  startedAt: string;
}

/** A recently-modified workflow */
export interface RecentWorkflow {
  id: string;
  name: string;
  version: string;
  versionStatus: 'published' | 'draft';
  nodeCount: number;
  updatedAt: string;
  status: 'active' | 'idle' | 'error';
}

/** A single entry in the agent activity feed */
export interface AgentActivityEntry {
  id: string;
  agentName: string;
  action: string;
  confidence: number;
  timestamp: string;
}

/** A governance study/board entry */
export interface GovernanceStudy {
  id: string;
  name: string;
  gatesPassed: number;
  gatesTotal: number;
  approvalStatus: 'approved' | 'pending' | 'rejected' | 'in-review';
  actions: ('study' | 'explore' | 'review')[];
}

/** System status bar data */
export interface SystemStatus {
  overall: 'operational' | 'degraded' | 'outage';
  apiLatencyMs: number;
  natsConnected: boolean;
  runnerSlots: { used: number; total: number };
  storageUsed: { bytes: number; totalBytes: number };
}

/** Aggregate response for the full dashboard */
export interface DashboardData {
  stats: DashboardStats;
  activeRuns: ActiveRun[];
  recentWorkflows: RecentWorkflow[];
  agentActivity: AgentActivityEntry[];
  governance: GovernanceStudy[];
  systemStatus: SystemStatus;
}
