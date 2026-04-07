import { GitBranch, Bot, Play, LayoutGrid } from 'lucide-react';
import type { DashboardStats } from '@/types/index';
import StatCard from './StatCard';

interface StatsRowProps {
  stats: DashboardStats;
}

export default function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-[12px]">
      <StatCard
        icon={<GitBranch size={16} />}
        label="Workflows"
        value={stats.workflows.total}
        subtitle={`${stats.workflows.active} active`}
        showDot
        accentColor="green"
      />
      <StatCard
        icon={<Bot size={16} />}
        label="Agents"
        value={stats.agents.total}
        subtitle={`${stats.agents.decisionsToday} decisions today`}
        accentColor="purple"
      />
      <StatCard
        icon={<Play size={16} />}
        label="Runs (7 days)"
        value={stats.runs7d.total}
        subtitle={`${stats.runs7d.successRate}% success rate`}
        accentColor="green"
      />
      <StatCard
        icon={<LayoutGrid size={16} />}
        label="Boards"
        value={stats.boards.total}
        subtitle={`${stats.boards.pendingApproval} pending approval`}
        showDot
        accentColor="orange"
      />
    </div>
  );
}
