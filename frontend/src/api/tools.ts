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

/* ---------- Live manifest validation (Phase C2) ---------- */

/**
 * Flattened validation issue used by the live form validator.
 * `path` is a dotted JSON path (e.g. `metadata.name` or `interface.inputs.0.name`)
 * pointing into the manifest object.
 */
export interface ContractValidationIssue {
  path?: string;
  code?: string;
  message: string;
}

/**
 * Simplified shape the Register Tool form consumes. Bridges the rich
 * 7-section + lint result returned by `POST /v0/validate/contract` into a
 * flat list of errors + warnings.
 */
export interface ContractValidation {
  valid: boolean;
  errors: ContractValidationIssue[];
  warnings: ContractValidationIssue[];
}

/**
 * Convert the rich backend response (sections + lint) into the flat
 * `{ valid, errors, warnings }` shape used by the form. Each section
 * contributes errors/warnings; lint check failures contribute too.
 */
export function toContractValidation(result: ContractValidationResult | null | undefined): ContractValidation {
  if (!result) return { valid: false, errors: [], warnings: [] };
  const errors: ContractValidationIssue[] = [];
  const warnings: ContractValidationIssue[] = [];

  // Section-level issues
  for (const [section, data] of Object.entries(result.sections ?? {})) {
    for (const e of data.errors ?? []) {
      errors.push({
        path: e.field ? `${section}.${e.field}` : section,
        code: e.code,
        message: e.message,
      });
    }
    for (const w of data.warnings ?? []) {
      warnings.push({
        path: w.field ? `${section}.${w.field}` : section,
        code: w.code,
        message: w.message,
      });
    }
  }

  // Lint check results
  for (const check of result.lint?.checks ?? []) {
    if (check.status === 'fail') {
      errors.push({ code: check.name, message: check.message });
    } else if (check.status === 'warn') {
      warnings.push({ code: check.name, message: check.message });
    }
  }

  return { valid: !!result.valid, errors, warnings };
}

/**
 * Live-validate a manifest object against `POST /v0/validate/contract`.
 * Returns the flat shape consumed by the Register Tool form.
 *
 * The manifest is forwarded as the unwrapped contract body — the backend
 * accepts both wrapped (`{contract: ...}`) and unwrapped forms; we send it
 * wrapped so it always parses regardless of contract shape.
 */
export async function validateContractLive(manifest: unknown): Promise<ContractValidation> {
  const result = await apiClient.post<ContractValidationResult>('/v0/validate/contract', {
    contract: manifest,
  });
  return toContractValidation(result);
}

/**
 * Register a tool from a (validated) manifest. Performs the two-step
 * Airaie kernel flow under the hood:
 *   1. POST /v0/tools           -> creates the tool record (name, description)
 *   2. POST /v0/tools/{id}/versions -> attaches the contract as version 0.1.0
 *
 * Returns the resulting `{ tool_id, version }` so the caller can route to
 * the new tool's detail page.
 */
export async function registerTool(manifest: unknown): Promise<{ tool_id: string; version: string }> {
  const m = (manifest ?? {}) as Record<string, unknown>;
  const metadata = (m.metadata ?? {}) as Record<string, unknown>;
  const name = (metadata.name as string) ?? (m.name as string) ?? '';
  const description = (metadata.description as string) ?? (m.description as string) ?? '';
  const owner = (metadata.owner as string) ?? undefined;
  const version = (metadata.version as string) ?? '0.1.0';

  if (!name) {
    throw new Error('Manifest is missing metadata.name');
  }

  const tool = await createTool({ name, description, owner });
  await createToolVersion(tool.id, { version, contract: m });
  return { tool_id: tool.id, version };
}

/**
 * Locate a validation issue by form-field path. Matches an exact path or a
 * prefix (so `metadata` matches `metadata.name`, etc). Used to attach inline
 * errors to specific structured-form fields.
 */
export function manifestErrorByField(
  issues: ContractValidationIssue[],
  fieldPath: string,
): ContractValidationIssue | undefined {
  if (!fieldPath) return undefined;
  // Exact match wins over prefix match.
  const exact = issues.find((i) => i.path === fieldPath);
  if (exact) return exact;
  return issues.find((i) => i.path && (i.path === fieldPath || i.path.startsWith(`${fieldPath}.`)));
}

/**
 * Update the trust level of a tool version. The kernel enforces strict
 * forward progression (untested → community → tested → verified → certified)
 * — sending a non-forward step returns an error which the UI surfaces.
 *
 * NOTE: the kernel handler currently accepts only `trust_level` in the
 * request body. `rationale` is collected by the UI for audit/UX purposes
 * but is not yet forwarded to the backend; this signature reserves the
 * parameter so the wiring is in place when the kernel adds rationale support.
 */
export async function updateTrustLevel(
  toolId: string,
  version: string,
  trustLevel: TrustLevel,
  rationale?: string,
): Promise<ToolVersion> {
  const body: Record<string, unknown> = { trust_level: trustLevel };
  if (rationale && rationale.trim().length > 0) {
    body.rationale = rationale.trim();
  }
  return apiClient.patch(`/v0/tools/${toolId}/versions/${version}/trust-level`, body);
}

/* ---------- Tool Detail (Sprint 1.2) ---------- */

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

/**
 * Decode the kernel's contract field into a plain object (ATP manifest).
 * The Go API marshals `contract_json` ([]byte) as a base64 string. We accept
 * either a pre-parsed object, a JSON string, or a base64 JSON string and
 * return `undefined` on any failure so callers can render an empty state.
 */
export function decodeManifest(raw: unknown): unknown | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { return undefined; }
  }
  try {
    return JSON.parse(atob(raw));
  } catch {
    return undefined;
  }
}

export const fetchToolDetailVersions = async (toolId: string): Promise<ToolDetailVersion[]> => {
  const res = await apiClient.get<{ versions: Array<Record<string, unknown>> | null }>(`/v0/tools/${toolId}/versions`);
  const versions = res.versions ?? [];
  return versions.map((v) => ({
    version: (v.version as string) ?? '',
    status: (v.status as ToolDetailVersion['status']) ?? 'draft',
    trust_level: (v.trust_level as TrustLevel) ?? 'untested',
    published_at: (v.published_at as string) ?? (v.created_at as string) ?? '',
    run_count: (v.run_count as number) ?? 0,
    manifest: decodeManifest(v.contract),
  }));
};

/**
 * Fetch the parsed ATP manifest for a specific tool version. The kernel
 * embeds the manifest inline in `/v0/tools/{id}/versions` (no separate
 * endpoint), so we read from that list. Pass `version` to pick a specific
 * version; omit to get the latest (first) one.
 */
export async function getToolManifest(toolId: string, version?: string): Promise<unknown> {
  const versions = await fetchToolDetailVersions(toolId);
  if (versions.length === 0) return undefined;
  if (!version) return versions[0]?.manifest;
  return versions.find((v) => v.version === version)?.manifest;
}

export const fetchToolRuns = async (toolId: string): Promise<ToolRunEntry[]> => {
  const res = await apiClient.get<{ runs: Array<Record<string, unknown>> | null }>(`/v0/tools/${toolId}/runs?limit=20`);
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
