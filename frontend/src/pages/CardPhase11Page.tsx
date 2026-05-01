import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useCard, useCardEvidence, useCreateCard, cardKeys } from '@hooks/useCards';
import { useBoard } from '@hooks/useBoards';
import { useIntent, useIntentTypePipelines, useUpdateIntent } from '@hooks/useIntents';
import { useEditPlan, useGeneratePlan, usePlan } from '@hooks/usePlans';
import { useAddCardEvidence, useApproveGate, useCardGates, useRejectGate } from '@hooks/useGates';
import { useRunArtifacts, useRunDetail, runKeys } from '@hooks/useRuns';
import { useRunSSE } from '@hooks/useSSE';
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
import BranchSweepDrawer, { type SweepSubmitPayload } from '@components/cards/BranchSweepDrawer';
import EditParametersDrawer, { type EditParametersSubmitPayload } from '@components/cards/EditParametersDrawer';
import CardChatDrawer from '@components/cards/CardChatDrawer';
import ToolManifestDrawer from '@components/cards/ToolManifestDrawer';
import ResultsSection from '@/renderers/ResultsSection';

import {
  StagePanel,
  StatusBadge,
  KpiRow,
  ToolChainCard,
  EvidenceRow,
  GateBadge,
  SweepSampleRow,
  SplitRenderer,
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
import type { Card, CardEvidence } from '@/types/card';
import type { Gate, GateStatus as KernelGateStatus } from '@/types/gate';
import type { RunSummary } from '@api/cards';
import type { RunArtifact } from '@api/runs';

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

function AskAiButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-[6px] rounded-[6px] border border-[#ff9800]/30 bg-white px-[10px] py-[5px] font-sans text-[11px] font-medium text-[#c14110] transition-colors hover:bg-[#ff9800]/10"
    >
      <span aria-hidden="true">✦</span>
      {label}
    </button>
  );
}

