import { useState, type ReactNode } from 'react';
import { cn } from '@utils/cn';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: TooltipPosition;
  className?: string;
}

const positionStyles: Record<TooltipPosition, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
};

const caretStyles: Record<TooltipPosition, string> = {
  top:    'top-full left-1/2 -translate-x-1/2 border-t-gray-100 border-x-transparent border-b-0 border-[5px]',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-100 border-x-transparent border-t-0 border-[5px]',
  left:   'left-full top-1/2 -translate-y-1/2 border-l-gray-100 border-y-transparent border-r-0 border-[5px]',
  right:  'right-full top-1/2 -translate-y-1/2 border-r-gray-100 border-y-transparent border-l-0 border-[5px]',
};

export default function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
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
          role="tooltip"
          className={cn(
            'absolute px-4 py-2',
            'bg-gray-100 text-white text-sm max-w-[288px]',
            'animate-fade-in pointer-events-none z-50',
            positionStyles[position],
            className
          )}
        >
          {content}
          <span className={cn('absolute', caretStyles[position])} />
        </div>
      )}
    </div>
  );
}
