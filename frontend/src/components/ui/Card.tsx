import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@utils/cn';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'accent';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default:  'bg-card-bg border border-card-border shadow-card',
  elevated: 'bg-card-bg border border-card-border shadow-elevated',
  outlined: 'bg-card-bg border border-border-strong',
  accent:   'bg-card-bg border border-card-border shadow-card border-t-2 border-t-brand-primary',
};

export default function Card({ children, hover, variant = 'default', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        variantStyles[variant],
        hover && 'hover:shadow-card-hover hover:border-border-strong transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-3.5 border-b border-card-border-inner bg-card-header', className)} {...props}>
      {children}
    </div>
  );
}

function CardBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-5', className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-3.5 border-t border-card-border-inner bg-card-header', className)} {...props}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
