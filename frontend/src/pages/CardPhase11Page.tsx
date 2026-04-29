import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useCard, useCardEvidence, cardKeys } from '@hooks/useCards';
import { useBoard } from '@hooks/useBoards';
import { useIntent, useIntentTypePipelines, useUpdateIntent } from '@hooks/useIntents';
import { useGeneratePlan, usePlan } from '@hooks/usePlans';
import { useCardGates } from '@hooks/useGates';
import { useRunDetail } from '@hooks/useRuns';
import { pickLatestRunId } from '@hooks/useCardRunState';
import { useCardModeRules } from '@hooks/useCardModeRules';
import { listCardRuns } from '@api/cards';
import type { Pipeline } from '@api/pipelines';

import PageSkeleton from '@components/ui/PageSkeleton';
import ErrorState from '@components/ui/ErrorState';
import CardDetailLayout from '@components/cards/CardDetailLayout';
import CardTopBar from '@components/cards/CardTopBar';
import CardActionBar from '@components/cards/CardActionBar';
import ArtifactPickerDrawer from '@components/cards/ArtifactPickerDrawer';

import {
  StagePanel,
  StatusBadge,
  KpiRow,
  ToolChainCard,
  EvidenceRow,
  GateBadge,
} from '@components/cards/primitives';
import type {
  ToolChainItem,
  ToolTrustLevel,
  StatusBadgeTone,
  KpiEvaluation,
  GateStatus,
} from '@components/cards/primitives';

import type { IntentSpec, IntentInput, AcceptanceCriterion } from '@/types/intent';
import type { ExecutionPlan } from '@/types/plan';
import type { CardEvidence } from '@/types/card';
import type { Gate, GateStatus as KernelGateStatus } from '@/types/gate';
import type { RunSummary } from '@api/cards';

// ---------------------------------------------------------------------------
// CardPhase11Page — replaces the Tiptap-driven CardCanvasPage.
//
// Reads card / intent / plan / latest run / evidence / gates from the same
// React Query hooks as the legacy canvas, then composes the five locked
// stages — Intent · Inputs · Method · Run · Read — as static StagePanel
// instances. No editor, no NodeViews, no body persistence.
// ---------------------------------------------------------------------------

const TRUST_DEFAULT: ToolTrustLevel = 'tested';

// ─── Stage 1 — Intent ──────────────────────────────────────────────────────

function intentStatus(intent: IntentSpec | undefined): { label: string; tone: StatusBadgeTone } {
  if (!intent) return { label: 'NO INTENT', tone: 'neutral' };
  if (intent.status === 'locked') return { label: 'LOCKED', tone: 'neutral' };
  if (intent.status === 'completed') return { label: 'LOCKED', tone: 'success' };
  if (intent.status === 'failed') return { label: 'FAILED', tone: 'danger' };
  if (intent.status === 'active') return { label: 'ACTIVE', tone: 'warning' };
  return { label: 'DRAFTING', tone: 'neutral' };
}

function operatorGlyph(op: AcceptanceCriterion['operator']): string {
  switch (op) {
    case 'lt':  return '<';
    case 'lte': return '≤';
    case 'gt':  return '>';
    case 'gte': return '≥';
    case 'eq':  return '=';
    case 'neq': return '≠';
    case 'in':  return 'in';
    case 'between': return 'in';
    default: return op;
  }
}

function thresholdString(threshold: unknown): string {
  if (threshold === null || threshold === undefined) return '—';
  if (typeof threshold === 'number') return String(threshold);
  if (typeof threshold === 'boolean') return threshold ? 'true' : 'false';
  if (typeof threshold === 'string') return threshold;
  if (Array.isArray(threshold)) return `[${threshold.join(', ')}]`;
  return '—';
}

