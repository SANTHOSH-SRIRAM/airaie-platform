import { apiOrMock, apiClient } from './client';
import type { IntentSpec, IntentTypeDefinition } from '@/types/intent';

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

const MOCK_INTENTS: IntentSpec[] = [
  {
    id: 'intent_fea_001',
    board_id: 'board_structural_001',
    card_id: 'card_fea_001',
    intent_type: 'sim.fea',
    version: 1,
    goal: 'Validate bracket structural integrity under 500N axial load per ISO 12345',
    inputs: [
      { name: 'geometry', artifact_ref: 'art_cad_bracket_v2', type: 'STEP', required: true },
      { name: 'material', type: 'string', required: true, value: 'Al-6061-T6' },
      { name: 'load_case', type: 'json', required: true, value: { force: 500, direction: [0, -1, 0], unit: 'N' } },
    ],
    acceptance_criteria: [
      { id: 'ac_001', metric: 'max_von_mises', operator: 'lte', threshold: 120, unit: 'MPa', description: 'Max stress below yield' },
      { id: 'ac_002', metric: 'max_displacement', operator: 'lte', threshold: 0.5, unit: 'mm', description: 'Max deflection within tolerance' },
      { id: 'ac_003', metric: 'safety_factor', operator: 'gte', threshold: 2.5, description: 'Min safety factor' },
    ],
    preferences: { preferred_tools: ['tool_fea'], compute_profile: 'standard', timeout_minutes: 30 },
    governance: { level: 'full', approval_roles: ['senior_engineer'], require_review: true },
    status: 'locked',
    locked_at: '2026-03-30T10:00:00Z',
    created_at: '2026-03-28T08:00:00Z',
    updated_at: '2026-03-30T10:00:00Z',
  },
  {
    id: 'intent_cfd_001',
    board_id: 'board_structural_001',
    card_id: 'card_cfd_002',
    intent_type: 'sim.cfd',
    version: 1,
    goal: 'Analyze cooling channel flow to verify pressure drop target',
    inputs: [
      { name: 'geometry', artifact_ref: 'art_cad_channel_v1', type: 'STEP', required: true },
      { name: 'fluid_properties', type: 'json', required: true, value: { fluid: 'water', temperature: 25, unit: 'C' } },
    ],
    acceptance_criteria: [
      { id: 'ac_cfd_001', metric: 'pressure_drop', operator: 'lte', threshold: 15, unit: 'kPa', description: 'Pressure drop within budget' },
    ],
    preferences: { preferred_tools: ['tool_cfd'], compute_profile: 'high', timeout_minutes: 60 },
    governance: { level: 'light', require_review: false },
    status: 'active',
    created_at: '2026-03-29T09:00:00Z',
    updated_at: '2026-04-02T14:00:00Z',
  },
];

const MOCK_INTENT_TYPES: IntentTypeDefinition[] = [
  {
    slug: 'sim.fea',
    vertical_slug: 'engineering',
    name: 'Finite Element Analysis',
    description: 'Structural stress, thermal, or modal analysis using FEA solvers',
    category: 'simulation',
    required_inputs: [
      { name: 'geometry', type: 'artifact', required: true },
      { name: 'material', type: 'string', required: true },
      { name: 'load_case', type: 'json', required: true },
    ],
    default_pipelines: ['pipe_fea_standard'],
  },
  {
    slug: 'sim.cfd',
    vertical_slug: 'engineering',
    name: 'Computational Fluid Dynamics',
    description: 'Internal or external flow analysis using CFD solvers',
    category: 'simulation',
    required_inputs: [
      { name: 'geometry', type: 'artifact', required: true },
      { name: 'fluid_properties', type: 'json', required: true },
    ],
    default_pipelines: ['pipe_cfd_quick'],
  },
  {
    slug: 'opt.topology',
    vertical_slug: 'engineering',
    name: 'Topology Optimization',
    description: 'Density-based topology optimization for lightweight structural design',
    category: 'optimization',
    required_inputs: [
      { name: 'geometry', type: 'artifact', required: true },
      { name: 'constraints', type: 'json', required: true },
      { name: 'load_cases', type: 'json', required: true },
    ],
    default_pipelines: ['pipe_topo_standard'],
  },
];

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listIntents(boardId: string): Promise<IntentSpec[]> {
  return apiOrMock(
    `/v0/boards/${boardId}/intents`,
    { method: 'GET' },
    MOCK_INTENTS.filter((i) => i.board_id === boardId),
  );
}

export async function getIntent(id: string): Promise<IntentSpec> {
  return apiOrMock(
    `/v0/intents/${id}`,
    { method: 'GET' },
    MOCK_INTENTS.find((i) => i.id === id) ?? MOCK_INTENTS[0],
  );
}

export async function createIntent(
  boardId: string,
  data: {
    intent_type: string;
    goal: string;
    card_id?: string;
    inputs?: IntentSpec['inputs'];
    acceptance_criteria?: IntentSpec['acceptance_criteria'];
    preferences?: IntentSpec['preferences'];
    governance?: IntentSpec['governance'];
  },
): Promise<IntentSpec> {
  return apiClient.post(`/v0/boards/${boardId}/intents`, data);
}

export async function updateIntent(
  id: string,
  data: Partial<Pick<IntentSpec, 'goal' | 'inputs' | 'acceptance_criteria' | 'preferences' | 'governance'>>,
): Promise<IntentSpec> {
  return apiClient.patch(`/v0/intents/${id}`, data);
}

export async function lockIntent(id: string): Promise<IntentSpec> {
  return apiClient.post(`/v0/intents/${id}/lock`);
}

export async function deleteIntent(id: string): Promise<void> {
  return apiClient.delete(`/v0/intents/${id}`);
}

export async function listIntentTypes(verticalSlug: string): Promise<IntentTypeDefinition[]> {
  return apiOrMock(
    `/v0/verticals/${verticalSlug}/intent-types`,
    { method: 'GET' },
    MOCK_INTENT_TYPES.filter((t) => t.vertical_slug === verticalSlug),
  );
}

export async function getIntentType(slug: string): Promise<IntentTypeDefinition> {
  return apiOrMock(
    `/v0/intent-types/${slug}`,
    { method: 'GET' },
    MOCK_INTENT_TYPES.find((t) => t.slug === slug) ?? MOCK_INTENT_TYPES[0],
  );
}
