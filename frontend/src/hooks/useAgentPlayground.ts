import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSession,
  getSession,
  closeSession,
  sendMessage,
  approveSessionAction,
  extractMessages,
  extractDecisionTrace,
  deriveMetrics,
  derivePolicyStatus,
} from '@api/agentPlayground';

export const agentSessionKeys = {
  session: (agentId: string, sessionId: string) =>
    ['agent', agentId, 'session', sessionId] as const,
};

/**
 * Creates a new session for an agent.
 * Call mutateAsync() on mount in AgentPlaygroundPage, store the returned session.id.
 */
export function useCreateSession(agentId: string) {
  return useMutation({
    mutationFn: () => createSession(agentId),
  });
}

/**
 * Polls GET /v0/agents/{id}/sessions/{sid} every 3 seconds.
 * Returns the raw session object. Use extractMessages / extractDecisionTrace to derive display data.
 */
export function useSession(agentId: string, sessionId: string | null) {
  return useQuery({
    queryKey: agentSessionKeys.session(agentId, sessionId ?? ''),
    queryFn: () => getSession(agentId, sessionId!),
    enabled: !!sessionId,
    refetchInterval: 3_000,
  });
}

/**
 * Sends a chat message to the active session.
 * After success, invalidates the session query so ChatInterface refreshes.
 */
export function useSendMessage(agentId: string, sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => sendMessage(agentId, sessionId!, content),
    onSuccess: () => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: agentSessionKeys.session(agentId, sessionId),
        });
      }
    },
  });
}

/**
 * Closes the session. Maps to Stop Agent button.
 * NOTE: Do NOT pass `enabled` to useMutation — not valid in react-query v5.
 * Guard at call site: only call .mutate() when sessionId is truthy.
 */
export function useCloseSession(agentId: string, sessionId: string | null) {
  return useMutation({
    mutationFn: () => closeSession(agentId, sessionId!),
  });
}

/**
 * Approves a pending session action.
 */
export function useApproveAction(agentId: string, sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveSessionAction(agentId, sessionId!),
    onSuccess: () => {
      if (sessionId) {
        queryClient.invalidateQueries({
          queryKey: agentSessionKeys.session(agentId, sessionId),
        });
      }
    },
  });
}

// ── Derived data hooks (wrap useSession + extract) ─────────────────

/**
 * Returns parsed ChatMessage[] from session history.
 */
export function useSessionMessages(agentId: string, sessionId: string | null) {
  const { data: session, ...rest } = useSession(agentId, sessionId);
  return { data: session ? extractMessages(session) : [], ...rest };
}

/**
 * Returns parsed DecisionTraceEntry[] from session context._decision_trace.
 */
export function useSessionTrace(agentId: string, sessionId: string | null) {
  const { data: session, ...rest } = useSession(agentId, sessionId);
  return { data: session ? extractDecisionTrace(session) : [], ...rest };
}

/**
 * Returns derived AgentMetrics from session history length.
 */
export function useSessionMetrics(agentId: string, sessionId: string | null) {
  const { data: session, ...rest } = useSession(agentId, sessionId);
  return { data: session ? deriveMetrics(session) : null, ...rest };
}

/**
 * Returns policy status (currently static from spec, no backend endpoint).
 */
export function usePolicyStatus(_agentId: string) {
  return { data: derivePolicyStatus() };
}
