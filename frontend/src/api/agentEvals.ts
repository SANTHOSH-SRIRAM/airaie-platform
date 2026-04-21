import { apiClient } from '@api/client';

export interface AgentEvalCase {
  id: string;
  agent_id: string;
  name: string;
  inputs: Record<string, unknown>;
  criteria: string;
  created_at: string;
  updated_at: string;
}

export interface EvalRunResult {
  eval_case_id: string;
  status: 'pass' | 'fail' | 'error';
  score: number;
  duration_ms: number;
  output?: string;
  error?: string;
}

export interface EvalRunSummary {
  pass_rate: number;
  avg_score: number;
  avg_cost: number;
  total_duration_ms: number;
  passed: number;
  failed: number;
  total: number;
}

export interface EvalRunResponse {
  eval_run_id: string;
  agent_id: string;
  version: number;
  results: EvalRunResult[];
  summary: EvalRunSummary;
}

export const listEvalCases = (agentId: string) =>
  apiClient.get<{ eval_cases: AgentEvalCase[] }>(`/v0/agents/${agentId}/evals`);

export const createEvalCase = (agentId: string, body: Partial<AgentEvalCase>) =>
  apiClient.post<AgentEvalCase>(`/v0/agents/${agentId}/evals`, body);

export const updateEvalCase = (agentId: string, evalId: string, body: Partial<AgentEvalCase>) =>
  apiClient.put<AgentEvalCase>(`/v0/agents/${agentId}/evals/${evalId}`, body);

export const deleteEvalCase = (agentId: string, evalId: string) =>
  apiClient.delete(`/v0/agents/${agentId}/evals/${evalId}`);

export const runEvalCases = (
  agentId: string,
  body: { version?: number; eval_case_ids?: string[]; dry_run?: boolean },
) => apiClient.post<EvalRunResponse>(`/v0/agents/${agentId}/evals/run`, body);
