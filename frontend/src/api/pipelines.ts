import { api, apiClient } from '@api/client';

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

/* ---------- API functions ---------- */

export async function listPipelines(): Promise<Pipeline[]> {
  return api('/v0/pipelines', { method: 'GET' });
}

export async function getPipeline(id: string): Promise<Pipeline> {
  return api(`/v0/pipelines/${id}`, { method: 'GET' });
}

export async function createPipeline(data: Partial<Pipeline>): Promise<Pipeline> {
  return apiClient.post('/v0/pipelines', data);
}
