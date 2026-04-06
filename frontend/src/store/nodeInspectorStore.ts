import { create } from 'zustand';

export type InspectorTab = 'parameters' | 'input' | 'output';

export interface NodeInspectorState {
  // Active node being inspected
  activeNodeId: string | null;
  activeTab: InspectorTab;

  // Input panel state (shows parent node's output)
  inputPanel: {
    parentNodeId: string | null;
    runIndex: number;
    branchIndex: number;
  };

  // Output panel state (shows this node's execution output)
  outputPanel: {
    runIndex: number;
    branchIndex: number;
  };

  // Dragging state (for expression drag-mapping, like n8n)
  isDragging: boolean;
  dragData: string | null;

  // Actions
  setActiveNode: (nodeId: string | null) => void;
  setActiveTab: (tab: InspectorTab) => void;
  setInputParentNode: (nodeId: string | null) => void;
  setInputRunIndex: (index: number) => void;
  setInputBranchIndex: (index: number) => void;
  setOutputRunIndex: (index: number) => void;
  setOutputBranchIndex: (index: number) => void;
  startDrag: (data: string) => void;
  endDrag: () => void;
  close: () => void;
}

export const useNodeInspectorStore = create<NodeInspectorState>((set) => ({
  activeNodeId: null,
  activeTab: 'parameters',
  inputPanel: { parentNodeId: null, runIndex: 0, branchIndex: 0 },
  outputPanel: { runIndex: 0, branchIndex: 0 },
  isDragging: false,
  dragData: null,

  setActiveNode: (nodeId) =>
    set({
      activeNodeId: nodeId,
      activeTab: 'parameters',
      inputPanel: { parentNodeId: null, runIndex: 0, branchIndex: 0 },
      outputPanel: { runIndex: 0, branchIndex: 0 },
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setInputParentNode: (nodeId) =>
    set((s) => ({ inputPanel: { ...s.inputPanel, parentNodeId: nodeId } })),

  setInputRunIndex: (index) =>
    set((s) => ({ inputPanel: { ...s.inputPanel, runIndex: index } })),

  setInputBranchIndex: (index) =>
    set((s) => ({ inputPanel: { ...s.inputPanel, branchIndex: index } })),

  setOutputRunIndex: (index) =>
    set((s) => ({ outputPanel: { ...s.outputPanel, runIndex: index } })),

  setOutputBranchIndex: (index) =>
    set((s) => ({ outputPanel: { ...s.outputPanel, branchIndex: index } })),

  startDrag: (data) => set({ isDragging: true, dragData: data }),

  endDrag: () => set({ isDragging: false, dragData: null }),

  close: () =>
    set({
      activeNodeId: null,
      activeTab: 'parameters',
      inputPanel: { parentNodeId: null, runIndex: 0, branchIndex: 0 },
      outputPanel: { runIndex: 0, branchIndex: 0 },
      isDragging: false,
      dragData: null,
    }),
}));
