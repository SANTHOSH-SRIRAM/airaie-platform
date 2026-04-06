export type PlanStatus = 'draft' | 'validated' | 'executing' | 'completed' | 'failed';
export type PlanNodeRole = 'validate_input' | 'preprocess' | 'solve' | 'postprocess' | 'report' | 'evidence' | 'approval';

export interface ExecutionPlan {
  id: string;
  card_id: string;
  pipeline_id: string;
  nodes: PlanNode[];
  edges: PlanEdge[];
  bindings: Record<string, string>;
  expected_outputs: string[];
  cost_estimate: number;
  time_estimate: string;
  status: PlanStatus;
  preflight_result?: PreflightResult;
  workflow_id?: string;
  run_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PlanNode {
  node_id: string;
  tool_id: string;
  tool_version: string;
  role: PlanNodeRole;
  parameters: Record<string, unknown>;
  is_editable: boolean;
  is_required: boolean;
  status?: string;
}

export interface PlanEdge {
  from_node_id: string;
  to_node_id: string;
}

export interface PreflightResult {
  passed: boolean;
  blockers: PreflightIssue[];
  suggestions: PreflightIssue[];
}

export interface PreflightIssue {
  node_id?: string;
  check: string;
  message: string;
  severity: 'blocker' | 'suggestion';
}
