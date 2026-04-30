import { memo, Suspense, useMemo, type ReactElement } from 'react';
import { pickRenderer } from '@/renderers';
import { useArtifactDownloadUrl } from '@hooks/useArtifacts';
import type { RunArtifact } from '@api/runs';
import type { IntentSpec } from '@/types/intent';

// ---------------------------------------------------------------------------
// SplitRenderer — wraps two artifacts in a side-by-side grid, each rendered
// via the global renderer registry. Backs the comparison card UX (Phase 11
// Plan C1).
//
// Per `concepts/04-RENDERER-REGISTRY.md` §"Comparison" the eventual API is
// `<SplitRenderer left={…} right={…} axisLocked />` where `axisLocked`
// shares camera + color scale + axis ranges between the children. That
// requires the 3D viewers from Plan B (vtk.js) — they need to forward a
// shared view-state ref. Until then this primitive renders the two
// renderers independently; CSV charts, JSON metrics, and image artifacts
// already compose meaningfully without shared state.
//
// `axisLocked` is accepted but currently no-op; it's wired now so call
// sites don't need to change once Plan B lands.
// ---------------------------------------------------------------------------

interface SplitRendererProps {
  leftLabel: string;
  rightLabel: string;
  leftArtifact: RunArtifact | undefined;
  rightArtifact: RunArtifact | undefined;
  intent?: IntentSpec | undefined;
  /** Reserved for the post-Plan-B 3D path; ignored today. */
  axisLocked?: boolean;
}

function Pane({
  label,
  artifact,
  intent,
}: {
  label: string;
  artifact: RunArtifact | undefined;
  intent?: IntentSpec | undefined;
}) {
  const picked = useMemo(() => {
    if (!artifact) return null;
    return pickRenderer(artifact, intent);
  }, [artifact, intent]);
  const { data: downloadUrl, isLoading, error } = useArtifactDownloadUrl(
    artifact?.id,
  );

  let body: ReactElement;
  if (!artifact) {
    body = (
      <p className="py-[16px] text-center font-sans text-[12px] text-[#554433]/70">
        No matching artifact on this card's latest run.
      </p>
    );
  } else if (!picked) {
    body = (
      <p className="py-[16px] text-center font-sans text-[12px] text-[#cc3326]">
        No renderer matched artifact {artifact.id}.
      </p>
    );
  } else if (isLoading || !downloadUrl) {
    body = (
      <div className="h-[180px] animate-pulse rounded-[8px] bg-[#ebebe6]" />
    );
  } else if (error) {
    body = (
      <p className="py-[16px] text-center font-sans text-[12px] text-[#cc3326]">
        Couldn't load artifact bytes.
      </p>
    );
  } else {
    const Component = picked.component;
    body = (
      <Suspense
        fallback={
          <div className="h-[180px] animate-pulse rounded-[8px] bg-[#ebebe6]" />
        }
      >
        <Component artifact={artifact} downloadUrl={downloadUrl} intent={intent} />
      </Suspense>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-[8px] rounded-[10px] bg-[#f5f5f0] px-[14px] py-[12px]">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="truncate font-sans text-[12px] font-medium text-[#1a1c19]">
          {label}
        </span>
        {artifact ? (
          <span className="font-mono text-[10px] uppercase text-[#554433]/70">
            {artifact.type}
          </span>
        ) : null}
      </div>
      {body}
    </div>
  );
}

function SplitRendererImpl({
  leftLabel,
  rightLabel,
  leftArtifact,
  rightArtifact,
  intent,
}: SplitRendererProps) {
  return (
    <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2">
      <Pane label={leftLabel} artifact={leftArtifact} intent={intent} />
      <Pane label={rightLabel} artifact={rightArtifact} intent={intent} />
    </div>
  );
}

export const SplitRenderer = memo(SplitRendererImpl);
export default SplitRenderer;
