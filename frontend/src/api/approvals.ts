import { apiClient } from './client';
import type { Approval, ApprovalsResponse } from '@/types/approval';

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchApprovals(params: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<ApprovalsResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.type) searchParams.set('type', params.type);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  const path = `/v0/approvals${query ? `?${query}` : ''}`;
  return apiClient.get<ApprovalsResponse>(path);
}

export async function approveApproval(id: string): Promise<void> {
  return apiClient.post(`/v0/approvals/${id}/approve`);
}

export async function rejectApproval(id: string, reason?: string): Promise<void> {
  return apiClient.post(`/v0/approvals/${id}/reject`, { reason });
}
