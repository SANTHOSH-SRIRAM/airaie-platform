import type { Tool, ToolVersion, ToolContractFull, ContractValidationResult, TrustLevel, ToolDetail, ToolRunEntry, ToolDetailVersion, ResolutionResult, ResolutionStrategy } from '@/types/tool';
import { apiOrMock, apiClient } from '@api/client';

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

/* ---------- Legacy fetch helper (kept for existing mock data) ---------- */

function fetchOrMock<T>(url: string, mockData: T): Promise<T> {
  return apiOrMock(url, { method: 'GET' }, mockData);
}

const MOCK_TOOLS: Tool[] = [
  {
    id: 'tool_fea',
    name: 'FEA Solver',
    description: 'Finite element stress analysis',
    detailDescription:
      'Finite element analysis for structural stress simulation and validation. Supports linear static and nonlinear analysis modes.',
    icon: 'FlaskConical',
    status: 'published',
    category: 'simulation',
    adapter: 'docker',
    currentVersion: 'v2.1.0',
    versions: [
      { version: 'v2.1.0', status: 'published', publishedAt: '2026-03-30' },
      { version: 'v2.0.0', status: 'published', publishedAt: '2026-03-15' },
      { version: 'v1.0.0', status: 'deprecated', publishedAt: '2026-02-01' },
    ],
    contract: {
      inputs: [
        { name: 'mesh_file', type: 'artifact', required: true },
        { name: 'threshold', type: 'number' },
        { name: 'output_format', type: 'enum {vtk, csv, json}' },
      ],
      outputs: [
        { name: 'result', type: 'artifact' },
        { name: 'metrics', type: 'json' },
      ],
    },
    costPerRun: 0.5,
    usageCount: 47,
    image: 'fea-solver:2.1',
    registry: 'registry.airaie.io',
    limits: { cpu: 4, memoryMb: 2048, timeoutSeconds: 300 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 96,
    avgDurationSeconds: 15,
    tags: ['docker', 'Simulation'],
  },
  {
    id: 'tool_cfd',
    name: 'CFD Engine',
    description: 'Computational fluid dynamics simulation',
    detailDescription:
      'Computational fluid dynamics simulation for internal and external flow analysis with transient solver support.',
    icon: 'Wind',
    status: 'published',
    category: 'simulation',
    adapter: 'docker',
    currentVersion: 'v3.0.0',
    versions: [{ version: 'v3.0.0', status: 'published', publishedAt: '2026-03-20' }],
    contract: {
      inputs: [
        { name: 'geometry', type: 'artifact', required: true },
        { name: 'solver', type: 'string' },
        { name: 'boundary_conditions', type: 'json' },
        { name: 'time_step', type: 'number' },
      ],
      outputs: [
        { name: 'flow_result', type: 'artifact' },
        { name: 'residuals', type: 'json' },
        { name: 'plots', type: 'artifact' },
      ],
    },
    costPerRun: 2,
    usageCount: 23,
    image: 'cfd-engine:3.0',
    registry: 'registry.airaie.io',
    limits: { cpu: 8, memoryMb: 4096, timeoutSeconds: 600 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 92,
    avgDurationSeconds: 83,
    tags: ['docker', 'Simulation'],
  },
  {
    id: 'tool_mesh',
    name: 'Mesh Generator',
    description: 'Automatic mesh generation from CAD geom...',
    detailDescription:
      'Automatic mesh generation from CAD geometry with adaptive quality optimization and element sizing controls.',
    icon: 'Grid2X2',
    status: 'published',
    category: 'meshing',
    adapter: 'docker',
    currentVersion: 'v1.0.0',
    versions: [{ version: 'v1.0.0', status: 'published', publishedAt: '2026-03-10' }],
    contract: {
      inputs: [
        { name: 'geometry', type: 'artifact', required: true },
        { name: 'mesh_size', type: 'number' },
      ],
      outputs: [{ name: 'mesh', type: 'artifact' }],
    },
    costPerRun: 0.3,
    usageCount: 89,
    image: 'mesh-gen:1.0',
    registry: 'registry.airaie.io',
    limits: { cpu: 2, memoryMb: 1024, timeoutSeconds: 120 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 98,
    avgDurationSeconds: 11,
    tags: ['docker', 'Meshing'],
  },
  {
    id: 'tool_matdb',
    name: 'Material Database',
    description: 'Query engineering material properties',
    detailDescription:
      'Query engineering material properties from federated databases with versioned schemas and units normalization.',
    icon: 'Database',
    status: 'published',
    category: 'materials',
    adapter: 'remote-api',
    currentVersion: 'v1.2.0',
    versions: [{ version: 'v1.2.0', status: 'published', publishedAt: '2026-03-25' }],
    contract: {
      inputs: [{ name: 'material', type: 'string', required: true }],
      outputs: [{ name: 'properties', type: 'json' }],
    },
    costPerRun: 0.01,
    usageCount: 156,
    image: 'material-db:1.2',
    registry: 'registry.airaie.io',
    limits: { cpu: 1, memoryMb: 256, timeoutSeconds: 30 },
    sandboxNetwork: 'allow',
    filesystemMode: 'readonly',
    successRate: 99,
    avgDurationSeconds: 2,
    tags: ['remote-api', 'Materials'],
  },
  {
    id: 'tool_result',
    name: 'Result Analyzer',
    description: 'Post-processing of simulation results',
    detailDescription:
      'Post-processing and analysis of simulation results with report generation, chart extraction, and anomaly summaries.',
    icon: 'BarChart3',
    status: 'published',
    category: 'analysis',
    adapter: 'python',
    currentVersion: 'v1.0.0',
    versions: [{ version: 'v1.0.0', status: 'published', publishedAt: '2026-03-12' }],
    contract: {
      inputs: [
        { name: 'result', type: 'artifact', required: true },
        { name: 'template', type: 'string' },
      ],
      outputs: [
        { name: 'report', type: 'artifact' },
        { name: 'summary', type: 'json' },
      ],
    },
    costPerRun: 0.1,
    usageCount: 34,
    image: 'result-analyzer:1.0',
    registry: 'registry.airaie.io',
    limits: { cpu: 2, memoryMb: 512, timeoutSeconds: 60 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 95,
    avgDurationSeconds: 18,
    tags: ['python', 'Analysis'],
  },
  {
    id: 'tool_topo',
    name: 'Topology Optimizer',
    description: 'Density-based topology optimization',
    detailDescription:
      'Generative topology optimization using density-based methods for lightweight structural design exploration.',
    icon: 'Box',
    status: 'draft',
    category: 'simulation',
    adapter: 'docker',
    currentVersion: 'v0.1.0',
    versions: [{ version: 'v0.1.0', status: 'draft', publishedAt: '2026-03-28' }],
    contract: {
      inputs: [
        { name: 'geometry', type: 'artifact', required: true },
        { name: 'constraints', type: 'json' },
        { name: 'load_cases', type: 'json' },
      ],
      outputs: [
        { name: 'optimized', type: 'artifact' },
        { name: 'report', type: 'json' },
      ],
    },
    costPerRun: 5,
    usageCount: 0,
    image: 'topo-opt:0.1',
    registry: 'registry.airaie.io',
    limits: { cpu: 8, memoryMb: 8192, timeoutSeconds: 900 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 0,
    avgDurationSeconds: 0,
    tags: ['docker', 'Simulation'],
  },
  {
    id: 'tool_tolerance',
    name: 'Tolerance Analyzer',
    description: 'Geometric tolerance analysis for GD&T',
    detailDescription:
      'Geometric tolerance analysis for GD&T stacks with Monte Carlo estimates and manufacturability checks.',
    icon: 'Paperclip',
    status: 'published',
    category: 'analysis',
    adapter: 'docker',
    currentVersion: 'v1.1.0',
    versions: [{ version: 'v1.1.0', status: 'published', publishedAt: '2026-03-18' }],
    contract: {
      inputs: [
        { name: 'drawing', type: 'artifact', required: true },
        { name: 'stack_definition', type: 'json' },
      ],
      outputs: [{ name: 'analysis', type: 'json' }],
    },
    costPerRun: 0.22,
    usageCount: 21,
    image: 'tolerance-analyzer:1.1',
    registry: 'registry.airaie.io',
    limits: { cpu: 2, memoryMb: 512, timeoutSeconds: 90 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 94,
    avgDurationSeconds: 9,
    tags: ['docker', 'Analysis'],
  },
  {
    id: 'tool_thermal',
    name: 'Thermal Solver',
    description: 'Heat transfer and thermal stress simulation',
    detailDescription:
      'Heat transfer and thermal stress simulation with steady-state and transient conduction models.',
    icon: 'Thermometer',
    status: 'published',
    category: 'simulation',
    adapter: 'docker',
    currentVersion: 'v2.0.0',
    versions: [{ version: 'v2.0.0', status: 'published', publishedAt: '2026-03-08' }],
    contract: {
      inputs: [
        { name: 'geometry', type: 'artifact', required: true },
        { name: 'material_map', type: 'json' },
        { name: 'thermal_loads', type: 'json' },
      ],
      outputs: [
        { name: 'temperature_field', type: 'artifact' },
        { name: 'stress_summary', type: 'json' },
      ],
    },
    costPerRun: 1.7,
    usageCount: 18,
    image: 'thermal-solver:2.0',
    registry: 'registry.airaie.io',
    limits: { cpu: 6, memoryMb: 3072, timeoutSeconds: 420 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 93,
    avgDurationSeconds: 56,
    tags: ['docker', 'Simulation'],
  },
  {
    id: 'tool_cost',
    name: 'Cost Estimator',
    description: 'Manufacturing cost estimation from CAD fea...',
    detailDescription:
      'Manufacturing cost estimation from CAD features, setup assumptions, and regional process libraries.',
    icon: 'Calculator',
    status: 'published',
    category: 'analysis',
    adapter: 'remote-api',
    currentVersion: 'v1.0.0',
    versions: [{ version: 'v1.0.0', status: 'published', publishedAt: '2026-03-09' }],
    contract: {
      inputs: [
        { name: 'geometry', type: 'artifact', required: true },
        { name: 'process', type: 'string' },
      ],
      outputs: [{ name: 'estimate', type: 'json' }],
    },
    costPerRun: 0.18,
    usageCount: 12,
    image: 'cost-estimator:1.0',
    registry: 'registry.airaie.io',
    limits: { cpu: 2, memoryMb: 512, timeoutSeconds: 45 },
    sandboxNetwork: 'allow',
    filesystemMode: 'readonly',
    successRate: 97,
    avgDurationSeconds: 4,
    tags: ['remote-api', 'Analysis'],
  },
  {
    id: 'tool_unit',
    name: 'Unit Converter',
    description: 'Cross-domain engineering unit conversion',
    detailDescription:
      'Cross-domain engineering unit conversion and normalization for imported datasets and reports.',
    icon: 'Scale',
    status: 'published',
    category: 'utilities',
    adapter: 'wasm',
    currentVersion: 'v1.4.0',
    versions: [{ version: 'v1.4.0', status: 'published', publishedAt: '2026-03-17' }],
    contract: {
      inputs: [{ name: 'payload', type: 'json', required: true }],
      outputs: [{ name: 'normalized', type: 'json' }],
    },
    costPerRun: 0.02,
    usageCount: 61,
    image: 'unit-converter:1.4',
    registry: 'registry.airaie.io',
    limits: { cpu: 1, memoryMb: 256, timeoutSeconds: 20 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 99,
    avgDurationSeconds: 1,
    tags: ['wasm', 'Utilities'],
  },
  {
    id: 'tool_surrogate',
    name: 'Surrogate Predictor',
    description: 'ML-assisted performance prediction',
    detailDescription:
      'ML-assisted performance prediction for early design screening with explainable regression outputs.',
    icon: 'BrainCircuit',
    status: 'draft',
    category: 'ml-ai',
    adapter: 'python',
    currentVersion: 'v0.5.0',
    versions: [{ version: 'v0.5.0', status: 'draft', publishedAt: '2026-03-26' }],
    contract: {
      inputs: [
        { name: 'features', type: 'json', required: true },
        { name: 'model_profile', type: 'string' },
      ],
      outputs: [
        { name: 'prediction', type: 'json' },
        { name: 'feature_importance', type: 'json' },
      ],
    },
    costPerRun: 0.35,
    usageCount: 5,
    image: 'surrogate-predictor:0.5',
    registry: 'registry.airaie.io',
    limits: { cpu: 2, memoryMb: 1024, timeoutSeconds: 75 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 88,
    avgDurationSeconds: 7,
    tags: ['python', 'ML / AI'],
  },
  {
    id: 'tool_legacy_mesher',
    name: 'Legacy Mesher',
    description: 'Compatibility meshing for archived studies',
    detailDescription:
      'Compatibility meshing adapter for archived studies and legacy solver pipelines retained for migration support.',
    icon: 'Archive',
    status: 'deprecated',
    category: 'meshing',
    adapter: 'docker',
    currentVersion: 'v0.9.4',
    versions: [{ version: 'v0.9.4', status: 'deprecated', publishedAt: '2026-02-22' }],
    contract: {
      inputs: [
        { name: 'geometry', type: 'artifact', required: true },
        { name: 'preset', type: 'string' },
      ],
      outputs: [{ name: 'mesh', type: 'artifact' }],
    },
    costPerRun: 0.4,
    usageCount: 4,
    image: 'legacy-mesher:0.9.4',
    registry: 'registry.airaie.io',
    limits: { cpu: 2, memoryMb: 768, timeoutSeconds: 180 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 84,
    avgDurationSeconds: 29,
    tags: ['docker', 'Meshing'],
  },
  {
    id: 'tool_cad_repair',
    name: 'CAD Repair',
    description: 'Automatic geometry healing and cleanup',
    detailDescription:
      'Automatic geometry healing, face stitching, and tolerance cleanup for imported solids and surfaces.',
    icon: 'Combine',
    status: 'published',
    category: 'meshing',
    adapter: 'wasm',
    currentVersion: 'v1.3.0',
    versions: [{ version: 'v1.3.0', status: 'published', publishedAt: '2026-03-14' }],
    contract: {
      inputs: [{ name: 'geometry', type: 'artifact', required: true }],
      outputs: [{ name: 'repaired_geometry', type: 'artifact' }],
    },
    costPerRun: 0.08,
    usageCount: 27,
    image: 'cad-repair:1.3',
    registry: 'registry.airaie.io',
    limits: { cpu: 1, memoryMb: 768, timeoutSeconds: 50 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 97,
    avgDurationSeconds: 6,
    tags: ['wasm', 'Meshing'],
  },
  {
    id: 'tool_compliance',
    name: 'Compliance Checker',
    description: 'Standards and rule compliance validation',
    detailDescription:
      'Standards and internal rule compliance validation for simulations, reports, and release checklists.',
    icon: 'ShieldCheck',
    status: 'published',
    category: 'utilities',
    adapter: 'python',
    currentVersion: 'v1.1.0',
    versions: [{ version: 'v1.1.0', status: 'published', publishedAt: '2026-03-11' }],
    contract: {
      inputs: [
        { name: 'artifact', type: 'artifact', required: true },
        { name: 'ruleset', type: 'string' },
      ],
      outputs: [{ name: 'compliance_report', type: 'json' }],
    },
    costPerRun: 0.12,
    usageCount: 9,
    image: 'compliance-checker:1.1',
    registry: 'registry.airaie.io',
    limits: { cpu: 2, memoryMb: 512, timeoutSeconds: 40 },
    sandboxNetwork: 'deny',
    filesystemMode: 'sandbox',
    successRate: 98,
    avgDurationSeconds: 5,
    tags: ['python', 'Utilities'],
  },
];

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
  const res = await fetchOrMock<unknown>('/v0/tools', MOCK_TOOLS);
  const raw: unknown[] = Array.isArray(res)
    ? res
    : (res as { tools?: unknown[] }).tools ?? [];
  return raw.map((t) => normalizeToolFromAPI(t as Record<string, unknown>));
};

export const fetchTool = async (id: string): Promise<Tool> => {
  const mockFallback = MOCK_TOOLS.find((tool) => tool.id === id) ?? MOCK_TOOLS[0];
  const res = await fetchOrMock<unknown>(`/v0/tools/${id}`, mockFallback);
  const raw = ((res as { tool?: unknown }).tool ?? res) as Record<string, unknown>;
  return normalizeToolFromAPI(raw);
};

export async function fetchToolVersions(toolId: string): Promise<ToolVersion[]> {
  const res = await apiOrMock<ToolVersion[] | { versions: ToolVersion[] }>(
    `/v0/tools/${toolId}/versions`, { method: 'GET' }, []
  );
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
