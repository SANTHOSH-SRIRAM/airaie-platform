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
  listCardGates,
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
  forCard: (cardId: string) => [...gateKeys.all, 'for-card', cardId] as const,
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

// ---------------------------------------------------------------------------
// Card-scoped gates (Phase 8 / 08-02)
//
// The kernel exposes gates board-scoped (`/v0/gates?board_id=X`) plus per-gate
// requirements that may carry a `card_id` in their `config` blob. To answer
// "what gates apply to this Card?" we walk the board's gates, look up each
// one's requirements, and filter to those that reference the given card_id.
//
// `listCardGates` (in api/gates.ts) does this client-side join. If the board
// id is unknown (e.g. card is still loading), the hook returns an empty
// array via the `enabled` guard rather than firing a malformed request.
//
// This is intentionally a separate hook from `useGateList(boardId)`; it does
// not displace it. Card-page surfaces (CardStatusPanel, ThisCardStatusPill)
// use `useCardGates`; Board surfaces continue to use `useGateList`.
// ---------------------------------------------------------------------------

/**
 * Fetch the gates that apply to a single Card.
 *
 * Implementation: lists the Board's gates, then walks each gate's
 * requirements to find those that reference `cardId`. Backend has no
 * dedicated `/v0/cards/{id}/gates` route as of Phase 8 — this is the
 * graceful client-side join the research doc explicitly anticipated.
 *
 * Falls back to an empty list when:
 *   - boardId is unknown (card still loading)
 *   - the Board has no gates configured
 *   - the kernel returns 404 / 5xx (we never throw — the Card-page degrades
 *     to "0 gates" rather than blocking the entire page on a gate failure)
 */
export function useCardGates(cardId: string | undefined, boardId: string | undefined) {
  return useQuery({
    queryKey: gateKeys.forCard(cardId ?? '__missing__'),
    queryFn: async () => {
      if (!cardId || !boardId) return [];
      try {
        return await listCardGates(boardId, cardId);
      } catch {
        // Graceful degradation: gates is auxiliary data; a failure here
        // shouldn't break the Card-page Status panel.
        return [];
      }
    },
    enabled: !!cardId && !!boardId,
    staleTime: 15_000,
  });
}
