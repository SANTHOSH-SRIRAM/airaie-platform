import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEvalCases, runEvalCases } from '@api/agentEvals';

export function useAgentEvalCases(agentId: string | null) {
  return useQuery({
    queryKey: ['agentEvalCases', agentId],
    queryFn: async () => {
      const res = await listEvalCases(agentId!);
      return res.eval_cases ?? [];
    },
    enabled: !!agentId,
    staleTime: 30_000,
  });
}

export function useRunAgentEvals(agentId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { version?: number; eval_case_ids?: string[]; dry_run?: boolean }) =>
      runEvalCases(agentId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agentRuns'] });
      qc.invalidateQueries({ queryKey: ['agentEvalCases', agentId] });
    },
  });
}
