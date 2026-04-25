import {
  LayoutDashboard, GitBranch, Bot, Wrench, LayoutGrid,
  CirclePlus, Settings, HelpCircle, Package,
} from 'lucide-react';
import { ROUTES } from '@constants/routes';
import SidebarSection from './SidebarSection';
import SidebarItem from './SidebarItem';

const RECENT_ITEMS: Array<{ label: string; color: string }> = [];

export default function SidebarNavigation() {
  return (
    <nav className="flex flex-col h-full" aria-label="Sidebar navigation">
      {/* WORKSPACE — always-home */}
      <SidebarSection title="Workspace" collapsible={false}>
        <SidebarItem icon={<LayoutDashboard size={16} />} label="Dashboard" path={ROUTES.DASHBOARD} />
      </SidebarSection>

      {/* EXECUTE — do the work, govern the work */}
      <SidebarSection title="Execute" collapsible={false}>
        <SidebarItem icon={<GitBranch size={16} />} label="Workflows" path={ROUTES.WORKFLOWS} badge={8} />
        <SidebarItem icon={<LayoutGrid size={16} />} label="Boards" path={ROUTES.BOARDS} badge={2} />
      </SidebarSection>

      {/* CONFIGURE — set up the intelligence + catalog */}
      <SidebarSection title="Configure" collapsible={false}>
        <SidebarItem icon={<Bot size={16} />} label="Agents" path={ROUTES.AGENTS} badge={3} />
        <SidebarItem icon={<Wrench size={16} />} label="Tools" path={ROUTES.TOOLS} badge={14} />
      </SidebarSection>

      {/* DATA — the trail */}
      <SidebarSection title="Data" collapsible={false}>
        <SidebarItem icon={<Package size={16} />} label="Artifacts" path={ROUTES.ARTIFACTS} badge={47} />
      </SidebarSection>

      {/* QUICK ACTIONS */}
      <SidebarSection title="Quick Actions" collapsible={false}>
        <SidebarItem icon={<CirclePlus size={16} />} label="New Workflow" path={ROUTES.WORKFLOW_STUDIO} />
        <SidebarItem icon={<CirclePlus size={16} />} label="New Agent" path={ROUTES.AGENT_STUDIO} />
        <SidebarItem icon={<CirclePlus size={16} />} label="Register Tool" path={ROUTES.TOOLS} />
      </SidebarSection>

      {/* RECENT */}
      <SidebarSection title="Recent" collapsible={false}>
        {RECENT_ITEMS.map((item) => (
          <SidebarItem
            key={item.label}
            bullet
            bulletColor={item.color}
            label={item.label}
            compact
          />
        ))}
      </SidebarSection>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom items */}
      <div className="flex flex-col gap-[4px] pt-[8px]">
        <SidebarItem icon={<Settings size={16} />} label="Settings" path="/settings" />
        <SidebarItem icon={<HelpCircle size={16} />} label="Help & Docs" path="/help" />
      </div>
    </nav>
  );
}