function IntentStage({ intent }: { intent: IntentSpec | undefined }) {
  const status = intentStatus(intent);

  if (!intent) {
    return (
      <StagePanel number={1} title="Intent Definition" status={status.label} statusTone={status.tone}>
        <p className="font-sans text-[13px] text-[#554433]/70">
          No IntentSpec bound to this card yet. Use the structured page to draft an Intent.
        </p>
      </StagePanel>
    );
  }

  return (
    <StagePanel number={1} title="Intent Definition" status={status.label} statusTone={status.tone}>
      <div className="flex flex-col gap-[8px]">
        <span className="font-sans text-[12px] font-medium text-[#554433]">Core Objective</span>
        <p className="rounded-[12px] bg-[#f5f5f0] px-[16px] py-[16px] font-sans text-[14px] leading-[1.55] text-[#554433]">
          {intent.goal || '(no goal set)'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-[12px]">
        <span className="font-sans text-[12px] font-medium text-[#554433]">Type</span>
        <StatusBadge tone="warning">{intent.intent_type}</StatusBadge>
        {intent.context?.vertical_slug ? (
          <>
            <span className="font-sans text-[12px] text-[#554433]/70">·</span>
            <span className="font-sans text-[12px] text-[#554433]/70">
              vertical: {intent.context.vertical_slug}
            </span>
          </>
        ) : null}
      </div>

      {intent.acceptance_criteria.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">Acceptance KPIs</span>
          <div className="flex flex-wrap gap-[8px]">
            {intent.acceptance_criteria.map((c) => (
              <KpiRow
                key={c.id}
                metric={c.metric}
                operator={operatorGlyph(c.operator)}
                target={thresholdString(c.threshold)}
                unit={c.unit}
              />
            ))}
          </div>
        </div>
      ) : null}
    </StagePanel>
  );
}

// ─── Stage 2 — Inputs ──────────────────────────────────────────────────────

function isPinned(input: IntentInput): boolean {
  return Boolean(input.artifact_ref && input.artifact_ref.startsWith('art_'));
}

function truncateArtifactId(id: string | undefined): string {
  if (!id) return '—';
  if (id.length <= 11) return id;
  return `${id.slice(0, 11)}…`;
}

function inputsStatus(intent: IntentSpec | undefined): { label: string; tone: StatusBadgeTone } {
  if (!intent || intent.inputs.length === 0) return { label: 'EMPTY', tone: 'neutral' };
  const allPinned = intent.inputs.every(isPinned);
  return allPinned
    ? { label: 'PINNED', tone: 'neutral' }
    : { label: 'INCOMPLETE', tone: 'warning' };
}

