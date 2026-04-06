import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBoards,
  getBoard,
  getBoardSummary,
  createBoard,
  updateBoard,
  deleteBoard,
  escalateBoardMode,
} from '@api/boards';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const boardKeys = {
  all: ['boards'] as const,
  list: () => [...boardKeys.all, 'list'] as const,
  detail: (id: string) => [...boardKeys.all, 'detail', id] as const,
  summary: (id: string) => [...boardKeys.all, 'summary', id] as const,
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
