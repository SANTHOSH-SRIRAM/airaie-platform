import { create } from 'zustand';

export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'PAUSED' | 'IDLE';
export type NodeRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'canceled' | 'retrying';

export interface NodeState {
  status: NodeRunStatus;
  outputs?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  attempt?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  nodeId?: string;
  nodeName?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface ArtifactEntry {
  id: string;
  type: string;
  name?: string;
  size?: number;
  hash?: string;
  nodeId?: string;
  createdAt: string;
}

export interface EvidenceEntry {
  metricKey: string;
  value: number;
  unit?: string;
  passed?: boolean;
  nodeId?: string;
}

export interface ExecutionState {
  // State
  activeRunId: string | null;
  runStatus: RunStatus;
  nodeStates: Map<string, NodeState>;
  logs: LogEntry[];
  artifacts: ArtifactEntry[];
  evidence: EvidenceEntry[];
  sseConnected: boolean;
  startedAt: string | null;
  completedAt: string | null;
  totalCost: number;
  durationMs: number;

  // Actions
  startRun: (runId: string) => void;
  setSSEConnected: (connected: boolean) => void;
  setNodeStatus: (nodeId: string, status: NodeRunStatus) => void;
  setNodeProgress: (nodeId: string, percent: number) => void;
  setNodeOutput: (nodeId: string, outputs: Record<string, unknown>) => void;
  setNodeError: (nodeId: string, error: string) => void;
  addLog: (entry: Omit<LogEntry, 'id'>) => void;
  addArtifact: (entry: ArtifactEntry) => void;
  addEvidence: (entry: EvidenceEntry) => void;
  setRunCompleted: (status: RunStatus, durationMs: number, costUsd?: number) => void;
  reset: () => void;

  // SSE event dispatcher — call this from useRunSSE onEvent callback
  handleSSEEvent: (event: { type: string; [key: string]: unknown }) => void;
}

const INITIAL_STATE = {
  activeRunId: null,
  runStatus: 'IDLE' as RunStatus,
  nodeStates: new Map<string, NodeState>(),
  logs: [] as LogEntry[],
  artifacts: [] as ArtifactEntry[],
  evidence: [] as EvidenceEntry[],
  sseConnected: false,
  startedAt: null as string | null,
  completedAt: null as string | null,
  totalCost: 0,
  durationMs: 0,
};

let logCounter = 0;

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  ...INITIAL_STATE,

  startRun: (runId) =>
    set({
      ...INITIAL_STATE,
      activeRunId: runId,
      runStatus: 'PENDING',
      nodeStates: new Map(),
      logs: [],
      artifacts: [],
      evidence: [],
      startedAt: new Date().toISOString(),
    }),

  setSSEConnected: (connected) => set({ sseConnected: connected }),

  setNodeStatus: (nodeId, status) =>
    set((s) => {
      const newMap = new Map(s.nodeStates);
      const existing = newMap.get(nodeId) ?? { status: 'queued' as NodeRunStatus };
      newMap.set(nodeId, {
        ...existing,
        status,
        startedAt: status === 'running' ? new Date().toISOString() : existing.startedAt,
        completedAt: ['succeeded', 'failed', 'skipped', 'canceled'].includes(status)
          ? new Date().toISOString()
          : existing.completedAt,
      });
      // If any node is running, the run is running
      const runStatus = status === 'running' && s.runStatus === 'PENDING' ? 'RUNNING' : s.runStatus;
      return { nodeStates: newMap, runStatus };
    }),

  setNodeProgress: (nodeId, percent) =>
    set((s) => {
      const newMap = new Map(s.nodeStates);
      const existing = newMap.get(nodeId) ?? { status: 'running' as NodeRunStatus };
      newMap.set(nodeId, { ...existing, progress: percent });
      return { nodeStates: newMap };
    }),

  setNodeOutput: (nodeId, outputs) =>
    set((s) => {
      const newMap = new Map(s.nodeStates);
      const existing = newMap.get(nodeId) ?? { status: 'succeeded' as NodeRunStatus };
      newMap.set(nodeId, { ...existing, outputs });
      return { nodeStates: newMap };
    }),

  setNodeError: (nodeId, error) =>
    set((s) => {
      const newMap = new Map(s.nodeStates);
      const existing = newMap.get(nodeId) ?? { status: 'failed' as NodeRunStatus };
      newMap.set(nodeId, { ...existing, error, status: 'failed' });
      return { nodeStates: newMap };
    }),

  addLog: (entry) =>
    set((s) => ({
      logs: [...s.logs, { ...entry, id: `log_${++logCounter}` }],
    })),

  addArtifact: (entry) =>
    set((s) => ({
      artifacts: [...s.artifacts, entry],
    })),

  addEvidence: (entry) =>
    set((s) => ({
      evidence: [...s.evidence, entry],
    })),

  setRunCompleted: (status, durationMs, costUsd) =>
    set({
      runStatus: status,
      completedAt: new Date().toISOString(),
      durationMs,
      totalCost: costUsd ?? 0,
    }),

  reset: () => set({ ...INITIAL_STATE, nodeStates: new Map(), logs: [], artifacts: [], evidence: [] }),

  handleSSEEvent: (event) => {
    const store = get();
    switch (event.type) {
      case 'node_started':
        store.setNodeStatus(event.node_id as string, 'running');
        store.addLog({
          timestamp: (event.timestamp as string) ?? new Date().toISOString(),
          nodeId: event.node_id as string,
          level: 'info',
          message: `Node started`,
        });
        break;
      case 'node_progress':
        store.setNodeProgress(event.node_id as string, event.percent as number);
        break;
      case 'log_line':
        store.addLog({
          timestamp: (event.timestamp as string) ?? new Date().toISOString(),
          nodeId: event.node_id as string,
          level: (event.level as 'info' | 'warn' | 'error' | 'debug') ?? 'info',
          message: event.message as string,
        });
        break;
      case 'node_completed':
        store.setNodeStatus(event.node_id as string, (event.status as string) === 'SUCCEEDED' ? 'succeeded' : 'failed');
        if (event.outputs) {
          store.setNodeOutput(event.node_id as string, event.outputs as Record<string, unknown>);
        }
        break;
      case 'artifact_produced':
        store.addArtifact({
          id: event.artifact_id as string,
          type: event.artifact_type as string,
          nodeId: event.node_id as string | undefined,
          createdAt: new Date().toISOString(),
        });
        break;
      case 'evidence_collected':
        store.addEvidence({
          metricKey: event.metric_key as string,
          value: event.value as number,
          unit: event.unit as string | undefined,
        });
        break;
      case 'gate_evaluated':
        store.addLog({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Gate ${event.gate_id} evaluated: ${event.status}`,
        });
        break;
      case 'run_completed':
        store.setRunCompleted(
          (event.status as string) === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED',
          event.duration_ms as number,
          event.cost_usd as number | undefined
        );
        break;
      case 'done':
        // Terminal — SSE will auto-close
        break;
    }
  },
}));
