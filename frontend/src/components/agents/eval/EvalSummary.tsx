import { CheckCircle, XCircle, AlertTriangle, Clock, Target, DollarSign } from 'lucide-react';
import Badge from '@components/ui/Badge';
import { cn } from '@utils/cn';

/* ---------- Types ---------- */

export interface EvalRunSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  pass_rate: number;
  avg_score: number;
  avg_cost: number;
  total_duration_ms: number;
}

interface EvalSummaryProps {
  summary: EvalRunSummary;
}

/* ---------- Helpers ---------- */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function passRateVariant(rate: number): 'success' | 'warning' | 'danger' {
  if (rate >= 80) return 'success';
  if (rate >= 50) return 'warning';
  return 'danger';
}

/* ---------- Component ---------- */

export default function EvalSummary({ summary }: EvalSummaryProps) {
  const passRateColor = passRateVariant(summary.pass_rate);

  const statCards = [
    {
      label: 'Pass Rate',
      value: `${summary.pass_rate.toFixed(1)}%`,
      icon: Target,
      variant: passRateColor,
    },
    {
      label: 'Avg Score',
      value: summary.avg_score.toFixed(2),
      icon: CheckCircle,
      variant: 'info' as const,
    },
    {
      label: 'Avg Cost',
      value: `$${summary.avg_cost.toFixed(2)}`,
      icon: DollarSign,
      variant: 'default' as const,
    },
    {
      label: 'Duration',
      value: formatDuration(summary.total_duration_ms),
      icon: Clock,
      variant: 'default' as const,
    },
  ] as const;

  const colorMap = {
    success: 'text-green-50',
    warning: 'text-yellow-30',
    danger: 'text-red-50',
    info: 'text-blue-60',
    default: 'text-cds-text-primary',
  };

  const bgMap = {
    success: 'bg-green-20/40',
    warning: 'bg-yellow-20/30',
    danger: 'bg-red-20/40',
    info: 'bg-blue-20/40',
    default: 'bg-gray-20/40',
  };

  return (
    <div data-testid="eval-summary" className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, variant }) => (
          <div
            key={label}
            className={cn(
              'rounded-lg border border-card-border p-3 text-center',
              bgMap[variant],
            )}
          >
            <Icon className={cn('w-4 h-4 mx-auto mb-1', colorMap[variant])} />
            <p className={cn('text-lg font-semibold', colorMap[variant])}>{value}</p>
            <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Pass / Fail / Error counts */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-green-50" />
          <Badge variant="success">{summary.passed} Passed</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-red-50" />
          <Badge variant="danger">{summary.failed} Failed</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-30" />
          <Badge variant="warning">{summary.errors} Errors</Badge>
        </div>
        <span className="text-xs text-cds-text-secondary ml-auto">
          Total: {summary.total} test cases
        </span>
      </div>

      {/* Pass Rate Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-cds-text-secondary">Pass Rate</span>
          <span className={cn('text-xs font-medium', colorMap[passRateColor])}>
            {summary.pass_rate.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-20 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              passRateColor === 'success' ? 'bg-green-50' : passRateColor === 'warning' ? 'bg-yellow-30' : 'bg-red-50',
            )}
            style={{ width: `${Math.min(summary.pass_rate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
