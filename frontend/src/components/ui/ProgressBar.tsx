import { cn } from '@utils/cn';

type ProgressVariant = 'default' | 'blue' | 'green' | 'amber' | 'red';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  label?: string;
  showPercent?: boolean;
  striped?: boolean;
  className?: string;
}

const barColors: Record<ProgressVariant, string> = {
  default: 'bg-slate-500',
  blue: 'bg-brand-secondary',
  green: 'bg-status-success',
  amber: 'bg-status-warning',
  red: 'bg-status-danger',
};

export default function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  label,
  showPercent = true,
  striped = false,
  className,
}: ProgressBarProps) {
  const percent = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-content-primary">{label}</span>}
          {showPercent && <span className="text-sm font-medium text-content-primary">{percent}%</span>}
        </div>
      )}
      <div className="w-full h-[7px] bg-gray-100 rounded-sm overflow-hidden">
        <div
          className={cn('h-full rounded-sm transition-all duration-500', barColors[variant])}
          style={{
            width: `${percent}%`,
            ...(striped
              ? {
                  backgroundImage:
                    'repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)',
                  backgroundSize: '8px 8px',
                }
              : {}),
          }}
        />
      </div>
    </div>
  );
}
