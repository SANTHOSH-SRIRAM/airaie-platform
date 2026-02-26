import { useState, type ReactNode } from 'react';
import { cn } from '@utils/cn';

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export default function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5',
            'bg-gray-800 text-white text-xs rounded-md whitespace-nowrap',
            'animate-fade-in pointer-events-none z-50',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
