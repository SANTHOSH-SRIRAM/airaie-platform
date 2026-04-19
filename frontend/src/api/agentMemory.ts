import { apiClient } from '@api/client';
import type { AgentMemory } from '@api/agents';

/* ---------- Types ---------- */

export type MemoryType = 'fact' | 'preference' | 'lesson' | 'error_pattern';

export interface CreateMemoryData {
  memory_type: MemoryType;
  content: string;
  tags: string[];
  relevance: number;
  source_run_id?: string;
}

/* ---------- Read Endpoints ---------- */

export function listMemories(agentId: string, type?: MemoryType): Promise<AgentMemory[]> {
  const params = type ? `?type=${type}` : '';
  return apiClient
    .get<AgentMemory[] | { memories: AgentMemory[] | null }>(`/v0/agents/${agentId}/memories${params}`)
    .then((res) => {
      if (Array.isArray(res)) return res;
      return res.memories ?? [];
    });
}

/* ---------- Mutation Endpoints ---------- */

export async function createMemory(agentId: string, data: CreateMemoryData): Promise<AgentMemory> {
  return apiClient.post(`/v0/agents/${agentId}/memories`, data);
}

export async function deleteMemory(agentId: string, memoryId: string): Promise<void> {
  return apiClient.delete(`/v0/agents/${agentId}/memories/${memoryId}`);
}
