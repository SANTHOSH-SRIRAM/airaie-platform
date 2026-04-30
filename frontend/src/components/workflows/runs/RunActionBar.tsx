import { Play, Square, RotateCcw, Plus, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRunWorkflow } from '@hooks/useRunWorkflow';
import { useRetryRun } from '@hooks/useRuns';
import { useExecutionStore } from '@store/executionStore';

export interface RunActionBarProps {
  workflowId?: string;
}

export default function RunActionBar({ workflowId = '' }: RunActionBarProps) {
  const navigate = useNavigate();
  const { isStarting, isCompleted, connected, error, start, cancel, reset } =
    useRunWorkflow(workflowId);

  const runStatus = useExecutionStore((s) => s.runStatus);
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const sseConnected = useExecutionStore((s) => s.sseConnected);
  const activeRunId = useExecutionStore((s) => s.activeRunId);

  // G.4.12 — retry the prior run with its original inputs (kernel
  // POST /v0/runs/{id}/retry). Falls back to fresh start if there's
  // no activeRunId (shouldn't happen post-isCompleted, but defensive).
  const retryMutation = useRetryRun();
  const onRetry = () => {
    if (!activeRunId) {
      start();
      return;
    }
    retryMutation.mutate(activeRunId, {
      onSuccess: (resp) => {
        if (resp?.run?.id) {
          navigate(`/workflow-runs/${resp.run.id}`);
        }
      },
    });
  };

  // Count completed/total nodes for progress display
  const totalNodes = nodeStates.size;
  const completedNodes = Array.from(nodeStates.values()).filter(
    (s) => s.status === 'succeeded' || s.status === 'failed' || s.status === 'skipped'
  ).length;

  const showConnected = sseConnected || connected;

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[#ece9e3] bg-white px-3 py-2 shadow-[0px_2px_10px_0px_rgba(0,0,0,0.05)]">
      {/* SSE connection indicator */}
      <div className="flex items-center gap-1.5" title={showConnected ? 'SSE connected' : 'SSE disconnected'}>
        {showConnected ? (
          <Wifi size={12} className="text-green-500" />
        ) : (
          <WifiOff size={12} className="text-gray-400" />
        )}
        <span
          className={`h-[6px] w-[6px] rounded-full ${showConnected ? 'bg-green-500' : 'bg-gray-300'}`}
        />
      </div>

      {/* Idle state: Run Workflow button */}
      {runStatus === 'IDLE' && (
        <button
          type="button"
          onClick={start}
          disabled={isStarting}
          className="flex h-[36px] items-center gap-2 rounded-[12px] bg-[#2d2d2d] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          <Play size={14} />
          {isStarting ? 'Starting...' : 'Run Workflow'}
        </button>
      )}

      {/* Pending state */}
      {runStatus === 'PENDING' && (
        <>
          <span className="text-[12px] text-[#8f8a83]">Starting execution...</span>
          <button
            type="button"
            onClick={cancel}
            className="flex h-[36px] items-center gap-2 rounded-[12px] border border-[#ff4f4f] px-4 text-[12px] font-medium text-[#ff4f4f]"
          >
            <Square size={12} />
            Cancel
          </button>
        </>
      )}

      {/* Running state: progress + cancel */}
      {runStatus === 'RUNNING' && (
        <>
          <div className="flex items-center gap-2 text-[12px] text-[#8f8a83]">
            <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-blue-500" />
            <span>
              Running node {completedNodes + 1}/{totalNodes > 0 ? totalNodes : '?'}
            </span>
          </div>
          <button
            type="button"
            onClick={cancel}
            className="flex h-[36px] items-center gap-2 rounded-[12px] border border-[#ff4f4f] px-4 text-[12px] font-medium text-[#ff4f4f] transition-colors hover:bg-red-50"
          >
            <Square size={12} />
            Cancel Run
          </button>
        </>
      )}

      {/* Completed state: status badge + retry + new run */}
      {isCompleted && (
        <>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              runStatus === 'SUCCEEDED'
                ? 'bg-green-50 text-green-700'
                : runStatus === 'FAILED'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {runStatus === 'SUCCEEDED' ? 'Succeeded' : runStatus === 'FAILED' ? 'Failed' : 'Canceled'}
          </span>
          <button
            type="button"
            onClick={onRetry}
            disabled={retryMutation.isPending}
            title="Retry this run with the same inputs"
            className="flex h-[36px] items-center gap-2 rounded-[12px] border border-[#bdb7b0] px-4 text-[12px] font-medium text-[#6b6b6b] transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw size={12} />
            {retryMutation.isPending ? 'Retrying…' : 'Retry'}
          </button>
          <button
            type="button"
            onClick={() => { reset(); }}
            className="flex h-[36px] items-center gap-2 rounded-[12px] border border-[#bdb7b0] px-4 text-[12px] font-medium text-[#6b6b6b] transition-colors hover:bg-gray-50"
          >
            <Plus size={12} />
            New Run
          </button>
        </>
      )}

      {/* Paused state */}
      {runStatus === 'PAUSED' && (
        <>
          <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-[11px] font-medium text-yellow-700">
            Paused
          </span>
          <span className="text-[12px] text-[#8f8a83]">Gate approval pending</span>
        </>
      )}

      {/* Error display */}
      {error && (
        <span className="ml-2 text-[11px] text-red-500">{error}</span>
      )}
    </div>
  );
}
