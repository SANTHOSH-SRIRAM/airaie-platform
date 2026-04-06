import { cn } from '@utils/cn';
import type { RunNodeAttempt } from '@/types/run';

const dotColors: Record<string, string> = {
  completed: 'bg-green-500',
  running: 'bg-blue-500',
  failed: 'bg-red-500',
  pending: 'bg-gray-300',
  skipped: 'bg-gray-300',
};

interface RunNodeHistoryProps {
  attempts: RunNodeAttempt[];
}

export default function RunNodeHistory({ attempts }: RunNodeHistoryProps) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-cds-text-secondary tracking-wider uppercase mb-2">
        EXECUTION HISTORY
      </h4>

      {attempts.length === 0 ? (
        <p className="text-xs text-cds-text-secondary italic">No execution history yet.</p>
      ) : (
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[5px] top-2 bottom-2 border-l-2 border-gray-200" />

          <div className="space-y-3">
            {[...attempts].reverse().map((attempt) => (
              <div key={attempt.attempt} className="flex gap-3 relative">
                {/* Dot */}
                <span
                  className={cn(
                    'w-3 h-3 rounded-full shrink-0 mt-0.5 z-10',
                    dotColors[attempt.status] ?? 'bg-gray-300',
                  )}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-cds-text-primary">
                      Attempt #{attempt.attempt}
                    </span>
                    <span className="text-[10px] text-cds-text-secondary capitalize">
                      {attempt.status}
                    </span>
                  </div>
                  {attempt.duration != null && (
                    <p className="text-[10px] text-cds-text-secondary">{attempt.duration}s</p>
                  )}
                  {attempt.error && (
                    <p className="text-[10px] text-red-600 mt-0.5">{attempt.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
