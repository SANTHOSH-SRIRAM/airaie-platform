import type { ReactNode } from 'react';
import { cn } from '@utils/cn';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'high-contrast';
type BadgeStyle = 'filled' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  badgeStyle?: BadgeStyle;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const filledStyles: Record<BadgeVariant, string> = {
  success:        'bg-green-20 text-green-80',
  warning:        'bg-yellow-20/30 text-gray-100',
  danger:         'bg-red-20 text-red-80',
  info:           'bg-blue-20 text-blue-80',
  default:        'bg-gray-20 text-gray-100',
  'high-contrast':'bg-gray-100 text-white',
};

const outlineStyles: Record<BadgeVariant, string> = {
  success:        'border border-green-50 text-green-60 bg-transparent',
  warning:        'border border-yellow-30 text-gray-100 bg-transparent',
  danger:         'border border-red-50 text-red-60 bg-transparent',
  info:           'border border-blue-60 text-blue-60 bg-transparent',
  default:        'border border-gray-50 text-gray-70 bg-transparent',
  'high-contrast':'border border-gray-100 text-gray-100 bg-transparent',
};

const dotColors: Record<BadgeVariant, string> = {
  success:        'bg-green-50',
  warning:        'bg-yellow-30',
  danger:         'bg-red-50',
  info:           'bg-blue-60',
  default:        'bg-gray-50',
  'high-contrast':'bg-gray-100',
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
        'inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-xs font-normal',
        'transition-colors duration-75',
        badgeStyle === 'outline' ? outlineStyles[variant] : filledStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
