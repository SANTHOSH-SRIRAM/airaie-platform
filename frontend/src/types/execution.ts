export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'PAUSED';
export type NodeRunStatus = 'QUEUED' | 'RUNNING' | 'RETRYING' | 'BLOCKED' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED' | 'CANCELED';

export interface RunDetail {
  id: string;
  project_id: string;
  run_type: 'tool' | 'workflow' | 'agent';
  workflow_id?: string;
  workflow_version?: number;
  tool_ref?: string;
  agent_id?: string;
  status: RunStatus;
  inputs_json?: Record<string, unknown>;
  outputs_json?: Record<string, unknown>;
  actor: string;
  cost_estimate: number;
  cost_actual: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface NodeRunState {
  node_id: string;
  status: NodeRunStatus;
  outputs?: Record<string, unknown>;
  error?: string;
  started_at?: string;
  completed_at?: string;
  progress?: number;
  attempt?: number;
}

export interface LogEntry {
  timestamp: string;
  node_id?: string;
  node_name?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface ArtifactEntry {
  id: string;
  type: string;
  name?: string;
  size?: number;
  hash?: string;
  node_id?: string;
  created_at: string;
}

export interface EvidenceEntry {
  metric_key: string;
  value: number;
  unit?: string;
  passed?: boolean;
  node_id?: string;
}

// SSE Event discriminated union
export type SSEEvent =
  | { type: 'node_started'; node_id: string; timestamp: string }
  | { type: 'node_progress'; node_id: string; percent: number }
  | { type: 'log_line'; node_id: string; level: string; message: string; timestamp: string }
  | { type: 'node_completed'; node_id: string; status: string; outputs?: Record<string, unknown> }
  | { type: 'artifact_produced'; artifact_id: string; artifact_type: string; node_id?: string }
  | { type: 'evidence_collected'; metric_key: string; value: number; unit?: string }
  | { type: 'gate_evaluated'; gate_id: string; status: string }
  | { type: 'run_completed'; status: string; duration_ms: number; cost_usd?: number }
  | { type: 'done'; status: string };
