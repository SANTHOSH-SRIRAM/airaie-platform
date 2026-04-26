import { GripVertical, Loader2, CircleDot, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { useRunDetail } from '@hooks/useRuns';
import ConfigSection from './ConfigSection';
import type { Card } from '@/types/card';
import type { ExecutionPlan, PlanNode } from '@/types/plan';
import type { RunDetail, RunNodeStatus } from '@/types/run';
import type { CardModeRules } from '@hooks/useCardModeRules';

// ---------------------------------------------------------------------------
// CardExecutionSequence — read-only DAG-as-list visualization for the Card's
// resolved Plan. During an active Run, each row's status indicator reflects
// the live NodeRun.status from useRunDetail (which polls every 3s — fine for
// Phase 8 as a fallback for the not-yet-shipped run-stream subscription).
//
// We render the plan_node order linearly because Phase 8 ships only
// `analysis` Cards which have a single linear chain. When sweep / comparison
// land in a later phase the layout swaps to a true DAG via ReactFlow; the
// present component is intentionally simple.
//
// The drag-handle (⠿) is decorative — Phase 8 doesn't support reordering
// since Methods are pipeline-driven. The handle indicates the future
// capability the concept doc reserves ("Drag to reorder steps") and only
// shows when canChangePipeline; otherwise users see no affordance.
// ---------------------------------------------------------------------------

interface CardExecutionSequenceProps {
  card: Card;
  plan: ExecutionPlan | undefined;
  /** Latest run id; pulled from React Query elsewhere (CardActionBar) and
   *  passed in as a string. When null, no run-status overlay is fetched. */
  latestRunId?: string | null;
  rules: CardModeRules;
}

// ---------------------------------------------------------------------------
// mergeNodeStatus — pure helper: looks up a plan node's status in the run's
// NodeRun list. Exported for unit tests.
// ---------------------------------------------------------------------------

export type SequenceNodeStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped';

export function mergeNodeStatus(
  node: PlanNode,
  runDetail: RunDetail | undefined,
): SequenceNodeStatus {
  if (!runDetail) return 'queued';
  const match = runDetail.nodes.find((n) => n.nodeId === node.node_id);
  if (!match) return 'queued';
  return mapRunStatus(match.status);
}

function mapRunStatus(s: RunNodeStatus): SequenceNodeStatus {
  switch (s) {
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'pending':
    default:
      return 'queued';
  }
}

// ---------------------------------------------------------------------------
// Status icon picker
// ---------------------------------------------------------------------------

function StatusIndicator({ status }: { status: SequenceNodeStatus }) {
  switch (status) {
    case 'running':
      return (
        <Loader2
          size={14}
          className="text-[#2196f3] animate-spin"
          aria-label="Running"
        />
      );
    case 'completed':
      return (
        <CheckCircle2
          size={14}
          className="text-[#4caf50]"
          aria-label="Completed"
        />
      );
    case 'failed':
      return <XCircle size={14} className="text-[#e74c3c]" aria-label="Failed" />;
    case 'skipped':
      return (
        <CircleDot
          size={14}
          className="text-[#9e9e9e] opacity-50"
          aria-label="Skipped"
        />
      );
    case 'queued':
    default:
      return <CircleDot size={14} className="text-[#d0d0d0]" aria-label="Queued" />;
  }
}

// ---------------------------------------------------------------------------
// CardExecutionSequence — main render
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | undefined): string {
  if (!seconds && seconds !== 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s ? ` ${s}s` : ''}`;
}

export default function CardExecutionSequence({
  card: _card,
  plan,
  latestRunId,
  rules,
}: CardExecutionSequenceProps) {
  // Pull live run detail when a run is in flight (or recent). useRunDetail
  // polls every 3s — Phase 8 fallback for the not-yet-shipped run-stream.
  const { data: runDetail } = useRunDetail(latestRunId ?? null);

  return (
    <ConfigSection
      title="Card Execution Sequence"
      actions={
        rules.canChangePipeline ? (
          <span className="text-[10px] text-[#acacac]">Drag to reorder steps</span>
        ) : null
      }
    >
      {!plan && (
        <p className="text-[12px] text-[#acacac] py-[12px]">
          No plan generated yet — pick a Method above to compile one.
        </p>
      )}

      {plan && plan.nodes.length === 0 && (
        <p className="text-[12px] text-[#acacac] py-[12px]">
          Plan has no nodes. Try regenerating with a different pipeline.
        </p>
      )}

      {plan && plan.nodes.length > 0 && (
        <ol
          aria-label="Plan execution sequence"
          className="flex flex-col gap-[2px]"
        >
          {plan.nodes.map((node) => {
            const status = mergeNodeStatus(node, runDetail);
            const matchingRun = runDetail?.nodes.find((n) => n.nodeId === node.node_id);
            return (
              <li
                key={node.node_id}
                className="flex items-center gap-[10px] px-[8px] py-[8px] rounded-[6px] hover:bg-[#fafafa] transition-colors"
              >
                {/* Drag handle (decorative in Phase 8) */}
                <span
                  className="text-[#d0d0d0] shrink-0"
                  aria-hidden="true"
                  title="Drag to reorder (Phase 8: read-only)"
                >
                  <GripVertical size={14} />
                </span>

                {/* Status indicator */}
                <StatusIndicator status={status} />

                {/* Node name + role chip */}
                <span className="text-[12px] font-medium text-[#1a1a1a]">
                  {node.tool_id}
                </span>
                <span className="text-[10px] text-[#6b6b6b] px-[6px] h-[18px] inline-flex items-center rounded-full bg-[#f0f0ec]">
                  {node.role}
                </span>

                {/* Right-aligned: duration if completed, status text if running */}
                <span className="ml-auto text-[10px] text-[#acacac] tabular-nums">
                  {status === 'completed' || status === 'failed'
                    ? formatDuration(matchingRun?.duration)
                    : status === 'running'
                      ? 'in progress'
                      : ''}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Footer: Add custom step (Explore-only stub) */}
      {plan && rules.canChangePipeline && (
        <button
          type="button"
          aria-label="Add custom step (opens Workflow Editor)"
          title="Open the Workflow Editor in a new tab to add a custom step"
          onClick={() => {
            if (plan.workflow_id) {
              window.open(`/workflow-editor/${plan.workflow_id}`, '_blank');
            }
          }}
          disabled={!plan.workflow_id}
          className="mt-[8px] inline-flex items-center gap-[4px] text-[11px] text-[#f57c00] hover:text-[#e65100] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={11} />
          Add custom step
        </button>
      )}
    </ConfigSection>
  );
}
