import { api, apiClient } from './client';
import type { Gate, GateRequirement, GateApproval } from '@/types/gate';
import type { CardEvidence } from '@/types/card';
import { listCardEvidence as listCardEvidenceCore } from './cards';
import { unwrapList } from '@/utils/apiEnvelope';

// Re-export so existing call sites importing from '@api/gates' keep working
// without each module having to learn the new utils path.
export { unwrapList };

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listGates(boardId: string): Promise<Gate[]> {
  const raw = await api<unknown>(`/v0/gates?board_id=${boardId}`, { method: 'GET' });
  return unwrapList<Gate>(raw, 'gates');
}

/**
 * List gates that apply to a single Card.
 *
 * The kernel does NOT expose a `/v0/cards/{id}/gates` endpoint (the research
 * doc explicitly notes this). We compose it client-side: list the Board's
 * gates, fetch each gate's requirements, keep gates whose requirements
 * reference `cardId` in their `config.card_id` (or `config.cardId`) field.
 *
 * Concurrency: requirements fetches run in parallel via `Promise.all` so a
 * Board with 10 gates resolves in roughly one round-trip rather than ten.
 *
 * Errors propagate. Callers that want graceful degradation should wrap this
 * in `try/catch` and fall back to an empty list (`useCardGates` does this).
 */
export async function listCardGates(boardId: string, cardId: string): Promise<Gate[]> {
  const allGates = await listGates(boardId);
  if (allGates.length === 0) return [];

  const matches = await Promise.all(
    allGates.map(async (gate) => {
      try {
        const reqs = await listGateRequirements(gate.id);
        const refs = reqs.some((r) => {
          const cfg = (r.config ?? {}) as Record<string, unknown>;
          const cid = (cfg.card_id ?? cfg.cardId) as string | undefined;
          return typeof cid === 'string' && cid === cardId;
        });
        return refs ? gate : null;
      } catch {
        return null;
      }
    }),
  );

  return matches.filter((g): g is Gate => g !== null);
}

export async function getGate(id: string): Promise<Gate> {
  return api(`/v0/gates/${id}`, { method: 'GET' });
}

export async function createGate(data: {
  board_id: string;
  name: string;
  gate_type: Gate['gate_type'];
  description?: string;
}): Promise<Gate> {
  return apiClient.post('/v0/gates', data);
}

export async function addGateRequirement(
  gateId: string,
  data: {
    req_type: GateRequirement['req_type'];
    description: string;
    config: Record<string, unknown>;
  },
): Promise<GateRequirement> {
  return apiClient.post(`/v0/gates/${gateId}/requirements`, data);
}

export async function listGateRequirements(gateId: string): Promise<GateRequirement[]> {
  const raw = await api<unknown>(`/v0/gates/${gateId}/requirements`, { method: 'GET' });
  return unwrapList<GateRequirement>(raw, 'requirements');
}

// ---------------------------------------------------------------------------
// D5: Gate transition helpers
//
// Backend reality (confirmed against `internal/handler/gates.go` and
// `internal/service/gate.go`, 2026-04-25):
//   - POST /v0/gates/{id}/evaluate  -> { gate: Gate }
//   - POST /v0/gates/{id}/approve   body { role? }                  -> { gate }
//   - POST /v0/gates/{id}/reject    body { role?, rationale? }      -> { gate }
//   - POST /v0/gates/{id}/waive     body { role?, rationale }       -> { gate }
//     (waive: rationale is required server-side; only FAILED -> WAIVED allowed)
//   - GET  /v0/gates/{id}/approvals -> { approvals: GateApproval[], count }
//
// Verdict / status enum (backend `model.GateStatus`):
//   PENDING | EVALUATING | PASSED | FAILED | WAIVED
// (No `borderline` or `blocked` — the spec's hint was approximate.)
//
// Note: the approve handler currently does not read `rationale` from the
// body; we still send it for forward-compat and the audit trail in the UI.
// The service-layer `ApproveGateRequest` does not accept Rationale today.
// ---------------------------------------------------------------------------

/** D5: body for POST /v0/gates/{id}/approve. */
export interface ApproveGateBody {
  rationale: string;
  role?: string;
}

/** D5: body for POST /v0/gates/{id}/reject. */
export interface RejectGateBody {
  rationale: string;
  role?: string;
}

/** D5: body for POST /v0/gates/{id}/waive. */
export interface WaiveGateBody {
  rationale: string;
  role?: string;
  expires_at?: string;
}

