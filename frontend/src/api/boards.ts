import { apiOrMock, apiClient } from './client';
import type { Board, BoardSummary, BoardModeConfig } from '@/types/board';

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

const MOCK_BOARDS: Board[] = [
  {
    id: 'board_structural_001',
    project_id: 'prj_default',
    type: 'engineering_validation',
    vertical_id: 'engineering',
    name: 'Structural Validation Study',
    description: 'FEA validation for bracket design under ISO 12345',
    mode: 'study',
    status: 'DRAFT',
    owner: 'user_001',
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-04-01T14:30:00Z',
  },
  {
    id: 'board_thermal_002',
    project_id: 'prj_default',
    type: 'research_exploration',
    vertical_id: 'engineering',
    name: 'Thermal Analysis Exploration',
    description: 'Exploring thermal behavior of new composite material',
    mode: 'explore',
    status: 'DRAFT',
    owner: 'user_001',
    created_at: '2026-03-25T09:00:00Z',
    updated_at: '2026-04-02T11:00:00Z',
  },
  {
    id: 'board_release_003',
    project_id: 'prj_default',
    type: 'manufacturing_release',
    vertical_id: 'engineering',
    name: 'Bracket v2 Release',
    description: 'Manufacturing release for optimized bracket design',
    mode: 'release',
    status: 'DRAFT',
    owner: 'user_001',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-03T16:00:00Z',
  },
];

const MOCK_SUMMARY: BoardSummary = {
  board: MOCK_BOARDS[0],
  card_stats: { total: 5, completed: 2, failed: 1, running: 1, pending: 1 },
  gate_stats: { total: 3, passed: 1, failed: 0, pending: 2, waived: 0 },
  readiness: {
    overall: 0.48,
    design: 0.7,
    validation: 0.4,
    compliance: 0.2,
    manufacturing: 0.1,
    approvals: 0.3,
  },
  next_actions: [
    {
      type: 'run_card',
      description: 'Execute CFD analysis card',
      entity_id: 'card_003',
      priority: 'high',
    },
    {
      type: 'approve_gate',
      description: 'Review FEA evidence gate',
      entity_id: 'gate_001',
      priority: 'medium',
    },
  ],
};

const MOCK_MODE_CONFIG: BoardModeConfig = {
  mode: 'study',
  gate_generation: 'repro_peer',
  require_input_pinning: true,
  require_auto_evidence: false,
  generate_repro_pack: true,
  require_approvals: false,
  auto_approve_floor: 0.75,
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listBoards(): Promise<Board[]> {
  return apiOrMock('/v0/boards', { method: 'GET' }, MOCK_BOARDS);
}

export async function getBoard(id: string): Promise<Board> {
  return apiOrMock(
    `/v0/boards/${id}`,
    { method: 'GET' },
    MOCK_BOARDS.find((b) => b.id === id) ?? MOCK_BOARDS[0],
  );
}

export async function createBoard(data: {
  name: string;
  type: string;
  mode: string;
  vertical_id?: string;
  description?: string;
}): Promise<Board> {
  return apiClient.post('/v0/boards', data);
}

export async function updateBoard(id: string, data: Partial<Board>): Promise<Board> {
  return apiClient.patch(`/v0/boards/${id}`, data);
}

export async function deleteBoard(id: string): Promise<void> {
  return apiClient.delete(`/v0/boards/${id}`);
}

export async function getBoardSummary(id: string): Promise<BoardSummary> {
  return apiOrMock(`/v0/boards/${id}/summary`, { method: 'GET' }, MOCK_SUMMARY);
}

export async function escalateBoardMode(id: string, nextMode: string): Promise<Board> {
  return apiClient.post(`/v0/boards/${id}/mode-escalate`, { next_mode: nextMode });
}

export async function getBoardModeConfig(id: string): Promise<BoardModeConfig> {
  return apiOrMock(`/v0/boards/${id}/mode-config`, { method: 'GET' }, MOCK_MODE_CONFIG);
}

export async function createBoardFromIntent(data: {
  intent_type: string;
  goal: string;
  governance?: { level: string };
}): Promise<Board> {
  return apiClient.post('/v0/boards/from-intent', data);
}

export async function listChildBoards(id: string): Promise<Board[]> {
  return apiOrMock(`/v0/boards/${id}/children`, { method: 'GET' }, []);
}

// downloadReleasePacket — endpoint not yet implemented in backend
export async function downloadReleasePacket(_id: string): Promise<Blob> {
  throw new Error('Export not yet available');
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

import type { Card } from '@/types/card';

export async function listCards(boardId: string): Promise<Card[]> {
  const res = await apiClient.get<{ cards: Card[] | null }>(`/v0/boards/${boardId}/cards`);
  return (res as any).cards ?? res ?? [];
}

export async function createCard(boardId: string, data: { title: string; card_type: string; description?: string }): Promise<Card> {
  return apiClient.post(`/v0/boards/${boardId}/cards`, data);
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface BoardRecord {
  id: string;
  board_id: string;
  record_type: string;
  title?: string;
  content: string;
  actor?: string;
  run_id?: string;
  tags?: string[];
  created_at: string;
}

export async function listRecords(boardId: string): Promise<BoardRecord[]> {
  const res = await apiClient.get<{ records: BoardRecord[] | null }>(`/v0/boards/${boardId}/records`);
  return (res as any).records ?? res ?? [];
}

export async function createRecord(boardId: string, data: { record_type: string; content: string; title?: string; tags?: string[] }): Promise<BoardRecord> {
  return apiClient.post(`/v0/boards/${boardId}/records`, data);
}

// ---------------------------------------------------------------------------
// Board Assist (AI co-pilot)
// ---------------------------------------------------------------------------

export async function draftIntent(boardId: string, description: string): Promise<{ intent: unknown; rationale: string }> {
  return apiClient.post(`/v0/boards/${boardId}/assist/draft-intent`, { description });
}

export async function recommendTools(boardId: string): Promise<Array<{ tool_id: string; name: string; score: number; reason: string }>> {
  return apiClient.get(`/v0/boards/${boardId}/assist/recommend-tools`);
}

export async function analyzeFailure(boardId: string, runId: string): Promise<{ root_cause: string; suggestions: string[]; severity?: string }> {
  return apiClient.get(`/v0/boards/${boardId}/runs/${runId}/assist/analyze-failure`);
}

export async function summarizeApprovals(boardId: string): Promise<{ summary: string; pending_count: number; items: unknown[] }> {
  return apiClient.get(`/v0/boards/${boardId}/assist/summarize-approvals`);
}
