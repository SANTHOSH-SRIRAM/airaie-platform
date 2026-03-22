import { cn } from '@utils/cn';

type ProgressVariant = 'default' | 'blue' | 'green' | 'amber' | 'red';
type ProgressSize = 'sm' | 'md';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  label?: string;
  helperText?: string;
  showPercent?: boolean;
  striped?: boolean;
  className?: string;
}

const barColors: Record<ProgressVariant, string> = {
  default: 'bg-brand-primary',
  blue:    'bg-brand-primary',
  green:   'bg-green-50',
  amber:   'bg-yellow-30',
  red:     'bg-red-60',
};

export default function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  label,
  helperText,
  showPercent = true,
  striped = false,
  className,
}: ProgressBarProps) {
  const percent = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className={cn('w-full', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-xs text-cds-text-secondary tracking-wide">{label}</span>}
          {showPercent && <span className="text-xs text-cds-text-secondary">{percent}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-gray-20 overflow-hidden', size === 'sm' ? 'h-1' : 'h-2')}>
        <div
          className={cn('h-full transition-all duration-200', barColors[variant])}
          style={{
            width: `${percent}%`,
            ...(striped
              ? {
                  backgroundImage:
                    'repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)',
                  backgroundSize: '8px 8px',
                }
              : {}),
          }}
        />
      </div>
      {helperText && (
        <p className="text-xs text-cds-text-helper mt-1">{helperText}</p>
      )}
    </div>
  );
}
