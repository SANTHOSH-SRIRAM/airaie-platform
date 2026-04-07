import { useUiStore } from '@store/uiStore';
import { cn } from '@utils/cn';
import { LayoutDashboard, History, FileText, PlayCircle, BarChart3, Activity, Link2, AlertTriangle, Play, Edit } from 'lucide-react';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'versions', label: 'Version History', icon: History },
  { id: 'contract', label: 'Tool Contract', icon: FileText },
  { id: 'execution', label: 'Execution Configuration', icon: PlayCircle },
  { id: 'analytics', label: 'Usage Analytics', icon: BarChart3 },
  { id: 'runs', label: 'Recent Runs', icon: Activity, count: 5 },
  { id: 'used-in', label: 'Used In', icon: Link2 },
  { id: 'test-run', label: 'Test Run', icon: Play },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, warning: true },
];

export default function ToolDetailSidebar() {
  const activeToolSection = useUiStore((s) => s.activeToolSection);
  const setActiveToolSection = useUiStore((s) => s.setActiveToolSection);

  const handleNavClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const container = document.getElementById('tool-detail-scroll-container') || document.getElementById('main-content');
    const el = document.getElementById(id);
    if (el && container) {
      setActiveToolSection(id);
      
      const containerTop = container.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      const offset = elTop - containerTop + container.scrollTop - 20;

      container.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fbfaf9]">
      <div className="p-4 border-b border-[#ece9e3]">
        <h2 className="text-[10px] font-bold text-[#acacac] uppercase tracking-wider mb-2">Tool</h2>
        <p className="text-[12px] text-[#949494] leading-relaxed">
          Context-aware navigation for the FEA Solver specification page.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <ul className="space-y-1">
          {SECTIONS.map((section) => {
            const isActive = activeToolSection === section.id;
            return (
              <li key={section.id}>
                <button
                  onClick={(e) => handleNavClick(section.id, e)}
                  className={cn(
                    'w-full flex items-center justify-between h-[36px] px-3 rounded-[8px] text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-[#efefeb] text-[#1a1a1a]'
                      : 'text-[#6b6b6b] hover:bg-[#efefeb] hover:text-[#1a1a1a]',
                    section.warning && !isActive && 'text-[#e74c3c] hover:bg-[#ffebee]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <section.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{section.label}</span>
                  </div>
                  {section.count !== undefined && (
                    <span className="w-5 h-5 rounded-full bg-[#e8e8e8] flex items-center justify-center text-[10px] font-bold text-[#6b6b6b]">
                      {section.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-[#ece9e3]">
        <h3 className="text-[10px] font-bold text-[#acacac] uppercase tracking-wider mb-3">Context Actions</h3>
        <div className="flex flex-col space-y-1">
          <button className="flex items-center gap-3 h-[32px] px-3 rounded-[6px] text-[#2196f3] text-[13px] font-medium hover:bg-[#e3f2fd]">
             <Play size={15}/> Run Test
          </button>
          <button className="flex items-center gap-3 h-[32px] px-3 rounded-[6px] text-[#6b6b6b] text-[13px] font-medium hover:bg-[#efefeb] hover:text-[#1a1a1a]">
             <Edit size={15}/> Edit Contract
          </button>
          <button className="flex items-center gap-3 h-[32px] px-3 rounded-[6px] text-[#6b6b6b] text-[13px] font-medium hover:bg-[#efefeb] hover:text-[#1a1a1a]">
             <BarChart3 size={15}/> View Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
