import type { Tool, ToolVersion, ToolContractFull, ContractValidationResult, TrustLevel, ToolDetail, ToolRunEntry, ToolDetailVersion, ResolutionResult, ResolutionStrategy } from '@/types/tool';
import { apiClient } from '@api/client';

/* ---------- Resolution / shelf types ---------- */

export interface ToolShelfEntry {
  tool_id: string;
  tool_version: string;
  name: string;
  trust_level: string;
  cost_estimate: number;
  time_estimate: string;
  match_reasons: string[];
  success_rate: number;
  confidence: number;
  score: number;
}

export interface UnavailableEntry {
  tool_id: string;
  name: string;
  reason: string;
  action: string;
  filter_stage: string;
}

export interface ToolResolutionResult {
  recommended: ToolShelfEntry | null;
  alternatives: ToolShelfEntry[];
  unavailable: UnavailableEntry[];
  resolved_at: string;
  intent_type: string;
}

/* ---------- Existing read endpoints ---------- */

function normalizeToolFromAPI(raw: Record<string, unknown>): Tool {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description as string) ?? '',
    icon: (raw.icon as string) ?? 'wrench',
    status: (raw.status as Tool['status']) ?? 'draft',
    category: (raw.category as Tool['category']) ?? 'utilities',
    adapter: (raw.adapter as Tool['adapter']) ?? 'docker',
    currentVersion: (raw.current_version as string) ?? '',
    versions: (raw.versions as Tool['versions']) ?? [],
    contract: (raw.contract as Tool['contract']) ?? { inputs: [], outputs: [] },
    costPerRun: (raw.cost_per_run as number) ?? 0,
    usageCount: (raw.usage_count as number) ?? 0,
    image: (raw.image as string) ?? '',
    registry: (raw.registry as string) ?? '',
    limits: (raw.limits as Tool['limits']) ?? { cpu: 2, memoryMb: 1024, timeoutSeconds: 120 },
    sandboxNetwork: (raw.sandbox_network as Tool['sandboxNetwork']) ?? 'deny',
    tags: (raw.tags as string[]) ?? [],
  };
}

export const fetchTools = async (): Promise<Tool[]> => {
  const res = await apiClient.get<unknown>('/v0/tools');
  const raw: unknown[] = Array.isArray(res)
    ? res
    : (res as { tools?: unknown[] }).tools ?? [];
  return raw.map((t) => normalizeToolFromAPI(t as Record<string, unknown>));
};

export const fetchTool = async (id: string): Promise<Tool> => {
  const res = await apiClient.get<unknown>(`/v0/tools/${id}`);
  const raw = ((res as { tool?: unknown }).tool ?? res) as Record<string, unknown>;
  return normalizeToolFromAPI(raw);
};

export async function fetchToolVersions(toolId: string): Promise<ToolVersion[]> {
  const res = await apiClient.get<ToolVersion[] | { versions: ToolVersion[] }>(`/v0/tools/${toolId}/versions`);
  return Array.isArray(res) ? res : (res as { versions: ToolVersion[] }).versions ?? [];
}

/* ---------- Mutation endpoints ---------- */

export async function createTool(data: { name: string; description: string; owner?: string }): Promise<Tool> {
  const res = await apiClient.post<{ tool: Record<string, unknown> }>('/v0/tools', data);
  return normalizeToolFromAPI((res as { tool: Record<string, unknown> }).tool ?? (res as unknown as Record<string, unknown>));
}

export async function createToolVersion(
  toolId: string,
  data: { version: string; contract: Record<string, unknown> },
): Promise<ToolVersion> {
  return apiClient.post(`/v0/tools/${toolId}/versions`, data);
}

export async function publishToolVersion(toolId: string, version: string): Promise<void> {
  return apiClient.post(`/v0/tools/${toolId}/versions/${version}/publish`);
}

export async function deprecateToolVersion(toolId: string, version: string, message: string): Promise<void> {
  return apiClient.post(`/v0/tools/${toolId}/versions/${version}/deprecate`, { message });
}

export async function resolveTools(
  data: { intent_type: string; inputs?: unknown[]; constraints?: Record<string, unknown> },
): Promise<ToolResolutionResult> {
  return apiClient.post('/v0/toolshelf/resolve', data);
}

