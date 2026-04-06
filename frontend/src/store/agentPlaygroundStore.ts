import { create } from 'zustand';
import type { AgentSession, ChatMessage, DecisionTraceEntry, AgentMetrics, PolicyStatus } from '@/types/agentPlayground';

export interface AgentPlaygroundState {
  sessions: AgentSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  decisionTrace: DecisionTraceEntry[];
  metrics: AgentMetrics | null;
  policyStatus: PolicyStatus | null;
  isAgentRunning: boolean;
  isSending: boolean;

  setSessions: (sessions: AgentSession[]) => void;
  setActiveSession: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setDecisionTrace: (trace: DecisionTraceEntry[]) => void;
  setMetrics: (metrics: AgentMetrics) => void;
  setPolicyStatus: (policy: PolicyStatus) => void;
  setAgentRunning: (running: boolean) => void;
  setSending: (sending: boolean) => void;
  clearSession: () => void;
}

export const useAgentPlaygroundStore = create<AgentPlaygroundState>((set) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  decisionTrace: [],
  metrics: null,
  policyStatus: null,
  isAgentRunning: false,
  isSending: false,

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setDecisionTrace: (trace) => set({ decisionTrace: trace }),
  setMetrics: (metrics) => set({ metrics }),
  setPolicyStatus: (policy) => set({ policyStatus: policy }),
  setAgentRunning: (running) => set({ isAgentRunning: running }),
  setSending: (sending) => set({ isSending: sending }),
  clearSession: () => set({ messages: [], decisionTrace: [], metrics: null }),
}));
