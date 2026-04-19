import { useState, useCallback, useRef } from 'react';
import { useRunAgent } from '@hooks/useAgents';
import { apiClient } from '@api/client';
import type { ActionProposal } from '@components/agents/execution/ProposalViewer';
import type { PolicyDecision } from '@components/agents/execution/PolicyDecisionDisplay';

/* ---------- Types ---------- */

export type ExecutionPhase = 'idle' | 'proposing' | 'reviewing' | 'executing' | 'completed' | 'failed';

export interface AgentExecutionState {
  proposal: ActionProposal | null;
  policyDecision: PolicyDecision | null;
  runId: string | null;
  approvalId: string | null;
  phase: ExecutionPhase;
  error: string | null;
  isLoading: boolean;
  propose: (inputs: Record<string, unknown>) => Promise<void>;
  execute: (inputs: Record<string, unknown>) => Promise<void>;
  approve: () => void;
  reject: () => void;
  reset: () => void;
}

/* ---------- Hook ---------- */

export function useAgentExecution(agentId: string, version: number): AgentExecutionState {
  const [proposal, setProposal] = useState<ActionProposal | null>(null);
  const [policyDecision, setPolicyDecision] = useState<PolicyDecision | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [phase, setPhase] = useState<ExecutionPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const runAgentMutation = useRunAgent(agentId, version);
  // Remember the inputs from the last propose() so approve() can re-use them
  // for the live run (otherwise the live run regenerates the proposal with
  // empty inputs and the tool sees no data).
  const lastProposeInputsRef = useRef<Record<string, unknown>>({});

  // Dry run: get proposal without executing
  const propose = useCallback(async (inputs: Record<string, unknown>) => {
    setPhase('proposing');
    setError(null);
    lastProposeInputsRef.current = inputs;
    try {
      const result = await runAgentMutation.mutateAsync({ inputs, dryRun: true });
      const apiProposal = (result as Record<string, unknown>).proposal as ActionProposal | undefined;
      const apiPolicyDecision = (result as Record<string, unknown>).policy_decision as PolicyDecision | undefined;
      setProposal(apiProposal ?? null);
      setPolicyDecision(apiPolicyDecision ?? null);
      setPhase('reviewing');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Failed to create proposal');
      setPhase('failed');
    }
  }, [runAgentMutation]);

  // Execute: run for real; if backend returns approval_id, auto-submit the approval
  const execute = useCallback(async (inputs: Record<string, unknown>) => {
    setPhase('executing');
    setError(null);
    try {
      const result = await runAgentMutation.mutateAsync({ inputs, dryRun: false });
      const raw = result as Record<string, unknown>;
      const resolvedRunId = (raw.run as Record<string, unknown>)?.id as string ?? raw.run_id as string ?? null;
      const resolvedApprovalId = raw.approval_id as string ?? null;
      setRunId(resolvedRunId);
      setApprovalId(resolvedApprovalId);

      if (resolvedApprovalId) {
        // Auto-submit the approval so NATS listener dispatches jobs
        try {
          await apiClient.post(`/v0/approvals/${resolvedApprovalId}/approve`, { comment: 'approved via playground' });
        } catch {
          // Non-fatal: approval may already be processed
        }
      }
      setPhase('completed');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Execution failed');
      setPhase('failed');
    }
  }, [runAgentMutation]);

  // Approve: transition proposal to approved and trigger execution.
  // Re-use the inputs that produced the proposal so the live run sends the
  // same payload to the tool.
  const approve = useCallback(() => {
    if (proposal) {
      setProposal({ ...proposal, status: 'approved' });
      execute(lastProposeInputsRef.current);
    }
  }, [proposal, execute]);

  // Reject: transition proposal to failed
  const reject = useCallback(() => {
    if (proposal) {
      setProposal({ ...proposal, status: 'failed' });
      setPhase('idle');
    }
  }, [proposal]);

  const reset = useCallback(() => {
    setProposal(null);
    setPolicyDecision(null);
    setRunId(null);
    setApprovalId(null);
    setPhase('idle');
    setError(null);
  }, []);

  return {
    proposal,
    policyDecision,
    runId,
    approvalId,
    phase,
    error,
    isLoading: runAgentMutation.isPending,
    propose,
    execute,
    approve,
    reject,
    reset,
  };
}