export async function validateToolInputs(
  toolId: string,
  version: string,
  inputs: Record<string, unknown>,
): Promise<{ valid: boolean; errors?: string[] }> {
  return apiClient.post(`/v0/tools/${toolId}/versions/${version}/validate-inputs`, {
    inputs_json: JSON.stringify(inputs),
  });
}

/* ---------- Contract validation & trust (Sprint 1.1) ---------- */

export async function validateContract(
  contract: ToolContractFull,
  checkPublish?: boolean,
): Promise<ContractValidationResult> {
  return apiClient.post('/v0/validate/contract', { contract, check_publish: checkPublish });
}

export async function updateTrustLevel(
  toolId: string,
  version: string,
  trustLevel: TrustLevel,
): Promise<ToolVersion> {
  return apiClient.patch(`/v0/tools/${toolId}/versions/${version}/trust-level`, { trust_level: trustLevel });
}

/* ---------- Tool Detail (Sprint 1.2) ---------- */

function buildToolDetail(tool: Tool): ToolDetail {
  return {
    ...tool,
    trust_level: tool.status === 'published' ? 'verified' : 'untested',
    supported_intents: ['simulate', 'analyze', 'validate'],
    domain_tags: tool.tags,
    owner: 'Santhosh',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-03-30T00:00:00Z',
  };
}

function buildToolDetailVersions(tool: Tool): ToolDetailVersion[] {
  return tool.versions.map((v, i) => ({
    version: v.version,
    status: v.status,
    trust_level: v.status === 'published' ? 'verified' as TrustLevel : 'untested' as TrustLevel,
    published_at: v.publishedAt,
    run_count: Math.max(0, tool.usageCount - i * 10),
  }));
}

function buildToolRuns(tool: Tool): ToolRunEntry[] {
  const statuses: ToolRunEntry['status'][] = ['succeeded', 'succeeded', 'failed', 'succeeded', 'running'];
  return statuses.map((status, i) => ({
    run_id: `run_${tool.id}_${i + 1}`,
    tool_id: tool.id,
    version: tool.currentVersion,
    status,
    duration: status === 'running' ? 0 : Math.round(Math.random() * 60 + 5),
    cost: status === 'running' ? 0 : +(tool.costPerRun * (0.8 + Math.random() * 0.4)).toFixed(2),
    created_at: new Date(Date.now() - i * 3_600_000).toISOString(),
  }));
}

export const fetchToolDetail = async (id: string): Promise<ToolDetail> => {
  const res = await apiClient.get<{ tool: Record<string, unknown>; versions: Array<Record<string, unknown>> }>(`/v0/tools/${id}`);
  const raw = res.tool;
  const latestVersion = res.versions?.[0];

  // Parse contract from the latest version's contract JSON
  let contract: Tool['contract'] = { inputs: [], outputs: [] };
  let adapter: Tool['adapter'] = 'docker';
  let image = '';
  let limits: Tool['limits'] = { cpu: 2, memoryMb: 1024, timeoutSeconds: 120 };
  let sandboxNetwork: Tool['sandboxNetwork'] = 'deny';

  if (latestVersion?.contract) {
    try {
      let contractStr = latestVersion.contract as string;
      // Backend stores contract as base64-encoded JSON
      if (typeof contractStr === 'string' && !contractStr.startsWith('{')) {
        try { contractStr = atob(contractStr); } catch { /* not base64, try as-is */ }
      }
      const contractJson = typeof contractStr === 'string'
        ? JSON.parse(contractStr)
        : latestVersion.contract;

      // Extract interface (inputs/outputs)
      const iface = contractJson?.interface ?? contractJson;
      if (iface?.inputs) contract.inputs = iface.inputs;
      if (iface?.outputs) contract.outputs = iface.outputs;

      // Extract runtime
      const runtime = contractJson?.runtime;
      if (runtime?.adapter) adapter = runtime.adapter;
      if (runtime?.docker?.image) image = runtime.docker.image;
      if (runtime?.resources) {
        limits = {
          cpu: runtime.resources.cpu_cores ?? runtime.resources.cpu ?? 2,
          memoryMb: runtime.resources.memory_mb ?? 1024,
          timeoutSeconds: runtime.resources.timeout_seconds ?? runtime.timeout_seconds ?? 120,
        };
      }

      // Extract sandbox policy
      const governance = contractJson?.governance;
      if (governance?.sandbox?.network) sandboxNetwork = governance.sandbox.network;
    } catch {
      // keep defaults
    }
  }

  return {
    ...normalizeToolFromAPI(raw),
    adapter: adapter as Tool['adapter'],
    image,
    limits,
    sandboxNetwork,
    contract,
    currentVersion: (latestVersion?.version as string) ?? '',
    status: (latestVersion?.status as Tool['status']) ?? 'draft',
    trust_level: (latestVersion?.trust_level as TrustLevel) ?? 'untested',
    supported_intents: [],
    domain_tags: (raw.domain_tags as string[]) ?? [],
    owner: (raw.owner as string) ?? '',
    created_at: (raw.created_at as string) ?? '',
    updated_at: (raw.updated_at as string) ?? '',
  } as ToolDetail;
};

