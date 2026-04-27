import { memo, Suspense } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, BarChart2 } from 'lucide-react';
import { useArtifact, useArtifactDownloadUrl } from '@hooks/useArtifacts';
import { useIntent } from '@hooks/useIntents';
import { pickRenderer } from '@/renderers/registry';
import { boardArtifactToRunArtifact } from './ResultBlockView.helpers';
import { useCardCanvasContext } from '@/editor/cardCanvasContext';

// ---------------------------------------------------------------------------
// ResultBlockView — Wave 10-02 NodeView for the `resultBlock` Tiptap node.
//
// Plugs into Phase 9's renderer registry: fetches the bound artifact,
// coerces it to the RunArtifact shape pickRenderer expects, asks for the
// best renderer for (artifact, intent), and mounts that ONE renderer in a
// <Suspense> boundary. Per-block; we do NOT mount the Card-level 12-col
// results layout grid (Phase 9's per-Card composition lives elsewhere).
//
// The Card's intent is read via `useCardCanvasContext()`; when the NodeView
// is rendered outside a CardCanvasProvider (e.g. preview tooling) the
// context falls back to `{ intentSpecId: null }` and pickRenderer is given
// `intent: undefined` — the kind-only / fallback renderer still resolves.
// ---------------------------------------------------------------------------

function ResultBlockViewImpl({ node }: NodeViewProps) {
  const attrs = node.attrs as { artifactId: string | null };
  const { intentSpecId } = useCardCanvasContext();
  const {
    data: artifact,
    isLoading: artifactLoading,
    error: artifactError,
  } = useArtifact(attrs.artifactId ?? undefined);
  const { data: intent } = useIntent(intentSpecId ?? undefined);
  const {
    data: downloadUrl,
    isLoading: urlLoading,
    error: urlError,
  } = useArtifactDownloadUrl(attrs.artifactId ?? undefined);

  const wrapperBase =
    'my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]';

  // Empty.
  if (!attrs.artifactId) {
    return (
      <NodeViewWrapper data-block-type="resultBlock" className={wrapperBase} contentEditable={false}>
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <BarChart2 size={14} className="text-[#1976d2]" aria-hidden="true" />
          <span className="font-semibold">Result</span>
          <span className="text-[#acacac]">— not yet bound</span>
        </div>
      </NodeViewWrapper>
    );
  }

  // Loading (either artifact metadata or download URL still in flight).
  if (artifactLoading || urlLoading) {
    return (
      <NodeViewWrapper data-block-type="resultBlock" className={wrapperBase} contentEditable={false}>
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading result…
        </div>
      </NodeViewWrapper>
    );
  }

  if (artifactError || !artifact) {
    return (
      <NodeViewWrapper
        data-block-type="resultBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>
            Could not load artifact <code className="font-mono">{attrs.artifactId}</code>.
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  const runArtifact = boardArtifactToRunArtifact(artifact);
  const renderer = pickRenderer(runArtifact, intent);

  // Renderer fallback — registry returned null OR no download URL. Show
  // a plain download link.
  if (!renderer || urlError || !downloadUrl) {
    return (
      <NodeViewWrapper data-block-type="resultBlock" className={wrapperBase} contentEditable={false}>
        <div className="flex items-center gap-[8px]">
          <BarChart2 size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
          <span className="text-[12px] font-semibold text-[#1a1a1a]">Result</span>
        </div>
        <div className="text-[12px] text-[#6b6b6b] mt-[6px]">
          {artifact.name ?? artifact.id} · {artifact.type}
        </div>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#1976d2] underline mt-[4px] inline-block"
          >
            Download
          </a>
        ) : null}
      </NodeViewWrapper>
    );
  }

  const RendererComponent = renderer.component;
  return (
    <NodeViewWrapper data-block-type="resultBlock" className={wrapperBase} contentEditable={false}>
      <div className="flex items-center gap-[8px] mb-[8px]">
        <BarChart2 size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">Result</span>
        <span className="ml-auto text-[10px] font-mono text-[#acacac] truncate max-w-[260px]">
          {artifact.name ?? artifact.id}
        </span>
      </div>
      <Suspense
        fallback={
          <div
            className="rounded-[8px] border border-[#e8e8e8] bg-[#fafafa] p-[16px] flex items-center gap-[8px] text-[11px] text-[#6b6b6b]"
            role="status"
          >
            <Loader2 size={14} className="animate-spin text-[#acacac]" />
            Loading renderer…
          </div>
        }
      >
        <RendererComponent
          artifact={runArtifact}
          downloadUrl={downloadUrl}
          intent={intent ?? undefined}
        />
      </Suspense>
    </NodeViewWrapper>
  );
}

export const ResultBlockView = memo(ResultBlockViewImpl);
export default ResultBlockView;
