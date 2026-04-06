import { MessageSquare, Play, Square, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useWorkflowStore } from '@store/workflowStore';
import type { RunStatus } from '@store/executionStore';

interface WorkflowEditorBottomBarProps {
  onRun?: () => void;
  onCancel?: () => void;
  onChat?: () => void;
  isStarting?: boolean;
  isRunning?: boolean;
  isCompleted?: boolean;
  runStatus?: RunStatus;
  runError?: string | null;
}

export default function WorkflowEditorBottomBar({
  onRun,
  onCancel,
  onChat,
  isStarting,
  isRunning,
  isCompleted,
  runStatus,
  runError,
}: WorkflowEditorBottomBarProps) {
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const edgeCount = useWorkflowStore((s) => s.edges.length);

  const showRunButton = !isRunning && !isStarting;
  const showCancelButton = isRunning || isStarting;

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[#ece9e3] bg-white px-[8px] py-[8px] shadow-[0px_2px_10px_0px_rgba(0,0,0,0.05)]">
      {showRunButton && (
        <button
          onClick={onRun}
          disabled={isStarting}
          className="flex h-[40px] items-center gap-2 rounded-[12px] bg-[#2d2d2d] px-[18px] text-[13px] font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          <Play size={14} />
          {isCompleted ? 'Re-run Workflow' : 'Run Workflow'}
        </button>
      )}

      {showCancelButton && (
        <>
          <button
            onClick={onCancel}
            className="flex h-[40px] items-center gap-2 rounded-[12px] border border-[#ff4f4f] px-[16px] text-[13px] font-medium text-[#ff4f4f] transition-colors hover:bg-red-50"
          >
            <Square size={12} />
            Cancel
          </button>
          <div className="flex items-center gap-2 text-[13px] text-[#8f8a83]">
            <Loader2 size={14} className="animate-spin text-blue-500" />
            {isStarting ? 'Starting...' : 'Running...'}
          </div>
        </>
      )}

      {/* Status badge for completed runs */}
      {isCompleted && runStatus && (
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            runStatus === 'SUCCEEDED'
              ? 'bg-green-50 text-green-700'
              : runStatus === 'FAILED'
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          {runStatus === 'SUCCEEDED' ? (
            <CheckCircle2 size={12} />
          ) : runStatus === 'FAILED' ? (
            <XCircle size={12} />
          ) : null}
          {runStatus === 'SUCCEEDED' ? 'Succeeded' : runStatus === 'FAILED' ? 'Failed' : 'Canceled'}
        </span>
      )}

      {runError && (
        <span className="text-[11px] text-red-500">{runError}</span>
      )}

      <button
        onClick={onChat}
        className="flex h-[40px] items-center gap-2 rounded-[12px] border border-[#2d2d2d] bg-white px-[16px] text-[13px] font-medium text-[#1a1a1a] transition-colors hover:bg-[#f8f8f7]"
      >
        <MessageSquare size={14} />
        Chat
      </button>

      <div className="hidden items-center gap-2 sm:flex">
        <span className="text-[12px] text-[#949494]">
          {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {edgeCount} connection{edgeCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
