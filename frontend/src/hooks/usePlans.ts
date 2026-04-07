import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlan, generatePlan, validatePlan, executePlan } from '@api/plans';
import { cardKeys } from './useCards';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const planKeys = {
  all: ['plans'] as const,
  detail: (cardId: string) => [...planKeys.all, 'detail', cardId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function usePlan(cardId: string | undefined) {
  return useQuery({
    queryKey: planKeys.detail(cardId!),
    queryFn: () => getPlan(cardId!),
    enabled: !!cardId,
    staleTime: 15_000,
  });
}

/**
 * Use this to poll plan status while a plan is executing.
 * Polls every 3 seconds when the plan status is 'executing'.
 */
export function usePlanPolling(cardId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...planKeys.detail(cardId!), 'polling'],
    queryFn: () => getPlan(cardId!),
    enabled: !!cardId && enabled,
    refetchInterval: 3_000,
    staleTime: 1_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useGeneratePlan(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generatePlan(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(cardId) });
    },
  });
}

export function useValidatePlan(cardId: string) {
  return useMutation({
    mutationFn: () => validatePlan(cardId),
  });
}

export function useExecutePlan(cardId: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => executePlan(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(cardId) });
      queryClient.invalidateQueries({ queryKey: cardKeys.detail(cardId) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: cardKeys.list(boardId) });
      }
    },
  });
}
