import type { Node, Edge } from '@xyflow/react';

export type ConnectionType = 'main' | 'ai_model' | 'ai_tool' | 'ai_policy' | 'ai_memory';

export interface CanvasConnectionPort {
  type: ConnectionType;
  index: number;
  label?: string;
  required?: boolean;
  maxConnections?: number;
}

export enum CanvasNodeRenderType {
  Default = 'default',
  StickyNote = 'stickyNote',
  AddNodes = 'addNodes',
}

export interface CanvasNodeExecution {
  status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  progress?: number;
  running: boolean;
}

export interface CanvasNodeRunData {
  outputs?: Record<string, unknown>;
  iterations: number;
  visible: boolean;
}

export interface CanvasNodeData {
  id: string;
  label: string;
  subtitle?: string;
  nodeType: string;
  typeVersion?: string;
  toolRef?: string;
  disabled?: boolean;
  inputs: CanvasConnectionPort[];
  outputs: CanvasConnectionPort[];
  execution: CanvasNodeExecution;
  runData: CanvasNodeRunData;
  renderType: CanvasNodeRenderType;
  resourceLimits?: { cpu: number; memoryMb: number; timeoutSeconds: number };
  retryPolicy?: { maxRetries: number; delaySeconds: number };
  config?: Record<string, unknown>;
}

export type CanvasNode = Node<CanvasNodeData>;
export type CanvasEdge = Edge;
