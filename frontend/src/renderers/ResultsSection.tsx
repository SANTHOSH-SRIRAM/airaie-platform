import { Suspense, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useArtifactDownloadUrl } from '@hooks/useArtifacts';
import { useUpdateRunViewState } from '@hooks/useRuns';
import { pickRenderer, registry } from './registry';
import { getLayoutForIntent } from './results-layouts';
import type { BoardMode, Renderer } from './types';
import type { ResultsSlot } from './results-layouts';
import type { RunArtifact } from '@api/runs';
import type { RunViewState } from '@/types/run';
import type { IntentSpec } from '@/types/intent';

// ---------------------------------------------------------------------------
// planResults — pure dispatch helper. Decides whether to render in layout
// mode, auto-pick mode, or empty mode. Exported for vitest unit tests since
// the env=node setup can't render JSX.
//
// The plan's `items` carry pre-resolved (artifact, renderer) tuples so the
// JSX rendering layer is a thin dumb mapper.
// ---------------------------------------------------------------------------

export type ResultsPlan =
  | { kind: 'empty' }
  | {
      kind: 'layout';
      intentType: string;
      items: Array<{
        slot: ResultsSlot;
        artifact: RunArtifact | null;
        renderer: Renderer | null;
      }>;
    }
  | {
      kind: 'auto-pick';
      items: Array<{ artifact: RunArtifact; renderer: Renderer | null }>;
    };

export function planResults(
  runArtifacts: RunArtifact[],
  intent: IntentSpec | undefined,
): ResultsPlan {
  if (runArtifacts.length === 0) {
    return { kind: 'empty' };
  }

  const layout = getLayoutForIntent(intent?.intent_type);

  if (layout) {
    return {
      kind: 'layout',
      intentType: intent!.intent_type,
      items: layout.slots.map((slot) => {
        const artifact = runArtifacts.find(slot.match) ?? null;
        const renderer = artifact
          ? slot.rendererId
            ? findRendererById(slot.rendererId) ?? pickRenderer(artifact, intent)
            : pickRenderer(artifact, intent)
          : null;
        return { slot, artifact, renderer };
      }),
    };
  }

  return {
    kind: 'auto-pick',
    items: runArtifacts.map((artifact) => ({
      artifact,
      renderer: pickRenderer(artifact, intent),
    })),
  };
}

// ---------------------------------------------------------------------------
// ResultsSection — composes the renderer registry + the per-intent layout
// into the Card's "Results" surface. Two modes:
//
//   - **Layout mode**: when `getLayoutForIntent(intent.intent_type)` returns
//     a layout, render a 12-column grid of slots. Each slot picks the
//     first matching artifact (or shows fallbackText if none) and mounts
//     the slot's renderer (rendererId override OR pickRenderer).
//
//   - **Auto-pick mode**: no layout — stack each artifact at col-span-12
//     with `pickRenderer(artifact, intent)`.
//
// Each slot wraps its lazy renderer in <Suspense> with a small skeleton.
// Each slot fetches its own download URL via `useArtifactDownloadUrl()` so
// a single slot's refresh doesn't re-render every sibling.
//
// Empty state: `runArtifacts.length === 0` → "No artifacts produced" copy
// (preserves the line CardStatusPanel previously rendered for completeness).
// ---------------------------------------------------------------------------

interface ResultsSectionProps {
  runArtifacts: RunArtifact[];
  intent: IntentSpec | undefined;
  /**
   * Optional Phase 9 §2F context. When provided, viewers (Cad3DViewer,
   * VtpViewer) hydrate from `viewState` on mount, debounce-persist to
   * the kernel via the runId mutation, and lock the camera in Release
   * mode. Call sites that don't carry this context get the prior
   * Explore-mode behaviour with no persistence (renderer defaults to
   * its own reset-to-bounds).
   */
  runId?: string;
  boardMode?: BoardMode;
  viewState?: import('@/types/run').RunViewState;
}

const COL_SPAN_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  6: 'col-span-6',
  8: 'col-span-8',
  12: 'col-span-12',
};

const HEIGHT_CLASS: Record<string, string> = {
  auto: '',
  compact: 'min-h-[120px]',
  expanded: 'min-h-[400px]',
};

