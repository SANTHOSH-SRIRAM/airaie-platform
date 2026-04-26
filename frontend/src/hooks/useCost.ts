import { useQuery } from '@tanstack/react-query';
import { getCostRollup, getBudgetStatus } from '@api/cost';

export const costKeys = {
  all: ['cost'] as const,
  rollup: (opts?: { from?: string; to?: string }) =>
    [...costKeys.all, 'rollup', opts ?? {}] as const,
  budget: () => [...costKeys.all, 'budget'] as const,
};

/** Cost rollup for the given period (defaults to backend's last-30-days). */
export function useCostSummary(opts?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: costKeys.rollup(opts),
    queryFn: () => getCostRollup(opts),
    staleTime: 60_000,
  });
}

/** Budget status (caps + current spend). */
export function useBudgetStatus() {
  return useQuery({
    queryKey: costKeys.budget(),
    queryFn: getBudgetStatus,
    staleTime: 60_000,
  });
}
