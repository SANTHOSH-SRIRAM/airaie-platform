import { useMemo, useCallback } from 'react';
import { cn } from '@utils/cn';
import { useCardGraph } from '@hooks/useCards';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  draft: { bg: '#f5f5f0', border: '#d0d0d0', text: '#6b6b6b' },
  ready: { bg: '#e3f2fd', border: '#2196f3', text: '#2196f3' },
  queued: { bg: '#fff3e0', border: '#ff9800', text: '#ff9800' },
  running: { bg: '#e3f2fd', border: '#2196f3', text: '#2196f3' },
  completed: { bg: '#e8f5e9', border: '#4caf50', text: '#4caf50' },
  failed: { bg: '#ffebee', border: '#e74c3c', text: '#e74c3c' },
  blocked: { bg: '#fff3e0', border: '#ff9800', text: '#ff9800' },
  skipped: { bg: '#f5f5f0', border: '#9e9e9e', text: '#9e9e9e' },
};

// ---------------------------------------------------------------------------
// Custom Node
// ---------------------------------------------------------------------------

function CardNode({ data }: NodeProps) {
  const colors = STATUS_COLORS[data.status as string] ?? STATUS_COLORS.draft;

  return (
    <div
      className="rounded-[8px] px-[12px] py-[8px] text-center min-w-[120px] shadow-sm"
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#acacac] !w-[6px] !h-[6px]" />
      <div className="text-[11px] font-semibold text-[#1a1a1a] truncate max-w-[140px]">
        {data.label as string}
      </div>
      <div
        className="text-[9px] font-medium uppercase mt-[2px]"
        style={{ color: colors.text }}
      >
        {data.status as string}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#acacac] !w-[6px] !h-[6px]" />
    </div>
  );
}

const nodeTypes = { cardNode: CardNode };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CardDependencyGraphProps {
  boardId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardDependencyGraph({ boardId }: CardDependencyGraphProps) {
  const { data: graph, isLoading, error } = useCardGraph(boardId);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };

    const rfNodes: Node[] = graph.nodes.map((n, i) => ({
      id: n.id,
      type: 'cardNode',
      position: { x: i * 180, y: Math.floor(i / 3) * 100 },
      data: { label: n.title, status: n.status },
      draggable: false,
    }));

    const rfEdges: Edge[] = graph.edges.map((e, i) => ({
      id: `edge-${i}`,
      source: e.from,
      target: e.to,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#d0d0d0', strokeWidth: 1.5 },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-[#fafafa] rounded-[10px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
      </div>
    );
  }

  if (error || !graph) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-[#fafafa] rounded-[10px] gap-[8px]">
        <AlertCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">Failed to load dependency graph</span>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-[#fafafa] rounded-[10px]">
        <span className="text-[12px] text-[#acacac]">No cards to display</span>
      </div>
    );
  }

  return (
    <div className="h-[400px] rounded-[10px] overflow-hidden border border-[#e8e8e8]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e8e8e8" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
