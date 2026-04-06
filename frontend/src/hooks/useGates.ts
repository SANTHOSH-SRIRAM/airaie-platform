import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listGates,
  getGate,
  evaluateGate,
  approveGate,
  rejectGate,
  waiveGate,
  listGateRequirements,
} from '@api/gates';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const gateKeys = {
  all: ['gates'] as const,
  list: (boardId: string) => [...gateKeys.all, 'list', boardId] as const,
  detail: (id: string) => [...gateKeys.all, 'detail', id] as const,
  requirements: (gateId: string) => [...gateKeys.all, 'requirements', gateId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useGateList(boardId: string | undefined) {
  return useQuery({
    queryKey: gateKeys.list(boardId!),
    queryFn: () => listGates(boardId!),
    enabled: !!boardId,
    staleTime: 15_000,
  });
}

export function useGate(id: string | undefined) {
  return useQuery({
    queryKey: gateKeys.detail(id!),
    queryFn: () => getGate(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useGateRequirements(gateId: string | undefined) {
  return useQuery({
    queryKey: gateKeys.requirements(gateId!),
    queryFn: () => listGateRequirements(gateId!),
    enabled: !!gateId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useEvaluateGate(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => evaluateGate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: gateKeys.requirements(id) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: gateKeys.list(boardId) });
      }
    },
  });
}

export function useApproveGate(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rationale?: string; role?: string }) => approveGate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gateKeys.detail(id) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: gateKeys.list(boardId) });
      }
    },
  });
}

export function useRejectGate(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rationale?: string; role?: string }) => rejectGate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gateKeys.detail(id) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: gateKeys.list(boardId) });
      }
    },
  });
}

export function useWaiveGate(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rationale: string; role?: string }) => waiveGate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gateKeys.detail(id) });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: gateKeys.list(boardId) });
      }
    },
  });
}
