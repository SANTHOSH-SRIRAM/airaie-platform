import { apiOrMock, apiClient } from './client';
import type { ExecutionPlan, PreflightResult } from '@/types/plan';

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

const MOCK_PLAN: ExecutionPlan = {
  id: 'plan_fea_001',
  card_id: 'card_fea_001',
  pipeline_id: 'pipe_fea_standard',
  nodes: [
    {
      node_id: 'node_validate',
      tool_id: 'tool_validator',
      tool_version: 'v1.0.0',
      role: 'validate_input',
      parameters: { schema: 'fea_input_v2', strict: true },
      is_editable: false,
      is_required: true,
      status: 'completed',
    },
    {
      node_id: 'node_preprocess',
      tool_id: 'tool_mesh',
      tool_version: 'v1.0.0',
      role: 'preprocess',
      parameters: { element_type: 'hex8', mesh_size: 2.0, quality_target: 0.8 },
      is_editable: true,
      is_required: true,
      status: 'completed',
    },
    {
      node_id: 'node_solve',
      tool_id: 'tool_fea',
      tool_version: 'v2.1.0',
      role: 'solve',
      parameters: { solver: 'static_linear', threshold: 128, output_format: 'VTK' },
      is_editable: true,
      is_required: true,
      status: 'completed',
    },
    {
      node_id: 'node_postprocess',
      tool_id: 'tool_result',
      tool_version: 'v1.0.0',
      role: 'postprocess',
      parameters: { template: 'fea_summary', extract_metrics: ['max_von_mises', 'max_displacement', 'safety_factor'] },
      is_editable: true,
      is_required: true,
      status: 'completed',
    },
    {
      node_id: 'node_evidence',
      tool_id: 'tool_compliance',
      tool_version: 'v1.1.0',
      role: 'evidence',
      parameters: { ruleset: 'iso_12345_structural', auto_attach: true },
      is_editable: false,
      is_required: true,
      status: 'completed',
    },
  ],
  edges: [
    { from_node_id: 'node_validate', to_node_id: 'node_preprocess' },
    { from_node_id: 'node_preprocess', to_node_id: 'node_solve' },
    { from_node_id: 'node_solve', to_node_id: 'node_postprocess' },
    { from_node_id: 'node_postprocess', to_node_id: 'node_evidence' },
  ],
  bindings: {
    'node_preprocess.geometry': 'intent.inputs.geometry',
    'node_solve.mesh_file': 'node_preprocess.output.mesh',
    'node_postprocess.result': 'node_solve.output.result',
    'node_evidence.artifact': 'node_postprocess.output.report',
  },
  expected_outputs: ['stress_report', 'vtk_result', 'evidence_record'],
  cost_estimate: 0.93,
  time_estimate: '~15 min',
  status: 'completed',
  preflight_result: {
    passed: true,
    blockers: [],
    suggestions: [
      { check: 'mesh_quality', message: 'Consider finer mesh for stress concentrations', severity: 'suggestion' },
    ],
  },
  workflow_id: 'wf_fea_001',
  run_id: 'run_fea_001',
  created_at: '2026-03-30T10:05:00Z',
  updated_at: '2026-04-01T10:15:00Z',
};

const MOCK_PREFLIGHT: PreflightResult = {
  passed: true,
  blockers: [],
  suggestions: [
    {
      node_id: 'node_preprocess',
      check: 'mesh_quality',
      message: 'Consider finer mesh for stress concentrations near fillets',
      severity: 'suggestion',
    },
  ],
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function generatePlan(cardId: string): Promise<ExecutionPlan> {
  return apiClient.post(`/v0/cards/${cardId}/plan/generate`);
}

export async function getPlan(cardId: string): Promise<ExecutionPlan> {
  return apiOrMock(
    `/v0/cards/${cardId}/plan`,
    { method: 'GET' },
    { ...MOCK_PLAN, card_id: cardId },
  );
}

export async function editPlan(
  cardId: string,
  edits: {
    node_id: string;
    parameters?: Record<string, unknown>;
    tool_version?: string;
  }[],
): Promise<ExecutionPlan> {
  return apiClient.patch(`/v0/cards/${cardId}/plan`, { edits });
}

export async function validatePlan(cardId: string): Promise<PreflightResult> {
  return apiOrMock(
    `/v0/cards/${cardId}/plan/validate`,
    { method: 'POST' },
    MOCK_PREFLIGHT,
  );
}

export async function compilePlan(cardId: string): Promise<ExecutionPlan> {
  return apiClient.post(`/v0/cards/${cardId}/plan/compile`);
}

export async function executePlan(cardId: string): Promise<ExecutionPlan> {
  return apiClient.post(`/v0/cards/${cardId}/plan/execute`);
}
