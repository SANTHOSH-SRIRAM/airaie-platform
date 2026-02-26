import { cn } from '@utils/cn';

interface KbdProps {
  children: string;
  className?: string;
}

export default function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded',
        'bg-gray-100 border border-gray-200 text-xs text-content-tertiary font-mono',
        className
      )}
    >
      {children}
    </kbd>
  );
}
