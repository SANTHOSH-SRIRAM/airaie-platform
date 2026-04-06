import { apiOrMock, apiClient } from '@api/client';

/* ---------- Types ---------- */

export interface PipelineStep {
  tool_id: string;
  tool_version: string;
  role: string;
  config_template: Record<string, unknown>;
  input_mapping: Record<string, string>;
  output_mapping: Record<string, string>;
  optional: boolean;
  order: number;
}

export interface Pipeline {
  id: string;
  vertical_id: string;
  slug: string;
  name: string;
  description: string;
  supported_intents: string[];
  steps: PipelineStep[];
  trust_level: string;
  is_builtin: boolean;
  created_at: string;
}

/* ---------- Mock data ---------- */

const MOCK_PIPELINES: Pipeline[] = [
  {
    id: 'pipe_fea_standard',
    vertical_id: 'engineering',
    slug: 'fea-standard-validation',
    name: 'FEA Standard Validation',
    description: 'Standard finite element analysis pipeline',
    supported_intents: ['sim.fea'],
    trust_level: 'verified',
    is_builtin: true,
    steps: [
      {
        tool_id: 'tool_mesh',
        tool_version: '1.0.0',
        role: 'preprocess',
        config_template: {},
        input_mapping: {},
        output_mapping: {},
        optional: false,
        order: 1,
      },
      {
        tool_id: 'tool_fea',
        tool_version: '2.1.0',
        role: 'solve',
        config_template: {},
        input_mapping: { mesh: 'step.1.output.mesh_file' },
        output_mapping: {},
        optional: false,
        order: 2,
      },
      {
        tool_id: 'tool_report',
        tool_version: '1.0.0',
        role: 'postprocess',
        config_template: {},
        input_mapping: {},
        output_mapping: {},
        optional: true,
        order: 3,
      },
    ],
    created_at: '2026-03-01T00:00:00Z',
  },
];

/* ---------- API functions ---------- */

export async function listPipelines(): Promise<Pipeline[]> {
  return apiOrMock('/v0/pipelines', { method: 'GET' }, MOCK_PIPELINES);
}

export async function getPipeline(id: string): Promise<Pipeline> {
  return apiOrMock(`/v0/pipelines/${id}`, { method: 'GET' }, MOCK_PIPELINES[0]);
}

export async function createPipeline(data: Partial<Pipeline>): Promise<Pipeline> {
  return apiClient.post('/v0/pipelines', data);
}
