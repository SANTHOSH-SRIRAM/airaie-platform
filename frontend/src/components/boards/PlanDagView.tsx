/**
 * PlanDagView — read-only ReactFlow rendering of a compiled ExecutionPlan.
 *
 * Renders role-coloured nodes (validate_input / preprocess / solve / ...)
 * connected by depends_on edges. Loading / error / empty states are
 * inlined so callers don't need to gate the component themselves.
 *
 * The DAG is laid out by `planToFlow` (depth-by-dependency). The custom
 * `planNode` component below is registered locally rather than reusing
 * the workflow editor's `tool/agent/...` registry — plan nodes carry
 * different fields (role, tool_id, tool_version) and are intentionally
 * not editable.
 */

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  Handle,
  Position,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { cn } from '@utils/cn';
import type { ExecutionPlan, PlanNodeRole } from '@/types/plan';
import {
  planToFlow,
  type PlanFlowNodeData,
} from '@utils/executionPlanLayout';

// ---------------------------------------------------------------------------
// Role / status palettes
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<
  PlanNodeRole,
  { bg: string; border: string; badge: string; badgeText: string }
> = {
  validate_input: {
    bg: '#f5f5f0',
    border: '#9e9e9e',
    badge: 'bg-[#f0f0ec]',
    badgeText: 'text-[#6b6b6b]',
  },
  preprocess: {
    bg: '#e3f2fd',
    border: '#2196f3',
    badge: 'bg-[#e3f2fd]',
    badgeText: 'text-[#2196f3]',
  },
  solve: {
    bg: '#fff3e0',
    border: '#ff9800',
    badge: 'bg-[#fff3e0]',
    badgeText: 'text-[#ff9800]',
  },
  postprocess: {
    bg: '#e8f5e9',
    border: '#4caf50',
    badge: 'bg-[#e8f5e9]',
    badgeText: 'text-[#4caf50]',
  },
  report: {
    bg: '#e8f5e9',
    border: '#4caf50',
    badge: 'bg-[#e8f5e9]',
    badgeText: 'text-[#4caf50]',
  },
  evidence: {
    bg: '#f3e5f5',
    border: '#9c27b0',
    badge: 'bg-[#f3e5f5]',
    badgeText: 'text-[#9c27b0]',
  },
  approval: {
    bg: '#ffebee',
    border: '#e74c3c',
    badge: 'bg-[#ffebee]',
    badgeText: 'text-[#e74c3c]',
  },
};

const STEP_STATUS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: '#4caf50' },
  running: { icon: Loader2, color: '#2196f3' },
  failed: { icon: XCircle, color: '#e74c3c' },
  pending: { icon: Clock, color: '#acacac' },
  queued: { icon: Play, color: '#ff9800' },
  skipped: { icon: Clock, color: '#acacac' },
};

// ---------------------------------------------------------------------------
// Custom plan node
// ---------------------------------------------------------------------------

function PlanCustomNode({ data }: NodeProps) {
  const d = data as unknown as PlanFlowNodeData;
  const colors = ROLE_COLORS[d.role] ?? ROLE_COLORS.validate_input;
  const statusKey = (d.stepStatus ?? 'pending').toLowerCase();
  const statusCfg = STEP_STATUS[statusKey] ?? STEP_STATUS.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <div
      className="rounded-[8px] px-[12px] py-[8px] min-w-[150px] max-w-[200px] shadow-sm"
      style={{ background: colors.bg, border: `2px solid ${colors.border}` }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[#acacac] !w-[6px] !h-[6px]"
      />
      <div className="flex items-center gap-[4px] mb-[4px]">
        <span
          className={cn(
            'inline-flex items-center h-[16px] px-[6px] rounded-[3px] text-[8px] font-semibold uppercase tracking-[0.3px]',
            colors.badge,
            colors.badgeText,
          )}
        >
          {d.role.replace('_', ' ')}
        </span>
        <StatusIcon
          size={10}
          style={{ color: statusCfg.color }}
          className={statusKey === 'running' ? 'animate-spin' : ''}
        />
      </div>
      <div className="text-[11px] font-semibold text-[#1a1a1a] truncate">
        {d.toolId}
      </div>
      <div className="text-[9px] text-[#acacac] font-mono truncate">
        v{d.toolVersion}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[#acacac] !w-[6px] !h-[6px]"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  planNode: PlanCustomNode,
};

// ---------------------------------------------------------------------------
// Mini-map colour by role
// ---------------------------------------------------------------------------

function miniMapNodeColor(node: { data?: unknown }): string {
  const d = node.data as PlanFlowNodeData | undefined;
  if (!d) return '#acacac';
  return ROLE_COLORS[d.role]?.border ?? '#acacac';
}

// ---------------------------------------------------------------------------
// Skeleton (loading state)
// ---------------------------------------------------------------------------

function PlanDagSkeleton() {
  // Three placeholder boxes connected by dashed lines
  return (
    <div
      className="relative h-[350px] rounded-[10px] overflow-hidden border border-[#e8e8e8] bg-[#fafafa]"
      role="status"
      aria-label="Loading execution plan"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <line
          x1="22%"
          y1="50%"
          x2="42%"
          y2="50%"
          stroke="#d0d0d0"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <line
          x1="58%"
          y1="50%"
          x2="78%"
          y2="50%"
          stroke="#d0d0d0"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-around px-[40px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[60px] w-[120px] rounded-[8px] bg-[#f0f0ec] animate-pulse"
          />
        ))}
      </div>
      <div className="absolute bottom-[12px] left-1/2 -translate-x-1/2 flex items-center gap-[6px] text-[11px] text-[#acacac]">
        <Loader2 size={12} className="animate-spin" />
        Loading plan…
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface PlanDagViewProps {
  plan: ExecutionPlan | undefined | null;
  isLoading?: boolean;
  error?: Error | null;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export default function PlanDagView({
  plan,
  isLoading,
  error,
  onNodeClick,
  className,
}: PlanDagViewProps) {
  const { nodes, edges } = useMemo(() => planToFlow(plan), [plan]);

  if (isLoading) {
    return (
      <div className={className}>
        <PlanDagSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-[350px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] gap-[8px]',
          className,
        )}
        role="alert"
      >
        <AlertCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">
          {error.message || 'Failed to load plan'}
        </span>
      </div>
    );
  }

  if (!plan || nodes.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-[350px] rounded-[10px] border border-dashed border-[#e8e8e8] bg-[#fafafa] gap-[8px]',
          className,
        )}
      >
        <WorkflowIcon size={28} className="text-[#d0d0d0]" />
        <span className="text-[12px] text-[#6b6b6b] font-medium">
          No plan generated yet
        </span>
        <span className="text-[10px] text-[#acacac]">
          Pick an intent and click Generate Plan to see the DAG
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-[400px] rounded-[10px] overflow-hidden border border-[#e8e8e8] bg-white',
        className,
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable={!!onNodeClick}
        panOnDrag
        zoomOnScroll
        minZoom={0.4}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
      >
        <Background color="#e8e8e8" gap={20} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-white !border !border-[#e8e8e8] !rounded-[6px]"
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          nodeStrokeWidth={2}
          maskColor="rgba(250, 250, 250, 0.7)"
          className="!bg-white !border !border-[#e8e8e8] !rounded-[6px]"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
