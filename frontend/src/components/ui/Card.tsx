import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export default function Card({ children, hover, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white shadow-card border border-surface-border',
        hover && 'hover:shadow-card-hover transition-shadow duration-200',
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
    <div className={cn('px-5 py-4 border-b border-surface-border', className)} {...props}>
      {children}
    </div>
  );
}

function CardBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-3 border-t border-surface-border', className)} {...props}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
