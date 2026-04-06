import { useEffect } from 'react';
import { useUiStore } from '@store/uiStore';
import { useStats, useActiveRuns, useGovernance } from '@hooks/useDashboard';
import DashboardGreeting from '@components/dashboard/DashboardGreeting';
import StatsRow from '@components/dashboard/StatsRow';
import ActiveRunsWidget from '@components/dashboard/ActiveRunsWidget';
import RecentWorkflowsWidget from '@components/dashboard/RecentWorkflowsWidget';
import AgentActivityWidget from '@components/dashboard/AgentActivityWidget';
import GovernanceWidget from '@components/dashboard/GovernanceWidget';
import ErrorState from '@components/ui/ErrorState';

export default function DashboardPage() {
  const setBottomBar = useUiStore((s) => s.setBottomBar);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);
  const { data: stats, isError: statsError, refetch: refetchStats } = useStats();
  const { data: activeRuns } = useActiveRuns();
  const { data: governance } = useGovernance();

  // Show system status bar in bottom bar zone on dashboard
  useEffect(() => {
    setBottomBar('system-status');
    return () => hideBottomBar();
  }, [setBottomBar, hideBottomBar]);

  const activeRunCount = activeRuns?.filter((r) => r.status === 'running').length ?? 0;
  const pendingGateCount = governance?.filter((g) => g.approvalStatus === 'pending').length ?? 0;

  return (
    <div className="min-h-full px-[16px] pb-[72px]">
      <div className="flex flex-col gap-[16px]">
        <DashboardGreeting
          userName="Santhosh"
          activeRunCount={activeRunCount}
          pendingGateCount={pendingGateCount}
        />

        {statsError ? (
          <ErrorState message="Failed to load dashboard stats" onRetry={() => refetchStats()} />
        ) : stats ? (
          <StatsRow stats={stats} />
        ) : (
          <div className="grid grid-cols-4 gap-[12px] animate-pulse">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-[88px] bg-[#f0f0ec] rounded-[12px]" />)}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-[16px]">
          <div className="flex flex-col gap-[16px]">
            <ActiveRunsWidget />
            <AgentActivityWidget />
          </div>
          <div className="flex flex-col gap-[16px]">
            <RecentWorkflowsWidget />
            <GovernanceWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
