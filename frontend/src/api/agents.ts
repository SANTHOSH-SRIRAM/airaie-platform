import { apiClient } from '@api/client';

/* ---------- Types ---------- */

export interface AgentListItem {
  id: string;
  name: string;
  description: string;
  owner: string;
  created_at: string;
  updated_at: string;
}

export interface AgentDetail extends AgentListItem {
  project_id: string;
}

export interface AgentVersion {
  id: string;
  agent_id: string;
  version: number;
  spec_json?: AgentSpec;
  status: 'draft' | 'validated' | 'published';
  created_at: string;
  published_at?: string;
}

/**
 * Wire shape returned by the kernel — `spec` is a base64-encoded JSON string
 * of an AgentSpec. We decode it to `spec_json` at the API-client boundary so
 * consumers always work with the parsed `AgentSpec` object (or `undefined`
 * when decoding fails / the field is empty).
 */
export interface WireAgentVersion {
  id: string;
  agent_id: string;
  version: number;
  spec: string;
  status: 'draft' | 'validated' | 'published';
  created_at: string;
  published_at?: string;
}

/**
 * Decode a kernel-wire AgentVersion to the in-app shape.
 * Tolerates: already-object spec, empty string, non-base64 string, malformed JSON.
 * On any decode failure, returns `spec_json: undefined` so optional-chaining
 * call sites fall through to their existing empty-state branches.
 *
 * Pure function. Exported so tests / future call sites can reuse it.
 */
export function mapWireAgentVersion(wire: WireAgentVersion | AgentVersion): AgentVersion {
  // Defensive: if it's already in app shape (e.g. test fixture, double-mapped), pass through.
  if (typeof (wire as WireAgentVersion).spec !== 'string') {
    const w = wire as AgentVersion;
    return {
      id: w.id,
      agent_id: w.agent_id,
      version: w.version,
      spec_json: w.spec_json,
      status: w.status,
      created_at: w.created_at,
      published_at: w.published_at,
    };
  }

  const w = wire as WireAgentVersion;
  let spec_json: AgentSpec | undefined;
  if (w.spec && w.spec.length > 0) {
    try {
      spec_json = JSON.parse(atob(w.spec)) as AgentSpec;
    } catch {
      spec_json = undefined;
    }
  }

  return {
    id: w.id,
    agent_id: w.agent_id,
    version: w.version,
    spec_json,
    status: w.status,
    created_at: w.created_at,
    published_at: w.published_at,
  };
}

export interface AgentSpec {
  api_version: 'airaie.agentspec/v1';
  kind: 'AgentSpec';
  metadata: {
    name: string;
    version: string;  // semver e.g. "1.0.0"
    owner: string;
    domain_tags: string[];
    description?: string;
  };
  goal: string;
  tools: AgentToolPermission[];
  /** Top-level model spec used by the builder UI. The runtime LLM config still
   *  lives under `llm`; this mirrors provider/model for form convenience. */
  model?: { provider: string; model: string };
  scoring?: {
    strategy: 'weighted' | 'priority' | 'cost_optimized';
    weights?: { compatibility: number; trust: number; cost: number; latency?: number; reliability?: number };
    llm_weight?: number;
    min_score_threshold?: number;
    risk_penalty_weight?: number;
  };
  constraints?: {
    max_tools_per_run?: number;
    timeout_seconds?: number;
    max_retries?: number;
    budget_limit?: number;
  };
  policy?: {
    auto_approve_threshold?: number;
    require_approval_for?: string[];
    escalation_rules?: { condition: string; action: string }[];
  };
  llm?: {
    provider: string;
    model: string;
    weight?: number;
  };
}

export interface AgentToolPermission {
  tool_ref: string;
  permissions: string[];
  max_invocations: number;
}

export interface AgentMemory {
  id: string;
  agent_id: string;
  project_id: string;
  memory_type: 'fact' | 'preference' | 'lesson' | 'error_pattern';
  content: string;
  tags: string[];
  relevance: number;
  source_run_id?: string;
  created_at: string;
}

export interface CreateAgentData {
  name: string;
  description: string;
}

