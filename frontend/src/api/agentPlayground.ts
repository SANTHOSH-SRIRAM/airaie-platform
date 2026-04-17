import { apiClient, apiOrMock } from '@api/client';
import type {
  AgentSession,
  BackendDecisionTraceEntry,
  BackendSessionMessage,
  ChatMessage,
  DecisionTraceEntry,
  AgentMetrics,
  PolicyStatus,
} from '@/types/agentPlayground';

// ── Mapping helpers ──────────────────────────────────────────────

/** Map backend history item to frontend ChatMessage */
export function mapSessionMessage(
  msg: BackendSessionMessage,
  index: number,
): ChatMessage {
  return {
    id: `msg_${index}`,
    // Backend uses "assistant"; frontend display uses "agent"
    role: msg.role === 'assistant' ? 'agent' : 'user',
    content: msg.content,
    timestamp: msg.timestamp,
  };
}

/** Map backend DecisionTraceEntry to frontend DecisionTraceEntry */
export function mapTraceEntry(entry: BackendDecisionTraceEntry): DecisionTraceEntry {
  // Map backend event_type to frontend stepType
  const stepTypeMap: Record<string, DecisionTraceEntry['stepType']> = {
    scoring: 'scoring',
    selection: 'selection',
    execution: 'execution',
    replan: 'replan',
    policy: 'result', // backend "policy" maps to frontend "result"
  };
  // Map backend verdict to frontend status
  const statusMap: Record<string, DecisionTraceEntry['status']> = {
    approved: 'completed',
    rejected: 'failed',
    blocked: 'failed',
    needs_approval: 'running',
  };

  const label = entry.tool_ref
    ? `${entry.event_type}: ${entry.tool_ref}`
    : entry.event_type;

  return {
    id: `dt_${entry.step}`,
    label,
    status: statusMap[entry.verdict] ?? 'pending',
    detail: entry.score > 0 ? `Score: ${entry.score.toFixed(2)} — ${entry.verdict}` : entry.verdict,
    timestamp: entry.timestamp,
    stepType: stepTypeMap[entry.event_type] ?? 'result',
  };
}

// ── Derived mock data (shaped to match real API for apiOrMock fallback) ──

const MOCK_SESSION: AgentSession = {
  id: 'ses_mock_001',
  agent_id: 'agent_fea_opt',
  project_id: 'prj_default',
  context: { _decision_trace: [] },
  history: [],
  status: 'active',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
};

const MOCK_METRICS: AgentMetrics = {
  iterations: { current: 0, max: 5 },
  totalCost: 0,
  budgetRemaining: 10.0,
  duration: 0,
  timeout: 600,
};

const MOCK_POLICY: PolicyStatus = {
  autoApproveThreshold: 0.85,
  autoApproveEnabled: true,
};

// ── Session lifecycle ──────────────────────────────────────────────

/**
 * POST /v0/agents/{id}/sessions
 * Creates a new session. Must be called before sendMessage or runInSession.
 */
export async function createSession(agentId: string): Promise<AgentSession> {
  return apiClient.post<AgentSession>(`/v0/agents/${agentId}/sessions`);
}

/**
 * GET /v0/agents/{id}/sessions/{sid}
 * Returns full session including history and context._decision_trace.
 * Use refetchInterval:3000 via useQuery for polling.
 */
export async function getSession(agentId: string, sessionId: string): Promise<AgentSession> {
  return apiOrMock<AgentSession>(
    `/v0/agents/${agentId}/sessions/${sessionId}`,
    { method: 'GET' },
    MOCK_SESSION,
  );
}

/**
 * DELETE /v0/agents/{id}/sessions/{sid}
 * Closes the session. Maps to the frontend "Stop Agent" action.
 */
export async function closeSession(agentId: string, sessionId: string): Promise<void> {
  await apiClient.delete(`/v0/agents/${agentId}/sessions/${sessionId}`);
}

// ── Message sending ────────────────────────────────────────────────

/**
 * POST /v0/agents/{id}/sessions/{sid}/messages
 * Sends a chat message and returns the assistant response.
 * Response is wrapped: { message: BackendSessionMessage }
 */
export async function sendMessage(
  agentId: string,
  sessionId: string,
  content: string,
): Promise<ChatMessage> {
  const resp = await apiClient.post<{ message: BackendSessionMessage }>(
    `/v0/agents/${agentId}/sessions/${sessionId}/messages`,
    { content, context_updates: {} },
  );
  return mapSessionMessage(resp.message, Date.now());
}

// ── Session run (dry-run / live) ───────────────────────────────────

export interface RunInSessionRequest {
  version: number;
  inputs: Record<string, unknown>;
  dry_run: boolean;
}

export interface RunInSessionResponse {
  proposal?: unknown;
  dry_run: boolean;
  session_id: string;
  policy_decision?: unknown;
  run?: unknown;
}

/**
 * POST /v0/agents/{id}/sessions/{sid}/run
 * Runs the agent within the session context.
 */
export async function runInSession(
  agentId: string,
  sessionId: string,
  req: RunInSessionRequest,
): Promise<RunInSessionResponse> {
  return apiClient.post<RunInSessionResponse>(
    `/v0/agents/${agentId}/sessions/${sessionId}/run`,
    req,
  );
}

// ── Approve session action ─────────────────────────────────────────

/**
 * POST /v0/agents/{id}/sessions/{sid}/approve
 * Approves a pending session action.
 */
export async function approveSessionAction(agentId: string, sessionId: string): Promise<void> {
  await apiClient.post(`/v0/agents/${agentId}/sessions/${sessionId}/approve`);
}

// ── Derived data extractors (no separate endpoints needed) ─────────

/** Decode a base64 field or return as-is if already parsed */
function decodeBase64Json<T>(value: string | T): T {
  if (typeof value === 'string') {
    try { return JSON.parse(atob(value)) as T; } catch { return [] as unknown as T; }
  }
  return value;
}

/** Extract ChatMessage[] from session history (backend sends base64-encoded JSON) */
export function extractMessages(session: AgentSession): ChatMessage[] {
  const history = decodeBase64Json<BackendSessionMessage[]>(session.history);
  return (history ?? []).map((msg, i) => mapSessionMessage(msg, i));
}

/** Extract DecisionTraceEntry[] from session context (backend sends base64-encoded JSON) */
export function extractDecisionTrace(session: AgentSession): DecisionTraceEntry[] {
  const ctx = decodeBase64Json<{ _decision_trace?: BackendDecisionTraceEntry[] }>(session.context);
  const trace = ctx?._decision_trace ?? [];
  return trace.map(mapTraceEntry);
}

/** Derive AgentMetrics stub from session (backend has no /metrics endpoint) */
export function deriveMetrics(session: AgentSession): AgentMetrics {
  const history = decodeBase64Json<BackendSessionMessage[]>(session.history);
  const msgCount = history?.length ?? 0;
  return {
    ...MOCK_METRICS,
    iterations: { current: msgCount, max: 20 },
  };
}

/** Policy status stub — derive from session context or return default */
export function derivePolicyStatus(): PolicyStatus {
  return MOCK_POLICY;
}
