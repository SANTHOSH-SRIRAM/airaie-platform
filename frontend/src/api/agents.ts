import { apiOrMock, apiClient } from '@api/client';

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
  spec_json: AgentSpec;
  status: 'draft' | 'validated' | 'published';
  created_at: string;
  published_at?: string;
}

// AgentSpec must match the backend agent.AgentSpec struct exactly — strictUnmarshalAgentSpec
// rejects unknown fields. Do NOT add extra fields (e.g. model, llm_weight, reliability).
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
  scoring?: {
    strategy: 'weighted' | 'priority' | 'cost_optimized';
    weights?: { compatibility: number; trust: number; cost: number; latency?: number };
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
  run_id: string;
  status: 'started' | 'dry_run_complete';
  plan?: { steps: string[]; estimated_cost: number; estimated_duration: string };
}

/* ---------- Mock Data ---------- */

const MOCK_AGENTS: AgentDetail[] = [
  {
    id: 'agent_fea_opt',
    name: 'FEA Optimizer',
    description: 'Structural analysis agent that runs FEA simulations, evaluates stress distributions, and recommends topology optimizations for weight reduction.',
    owner: 'santhosh',
    project_id: 'prj_default',
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-04-01T14:30:00Z',
  },
  {
    id: 'agent_design_adv',
    name: 'Design Advisor',
    description: 'Engineering design guidance agent that reviews CAD geometry, checks manufacturability constraints, and suggests DFM improvements.',
    owner: 'santhosh',
    project_id: 'prj_default',
    created_at: '2026-03-18T11:00:00Z',
    updated_at: '2026-03-30T16:45:00Z',
  },
  {
    id: 'agent_thermal',
    name: 'Thermal Analyst',
    description: 'Thermal simulation agent that sets up heat-transfer models, runs steady-state and transient solves, and flags hotspot risks.',
    owner: 'santhosh',
    project_id: 'prj_default',
    created_at: '2026-03-22T08:15:00Z',
    updated_at: '2026-04-02T10:00:00Z',
  },
];

const MOCK_VERSIONS: Record<string, AgentVersion[]> = {
  agent_fea_opt: [
    {
      id: 'ver_fea_3',
      agent_id: 'agent_fea_opt',
      version: 3,
      status: 'published',
      created_at: '2026-04-01T14:30:00Z',
      published_at: '2026-04-01T15:00:00Z',
      spec_json: {
        goal: 'Analyze structural components using FEA, identify stress concentrations, and recommend topology-optimized designs that reduce mass by at least 15% while maintaining factor-of-safety above 2.0.',
        tools: [
          { tool_ref: 'mesh-generator@1.0', permissions: ['read', 'execute'], max_invocations: 3 },
          { tool_ref: 'fea-solver@2.1', permissions: ['read', 'execute'], max_invocations: 5 },
          { tool_ref: 'result-analyzer@1.0', permissions: ['read', 'execute'], max_invocations: 3 },
          { tool_ref: 'material-db@1.2', permissions: ['read'], max_invocations: 10 },
        ],
        scoring: { strategy: 'weighted', llm_weight: 0.3, weights: { compatibility: 0.3, trust: 0.25, cost: 0.2, latency: 0.15, reliability: 0.1 }, min_score_threshold: 0.5, risk_penalty_weight: 0.2 },
        constraints: { max_tools_per_run: 8, timeout_seconds: 600, max_retries: 2, budget_limit: 10.0 },
        policy: {
          auto_approve_threshold: 0.85,
          require_approval_for: ['write', 'high-cost'],
          escalation_rules: [
            { condition: 'cost > 5.0', action: 'require_approval' },
            { condition: 'confidence < 0.6', action: 'escalate_to_human' },
          ],
        },
        model: { provider: 'anthropic', model: 'claude-sonnet' },
      },
    },
    {
      id: 'ver_fea_2',
      agent_id: 'agent_fea_opt',
      version: 2,
      status: 'validated',
      created_at: '2026-03-28T10:00:00Z',
      spec_json: {
        goal: 'Run FEA analysis on structural components and evaluate stress results against material limits.',
        tools: [
          { tool_ref: 'mesh-generator@1.0', permissions: ['read', 'execute'], max_invocations: 2 },
          { tool_ref: 'fea-solver@2.1', permissions: ['read', 'execute'], max_invocations: 3 },
        ],
        scoring: { strategy: 'priority' },
        constraints: { max_tools_per_run: 5, timeout_seconds: 300 },
        policy: { auto_approve_threshold: 0.9 },
        model: { provider: 'anthropic', model: 'claude-sonnet' },
      },
    },
    {
      id: 'ver_fea_1',
      agent_id: 'agent_fea_opt',
      version: 1,
      status: 'draft',
      created_at: '2026-03-15T09:00:00Z',
      spec_json: {
        goal: 'Basic FEA analysis agent.',
        tools: [{ tool_ref: 'fea-solver@2.1', permissions: ['read', 'execute'], max_invocations: 2 }],
        scoring: { strategy: 'priority' },
        constraints: { max_tools_per_run: 3, timeout_seconds: 300 },
        policy: { auto_approve_threshold: 0.95 },
      },
    },
  ],
  agent_design_adv: [
    {
      id: 'ver_design_1',
      agent_id: 'agent_design_adv',
      version: 1,
      status: 'published',
      created_at: '2026-03-18T11:00:00Z',
      published_at: '2026-03-20T09:00:00Z',
      spec_json: {
        goal: 'Review CAD geometry for manufacturability, flag problematic features (thin walls, undercuts, draft angles), and suggest DFM improvements with cost impact estimates.',
        tools: [
          { tool_ref: 'cad-repair@1.3', permissions: ['read', 'execute'], max_invocations: 2 },
          { tool_ref: 'tolerance-analyzer@1.1', permissions: ['read', 'execute'], max_invocations: 3 },
          { tool_ref: 'cost-estimator@1.0', permissions: ['read'], max_invocations: 5 },
        ],
        scoring: { strategy: 'cost_optimized' },
        constraints: { max_tools_per_run: 6, timeout_seconds: 300, max_retries: 1, budget_limit: 5.0 },
        policy: {
          auto_approve_threshold: 0.8,
          require_approval_for: ['write'],
        },
        model: { provider: 'openai', model: 'gpt-4' },
      },
    },
  ],
  agent_thermal: [
    {
      id: 'ver_thermal_1',
      agent_id: 'agent_thermal',
      version: 1,
      status: 'validated',
      created_at: '2026-03-22T08:15:00Z',
      spec_json: {
        goal: 'Set up thermal models from CAD geometry and boundary conditions, run steady-state and transient heat transfer simulations, and identify hotspot regions exceeding material thermal limits.',
        tools: [
          { tool_ref: 'mesh-generator@1.0', permissions: ['read', 'execute'], max_invocations: 2 },
          { tool_ref: 'thermal-solver@2.0', permissions: ['read', 'execute'], max_invocations: 4 },
          { tool_ref: 'result-analyzer@1.0', permissions: ['read', 'execute'], max_invocations: 2 },
          { tool_ref: 'material-db@1.2', permissions: ['read'], max_invocations: 8 },
        ],
        scoring: { strategy: 'weighted', llm_weight: 0.25, weights: { compatibility: 0.45, trust: 0.3, cost: 0.25, latency: 0.0, reliability: 0.0 } },
        constraints: { max_tools_per_run: 10, timeout_seconds: 900, max_retries: 2, budget_limit: 15.0 },
        policy: {
          auto_approve_threshold: 0.88,
          require_approval_for: ['write', 'high-cost'],
          escalation_rules: [
            { condition: 'temperature > critical_limit', action: 'escalate_to_human' },
          ],
        },
        model: { provider: 'anthropic', model: 'claude-opus' },
      },
    },
  ],
};

