import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Play, Pause, Sparkles, Settings2, RotateCcw, MapPin, Loader2 } from 'lucide-react';
import { useCardCanvasContext } from '@/editor/cardCanvasContext';
import { useCardRunState, type CardRunState } from '@hooks/useCardRunState';
import { useFeatureFlagPhase11A } from '@hooks/useFeatureFlags';
import { StagePanel, type StatusBadgeTone } from '@/components/cards/primitives';
import { runStageToButtonLabel } from './RunBlockView.helpers';
import type { Card } from '@/types/card';
import type { IntentSpec } from '@/types/intent';
import type { ExecutionPlan } from '@/types/plan';

// Phase 11 Wave A — display map: CardRunStage -> {label, statusTone}.
// Exhaustive over all 7 `CardRunState['stage']` values; if a new stage is
// added the `Record<...>` type forces a compile error here.
const PHASE11_RUN_DISPLAY: Record<
  CardRunState['stage'],
  { label: string; tone: StatusBadgeTone }
> = {
  'no-intent': { label: 'BLOCKED', tone: 'neutral' },
  'no-inputs': { label: 'BLOCKED', tone: 'neutral' },
  'no-plan':   { label: 'PENDING', tone: 'neutral' },
  'ready':     { label: 'READY',   tone: 'neutral' },
  'running':   { label: 'RUNNING', tone: 'warning' },
  'completed': { label: 'SUCCEEDED', tone: 'success' },
  'failed':    { label: 'FAILED',  tone: 'danger' },
};

// ---------------------------------------------------------------------------
// RunBlockView — Wave 10-03 NodeView for the `runBlock` Tiptap node.
//
// The user-facing inline Run button on the canvas. Houses
// `useCardRunState(card, intent, plan)` so a Run started from this surface
// flips CardActionBar (and vice versa) within one render cycle — both
// surfaces share the same React Query cache for `cardKeys.detail`.
//
// Rules-of-hooks discipline: the outer component branches on whether the
// CardCanvasContext has a Card. If it doesn't, we render a degraded
// chrome WITHOUT calling useCardRunState (the hook requires a Card).
// The "bound" inner component unconditionally calls the hook so the hook
// count stays stable across renders for that branch.
//
// Visual language: matches CardActionBar's variant treatment (label /
// icon / color tone per stage) but renders inline rather than as a fixed
// bottom bar. CardActionBar continues to mount; the two are intentionally
// redundant during this wave.
// ---------------------------------------------------------------------------

const wrapperBase = 'my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]';

function RunBlockViewImpl(_props: NodeViewProps) {
  const { card, intent, plan } = useCardCanvasContext();

  // Degraded — no Card in context. Don't call useCardRunState (it would
  // require a non-null Card). Render a static placeholder.
  if (!card) {
    return (
      <NodeViewWrapper data-block-type="runBlock" className={wrapperBase} contentEditable={false}>
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <Play size={14} className="text-[#1976d2]" aria-hidden="true" />
          <span className="font-semibold">Run</span>
          <span className="text-[#acacac]">— unavailable outside a Card context</span>
        </div>
      </NodeViewWrapper>
    );
  }

  return <RunBlockViewBound card={card} intent={intent} plan={plan} />;
}

interface RunBlockViewBoundProps {
  card: Card;
  intent: IntentSpec | undefined;
  plan: ExecutionPlan | null | undefined;
}

