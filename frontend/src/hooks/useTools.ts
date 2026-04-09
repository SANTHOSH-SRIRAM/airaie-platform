import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTools,
  fetchTool,
  fetchToolVersions,
  createTool,
  createToolVersion,
  publishToolVersion,
  resolveTools,
  validateContract,
  updateTrustLevel,
  fetchToolDetail,
  fetchToolDetailVersions,
  fetchToolRuns,
  createToolRun,
  updateTool,
  deprecateToolVersion,
  resolveToolShelf,
  explainResolution,
} from '@api/tools';
import type { ToolContractFull, TrustLevel, ResolutionStrategy } from '@/types/tool';

export const toolKeys = {
  all: ['tools'] as const,
  list: () => [...toolKeys.all, 'list'] as const,
  detail: (id: string) => [...toolKeys.all, id] as const,
  versions: (toolId: string) => [...toolKeys.all, toolId, 'versions'] as const,
  detailFull: (id: string) => [...toolKeys.all, id, 'detail-full'] as const,
  detailVersions: (id: string) => [...toolKeys.all, id, 'detail-versions'] as const,
  runs: (toolId: string) => [...toolKeys.all, toolId, 'runs'] as const,
  shelfResolve: (intentType: string, strategy?: string) => [...toolKeys.all, 'shelf-resolve', intentType, strategy] as const,
  resolutionExplanation: (resolutionId: string) => [...toolKeys.all, 'resolution-explain', resolutionId] as const,
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

export function useValidateContract() {
  return useMutation({
    mutationFn: (data: { contract: ToolContractFull; checkPublish?: boolean }) =>
      validateContract(data.contract, data.checkPublish),
  });
}

export function useUpdateTrustLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { toolId: string; version: string; trustLevel: TrustLevel }) =>
      updateTrustLevel(data.toolId, data.version, data.trustLevel),
    onSuccess: () => qc.invalidateQueries({ queryKey: toolKeys.list() }),
  });
}

/* ---------- Tool Detail queries (Sprint 1.2) ---------- */

export function useToolDetailFull(id: string | undefined) {
  return useQuery({
    queryKey: toolKeys.detailFull(id!),
    queryFn: () => fetchToolDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useToolDetailVersions(toolId: string | undefined) {
  return useQuery({
    queryKey: toolKeys.detailVersions(toolId!),
    queryFn: () => fetchToolDetailVersions(toolId!),
    enabled: !!toolId,
    staleTime: 30_000,
  });
}

export function useToolRuns(toolId: string | undefined) {
  return useQuery({
    queryKey: toolKeys.runs(toolId!),
    queryFn: () => fetchToolRuns(toolId!),
    enabled: !!toolId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { toolId: string; version: string; inputs: Record<string, unknown> }) =>
      createToolRun(data.toolId, data.version, data.inputs),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: toolKeys.runs(variables.toolId) });
    },
  });
}

// --- Update tool ---
export function useUpdateTool(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; description?: string; owner?: string; domain_tags?: string[] }) =>
      updateTool(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toolKeys.all });
      if (id) qc.invalidateQueries({ queryKey: toolKeys.detail(id) });
    },
  });
}

// --- Deprecate version ---
export function useDeprecateToolVersion(toolId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ version, message }: { version: string; message: string }) =>
      deprecateToolVersion(toolId!, version, message),
    onSuccess: () => {
      if (toolId) {
        qc.invalidateQueries({ queryKey: toolKeys.versions(toolId) });
        qc.invalidateQueries({ queryKey: toolKeys.detailVersions(toolId) });
        qc.invalidateQueries({ queryKey: toolKeys.detail(toolId) });
      }
    },
  });
}

/* ---------- Tool Shelf Resolution (Sprint 1.3) ---------- */

export function useToolShelfResolve(intentType: string, strategy?: ResolutionStrategy) {
  return useQuery({
    queryKey: toolKeys.shelfResolve(intentType, strategy),
    queryFn: () => resolveToolShelf(intentType, strategy),
    enabled: !!intentType.trim(),
    staleTime: 30_000,
  });
}

export function useResolutionExplanation(resolutionId: string) {
  return useQuery({
    queryKey: toolKeys.resolutionExplanation(resolutionId),
    queryFn: () => explainResolution(resolutionId),
    enabled: !!resolutionId,
    staleTime: 60_000,
  });
}
