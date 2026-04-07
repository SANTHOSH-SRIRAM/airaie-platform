import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApprovals, approveApproval, rejectApproval } from '@api/approvals';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const approvalKeys = {
  all: ['approvals'] as const,
  list: (params: { status?: string; type?: string }) =>
    [...approvalKeys.all, 'list', params] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useApprovals(params: { status?: string; type?: string }) {
  return useQuery({
    queryKey: approvalKeys.list(params),
    queryFn: () => fetchApprovals(params),
    staleTime: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useApproveApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}

export function useRejectApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectApproval(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}
