import { Suspense } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useArtifactDownloadUrl } from '@hooks/useArtifacts';
import { pickRenderer, registry } from './registry';
import { getLayoutForIntent } from './results-layouts';
import type { Renderer } from './types';
import type { ResultsSlot } from './results-layouts';
import type { RunArtifact } from '@api/runs';
import type { IntentSpec } from '@/types/intent';

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

export default function ResultsSection({ runArtifacts, intent }: ResultsSectionProps) {
  if (runArtifacts.length === 0) {
    return (
      <p className="text-[11px] text-[#acacac]" role="status">
        No artifacts produced.
      </p>
    );
  }

  const layout = getLayoutForIntent(intent?.intent_type);

  if (layout) {
    return (
      <div className="grid grid-cols-12 gap-[16px]" aria-label="Results">
        {layout.slots.map((slot, i) => (
          <SlotMount
            key={i}
            slot={slot}
            allArtifacts={runArtifacts}
            intent={intent}
          />
        ))}
      </div>
    );
  }

  // Auto-pick mode — stack each artifact at full width.
  return (
    <div className="grid grid-cols-12 gap-[16px]" aria-label="Results">
      {runArtifacts.map((artifact) => (
        <div key={artifact.id} className={COL_SPAN_CLASS[12]}>
          <AutoPickSlot artifact={artifact} intent={intent} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotMount — finds the first artifact matching `slot.match`, then either
// shows fallbackText or mounts the slot's renderer.
// ---------------------------------------------------------------------------

function SlotMount({
  slot,
  allArtifacts,
  intent,
}: {
  slot: ResultsSlot;
  allArtifacts: RunArtifact[];
  intent: IntentSpec | undefined;
}) {
  const artifact = allArtifacts.find(slot.match);

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

  // Pick the renderer: explicit override beats the heuristic.
  const renderer = slot.rendererId
    ? findRendererById(slot.rendererId) ?? pickRenderer(artifact, intent)
    : pickRenderer(artifact, intent);

  return (
    <div className={className}>
      <RendererBoundary renderer={renderer} artifact={artifact} intent={intent} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AutoPickSlot — used in auto-pick mode (no layout). Mounts pickRenderer's
// answer for one artifact at full width.
// ---------------------------------------------------------------------------

function AutoPickSlot({
  artifact,
  intent,
}: {
  artifact: RunArtifact;
  intent: IntentSpec | undefined;
}) {
  const renderer = pickRenderer(artifact, intent);
  return <RendererBoundary renderer={renderer} artifact={artifact} intent={intent} />;
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
}: {
  renderer: Renderer | null;
  artifact: RunArtifact;
  intent: IntentSpec | undefined;
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
      <Component artifact={artifact} downloadUrl={downloadUrl} intent={intent} />
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
