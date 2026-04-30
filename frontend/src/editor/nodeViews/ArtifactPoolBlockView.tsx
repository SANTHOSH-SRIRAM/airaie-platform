import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Loader2, AlertCircle, Package } from 'lucide-react';
import { useArtifactList } from '@hooks/useArtifacts';
import { useBoardCanvasContext } from '@/editor/boardCanvasContext';
import { useBoardModeRules } from '@hooks/useBoardModeRules';
import { BlockLockChrome } from '@components/cards/primitives';

// ---------------------------------------------------------------------------
// ArtifactPoolBlockView — Wave 10-05c NodeView for the `artifactPoolBlock`
// Tiptap node. Read-only board-level grid of all artifacts in the board's
// pool. Each row shows name + type pill + size. Renderer-registry preview
// is intentionally NOT mounted here — that's per-result and the pool is a
// breadth view; click-through to a single artifact preview is a future-wave
// concern (a 10-05d enhancement, perhaps).
// ---------------------------------------------------------------------------

/** Pure helper — humanize byte size. Exported for unit testing. */
export function formatBytes(n: number | undefined): string {
  if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function ArtifactPoolBlockViewImpl(_props: NodeViewProps) {
  const ctx = useBoardCanvasContext();
  const { data: artifacts, isLoading, error } = useArtifactList(ctx.boardId ?? undefined);
  const modeRules = useBoardModeRules(ctx.board ?? undefined);
  const locked = !modeRules.canEditBlocks;

  if (!ctx.boardId) {
    return (
      <NodeViewWrapper
        data-block-type="artifactPoolBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <Package size={14} className="text-[#acacac]" aria-hidden="true" />
          <span className="font-semibold">Artifact Pool</span>
          <span className="text-[#acacac]">— no board context</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (isLoading) {
    return (
      <NodeViewWrapper
        data-block-type="artifactPoolBlock"
        className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="status">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          Loading artifacts…
        </div>
      </NodeViewWrapper>
    );
  }

  if (error) {
    return (
      <NodeViewWrapper
        data-block-type="artifactPoolBlock"
        className="my-[8px] rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] p-[12px]"
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span>Could not load artifacts for this board.</span>
        </div>
      </NodeViewWrapper>
    );
  }

  const list = artifacts ?? [];

  return (
    <NodeViewWrapper
      data-block-type="artifactPoolBlock"
      className="my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]"
      contentEditable={false}
    >
      <BlockLockChrome locked={locked} reason={modeRules.lockReason}>
        <div className="flex items-center gap-[8px]">
          <Package size={14} className="text-[#1976d2] shrink-0" aria-hidden="true" />
          <span className="text-[12px] font-semibold text-[#1a1a1a]">Artifact Pool</span>
          <span className="ml-auto text-[10px] text-[#6b6b6b]">{list.length} artifact{list.length === 1 ? '' : 's'}</span>
        </div>
        {list.length === 0 ? (
          <div className="text-[11px] text-[#acacac] mt-[8px]">No artifacts pinned to this board yet.</div>
        ) : (
          <ul className="mt-[8px] divide-y divide-[#f0f0ec] border-t border-[#f0f0ec]">
            {list.map((a) => (
              <li key={a.id} className="py-[6px] flex items-center gap-[8px] text-[12px] text-[#1a1a1a]">
                <span className="font-medium truncate">{a.name || a.id}</span>
                <span className="text-[10px] uppercase tracking-wide text-[#6b6b6b] bg-[#f7f7f4] px-[5px] py-[1px] rounded-[3px]">
                  {a.type}
                </span>
                <span className="ml-auto text-[10px] text-[#acacac] tabular-nums">
                  {formatBytes(a.size_bytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BlockLockChrome>
    </NodeViewWrapper>
  );
}

export const ArtifactPoolBlockView = memo(ArtifactPoolBlockViewImpl);
export default ArtifactPoolBlockView;
