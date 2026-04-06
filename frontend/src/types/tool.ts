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
