import { useMemo } from 'react';
import { cn } from '@utils/cn';
import { usePlan, usePlanPolling } from '@hooks/usePlans';
import type { PlanNodeRole } from '@/types/plan';
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
import { Loader2, AlertCircle, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';

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
// Step status config
// ---------------------------------------------------------------------------

const STEP_STATUS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: '#4caf50' },
  running: { icon: Loader2, color: '#2196f3' },
  failed: { icon: XCircle, color: '#e74c3c' },
  pending: { icon: Clock, color: '#acacac' },
  queued: { icon: Play, color: '#ff9800' },
};

// ---------------------------------------------------------------------------
// Custom node
// ---------------------------------------------------------------------------

function PlanNode({ data }: NodeProps) {
  const role = data.role as PlanNodeRole;
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS.validate_input;
  const stepStatus = data.stepStatus as string | undefined;
  const statusCfg = STEP_STATUS[stepStatus ?? 'pending'] ?? STEP_STATUS.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <div
      className="rounded-[8px] px-[12px] py-[8px] min-w-[130px] shadow-sm"
      style={{ background: colors.bg, border: `2px solid ${colors.border}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#acacac] !w-[6px] !h-[6px]" />
      {/* Role badge + status */}
      <div className="flex items-center gap-[4px] mb-[4px]">
        <span
          className={cn(
            'inline-flex items-center h-[16px] px-[6px] rounded-[3px] text-[8px] font-semibold uppercase tracking-[0.3px]',
            colors.badge,
            colors.badgeText,
          )}
        >
          {role.replace('_', ' ')}
        </span>
        <StatusIcon
          size={10}
          style={{ color: statusCfg.color }}
          className={stepStatus === 'running' ? 'animate-spin' : ''}
        />
      </div>
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
  const { data: plan, isLoading, error } = usePlan(cardId);

  // Poll while executing
  const isExecuting = plan?.status === 'executing';
  const { data: polledPlan } = usePlanPolling(cardId, isExecuting);

  // Use polled data when available and executing
  const activePlan = (isExecuting && polledPlan) ? polledPlan : plan;

  const { nodes, edges } = useMemo(() => {
    if (!activePlan) return { nodes: [] as Node[], edges: [] as Edge[] };

    const rfNodes: Node[] = activePlan.nodes.map((n, i) => ({
      id: n.node_id,
      type: 'planNode',
      position: { x: 20, y: i * 100 },
      data: {
        role: n.role,
        toolId: n.tool_id,
        toolVersion: n.tool_version,
        label: n.tool_id,
        stepStatus: n.status ?? 'pending',
      },
      draggable: false,
    }));

    const rfEdges: Edge[] = activePlan.edges.map((e, i) => ({
      id: `pedge-${i}`,
      source: e.from_node_id,
      target: e.to_node_id,
      type: 'smoothstep',
      animated: activePlan.status === 'executing',
      style: { stroke: '#d0d0d0', strokeWidth: 1.5 },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [activePlan]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[350px] bg-[#fafafa] rounded-[10px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
      </div>
    );
  }

  if (error || !activePlan) {
    return (
      <div className="flex items-center justify-center h-[350px] bg-[#fafafa] rounded-[10px] gap-[8px]">
        <AlertCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">{(error as Error)?.message ?? 'No plan found'}</span>
      </div>
    );
  }

  // Compute step progress
  const completedSteps = activePlan.nodes.filter((n) => n.status === 'completed').length;
  const totalSteps = activePlan.nodes.length;

  return (
    <div>
      {/* Plan meta */}
      <div className="flex items-center gap-[8px] mb-[8px]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
          Execution Plan
        </span>
        <span className={cn(
          'h-[18px] px-[8px] rounded-[4px] text-[9px] font-semibold uppercase inline-flex items-center',
          activePlan.status === 'completed' && 'bg-[#e8f5e9] text-[#4caf50]',
          activePlan.status === 'executing' && 'bg-[#e3f2fd] text-[#2196f3]',
          activePlan.status === 'failed' && 'bg-[#ffebee] text-[#e74c3c]',
          activePlan.status === 'draft' && 'bg-[#f0f0ec] text-[#6b6b6b]',
          activePlan.status === 'validated' && 'bg-[#e3f2fd] text-[#2196f3]',
        )}>
          {activePlan.status}
        </span>
        <span className="text-[10px] text-[#acacac]">
          Est. {activePlan.time_estimate} / ${activePlan.cost_estimate.toFixed(2)}
        </span>
        {/* Step progress */}
        <span className="text-[10px] text-[#6b6b6b] ml-auto">
          {completedSteps}/{totalSteps} steps
        </span>
      </div>

      {/* Step progress bar */}
      {activePlan.status === 'executing' && (
        <div className="h-[3px] rounded-full bg-[#f0f0ec] mb-[8px]">
          <div
            className="h-full rounded-full bg-[#2196f3] transition-all"
            style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
          />
        </div>
      )}

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
