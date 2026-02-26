import type { ReactNode } from 'react';
import { cn } from '@utils/cn';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';
type BadgeStyle = 'filled' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  badgeStyle?: BadgeStyle;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const filledStyles: Record<BadgeVariant, string> = {
  success: 'bg-status-success-light text-green-800',
  warning: 'bg-status-warning-light text-yellow-800',
  danger: 'bg-status-danger-light text-red-800',
  info: 'bg-status-info-light text-blue-800',
  default: 'bg-gray-100 text-gray-700',
};

const outlineStyles: Record<BadgeVariant, string> = {
  success: 'border border-status-success text-status-success bg-white',
  warning: 'border border-status-warning text-status-warning bg-white',
  danger: 'border border-status-danger text-status-danger bg-white',
  info: 'border border-status-info text-status-info bg-white',
  default: 'border border-gray-300 text-gray-600 bg-white',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
  info: 'bg-status-info',
  default: 'bg-gray-400',
};

export default function Badge({
  variant = 'default',
  badgeStyle = 'filled',
  dot,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
        badgeStyle === 'outline' ? outlineStyles[variant] : filledStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
