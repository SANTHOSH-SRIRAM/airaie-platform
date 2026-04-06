import { useUiStore } from '@store/uiStore';
import SidebarContentRouter from './SidebarContentRouter';

export default function Sidebar() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <aside
      role="navigation"
      aria-label="Sidebar navigation"
      className="shrink-0 transition-[width] duration-150 ease-out overflow-visible pl-[16px]"
      style={{ width: sidebarCollapsed ? '0px' : '236px' }}
    >
      <div className="w-[220px] h-full bg-white rounded-[12px] border border-[#ece9e3] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-[12px]">
          <SidebarContentRouter />
        </div>
      </div>
    </aside>
  );
}
