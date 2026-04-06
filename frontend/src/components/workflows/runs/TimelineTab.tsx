import { cn } from '@utils/cn';
import type { RunDetail, RunNodeStatus } from '@/types/run';

const dotColors: Record<RunNodeStatus, string> = {
  completed: 'bg-green-500',
  running: 'bg-blue-500 animate-pulse',
  failed: 'bg-red-500',
  pending: 'bg-gray-300',
  skipped: 'bg-gray-300',
};

interface TimelineTabProps {
  runDetail: RunDetail | undefined;
}

export default function TimelineTab({ runDetail }: TimelineTabProps) {
  if (!runDetail) {
    return (
      <div className="p-4 text-xs text-cds-text-secondary">No run data available.</div>
    );
  }

  const maxDuration = Math.max(...runDetail.nodes.map((n) => n.duration ?? 0), 1);

  return (
    <div className="p-3 space-y-1">
      {runDetail.nodes.map((node) => (
        <div key={node.nodeId} className="flex items-center gap-3">
          {/* Status dot */}
          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotColors[node.status])} />

          {/* Node name */}
          <span className="text-xs text-cds-text-primary w-32 truncate shrink-0">{node.nodeName}</span>

          {/* Start time */}
          <span className="text-[10px] text-cds-text-secondary w-16 shrink-0">
            {node.startedAt ? new Date(node.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '\u2014'}
          </span>

          {/* Duration bar */}
          <div className="flex-1 h-4 bg-gray-20/50 rounded overflow-hidden">
            {(node.duration ?? 0) > 0 && (
              <div
                className={cn(
                  'h-full rounded',
                  node.status === 'completed' ? 'bg-green-400/60' :
                  node.status === 'running' ? 'bg-blue-400/60 animate-pulse' :
                  node.status === 'failed' ? 'bg-red-400/60' : 'bg-gray-300/60',
                )}
                style={{ width: `${Math.max(((node.duration ?? 0) / maxDuration) * 100, 2)}%` }}
              />
            )}
          </div>

          {/* Duration text */}
          <span className="text-[10px] text-cds-text-secondary w-10 text-right shrink-0">
            {node.duration != null ? `${node.duration.toFixed(1)}s` : '\u2014'}
          </span>
        </div>
      ))}
    </div>
  );
}