function InputsStage({
  intent,
  boardId,
  onPinClick,
  pinningPort,
}: {
  intent: IntentSpec | undefined;
  boardId: string | undefined;
  onPinClick: (input: IntentInput) => void;
  pinningPort: string | null;
}) {
  const status = inputsStatus(intent);
  const inputs = intent?.inputs ?? [];

  if (inputs.length === 0) {
    return (
      <StagePanel number={2} title="Inputs" status={status.label} statusTone={status.tone}>
        <p className="font-sans text-[13px] text-[#554433]/70">
          No input ports declared. Inputs are pinned in the Intent flow.
        </p>
      </StagePanel>
    );
  }

  const pinnedCount = inputs.filter(isPinned).length;
  const canPin = Boolean(boardId);

  return (
    <StagePanel number={2} title="Inputs" status={status.label} statusTone={status.tone}>
      <div className="flex flex-col gap-[8px]">
        {inputs.map((input) => {
          const pinned = isPinned(input);
          const isPinning = pinningPort === input.name;
          return (
            <div
              key={input.name}
              className="flex items-center justify-between rounded-[10px] bg-[#f5f5f0] px-[14px] py-[12px]"
            >
              <div className="flex items-center gap-[14px]">
                <StatusBadge tone={pinned ? 'warning' : 'neutral'}>{input.name}</StatusBadge>
                <span className="font-sans text-[13px] font-medium text-[#1a1c19]">
                  {pinned ? input.artifact_ref : '(not pinned)'}
                </span>
                {input.required && !pinned ? (
                  <span className="font-mono text-[10px] uppercase text-[#cc3326]">required</span>
                ) : null}
              </div>
              <div className="flex items-center gap-[10px]">
                {input.version ? (
                  <span className="font-mono text-[11px] text-[#554433]">{input.version}</span>
                ) : null}
                {pinned ? (
                  <span className="font-mono text-[11px] text-[#554433]/55">
                    {truncateArtifactId(input.artifact_ref)}
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={!canPin || isPinning}
                  onClick={() => onPinClick(input)}
                  className="rounded-[6px] border border-[#ff9800]/30 bg-white px-[10px] py-[5px] font-sans text-[11px] font-medium text-[#c14110] transition-colors hover:bg-[#ff9800]/10 disabled:cursor-not-allowed disabled:border-[#554433]/15 disabled:text-[#554433]/40"
                >
                  {isPinning ? 'Pinning…' : pinned ? 'Replace' : 'Pin artifact'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <span className="font-sans text-[12px] text-[#554433]/70">
        {pinnedCount} of {inputs.length} pinned ·{' '}
        {pinnedCount === inputs.length
          ? 'ready to compile'
          : 'pin remaining inputs to continue'}
      </span>
    </StagePanel>
  );
}

// ─── Stage 3 — Method ──────────────────────────────────────────────────────

function methodStatus(plan: ExecutionPlan | undefined): { label: string; tone: StatusBadgeTone } {
  if (!plan) return { label: 'NO PLAN', tone: 'neutral' };
  // Kernel sometimes leaves plan.status='executing' after a run is cancelled
  // or fails. If pipeline_id is empty in that state, the plan didn't actually
  // compile — surface as PARTIAL (warning) instead of misleading EXECUTING.
  // See doc/CARD_LIFECYCLE.md §6.4 stale-state guard.
  const hasPipeline = Boolean(plan.pipeline_id);
  if (plan.status === 'validated') return { label: 'COMPILED', tone: 'success' };
  if (plan.status === 'completed') return { label: 'COMPLETED', tone: 'success' };
  if (plan.status === 'executing') {
    return hasPipeline
      ? { label: 'EXECUTING', tone: 'warning' }
      : { label: 'PARTIAL', tone: 'warning' };
  }
  if (plan.status === 'failed') return { label: 'FAILED', tone: 'danger' };
  return { label: 'DRAFT', tone: 'neutral' };
}

function formatTimeEstimate(estimate: string | undefined): string | null {
  if (!estimate) return null;
  const trimmed = estimate.trim();
  if (!trimmed || trimmed === '0h0m' || trimmed === '0h' || trimmed === '0m') return null;
  return trimmed;
}

function planNodesToToolChain(plan: ExecutionPlan): ToolChainItem[] {
  return plan.nodes.map((n) => ({
    name: n.tool_id,
    version: n.tool_version,
    trust: TRUST_DEFAULT,
  }));
}

function MethodStage({
  plan,
  intent,
  cardId,
  latestRunId,
}: {
  plan: ExecutionPlan | undefined;
  intent: IntentSpec | undefined;
  cardId: string | undefined;
  latestRunId: string | null;
}) {
  const status = methodStatus(plan);
  const { data: pipelineOptions } = useIntentTypePipelines(intent?.intent_type);
  const generatePlan = useGeneratePlan(cardId ?? '');

  // Selected pipeline for (re)generation. Default to the plan's current
  // pipeline_id when one exists, otherwise the first option.
  const defaultPipeline = plan?.pipeline_id || pipelineOptions?.[0]?.slug || '';
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const effectiveSelected = selectedPipeline || defaultPipeline;

  const handleGenerate = async () => {
    if (!cardId) return;
    try {
      await generatePlan.mutateAsync(
        effectiveSelected ? { pipeline_id: effectiveSelected } : undefined,
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate plan:', err);
    }
  };

  const pipelines: Pipeline[] = pipelineOptions ?? [];
  const generating = generatePlan.isPending;

  // ─── No plan yet — bare picker + generate ─────────────────────────────
  if (!plan) {
    return (
      <StagePanel number={3} title="Method" status={status.label} statusTone={status.tone}>
        <p className="font-sans text-[13px] text-[#554433]/70">
          No execution plan generated yet.{' '}
          {intent ? 'Pick a pipeline and generate.' : 'Card needs an Intent first.'}
        </p>
        {intent ? (
          <div className="flex flex-wrap items-center gap-[12px]">
            <PipelinePicker
              options={pipelines}
              value={effectiveSelected}
              onChange={setSelectedPipeline}
              disabled={generating}
            />
            <button
              type="button"
              disabled={generating || !cardId}
              onClick={handleGenerate}
              className="rounded-[8px] bg-[#1a1c19] px-[14px] py-[8px] font-sans text-[12px] font-medium text-white transition-colors hover:bg-[#1a1c19]/90 disabled:cursor-not-allowed disabled:bg-[#554433]/30"
            >
              {generating ? 'Generating…' : '⚙ Generate Plan'}
            </button>
          </div>
        ) : null}
      </StagePanel>
    );
  }

  const tools = planNodesToToolChain(plan);
  const estimate = formatTimeEstimate(plan.time_estimate);
  const canRegenerate =
    pipelines.length > 0 && (effectiveSelected !== plan.pipeline_id || !plan.pipeline_id);

  return (
    <StagePanel number={3} title="Method" status={status.label} statusTone={status.tone}>
      <div className="flex flex-wrap items-center gap-[12px]">
        <span className="font-sans text-[12px] font-medium text-[#554433]">Pipeline</span>
        {pipelines.length > 0 ? (
          <PipelinePicker
            options={pipelines}
            value={effectiveSelected}
            onChange={setSelectedPipeline}
            disabled={generating}
          />
        ) : plan.pipeline_id ? (
          <StatusBadge tone="warning">{plan.pipeline_id}</StatusBadge>
        ) : (
          <span className="font-mono text-[11px] text-[#554433]/55">(no pipeline_id)</span>
        )}
        <span className="font-sans text-[12px] text-[#554433]/70">
          · {plan.nodes.length} step{plan.nodes.length === 1 ? '' : 's'}
          {estimate ? ` · est. ${estimate}` : ''}
        </span>
        {canRegenerate ? (
          <button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className="ml-auto rounded-[6px] border border-[#1a1c19]/15 bg-white px-[10px] py-[5px] font-sans text-[11px] font-medium text-[#1a1c19] transition-colors hover:bg-[#f5f5f0] disabled:cursor-not-allowed disabled:text-[#554433]/40"
          >
            {generating ? 'Regenerating…' : effectiveSelected !== plan.pipeline_id ? '⚙ Switch + regenerate' : '↻ Regenerate'}
          </button>
        ) : null}
      </div>
      {tools.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">Resolved Tool Chain</span>
          <ToolChainCard tools={tools} />
        </div>
      ) : null}
      {latestRunId ? (
        <Link
          to={`/workflow-runs/${latestRunId}`}
          className="self-start font-sans text-[12px] font-medium text-[#c14110] hover:underline"
        >
          🔍 Inspect compiled DAG
        </Link>
      ) : null}
    </StagePanel>
  );
}

function PipelinePicker({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Pipeline[];
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) {
    return (
      <span className="font-mono text-[11px] text-[#554433]/55">
        (no pipelines for this intent type)
      </span>
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-[6px] border border-[#ff9800]/30 bg-[#ff9800]/[0.08] px-[10px] py-[5px] font-mono text-[11px] text-[#8b5000] focus:outline-none focus:ring-2 focus:ring-[#ff9800]/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((p) => (
        <option key={p.id ?? p.slug} value={p.slug}>
          {p.slug}
          {p.name && p.name !== p.slug ? ` — ${p.name}` : ''}
        </option>
      ))}
    </select>
  );
}

// ─── Stage 4 — Run ─────────────────────────────────────────────────────────

interface MinimalRunDetail {
  id: string;
  status: string;
  startedAt?: string;
  duration?: number;
  nodes?: Array<{ nodeId?: string; nodeName?: string; status?: string; duration?: number }>;
}

function runTone(status: string | undefined): { label: string; tone: StatusBadgeTone } {
  if (!status) return { label: 'NO RUN', tone: 'neutral' };
  const s = status.toLowerCase();
  if (s === 'succeeded' || s === 'completed') return { label: 'SUCCEEDED', tone: 'success' };
  if (s === 'running' || s === 'queued') return { label: s.toUpperCase(), tone: 'warning' };
  if (s === 'failed') return { label: 'FAILED', tone: 'danger' };
  if (s === 'cancelled') return { label: 'CANCELLED', tone: 'neutral' };
  return { label: s.toUpperCase(), tone: 'neutral' };
}

function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Strip the `node_NNN_` ordinal prefix some pipelines emit so the user
 *  sees the meaningful tool path, not a step counter. */
function cleanStepName(name: string | undefined, fallback: string): string {
  if (!name) return fallback;
  return name.replace(/^node_\d+_/, '');
}

function RunStage({
  run,
  runs,
  latestRunId,
}: {
  run: MinimalRunDetail | null;
  runs: RunSummary[] | undefined;
  latestRunId: string | null;
}) {
  const status = runTone(run?.status);
  const allRuns = runs ?? [];

  if (!run) {
    return (
      <StagePanel number={4} title="Run" status={status.label} statusTone={status.tone}>
        <p className="font-sans text-[13px] text-[#554433]/70">
          No runs recorded. Click <span className="font-mono text-[#c14110]">Run Card</span> in the top bar to execute the compiled plan.
        </p>
      </StagePanel>
    );
  }

  const stats = [
    { label: 'RUN ID', value: run.id },
    { label: 'DURATION', value: formatDuration(run.duration) },
    { label: 'STARTED', value: formatTimestamp(run.startedAt) },
    { label: 'STEPS', value: String(run.nodes?.length ?? 0) },
  ];

  // Sort run history newest-first; trim to last 10 to keep the section short.
  const history = useMemo(() => {
    return [...allRuns]
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 10);
  }, [allRuns]);

  return (
    <StagePanel number={4} title="Run" status={status.label} statusTone={status.tone}>
      <div className="flex flex-wrap items-center gap-[28px] rounded-[10px] bg-[#f5f5f0] px-[16px] py-[14px]">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-[4px]">
            <span className="font-sans text-[10px] uppercase tracking-wide text-[#554433]/70">
              {s.label}
            </span>
            <span className="font-mono text-[13px] font-bold text-[#1a1c19]">{s.value}</span>
          </div>
        ))}
      </div>
      {run.nodes && run.nodes.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">Pipeline Steps</span>
          <div className="flex flex-col gap-[4px]">
            {run.nodes.map((step, idx) => {
              const ok = step.status === 'completed' || step.status === 'succeeded';
              const failed = step.status === 'failed';
              const skipped = step.status === 'skipped' || step.status === 'pending';
              const hasDuration = (step.duration ?? 0) > 0;
              return (
                <div
                  key={step.nodeId ?? `step-${idx}`}
                  className="flex items-center justify-between rounded-[8px] bg-[#f5f5f0]/60 px-[14px] py-[10px]"
                >
                  <div className="flex items-center gap-[10px]">
                    <span
                      className={`font-mono text-[13px] font-bold ${
                        ok ? 'text-[#2e8c56]' : failed ? 'text-[#cc3326]' : 'text-[#8b5000]'
                      }`}
                      aria-hidden="true"
                    >
                      {ok ? '✓' : failed ? '✗' : '◆'}
                    </span>
                    <span className="font-mono text-[12px] text-[#1a1c19]">
                      {cleanStepName(step.nodeName ?? step.nodeId, `step ${idx + 1}`)}
                    </span>
                  </div>
                  {hasDuration ? (
                    <span className="font-mono text-[11px] text-[#554433]/70">
                      {formatDuration(step.duration)}
                    </span>
                  ) : skipped ? (
                    <span className="font-mono text-[10px] uppercase text-[#554433]/45">
                      skipped
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {history.length > 1 ? (
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">Run History</span>
          <div className="flex flex-col gap-[2px]">
            {history.map((r) => {
              const isCurrent = r.run_id === latestRunId;
              const t = runTone(r.status);
              return (
                <Link
                  key={r.id}
                  to={`/workflow-runs/${r.run_id}`}
                  className={`flex items-center justify-between rounded-[6px] px-[14px] py-[8px] font-mono text-[11px] transition-colors hover:bg-[#f5f5f0] ${
                    isCurrent ? 'bg-[#f5f5f0]/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-[10px]">
                    <StatusBadge tone={t.tone}>{t.label}</StatusBadge>
                    <span className="text-[#1a1c19]">{r.run_id}</span>
                    {isCurrent ? (
                      <span className="text-[10px] uppercase text-[#8b5000]">current</span>
                    ) : null}
                  </div>
                  <span className="text-[#554433]/70">{formatTimestamp(r.started_at)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </StagePanel>
  );
}

// ─── Stage 5 — Read ────────────────────────────────────────────────────────

function evaluationToTick(ev: CardEvidence['evaluation']): KpiEvaluation {
  if (ev === 'pass') return 'pass';
  if (ev === 'fail') return 'fail';
  return 'pending';
}

function gateStatusToBadge(s: KernelGateStatus): GateStatus {
  if (s === 'PASSED') return 'PASSED';
  if (s === 'FAILED') return 'FAILED';
  if (s === 'WAIVED') return 'WAIVED';
  return 'PENDING';
}

function readStatus(
  evidence: CardEvidence[] | undefined,
  gates: Gate[] | undefined
): { label: string; tone: StatusBadgeTone } {
  const evs = evidence ?? [];
  const gs = gates ?? [];
  if (evs.length === 0 && gs.length === 0) return { label: 'NO RESULTS', tone: 'neutral' };
  const allEvPass = evs.length > 0 && evs.every((e) => e.evaluation === 'pass');
  const allGatesPass = gs.length > 0 && gs.every((g) => g.status === 'PASSED');
  if (allEvPass && (gs.length === 0 || allGatesPass)) {
    return { label: 'VERIFIED', tone: 'success' };
  }
  const anyFail = evs.some((e) => e.evaluation === 'fail') || gs.some((g) => g.status === 'FAILED');
  if (anyFail) return { label: 'FAILED', tone: 'danger' };
  return { label: 'PENDING', tone: 'warning' };
}

function ReadStage({
  evidence,
  gates,
}: {
  evidence: CardEvidence[] | undefined;
  gates: Gate[] | undefined;
}) {
  const status = readStatus(evidence, gates);
  const evs = evidence ?? [];
  const gs = gates ?? [];

  if (evs.length === 0 && gs.length === 0) {
    return (
      <StagePanel number={5} title="Read" status={status.label} statusTone={status.tone}>
        <p className="font-sans text-[13px] text-[#554433]/70">
          No evidence collected and no gates evaluated yet. Run the card to populate KPI evidence and gate status.
        </p>
      </StagePanel>
    );
  }

  return (
    <StagePanel number={5} title="Read" status={status.label} statusTone={status.tone}>
      {evs.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">KPI Evidence</span>
          <div className="flex flex-col gap-[6px]">
            {evs.map((e) => (
              <EvidenceRow
                key={e.id}
                metric={e.metric_key}
                observed={String(e.metric_value)}
                unit={e.metric_unit}
                target={
                  e.operator && e.threshold !== undefined
                    ? `${e.operator} ${e.threshold}`
                    : undefined
                }
                evaluation={evaluationToTick(e.evaluation)}
              />
            ))}
          </div>
        </div>
      ) : null}
      {gs.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">Gates</span>
          <div className="flex flex-wrap gap-[8px]">
            {gs.map((g) => (
              <GateBadge key={g.id} name={g.name} status={gateStatusToBadge(g.status)} />
            ))}
          </div>
        </div>
      ) : null}
    </StagePanel>
  );
}

// ─── Page assembly ─────────────────────────────────────────────────────────

export default function CardPhase11Page() {
  const { cardId } = useParams<{ cardId: string }>();
  const { data: card, isLoading: cardLoading, error: cardError } = useCard(cardId);
  const { data: board, isLoading: boardLoading } = useBoard(card?.board_id);
  const { data: intent } = useIntent(card?.intent_spec_id);
  const { data: plan } = usePlan(card?.id);
  const { data: evidence } = useCardEvidence(card?.id);
  const { data: gates } = useCardGates(card?.id, card?.board_id);
  const rules = useCardModeRules(card, board);
  const updateIntent = useUpdateIntent(intent?.id ?? '', card?.board_id);

  // Stage 2 input picker state — which input port the user is pinning.
  const [pickerInput, setPickerInput] = useState<IntentInput | null>(null);

  const handlePinSelect = async (artifactId: string) => {
    if (!intent || !pickerInput) return;
    const nextInputs = intent.inputs.map((inp) =>
      inp.name === pickerInput.name ? { ...inp, artifact_ref: artifactId } : inp,
    );
    try {
      await updateIntent.mutateAsync({ inputs: nextInputs });
      setPickerInput(null);
    } catch (err) {
      // Mutation onError isn't surfaced here yet — keep drawer open so the
      // user can retry. A toast component would be the proper home for this.
      // eslint-disable-next-line no-console
      console.error('Failed to pin artifact:', err);
    }
  };

  const { data: cardRuns } = useQuery({
    queryKey: cardId ? ([...cardKeys.detail(cardId), 'runs'] as const) : (['cards', 'runs'] as const),
    queryFn: () => listCardRuns(cardId!),
    enabled: !!cardId,
    staleTime: 5_000,
  });
  const latestRunId = useMemo(() => pickLatestRunId(cardRuns), [cardRuns]);
  const { data: runDetail } = useRunDetail(latestRunId);

  const minimalRun = useMemo<MinimalRunDetail | null>(() => {
    if (!latestRunId) return null;
    if (runDetail) {
      return {
        id: runDetail.id,
        status: runDetail.status,
        startedAt: runDetail.startedAt,
        duration: runDetail.duration,
        nodes: runDetail.nodes,
      };
    }
    const summary = cardRuns?.find((r) => r.run_id === latestRunId);
    if (!summary) return null;
    return {
      id: summary.run_id,
      status: summary.status,
      startedAt: summary.started_at,
    };
  }, [latestRunId, runDetail, cardRuns]);

  if (cardLoading) return <PageSkeleton />;
  if (cardError || !card) {
    return (
      <ErrorState
        message={cardError instanceof Error ? cardError.message : 'Card not found'}
      />
    );
  }

  return (
    <CardDetailLayout>
      <CardTopBar card={card} board={board} boardLoading={boardLoading} />
      <IntentStage intent={intent} />
      <InputsStage
        intent={intent}
        boardId={card.board_id}
        onPinClick={(input) => setPickerInput(input)}
        pinningPort={updateIntent.isPending ? pickerInput?.name ?? null : null}
      />
      <MethodStage plan={plan} intent={intent} cardId={card.id} latestRunId={latestRunId} />
      <RunStage run={minimalRun} runs={cardRuns} latestRunId={latestRunId} />
      <ReadStage evidence={evidence} gates={gates} />
      <CardActionBar card={card} intent={intent} plan={plan} rules={rules} />
      <ArtifactPickerDrawer
        open={pickerInput !== null}
        boardId={card.board_id}
        portName={pickerInput?.name ?? ''}
        expectedKind={pickerInput?.type}
        onSelect={handlePinSelect}
        onClose={() => setPickerInput(null)}
      />
    </CardDetailLayout>
  );
}
