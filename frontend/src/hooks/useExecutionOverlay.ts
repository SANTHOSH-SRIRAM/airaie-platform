import { useMemo } from 'react';
import { useExecutionStore } from '@store/executionStore';
import type { NodeRunStatus } from '@store/executionStore';

export interface NodeOverlay {
  status: 'idle' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  progress?: number;
  className: string;
}

const statusClassMap: Record<string, string> = {
  queued: 'ring-2 ring-gray-300',
  running: 'ring-2 ring-blue-500 animate-pulse',
  succeeded: 'ring-2 ring-green-500',
  failed: 'ring-2 ring-red-500',
  skipped: 'opacity-50',
  retrying: 'ring-2 ring-yellow-500 animate-pulse',
  canceled: 'ring-2 ring-gray-400',
};

function normalizeStatus(status: NodeRunStatus): NodeOverlay['status'] {
  if (status === 'retrying') return 'running';
  if (status === 'canceled') return 'skipped';
  return status as NodeOverlay['status'];
}

export function useExecutionOverlay(): Map<string, NodeOverlay> {
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const runStatus = useExecutionStore((s) => s.runStatus);

  return useMemo(() => {
    const overlays = new Map<string, NodeOverlay>();
    if (runStatus === 'IDLE') return overlays;

    for (const [nodeId, state] of nodeStates) {
      overlays.set(nodeId, {
        status: normalizeStatus(state.status),
        progress: state.progress,
        className: statusClassMap[state.status] ?? '',
      });
    }
    return overlays;
  }, [nodeStates, runStatus]);
}
