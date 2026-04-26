import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import type { WorkflowEditorNode, WorkflowEditorEdge, WorkflowEditorMetadata } from '@/types/workflow';

/**
 * Shape used for compile/validate errors keyed by node id. Mirrors the
 * backend `Diagnostic` envelope (see `src/api/workflows.ts`).
 */
export interface NodeDiagnostic {
  message: string;
  severity: 'error' | 'warning';
  field_path?: string;
}

export interface WorkflowEditorState {
  // Graph state
  nodes: WorkflowEditorNode[];
  edges: WorkflowEditorEdge[];

  // Selection
  selectedNodeId: string | null;

  // Metadata
  metadata: WorkflowEditorMetadata | null;

  // Dirty flag
  isDirty: boolean;

  // Compile/validate diagnostics keyed by node_id. Errors with no node_id
  // live under the special key `''` so the editor can render a top-level
  // banner.
  errorsByNode: Record<string, NodeDiagnostic[]>;

  // Actions
  setNodes: (nodes: WorkflowEditorNode[]) => void;
  setEdges: (edges: WorkflowEditorEdge[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowEditorNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: WorkflowEditorNode) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowEditorNode['data']>) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setMetadata: (metadata: WorkflowEditorMetadata) => void;
  markClean: () => void;
  loadWorkflow: (nodes: WorkflowEditorNode[], edges: WorkflowEditorEdge[], metadata: WorkflowEditorMetadata) => void;
  setErrorsByNode: (errors: Record<string, NodeDiagnostic[]>) => void;
  clearErrors: () => void;
}

export const useWorkflowStore = create<WorkflowEditorState>((set, _get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  metadata: null,
  isDirty: false,
  errorsByNode: {},

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) =>
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes) as WorkflowEditorNode[],
      isDirty: true,
    })),

  onEdgesChange: (changes) =>
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
      isDirty: true,
    })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge(connection, s.edges),
      isDirty: true,
    })),

  addNode: (node) =>
    set((s) => ({
      nodes: [...s.nodes, node],
      isDirty: true,
    })),

  updateNodeData: (nodeId, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    })),

  removeNode: (nodeId) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
      isDirty: true,
    })),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setMetadata: (metadata) => set({ metadata }),

  markClean: () => set({ isDirty: false }),

  loadWorkflow: (nodes, edges, metadata) =>
    set({ nodes, edges, metadata, selectedNodeId: null, isDirty: false, errorsByNode: {} }),

  setErrorsByNode: (errors) => set({ errorsByNode: errors }),

  clearErrors: () => set({ errorsByNode: {} }),
}));
