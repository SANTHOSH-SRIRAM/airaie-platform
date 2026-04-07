import { Package, Minus, Settings2 } from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';

export default function ArtifactsSidebar() {
  const activeSection = useUiStore((s) => s.activeArtifactSection);
  const setActiveSection = useUiStore((s) => s.setActiveArtifactSection);

  const navItems = [
    { id: 'overview', label: 'Artifacts Overvi...' },
    { id: 'list', label: 'Artifacts List' },
    { id: 'detail', label: 'Artifact Detail' },
    { id: 'lineage', label: 'Artifact Lineage' },
  ];

  return (
    <aside className="flex flex-col h-full bg-white">
      <p className="text-[9px] font-semibold tracking-[0.1em] text-[#acacac] uppercase px-2 mb-2">AX Suite 101</p>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[12px] text-left transition-colors',
              activeSection === item.id
                ? 'bg-[#1a1a1a] text-white font-medium'
                : 'text-[#2d2d2d] hover:bg-[#f0f0ec]'
            )}
          >
            <Package size={12} className={activeSection === item.id ? 'text-white' : 'text-[#949494]'} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 px-2 flex flex-col gap-1">
        <p className="text-[9px] font-semibold tracking-[0.1em] text-[#acacac] uppercase mb-1">Filters & Search</p>
        {['Ready artifacts', 'My artifacts', 'Active lineage'].map((f) => (
          <label key={f} className="flex items-center gap-2 text-[11px] text-[#6b6b6b] cursor-pointer hover:text-[#1a1a1a]">
            <input type="checkbox" className="accent-[#1a1a1a] w-3 h-3" />
            {f}
          </label>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-0.5 pt-4 mt-4 border-t border-[#f0f0ec]">
        <button type="button" className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-[#6b6b6b] rounded-[6px] hover:bg-[#f0f0ec] hover:text-[#1a1a1a] transition-colors">
          <Minus size={11} /> Compact Module
        </button>
        <button type="button" className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-[#6b6b6b] rounded-[6px] hover:bg-[#f0f0ec] hover:text-[#1a1a1a] transition-colors">
          <Settings2 size={11} /> Section Settings
        </button>
      </div>
    </aside>
  );
}
