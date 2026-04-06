import { create } from 'zustand';
import type { RunStatusFilter } from '@/types/run';

export interface RunStoreState {
  selectedRunId: string | null;
  selectedRunNodeId: string | null;
  statusFilter: RunStatusFilter;
  logAutoScroll: boolean;
  activeLogTab: 'logs' | 'artifacts' | 'cost' | 'timeline';
  selectRun: (id: string | null) => void;
  selectRunNode: (id: string | null) => void;
  setStatusFilter: (filter: RunStatusFilter) => void;
  setLogAutoScroll: (v: boolean) => void;
  setActiveLogTab: (tab: RunStoreState['activeLogTab']) => void;
}

export const useRunStore = create<RunStoreState>((set) => ({
  selectedRunId: null,
  selectedRunNodeId: null,
  statusFilter: 'all',
  logAutoScroll: true,
  activeLogTab: 'logs',
  selectRun: (id) => set({ selectedRunId: id, selectedRunNodeId: null }),
  selectRunNode: (id) => set({ selectedRunNodeId: id }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setLogAutoScroll: (v) => set({ logAutoScroll: v }),
  setActiveLogTab: (tab) => set({ activeLogTab: tab }),
}));
