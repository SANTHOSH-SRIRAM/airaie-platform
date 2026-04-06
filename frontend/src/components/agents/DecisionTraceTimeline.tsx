import type { DecisionTraceEntry } from '@/types/agentPlayground';
import Badge from '@components/ui/Badge';
import { cn } from '@utils/cn';

interface DecisionTraceTimelineProps {
  entries: DecisionTraceEntry[];
}

function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const dotColorByStatus: Record<DecisionTraceEntry['status'], string> = {
  completed: 'bg-green-50',
  running: 'bg-blue-60',
  pending: 'bg-gray-30',
  failed: 'bg-red-50',
};

export default function DecisionTraceTimeline({ entries }: DecisionTraceTimelineProps) {
  return (
    <div data-testid="decision-trace-timeline" className="relative">
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1;
        return (
          <div key={entry.id} data-testid="trace-entry" className="flex gap-3 pb-4 last:pb-0">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0 mt-1',
                  dotColorByStatus[entry.status],
                  entry.status === 'running' && 'animate-pulse',
                )}
              />
              {!isLast && (
                <div className="w-px flex-1 bg-gray-20 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-cds-text-primary truncate">
                  {entry.label}
                </span>
                {entry.timestamp && (
                  <span className="text-[10px] text-cds-text-secondary shrink-0">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                )}
              </div>
              {entry.detail && (
                <p className="text-xs text-cds-text-secondary mt-0.5 leading-relaxed">
                  {entry.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