export interface RunAgentResult {
  run_id?: string;
  status?: 'started' | 'dry_run_complete';
  dry_run?: boolean;
  proposal?: unknown;
  policy_decision?: unknown;
  run?: unknown;
  plan?: unknown;
}

/* ---------- Response envelope interfaces ---------- */

interface AgentVersionsResponse {
  agent_id: string;
  versions: WireAgentVersion[];
  count: number;
}

/* ---------- Read Endpoints ---------- */

export function listAgents(): Promise<AgentListItem[]> {
  return apiClient.get<{ agents: AgentListItem[]; count: number }>('/v0/agents')
    .then((resp) => resp.agents ?? []);
}

export function getAgent(id: string): Promise<AgentDetail> {
  return apiClient.get<{ agent: AgentDetail }>(`/v0/agents/${id}`)
    .then((resp) => resp.agent);
}

export function listAgentVersions(agentId: string): Promise<AgentVersion[]> {
  return apiClient.get<AgentVersionsResponse>(`/v0/agents/${agentId}/versions`)
    .then((resp) => (resp.versions ?? []).map(mapWireAgentVersion));
}

export function getAgentVersion(agentId: string, version: number): Promise<AgentVersion> {
  return apiClient.get<{ version: WireAgentVersion }>(`/v0/agents/${agentId}/versions/${version}`)
    .then((resp) => mapWireAgentVersion(resp.version));
}

/* ---------- Mutation Endpoints ---------- */

export async function createAgent(data: CreateAgentData): Promise<AgentDetail> {
  const resp = await apiClient.post<{ agent: AgentDetail }>('/v0/agents', data);
  return (resp as any).agent ?? resp;
}

export async function deleteAgent(id: string): Promise<void> {
  return apiClient.delete(`/v0/agents/${id}`);
}

export async function createAgentVersion(agentId: string, specJson: AgentSpec): Promise<AgentVersion> {
  const resp = await apiClient.post<WireAgentVersion | { version: WireAgentVersion }>(
    `/v0/agents/${agentId}/versions`,
    { spec_json: specJson }
  );
  const wire = (resp as { version?: WireAgentVersion }).version ?? (resp as WireAgentVersion);
  return mapWireAgentVersion(wire);
}

export async function validateAgentVersion(agentId: string, version: number): Promise<{ valid: boolean; errors?: string[] }> {
  return apiClient.post(`/v0/agents/${agentId}/versions/${version}/validate`);
}

export async function publishAgentVersion(agentId: string, version: number): Promise<AgentVersion> {
  const resp = await apiClient.post<WireAgentVersion | { version: WireAgentVersion }>(
    `/v0/agents/${agentId}/versions/${version}/publish`
  );
  const wire = (resp as { version?: WireAgentVersion }).version ?? (resp as WireAgentVersion);
  return mapWireAgentVersion(wire);
}

export async function runAgent(
  agentId: string,
  version: number,
  inputs: Record<string, unknown>,
  dryRun?: boolean,
): Promise<RunAgentResult> {
  const url = dryRun
    ? `/v0/agents/${agentId}/versions/${version}/run?dry_run=true`
    : `/v0/agents/${agentId}/versions/${version}/run`;
  return apiClient.post(url, { inputs });
}

/* ---------- LLM Provider Config + Health (Phase E) ---------- */

/** Read-only view of the gateway's active LLM provider config.
 *  Surfaced by GET /v0/agents/llm/config. Never contains an API key. */
export interface LLMProviderConfig {
  provider: string;
  model: string;
  base_url?: string;
  available_providers: string[];
  available_models: Record<string, string[]>;
}

/** Runtime status of the active LLM provider.
 *  Surfaced by GET /v0/agents/llm/health. Cached server-side ~30s. */
export interface LLMProviderHealth {
  provider: string;
  model: string;
  base_url?: string;
  configured: boolean;
  reachable: boolean;
  last_checked_at: string;
  last_error: string | null;
}

export function getLLMConfig(): Promise<LLMProviderConfig> {
  return apiClient.get<LLMProviderConfig>('/v0/agents/llm/config');
}

export function getLLMHealth(): Promise<LLMProviderHealth> {
  return apiClient.get<LLMProviderHealth>('/v0/agents/llm/health');
}
