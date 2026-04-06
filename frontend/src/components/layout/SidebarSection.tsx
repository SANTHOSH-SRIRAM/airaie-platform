import { type ReactNode } from 'react';
import { useUiStore } from '@store/uiStore';

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  sectionKey?: string;
  /** Whether section is collapsible (default true) */
  collapsible?: boolean;
}

export default function SidebarSection({ title, children, sectionKey, collapsible = true }: SidebarSectionProps) {
  const key = sectionKey ?? title.toLowerCase().replace(/\s+/g, '-');
  const open = useUiStore((s) => s.sidebarSections[key] ?? true);
  const toggleSection = useUiStore((s) => s.toggleSection);

  return (
    <div className="mt-[8px]">
      <button
        onClick={() => collapsible && toggleSection(key)}
        aria-expanded={open}
        className="w-full px-[8px] py-[3px] text-left text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]"
        style={{ letterSpacing: '0.5px' }}
      >
        {title}
      </button>
      {open && <div className="flex flex-col gap-[4px] mt-[4px]">{children}</div>}
    </div>
  );
}
