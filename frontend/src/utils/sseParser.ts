/**
 * SSE Event types matching the AIRAIE kernel event format.
 * The kernel sends events on GET /v0/runs/{runId}/events as:
 *   event: <event_type>
 *   data: <json_string>
 */

export type SSEEventType =
  | 'node_started'
  | 'node_progress'
  | 'log_line'
  | 'node_completed'
  | 'artifact_produced'
  | 'evidence_collected'
  | 'gate_evaluated'
  | 'run_completed'
  | 'done';

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

/**
 * Parse a raw SSE MessageEvent into a typed SSEEvent.
 * The EventSource API gives us the event type separately via event.type
 * and the JSON data via event.data.
 */
export function parseSSEEvent(eventType: string, data: string): SSEEvent | null {
  try {
    const parsed = JSON.parse(data);
    return { type: eventType as SSEEvent['type'], ...parsed } as SSEEvent;
  } catch {
    console.warn(`Failed to parse SSE event: type=${eventType}, data=${data}`);
    return null;
  }
}

/**
 * Check if an SSE event is a terminal event (no more events after this).
 */
export function isTerminalEvent(event: SSEEvent): boolean {
  return event.type === 'done' || event.type === 'run_completed';
}

/**
 * Check if a run status is terminal.
 */
export function isTerminalStatus(status: string): boolean {
  return ['SUCCEEDED', 'FAILED', 'CANCELED'].includes(status);
}
