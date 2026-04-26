import { apiClient, getActiveProjectId } from '@api/client';

/* ---------- Types ----------
 *
 * Matches the kernel `model.AuditEvent` shape from
 * `airaie-kernel/internal/model/model.go` and the response wrapper from
 * `internal/handler/audit_events.go`.
 */

export interface AuditEvent {
  id: string;
  project_id: string;
  event_type: string;        // e.g. "tool.trust_level.updated", "gate.approved"
  run_id?: string | null;
  node_id?: string | null;
  board_id?: string | null;
  gate_id?: string | null;
  actor: string;
  /** Backend serializes as []byte (raw JSON). When tunneled through JSON it
   * arrives base64-encoded. We expose it as `unknown` so callers decide. */
  payload?: string | Record<string, unknown> | null;
  created_at: string;        // RFC3339
}

export interface ListAuditEventsParams {
  event_type?: string;
  actor?: string;
  run_id?: string;
  board_id?: string;
  gate_id?: string;
  /** RFC3339 */
  from?: string;
  /** RFC3339 */
  to?: string;
  limit?: number;
  offset?: number;
}

export interface ListAuditEventsResponse {
  events: AuditEvent[];
  count: number;
  limit: number;
  offset: number;
}

function toQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** GET /v0/audit/events */
export function listAuditEvents(
  params: ListAuditEventsParams = {}
): Promise<ListAuditEventsResponse> {
  return apiClient.get<ListAuditEventsResponse>(`/v0/audit/events${toQuery(params as Record<string, unknown>)}`);
}

/**
 * GET /v0/audit/export?format=csv|json
 *
 * Uses raw fetch (not apiClient) because the response is a CSV/JSON file
 * download, not an envelope. Auth + project headers are propagated manually.
 */
export async function exportAuditEvents(
  params: ListAuditEventsParams & { format: 'csv' | 'json' }
): Promise<Blob> {
  const headers: Record<string, string> = {
    'X-Project-Id': getActiveProjectId(),
  };
  const token = localStorage.getItem('airaie-access-token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/v0/audit/export${toQuery(params as unknown as Record<string, unknown>)}`, {
    headers,
    credentials: 'include', // send HttpOnly auth cookies
  });
  if (!res.ok) {
    throw new Error(`Audit export failed: HTTP ${res.status}`);
  }
  return res.blob();
}

/** Trigger a browser download of a Blob. Helper for export buttons. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Map an event_type to a semantic Badge variant.
 *
 * Pure function — exported for unit tests. Conventions:
 *  - `*.approved` / `*.completed` / `*.published` → success (green)
 *  - `*.rejected` / `*.failed`  / `*.denied`     → danger  (red)
 *  - `*.waived`   / `*.warning`                  → warning (amber)
 *  - everything else                             → info    (blue)
 */
export function eventTypeColor(type: string): 'success' | 'danger' | 'warning' | 'info' {
  const t = type.toLowerCase();
  if (/\.(approved|completed|published|succeeded|started)$/.test(t)) return 'success';
  if (/\.(rejected|failed|denied|errored|cancelled|canceled)$/.test(t)) return 'danger';
  if (/\.(waived|warning|throttled|skipped)$/.test(t)) return 'warning';
  return 'info';
}

/**
 * Decode the raw `payload` field into a plain object.
 *
 * Backend may serialize as a base64-encoded JSON string (Go []byte through
 * encoding/json), an inline object, or a string. Pure + exported for tests.
 */
export function decodeAuditPayload(
  payload: AuditEvent['payload']
): Record<string, unknown> | null {
  if (payload == null) return null;
  if (typeof payload === 'object') return payload;
  if (typeof payload !== 'string') return null;
  // Try direct JSON parse first (server might already have stringified)
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // fall through to base64 attempt
  }
  try {
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // give up
  }
  return null;
}
