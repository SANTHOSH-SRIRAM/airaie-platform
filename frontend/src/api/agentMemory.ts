import { apiOrMock, apiClient } from '@api/client';
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

/* ---------- Mock Data ---------- */

const MOCK_MEMORIES: AgentMemory[] = [
  {
    id: 'mem_001',
    agent_id: 'agent_fea_opt',
    project_id: 'prj_default',
    memory_type: 'fact',
    content: 'Aluminum 6061-T6 yield strength is 276 MPa. Use this as the default limit for stress evaluations unless a different alloy is specified.',
    tags: ['materials', 'aluminum', 'yield-strength'],
    relevance: 0.95,
    source_run_id: 'run_abc123',
    created_at: '2026-03-20T10:15:00Z',
  },
  {
    id: 'mem_002',
    agent_id: 'agent_fea_opt',
    project_id: 'prj_default',
    memory_type: 'lesson',
    content: 'Hex8 elements produce more accurate stress results than Tet4 for plate-like geometries. Always prefer hex meshing when aspect ratio < 5:1.',
    tags: ['meshing', 'best-practice', 'accuracy'],
    relevance: 0.88,
    source_run_id: 'run_def456',
    created_at: '2026-03-22T14:30:00Z',
  },
  {
    id: 'mem_003',
    agent_id: 'agent_fea_opt',
    project_id: 'prj_default',
    memory_type: 'error_pattern',
    content: 'Mesh generator fails with "degenerate face" error when input geometry has gaps > 0.1mm. Run CAD Repair tool first to heal geometry before meshing.',
    tags: ['error-handling', 'meshing', 'cad-repair'],
    relevance: 0.92,
    source_run_id: 'run_ghi789',
    created_at: '2026-03-25T09:45:00Z',
  },
  {
    id: 'mem_004',
    agent_id: 'agent_fea_opt',
    project_id: 'prj_default',
    memory_type: 'preference',
    content: 'User prefers von Mises stress contour plots with a blue-to-red color map and factor-of-safety annotations overlaid on the 3D view.',
    tags: ['visualization', 'user-preference', 'stress-plots'],
    relevance: 0.75,
    created_at: '2026-03-28T16:00:00Z',
  },
];

/* ---------- Read Endpoints ---------- */

export function listMemories(agentId: string, type?: MemoryType): Promise<AgentMemory[]> {
  const params = type ? `?type=${type}` : '';
  const filtered = type ? MOCK_MEMORIES.filter((m) => m.memory_type === type) : MOCK_MEMORIES;
  return apiOrMock(
    `/v0/agents/${agentId}/memories${params}`,
    { method: 'GET' },
    filtered,
  );
}

/* ---------- Mutation Endpoints ---------- */

export async function createMemory(agentId: string, data: CreateMemoryData): Promise<AgentMemory> {
  return apiClient.post(`/v0/agents/${agentId}/memories`, data);
}

export async function deleteMemory(agentId: string, memoryId: string): Promise<void> {
  return apiClient.delete(`/v0/agents/${agentId}/memories/${memoryId}`);
}
