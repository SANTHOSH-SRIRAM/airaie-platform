import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchRunList, fetchRunDetail, fetchRunLogs, cancelRun, retryRun } from '@api/runs';

export const runKeys = {
  all: ['runs'] as const,
  list: (wfId: string) => [...runKeys.all, 'list', wfId] as const,
  detail: (runId: string) => [...runKeys.all, 'detail', runId] as const,
  logs: (runId: string) => [...runKeys.all, 'logs', runId] as const,
};

export function useRunList(workflowId: string) {
  return useQuery({ queryKey: runKeys.list(workflowId), queryFn: () => fetchRunList(workflowId), refetchInterval: 15_000, staleTime: 15_000 });
}

export function useRunDetail(runId: string | null) {
  return useQuery({ queryKey: runKeys.detail(runId!), queryFn: () => fetchRunDetail(runId!), enabled: !!runId, refetchInterval: 3_000, staleTime: 3_000 });
}

export function useRunLogs(runId: string | null) {
  return useQuery({ queryKey: runKeys.logs(runId!), queryFn: () => fetchRunLogs(runId!), enabled: !!runId, refetchInterval: 2_000, staleTime: 2_000 });
}

export function useCancelRun() {
  return useMutation({ mutationFn: (runId: string) => cancelRun(runId) });
}

export function useRetryRun() {
  return useMutation({ mutationFn: (runId: string) => retryRun(runId) });
}
