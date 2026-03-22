import { cn } from '@utils/cn';

interface KbdProps {
  children: string;
  className?: string;
}

export default function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center px-1.5 h-5',
        'bg-gray-20 border border-gray-30 text-xs text-cds-text-secondary font-mono',
        className
      )}
    >
      {children}
    </kbd>
  );
}
