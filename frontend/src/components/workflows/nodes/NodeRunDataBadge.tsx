import { memo } from 'react';
import { useExecutionStore } from '@store/executionStore';

interface NodeRunDataBadgeProps {
  nodeId: string;
}

function NodeRunDataBadge({ nodeId }: NodeRunDataBadgeProps) {
  const nodeState = useExecutionStore((s) => s.nodeStates.get(nodeId));

  // Only show when the node has completed with outputs
  if (!nodeState || nodeState.status !== 'succeeded' || !nodeState.outputs) {
    return null;
  }

  const outputCount = Object.keys(nodeState.outputs).length;
  if (outputCount === 0) return null;

  const label = outputCount === 1 ? '1 item' : `${outputCount} items`;

  return (
    <div className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2">
      <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-[9px] font-medium text-white shadow-sm">
        {label}
      </span>
    </div>
  );
}

export default memo(NodeRunDataBadge);
