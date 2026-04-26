import type { AgentMetrics } from '@/types/agentPlayground';
import { cn } from '@utils/cn';

interface LiveMetricsProps {
  metrics: AgentMetrics | undefined | null;
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

  const maxLabel = metrics.iterations.max != null ? String(metrics.iterations.max) : '—';

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
            {metrics.iterations.current ?? '—'} / {maxLabel}
          </span>
        </div>

        {/* Total cost */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Total cost</span>
          <span
            data-testid="metric-cost"
            className={cn('font-medium', metrics.totalCost != null ? 'text-cds-text-primary' : 'text-cds-text-secondary')}
          >
            {metrics.totalCost != null ? `$${metrics.totalCost.toFixed(2)}` : '—'}
          </span>
        </div>

        {/* Budget remaining */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Budget remaining</span>
          <span
            data-testid="metric-budget"
            className={cn('font-medium', metrics.budgetRemaining != null ? 'text-cds-text-primary' : 'text-cds-text-secondary')}
          >
            {metrics.budgetRemaining != null ? `$${metrics.budgetRemaining.toFixed(2)}` : '—'}
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Duration</span>
          <span className={cn('font-medium', metrics.duration != null ? 'text-cds-text-primary' : 'text-cds-text-secondary')}>
            {metrics.duration != null
              ? (metrics.duration < 60 ? `${metrics.duration}s` : `${Math.floor(metrics.duration / 60)}m ${metrics.duration % 60}s`)
              : '—'}
          </span>
        </div>

        {/* Timeout */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Timeout</span>
          <span className={cn('font-medium', metrics.timeout != null ? 'text-cds-text-primary' : 'text-cds-text-secondary')}>
            {metrics.timeout != null
              ? (metrics.timeout < 60 ? `${metrics.timeout}s` : `${Math.floor(metrics.timeout / 60)}m ${metrics.timeout % 60}s`)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
