import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@utils/cn';

interface DropdownItem {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

export default function Dropdown({ trigger, items, onSelect, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute top-full mt-1 min-w-[160px] py-1',
            'bg-white border border-surface-border rounded-lg shadow-dropdown z-50',
            'animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                onSelect(item.value);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-content-primary hover:bg-gray-50 transition-colors"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
