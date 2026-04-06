import { create } from 'zustand';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasState {
  viewport: Viewport;
  selectedNodeIds: string[];
  isConnecting: boolean;
  draggedNodeType: string | null;
  showMiniMap: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // Actions
  setViewport: (viewport: Viewport) => void;
  setSelectedNodes: (ids: string[]) => void;
  addSelectedNode: (id: string) => void;
  clearSelection: () => void;
  setIsConnecting: (connecting: boolean) => void;
  setDraggedNodeType: (type: string | null) => void;
  toggleMiniMap: () => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  isConnecting: false,
  draggedNodeType: null,
  showMiniMap: false,
  showGrid: true,
  snapToGrid: true,
  gridSize: 40,

  setViewport: (viewport) => set({ viewport }),
  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
  addSelectedNode: (id) =>
    set((s) => ({
      selectedNodeIds: s.selectedNodeIds.includes(id)
        ? s.selectedNodeIds
        : [...s.selectedNodeIds, id],
    })),
  clearSelection: () => set({ selectedNodeIds: [] }),
  setIsConnecting: (connecting) => set({ isConnecting: connecting }),
  setDraggedNodeType: (type) => set({ draggedNodeType: type }),
  toggleMiniMap: () => set((s) => ({ showMiniMap: !s.showMiniMap })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
}));
