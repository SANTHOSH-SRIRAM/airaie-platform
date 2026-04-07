import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCards,
  getCard,
  createCard,
  updateCard,
  deleteCard,
  listCardEvidence,
  addCardEvidence,
  getCardGraph,
} from '@api/cards';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const cardKeys = {
  all: ['cards'] as const,
  list: (boardId: string) => [...cardKeys.all, 'list', boardId] as const,
  detail: (id: string) => [...cardKeys.all, 'detail', id] as const,
  evidence: (cardId: string) => [...cardKeys.all, 'evidence', cardId] as const,
  graph: (boardId: string) => [...cardKeys.all, 'graph', boardId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useCardList(boardId: string | undefined) {
  return useQuery({
    queryKey: cardKeys.list(boardId!),
    queryFn: () => listCards(boardId!),
    enabled: !!boardId,
    staleTime: 15_000,
  });
}

export function useCard(id: string | undefined) {
  return useQuery({
    queryKey: cardKeys.detail(id!),
    queryFn: () => getCard(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCardEvidence(cardId: string | undefined, autoRefresh = false) {
  return useQuery({
    queryKey: cardKeys.evidence(cardId!),
    queryFn: () => listCardEvidence(cardId!),
    enabled: !!cardId,
    staleTime: autoRefresh ? 3_000 : 15_000,
    refetchInterval: autoRefresh ? 5_000 : false,
  });
}

export function useCardGraph(boardId: string | undefined) {
  return useQuery({
    queryKey: cardKeys.graph(boardId!),
    queryFn: () => getCardGraph(boardId!),
    enabled: !!boardId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateCard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createCard>[1]) => createCard(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.list(boardId) });
      queryClient.invalidateQueries({ queryKey: cardKeys.graph(boardId) });
    },
  });
}

export function useUpdateCard(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateCard>[1]) => updateCard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.detail(id) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: cardKeys.list(boardId) });
      }
    },
  });
}

export function useDeleteCard(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCard(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: cardKeys.detail(id) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: cardKeys.list(boardId) });
        queryClient.invalidateQueries({ queryKey: cardKeys.graph(boardId) });
      }
    },
  });
}

export function useAddEvidence(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof addCardEvidence>[1]) => addCardEvidence(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardKeys.evidence(cardId) });
    },
  });
}
