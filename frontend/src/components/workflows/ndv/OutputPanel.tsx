import { BoxSelect } from 'lucide-react';
import { useExecutionStore } from '@store/executionStore';
import JsonTreeView from './JsonTreeView';

interface OutputPanelProps {
  nodeId: string;
}

export default function OutputPanel({ nodeId }: OutputPanelProps) {
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const nodeState = nodeStates.get(nodeId);
  const outputData = nodeState?.outputs;

  // No execution data
  if (!outputData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <BoxSelect size={24} className="text-[#d4d4d4]" />
        <p className="text-sm font-medium text-[#949494]">No output data</p>
        <p className="text-xs text-[#b4b4b4]">
          Run the workflow to see output data from this node.
        </p>
        {nodeState?.error && (
          <div className="mt-2 w-full rounded-md border border-red-200 bg-red-50 p-2 text-left">
            <p className="text-[11px] font-medium text-red-600">Error</p>
            <p className="text-[10px] text-red-500">{nodeState.error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3">
        <span className="text-[11px] font-medium text-[#949494]">Execution Output</span>
      </div>

      {/* Status badge */}
      {nodeState?.status && (
        <div className="mb-3">
          <StatusBadge status={nodeState.status} />
          {nodeState.completedAt && (
            <span className="ml-2 text-[10px] text-[#949494]">
              Completed {new Date(nodeState.completedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* JSON tree view */}
      <JsonTreeView data={outputData} initialExpanded={2} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    succeeded: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-600',
    running: 'bg-blue-100 text-blue-600',
    queued: 'bg-gray-100 text-gray-600',
    skipped: 'bg-yellow-100 text-yellow-700',
    canceled: 'bg-gray-100 text-gray-500',
    retrying: 'bg-orange-100 text-orange-600',
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
        styles[status] ?? styles.queued
      }`}
    >
      {status}
    </span>
  );
}