function RunBlockViewBound({ card, intent, plan }: RunBlockViewBoundProps) {
  // Hooks first — must be called unconditionally on every render.
  const phase11 = useFeatureFlagPhase11A();
  const state = useCardRunState(card, intent, plan);
  const label = runStageToButtonLabel(state.stage);

  // Phase 11 Wave A — StagePanel layout. Reuses the per-stage button JSX via
  // `renderPhase11Action`. Legacy switch below stays intact for flag-off.
  if (phase11) {
    const display = PHASE11_RUN_DISPLAY[state.stage];
    return (
      <NodeViewWrapper data-block-type="runBlock" contentEditable={false}>
        <StagePanel number={4} title="Run" status={display.label} statusTone={display.tone}>
          <div className="flex items-center gap-[12px]">
            <span className="font-sans text-[12px] text-[#554433]/70">Stage:</span>
            <span className="font-mono text-[12px] text-[#1a1c19]">{state.stage}</span>
          </div>
          {renderPhase11Action(state, label)}
        </StagePanel>
      </NodeViewWrapper>
    );
  }

  // Each branch renders its own button + secondary chrome. Order matches
  // the `CardRunStage` enum.
  switch (state.stage) {
    case 'no-intent':
      return (
        <NodeViewWrapper data-block-type="runBlock" className={wrapperBase} contentEditable={false}>
          <RunHeader stage={state.stage} />
          <button type="button" disabled className={btnClass('sparkle', true)}>
            <Sparkles size={12} aria-hidden="true" />
            {label}
          </button>
          <p className="mt-[6px] text-[10px] text-[#acacac]">
            Add an Intent block to this Card to unlock the Run flow.
          </p>
        </NodeViewWrapper>
      );

    case 'no-inputs':
      return (
        <NodeViewWrapper data-block-type="runBlock" className={wrapperBase} contentEditable={false}>
          <RunHeader stage={state.stage} />
          <button type="button" className={btnClass('pin', false)}>
            <MapPin size={12} aria-hidden="true" />
            {label}
          </button>
          <p className="mt-[6px] text-[10px] text-[#acacac]">
            Pin at least one artifact as an input before running.
          </p>
        </NodeViewWrapper>
      );

    case 'no-plan':
      return (
        <NodeViewWrapper data-block-type="runBlock" className={wrapperBase} contentEditable={false}>
          <RunHeader stage={state.stage} />
          <button
            type="button"
            className={btnClass('settings', state.isPending)}
            onClick={() => state.generate()}
            disabled={state.isPending}
          >
            {state.isPending ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <Settings2 size={12} aria-hidden="true" />
            )}
            {state.isPending ? 'Generating…' : label}
          </button>
        </NodeViewWrapper>
      );

    case 'ready':
      return (
        <NodeViewWrapper data-block-type="runBlock" className={wrapperBase} contentEditable={false}>
          <RunHeader stage={state.stage} />
          <button
            type="button"
            className={btnClass('primary', state.isPending)}
            onClick={() => state.run()}
            disabled={state.isPending}
          >
            {state.isPending ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <Play size={12} aria-hidden="true" />
            )}
            {state.isPending ? 'Starting…' : label}
          </button>
        </NodeViewWrapper>
      );

    case 'running':
      return (
        <NodeViewWrapper
          data-block-type="runBlock"
          className="my-[8px] rounded-[10px] border border-[#bbdefb] bg-[#e3f2fd] p-[12px]"
          contentEditable={false}
        >
          <RunHeader stage={state.stage} />
          <button
            type="button"
            className={btnClass('cancel', state.isPending)}
            onClick={() => state.cancel()}
            disabled={state.isPending}
          >
            {state.isPending ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <Pause size={12} aria-hidden="true" />
            )}
            {state.isPending ? 'Cancelling…' : label}
          </button>
        </NodeViewWrapper>
      );

    case 'completed':
      return (
        <NodeViewWrapper
          data-block-type="runBlock"
          className="my-[8px] rounded-[10px] border border-[#c8e6c9] bg-[#f1f8e9] p-[12px]"
          contentEditable={false}
        >
          <RunHeader stage={state.stage} />
          <button
            type="button"
            className={btnClass('rerun', state.isPending)}
            onClick={() => state.rerun()}
            disabled={state.isPending}
          >
            {state.isPending ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw size={12} aria-hidden="true" />
            )}
            {state.isPending ? 'Starting…' : label}
          </button>
        </NodeViewWrapper>
      );

    case 'failed':
      return (
        <NodeViewWrapper
          data-block-type="runBlock"
          className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
          contentEditable={false}
        >
          <RunHeader stage={state.stage} />
          <button
            type="button"
            className={btnClass('rerun', state.isPending)}
            onClick={() => state.rerun()}
            disabled={state.isPending}
          >
            {state.isPending ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw size={12} aria-hidden="true" />
            )}
            {state.isPending ? 'Starting…' : label}
          </button>
          <p className="mt-[6px] text-[10px] text-[#c62828]">
            Last run failed. Re-run to retry.
          </p>
        </NodeViewWrapper>
      );
  }
}

