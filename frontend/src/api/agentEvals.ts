// E-Evals: Eval runner API.
//
// Backend routes (kernel `internal/handler/agent_evals.go` +
// `agent_eval_runner.go`):
//
//   GET    /v0/agents/{id}/evals                — list cases
//   POST   /v0/agents/{id}/evals                — create case
//   GET    /v0/agents/{id}/evals/{evalId}       — get case
//   PUT    /v0/agents/{id}/evals/{evalId}       — update case
//   DELETE /v0/agents/{id}/evals/{evalId}       — delete case
//   POST   /v0/agents/{id}/evals/run            — run cases (synchronous)
//
// The runner is **synchronous** — POST returns the entire `EvalRunResponse`
// once every case has finished. The kernel does not currently persist eval
// runs, so there is no list-runs / get-run-by-id endpoint. We therefore keep
// recent runs in client memory only.
import { apiClient } from '@api/client';

// ---------------------------------------------------------------------------
// Eval Case
// ---------------------------------------------------------------------------

/**
 * Acceptance criteria the runner currently understands. The handler's
 * `evaluateCriteria` only inspects these four keys; everything else is
 * ignored. Any may be omitted.
 */
export interface EvalCriteria {
  min_score?: number;
  max_cost?: number;
  max_actions?: number;
  required_tools?: string[];
  // Tolerate forward-compat keys without losing them on round-trip.
  [k: string]: unknown;
}

export interface AgentEvalCase {
  id: string;
  agent_id: string;
  project_id?: string;
  name: string;
  inputs: Record<string, unknown>;
  criteria: EvalCriteria;
  created_at: string;
  updated_at: string;
}

export interface CreateEvalCaseInput {
  name: string;
  inputs: Record<string, unknown>;
  criteria?: EvalCriteria;
}

// ---------------------------------------------------------------------------
// Eval Run (synchronous response)
// ---------------------------------------------------------------------------

export type EvalCaseStatus = 'passed' | 'failed' | 'error' | 'pass' | 'fail';

export interface EvalCriterionResult {
  expected: unknown;
  actual: unknown;
  passed: boolean;
}

export interface EvalRunResult {
  eval_case_id: string;
  eval_case_name: string;
  status: EvalCaseStatus;
  score: number;
  cost: number;
  action_count: number;
  /** Optional: error-status results may omit it. Always render via `?? []`. */
  tools_used?: string[];
  criteria_results?: Record<string, EvalCriterionResult>;
  duration_ms: number;
  proposal?: unknown;
  error?: string;
}

export interface EvalRunSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  pass_rate: number;       // 0..1 (NOT 0..100)
  avg_score: number;
  avg_cost: number;
  total_duration_ms: number;
}

export interface EvalRunResponse {
  eval_run_id: string;
  agent_id: string;
  version: number;
  results: EvalRunResult[];
  summary: EvalRunSummary;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

export const listEvalCases = (agentId: string) =>
  apiClient.get<{ eval_cases: AgentEvalCase[] }>(`/v0/agents/${agentId}/evals`);

export const getEvalCase = (agentId: string, evalId: string) =>
  apiClient.get<{ eval_case: AgentEvalCase }>(`/v0/agents/${agentId}/evals/${evalId}`);

export const createEvalCase = (agentId: string, body: CreateEvalCaseInput) =>
  apiClient.post<{ eval_case: AgentEvalCase }>(
    `/v0/agents/${agentId}/evals`,
    body,
  );

export const updateEvalCase = (
  agentId: string,
  evalId: string,
  body: Partial<CreateEvalCaseInput>,
) =>
  apiClient.put<{ eval_case: AgentEvalCase }>(
    `/v0/agents/${agentId}/evals/${evalId}`,
    body,
  );

export const deleteEvalCase = (agentId: string, evalId: string) =>
  apiClient.delete(`/v0/agents/${agentId}/evals/${evalId}`);

export const runEvalCases = (
  agentId: string,
  body: { version?: number; eval_case_ids?: string[]; dry_run?: boolean },
) => apiClient.post<EvalRunResponse>(`/v0/agents/${agentId}/evals/run`, body);

// ---------------------------------------------------------------------------
// Persisted Eval Runs (G.3.1)
// ---------------------------------------------------------------------------
//
// Backend persists every completed run; these helpers query that history.
// Wire shape mirrors `model.AgentEvalRun` — `summary` and `results` are
// emitted as raw JSON (json.RawMessage server-side) so they round-trip
// without re-encoding.

export interface PersistedEvalRun {
  id: string;
  agent_id: string;
  project_id?: string;
  agent_version?: number;
  started_at: string;
  completed_at?: string;
  status: 'completed' | 'failed';
  summary: EvalRunSummary;
  results: EvalRunResult[];
  actor?: string;
}

export interface ListEvalRunsResponse {
  eval_runs: PersistedEvalRun[];
  total: number;
  limit: number;
  offset: number;
}

export const listEvalRuns = (
  agentId: string,
  opts?: { limit?: number; offset?: number },
) => {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.offset != null) params.set('offset', String(opts.offset));
  const qs = params.toString();
  return apiClient.get<ListEvalRunsResponse>(
    `/v0/agents/${agentId}/eval-runs${qs ? `?${qs}` : ''}`,
  );
};

export const getEvalRun = (agentId: string, runId: string) =>
  apiClient
    .get<{ eval_run: PersistedEvalRun }>(`/v0/agents/${agentId}/eval-runs/${runId}`)
    .then((r) => r.eval_run);
