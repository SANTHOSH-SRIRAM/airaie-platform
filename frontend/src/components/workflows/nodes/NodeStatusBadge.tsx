import { memo } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, Minus } from 'lucide-react';
import { useExecutionStore } from '@store/executionStore';
import type { NodeRunStatus } from '@store/executionStore';

interface NodeStatusBadgeProps {
  nodeId: string;
}

const STATUS_CONFIG: Record<
  NodeRunStatus | 'idle',
  { icon: React.ReactNode; bg: string; border: string } | null
> = {
  idle: null,
  queued: {
    icon: <Clock size={10} className="text-gray-500" />,
    bg: 'bg-gray-100',
    border: 'border-gray-200',
  },
  running: {
    icon: <Loader2 size={10} className="animate-spin text-blue-600" />,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  succeeded: {
    icon: <CheckCircle2 size={10} className="text-green-600" />,
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  failed: {
    icon: <XCircle size={10} className="text-red-600" />,
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  skipped: {
    icon: <Minus size={10} className="text-gray-400" />,
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
  retrying: {
    icon: <Loader2 size={10} className="animate-spin text-yellow-600" />,
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  canceled: {
    icon: <Minus size={10} className="text-gray-400" />,
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
};

function NodeStatusBadge({ nodeId }: NodeStatusBadgeProps) {
  const nodeState = useExecutionStore((s) => s.nodeStates.get(nodeId));
  const runStatus = useExecutionStore((s) => s.runStatus);

  // Don't render if no execution is active or node has no state
  if (runStatus === 'IDLE' || !nodeState) return null;

  const config = STATUS_CONFIG[nodeState.status];
  if (!config) return null;

  return (
    <div className="absolute -right-1 -top-1 z-10">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${config.bg} ${config.border} shadow-sm`}
      >
        {config.icon}
      </div>

      {/* Progress bar shown below badge when percent available */}
      {nodeState.progress != null && nodeState.progress > 0 && nodeState.progress < 100 && (
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2">
          <div className="h-1 w-10 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(100, nodeState.progress)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(NodeStatusBadge);
