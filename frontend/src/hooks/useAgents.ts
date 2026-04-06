import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAgents,
  getAgent,
  createAgent,
  deleteAgent,
  listAgentVersions,
  getAgentVersion,
  createAgentVersion,
  validateAgentVersion,
  publishAgentVersion,
  runAgent,
} from '@api/agents';
import type { AgentSpec, CreateAgentData } from '@api/agents';
import { listMemories, createMemory, deleteMemory } from '@api/agentMemory';
import type { CreateMemoryData, MemoryType } from '@api/agentMemory';

/* ---------- Query Keys ---------- */

export const agentCrudKeys = {
  all: ['agents'] as const,
  list: () => [...agentCrudKeys.all, 'list'] as const,
  detail: (id: string) => [...agentCrudKeys.all, id] as const,
  versions: (id: string) => [...agentCrudKeys.all, id, 'versions'] as const,
  version: (id: string, v: number) => [...agentCrudKeys.all, id, 'versions', v] as const,
  memories: (id: string) => [...agentCrudKeys.all, id, 'memories'] as const,
};

/* ---------- Agent CRUD Hooks ---------- */

export function useAgentList() {
  return useQuery({
    queryKey: agentCrudKeys.list(),
    queryFn: listAgents,
    staleTime: 30_000,
  });
}

export function useAgent(id: string | null) {
  return useQuery({
    queryKey: agentCrudKeys.detail(id!),
    queryFn: () => getAgent(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAgentData) => createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentCrudKeys.list() });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentCrudKeys.list() });
    },
  });
}

/* ---------- Version Hooks ---------- */

export function useAgentVersions(agentId: string | null) {
  return useQuery({
    queryKey: agentCrudKeys.versions(agentId!),
    queryFn: () => listAgentVersions(agentId!),
    enabled: !!agentId,
    staleTime: 30_000,
  });
}

export function useAgentVersion(agentId: string, version: number) {
  return useQuery({
    queryKey: agentCrudKeys.version(agentId, version),
    queryFn: () => getAgentVersion(agentId, version),
    staleTime: 30_000,
  });
}

export function useCreateAgentVersion(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (specJson: AgentSpec) => createAgentVersion(agentId, specJson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentCrudKeys.versions(agentId) });
    },
  });
}

export function useValidateAgentVersion(agentId: string) {
  return useMutation({
    mutationFn: (version: number) => validateAgentVersion(agentId, version),
  });
}

export function usePublishAgentVersion(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => publishAgentVersion(agentId, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentCrudKeys.versions(agentId) });
    },
  });
}

export function useRunAgent(agentId: string, version: number) {
  return useMutation({
    mutationFn: (params: { inputs: Record<string, unknown>; dryRun?: boolean }) =>
      runAgent(agentId, version, params.inputs, params.dryRun),
  });
}

/* ---------- Memory Hooks ---------- */

export function useAgentMemories(agentId: string | null, type?: MemoryType) {
  return useQuery({
    queryKey: [...agentCrudKeys.memories(agentId!), type] as const,
    queryFn: () => listMemories(agentId!, type),
    enabled: !!agentId,
    staleTime: 30_000,
  });
}

export function useCreateMemory(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMemoryData) => createMemory(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentCrudKeys.memories(agentId) });
    },
  });
}

export function useDeleteMemory(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => deleteMemory(agentId, memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentCrudKeys.memories(agentId) });
    },
  });
}
