import { apiOrMock, apiClient } from './client';
import type { Card, CardEvidence, CardDependency } from '@/types/card';

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

const MOCK_CARDS: Card[] = [
  {
    id: 'card_fea_001',
    board_id: 'board_structural_001',
    intent_spec_id: 'intent_fea_001',
    card_type: 'analysis',
    intent_type: 'sim.fea',
    title: 'FEA Stress Test',
    description: 'Static stress analysis of bracket under 500N load',
    status: 'completed',
    ordinal: 1,
    kpis: [
      { metric_key: 'max_von_mises', target_value: 120, unit: 'MPa', tolerance: 10 },
      { metric_key: 'max_displacement', target_value: 0.5, unit: 'mm', tolerance: 0.05 },
      { metric_key: 'safety_factor', target_value: 2.5, unit: '', tolerance: 0.2 },
    ],
    started_at: '2026-04-01T10:00:00Z',
    completed_at: '2026-04-01T10:15:00Z',
    created_at: '2026-03-28T08:00:00Z',
    updated_at: '2026-04-01T10:15:00Z',
  },
  {
    id: 'card_cfd_002',
    board_id: 'board_structural_001',
    intent_spec_id: 'intent_cfd_001',
    card_type: 'analysis',
    intent_type: 'sim.cfd',
    title: 'CFD Flow Study',
    description: 'Internal flow simulation through cooling channel',
    status: 'running',
    ordinal: 2,
    kpis: [
      { metric_key: 'pressure_drop', target_value: 15, unit: 'kPa', tolerance: 2 },
    ],
    started_at: '2026-04-02T14:00:00Z',
    created_at: '2026-03-29T09:00:00Z',
    updated_at: '2026-04-02T14:00:00Z',
  },
  {
    id: 'card_dfm_003',
    board_id: 'board_structural_001',
    card_type: 'analysis',
    intent_type: 'mfg.dfm_check',
    title: 'DFM Check',
    description: 'Design for manufacturability review of bracket geometry',
    status: 'draft',
    ordinal: 3,
    kpis: [],
    created_at: '2026-04-01T12:00:00Z',
    updated_at: '2026-04-01T12:00:00Z',
  },
];

const MOCK_EVIDENCE: CardEvidence[] = [
  {
    id: 'ev_001',
    card_id: 'card_fea_001',
    artifact_id: 'art_fea_result_001',
    run_id: 'run_fea_001',
    metric_key: 'max_von_mises',
    metric_value: 112.4,
    metric_unit: 'MPa',
    operator: 'lte',
    threshold: 120,
    passed: true,
    evaluation: 'pass',
    version: 1,
    created_at: '2026-04-01T10:15:00Z',
  },
  {
    id: 'ev_002',
    card_id: 'card_fea_001',
    artifact_id: 'art_fea_result_001',
    run_id: 'run_fea_001',
    metric_key: 'max_displacement',
    metric_value: 0.42,
    metric_unit: 'mm',
    operator: 'lte',
    threshold: 0.5,
    passed: true,
    evaluation: 'pass',
    version: 1,
    created_at: '2026-04-01T10:15:00Z',
  },
  {
    id: 'ev_003',
    card_id: 'card_fea_001',
    artifact_id: 'art_fea_result_001',
    run_id: 'run_fea_001',
    metric_key: 'safety_factor',
    metric_value: 2.68,
    metric_unit: '',
    operator: 'gte',
    threshold: 2.5,
    passed: true,
    evaluation: 'pass',
    version: 1,
    created_at: '2026-04-01T10:15:00Z',
  },
];

const MOCK_DEPENDENCIES: CardDependency[] = [
  {
    id: 'dep_001',
    card_id: 'card_cfd_002',
    depends_on_card_id: 'card_fea_001',
    dependency_type: 'inputs_from',
    created_at: '2026-03-29T09:00:00Z',
  },
  {
    id: 'dep_002',
    card_id: 'card_dfm_003',
    depends_on_card_id: 'card_fea_001',
    dependency_type: 'blocks',
    created_at: '2026-04-01T12:00:00Z',
  },
];

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

const MOCK_GRAPH: CardGraph = {
  nodes: MOCK_CARDS.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    card_type: c.card_type,
  })),
  edges: MOCK_DEPENDENCIES.map((d) => ({
    from: d.depends_on_card_id,
    to: d.card_id,
    type: d.dependency_type,
  })),
};

interface RunSummary {
  id: string;
  card_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

const MOCK_RUNS: RunSummary[] = [
  {
    id: 'run_fea_001',
    card_id: 'card_fea_001',
    status: 'completed',
    started_at: '2026-04-01T10:00:00Z',
    completed_at: '2026-04-01T10:15:00Z',
  },
];

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listCards(boardId: string): Promise<Card[]> {
  return apiOrMock(
    `/v0/boards/${boardId}/cards`,
    { method: 'GET' },
    MOCK_CARDS.filter((c) => c.board_id === boardId),
  );
}

export async function getCard(id: string): Promise<Card> {
  return apiOrMock(
    `/v0/cards/${id}`,
    { method: 'GET' },
    MOCK_CARDS.find((c) => c.id === id) ?? MOCK_CARDS[0],
  );
}

export async function createCard(
  boardId: string,
  data: {
    title: string;
    card_type: string;
    intent_type?: string;
    description?: string;
    kpis?: Card['kpis'];
  },
): Promise<Card> {
  return apiClient.post(`/v0/boards/${boardId}/cards`, data);
}

export async function updateCard(id: string, data: Partial<Card>): Promise<Card> {
  return apiClient.patch(`/v0/cards/${id}`, data);
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
  return apiOrMock(
    `/v0/cards/${cardId}/evidence`,
    { method: 'GET' },
    MOCK_EVIDENCE.filter((e) => e.card_id === cardId),
  );
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
  return apiOrMock(
    `/v0/cards/${cardId}/runs`,
    { method: 'GET' },
    MOCK_RUNS.filter((r) => r.card_id === cardId),
  );
}

export async function getCardGraph(boardId: string): Promise<CardGraph> {
  return apiOrMock(`/v0/boards/${boardId}/cards/graph`, { method: 'GET' }, MOCK_GRAPH);
}
