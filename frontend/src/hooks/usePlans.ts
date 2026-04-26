import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  getPlan,
  generatePlan,
  validatePlan,
  executePlan,
  type GeneratePlanRequest,
} from '@api/plans';
import type { ExecutionPlan } from '@/types/plan';
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

/**
 * Generate a plan for a card.
 *
 * Backwards-compatible signature: callers can either invoke
 * `useGeneratePlan(cardId)` and `mutateAsync()` (no body — kernel picks a
 * default pipeline from the card's intent_type) OR pass a
 * `GeneratePlanRequest` body to `mutateAsync({ pipeline_id, overrides })`.
 *
 * Returns the unwrapped `ExecutionPlan` on success; throws on error.
 */
export function useGeneratePlan(
  cardId: string,
): UseMutationResult<ExecutionPlan, Error, GeneratePlanRequest | void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: GeneratePlanRequest | void) =>
      generatePlan(cardId, (body as GeneratePlanRequest) ?? undefined),
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
