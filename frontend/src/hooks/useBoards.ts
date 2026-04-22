import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBoards,
  getBoard,
  getBoardSummary,
  createBoard,
  updateBoard,
  deleteBoard,
  escalateBoardMode,
  listCards,
  createCard,
  listRecords,
  createRecord,
} from '@api/boards';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const boardKeys = {
  all: ['boards'] as const,
  list: () => [...boardKeys.all, 'list'] as const,
  detail: (id: string) => [...boardKeys.all, 'detail', id] as const,
  summary: (id: string) => [...boardKeys.all, 'summary', id] as const,
  cards: (id: string) => [...boardKeys.all, 'cards', id] as const,
  records: (id: string) => [...boardKeys.all, 'records', id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useBoardList() {
  return useQuery({
    queryKey: boardKeys.list(),
    queryFn: listBoards,
    staleTime: 30_000,
  });
}

export function useBoard(id: string | undefined) {
  return useQuery({
    queryKey: boardKeys.detail(id!),
    queryFn: () => getBoard(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useBoardSummary(id: string | undefined) {
  return useQuery({
    queryKey: boardKeys.summary(id!),
    queryFn: () => getBoardSummary(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.list() });
    },
  });
}

export function useUpdateBoard(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBoard>[1]) => updateBoard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: boardKeys.list() });
    },
  });
}

export function useDeleteBoard(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.list() });
      queryClient.removeQueries({ queryKey: boardKeys.detail(id) });
      queryClient.removeQueries({ queryKey: boardKeys.summary(id) });
    },
  });
}

export function useEscalateMode(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nextMode: string) => escalateBoardMode(id, nextMode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: boardKeys.summary(id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function useCards(boardId: string) {
  return useQuery({
    queryKey: boardKeys.cards(boardId),
    queryFn: () => listCards(boardId),
    enabled: !!boardId,
    refetchInterval: 5_000,
  });
}

export function useCreateCard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createCard>[1]) => createCard(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.cards(boardId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export function useRecords(boardId: string) {
  return useQuery({
    queryKey: boardKeys.records(boardId),
    queryFn: () => listRecords(boardId),
    enabled: !!boardId,
    staleTime: 30_000,
  });
}

export function useCreateRecord(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createRecord>[1]) => createRecord(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.records(boardId) });
    },
  });
}
