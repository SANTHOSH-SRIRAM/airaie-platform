import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardStats,
  fetchActiveRuns,
  fetchRecentWorkflows,
  fetchAgentActivity,
  fetchGovernance,
  fetchSystemStatus,
} from '@api/dashboard';

const POLL_INTERVAL = 30_000; // 30 seconds per NFR-01

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activeRuns: () => [...dashboardKeys.all, 'active-runs'] as const,
  recentWorkflows: () => [...dashboardKeys.all, 'recent-workflows'] as const,
  agentActivity: () => [...dashboardKeys.all, 'agent-activity'] as const,
  governance: () => [...dashboardKeys.all, 'governance'] as const,
  systemStatus: () => [...dashboardKeys.all, 'system-status'] as const,
};

export function useStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: fetchDashboardStats,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL,
  });
}

export function useActiveRuns() {
  return useQuery({
    queryKey: dashboardKeys.activeRuns(),
    queryFn: fetchActiveRuns,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL,
  });
}

export function useRecentWorkflows() {
  return useQuery({
    queryKey: dashboardKeys.recentWorkflows(),
    queryFn: fetchRecentWorkflows,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL,
  });
}

export function useAgentActivity() {
  return useQuery({
    queryKey: dashboardKeys.agentActivity(),
    queryFn: fetchAgentActivity,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL,
  });
}

export function useGovernance() {
  return useQuery({
    queryKey: dashboardKeys.governance(),
    queryFn: fetchGovernance,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: dashboardKeys.systemStatus(),
    queryFn: fetchSystemStatus,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL,
  });
}
