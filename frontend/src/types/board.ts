export type BoardMode = 'explore' | 'study' | 'release';
export type BoardStatus = 'DRAFT' | 'ARCHIVED';

export interface Board {
  id: string;
  project_id: string;
  type: string;
  vertical_id?: string;
  name: string;
  description?: string;
  mode: BoardMode;
  parent_board_id?: string;
  status: BoardStatus;
  owner: string;
  metadata?: Record<string, unknown>;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BoardSummary {
  board: Board;
  card_stats: { total: number; completed: number; failed: number; running: number; pending: number };
  gate_stats: { total: number; passed: number; failed: number; pending: number; waived: number };
  readiness: {
    overall: number;
    design: number;
    validation: number;
    compliance: number;
    manufacturing: number;
    approvals: number;
  };
  next_actions: BoardNextAction[];
  child_summaries?: BoardSummary[];
}

export interface BoardNextAction {
  type: string;
  description: string;
  entity_id: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BoardModeConfig {
  mode: BoardMode;
  gate_generation: 'none' | 'repro_peer' | 'full';
  require_input_pinning: boolean;
  require_auto_evidence: boolean;
  generate_repro_pack: boolean;
  require_approvals: boolean;
  auto_approve_floor: number;
}

export interface BoardRecord {
  id: string;
  board_id: string;
  record_type: string;
  title: string;
  content_json?: Record<string, unknown>;
  run_id?: string;
  artifact_id?: string;
  actor: string;
  created_at: string;
}

export interface BoardAttachment {
  id: string;
  board_id: string;
  artifact_id: string;
  record_id?: string;
  kind: 'evidence' | 'input' | 'output' | 'report' | 'supporting';
  label?: string;
  added_by: string;
  created_at: string;
}
