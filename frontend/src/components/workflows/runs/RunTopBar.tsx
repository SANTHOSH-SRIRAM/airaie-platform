import type { RunDetail } from '@/types/run';
import RunStatusBadge from './RunStatusBadge';

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

interface RunTopBarProps {
  runDetail: RunDetail | undefined;
}

export default function RunTopBar({ runDetail }: RunTopBarProps) {
  if (!runDetail) {
    return (
      <div className="h-12 bg-surface border-b border-cds-border-subtle flex items-center px-4 shrink-0">
        <div className="h-4 w-32 bg-gray-20/50 rounded animate-pulse" />
        <div className="flex-1" />
        <div className="h-4 w-24 bg-gray-20/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-12 bg-surface border-b border-cds-border-subtle flex items-center px-4 shrink-0">
      {/* Left: Run ID + status */}
      <span className="text-sm font-semibold text-cds-text-primary mr-2">
        Run {runDetail.id}
      </span>
      <RunStatusBadge status={runDetail.status} size="sm" />

      <div className="flex-1" />

      {/* Center: started + cost */}
      <span className="text-xs text-cds-text-secondary mr-4">
        Started {formatTime(runDetail.startedAt)}
      </span>
      <span className="text-xs text-cds-text-secondary mr-4">
        Cost ${runDetail.costUsd.toFixed(2)}
      </span>

      {/* Right: duration */}
      <span className="text-xs font-medium text-cds-text-primary">
        {formatDuration(runDetail.duration)}
      </span>
    </div>
  );
}
