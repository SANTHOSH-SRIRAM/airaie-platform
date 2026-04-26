import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listGates,
  getGate,
  evaluateGate,
  approveGate,
  rejectGate,
  waiveGate,
  listGateRequirements,
  listGateApprovals,
  listGateEvidence,
  listCardEvidence as listCardEvidenceUnified,
  addCardEvidence as addCardEvidenceUnified,
} from '@api/gates';
import type {
  GateEvidence,
  ApproveGateBody,
  RejectGateBody,
  WaiveGateBody,
} from '@api/gates';
import { cardKeys } from './useCards';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const gateKeys = {
  all: ['gates'] as const,
  list: (boardId: string) => [...gateKeys.all, 'list', boardId] as const,
  detail: (id: string) => [...gateKeys.all, 'detail', id] as const,
  requirements: (gateId: string) => [...gateKeys.all, 'requirements', gateId] as const,
  approvals: (gateId: string) => [...gateKeys.all, 'approvals', gateId] as const,
  evidence: (gateId: string) => [...gateKeys.all, 'evidence', gateId] as const,
  cardEvidenceUnified: (cardId: string) => [...gateKeys.all, 'card-evidence', cardId] as const,
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

/**
 * Shared invalidation helper for any gate-state mutation. Refreshes the gate
 * detail, its requirements, the board's gate list, and (D5) the approval
 * history so audit views stay in sync.
 */
function invalidateGate(
  queryClient: ReturnType<typeof useQueryClient>,
  gateId: string,
  boardId?: string,
) {
  queryClient.invalidateQueries({ queryKey: gateKeys.detail(gateId) });
  queryClient.invalidateQueries({ queryKey: gateKeys.requirements(gateId) });
  queryClient.invalidateQueries({ queryKey: gateKeys.approvals(gateId) });
  if (boardId) {
    queryClient.invalidateQueries({ queryKey: gateKeys.list(boardId) });
  }
}

export function useEvaluateGate(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => evaluateGate(id),
    onSuccess: () => invalidateGate(queryClient, id, boardId),
  });
}

export function useApproveGate(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApproveGateBody) => approveGate(id, data),
    onSuccess: () => invalidateGate(queryClient, id, boardId),
  });
}

export function useRejectGate(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RejectGateBody) => rejectGate(id, data),
    onSuccess: () => invalidateGate(queryClient, id, boardId),
  });
}

/** D5: list approval/reject/waive history for a gate. */
export function useGateApprovals(gateId: string | undefined) {
  return useQuery({
    queryKey: gateKeys.approvals(gateId!),
    queryFn: () => listGateApprovals(gateId!),
    enabled: !!gateId,
    staleTime: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Evidence (D4)
// ---------------------------------------------------------------------------

/**
 * Fetch the unified evidence list for a single gate. Composed client-side
 * from gate requirements + their referenced cards' evidence rows.
 */
export function useGateEvidence(gateId: string | undefined) {
  return useQuery<GateEvidence[]>({
    queryKey: gateKeys.evidence(gateId!),
    queryFn: () => listGateEvidence(gateId!),
    enabled: !!gateId,
    staleTime: 15_000,
  });
}

/**
 * Fetch evidence for a card in the unified `GateEvidence` shape (distinct
 * cache key from `useCardEvidence`, which returns the raw `CardEvidence[]`).
 */
export function useCardEvidenceList(cardId: string | undefined) {
  return useQuery<GateEvidence[]>({
    queryKey: gateKeys.cardEvidenceUnified(cardId!),
    queryFn: () => listCardEvidenceUnified(cardId!),
    enabled: !!cardId,
    staleTime: 15_000,
  });
}

/** Manual evidence add, returning the unified `GateEvidence` shape. */
export function useAddCardEvidence(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof addCardEvidenceUnified>[1]) =>
      addCardEvidenceUnified(cardId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gateKeys.cardEvidenceUnified(cardId) });
      queryClient.invalidateQueries({ queryKey: cardKeys.evidence(cardId) });
      // Gate-evidence views may aggregate this card; invalidate broadly.
      queryClient.invalidateQueries({ queryKey: [...gateKeys.all, 'evidence'] });
    },
  });
}

export function useWaiveGate(id: string, boardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WaiveGateBody) => waiveGate(id, data),
    onSuccess: () => invalidateGate(queryClient, id, boardId),
  });
}