/** Unwrap `{ gate: Gate }` envelope returned by mutation handlers. */
function unwrapGate(raw: unknown): Gate {
  if (raw && typeof raw === 'object' && 'gate' in (raw as Record<string, unknown>)) {
    return (raw as { gate: Gate }).gate;
  }
  return raw as Gate;
}

export async function evaluateGate(id: string): Promise<Gate> {
  const raw = await apiClient.post<{ gate: Gate } | Gate>(`/v0/gates/${id}/evaluate`);
  return unwrapGate(raw);
}

export async function approveGate(id: string, data: ApproveGateBody): Promise<Gate> {
  const raw = await apiClient.post<{ gate: Gate } | Gate>(`/v0/gates/${id}/approve`, data);
  return unwrapGate(raw);
}

export async function rejectGate(id: string, data: RejectGateBody): Promise<Gate> {
  const raw = await apiClient.post<{ gate: Gate } | Gate>(`/v0/gates/${id}/reject`, data);
  return unwrapGate(raw);
}

export async function waiveGate(id: string, data: WaiveGateBody): Promise<Gate> {
  const raw = await apiClient.post<{ gate: Gate } | Gate>(`/v0/gates/${id}/waive`, data);
  return unwrapGate(raw);
}

export async function listGateApprovals(id: string): Promise<GateApproval[]> {
  const raw = await api<unknown>(`/v0/gates/${id}/approvals`, { method: 'GET' });
  return unwrapList<GateApproval>(raw, 'approvals');
}

// ---------------------------------------------------------------------------
// D5: action enablement helper (pure, easily testable)
// ---------------------------------------------------------------------------

export type GateAction = 'evaluate' | 'approve' | 'reject' | 'waive';

/**
 * Returns true if the given action is permitted for a gate in `status`.
 *
 * Rules (mirroring backend transition table in `service/gate.go`):
 *   evaluate : allowed when status is PENDING (only PENDING -> EVALUATING -> PASSED|FAILED)
 *              We surface it as enabled while NOT terminal, but only PENDING actually
 *              passes server-side. UI enforces strict rule for clarity.
 *   approve  : allowed when status is PENDING, EVALUATING, or FAILED
 *              (server forbids on PASSED/WAIVED). Spec hint of `passed|borderline`
 *              didn't match backend reality.
 *   reject   : allowed when status is PENDING, EVALUATING, or FAILED.
 *   waive    : allowed only when status is FAILED.
 */
