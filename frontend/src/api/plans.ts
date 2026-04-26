import { api, apiClient } from './client';
import type { ExecutionPlan, PreflightResult } from '@/types/plan';

// ---------------------------------------------------------------------------
// Backend contract notes
// ---------------------------------------------------------------------------
//
// Plans are CARD-scoped (not board-scoped). The kernel exposes:
//   POST   /v0/cards/{id}/plan/generate   body: { pipeline_id?, overrides? }
//                                         resp: 201 { plan: ExecutionPlan }
//   GET    /v0/cards/{id}/plan            resp: 200 { plan: ExecutionPlan }
//   PATCH  /v0/cards/{id}/plan            body: { edits: [...] }
//                                         resp: 200 { plan: ExecutionPlan }
//   POST   /v0/cards/{id}/plan/compile    resp: 200 { workflow_yaml, node_count }
//   POST   /v0/cards/{id}/plan/validate   resp: 200|422 PreflightResult
//   POST   /v0/cards/{id}/plan/execute    resp: 202 { run_id, ... }
//
// IMPORTANT: every plan-returning endpoint wraps the plan in `{plan: ...}`.
// Old callers in this file did not unwrap, which produced an object that
// matched `ExecutionPlan` only by structural luck. The wrappers below now
// unwrap correctly so consumers always see a plain `ExecutionPlan`.

// ---------------------------------------------------------------------------
// Generate plan
// ---------------------------------------------------------------------------

export interface GeneratePlanRequest {
  /**
   * Pipeline template to compile against. Optional — when omitted, the
   * kernel picks a default pipeline matching the card's intent_type.
   */
  pipeline_id?: string;
  /**
   * Free-form overrides applied on top of the pipeline's config_template.
   * Honoured per pipeline; unknown keys are ignored by the compiler.
   */
  overrides?: Record<string, unknown>;
}

/**
 * Generate a draft execution plan for a card. The card must have an
 * IntentSpec (set when the card was created) — without one the kernel
 * returns 400 MISSING_INTENT_SPEC.
 *
 * Accepts either a bare cardId (legacy 0-arg form) or `(cardId, body)`.
 */
export async function generatePlan(
  cardId: string,
  body?: GeneratePlanRequest,
): Promise<ExecutionPlan> {
  const res = await apiClient.post<{ plan: ExecutionPlan }>(
    `/v0/cards/${cardId}/plan/generate`,
    body ?? undefined,
  );
  return res.plan;
}

// ---------------------------------------------------------------------------
// Get plan
// ---------------------------------------------------------------------------

export async function getPlan(cardId: string): Promise<ExecutionPlan> {
  const res = await api<{ plan: ExecutionPlan }>(`/v0/cards/${cardId}/plan`, {
    method: 'GET',
  });
  return res.plan;
}

// ---------------------------------------------------------------------------
// Edit / compile / validate / execute
// ---------------------------------------------------------------------------

export async function editPlan(
  cardId: string,
  edits: {
    node_id: string;
    parameters?: Record<string, unknown>;
    tool_version?: string;
  }[],
): Promise<ExecutionPlan> {
  const res = await apiClient.patch<{ plan: ExecutionPlan }>(
    `/v0/cards/${cardId}/plan`,
    { edits },
  );
  return res.plan;
}

export async function validatePlan(cardId: string): Promise<PreflightResult> {
  return api(`/v0/cards/${cardId}/plan/validate`, { method: 'POST' });
}

// Compile / execute responses are NOT wrapped plans — the kernel returns
// distinct envelopes for each. Honest typing here so callers don't crash
// trying to read `plan.id` on a `{ run_id }` payload.

export interface CompilePlanResponse {
  workflow_yaml: string;
  node_count: number;
}

export interface ExecutePlanResponse {
  run_id: string;
  plan_id?: string;
  workflow_id?: string;
  status?: string;
}

export async function compilePlan(cardId: string): Promise<CompilePlanResponse> {
  return apiClient.post(`/v0/cards/${cardId}/plan/compile`);
}

export async function executePlan(cardId: string): Promise<ExecutePlanResponse> {
  return apiClient.post(`/v0/cards/${cardId}/plan/execute`);
}
