// E-Evals: React Query hooks for the eval runner.
//
// The runner is **synchronous** — there is no run-poll endpoint, so we don't
// implement `useEvalRun(...).refetchUntilTerminal`. The kernel also does not
// persist runs server-side, so `useEvalRuns` would have nothing to query;
// instead, the panel keeps recent runs in component state. We expose a
// pure-helper polling decision in `shouldKeepPolling` so a future async
// runner can adopt the existing pattern without restructuring callers.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEvalCase,
  deleteEvalCase,
  getEvalRun,
  listEvalCases,
  listEvalRuns,
  runEvalCases,
  updateEvalCase,
  type AgentEvalCase,
  type CreateEvalCaseInput,
  type EvalRunResponse,
  type PersistedEvalRun,
} from '@api/agentEvals';

const evalCasesKey = (agentId: string | null | undefined) =>
  ['agentEvalCases', agentId] as const;

const evalRunsKey = (agentId: string | null | undefined, limit?: number) =>
  ['agentEvalRuns', agentId, limit ?? 'default'] as const;

const evalRunKey = (agentId: string | null | undefined, runId: string | null | undefined) =>
  ['agentEvalRun', agentId, runId] as const;

export function useAgentEvalCases(agentId: string | null | undefined) {
  return useQuery({
    queryKey: evalCasesKey(agentId),
    queryFn: async () => {
      const res = await listEvalCases(agentId!);
      return res.eval_cases ?? [];
    },
    enabled: !!agentId,
    staleTime: 30_000,
  });
}

export function useCreateEvalCase(agentId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEvalCaseInput): Promise<AgentEvalCase> => {
      const res = await createEvalCase(agentId!, input);
      return res.eval_case;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evalCasesKey(agentId) });
    },
  });
}

export function useUpdateEvalCase(agentId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      evalId,
      patch,
    }: {
      evalId: string;
      patch: Partial<CreateEvalCaseInput>;
    }): Promise<AgentEvalCase> => {
      const res = await updateEvalCase(agentId!, evalId, patch);
      return res.eval_case;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evalCasesKey(agentId) });
    },
  });
}

export function useDeleteEvalCase(agentId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evalId: string) => {
      await deleteEvalCase(agentId!, evalId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evalCasesKey(agentId) });
    },
  });
}

export function useRunAgentEvals(agentId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      version?: number;
      eval_case_ids?: string[];
      dry_run?: boolean;
    }): Promise<EvalRunResponse> => runEvalCases(agentId!, body),
    onSuccess: () => {
      // Run consumed agent runs / sessions; refetch for any panels that show them.
      qc.invalidateQueries({ queryKey: ['agentRuns'] });
      qc.invalidateQueries({ queryKey: evalCasesKey(agentId) });
      // G.3.1: refresh persisted history so the new run shows up in EvalRunsTable.
      qc.invalidateQueries({ queryKey: ['agentEvalRuns', agentId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Persisted runs (G.3.1)
// ---------------------------------------------------------------------------

/**
 * Lists persisted eval runs for an agent. Backed by GET
 * /v0/agents/{id}/eval-runs. Default limit 20 keeps the UI snappy; the
 * backend caps at 100.
 */
export function useEvalRuns(
  agentId: string | null | undefined,
  opts?: { limit?: number },
) {
  const limit = opts?.limit ?? 20;
  return useQuery({
    queryKey: evalRunsKey(agentId, limit),
    queryFn: async (): Promise<PersistedEvalRun[]> => {
      const res = await listEvalRuns(agentId!, { limit });
      return res.eval_runs ?? [];
    },
    enabled: !!agentId,
    staleTime: 15_000,
  });
}

export function useEvalRun(
  agentId: string | null | undefined,
  runId: string | null | undefined,
) {
  return useQuery({
    queryKey: evalRunKey(agentId, runId),
    queryFn: () => getEvalRun(agentId!, runId!),
    enabled: !!agentId && !!runId,
    staleTime: 60_000,
  });
}
