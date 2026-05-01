import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRunList,
  fetchRunDetail,
  fetchRunLogs,
  cancelRun,
  retryRun,
  resumeRun,
  updateRunViewState,
  fetchRunArtifacts,
} from '@api/runs';
import type { RetryRunResponse, ResumeRunResponse } from '@api/runs';
import type { RunViewState } from '@/types/run';

export const runKeys = {
  all: ['runs'] as const,
  list: (wfId: string) => [...runKeys.all, 'list', wfId] as const,
  detail: (runId: string) => [...runKeys.all, 'detail', runId] as const,
  logs: (runId: string) => [...runKeys.all, 'logs', runId] as const,
};

export function useRunList(workflowId: string) {
  return useQuery({
    queryKey: runKeys.list(workflowId),
    queryFn: () => fetchRunList(workflowId),
    enabled: !!workflowId,
    refetchInterval: 15_000,
    staleTime: 15_000,
  });
}

export function useRunDetail(runId: string | null) {
  return useQuery({ queryKey: runKeys.detail(runId!), queryFn: () => fetchRunDetail(runId!), enabled: !!runId, refetchInterval: 3_000, staleTime: 3_000 });
}

export function useRunLogs(runId: string | null) {
  return useQuery({ queryKey: runKeys.logs(runId!), queryFn: () => fetchRunLogs(runId!), enabled: !!runId, refetchInterval: 2_000, staleTime: 2_000 });
}

export function useRunArtifacts(runId: string | null) {
  return useQuery({
    queryKey: [...runKeys.all, 'artifacts', runId!] as const,
    queryFn: () => fetchRunArtifacts(runId!),
    enabled: !!runId,
    staleTime: 10_000,
  });
}

export function useCancelRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => cancelRun(runId),
    onSuccess: (_, runId) => {
      qc.invalidateQueries({ queryKey: runKeys.detail(runId) });
    },
  });
}

/**
 * Retry a finished/failed run with the prior run's inputs (G.4.12).
 *
 * Hits `POST /v0/runs/{id}/retry`. The kernel returns a NEW run row;
 * callers typically navigate to it. Invalidates the prior run's detail
 * (so the run list refresh picks up the new sibling row) and the all-
 * runs list query.
 */
export function useRetryRun() {
  const qc = useQueryClient();
  return useMutation<RetryRunResponse, Error, string>({
    mutationFn: (runId: string) => retryRun(runId),
    onSuccess: (resp, priorRunId) => {
      qc.invalidateQueries({ queryKey: runKeys.detail(priorRunId) });
      qc.invalidateQueries({ queryKey: runKeys.all });
      if (resp?.run?.id) {
        qc.invalidateQueries({ queryKey: runKeys.detail(resp.run.id) });
      }
    },
  });
}

/**
 * Persist a run's view-state (camera + scalar range) — Plan 09-02 §2F.1.
 *
 * Hits `PATCH /v0/runs/{id}/view-state`. Renderers call this from a 1s
 * debounce after the user stops interacting. Only allowed on terminal
 * runs; in-progress writes return 409 VIEW_STATE_NOT_EDITABLE which
 * surfaces as an inline error here. Invalidates the run detail so the
 * next fetch sees the updated view_state.
 */
export function useUpdateRunViewState() {
  const qc = useQueryClient();
  return useMutation<{ status: string }, Error, { runId: string; viewState: RunViewState }>({
    mutationFn: ({ runId, viewState }) => updateRunViewState(runId, viewState),
    onSuccess: (_, { runId }) => {
      qc.invalidateQueries({ queryKey: runKeys.detail(runId) });
    },
  });
}

/**
 * Resume a paused (gate-waiting) run (G.4.15a).
 *
 * Hits `POST /v0/runs/{id}/resume`. Optional `checkpointId` resumes
 * from a specific checkpoint; omit to resume from the natural pause
 * point. The kernel transitions the run from `waiting` → `running`
 * and returns `{ run_id, status: "resuming", checkpoint_id }`.
 *
 * Mutation variables shape: either a bare runId string or
 * `{ runId, checkpointId }` for the checkpoint case.
 */
export function useResumeRun() {
  const qc = useQueryClient();
  return useMutation<ResumeRunResponse, Error, string | { runId: string; checkpointId?: string }>({
    mutationFn: (vars) => {
      if (typeof vars === 'string') return resumeRun(vars);
      return resumeRun(vars.runId, vars.checkpointId);
    },
    onSuccess: (_, vars) => {
      const runId = typeof vars === 'string' ? vars : vars.runId;
      qc.invalidateQueries({ queryKey: runKeys.detail(runId) });
      qc.invalidateQueries({ queryKey: runKeys.all });
    },
  });
}
