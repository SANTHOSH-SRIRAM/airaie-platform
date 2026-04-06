import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTools,
  fetchTool,
  fetchToolVersions,
  createTool,
  createToolVersion,
  publishToolVersion,
  resolveTools,
} from '@api/tools';

export const toolKeys = {
  all: ['tools'] as const,
  list: () => [...toolKeys.all, 'list'] as const,
  detail: (id: string) => [...toolKeys.all, id] as const,
  versions: (toolId: string) => [...toolKeys.all, toolId, 'versions'] as const,
};

/* ---------- Queries ---------- */

export function useToolList() {
  return useQuery({ queryKey: toolKeys.list(), queryFn: fetchTools, staleTime: 60_000 });
}

export function useToolDetail(id: string | null) {
  return useQuery({
    queryKey: toolKeys.detail(id!),
    queryFn: () => fetchTool(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useToolVersions(toolId: string | null) {
  return useQuery({
    queryKey: toolKeys.versions(toolId!),
    queryFn: () => fetchToolVersions(toolId!),
    enabled: !!toolId,
    staleTime: 30_000,
  });
}

/* ---------- Mutations ---------- */

export function useCreateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTool,
    onSuccess: () => qc.invalidateQueries({ queryKey: toolKeys.list() }),
  });
}

export function useCreateToolVersion(toolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { version: string; contract_json: string }) => createToolVersion(toolId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: toolKeys.versions(toolId) }),
  });
}

export function usePublishToolVersion(toolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: string) => publishToolVersion(toolId, version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toolKeys.versions(toolId) });
      qc.invalidateQueries({ queryKey: toolKeys.list() });
    },
  });
}

export function useResolveTools() {
  return useMutation({ mutationFn: resolveTools });
}
