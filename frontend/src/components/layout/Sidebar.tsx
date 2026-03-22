import {
  LayoutDashboard, Globe, Code2, GitBranch, Bot, BarChart3, Users,
  Wrench, Cpu, Database, Puzzle, Plug, Zap,
} from 'lucide-react';
import { ROUTES } from '@constants/routes';
import SidebarSection from './SidebarSection';
import SidebarItem from './SidebarItem';
import UserCard from './UserCard';

export default function Sidebar() {
  return (
    <aside className="w-[256px] h-screen bg-sidebar-bg flex flex-col shrink-0">
      <div className="flex items-center gap-2.5 px-4 h-12 shrink-0 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-brand-primary rounded-sm flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="font-semibold text-sidebar-text-active text-[15px] tracking-tight">
          AIRAIE<span className="text-sidebar-icon font-normal">.CAD</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        <SidebarItem icon={<LayoutDashboard size={16} />} label="Dashboard" path={ROUTES.DASHBOARD} />
        <SidebarItem icon={<Globe size={16} />} label="Community" path="https://community.airaie.com" external />

        <SidebarSection title="Workspace">
          <SidebarItem label="Active Boards" path={ROUTES.BOARDS} bullet bulletColor="bg-sidebar-text-active" />
          <SidebarItem label="Toolsets" path="/toolsets" bullet bulletColor="bg-sidebar-icon" />
        </SidebarSection>

        <SidebarSection title="Build">
          <SidebarItem icon={<Code2 size={16} />} label="Parametric Logic" path="/parametric" />
          <SidebarItem icon={<GitBranch size={16} />} label="Workflows" path={ROUTES.WORKFLOW_STUDIO} />
          <SidebarItem icon={<Bot size={16} />} label="Agents" path={ROUTES.AGENT_STUDIO} />
        </SidebarSection>

        <SidebarSection title="Tools">
          <SidebarItem icon={<Wrench size={16} />} label="FEA Solver" path="/tools/fea" />
          <SidebarItem icon={<Cpu size={16} />} label="CFD Engine" path="/tools/cfd" />
          <SidebarItem icon={<Database size={16} />} label="Material Library" path="/tools/materials" />
          <SidebarItem icon={<Puzzle size={16} />} label="Generative Design" path="/tools/generative" />
          <SidebarItem icon={<Zap size={16} />} label="Capabilities" path="/capabilities" />
        </SidebarSection>

        <SidebarItem icon={<Plug size={16} />} label="Integrations" path="/integrations" />

        <SidebarSection title="Project Data">
          <SidebarItem icon={<BarChart3 size={16} />} label="Analytics" path="/analytics" />
          <SidebarItem icon={<Users size={16} />} label="User Access" path="/access" />
        </SidebarSection>
      </nav>

      <UserCard name="John Doe" role="ENG-LEAD-01" />
    </aside>
  );
}
