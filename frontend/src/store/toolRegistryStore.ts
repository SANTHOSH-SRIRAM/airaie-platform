import { create } from 'zustand';
import type { ToolStatus, ToolCategory, ToolAdapter } from '@/types/tool';

export interface ToolRegistryState {
  selectedToolId: string | null;
  filterStatus: ToolStatus[];
  filterCategory: ToolCategory[];
  filterAdapter: ToolAdapter[];
  search: string;
  sortBy: 'name' | 'usage' | 'cost' | 'recent';
  selectTool: (id: string | null) => void;
  toggleStatus: (s: ToolStatus) => void;
  toggleCategory: (c: ToolCategory) => void;
  toggleAdapter: (a: ToolAdapter) => void;
  setSearch: (q: string) => void;
  setSortBy: (sort: ToolRegistryState['sortBy']) => void;
  clearFilters: () => void;
}

export const useToolRegistryStore = create<ToolRegistryState>((set) => ({
  selectedToolId: null,
  filterStatus: [],
  filterCategory: [],
  filterAdapter: [],
  search: '',
  sortBy: 'recent',
  selectTool: (id) => set({ selectedToolId: id }),
  toggleStatus: (s) => set((st) => ({ filterStatus: st.filterStatus.includes(s) ? st.filterStatus.filter((x) => x !== s) : [...st.filterStatus, s] })),
  toggleCategory: (c) => set((st) => ({ filterCategory: st.filterCategory.includes(c) ? st.filterCategory.filter((x) => x !== c) : [...st.filterCategory, c] })),
  toggleAdapter: (a) => set((st) => ({ filterAdapter: st.filterAdapter.includes(a) ? st.filterAdapter.filter((x) => x !== a) : [...st.filterAdapter, a] })),
  setSearch: (q) => set({ search: q }),
  setSortBy: (sort) => set({ sortBy: sort }),
  clearFilters: () => set({ filterStatus: [], filterCategory: [], filterAdapter: [], search: '' }),
}));
