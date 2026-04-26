/**
 * PlanGeneratorPanel — composes GeneratePlanButton + PlanDagView so the
 * caller has a single drop-in that handles "click button -> see DAG".
 *
 * When `cardId` is provided, the panel auto-loads any existing plan via
 * `usePlan(cardId)`; the user sees the latest DAG immediately, not a blank
 * canvas. After a fresh "Generate" click the local plan supersedes the
 * fetched one until the page is reloaded.
 */

import { useState } from 'react';
import { Workflow as WorkflowIcon } from 'lucide-react';
import { cn } from '@utils/cn';
import GeneratePlanButton from './GeneratePlanButton';
import PlanDagView from './PlanDagView';
import { usePlan } from '@hooks/usePlans';
import type { ExecutionPlan } from '@/types/plan';

export interface PlanGeneratorPanelProps {
  boardId: string;
  intentSpecs: { id: string; name: string }[];
  cards?: { id: string; name: string; intent_spec_id?: string }[];
  /**
   * Card to auto-load an existing plan for. When set, GET /v0/cards/{id}/plan
   * runs on mount and seeds the DAG. Generation results are still scoped to
   * the user-selected card in `GeneratePlanButton`'s popover.
   */
  cardId?: string;
  /** Optional pre-existing plan; takes priority over the cardId fetch. */
  initialPlan?: ExecutionPlan | null;
  /** Forwarded to PlanDagView for property-panel hooks. */
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export default function PlanGeneratorPanel({
  boardId,
  intentSpecs,
  cards,
  cardId,
  initialPlan,
  onNodeClick,
  className,
}: PlanGeneratorPanelProps) {
  const [plan, setPlan] = useState<ExecutionPlan | null>(initialPlan ?? null);
  const { data: fetchedPlan, isLoading: planLoading, error: planError } = usePlan(cardId);
  // Prefer locally-generated plan (most recent) over the fetched one.
  const displayPlan: ExecutionPlan | null | undefined = plan ?? fetchedPlan;

  return (
    <div className={cn('flex flex-col gap-[12px]', className)}>
      {/* Header row: title + action */}
      <div className="flex items-center gap-[8px]">
        <div className="flex items-center gap-[6px]">
          <WorkflowIcon size={14} className="text-[#6b6b6b]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b]">
            Execution Plan
          </span>
          {displayPlan && (
            <span
              className={cn(
                'h-[18px] px-[8px] rounded-[4px] text-[9px] font-semibold uppercase inline-flex items-center',
                displayPlan.status === 'completed' &&
                  'bg-[#e8f5e9] text-[#4caf50]',
                displayPlan.status === 'executing' &&
                  'bg-[#e3f2fd] text-[#2196f3]',
                displayPlan.status === 'failed' &&
                  'bg-[#ffebee] text-[#e74c3c]',
                displayPlan.status === 'draft' &&
                  'bg-[#f0f0ec] text-[#6b6b6b]',
                displayPlan.status === 'validated' &&
                  'bg-[#e3f2fd] text-[#2196f3]',
              )}
            >
              {displayPlan.status}
            </span>
          )}
        </div>
        <div className="flex-1" />
        <GeneratePlanButton
          boardId={boardId}
          intentSpecs={intentSpecs}
          cards={cards}
          onPlanGenerated={(p) => setPlan(p)}
        />
      </div>

      {/* DAG */}
      <PlanDagView
        plan={displayPlan ?? null}
        isLoading={!plan && planLoading}
        error={!plan && planError ? (planError as Error) : null}
        onNodeClick={onNodeClick}
      />

      {/* Meta row (only when a plan exists) */}
      {displayPlan && displayPlan.nodes && displayPlan.nodes.length > 0 && (
        <div className="flex items-center gap-[12px] text-[10px] text-[#acacac]">
          <span>
            {displayPlan.nodes.length} node{displayPlan.nodes.length === 1 ? '' : 's'}
          </span>
          {displayPlan.time_estimate && <span>est. {displayPlan.time_estimate}</span>}
          {typeof displayPlan.cost_estimate === 'number' && (
            <span>${displayPlan.cost_estimate.toFixed(2)}</span>
          )}
          <span className="ml-auto font-mono text-[#d0d0d0]">{displayPlan.id}</span>
        </div>
      )}
    </div>
  );
}
