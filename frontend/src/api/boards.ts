import { api, apiClient } from './client';
import type { Board, BoardSummary, BoardModeConfig } from '@/types/board';

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listBoards(): Promise<Board[]> {
  const res = await api<{ boards: Board[] | null } | Board[]>(
    '/v0/boards', { method: 'GET' },
  );
  return (res as any).boards ?? (Array.isArray(res) ? res : []);
}

export async function getBoard(id: string): Promise<Board> {
  return api(`/v0/boards/${id}`, { method: 'GET' });
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
  return api(`/v0/boards/${id}/summary`, { method: 'GET' });
}

export async function escalateBoardMode(id: string, nextMode: string): Promise<Board> {
  return apiClient.post(`/v0/boards/${id}/mode-escalate`, { next_mode: nextMode });
}

export async function getBoardModeConfig(id: string): Promise<BoardModeConfig> {
  return api(`/v0/boards/${id}/mode-config`, { method: 'GET' });
}

export async function createBoardFromIntent(data: {
  intent_type: string;
  goal: string;
  governance?: { level: string };
}): Promise<Board> {
  return apiClient.post('/v0/boards/from-intent', data);
}

export async function listChildBoards(id: string): Promise<Board[]> {
  return api(`/v0/boards/${id}/children`, { method: 'GET' });
}

// downloadReleasePacket — endpoint not yet implemented in backend
export async function downloadReleasePacket(_id: string): Promise<Blob> {
  throw new Error('Export not yet available');
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

import type { Card } from '@/types/card';
import type { BoardRecord } from '@/types/board';

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

export type { BoardRecord };

export async function listRecords(boardId: string): Promise<BoardRecord[]> {
  const res = await apiClient.get<{ records: BoardRecord[] | null }>(`/v0/boards/${boardId}/records`);
  return (res as any).records ?? res ?? [];
}

export async function createRecord(
  boardId: string,
  data: { record_type: string; content: string; title?: string },
): Promise<BoardRecord> {
  return apiClient.post(`/v0/boards/${boardId}/records`, {
    record_type: data.record_type,
    title: data.title ?? '',
    content: { text: data.content },
  });
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
