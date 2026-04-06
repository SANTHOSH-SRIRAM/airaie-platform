import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkflow,
  saveWorkflow,
  runWorkflow,
  listWorkflowVersions,
  compileWorkflow,
  validateWorkflow,
  publishWorkflowVersion,
  createWorkflow,
} from '@api/workflows';

export const workflowKeys = {
  all: ['workflows'] as const,
  detail: (id: string) => [...workflowKeys.all, id] as const,
};

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => fetchWorkflow(id),
    staleTime: 60_000,
  });
}

export function useSaveWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof saveWorkflow>[1]) => saveWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

export function useRunWorkflow(id: string) {
  return useMutation({
    mutationFn: () => runWorkflow(id),
  });
}

export function useWorkflowVersions(workflowId: string) {
  return useQuery({
    queryKey: [...workflowKeys.all, workflowId, 'versions'] as const,
    queryFn: () => listWorkflowVersions(workflowId),
    staleTime: 30_000,
  });
}

export function useCompileWorkflow() {
  return useMutation({
    mutationFn: (params: { workflowId: string; version: number }) =>
      compileWorkflow(params.workflowId, params.version),
  });
}

export function useValidateWorkflow() {
  return useMutation({
    mutationFn: (dslYaml: string) => validateWorkflow(dslYaml),
  });
}

export function usePublishWorkflowVersion(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => publishWorkflowVersion(workflowId, version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...workflowKeys.all, workflowId, 'versions'] });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(workflowId) });
    },
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}