/* ---------- Response envelope interfaces ---------- */

interface AgentVersionsResponse {
  agent_id: string;
  versions: AgentVersion[];
  count: number;
}

/* ---------- Read Endpoints ---------- */

export function listAgents(): Promise<AgentListItem[]> {
  return apiOrMock<{ agents: AgentListItem[]; count: number }>(
    '/v0/agents',
    { method: 'GET' },
    { agents: MOCK_AGENTS, count: MOCK_AGENTS.length },
  ).then((resp) => resp.agents ?? []);
}

export function getAgent(id: string): Promise<AgentDetail> {
  const mockAgent = MOCK_AGENTS.find((a) => a.id === id) ?? MOCK_AGENTS[0];
  return apiOrMock<{ agent: AgentDetail }>(
    `/v0/agents/${id}`,
    { method: 'GET' },
    { agent: mockAgent },
  ).then((resp) => resp.agent);
}

export function listAgentVersions(agentId: string): Promise<AgentVersion[]> {
  const mockVersions = MOCK_VERSIONS[agentId] ?? [];
  return apiOrMock<AgentVersionsResponse>(
    `/v0/agents/${agentId}/versions`,
    { method: 'GET' },
    { agent_id: agentId, versions: mockVersions, count: mockVersions.length },
  ).then((resp) => resp.versions ?? []);
}

export function getAgentVersion(agentId: string, version: number): Promise<AgentVersion> {
  const agentVersions = MOCK_VERSIONS[agentId] ?? [];
  const mockVersion = agentVersions.find((v) => v.version === version) ?? agentVersions[0];
  return apiOrMock<{ version: AgentVersion }>(
    `/v0/agents/${agentId}/versions/${version}`,
    { method: 'GET' },
    { version: mockVersion },
  ).then((resp) => resp.version);
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
  return apiClient.post(`/v0/agents/${agentId}/versions`, { spec_json: specJson });
}

export async function validateAgentVersion(agentId: string, version: number): Promise<{ valid: boolean; errors?: string[] }> {
  return apiClient.post(`/v0/agents/${agentId}/versions/${version}/validate`);
}

export async function publishAgentVersion(agentId: string, version: number): Promise<AgentVersion> {
  return apiClient.post(`/v0/agents/${agentId}/versions/${version}/publish`);
}

export async function runAgent(
  agentId: string,
  version: number,
  inputs: Record<string, unknown>,
  dryRun?: boolean,
): Promise<RunAgentResult> {
  return apiClient.post(`/v0/agents/${agentId}/versions/${version}/run`, {
    inputs,
    dry_run: dryRun ?? false,
  });
}
