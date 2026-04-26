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

/**
 * List the pipelines that support a given intent_type.
 *
 * Backend route: `GET /v0/intent-types/{slug}/pipelines` — confirmed in
 * CLAUDE.md ("Available pipelines: pipe_fea_standard (FEA), pipe_cfd_quick
 * (CFD)") and the research doc's existing endpoints inventory.
 *
 * Returns `[]` if the kernel doesn't recognize the intent_type — graceful
 * degradation lets the Card-page render an empty Methods table rather
 * than crashing the entire body.
 */
export async function listIntentTypePipelines(intentTypeSlug: string): Promise<Pipeline[]> {
  try {
    const res = await api<{ pipelines: Pipeline[] } | Pipeline[]>(
      `/v0/intent-types/${intentTypeSlug}/pipelines`,
      { method: 'GET' },
    );
    if (Array.isArray(res)) return res;
    return res?.pipelines ?? [];
  } catch {
    return [];
  }
}
