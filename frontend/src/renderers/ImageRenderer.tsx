import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { formatBytes } from '@utils/format';
import type { RendererProps } from './types';

// ---------------------------------------------------------------------------
// ImageRenderer — inline preview for raster + svg artifacts.
//
// MVP scope (Phase 2a): plain `<img src={downloadUrl}>` with a height cap +
// caption underneath. No zoom / pan; that's Phase 2b alongside 3D viewers.
//
// Registered in `./registry.ts` via lazy() so the chunk only loads when
// ResultsSection mounts an Image renderer.
// ---------------------------------------------------------------------------

export default function ImageRenderer({ artifact, downloadUrl }: RendererProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="rounded-[8px] border border-[#e8e8e8] bg-[#fafafa] p-[16px] flex items-center gap-[12px] text-[12px] text-[#6b6b6b]">
        <ImageOff size={16} className="text-[#acacac]" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#1a1a1a] truncate">
            {artifact.name ?? artifact.id}
          </div>
          <div className="text-[10px] text-[#acacac] mt-[2px]">
            Image failed to load. Try the direct link:{' '}
            <a
              href={downloadUrl}
              className="text-[#1976d2] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              open
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <figure className="flex flex-col gap-[6px]">
      <img
        src={downloadUrl}
        alt={artifact.name ?? artifact.id}
        onError={() => setErrored(true)}
        className="max-w-full max-h-[600px] object-contain rounded-[8px] border border-[#e8e8e8] bg-white"
        loading="lazy"
      />
      <figcaption className="text-[10px] text-[#6b6b6b] flex items-center gap-[6px]">
        <span className="font-medium text-[#1a1a1a] truncate">{artifact.name ?? artifact.id}</span>
        <span className="text-[#acacac]">·</span>
        <span className="tabular-nums">{formatBytes(artifact.size_bytes ?? 0)}</span>
      </figcaption>
    </figure>
  );
}

