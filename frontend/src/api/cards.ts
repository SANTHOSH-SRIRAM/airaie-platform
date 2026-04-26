import { api, apiClient } from './client';
import type { Card, CardEvidence, CardDependency } from '@/types/card';
import type { CardBodyDoc } from '@/types/cardBlocks';
import { unwrapList } from '@/utils/apiEnvelope';

interface CardGraphNode {
  id: string;
  title: string;
  status: string;
  card_type: string;
}

interface CardGraph {
  nodes: CardGraphNode[];
  edges: { from: string; to: string; type: string }[];
}

interface RunSummary {
  id: string;
  card_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listCards(boardId: string): Promise<Card[]> {
  const res = await api<unknown>(`/v0/boards/${boardId}/cards`, { method: 'GET' });
  return unwrapList<Card>(res, 'cards');
}

export async function getCard(id: string): Promise<Card> {
  return api(`/v0/cards/${id}`, { method: 'GET' });
}

export async function createCard(
  boardId: string,
  data: {
    title: string;
    card_type: string;
    intent_type?: string;
    description?: string;
    kpis?: Card['kpis'];
    // D7: optional link to an IntentSpec at creation time. Backend
    // model.Card has `intent_spec_id` (json:"intent_spec_id,omitempty").
    intent_spec_id?: string;
  },
): Promise<Card> {
  return apiClient.post(`/v0/boards/${boardId}/cards`, data);
}

export async function updateCard(id: string, data: Partial<Card>): Promise<Card> {
  return apiClient.patch(`/v0/cards/${id}`, data);
}

/**
 * Persist the Card Canvas body (Phase 10). Returns the new
 * `body_blocks_version` on success.
 *
 * On version conflict the kernel returns 409 with body
 * `{ error: 'VERSION_CONFLICT', current_version: <int> }`. The fetch
 * wrapper turns this into an `ApiError` with `status === 409` and `code ===
 * 'VERSION_CONFLICT'`; callers should refetch the card and retry.
 */
export async function updateCardBody(
  cardId: string,
  bodyBlocks: CardBodyDoc,
  expectedVersion: number,
): Promise<{ body_blocks_version: number }> {
  return apiClient.patch(`/v0/cards/${cardId}/body`, {
    body_blocks: bodyBlocks,
    expected_version: expectedVersion,
  });
}

export async function deleteCard(id: string): Promise<void> {
  return apiClient.delete(`/v0/cards/${id}`);
}

export async function addCardDependency(cardId: string, depId: string): Promise<CardDependency> {
  return apiClient.post(`/v0/cards/${cardId}/dependencies/${depId}`);
}

export async function removeCardDependency(cardId: string, depId: string): Promise<void> {
  return apiClient.delete(`/v0/cards/${cardId}/dependencies/${depId}`);
}

export async function listCardEvidence(cardId: string): Promise<CardEvidence[]> {
  const raw = await api<unknown>(`/v0/cards/${cardId}/evidence`, { method: 'GET' });
  return unwrapList<CardEvidence>(raw, 'evidence');
}

export async function addCardEvidence(
  cardId: string,
  data: {
    artifact_id?: string;
    run_id?: string;
    metric_key: string;
    metric_value: number;
    metric_unit?: string;
    operator?: string;
    threshold?: number;
    evaluation: CardEvidence['evaluation'];
  },
): Promise<CardEvidence> {
  return apiClient.post(`/v0/cards/${cardId}/evidence`, data);
}

export async function listCardRuns(cardId: string): Promise<RunSummary[]> {
  const res = await api<unknown>(`/v0/cards/${cardId}/runs`, { method: 'GET' });
  return unwrapList<RunSummary>(res, 'runs');
}

export async function getCardGraph(boardId: string): Promise<CardGraph> {
  // Backend returns { graph: CardWithDeps[], topological_order } — each
  // CardWithDeps carries its own depends_on[] / blocks[] arrays. We flatten
  // that into the {nodes, edges} shape the React Flow consumer expects.
  type CardWithDeps = {
    id: string;
    title: string;
    status: string;
    card_type: string;
    depends_on?: string[];
  };
  const res = await api<unknown>(`/v0/boards/${boardId}/cards/graph`, { method: 'GET' });
  const list = unwrapList<CardWithDeps>(res, 'graph');

  const nodes: CardGraphNode[] = list.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    card_type: c.card_type,
  }));

  const edges: CardGraph['edges'] = [];
  for (const c of list) {
    for (const dep of c.depends_on ?? []) {
      edges.push({ from: dep, to: c.id, type: 'depends_on' });
    }
  }

  return { nodes, edges };
}
