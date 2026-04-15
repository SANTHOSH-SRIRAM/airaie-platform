// Matches backend model.Session exactly (snake_case)
export interface AgentSession {
  id: string;
  agent_id: string;
  project_id: string;
  context: {
    _decision_trace?: BackendDecisionTraceEntry[];
    [key: string]: unknown;
  };
  history: BackendSessionMessage[];
  status: 'active' | 'closed' | 'expired';
  created_at: string;
  expires_at: string;
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
}

export interface DecisionTraceEntry {
  id: string;
  label: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  detail?: string;
  timestamp?: string;
  stepType?: 'scoring' | 'selection' | 'execution' | 'result' | 'replan';
}

export interface AgentMetrics {
  iterations: { current: number; max: number };
  totalCost: number;
  budgetRemaining: number;
  duration: number;
  timeout: number;
}

export interface PolicyStatus {
  autoApproveThreshold: number;
  autoApproveEnabled: boolean;
}
