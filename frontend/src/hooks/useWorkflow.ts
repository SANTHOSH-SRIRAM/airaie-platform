import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkflow,
  fetchWorkflowWithVersions,
  saveWorkflow,
  runWorkflow,
  listWorkflows,
  listWorkflowVersions,
  compileWorkflow,
  validateWorkflow,
  publishWorkflowVersion,
  createWorkflow,
  createWorkflowVersion,
  deleteWorkflow,
  listTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
} from '@api/workflows';

export const workflowKeys = {
  all: ['workflows'] as const,
  list: () => [...workflowKeys.all, 'list'] as const,
  detail: (id: string) => [...workflowKeys.all, id] as const,
};

export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.list(),
    queryFn: listWorkflows,
    staleTime: 30_000,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => fetchWorkflow(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/**
 * Returns the raw `{ workflow, versions[] }` envelope for the editor
 * canvas. Cached separately from `useWorkflow` (which produces a
 * simplified `Workflow` shape) so the two consumers don't fight.
 */
export function useWorkflowWithVersions(id: string) {
  return useQuery({
    queryKey: [...workflowKeys.all, id, 'envelope'] as const,
    queryFn: () => fetchWorkflowWithVersions(id),
    enabled: !!id,
    staleTime: 30_000,
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

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

export function useWorkflowVersions(workflowId: string) {
  return useQuery({
    queryKey: [...workflowKeys.all, workflowId, 'versions'] as const,
    queryFn: () => listWorkflowVersions(workflowId),
    enabled: !!workflowId,
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

/**
 * Persist the editor canvas as a new workflow version. Pass the DSL as a
 * stringified JSON blob — the kernel route accepts it in the `dsl_yaml`
 * field (JSON is valid YAML, and the kernel parser reads either).
 */
export function useCreateWorkflowVersion(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dslJson: string) => createWorkflowVersion(workflowId, dslJson),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...workflowKeys.all, workflowId, 'versions'] });
      qc.invalidateQueries({ queryKey: [...workflowKeys.all, workflowId, 'envelope'] });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(workflowId) });
    },
  });
}

// --- Trigger hooks ---

export const triggerKeys = {
  list: (workflowId: string) => [...workflowKeys.all, workflowId, 'triggers'] as const,
};

export function useTriggers(workflowId: string) {
  return useQuery({
    queryKey: triggerKeys.list(workflowId),
    queryFn: () => listTriggers(workflowId),
    staleTime: 30_000,
  });
}

export function useCreateTrigger(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; config: Record<string, unknown>; is_enabled: boolean }) =>
      createTrigger(workflowId, { ...data, type: data.type as 'webhook' | 'schedule' | 'manual' | 'event' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: triggerKeys.list(workflowId) }),
  });
}

export function useUpdateTrigger(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { triggerId: string; data: Record<string, unknown> }) =>
      updateTrigger(workflowId, params.triggerId, params.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: triggerKeys.list(workflowId) }),
  });
}

export function useDeleteTrigger(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (triggerId: string) => deleteTrigger(workflowId, triggerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: triggerKeys.list(workflowId) }),
  });
}
