import { apiOrMock, apiClient } from './client';
import type { Approval, ApprovalsResponse } from '@/types/approval';

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

const MOCK_APPROVALS: Approval[] = [
  {
    id: 'appr_001',
    approval_type: 'gate',
    resource_id: 'gate_review_002',
    resource_name: 'Peer Review Gate',
    board_id: 'board_structural_001',
    board_name: 'Structural Validation Study',
    status: 'pending',
    created_at: '2026-04-02T09:00:00Z',
    updated_at: '2026-04-02T09:00:00Z',
    details: {
      gate_type: 'review',
      requirements: [
        { id: 'req_003', description: 'Senior engineer sign-off required', satisfied: false },
        { id: 'req_005', description: 'Methodology documentation uploaded', satisfied: true },
        { id: 'req_006', description: 'Peer review checklist completed', satisfied: false },
      ],
    },
  },
  {
    id: 'appr_002',
    approval_type: 'agent_escalation',
    resource_id: 'agent_fea_optimizer',
    resource_name: 'FEA Optimizer Agent',
    board_id: 'board_structural_001',
    board_name: 'Structural Validation Study',
    status: 'pending',
    created_at: '2026-04-03T14:30:00Z',
    updated_at: '2026-04-03T14:30:00Z',
    details: {
      agent_name: 'FEA Optimizer Agent',
      proposal_summary: 'Increase mesh density by 40% in stress concentration zones to improve accuracy',
      confidence: 0.42,
      reasoning: 'Current mesh density in fillet regions is insufficient to capture stress gradients accurately. Von Mises stress at node 1842 shows 15% deviation from convergence study baseline.',
      alternatives: [
        'Maintain current mesh with adaptive refinement post-solve',
        'Apply submodeling technique for critical zones only',
        'Use p-element enrichment instead of h-refinement',
      ],
    },
  },
  {
    id: 'appr_003',
    approval_type: 'gate',
    resource_id: 'gate_compliance_003',
    resource_name: 'ISO Compliance Gate',
    board_id: 'board_structural_001',
    board_name: 'Structural Validation Study',
    status: 'pending',
    created_at: '2026-04-01T11:15:00Z',
    updated_at: '2026-04-02T09:00:00Z',
    details: {
      gate_type: 'compliance',
      requirements: [
        { id: 'req_004', description: 'Compliance report artifact must be attached', satisfied: false },
        { id: 'req_007', description: 'Material certification uploaded', satisfied: true },
        { id: 'req_008', description: 'Test procedure documented', satisfied: true },
      ],
    },
  },
  {
    id: 'appr_004',
    approval_type: 'gate',
    resource_id: 'gate_evidence_001',
    resource_name: 'FEA Evidence Gate',
    board_id: 'board_structural_001',
    board_name: 'Structural Validation Study',
    status: 'approved',
    created_at: '2026-03-28T08:30:00Z',
    updated_at: '2026-04-01T10:20:00Z',
    resolved_by: 'auto-evaluator',
    resolved_at: '2026-04-01T10:20:00Z',
    details: {
      gate_type: 'evidence',
      requirements: [
        { id: 'req_001', description: 'Max von Mises stress below 120 MPa', satisfied: true, evidence: { metric_value: 112.4 } },
        { id: 'req_002', description: 'FEA solver run completed successfully', satisfied: true, evidence: { run_id: 'run_fea_001' } },
      ],
    },
  },
  {
    id: 'appr_005',
    approval_type: 'agent_escalation',
    resource_id: 'agent_thermal_analyst',
    resource_name: 'Thermal Analyst Agent',
    board_id: 'board_thermal_002',
    board_name: 'Thermal Analysis Exploration',
    status: 'rejected',
    created_at: '2026-03-30T16:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
    resolved_by: 'user_001',
    resolved_at: '2026-04-01T09:00:00Z',
    reject_reason: 'Boundary conditions not representative of actual operating environment',
    details: {
      agent_name: 'Thermal Analyst Agent',
      proposal_summary: 'Switch to natural convection model for enclosure thermal analysis',
      confidence: 0.38,
      reasoning: 'Forced convection assumptions may overestimate cooling capacity in field deployment.',
      alternatives: [
        'Use mixed convection model',
        'Maintain forced convection with reduced airflow assumption',
      ],
    },
  },
];

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

  let filtered = [...MOCK_APPROVALS];
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((a) => a.status === params.status);
  }
  if (params.type && params.type !== 'all') {
    filtered = filtered.filter((a) => a.approval_type === params.type);
  }

  return apiOrMock(path, { method: 'GET' }, {
    data: filtered,
    total: filtered.length,
  });
}

export async function approveApproval(id: string): Promise<void> {
  return apiClient.post(`/v0/approvals/${id}/approve`);
}

export async function rejectApproval(id: string, reason?: string): Promise<void> {
  return apiClient.post(`/v0/approvals/${id}/reject`, { reason });
}
