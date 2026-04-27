import type { ExecutionPlan, PlanStatus } from '@/types/plan';

export interface PlanSummary {
  stepCount: number;
  status: PlanStatus | 'unknown';
  pipelineId: string;
}

/**
 * Pure helper — collapse an ExecutionPlan into a 3-field summary for the
 * MethodBlockView header. Tested in env=node.
 *
 * stepCount counts `plan.nodes` (the DAG step list).
 * pipelineId may be absent on legacy plans — falls back to '' so the
 * caller can branch on truthiness.
 */
export function formatPlanSummary(
  plan: ExecutionPlan | null | undefined,
): PlanSummary | null {
  if (!plan) return null;
  return {
    stepCount: Array.isArray(plan.nodes) ? plan.nodes.length : 0,
    status: plan.status ?? 'unknown',
    pipelineId: plan.pipeline_id ?? '',
  };
}
