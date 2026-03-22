import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@utils/cn';

interface DropdownItem {
  label: string;
  value: string;
  icon?: ReactNode;
  divider?: boolean;
  disabled?: boolean;
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
          role="menu"
          className={cn(
            'absolute top-full mt-0 min-w-[160px] py-1',
            'bg-cds-layer-02 border border-cds-border-subtle shadow-dropdown z-50',
            'animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) =>
            item.divider ? (
              <div key={item.value} className="h-px bg-cds-border-subtle my-1" />
            ) : (
              <button
                key={item.value}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    onSelect(item.value);
                    setOpen(false);
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-2 h-10 px-4 text-sm',
                  'text-cds-text-secondary transition-colors duration-100',
                  item.disabled
                    ? 'text-cds-text-disabled cursor-not-allowed'
                    : 'hover:bg-cds-layer-hover-02 active:bg-cds-layer-active-01 cursor-pointer'
                )}
              >
                {item.icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
