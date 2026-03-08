import {
  LayoutDashboard,
  Globe,
  Code2,
  GitBranch,
  Bot,
  BarChart3,
  Users,
} from 'lucide-react';
import { ROUTES } from '@constants/routes';
import SidebarSection from './SidebarSection';
import SidebarItem from './SidebarItem';
import UserCard from './UserCard';

export default function Sidebar() {
  return (
    <aside className="w-[230px] h-screen bg-white border-r border-surface-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[52px] shrink-0">
        <div className="w-7 h-7 bg-brand-secondary rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-xs">A</span>
        </div>
        <span className="font-bold text-content-primary text-[14px] tracking-tight">
          AIRAIE<span className="text-content-tertiary font-bold">.CAD</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-2 scrollbar-hide">
        {/* Dashboard */}
        <div className="px-0">
          <SidebarItem
            icon={<LayoutDashboard size={17} />}
            label="DASHBOARD"
            path={ROUTES.DASHBOARD}
          />
        </div>

        {/* Community */}
        <div className="px-0">
          <SidebarItem
            icon={<Globe size={17} />}
            label="COMMUNITY"
            path="https://community.airaie.com"
            external
          />
        </div>

        {/* Workspace */}
        <SidebarSection title="WORKSPACE">
          <SidebarItem
            label="Active Boards"
            path={ROUTES.BOARDS}
            bullet
            bulletColor="bg-brand-secondary"
          />
          <SidebarItem
            label="Toolsets"
            path="/toolsets"
            bullet
            bulletColor="bg-brand-secondary"
          />
        </SidebarSection>

        {/* Build */}
        <SidebarSection title="BUILD">
          <SidebarItem
            icon={<Code2 size={17} />}
            label="Parametric Logic"
            path="/parametric"
          />
          <SidebarItem
            icon={<GitBranch size={17} />}
            label="Workflows"
            path={ROUTES.WORKFLOW_STUDIO}
          />
          <SidebarItem
            icon={<Bot size={17} />}
            label="Agents"
            path={ROUTES.AGENT_STUDIO}
          />
        </SidebarSection>

        {/* Project Data */}
        <SidebarSection title="PROJECT DATA">
          <SidebarItem
            icon={<BarChart3 size={17} />}
            label="Analytics"
            path="/analytics"
          />
          <SidebarItem
            icon={<Users size={17} />}
            label="User Access"
            path="/access"
          />
        </SidebarSection>
      </nav>

      {/* User Card */}
      <UserCard name="John Doe" role="ENG-LEAD-01" />
    </aside>
  );
}