function IntentStage({
  intent,
  onAskAi,
}: {
  intent: IntentSpec | undefined;
  onAskAi: (prompt: string) => void;
}) {
  const status = intentStatus(intent);

  if (!intent) {
    return (
      <StagePanel number={1} title="Intent Definition" status={status.label} statusTone={status.tone}>
        <p className="font-sans text-[13px] text-[#554433]/70">
          No IntentSpec bound to this card yet. Use the structured page to draft an Intent — or ask the agent for a starting point.
        </p>
        <AskAiButton
          onClick={() => onAskAi(buildRefineIntentPrompt(undefined))}
          label="Draft an Intent with AI"
        />
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

      <AskAiButton
        onClick={() => onAskAi(buildRefineIntentPrompt(intent))}
        label="Refine with AI"
      />
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
  onAskAi,
}: {
  intent: IntentSpec | undefined;
  boardId: string | undefined;
  onPinClick: (input: IntentInput) => void;
  pinningPort: string | null;
  onAskAi: (prompt: string) => void;
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
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="font-sans text-[12px] text-[#554433]/70">
          {pinnedCount} of {inputs.length} pinned ·{' '}
          {pinnedCount === inputs.length
            ? 'ready to compile'
            : 'pin remaining inputs to continue'}
        </span>
        {pinnedCount < inputs.length ? (
          <AskAiButton
            onClick={() => onAskAi(buildSuggestPinPrompt(intent))}
            label="Suggest a pin"
          />
        ) : null}
      </div>
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
  onAskAi,
  onInspectTool,
  onEditNode,
}: {
  plan: ExecutionPlan | undefined;
  intent: IntentSpec | undefined;
  cardId: string | undefined;
  latestRunId: string | null;
  onAskAi: (prompt: string) => void;
  onInspectTool: (toolId: string) => void;
  /** When set, each editable plan node renders an "✎ Edit parameters"
   *  button below the tool chain. Gated by `useCardModeRules.canChangePipeline`
   *  upstream — Study and Release modes hide it. */
  onEditNode?: (nodeId: string) => void;
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
            <AskAiButton
              onClick={() => onAskAi(buildUseAgentPrompt(intent))}
              label="Use Agent instead"
            />
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
          <span className="font-sans text-[12px] font-medium text-[#554433]">
            Resolved Tool Chain
            <span className="ml-[6px] font-sans text-[11px] font-normal text-[#554433]/55">
              · click any tool to inspect its manifest
            </span>
          </span>
          <ToolChainCard tools={tools} onToolClick={(t) => onInspectTool(t.name)} />
        </div>
      ) : null}
      {onEditNode && plan.nodes.some((n) => n.is_editable && Object.keys(n.parameters ?? {}).length > 0) ? (
        <div className="flex flex-col gap-[6px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">
            Editable parameters
            <span className="ml-[6px] font-sans text-[11px] font-normal text-[#554433]/55">
              · adjust per-node config; saving resets the plan to draft
            </span>
          </span>
          <div className="flex flex-wrap gap-[6px]">
            {plan.nodes
              .filter((n) => n.is_editable && Object.keys(n.parameters ?? {}).length > 0)
              .map((n) => {
                const count = Object.keys(n.parameters ?? {}).length;
                return (
                  <button
                    key={n.node_id}
                    type="button"
                    onClick={() => onEditNode(n.node_id)}
                    className="inline-flex items-center gap-[6px] rounded-[6px] border border-[#1976d2]/30 bg-white px-[10px] py-[5px] font-sans text-[11px] font-medium text-[#1976d2] transition-colors hover:bg-[#1976d2]/[0.06]"
                  >
                    <span aria-hidden="true">✎</span>
                    {n.tool_id}
                    <span className="font-mono text-[10px] text-[#1976d2]/70">{count}</span>
                  </button>
                );
              })}
          </div>
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

// ─── Stage-scoped agent prompt builders (Phase 11 §7.3) ───────────────────

function buildRefineIntentPrompt(intent: IntentSpec | undefined): string {
  if (!intent) {
    return "Help me draft an IntentSpec for this card. What should I be measuring, and what acceptance criteria would prove the answer?";
  }
  const kpiList =
    intent.acceptance_criteria.length > 0
      ? intent.acceptance_criteria.map((c) => `- ${c.metric}`).join('\n')
      : '- (none declared)';
  return [
    `My current Intent: "${intent.goal}"`,
    `Type: ${intent.intent_type}`,
    'Acceptance KPIs:',
    kpiList,
    '',
    'Critique this Intent. Is the goal sharp enough? Are the KPIs the right ones, with the right thresholds? Suggest specific edits.',
  ].join('\n');
}

function buildSuggestPinPrompt(intent: IntentSpec | undefined): string {
  const unpinned = (intent?.inputs ?? [])
    .filter((i) => !i.artifact_ref || !i.artifact_ref.startsWith('art_'))
    .map((i) => `- ${i.name}${i.type ? ` (kind: ${i.type})` : ''}`)
    .join('\n');
  return [
    'Some of my Card inputs are not yet pinned:',
    unpinned || '- (everything is already pinned)',
    '',
    "Look at the board's artifact pool and suggest which artifact should pin to each unfilled port. If you're unsure between two candidates, list trade-offs.",
  ].join('\n');
}

function buildUseAgentPrompt(intent: IntentSpec | undefined): string {
  return [
    `My Intent type is \`${intent?.intent_type ?? 'unknown'}\` and the auto-picked pipeline either failed to compile or doesn't fit.`,
    '',
    'Take over the Method stage as an agent: pick the right tools, fill any missing parameters, and walk me through what you would run before I commit. I want to review your plan, not blank-check it.',
  ].join('\n');
}

function buildCompareSiblingsPrompt(card: Card): string {
  return [
    `Compare this card (\`${card.id}\` — "${card.title}") against the other completed cards on the same board.`,
    '',
    'For each sibling: pull the same KPIs we measured here, surface where the values diverge, and flag any that look anomalous. Prefer concrete numbers over hand-wavy summaries.',
  ].join('\n');
}

function buildDiagnosePrompt(run: MinimalRunDetail): string {
  const failedSteps = (run.nodes ?? [])
    .filter((n) => n.status === 'failed')
    .map((n) => n.nodeName ?? n.nodeId ?? 'unknown')
    .map((n) => n.replace(/^node_\d+_/, ''));
  const stepsLine = failedSteps.length > 0
    ? `Failed step(s): ${failedSteps.join(', ')}.`
    : 'No specific step is marked failed — likely an early-execution failure.';
  return [
    `My run \`${run.id}\` failed.`,
    stepsLine,
    `Duration: ${run.duration ?? 0}s.`,
    '',
    'Walk me through the most likely cause and the smallest possible fix. If you need stderr or input artifacts, say which.',
  ].join('\n');
}

function RunStage({
  run,
  runs,
  latestRunId,
  onDiagnose,
  onBranchSweep,
  canBranchSweep,
  sseConnected,
}: {
  run: MinimalRunDetail | null;
  runs: RunSummary[] | undefined;
  latestRunId: string | null;
  onDiagnose: (prompt: string) => void;
  onBranchSweep: () => void;
  canBranchSweep: boolean;
  sseConnected: boolean;
}) {
  const status = runTone(run?.status);
  const allRuns = runs ?? [];

  if (!run) {
    return (
      <StagePanel number={4} title="Run" status={status.label} statusTone={status.tone}>
        <p className="font-sans text-[13px] text-[#554433]/70">
          No runs recorded. Click <span className="font-mono text-[#c14110]">Run Card</span> in the top bar to execute the compiled plan.
        </p>
        {canBranchSweep ? (
          <div className="flex items-center gap-[10px] pt-[4px]">
            <button
              type="button"
              onClick={onBranchSweep}
              className="inline-flex items-center gap-[6px] rounded-[6px] border border-[#1976d2]/30 bg-white px-[10px] py-[5px] font-sans text-[11px] font-medium text-[#1976d2] transition-colors hover:bg-[#1976d2]/[0.06]"
            >
              <span aria-hidden="true">⤵</span>
              Branch into sweep
            </button>
            <span className="font-sans text-[11px] text-[#554433]/55">
              fan out a parametric sweep before running this card
            </span>
          </div>
        ) : null}
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

  const failed = run.status === 'failed';
  const inFlight = run.status === 'running' || run.status === 'waiting';

  return (
    <StagePanel number={4} title="Run" status={status.label} statusTone={status.tone}>
      {inFlight && sseConnected ? (
        <div className="flex items-center gap-[8px] rounded-[8px] bg-[#2e8c56]/[0.08] px-[12px] py-[6px]">
          <span
            className="inline-block h-[6px] w-[6px] animate-pulse rounded-full bg-[#2e8c56]"
            aria-hidden="true"
          />
          <span className="font-mono text-[11px] uppercase tracking-wide text-[#2e8c56]">
            Live · streaming events
          </span>
        </div>
      ) : null}
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
      {failed ? (
        <div className="flex flex-wrap items-center gap-[10px] rounded-[10px] border-l-[3px] border-[#cc3326]/50 bg-[#cc3326]/[0.04] px-[14px] py-[10px]">
          <span className="font-sans text-[12px] text-[#1a1c19]">
            This run failed.
          </span>
          <button
            type="button"
            onClick={() => onDiagnose(buildDiagnosePrompt(run))}
            className="rounded-[6px] bg-[#1a1c19] px-[10px] py-[5px] font-sans text-[11px] font-medium text-white transition-colors hover:bg-[#1a1c19]/90"
          >
            💡 Diagnose with chat
          </button>
          <span className="font-sans text-[11px] text-[#554433]/55">
            opens the Card chat drawer with a structured prompt — edit before sending
          </span>
        </div>
      ) : null}
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
      {canBranchSweep ? (
        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={onBranchSweep}
            className="inline-flex items-center gap-[6px] rounded-[6px] border border-[#1976d2]/30 bg-white px-[10px] py-[5px] font-sans text-[11px] font-medium text-[#1976d2] transition-colors hover:bg-[#1976d2]/[0.06]"
          >
            <span aria-hidden="true">⤵</span>
            Branch into sweep
          </button>
          <span className="font-sans text-[11px] text-[#554433]/55">
            fan out N runs varying one parameter
          </span>
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

function GateSignoffRow({ gate, boardId }: { gate: Gate; boardId: string | undefined }) {
  const [rationale, setRationale] = useState('');
  const approve = useApproveGate(gate.id, boardId);
  const reject = useRejectGate(gate.id, boardId);
  const submitting = approve.isPending || reject.isPending;
  const ready = rationale.trim().length >= 3 && !submitting;

  const submit = async (action: 'approve' | 'reject') => {
    if (!ready) return;
    try {
      if (action === 'approve') {
        await approve.mutateAsync({ rationale: rationale.trim() });
      } else {
        await reject.mutateAsync({ rationale: rationale.trim() });
      }
      setRationale('');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Gate ${action} failed (likely 403 — role not authorized):`, err);
    }
  };

  return (
    <div className="flex flex-col gap-[10px] rounded-[10px] bg-[#f5f5f0] px-[14px] py-[12px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <GateBadge name={gate.name} status="PENDING" />
        <span className="font-sans text-[12px] text-[#554433]/70">
          {gate.gate_type === 'evidence'
            ? 'awaiting auto evidence'
            : gate.gate_type === 'review'
              ? 'awaiting peer review'
              : 'awaiting compliance sign-off'}
        </span>
      </div>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder="Rationale (required) — what evidence supports this decision?"
        rows={2}
        className="w-full resize-none rounded-[8px] border border-[#1a1c19]/10 bg-white px-[12px] py-[8px] font-sans text-[13px] text-[#1a1c19] placeholder:text-[#554433]/45 focus:border-[#ff9800]/50 focus:outline-none focus:ring-2 focus:ring-[#ff9800]/20"
      />
      <div className="flex flex-wrap gap-[8px]">
        <button
          type="button"
          disabled={!ready}
          onClick={() => submit('approve')}
          className="rounded-[6px] bg-[#2e8c56] px-[12px] py-[6px] font-sans text-[12px] font-medium text-white transition-colors hover:bg-[#2e8c56]/90 disabled:cursor-not-allowed disabled:bg-[#2e8c56]/30"
        >
          {approve.isPending ? 'Approving…' : '✓ Approve'}
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => submit('reject')}
          className="rounded-[6px] border border-[#cc3326]/40 bg-white px-[12px] py-[6px] font-sans text-[12px] font-medium text-[#cc3326] transition-colors hover:bg-[#cc3326]/10 disabled:cursor-not-allowed disabled:border-[#cc3326]/15 disabled:text-[#cc3326]/40"
        >
          {reject.isPending ? 'Rejecting…' : '✗ Reject'}
        </button>
        <span className="self-center font-sans text-[11px] text-[#554433]/55">
          your decision is recorded with timestamp + role
        </span>
      </div>
    </div>
  );
}

function AddEvidenceForm({
  cardId,
  acceptanceCriteria,
  canAdd,
}: {
  cardId: string;
  acceptanceCriteria: AcceptanceCriterion[];
  canAdd: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [metricName, setMetricName] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [rationale, setRationale] = useState('');
  const addEvidence = useAddCardEvidence(cardId);

  if (!canAdd) return null;

  const reset = () => {
    setOpen(false);
    setMetricName('');
    setMetricValue('');
    setRationale('');
  };

  const submit = async () => {
    const trimmedName = metricName.trim();
    const trimmedValue = metricValue.trim();
    if (!trimmedName || !trimmedValue) return;
    const numeric = Number(trimmedValue);
    if (!Number.isFinite(numeric)) {
      // eslint-disable-next-line no-console
      console.warn('metric_value must be numeric (got non-finite):', trimmedValue);
      return;
    }
    try {
      await addEvidence.mutateAsync({
        metric_name: trimmedName,
        metric_value: numeric,
        rationale: rationale.trim() || undefined,
      });
      reset();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add evidence failed:', err);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-[6px] border border-[#1a1c19]/15 bg-white px-[10px] py-[5px] font-sans text-[11px] font-medium text-[#1a1c19] transition-colors hover:bg-[#f5f5f0]"
      >
        + Add evidence manually
      </button>
    );
  }

  const submitting = addEvidence.isPending;
  const ready = metricName.trim() && metricValue.trim() && !submitting;

  return (
    <div className="flex flex-col gap-[10px] rounded-[10px] bg-[#f5f5f0] px-[14px] py-[12px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="font-sans text-[12px] font-medium text-[#554433]">Add evidence</span>
        <span className="font-sans text-[11px] text-[#554433]/55">
          manual rows are recorded with attribution + timestamp
        </span>
      </div>
      <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2">
        <div className="flex flex-col gap-[4px]">
          <label className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
            Metric
          </label>
          {acceptanceCriteria.length > 0 ? (
            <select
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              disabled={submitting}
              className="rounded-[8px] border border-[#1a1c19]/10 bg-white px-[10px] py-[7px] font-mono text-[12px] text-[#1a1c19] focus:outline-none focus:ring-2 focus:ring-[#ff9800]/20"
            >
              <option value="">— pick a declared KPI —</option>
              {acceptanceCriteria.map((c) => (
                <option key={c.id} value={c.metric}>
                  {c.metric}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              disabled={submitting}
              placeholder="e.g. lift_coefficient"
              className="rounded-[8px] border border-[#1a1c19]/10 bg-white px-[10px] py-[7px] font-mono text-[12px] text-[#1a1c19] placeholder:text-[#554433]/40 focus:outline-none focus:ring-2 focus:ring-[#ff9800]/20"
            />
          )}
        </div>
        <div className="flex flex-col gap-[4px]">
          <label className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
            Value (numeric)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value)}
            disabled={submitting}
            placeholder="e.g. 1.28"
            className="rounded-[8px] border border-[#1a1c19]/10 bg-white px-[10px] py-[7px] font-mono text-[12px] text-[#1a1c19] placeholder:text-[#554433]/40 focus:outline-none focus:ring-2 focus:ring-[#ff9800]/20"
          />
        </div>
      </div>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder="Rationale (optional) — where did this number come from?"
        rows={2}
        disabled={submitting}
        className="w-full resize-none rounded-[8px] border border-[#1a1c19]/10 bg-white px-[10px] py-[7px] font-sans text-[12px] text-[#1a1c19] placeholder:text-[#554433]/45 focus:outline-none focus:ring-2 focus:ring-[#ff9800]/20"
      />
      <div className="flex flex-wrap gap-[8px]">
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className="rounded-[6px] bg-[#1a1c19] px-[12px] py-[6px] font-sans text-[12px] font-medium text-white transition-colors hover:bg-[#1a1c19]/90 disabled:cursor-not-allowed disabled:bg-[#554433]/30"
        >
          {submitting ? 'Saving…' : '✓ Save evidence'}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={submitting}
          className="rounded-[6px] border border-[#1a1c19]/15 bg-white px-[12px] py-[6px] font-sans text-[12px] font-medium text-[#1a1c19] transition-colors hover:bg-[#f5f5f0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReadStage({
  evidence,
  gates,
  boardId,
  cardId,
  intent,
  canAddEvidence,
  card,
  onAskAi,
  runArtifacts,
  latestRunId,
}: {
  evidence: CardEvidence[] | undefined;
  gates: Gate[] | undefined;
  boardId: string | undefined;
  cardId: string | undefined;
  intent: IntentSpec | undefined;
  canAddEvidence: boolean;
  card: Card;
  onAskAi: (prompt: string) => void;
  runArtifacts: RunArtifact[];
  latestRunId: string | null;
}) {
  const status = readStatus(evidence, gates);
  const evs = evidence ?? [];
  const gs = gates ?? [];
  const pendingGates = gs.filter((g) => g.status === 'PENDING' || g.status === 'EVALUATING');

  if (evs.length === 0 && gs.length === 0 && runArtifacts.length === 0) {
    return (
      <StagePanel number={5} title="Read" status={status.label} statusTone={status.tone}>
        <p className="font-sans text-[13px] text-[#554433]/70">
          No evidence collected and no gates evaluated yet. Run the card to populate KPI evidence and gate status — or add evidence manually if you have an out-of-band measurement to record.
        </p>
        {cardId ? (
          <AddEvidenceForm
            cardId={cardId}
            acceptanceCriteria={intent?.acceptance_criteria ?? []}
            canAdd={canAddEvidence}
          />
        ) : null}
      </StagePanel>
    );
  }

  return (
    <StagePanel number={5} title="Read" status={status.label} statusTone={status.tone}>
      {runArtifacts.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">Results</span>
          <ResultsSection
            runArtifacts={runArtifacts}
            intent={intent}
            runId={latestRunId ?? undefined}
          />
        </div>
      ) : null}
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
      {pendingGates.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <span className="font-sans text-[12px] font-medium text-[#554433]">
            Awaiting Sign-off
          </span>
          <div className="flex flex-col gap-[8px]">
            {pendingGates.map((g) => (
              <GateSignoffRow key={g.id} gate={g} boardId={boardId} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-[10px]">
        {cardId ? (
          <AddEvidenceForm
            cardId={cardId}
            acceptanceCriteria={intent?.acceptance_criteria ?? []}
            canAdd={canAddEvidence}
          />
        ) : null}
        {evs.length > 0 ? (
          <AskAiButton
            onClick={() => onAskAi(buildCompareSiblingsPrompt(card))}
            label="Compare with siblings"
          />
        ) : null}
      </div>
    </StagePanel>
  );
}

// ─── Stage 5 — Sweep variant ───────────────────────────────────────────────

interface SweepConfig {
  sweep_param?: string;
  sweep_values?: unknown[];
  parent_card_id?: string;
}

function readSweepConfig(card: Card): SweepConfig {
  const cfg = (card.config ?? {}) as Record<string, unknown>;
  return {
    sweep_param: typeof cfg.sweep_param === 'string' ? cfg.sweep_param : undefined,
    sweep_values: Array.isArray(cfg.sweep_values) ? cfg.sweep_values : undefined,
    parent_card_id:
      typeof cfg.parent_card_id === 'string' ? cfg.parent_card_id : undefined,
  };
}

function paramKeyFromPath(p: string | undefined): string {
  if (!p) return 'param';
  const dot = p.lastIndexOf('.');
  return dot >= 0 ? p.slice(dot + 1) : p;
}

function SweepReadStage({
  card,
  runs,
}: {
  card: Card;
  runs: RunSummary[] | undefined;
}) {
  const cfg = readSweepConfig(card);
  const values = cfg.sweep_values ?? [];
  const paramKey = paramKeyFromPath(cfg.sweep_param);
  const sortedRuns = useMemo(() => {
    return [...(runs ?? [])].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    );
  }, [runs]);

  if (values.length === 0) {
    return (
      <StagePanel number={5} title="Read" status="NO SAMPLES" statusTone="neutral">
        <p className="font-sans text-[13px] text-[#554433]/70">
          This sweep card has no samples in <span className="font-mono">config.sweep_values</span>.
          Open the parent card and re-create the sweep.
        </p>
      </StagePanel>
    );
  }

  const completed = sortedRuns.filter(
    (r) => r.status === 'completed' || r.status === 'succeeded',
  ).length;
  const failed = sortedRuns.filter((r) => r.status === 'failed').length;
  const tone =
    failed > 0
      ? 'danger'
      : completed === values.length
        ? 'success'
        : sortedRuns.length === 0
          ? 'neutral'
          : 'warning';
  const label =
    failed > 0
      ? 'PARTIAL'
      : completed === values.length
        ? 'COMPLETE'
        : sortedRuns.length === 0
          ? 'PENDING'
          : 'RUNNING';

  return (
    <StagePanel number={5} title="Read" status={label} statusTone={tone}>
      <div className="flex items-center gap-[20px] rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px]">
        <span className="font-mono text-[11px] uppercase tracking-wide text-[#554433]/70">
          {values.length} samples · {paramKey}
        </span>
        <span className="font-mono text-[11px] text-[#554433]/70">
          {completed} done · {failed} failed · {Math.max(0, values.length - completed - failed)} pending
        </span>
        {cfg.parent_card_id ? (
          <Link
            to={`/cards/${cfg.parent_card_id}`}
            className="ml-auto font-sans text-[11px] text-[#1976d2] hover:underline"
          >
            ← parent card
          </Link>
        ) : null}
      </div>
      <div className="flex flex-col gap-[6px]">
        {values.map((v, i) => {
          const run = sortedRuns[i];
          return (
            <SweepSampleRow
              key={`${i}-${String(v)}`}
              paramKey={paramKey}
              paramValue={v as number | string}
              runStatus={run?.status}
              runId={run?.run_id}
            />
          );
        })}
      </div>
      {sortedRuns.length === 0 ? (
        <p className="font-sans text-[12px] text-[#554433]/70">
          No runs yet. Click <span className="font-mono text-[#c14110]">Run Card</span> in the
          top bar — the kernel fans out one run per sample value.
        </p>
      ) : null}
    </StagePanel>
  );
}

// ─── Stage 5 — Comparison variant ──────────────────────────────────────────

interface ComparisonConfig {
  card_ids?: string[];
}

function readComparisonConfig(card: Card): ComparisonConfig {
  const cfg = (card.config ?? {}) as Record<string, unknown>;
  if (Array.isArray(cfg.card_ids) && cfg.card_ids.every((x) => typeof x === 'string')) {
    return { card_ids: cfg.card_ids as string[] };
  }
  return {};
}

function useSourceArtifacts(sourceCardId: string | undefined): {
  artifacts: RunArtifact[];
  latestRunId: string | null;
} {
  const enabled = !!sourceCardId;
  const { data: runs } = useQuery({
    queryKey: enabled
      ? ([...cardKeys.detail(sourceCardId!), 'runs'] as const)
      : (['cards', 'runs', 'noop'] as const),
    queryFn: () => listCardRuns(sourceCardId!),
    enabled,
    staleTime: 5_000,
  });
  const latestRunId = useMemo(() => pickLatestRunId(runs), [runs]);
  const { data: artifacts } = useRunArtifacts(latestRunId);
  return { artifacts: artifacts ?? [], latestRunId };
}

function pairByNameThenIndex(
  left: RunArtifact[],
  right: RunArtifact[],
): Array<{ left: RunArtifact | undefined; right: RunArtifact | undefined; name: string }> {
  if (left.length === 0 && right.length === 0) return [];
  // Pair artifacts that share a name across sides.
  const rightByName = new Map<string, RunArtifact>();
  for (const r of right) {
    if (r.name) rightByName.set(r.name, r);
  }
  const used = new Set<string>();
  const pairs: ReturnType<typeof pairByNameThenIndex> = [];
  for (const l of left) {
    if (l.name && rightByName.has(l.name)) {
      const r = rightByName.get(l.name)!;
      pairs.push({ left: l, right: r, name: l.name });
      used.add(r.id);
    } else {
      pairs.push({ left: l, right: undefined, name: l.name ?? l.id });
    }
  }
  for (const r of right) {
    if (used.has(r.id)) continue;
    pairs.push({ left: undefined, right: r, name: r.name ?? r.id });
  }
  return pairs;
}

function ComparisonReadStage({ card }: { card: Card }) {
  const cfg = readComparisonConfig(card);
  const ids = cfg.card_ids ?? [];
  const leftId = ids[0];
  const rightId = ids[1];

  const { data: leftCard } = useCard(leftId);
  const { data: rightCard } = useCard(rightId);
  const { data: leftIntent } = useIntent(leftCard?.intent_spec_id);
  const left = useSourceArtifacts(leftId);
  const right = useSourceArtifacts(rightId);

  if (ids.length < 2) {
    return (
      <StagePanel number={5} title="Read" status="INCOMPLETE" statusTone="warning">
        <p className="font-sans text-[13px] text-[#554433]/70">
          This comparison card needs two sibling card ids in{' '}
          <span className="font-mono">config.card_ids</span>. Currently has{' '}
          {ids.length}.
        </p>
      </StagePanel>
    );
  }

  const pairs = pairByNameThenIndex(left.artifacts, right.artifacts);
  const leftLabel = leftCard?.title ?? leftId ?? 'A';
  const rightLabel = rightCard?.title ?? rightId ?? 'B';

  return (
    <StagePanel number={5} title="Read" status="COMPARING" statusTone="neutral">
      <div className="flex items-center gap-[16px] rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px]">
        <span className="font-mono text-[11px] uppercase tracking-wide text-[#554433]/70">
          {leftLabel}  ⇄  {rightLabel}
        </span>
        <span className="font-mono text-[11px] text-[#554433]/70">
          {pairs.length} artifact pair{pairs.length === 1 ? '' : 's'}
        </span>
        {leftId ? (
          <Link
            to={`/cards/${leftId}`}
            className="ml-auto font-sans text-[11px] text-[#1976d2] hover:underline"
          >
            ← {leftLabel}
          </Link>
        ) : null}
        {rightId ? (
          <Link
            to={`/cards/${rightId}`}
            className="font-sans text-[11px] text-[#1976d2] hover:underline"
          >
            {rightLabel} →
          </Link>
        ) : null}
      </div>
      {pairs.length === 0 ? (
        <p className="py-[16px] text-center font-sans text-[13px] text-[#554433]/70">
          Neither source card has any artifacts yet. Run them first.
        </p>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {pairs.map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex flex-col gap-[6px]">
              <span className="font-mono text-[11px] uppercase tracking-wide text-[#554433]/70">
                {p.name}
              </span>
              <SplitRenderer
                leftLabel={leftLabel}
                rightLabel={rightLabel}
                leftArtifact={p.left}
                rightArtifact={p.right}
                intent={leftIntent}
              />
            </div>
          ))}
        </div>
      )}
      <p className="font-sans text-[11px] text-[#554433]/55">
        Axis-locked camera + shared color scale ships with the vtk.js renderers in
        Plan B; CSV / metric / image pairs already render meaningfully without it.
      </p>
    </StagePanel>
  );
}

// ─── Page assembly ─────────────────────────────────────────────────────────

export default function CardPhase11Page() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { data: card, isLoading: cardLoading, error: cardError } = useCard(cardId);
  const { data: board, isLoading: boardLoading } = useBoard(card?.board_id);
  const { data: intent } = useIntent(card?.intent_spec_id);
  const { data: plan } = usePlan(card?.id);
  const { data: evidence } = useCardEvidence(card?.id);
  const { data: gates } = useCardGates(card?.id, card?.board_id);
  const rules = useCardModeRules(card, board);
  const updateIntent = useUpdateIntent(intent?.id ?? '', card?.board_id);
  const createSweepCard = useCreateCard(card?.board_id ?? '');
  const editPlanMutation = useEditPlan(card?.id ?? '');

  // Stage 2 input picker state — which input port the user is pinning.
  const [pickerInput, setPickerInput] = useState<IntentInput | null>(null);

  // Wave D — sweep branching drawer state.
  const [sweepOpen, setSweepOpen] = useState(false);
  const [sweepError, setSweepError] = useState<string | null>(null);

  // Plan C2 — edit-parameters drawer state. Holds the node_id being edited.
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const editingNode = useMemo(() => {
    if (!editingNodeId || !plan) return null;
    return plan.nodes.find((n) => n.node_id === editingNodeId) ?? null;
  }, [editingNodeId, plan]);

  // Wave D — Card chat drawer + optional pre-filled draft (e.g. from a
  // "diagnose this failure" button on Stage 4).
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState<string>('');

  const openChatWith = (prompt: string) => {
    setChatDraft(prompt);
    setChatOpen(true);
  };

  // Wave B — Tool manifest drawer (Method stage tool-chip click).
  const [inspectingTool, setInspectingTool] = useState<string | null>(null);

  const handleSweepSubmit = async (payload: SweepSubmitPayload) => {
    if (!card) return;
    setSweepError(null);
    try {
      const newCard = await createSweepCard.mutateAsync({
        title: payload.title,
        card_type: 'sweep',
        intent_type: card.intent_type,
        intent_spec_id: card.intent_spec_id,
        config: {
          sweep_param: payload.sweep_param,
          sweep_values: payload.sweep_values,
          parent_card_id: card.id,
        },
      });
      setSweepOpen(false);
      navigate(`/cards/${newCard.id}`);
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ?? 'Could not create sweep card.';
      setSweepError(msg);
    }
  };

  const handleEditParametersSubmit = async (payload: EditParametersSubmitPayload) => {
    setEditError(null);
    try {
      await editPlanMutation.mutateAsync([
        {
          action: 'update_parameters',
          node_id: payload.node_id,
          parameters: payload.parameters,
        },
      ]);
      setEditingNodeId(null);
    } catch (err) {
      setEditError(
        (err as { message?: string })?.message ?? 'Could not save parameter edits.',
      );
    }
  };

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
  const { data: runArtifacts } = useRunArtifacts(latestRunId);

  // Wave C — live NodeRun progress via SSE. Subscribe only when the run
  // is in-flight; on every event invalidate the run detail + artifact
  // queries so React Query refetches immediately instead of waiting for
  // its 3s poll. Card status + run history queries also invalidate so
  // Stage 4 + run-history list flip on terminal events.
  const queryClient = useQueryClient();
  const runInFlight =
    !!latestRunId &&
    (runDetail?.status === 'running' || runDetail?.status === 'waiting');
  const { connected: sseConnected } = useRunSSE(
    runInFlight ? latestRunId : null,
    {
      onEvent: () => {
        if (!latestRunId) return;
        queryClient.invalidateQueries({ queryKey: runKeys.detail(latestRunId) });
        queryClient.invalidateQueries({
          queryKey: [...runKeys.all, 'artifacts', latestRunId] as const,
        });
        queryClient.invalidateQueries({ queryKey: cardKeys.detail(card?.id ?? '') });
      },
    },
  );

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
      <IntentStage intent={intent} onAskAi={openChatWith} />
      <InputsStage
        intent={intent}
        boardId={card.board_id}
        onPinClick={(input) => setPickerInput(input)}
        pinningPort={updateIntent.isPending ? pickerInput?.name ?? null : null}
        onAskAi={openChatWith}
      />
      <MethodStage
        plan={plan}
        intent={intent}
        cardId={card.id}
        latestRunId={latestRunId}
        onAskAi={openChatWith}
        onInspectTool={setInspectingTool}
        onEditNode={
          rules.canChangePipeline
            ? (nodeId) => {
                setEditError(null);
                setEditingNodeId(nodeId);
              }
            : undefined
        }
      />
      <RunStage
        run={minimalRun}
        runs={cardRuns}
        latestRunId={latestRunId}
        onDiagnose={openChatWith}
        onBranchSweep={() => {
          setSweepError(null);
          setSweepOpen(true);
        }}
        canBranchSweep={card.card_type === 'analysis' && !!plan}
        sseConnected={sseConnected}
      />
      {card.card_type === 'sweep' ? (
        <SweepReadStage card={card} runs={cardRuns} />
      ) : card.card_type === 'comparison' ? (
        <ComparisonReadStage card={card} />
      ) : (
        <ReadStage
          evidence={evidence}
          gates={gates}
          boardId={card.board_id}
          cardId={card.id}
          intent={intent}
          canAddEvidence={rules.canAddManualEvidence}
          card={card}
          onAskAi={openChatWith}
          runArtifacts={runArtifacts ?? []}
          latestRunId={latestRunId}
        />
      )}
      <CardActionBar
        card={card}
        intent={intent}
        plan={plan}
        rules={rules}
        onChatClick={() => setChatOpen((v) => !v)}
      />
      <CardChatDrawer
        open={chatOpen}
        card={card}
        intent={intent}
        onClose={() => {
          setChatOpen(false);
          setChatDraft('');
        }}
        initialDraft={chatDraft}
      />
      <ArtifactPickerDrawer
        open={pickerInput !== null}
        boardId={card.board_id}
        portName={pickerInput?.name ?? ''}
        expectedKind={pickerInput?.type}
        onSelect={handlePinSelect}
        onClose={() => setPickerInput(null)}
      />
      <ToolManifestDrawer
        open={inspectingTool !== null}
        toolId={inspectingTool}
        onClose={() => setInspectingTool(null)}
      />
      <EditParametersDrawer
        open={editingNodeId !== null}
        node={editingNode}
        submitting={editPlanMutation.isPending}
        errorMessage={editError}
        onSubmit={handleEditParametersSubmit}
        onClose={() => {
          setEditingNodeId(null);
          setEditError(null);
        }}
      />
      <BranchSweepDrawer
        open={sweepOpen}
        parentCard={card}
        plan={plan}
        submitting={createSweepCard.isPending}
        errorMessage={sweepError}
        onSubmit={handleSweepSubmit}
        onClose={() => {
          setSweepOpen(false);
          setSweepError(null);
        }}
      />
    </CardDetailLayout>
  );
}
