import { apiOrMock, apiClient } from './client';
import type { Gate, GateRequirement, GateApproval } from '@/types/gate';

// ---------------------------------------------------------------------------
// Mock data for development
// ---------------------------------------------------------------------------

const MOCK_GATES: Gate[] = [
  {
    id: 'gate_evidence_001',
    board_id: 'board_structural_001',
    project_id: 'prj_default',
    name: 'FEA Evidence Gate',
    gate_type: 'evidence',
    status: 'PASSED',
    description: 'Verify FEA stress results meet acceptance criteria',
    evaluated_at: '2026-04-01T10:20:00Z',
    created_at: '2026-03-28T08:30:00Z',
    updated_at: '2026-04-01T10:20:00Z',
  },
  {
    id: 'gate_review_002',
    board_id: 'board_structural_001',
    project_id: 'prj_default',
    name: 'Peer Review Gate',
    gate_type: 'review',
    status: 'PENDING',
    description: 'Engineering peer review of analysis methodology and results',
    created_at: '2026-03-28T08:30:00Z',
    updated_at: '2026-04-02T09:00:00Z',
  },
  {
    id: 'gate_compliance_003',
    board_id: 'board_structural_001',
    project_id: 'prj_default',
    name: 'ISO Compliance Gate',
    gate_type: 'compliance',
    status: 'PENDING',
    description: 'ISO 12345 compliance checklist sign-off',
    created_at: '2026-03-28T08:30:00Z',
    updated_at: '2026-04-02T09:00:00Z',
  },
];

const MOCK_REQUIREMENTS: GateRequirement[] = [
  {
    id: 'req_001',
    gate_id: 'gate_evidence_001',
    req_type: 'metric_threshold',
    description: 'Max von Mises stress below 120 MPa',
    config: { metric_key: 'max_von_mises', operator: 'lte', threshold: 120, unit: 'MPa' },
    satisfied: true,
    evidence: { metric_value: 112.4 },
    created_at: '2026-03-28T08:30:00Z',
    updated_at: '2026-04-01T10:20:00Z',
  },
  {
    id: 'req_002',
    gate_id: 'gate_evidence_001',
    req_type: 'run_succeeded',
    description: 'FEA solver run completed successfully',
    config: { run_type: 'sim.fea' },
    satisfied: true,
    evidence: { run_id: 'run_fea_001' },
    created_at: '2026-03-28T08:30:00Z',
    updated_at: '2026-04-01T10:20:00Z',
  },
  {
    id: 'req_003',
    gate_id: 'gate_review_002',
    req_type: 'role_signed',
    description: 'Senior engineer sign-off required',
    config: { role: 'senior_engineer' },
    satisfied: false,
    created_at: '2026-03-28T08:30:00Z',
    updated_at: '2026-04-02T09:00:00Z',
  },
  {
    id: 'req_004',
    gate_id: 'gate_compliance_003',
    req_type: 'artifact_exists',
    description: 'Compliance report artifact must be attached',
    config: { artifact_type: 'compliance_report' },
    satisfied: false,
    created_at: '2026-03-28T08:30:00Z',
    updated_at: '2026-04-02T09:00:00Z',
  },
];

const MOCK_APPROVALS: GateApproval[] = [
  {
    id: 'appr_001',
    gate_id: 'gate_evidence_001',
    role: 'system',
    action: 'approve',
    approved_by: 'auto-evaluator',
    rationale: 'All metric thresholds met',
    approved_at: '2026-04-01T10:20:00Z',
    created_at: '2026-04-01T10:20:00Z',
  },
];

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listGates(boardId: string): Promise<Gate[]> {
  return apiOrMock(
    `/v0/gates?board_id=${boardId}`,
    { method: 'GET' },
    MOCK_GATES.filter((g) => g.board_id === boardId),
  );
}

export async function getGate(id: string): Promise<Gate> {
  return apiOrMock(
    `/v0/gates/${id}`,
    { method: 'GET' },
    MOCK_GATES.find((g) => g.id === id) ?? MOCK_GATES[0],
  );
}

export async function createGate(data: {
  board_id: string;
  name: string;
  gate_type: Gate['gate_type'];
  description?: string;
}): Promise<Gate> {
  return apiClient.post('/v0/gates', data);
}

export async function addGateRequirement(
  gateId: string,
  data: {
    req_type: GateRequirement['req_type'];
    description: string;
    config: Record<string, unknown>;
  },
): Promise<GateRequirement> {
  return apiClient.post(`/v0/gates/${gateId}/requirements`, data);
}

export async function listGateRequirements(gateId: string): Promise<GateRequirement[]> {
  return apiOrMock(
    `/v0/gates/${gateId}/requirements`,
    { method: 'GET' },
    MOCK_REQUIREMENTS.filter((r) => r.gate_id === gateId),
  );
}

export async function evaluateGate(id: string): Promise<Gate> {
  return apiClient.post(`/v0/gates/${id}/evaluate`);
}

export async function approveGate(
  id: string,
  data: { rationale?: string; role?: string },
): Promise<GateApproval> {
  return apiClient.post(`/v0/gates/${id}/approve`, data);
}

export async function rejectGate(
  id: string,
  data: { rationale?: string; role?: string },
): Promise<GateApproval> {
  return apiClient.post(`/v0/gates/${id}/reject`, data);
}

export async function waiveGate(
  id: string,
  data: { rationale: string; role?: string },
): Promise<GateApproval> {
  return apiClient.post(`/v0/gates/${id}/waive`, data);
}

export async function listGateApprovals(id: string): Promise<GateApproval[]> {
  return apiOrMock(
    `/v0/gates/${id}/approvals`,
    { method: 'GET' },
    MOCK_APPROVALS.filter((a) => a.gate_id === id),
  );
}
