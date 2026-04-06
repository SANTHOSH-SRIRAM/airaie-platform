export interface AgentSession {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  messageCount: number;
  toolCallCount: number;
  status: 'active' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
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
