import { ArrowDownToLine, ArrowUpToLine, LayoutGrid, List, Settings } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUiStore } from '@store/uiStore';
import { cn } from '@utils/cn';

const TOOLBAR_ITEMS = [
  { icon: LayoutGrid, label: 'Grid', action: 'grid' as const },
  { icon: List, label: 'List', action: 'toggleRightPanel' as const },
  { icon: ArrowUpToLine, label: 'Upload', action: 'upload' as const },
  { icon: ArrowDownToLine, label: 'Download', action: 'download' as const },
  { icon: Settings, label: 'Settings', action: 'settings' as const },
] as const;

export default function VerticalToolbar() {
  const { pathname } = useLocation();
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const rightPanelOpen = useUiStore((s) => s.rightPanel.open);

  const handleClick = (action: string) => {
    if (action === 'toggleRightPanel') toggleRightPanel();
  };

  return (
    <div className="w-[56px] h-full flex items-start pr-[16px]">
      <div
        data-testid="vertical-toolbar"
        role="toolbar"
        aria-orientation="vertical"
        aria-label="Quick actions"
        className="w-[40px] bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] flex flex-col items-center py-[4px] gap-[4px]"
      >
        {TOOLBAR_ITEMS.map((item) => {
          const isActive =
            (item.action === 'toggleRightPanel' && rightPanelOpen) ||
            (item.action === 'grid' && pathname.startsWith('/workflows')) ||
            (item.action === 'toggleRightPanel' && pathname.startsWith('/tools'));
          return (
            <button
              key={item.label}
              onClick={() => handleClick(item.action)}
              className={cn(
                'w-[32px] h-[32px] flex items-center justify-center rounded-full transition-colors duration-100',
                isActive
                  ? 'bg-[#f5f5f0] text-[#1a1a1a]'
                  : 'text-[#949494] hover:bg-[#f5f5f0] hover:text-[#1a1a1a]'
              )}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              <item.icon size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
