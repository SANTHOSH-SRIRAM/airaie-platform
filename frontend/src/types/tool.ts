export type ToolStatus = 'published' | 'draft' | 'deprecated';
export type ToolCategory = 'simulation' | 'meshing' | 'analysis' | 'materials' | 'ml-ai' | 'utilities';
export type ToolAdapter = 'docker' | 'python' | 'wasm' | 'remote-api';

export interface ToolVersion {
  version: string;
  status: ToolStatus;
  publishedAt: string;
}

export interface ToolContractField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

export interface ToolContract {
  inputs: ToolContractField[];
  outputs: ToolContractField[];
}

export interface ToolLimits {
  cpu: number;
  memoryMb: number;
  timeoutSeconds: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  detailDescription?: string;
  icon: string;
  status: ToolStatus;
  category: ToolCategory;
  adapter: ToolAdapter;
  currentVersion: string;
  versions: ToolVersion[];
  contract: ToolContract;
  costPerRun: number;
  usageCount: number;
  image: string;
  registry: string;
  limits: ToolLimits;
  sandboxNetwork: 'deny' | 'allow';
  filesystemMode?: 'sandbox' | 'readonly' | 'shared';
  successRate?: number;
  avgDurationSeconds?: number;
  tags: string[];
}

export interface ToolFilter {
  status: ToolStatus[];
  category: ToolCategory[];
  adapter: ToolAdapter[];
  search: string;
  sortBy: 'name' | 'usage' | 'cost' | 'recent';
}

/* ---------- Trust & Contract (Sprint 1.1) ---------- */

export type TrustLevel = 'untested' | 'community' | 'tested' | 'verified' | 'certified';

export interface ToolContractFull {
  metadata: { tool_id: string; name: string; description: string; version: string; domain_tags: string[] };
  interface: { inputs: ToolContractField[]; outputs: ToolContractField[] };
  runtime: { adapter: string; image?: string; resources: { cpu: number; memory_mb: number; timeout_seconds: number } };
  capabilities: { supported_intents: string[]; version_compatibility?: string };
  governance: { sandbox: { network: 'deny' | 'allow'; filesystem: 'sandbox' | 'readonly' | 'shared'; pids_limit: number }; license?: string; owner: string };
  testing: { test_cases: Array<{ name: string; inputs: Record<string, unknown>; expected_outputs: Record<string, unknown> }>; test_timeout?: number };
  documentation: { description: string; usage_example?: string };
}

export interface LintCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export interface ContractValidationResult {
  valid: boolean;
  sections: Record<string, {
    valid: boolean;
    errors: Array<{ field: string; code: string; message: string }>;
    warnings: Array<{ field: string; code: string; message: string }>;
  }>;
  lint: { checks: LintCheck[]; passed: boolean; error_count: number; warning_count: number };
}

/* ---------- Tool Detail (Sprint 1.2) ---------- */

export interface ToolDetailVersion {
  version: string;
  status: ToolStatus;
  trust_level: TrustLevel;
  published_at: string;
  run_count: number;
}

export interface ToolRunEntry {
  run_id: string;
  tool_id: string;
  version: string;
  status: 'running' | 'succeeded' | 'failed' | 'cancelled';
  duration: number;
  cost: number;
  created_at: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

export interface ToolDetail extends Tool {
  trust_level: TrustLevel;
  supported_intents: string[];
  domain_tags: string[];
  owner: string;
  created_at: string;
  updated_at: string;
}

export type ToolRegistryViewMode = 'grid' | 'table';

/* ---------- Tool Shelf Resolution (Sprint 1.3) ---------- */

export type ResolutionStrategy = 'weighted' | 'priority' | 'cost_optimized';

export interface ScoreBreakdown {
  trust_contribution: number;
  success_contribution: number;
  intent_contribution: number;
  preference_contribution: number;
  cost_penalty: number;
  time_penalty: number;
  total: number;
}

export interface RankedTool {
  tool_id: string;
  tool_version: string;
  name: string;
  trust_level: TrustLevel;
  success_rate: number;
  cost_estimate: number;
  time_estimate: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  match_reasons: string[];
  confidence: number;
}

export interface FilteredTool {
  tool_id: string;
  name: string;
  reason: string;
  message: string;
  filter_stage: string;
  suggested_action: string;
}

export interface ResolutionResult {
  resolution_id: string;
  intent_type: string;
  strategy: string;
  metadata: { total_discovered: number; total_filtered_out: number; total_ranked: number; resolution_time_ms: number };
  recommended: RankedTool | null;
  alternatives: RankedTool[];
  unavailable_with_reasons: FilteredTool[];
}