export default function ResultsSection({
  runArtifacts,
  intent,
  runId,
  boardMode,
  viewState,
}: ResultsSectionProps) {
  const plan = planResults(runArtifacts, intent);
  // §2F.1 — one mutation per ResultsSection mount; the bound callback is
  // shared across all renderer slots. When runId is undefined, the callback
  // is a no-op so the renderers still render but don't try to persist.
  const updateMut = useUpdateRunViewState();
  const onViewStateChange = useCallback(
    (vs: RunViewState) => {
      if (!runId) return;
      updateMut.mutate({ runId, viewState: vs });
    },
    [runId, updateMut],
  );

  if (plan.kind === 'empty') {
    return (
      <p className="text-[11px] text-[#acacac]" role="status">
        No artifacts produced.
      </p>
    );
  }

  if (plan.kind === 'layout') {
    return (
      <div className="grid grid-cols-12 gap-[16px]" aria-label="Results">
        {plan.items.map((item, i) => (
          <SlotMount
            key={i}
            slot={item.slot}
            artifact={item.artifact}
            renderer={item.renderer}
            intent={intent}
            boardMode={boardMode}
            viewState={viewState}
            onViewStateChange={runId ? onViewStateChange : undefined}
          />
        ))}
      </div>
    );
  }

  // Auto-pick mode — stack each artifact at full width.
  return (
    <div className="grid grid-cols-12 gap-[16px]" aria-label="Results">
      {plan.items.map((item) => (
        <div key={item.artifact.id} className={COL_SPAN_CLASS[12]}>
          <RendererBoundary
            renderer={item.renderer}
            artifact={item.artifact}
            intent={intent}
            boardMode={boardMode}
            viewState={viewState}
            onViewStateChange={runId ? onViewStateChange : undefined}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotMount — renders one layout slot. The artifact + renderer are
// pre-resolved by `planResults`; this component just handles the visual
// chrome (col-span, height) and the empty-state placeholder.
// ---------------------------------------------------------------------------

function SlotMount({
  slot,
  artifact,
  renderer,
  intent,
  boardMode,
  viewState,
  onViewStateChange,
}: {
  slot: ResultsSlot;
  artifact: RunArtifact | null;
  renderer: Renderer | null;
  intent: IntentSpec | undefined;
  boardMode?: BoardMode;
  viewState?: RunViewState;
  onViewStateChange?: (vs: RunViewState) => void;
}) {
  const className = `${COL_SPAN_CLASS[slot.span] ?? 'col-span-12'} ${
    HEIGHT_CLASS[slot.height ?? 'auto'] ?? ''
  }`;

  if (!artifact) {
    return (
      <div className={className}>
        <SlotPlaceholder text={slot.fallbackText ?? 'No artifact for this slot'} />
      </div>
    );
  }

  return (
    <div className={className}>
      <RendererBoundary
        renderer={renderer}
        artifact={artifact}
        intent={intent}
        boardMode={boardMode}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RendererBoundary — encapsulates the per-artifact download URL fetch +
// the lazy renderer's <Suspense> boundary. Isolating it per artifact means
// one slot's URL refresh doesn't re-render any siblings.
// ---------------------------------------------------------------------------

function RendererBoundary({
  renderer,
  artifact,
  intent,
  boardMode,
  viewState,
  onViewStateChange,
}: {
  renderer: Renderer | null;
  artifact: RunArtifact;
  intent: IntentSpec | undefined;
  boardMode?: BoardMode;
  viewState?: RunViewState;
  onViewStateChange?: (vs: RunViewState) => void;
}) {
  const { data: downloadUrl, isLoading, error } = useArtifactDownloadUrl(artifact.id);

  if (!renderer) {
    return (
      <SlotPlaceholder
        text={`No renderer registered for ${artifact.type}. Add an entry to renderers/registry.ts.`}
      />
    );
  }

  if (isLoading) {
    return <RendererSkeleton label={`Preparing ${artifact.name ?? artifact.id}…`} />;
  }

  if (error || !downloadUrl) {
    return (
      <div
        className="rounded-[8px] border border-[#ffcdd2] bg-[#ffebee] p-[10px] flex items-start gap-[6px] text-[11px] text-[#6b6b6b]"
        role="alert"
      >
        <AlertCircle size={12} className="text-[#e74c3c] shrink-0 mt-[1px]" />
        <span>Could not request download URL for {artifact.name ?? artifact.id}.</span>
      </div>
    );
  }

  const Component = renderer.component;

  return (
    <Suspense fallback={<RendererSkeleton label="Loading renderer…" />}>
      <Component
        artifact={artifact}
        downloadUrl={downloadUrl}
        intent={intent}
        boardMode={boardMode}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
      />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Visual primitives
// ---------------------------------------------------------------------------

function RendererSkeleton({ label }: { label: string }) {
  return (
    <div
      className="rounded-[8px] border border-[#e8e8e8] bg-[#fafafa] p-[16px] h-full flex items-center gap-[8px] text-[11px] text-[#6b6b6b]"
      role="status"
    >
      <Loader2 size={14} className="animate-spin text-[#acacac]" />
      {label}
    </div>
  );
}

function SlotPlaceholder({ text }: { text: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[#e8e8e8] bg-[#fafafa] p-[16px] h-full flex items-center justify-center text-[11px] text-[#acacac] text-center">
      {text}
    </div>
  );
}

function findRendererById(id: string): Renderer | null {
  return registry.find((r) => r.id === id) ?? null;
}
