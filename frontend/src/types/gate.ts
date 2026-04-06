export type GateStatus = 'PENDING' | 'EVALUATING' | 'PASSED' | 'FAILED' | 'WAIVED';
export type GateType = 'evidence' | 'review' | 'compliance';
export type ReqType = 'run_succeeded' | 'artifact_exists' | 'role_signed' | 'metric_threshold';

export interface Gate {
  id: string;
  board_id: string;
  project_id: string;
  name: string;
  gate_type: GateType;
  status: GateStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  evaluated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GateRequirement {
  id: string;
  gate_id: string;
  req_type: ReqType;
  description: string;
  config: Record<string, unknown>;
  satisfied: boolean;
  evidence?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GateApproval {
  id: string;
  gate_id: string;
  role?: string;
  action: 'approve' | 'reject' | 'waive';
  approved_by?: string;
  rationale?: string;
  approved_at?: string;
  created_at: string;
}
