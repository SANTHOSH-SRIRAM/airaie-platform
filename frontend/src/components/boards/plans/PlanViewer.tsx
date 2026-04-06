import { useState, useMemo, useEffect } from 'react';
import { cn } from '@utils/cn';
import { getPlan } from '@api/plans';
import type { ExecutionPlan, PlanNodeRole } from '@/types/plan';
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
// Role colors
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<PlanNodeRole, { bg: string; border: string; badge: string; badgeText: string }> = {
  validate_input: { bg: '#f5f5f0', border: '#9e9e9e', badge: 'bg-[#f0f0ec]', badgeText: 'text-[#6b6b6b]' },
  preprocess: { bg: '#e3f2fd', border: '#2196f3', badge: 'bg-[#e3f2fd]', badgeText: 'text-[#2196f3]' },
  solve: { bg: '#fff3e0', border: '#ff9800', badge: 'bg-[#fff3e0]', badgeText: 'text-[#ff9800]' },
  postprocess: { bg: '#e8f5e9', border: '#4caf50', badge: 'bg-[#e8f5e9]', badgeText: 'text-[#4caf50]' },
  report: { bg: '#e8f5e9', border: '#4caf50', badge: 'bg-[#e8f5e9]', badgeText: 'text-[#4caf50]' },
  evidence: { bg: '#f3e5f5', border: '#9c27b0', badge: 'bg-[#f3e5f5]', badgeText: 'text-[#9c27b0]' },
  approval: { bg: '#ffebee', border: '#e74c3c', badge: 'bg-[#ffebee]', badgeText: 'text-[#e74c3c]' },
};

// ---------------------------------------------------------------------------
// Custom node
// ---------------------------------------------------------------------------

function PlanNode({ data }: NodeProps) {
  const role = data.role as PlanNodeRole;
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS.validate_input;

  return (
    <div
      className="rounded-[8px] px-[12px] py-[8px] min-w-[130px] shadow-sm"
      style={{ background: colors.bg, border: `2px solid ${colors.border}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#acacac] !w-[6px] !h-[6px]" />
      {/* Role badge */}
      <span
        className={cn(
          'inline-flex items-center h-[16px] px-[6px] rounded-[3px] text-[8px] font-semibold uppercase tracking-[0.3px] mb-[4px]',
          colors.badge,
          colors.badgeText,
        )}
      >
        {role.replace('_', ' ')}
      </span>
      {/* Tool info */}
      <div className="text-[11px] font-semibold text-[#1a1a1a] truncate max-w-[130px]">
        {data.toolId as string}
      </div>
      <div className="text-[9px] text-[#acacac] font-mono">
        {data.toolVersion as string}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#acacac] !w-[6px] !h-[6px]" />
    </div>
  );
}

const nodeTypes = { planNode: PlanNode };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanViewerProps {
  cardId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanViewer({ cardId }: PlanViewerProps) {
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getPlan(cardId)
      .then((data) => {
        if (mounted) setPlan(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.message ?? 'Failed to load plan');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [cardId]);

  const { nodes, edges } = useMemo(() => {
    if (!plan) return { nodes: [] as Node[], edges: [] as Edge[] };

    const rfNodes: Node[] = plan.nodes.map((n, i) => ({
      id: n.node_id,
      type: 'planNode',
      position: { x: 20, y: i * 100 },
      data: {
        role: n.role,
        toolId: n.tool_id,
        toolVersion: n.tool_version,
        label: n.tool_id,
      },
      draggable: false,
    }));

    const rfEdges: Edge[] = plan.edges.map((e, i) => ({
      id: `pedge-${i}`,
      source: e.from_node_id,
      target: e.to_node_id,
      type: 'smoothstep',
      animated: plan.status === 'executing',
      style: { stroke: '#d0d0d0', strokeWidth: 1.5 },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [plan]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[350px] bg-[#fafafa] rounded-[10px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center h-[350px] bg-[#fafafa] rounded-[10px] gap-[8px]">
        <AlertCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">{error ?? 'No plan found'}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Plan meta */}
      <div className="flex items-center gap-[8px] mb-[8px]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
          Execution Plan
        </span>
        <span className={cn(
          'h-[18px] px-[8px] rounded-[4px] text-[9px] font-semibold uppercase inline-flex items-center',
          plan.status === 'completed' && 'bg-[#e8f5e9] text-[#4caf50]',
          plan.status === 'executing' && 'bg-[#e3f2fd] text-[#2196f3]',
          plan.status === 'failed' && 'bg-[#ffebee] text-[#e74c3c]',
          plan.status === 'draft' && 'bg-[#f0f0ec] text-[#6b6b6b]',
          plan.status === 'validated' && 'bg-[#e3f2fd] text-[#2196f3]',
        )}>
          {plan.status}
        </span>
        <span className="text-[10px] text-[#acacac]">
          Est. {plan.time_estimate} / ${plan.cost_estimate.toFixed(2)}
        </span>
      </div>

      {/* DAG */}
      <div className="h-[350px] rounded-[10px] overflow-hidden border border-[#e8e8e8]">
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
    </div>
  );
}
