import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchSessions, fetchMessages, fetchDecisionTrace, fetchAgentMetrics, fetchPolicyStatus, sendMessage, stopAgent, approveAll } from '@api/agentPlayground';

export const agentKeys = {
  sessions: (agentId: string) => ['agent', agentId, 'sessions'] as const,
  messages: (sessionId: string) => ['agent', 'messages', sessionId] as const,
  trace: (sessionId: string) => ['agent', 'trace', sessionId] as const,
  metrics: (sessionId: string) => ['agent', 'metrics', sessionId] as const,
  policy: (agentId: string) => ['agent', agentId, 'policy'] as const,
};

export const useSessions = (agentId: string) => useQuery({ queryKey: agentKeys.sessions(agentId), queryFn: () => fetchSessions(agentId), staleTime: 30_000 });
export const useMessages = (sessionId: string | null) => useQuery({ queryKey: agentKeys.messages(sessionId!), queryFn: () => fetchMessages(sessionId!), enabled: !!sessionId, refetchInterval: 3_000 });
export const useDecisionTrace = (sessionId: string | null) => useQuery({ queryKey: agentKeys.trace(sessionId!), queryFn: () => fetchDecisionTrace(sessionId!), enabled: !!sessionId, refetchInterval: 3_000 });
export const useAgentMetrics = (sessionId: string | null) => useQuery({ queryKey: agentKeys.metrics(sessionId!), queryFn: () => fetchAgentMetrics(sessionId!), enabled: !!sessionId, refetchInterval: 5_000 });
export const usePolicyStatus = (agentId: string) => useQuery({ queryKey: agentKeys.policy(agentId), queryFn: () => fetchPolicyStatus(agentId), staleTime: 60_000 });
export const useSendMessage = (sessionId: string) => useMutation({ mutationFn: (content: string) => sendMessage(sessionId, content) });
export const useStopAgent = (sessionId: string) => useMutation({ mutationFn: () => stopAgent(sessionId) });
export const useApproveAll = (sessionId: string) => useMutation({ mutationFn: () => approveAll(sessionId) });
