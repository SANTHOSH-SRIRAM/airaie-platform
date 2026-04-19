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
  /** Last user-typed prompt waiting to be consumed by the playground page to trigger a tool run. */
  pendingUserPrompt: { text: string; nonce: number } | null;

  setSessions: (sessions: AgentSession[]) => void;
  setActiveSession: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setDecisionTrace: (trace: DecisionTraceEntry[]) => void;
  setMetrics: (metrics: AgentMetrics) => void;
  setPolicyStatus: (policy: PolicyStatus) => void;
  setAgentRunning: (running: boolean) => void;
  setSending: (sending: boolean) => void;
  submitUserPrompt: (text: string) => void;
  clearPendingUserPrompt: () => void;
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
  pendingUserPrompt: null,

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setDecisionTrace: (trace) => set({ decisionTrace: trace }),
  setMetrics: (metrics) => set({ metrics }),
  setPolicyStatus: (policy) => set({ policyStatus: policy }),
  setAgentRunning: (running) => set({ isAgentRunning: running }),
  setSending: (sending) => set({ isSending: sending }),
  // nonce makes each submission unique even if the same text is sent twice
  submitUserPrompt: (text) => set({ pendingUserPrompt: { text, nonce: Date.now() } }),
  clearPendingUserPrompt: () => set({ pendingUserPrompt: null }),
  clearSession: () => set({ messages: [], decisionTrace: [], metrics: null, pendingUserPrompt: null }),
}));
