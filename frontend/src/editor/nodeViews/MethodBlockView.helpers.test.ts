import { describe, it, expect } from 'vitest';
import { formatPlanSummary } from './MethodBlockView.helpers';
import type { ExecutionPlan } from '@/types/plan';

const baseNode = {
  node_id: 'n1',
  tool_id: 't1',
  tool_version: '1.0.0',
  role: 'solve' as const,
  parameters: {},
  is_editable: false,
  is_required: true,
};
const basePlan: ExecutionPlan = {
  id: 'pln_1',
  card_id: 'crd_1',
  pipeline_id: 'pipe_fea_standard',
  nodes: [baseNode, { ...baseNode, node_id: 'n2' }, { ...baseNode, node_id: 'n3' }],
  edges: [],
  bindings: {},
  expected_outputs: [],
  cost_estimate: 0,
  time_estimate: '0s',
  status: 'validated',
  created_at: '',
  updated_at: '',
};

describe('formatPlanSummary', () => {
  it('returns null when plan is null/undefined', () => {
    expect(formatPlanSummary(null)).toBeNull();
    expect(formatPlanSummary(undefined)).toBeNull();
  });
  it('counts nodes as steps', () => {
    expect(formatPlanSummary(basePlan)?.stepCount).toBe(3);
  });
  it('passes through pipelineId', () => {
    expect(formatPlanSummary(basePlan)?.pipelineId).toBe('pipe_fea_standard');
  });
  it('passes through plan status', () => {
    expect(formatPlanSummary({ ...basePlan, status: 'completed' })?.status).toBe('completed');
  });
  it('falls back to unknown status when missing', () => {
    // Defensive fallback for legacy serialized plans where `status` may be
    // absent. Cast through unknown so the test exercises the runtime path.
    const legacy = { ...basePlan, status: undefined } as unknown as ExecutionPlan;
    expect(formatPlanSummary(legacy)?.status).toBe('unknown');
  });
  it('handles plans with empty nodes array', () => {
    expect(formatPlanSummary({ ...basePlan, nodes: [] })?.stepCount).toBe(0);
  });
});
