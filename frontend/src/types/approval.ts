export type ApprovalType = 'gate' | 'agent_escalation';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  approval_type: ApprovalType;
  resource_id: string;
  resource_name: string;
  board_id: string;
  board_name: string;
  status: ApprovalStatus;
  created_at: string;
  updated_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  reject_reason?: string;
  details: Record<string, unknown>;
}

export interface ApprovalsResponse {
  data: Approval[];
  total: number;
}

export interface ApprovalGateDetails {
  gate_type: string;
  requirements: {
    id: string;
    description: string;
    satisfied: boolean;
    evidence?: Record<string, unknown>;
  }[];
}

export interface ApprovalAgentDetails {
  agent_name: string;
  proposal_summary: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
}
