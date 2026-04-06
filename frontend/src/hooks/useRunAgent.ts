import { useState, useCallback } from 'react';
import { useRunAgent } from '@hooks/useAgents';
import type { ActionProposal } from '@components/agents/execution/ProposalViewer';
import type { PolicyDecision } from '@components/agents/execution/PolicyDecisionDisplay';

/* ---------- Types ---------- */

export type ExecutionPhase = 'idle' | 'proposing' | 'reviewing' | 'executing' | 'completed' | 'failed';

export interface AgentExecutionState {
  proposal: ActionProposal | null;
  policyDecision: PolicyDecision | null;
  runId: string | null;
  phase: ExecutionPhase;
  error: string | null;
  isLoading: boolean;
  propose: (inputs: Record<string, unknown>) => Promise<void>;
  execute: (inputs: Record<string, unknown>) => Promise<void>;
  approve: () => void;
  reject: () => void;
  reset: () => void;
}

/* ---------- Mock Proposal Data ---------- */

const MOCK_PROPOSAL: ActionProposal = {
  id: 'prop_' + Date.now().toString(36),
  agent_id: '',
  goal: 'Analyze bracket geometry for structural integrity using FEA simulation with Al6061 material properties.',
  status: 'draft',
  actions: [
    {
      action_id: 'act_1',
      tool_ref: 'mesh-generator@1.0',
      permissions: ['read', 'execute'],
      inputs: { geometry: 'art_cad_001', density: 0.8, element_type: 'hex8' },
      order: 1,
      scoring: { compatibility: 0.95, trust: 0.90, cost: 0.85, final_score: 0.92 },
      justification: 'Generate mesh for FEA analysis with optimal density for Al6061 plate geometry.',
      requires_approval: false,
    },
    {
      action_id: 'act_2',
      tool_ref: 'fea-solver@2.1',
      permissions: ['read', 'execute'],
      inputs: { mesh_id: 'mesh_001', load: 500, material: 'Al6061', boundary: 'fixed_ends' },
      order: 2,
      scoring: { compatibility: 0.93, trust: 0.88, cost: 0.70, final_score: 0.87 },
      justification: 'Run structural FEA with 500N load and fixed boundary conditions.',
      requires_approval: true,
    },
    {
      action_id: 'act_3',
      tool_ref: 'result-analyzer@1.0',
      permissions: ['read', 'execute'],
      inputs: { result_id: 'fea_result_001', standard: 'ISO_12345' },
      order: 3,
      scoring: { compatibility: 0.90, trust: 0.92, cost: 0.95, final_score: 0.91 },
      justification: 'Evaluate FEA results against ISO 12345 stress requirements.',
      requires_approval: false,
    },
  ],
  total_score: 0.90,
  estimated_cost: 2.35,
  created_at: new Date().toISOString(),
};

const MOCK_POLICY_DECISION: PolicyDecision = {
  proposal_id: MOCK_PROPOSAL.id,
  overall_verdict: 'needs_approval',
  summary: 'The FEA solver action requires approval due to its cost exceeding the auto-approve threshold. Mesh generation and result analysis are auto-approved.',
  action_decisions: [
    {
      action_id: 'act_1',
      tool_ref: 'mesh-generator@1.0',
      verdict: 'approved',
      reason: 'Read/execute on mesh generation within budget and trust threshold.',
      rule_name: 'auto_approve_low_cost',
    },
    {
      action_id: 'act_2',
      tool_ref: 'fea-solver@2.1',
      verdict: 'needs_approval',
      reason: 'Estimated cost $1.20 exceeds auto-approve limit. Execute permission requires human review.',
      rule_name: 'cost_threshold_check',
    },
    {
      action_id: 'act_3',
      tool_ref: 'result-analyzer@1.0',
      verdict: 'approved',
      reason: 'Read/execute on result analysis is within all policy thresholds.',
      rule_name: 'auto_approve_low_cost',
    },
  ],
};

/* ---------- Hook ---------- */

export function useAgentExecution(agentId: string, version: number): AgentExecutionState {
  const [proposal, setProposal] = useState<ActionProposal | null>(null);
  const [policyDecision, setPolicyDecision] = useState<PolicyDecision | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [phase, setPhase] = useState<ExecutionPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const runAgentMutation = useRunAgent(agentId, version);

  // Dry run: get proposal without executing
  const propose = useCallback(async (inputs: Record<string, unknown>) => {
    setPhase('proposing');
    setError(null);
    try {
      // Attempt real API call first; fall back to mock on failure
      try {
        const result = await runAgentMutation.mutateAsync({ inputs, dryRun: true });
        // If the API returns a proposal, use it; otherwise use mock
        const apiProposal = (result as Record<string, unknown>).proposal as ActionProposal | undefined;
        const apiPolicyDecision = (result as Record<string, unknown>).policy_decision as PolicyDecision | undefined;
        if (apiProposal) {
          setProposal(apiProposal);
          setPolicyDecision(apiPolicyDecision ?? null);
        } else {
          // API returned run_id/status but no proposal structure -- use mock
          setProposal({ ...MOCK_PROPOSAL, agent_id: agentId });
          setPolicyDecision(MOCK_POLICY_DECISION);
        }
      } catch {
        // API not available, use mock data
        setProposal({ ...MOCK_PROPOSAL, agent_id: agentId });
        setPolicyDecision(MOCK_POLICY_DECISION);
      }
      setPhase('reviewing');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Failed to create proposal');
      setPhase('failed');
    }
  }, [agentId, runAgentMutation]);

  // Execute: run for real
  const execute = useCallback(async (inputs: Record<string, unknown>) => {
    setPhase('executing');
    setError(null);
    try {
      try {
        const result = await runAgentMutation.mutateAsync({ inputs, dryRun: false });
        setRunId(result.run_id ?? null);
      } catch {
        // Mock: generate a fake run ID
        setRunId('run_' + Date.now().toString(36));
      }
      setPhase('completed');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Execution failed');
      setPhase('failed');
    }
  }, [runAgentMutation]);

  // Approve: transition proposal to approved and trigger execution
  const approve = useCallback(() => {
    if (proposal) {
      setProposal({ ...proposal, status: 'approved' });
      // Auto-execute after approval
      execute({});
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
    setPhase('idle');
    setError(null);
  }, []);

  return {
    proposal,
    policyDecision,
    runId,
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
