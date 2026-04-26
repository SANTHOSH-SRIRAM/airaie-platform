import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listIntents,
  getIntent,
  createIntent,
  updateIntent,
  lockIntent,
  listIntentTypes,
} from '@api/intents';
import { listIntentTypePipelines } from '@api/pipelines';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const intentKeys = {
  all: ['intents'] as const,
  list: (boardId: string) => [...intentKeys.all, 'list', boardId] as const,
  detail: (id: string) => [...intentKeys.all, 'detail', id] as const,
  types: (verticalSlug: string) => [...intentKeys.all, 'types', verticalSlug] as const,
  typePipelines: (intentTypeSlug: string) =>
    [...intentKeys.all, 'type-pipelines', intentTypeSlug] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useIntentList(boardId: string | undefined) {
  return useQuery({
    queryKey: intentKeys.list(boardId!),
    queryFn: () => listIntents(boardId!),
    enabled: !!boardId,
    staleTime: 30_000,
  });
}

export function useIntent(id: string | undefined) {
  return useQuery({
    queryKey: intentKeys.detail(id!),
    queryFn: () => getIntent(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useIntentTypes(verticalSlug: string | undefined) {
  return useQuery({
    queryKey: intentKeys.types(verticalSlug!),
    queryFn: () => listIntentTypes(verticalSlug!),
    enabled: !!verticalSlug,
    staleTime: 60_000,
  });
}

/**
 * List the pipelines that support a given intent_type.
 *
 * Used by AvailableMethodsTable (Phase 8 / 08-02) to show which Methods
 * the user can pick from for a Card. Returns `[]` while disabled or when
 * the kernel doesn't recognize the intent_type — see `listIntentTypePipelines`
 * for the graceful-degradation contract.
 */
export function useIntentTypePipelines(intentTypeSlug: string | undefined) {
  return useQuery({
    queryKey: intentKeys.typePipelines(intentTypeSlug ?? '__missing__'),
    queryFn: () => listIntentTypePipelines(intentTypeSlug!),
    enabled: !!intentTypeSlug,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateIntent(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createIntent>[1]) => createIntent(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intentKeys.list(boardId) });
    },
  });
}

export function useUpdateIntent(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateIntent>[1]) => updateIntent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intentKeys.detail(id) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: intentKeys.list(boardId) });
      }
    },
  });
}

export function useLockIntent(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => lockIntent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intentKeys.detail(id) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: intentKeys.list(boardId) });
      }
    },
  });
}
