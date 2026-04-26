import { useQuery } from '@tanstack/react-query';
import { listAuditEvents, type ListAuditEventsParams } from '@api/audit';

export const auditKeys = {
  all: ['audit'] as const,
  list: (params: ListAuditEventsParams) => [...auditKeys.all, 'list', params] as const,
};

/**
 * Audit-event list (paged, filtered).
 *
 * Stale time is short (10s) — operators often refresh while watching live
 * runs / approvals roll in. `keepPreviousData`-style behavior prevents
 * the table from blanking during pagination.
 */
export function useAuditEvents(params: ListAuditEventsParams = {}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => listAuditEvents(params),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
