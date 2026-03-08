import { useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function SidebarSection({ title, children, defaultOpen = true }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-surface-border pt-2 mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-section-header hover:text-content-tertiary transition-colors"
      >
        {title}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && <div className="space-y-0.5 mt-0.5">{children}</div>}
    </div>
  );
}
