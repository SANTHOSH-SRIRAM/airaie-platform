import { create } from 'zustand';

export interface ToolContractPort {
  name: string;
  type: 'artifact' | 'parameter' | 'metric';
  required: boolean;
  schema?: Record<string, unknown>;
  description?: string;
}

export interface ToolContract {
  inputs: ToolContractPort[];
  outputs: ToolContractPort[];
}

export interface ToolTypeDescription {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  category: string;
  version: string;
  status: 'draft' | 'published' | 'deprecated';
  contract: ToolContract;
  adapter: 'docker' | 'python' | 'wasm' | 'remote-api';
  trustLevel?: string;
  successRate?: number;
  costEstimate?: number;
  resourceDefaults?: {
    cpu: number;
    memoryMb: number;
    timeoutSeconds: number;
  };
}

export interface ToolTypesState {
  toolTypes: Map<string, ToolTypeDescription>;
  categories: string[];
  loaded: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  setToolTypes: (tools: ToolTypeDescription[]) => void;
  getToolType: (toolRef: string) => ToolTypeDescription | undefined;
  getByCategory: (category: string) => ToolTypeDescription[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useToolTypesStore = create<ToolTypesState>((set, get) => ({
  toolTypes: new Map(),
  categories: [],
  loaded: false,
  loading: false,
  error: null,

  setToolTypes: (tools) => {
    const toolMap = new Map<string, ToolTypeDescription>();
    const categorySet = new Set<string>();
    for (const tool of tools) {
      toolMap.set(tool.id, tool);
      // Also index by name@version for tool_ref lookups
      if (tool.version) {
        toolMap.set(`${tool.name}@${tool.version}`, tool);
      }
      categorySet.add(tool.category);
    }
    set({
      toolTypes: toolMap,
      categories: Array.from(categorySet).sort(),
      loaded: true,
      loading: false,
      error: null,
    });
  },

  getToolType: (toolRef) => get().toolTypes.get(toolRef),

  getByCategory: (category) => {
    const result: ToolTypeDescription[] = [];
    for (const tool of get().toolTypes.values()) {
      if (tool.category === category && tool.status === 'published') {
        result.push(tool);
      }
    }
    return result;
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
