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

export async function downloadReleasePacket(id: string): Promise<Blob> {
  const url = `/v0/boards/${id}/release-packet`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Project-Id': 'prj_default',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download release packet: ${res.status}`);
  }

  return res.blob();
}