export function gateActionEnabled(status: Gate['status'], action: GateAction): boolean {
  switch (action) {
    case 'evaluate':
      return status === 'PENDING';
    case 'approve':
      return status === 'PENDING' || status === 'EVALUATING' || status === 'FAILED';
    case 'reject':
      return status === 'PENDING' || status === 'EVALUATING' || status === 'FAILED';
    case 'waive':
      return status === 'FAILED';
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Evidence (D4) — gate-scoped + card-scoped views
//
// Backend reality (confirmed 2026-04-25):
//   - GET  /v0/cards/{id}/evidence            — primary evidence endpoint
//   - POST /v0/cards/{id}/evidence            — add manual evidence
//   - GET  /v0/gates/{id}/requirements        — gate requirements (each may
//                                               reference a card_id in config)
//
// There is NO `/v0/gates/{id}/evidence` route. The `GateEvidence` view is
// composed client-side: fetch the gate's requirements, follow each
// requirement's `card_id` (when present in config), and aggregate the
// matching card evidence rows. listGateEvidence() encapsulates this.
//
// There is also NO re-extract endpoint yet — `reextractEvidence()` is a
// frontend stub that throws so callers can hide the action.
// ---------------------------------------------------------------------------

/**
 * Unified evidence record exposed to the UI. Most fields mirror
 * `CardEvidence` from `@/types/card`, plus an optional `gate_id` for the
 * gate-scoped view (set client-side after joining requirements -> evidence).
 */
export interface GateEvidence {
  id: string;
  gate_id?: string;
  card_id: string;
  metric_name: string;
  metric_value: number | string;
  threshold?: number | string;
  operator?: string;
  unit?: string;
  passed: boolean;
  source_run_id?: string;
  source_artifact_id?: string;
  extracted_at: string;
  rationale?: string;
  evaluation?: 'pass' | 'fail' | 'warning' | 'info';
}

/** Convert a backend `CardEvidence` into the unified `GateEvidence` shape. */
export function toGateEvidence(ev: CardEvidence, gateId?: string): GateEvidence {
  return {
    id: ev.id,
    gate_id: gateId,
    card_id: ev.card_id,
    metric_name: ev.metric_key,
    metric_value: ev.metric_value,
    threshold: ev.threshold,
    operator: ev.operator,
    unit: ev.metric_unit,
    passed: ev.passed ?? ev.evaluation === 'pass',
    source_run_id: ev.run_id,
    source_artifact_id: ev.artifact_id,
    extracted_at: ev.created_at,
    rationale: typeof ev.metadata?.rationale === 'string' ? (ev.metadata.rationale as string) : undefined,
    evaluation: ev.evaluation,
  };
}

/**
 * List evidence rows tied to a gate. Implementation walks the gate's
 * requirements, collects unique `card_id` values from each requirement's
 * `config`, then unions the corresponding card evidence rows.
 *
 * Requirements without a card_id (e.g. `role_signed`) are skipped.
 */
export async function listGateEvidence(gateId: string): Promise<GateEvidence[]> {
  // listGateRequirements now unwraps the `{ requirements: [...] }` envelope
  // itself, so the result is already a plain array.
  const reqList = await listGateRequirements(gateId);

  const cardIds = new Set<string>();
  for (const r of reqList) {
    const cfg = r.config ?? {};
    const cid = (cfg.card_id ?? cfg.cardId) as string | undefined;
    if (typeof cid === 'string' && cid) cardIds.add(cid);
  }

  if (cardIds.size === 0) return [];

  // listCardEvidenceCore (api/cards) now unwraps the `{ evidence: [...] }`
  // envelope itself, returning a plain `CardEvidence[]`.
  const lists = await Promise.all(
    Array.from(cardIds).map(async (cid) => {
      const evList = await listCardEvidenceCore(cid);
      return evList.map((ev) => toGateEvidence(ev, gateId));
    }),
  );

  return lists.flat();
}

/** List evidence rows for a card in the unified shape. */
export async function listCardEvidence(cardId: string): Promise<GateEvidence[]> {
  const evList = await listCardEvidenceCore(cardId);
  return evList.map((ev) => toGateEvidence(ev));
}

/**
 * Manual evidence add. Maps the unified body onto the card-evidence shape.
 *
 * `metric_value` accepts either a number or a numeric string for form ergonomics;
 * a non-numeric string is rejected with a `VALIDATION_ERROR` rather than silently
 * coerced to 0, because the backend `model.CardEvidence.MetricValue` is `float64`.
 */
export async function addCardEvidence(
  cardId: string,
  body: {
    metric_name: string;
    metric_value: number | string;
    rationale?: string;
    source_run_id?: string;
    unit?: string;
    threshold?: number | string;
    operator?: string;
  },
): Promise<GateEvidence> {
  const parsed =
    typeof body.metric_value === 'number'
      ? body.metric_value
      : Number(body.metric_value);
  if (!Number.isFinite(parsed)) {
    throw new Error(
      `metric_value must be numeric (received "${String(body.metric_value)}")`,
    );
  }
  const numericValue = parsed;

  const payload: Record<string, unknown> = {
    metric_key: body.metric_name,
    metric_value: numericValue,
    evaluation: 'info',
  };
  if (body.unit) payload.metric_unit = body.unit;
  if (body.operator) payload.operator = body.operator;
  if (body.threshold !== undefined && body.threshold !== '') {
    const t = typeof body.threshold === 'number' ? body.threshold : Number(body.threshold);
    if (Number.isFinite(t)) payload.threshold = t;
  }
  if (body.source_run_id) payload.run_id = body.source_run_id;
  if (body.rationale) payload.metadata = { rationale: body.rationale };

  const created = await apiClient.post<CardEvidence | { evidence: CardEvidence }>(
    `/v0/cards/${cardId}/evidence`,
    payload,
  );
  const ev = (created as { evidence?: CardEvidence }).evidence ?? (created as CardEvidence);
  return toGateEvidence(ev);
}

/**
 * Stub: backend has no re-extract endpoint as of D4 (2026-04-25). Throws so
 * UI can render but skip the action gracefully.
 *
 * TODO(backend): wire to `POST /v0/cards/{id}/evidence/re-extract` once it lands.
 */
export async function reextractEvidence(_cardId: string): Promise<never> {
  throw new Error('Re-extract endpoint not implemented in backend (D4 stub).');
}

export const REEXTRACT_AVAILABLE = false;
