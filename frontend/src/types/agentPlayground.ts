// Matches backend model.Session exactly (snake_case)
export interface AgentSession {
  id: string;
  agent_id: string;
  project_id: string;
  user_id?: string;   // owner; empty/absent for legacy pre-migration-024 sessions
  context: string | {
    _decision_trace?: BackendDecisionTraceEntry[];
    [key: string]: unknown;
  };
  history: string | BackendSessionMessage[];   // backend sends base64-encoded JSON
  status: 'active' | 'closed' | 'expired';
  created_at: string;
  expires_at: string;
  /** Server-derived metrics, returned only by GET /v0/agents/{id}/sessions/{sid}.
   *  Optional fields are omitted (not zeroed) when the backend can't compute them
   *  — that's what lets LiveMetrics render "—" instead of "$0.00". */
  metrics?: BackendSessionMetrics;
}

export interface BackendSessionMetrics {
  iterations: number;
  total_cost_usd?: number;
  budget_remaining_usd?: number;
  duration_seconds?: number;
  timeout_seconds?: number;
}

// Raw backend shape from context._decision_trace
export interface BackendDecisionTraceEntry {
  step: number;
  event_type: 'scoring' | 'selection' | 'execution' | 'replan' | 'policy';
  tool_ref: string;
  score: number;
  verdict: string;
  details: Record<string, unknown>;
  timestamp: string;
}

// Raw backend shape from history[]
export interface BackendSessionMessage {
  role: 'user' | 'assistant';
  content: string;
  context_updates: Record<string, unknown>;
  timestamp: string;
  run_id?: string;       // populated when the assistant invoked a tool
  approval_id?: string;
}

export interface ToolCallProposal {
  toolName: string;
  toolVersion: string;
  confidence: number;
  reasoning: string;
  inputs: Record<string, unknown>;
  estimatedCost: number;
  estimatedDuration: string;
  alternatives: { name: string; score: number; reason: string }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  toolCallProposal?: ToolCallProposal;
  /** Set when the assistant invoked a tool — drives inline tool-call card. */
  runId?: string;
  /** Set when the dispatched run requires manual approval. Drives inline
   *  Approve / Reject buttons in InlineToolCallCard. */
  approvalId?: string;
}

export interface DecisionTraceEntry {
  id: string;
  label: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  detail?: string;
  timestamp?: string;
  stepType?: 'scoring' | 'selection' | 'execution' | 'result' | 'replan';
}

/** Frontend-shaped metrics: undefined = "absent" (renders as —),
 *  number = real value (including legitimate zeros). */
export interface AgentMetrics {
  iterations: { current: number | undefined; max: number | null };
  totalCost: number | undefined;
  budgetRemaining: number | undefined;
  duration: number | undefined;
  timeout: number | undefined;
}

export interface PolicyStatus {
  autoApproveThreshold: number;
  autoApproveEnabled: boolean;
}
