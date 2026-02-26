export interface Agent {
  id: string;
  name: string;
  description?: string;
  type: 'design' | 'analysis' | 'optimization' | 'automation' | 'custom';
  status: 'active' | 'inactive' | 'error';
  icon?: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  usageCount: number;
  config: AgentConfig;
  capabilities: string[];
  isPublic: boolean;
}

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: AgentTool[];
  parameters?: Record<string, AgentParameter>;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

export interface AgentParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'file';
  label: string;
  description?: string;
  required: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  type: Agent['type'];
  config?: Partial<AgentConfig>;
  isPublic?: boolean;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
  config?: Partial<AgentConfig>;
  isPublic?: boolean;
}

export interface AgentListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: Agent['type'] | 'all';
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AgentRunRequest {
  input: string;
  parameters?: Record<string, unknown>;
  projectId?: string;
}

export interface AgentRunResponse {
  id: string;
  agentId: string;
  status: 'completed' | 'failed';
  output: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;
}