/**
 * Phase 11 Wave A — render only the per-stage action button (no surrounding
 * NodeViewWrapper / RunHeader / explanatory paragraph). Mirrors the button
 * JSX from each `case` in the legacy switch so onClick handlers and
 * pending behavior remain identical across both flag-on and flag-off paths.
 */
function renderPhase11Action(state: CardRunState, label: string) {
  switch (state.stage) {
    case 'no-intent':
      return (
        <button type="button" disabled className={btnClass('sparkle', true)}>
          <Sparkles size={12} aria-hidden="true" />
          {label}
        </button>
      );
    case 'no-inputs':
      return (
        <button type="button" className={btnClass('pin', false)}>
          <MapPin size={12} aria-hidden="true" />
          {label}
        </button>
      );
    case 'no-plan':
      return (
        <button
          type="button"
          className={btnClass('settings', state.isPending)}
          onClick={() => state.generate()}
          disabled={state.isPending}
        >
          {state.isPending ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <Settings2 size={12} aria-hidden="true" />
          )}
          {state.isPending ? 'Generating…' : label}
        </button>
      );
    case 'ready':
      return (
        <button
          type="button"
          className={btnClass('primary', state.isPending)}
          onClick={() => state.run()}
          disabled={state.isPending}
        >
          {state.isPending ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <Play size={12} aria-hidden="true" />
          )}
          {state.isPending ? 'Starting…' : label}
        </button>
      );
    case 'running':
      return (
        <button
          type="button"
          className={btnClass('cancel', state.isPending)}
          onClick={() => state.cancel()}
          disabled={state.isPending}
        >
          {state.isPending ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <Pause size={12} aria-hidden="true" />
          )}
          {state.isPending ? 'Cancelling…' : label}
        </button>
      );
    case 'completed':
    case 'failed':
      return (
        <button
          type="button"
          className={btnClass('rerun', state.isPending)}
          onClick={() => state.rerun()}
          disabled={state.isPending}
        >
          {state.isPending ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw size={12} aria-hidden="true" />
          )}
          {state.isPending ? 'Starting…' : label}
        </button>
      );
  }
}

function RunHeader({ stage }: { stage: CardRunState['stage'] }) {
  return (
    <div className="flex items-center gap-[8px] mb-[6px]">
      <Play size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
      <span className="text-[12px] font-semibold text-[#1a1a1a]">Run</span>
      <span className="ml-auto text-[10px] uppercase tracking-wide text-[#6b6b6b]">
        {stage}
      </span>
    </div>
  );
}

type Variant = 'primary' | 'cancel' | 'sparkle' | 'settings' | 'pin' | 'rerun';

function btnClass(v: Variant, pending: boolean): string {
  const base =
    'inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-[6px] text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const tone = (() => {
    switch (v) {
      case 'primary':
      case 'rerun':
        return 'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]';
      case 'cancel':
        return 'bg-[#ffebee] text-[#c62828] hover:bg-[#ffcdd2]';
      case 'sparkle':
        return 'bg-[#f57c00] text-white';
      case 'settings':
        return 'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]';
      case 'pin':
        return 'bg-[#fff3e0] text-[#f57c00] hover:bg-[#ffe0b2]';
    }
  })();
  return [base, tone, pending ? 'opacity-80' : ''].filter(Boolean).join(' ');
}

export const RunBlockView = memo(RunBlockViewImpl);
export default RunBlockView;
