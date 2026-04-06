import type { AgentMetrics } from '@/types/agentPlayground';
import ProgressBar from '@components/ui/ProgressBar';
import { cn } from '@utils/cn';

interface LiveMetricsProps {
  metrics: AgentMetrics | undefined | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function LiveMetrics({ metrics }: LiveMetricsProps) {
  if (!metrics) {
    return (
      <div data-testid="live-metrics" className="space-y-2">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">
          LIVE METRICS
        </p>
        <p className="text-xs text-cds-text-secondary">Waiting for metrics...</p>
      </div>
    );
  }

  const totalBudget = metrics.totalCost + metrics.budgetRemaining;
  const budgetUsedPercent = totalBudget > 0 ? Math.round((metrics.totalCost / totalBudget) * 100) : 0;
  const durationWarning = metrics.timeout > 0 && (metrics.duration / metrics.timeout) > 0.8;

  return (
    <div data-testid="live-metrics" className="space-y-3">
      <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">
        LIVE METRICS
      </p>

      <div className="space-y-2">
        {/* Iterations */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Iterations</span>
          <span className="text-cds-text-primary font-medium">
            {metrics.iterations.current} / {metrics.iterations.max}
          </span>
        </div>

        {/* Total cost */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Total cost</span>
          <span data-testid="metric-cost" className="text-cds-text-primary font-medium">
            ${metrics.totalCost.toFixed(2)}
          </span>
        </div>

        {/* Budget remaining */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-cds-text-secondary">Budget remaining</span>
            <span data-testid="metric-budget" className="text-cds-text-primary font-medium">
              ${metrics.budgetRemaining.toFixed(2)}
            </span>
          </div>
          <ProgressBar
            value={budgetUsedPercent}
            max={100}
            variant={budgetUsedPercent > 80 ? 'red' : 'blue'}
            size="sm"
            showPercent={false}
          />
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Duration</span>
          <span className="text-cds-text-primary font-medium">
            {formatDuration(metrics.duration)}
          </span>
        </div>

        {/* Timeout */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Timeout</span>
          <span
            className={cn(
              'font-medium',
              durationWarning ? 'text-yellow-30' : 'text-cds-text-primary',
            )}
          >
            {formatDuration(metrics.timeout)}
          </span>
        </div>
      </div>
    </div>
  );
}
