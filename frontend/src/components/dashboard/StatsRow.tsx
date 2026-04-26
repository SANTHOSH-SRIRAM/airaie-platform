import { GitBranch, Bot, Play, LayoutGrid } from 'lucide-react';
import type { DashboardStats } from '@/types/index';
import StatCard from './StatCard';

interface StatsRowProps {
  stats: DashboardStats;
}

/**
 * Card colours follow the journey-lane IA so the row visually rhymes with
 * the hero pills and the sidebar groups:
 *   - Workflows + Runs → blue (Execute)
 *   - Agents          → purple (Configure)
 *   - Boards          → orange (Govern)
 */
export default function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-[12px]">
      <StatCard
        icon={<GitBranch size={16} />}
        label="Workflows"
        value={stats.workflows.total}
        subtitle={`${stats.workflows.active} active`}
        showDot={stats.workflows.active > 0}
        accentColor="blue"
      />
      <StatCard
        icon={<Bot size={16} />}
        label="Agents"
        value={stats.agents.total}
        subtitle={`${stats.agents.decisionsToday} decision${stats.agents.decisionsToday !== 1 ? 's' : ''} today`}
        accentColor="purple"
      />
      <StatCard
        icon={<Play size={16} />}
        label="Runs (7 days)"
        value={stats.runs7d.total}
        subtitle={`${stats.runs7d.successRate}% success rate`}
        accentColor="blue"
      />
      <StatCard
        icon={<LayoutGrid size={16} />}
        label="Boards"
        value={stats.boards.total}
        subtitle={
          stats.boards.pendingApproval > 0
            ? `${stats.boards.pendingApproval} pending approval`
            : 'all clear'
        }
        showDot={stats.boards.pendingApproval > 0}
        accentColor="orange"
      />
    </div>
  );
}