export const fetchToolDetailVersions = async (toolId: string): Promise<ToolDetailVersion[]> => {
  const res = await apiClient.get<{ versions: ToolDetailVersion[] }>(`/v0/tools/${toolId}/versions`);
  return res.versions ?? [];
};

export const fetchToolRuns = async (toolId: string): Promise<ToolRunEntry[]> => {
  const res = await apiClient.get<{ runs: Array<Record<string, unknown>> | null }>(`/v0/runs?tool_id=${toolId}&limit=20`);
  return (res.runs ?? []).map((r) => {
    const toolRef = (r.tool_ref as string) ?? '';
    const version = toolRef.includes('@') ? toolRef.split('@')[1] : '';
    return {
      run_id: (r.id as string) ?? (r.run_id as string) ?? '',
      tool_id: toolId,
      version,
      status: ((r.status as string) ?? 'pending').toLowerCase() as ToolRunEntry['status'],
      duration: (r.duration_seconds as number) ?? 0,
      cost: (r.cost_actual as number) ?? 0,
      created_at: (r.created_at as string) ?? new Date().toISOString(),
      inputs: r.inputs as Record<string, unknown> | undefined,
      outputs: r.outputs as Record<string, unknown> | undefined,
    };
  });
};

export async function createToolRun(
  toolId: string,
  version: string,
  inputs: Record<string, unknown>,
): Promise<ToolRunEntry> {
  const tool_ref = `${toolId}@${version}`;
  const res = await apiClient.post<{ run: { id: string; status: string; created_at: string } }>(
    '/v0/runs',
    { tool_ref, inputs }
  );
  const run = (res as any).run ?? res;
  return {
    run_id: run.id ?? `run_${Date.now()}`,
    tool_id: toolId,
    version,
    status: (run.status?.toLowerCase() as ToolRunEntry['status']) ?? 'running',
    duration: 0,
    cost: 0,
    created_at: run.created_at ?? new Date().toISOString(),
    inputs,
  };
}

export async function updateTool(
  id: string,
  data: { name?: string; description?: string; owner?: string; domain_tags?: string[] },
): Promise<Tool> {
  const res = await apiClient.put<{ tool: Record<string, unknown> }>(`/v0/tools/${id}`, data);
  const raw = (res as any).tool ?? res;
  return normalizeToolFromAPI(raw as Record<string, unknown>);
}

/* ---------- Tool Shelf Resolution (Sprint 1.3) ---------- */

export async function resolveToolShelf(
  intentType: string,
  strategy?: ResolutionStrategy,
  context?: Record<string, unknown>,
): Promise<ResolutionResult> {
  return apiClient.post('/v0/toolshelf/resolve', {
    intent_type: intentType,
    strategy,
    context,
  });
}

export async function resolveToolShelfV2(
  pipeline: {
    steps: Array<{
      step_id: string;
      intent_type: string;
      input_types: Array<{ name: string; type: string }>;
      output_types: Array<{ name: string; type: string }>;
    }>;
  },
  strategy?: ResolutionStrategy,
): Promise<unknown> {
  return apiClient.post('/v0/toolshelf/v2/resolve', { pipeline, strategy });
}

export async function explainResolution(resolutionId: string): Promise<unknown> {
  return apiClient.get(`/v0/toolshelf/resolutions/${resolutionId}/explain`);
}
