import { useState } from 'react';
import { FileText } from 'lucide-react';
import { formatBytes } from '@utils/format';
import type { RendererProps } from './types';

// ---------------------------------------------------------------------------
// PdfRenderer — inline preview for PDF artifacts.
//
// MVP scope (Phase 2a, Wave C Pass 1): an `<iframe src={downloadUrl}>` that
// hands rendering off to the browser's built-in PDF viewer. Works in all
// modern Chromium / Firefox / Safari without adding `react-pdf` to the
// bundle. The container caps height at 600px; the iframe's own controls
// (zoom, page nav) handle full-document interaction.
//
// Falls back to a metadata + download link card when the iframe fails to
// load (rare — typically only when CSP forbids iframing the MinIO origin).
// Once we land Phase 2c heavyweight viewers, swap to `react-pdf` if zoom /
// page-pin / annotation features become needed.
// ---------------------------------------------------------------------------

export default function PdfRenderer({ artifact, downloadUrl }: RendererProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="flex items-center gap-[12px] rounded-[8px] border border-[#e8e8e8] bg-[#fafafa] p-[16px] text-[12px] text-[#6b6b6b]">
        <FileText size={16} className="text-[#acacac]" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-[#1a1a1a]">
            {artifact.name ?? artifact.id}
          </div>
          <div className="mt-[2px] text-[10px] text-[#acacac]">
            PDF preview blocked. Open directly:{' '}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c14110] hover:underline"
            >
              download
            </a>
          </div>
        </div>
        {artifact.size_bytes ? (
          <span className="font-mono text-[10px] text-[#acacac]">
            {formatBytes(artifact.size_bytes)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#e8e8e8] bg-[#fafafa]">
      <iframe
        src={downloadUrl}
        title={artifact.name ?? artifact.id}
        className="block h-[600px] w-full border-0"
        onError={() => setErrored(true)}
      />
      <div className="flex items-center justify-between border-t border-[#e8e8e8] bg-white px-[12px] py-[6px] text-[11px] text-[#6b6b6b]">
        <span className="truncate">{artifact.name ?? artifact.id}</span>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[#c14110] hover:underline"
        >
          open ↗
        </a>
      </div>
    </div>
  );
}
