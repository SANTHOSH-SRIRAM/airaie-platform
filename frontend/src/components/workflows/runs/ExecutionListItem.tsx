import { cn } from '@utils/cn';
import type { RunEntry } from '@/types/run';

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return 'Yesterday';
}

const STATUS_BORDER: Record<RunEntry['status'], string> = {
  running: '#2f8cff',
  succeeded: '#20c05c',
  failed: '#ff4f4f',
  waiting: '#ff9800',
  cancelled: '#b5b1ab',
};

const STATUS_TEXT: Record<RunEntry['status'], string> = {
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed at FEA Solver · Node error',
  waiting: 'Waiting · Gate approval pending',
  cancelled: 'Cancelled',
};

interface ExecutionListItemProps {
  run: RunEntry;
  isSelected: boolean;
  isLive?: boolean;
  onClick: () => void;
}

export default function ExecutionListItem({ run, isSelected, isLive, onClick }: ExecutionListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full border-b border-[#f0ede8] border-l-[3px] px-4 py-3 text-left transition-colors',
        'hover:bg-[#faf8f5]',
        isSelected ? 'bg-[#f3f3f3]' : 'bg-white'
      )}
      style={{ borderLeftColor: STATUS_BORDER[run.status] }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 truncate font-mono text-[13px] font-semibold text-[#1a1a1a]">
              {run.id}
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  LIVE
                </span>
              )}
            </span>
            <span className="shrink-0 text-[12px] text-[#b2aea8]">{formatRelative(run.startedAt)}</span>
          </div>

          <p className="mt-2 text-[12px] text-[#8f8a83]">
            {run.status === 'running'
              ? `${STATUS_TEXT[run.status]} · ${run.nodesCompleted}/${run.nodesTotal} nodes complete`
              : run.status === 'succeeded'
                ? `${STATUS_TEXT[run.status]} · ${formatDuration(run.duration)} · ${run.nodesCompleted}/${run.nodesTotal} nodes`
                : STATUS_TEXT[run.status]}
          </p>
        </div>

        <span className="shrink-0 text-[13px] text-[#8f8a83]">
          ${run.costUsd.toFixed(2)}
        </span>
      </div>

      {isSelected && <div className="mt-3 h-[2px] w-[175px] rounded-full bg-[#2f8cff]" />}
    </button>
  );
}
