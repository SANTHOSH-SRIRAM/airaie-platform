import { Clock, Cpu, MemoryStick, DollarSign, Repeat } from 'lucide-react';
import type { RunNodeMetrics as RunNodeMetricsType } from '@/types/run';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded bg-gray-20/30">
      <span className="text-cds-icon-secondary [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <div>
        <p className="text-[10px] text-cds-text-secondary">{label}</p>
        <p className="text-sm font-medium text-cds-text-primary">{value}</p>
      </div>
    </div>
  );
}

interface RunNodeMetricsProps {
  metrics: RunNodeMetricsType | null;
  duration: number | undefined;
}

export default function RunNodeMetrics({ metrics, duration }: RunNodeMetricsProps) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-cds-text-secondary tracking-wider uppercase mb-2">
        METRICS
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={<Clock />}
          label="Duration"
          value={duration != null ? `${duration}s` : '\u2014'}
        />
        <MetricCard
          icon={<Cpu />}
          label="CPU"
          value={metrics ? `${metrics.cpuPercent}%` : '\u2014'}
        />
        <MetricCard
          icon={<MemoryStick />}
          label="Memory"
          value={metrics ? `${metrics.memoryMb} MB` : '\u2014'}
        />
        <MetricCard
          icon={<DollarSign />}
          label="Cost"
          value={metrics ? `$${metrics.costUsd.toFixed(2)}` : '\u2014'}
        />
        <MetricCard
          icon={<Repeat />}
          label="Attempt"
          value={metrics ? `#${metrics.attempt}` : '\u2014'}
        />
      </div>
    </div>
  );
}
