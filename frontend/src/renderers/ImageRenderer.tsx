import { useState } from 'react';
import { ImageOff, Maximize2 } from 'lucide-react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { formatBytes } from '@utils/format';
import type { RendererProps } from './types';

// ---------------------------------------------------------------------------
// ImageRenderer — inline preview for raster + svg artifacts.
//
// Phase 2b.1 (2026-05-01): wrapped in `<TransformWrapper>` for scroll-wheel
// zoom (1x–8x), drag pan, and double-click step zoom. Pinch-zoom enabled
// for trackpads / touch. A "Reset" overlay calls `resetTransform()` to
// return to fit. The dependency adds ~12 KB gzipped — bundles into the
// page chunk (no Vite manualChunks change needed).
//
// Registered in `./registry.ts` via lazy() so the chunk only loads when
// ResultsSection mounts an Image renderer.
// ---------------------------------------------------------------------------

function ResetButton() {
  const { resetTransform } = useControls();
  return (
    <button
      type="button"
      onClick={() => resetTransform()}
      className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-[#e8e8e8] bg-white/90 px-2 py-1 text-[10px] font-medium text-[#6b6b6b] backdrop-blur-sm transition-colors hover:bg-white hover:text-[#1a1a1a]"
      title="Reset zoom to fit"
      aria-label="Reset zoom"
    >
      <Maximize2 size={11} />
      Reset
    </button>
  );
}

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
      <div className="relative max-h-[600px] overflow-hidden rounded-[8px] border border-[#e8e8e8] bg-white">
        <TransformWrapper
          minScale={1}
          maxScale={8}
          initialScale={1}
          wheel={{ step: 0.2 }}
          doubleClick={{ step: 1.5, mode: 'zoomIn' }}
          pinch={{ disabled: false }}
          panning={{ velocityDisabled: true }}
        >
          <ResetButton />
          <TransformComponent
            wrapperClass="!w-full !max-h-[600px]"
            contentClass="!w-full !flex !items-center !justify-center"
          >
            <img
              src={downloadUrl}
              alt={artifact.name ?? artifact.id}
              onError={() => setErrored(true)}
              className="max-w-full max-h-[600px] object-contain"
              loading="lazy"
              draggable={false}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
      <figcaption className="text-[10px] text-[#6b6b6b] flex items-center gap-[6px]">
        <span className="font-medium text-[#1a1a1a] truncate">{artifact.name ?? artifact.id}</span>
        <span className="text-[#acacac]">·</span>
        <span className="tabular-nums">{formatBytes(artifact.size_bytes ?? 0)}</span>
        <span className="text-[#acacac]">·</span>
        <span className="text-[#acacac]">scroll to zoom · drag to pan</span>
      </figcaption>
    </figure>
  );
}
