import { Download, FileQuestion } from 'lucide-react';
import { formatBytes } from '@utils/format';
import type { RendererProps } from './types';

// ---------------------------------------------------------------------------
// GenericArtifactRenderer — the always-last fallback. Mounts when no
// kind-specific renderer exists for the artifact_kind, so users still get
// a meaningful row (name + kind + size + hash + Download button).
//
// This replaces the bullet list pattern that was inline in CardStatusPanel
// before Phase 2a. Pure layout — no fetch.
// ---------------------------------------------------------------------------

const HASH_PREFIX_LEN = 12;

function formatHash(hash: string | undefined): string {
  if (!hash) return '—';
  // Kernel emits hashes prefixed with the algorithm, e.g. 'sha256:abcdef...'.
  // Trim the prefix for display, keep the leading digits.
  const colon = hash.indexOf(':');
  const digest = colon >= 0 ? hash.slice(colon + 1) : hash;
  if (digest.length <= HASH_PREFIX_LEN) return digest;
  return `${digest.slice(0, HASH_PREFIX_LEN)}…`;
}

export default function GenericArtifactRenderer({ artifact, downloadUrl }: RendererProps) {
  const name = artifact.name ?? artifact.id;
  const kind = artifact.type;

  return (
    <div className="rounded-[8px] border border-[#e8e8e8] bg-white px-[12px] py-[10px] flex items-center gap-[12px]">
      <FileQuestion size={20} className="text-[#acacac] shrink-0" aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-[8px]">
          <span className="text-[12px] font-medium text-[#1a1a1a] truncate">{name}</span>
          <span
            className="text-[10px] font-mono uppercase tracking-[0.5px] text-[#6b6b6b] bg-[#f5f5f3] px-[6px] py-[1px] rounded-[4px] shrink-0"
            aria-label={`File type ${kind}`}
          >
            {kind}
          </span>
        </div>
        <div className="text-[10px] text-[#6b6b6b] mt-[2px] flex items-center gap-[8px]">
          <span className="tabular-nums">{formatBytes(artifact.size_bytes ?? 0)}</span>
          <span className="text-[#dcdcdc]">·</span>
          <span className="font-mono tabular-nums" title={artifact.content_hash}>
            {formatHash(artifact.content_hash)}
          </span>
        </div>
        <div className="text-[10px] text-[#acacac] mt-[2px] italic">
          No inline preview for this format. Renderer for{' '}
          <span className="font-mono not-italic">{kind}</span> not yet implemented.
        </div>
      </div>

      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-[4px] h-[28px] px-[10px] rounded-[6px] bg-[#1a1a1a] text-white text-[11px] font-medium hover:bg-[#2d2d2d] transition-colors shrink-0"
      >
        <Download size={11} />
        Download
      </a>
    </div>
  );
}
