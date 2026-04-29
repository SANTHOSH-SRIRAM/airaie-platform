import { memo, useEffect, useMemo, useState } from 'react';
import { useArtifactList } from '@hooks/useArtifacts';
import type { BoardArtifact } from '@api/artifacts';
import { StatusBadge } from './primitives';

// ---------------------------------------------------------------------------
// ArtifactPickerDrawer — right-rail drawer that lists the Board's artifact
// pool and lets the user pick one to pin to a Card input port.
//
// Wave A interactive layer over Stage 2 (Inputs). The Card detail page
// passes the board id, the input port name, and an optional kind filter
// (when the IntentInput declares a `type`). On select the parent runs the
// PATCH-intent mutation; this component is presentational.
//
// Tailwind only — no Headless UI. Click-outside + ESC close handled inline.
// ---------------------------------------------------------------------------

interface ArtifactPickerDrawerProps {
  open: boolean;
  boardId: string | undefined;
  /** Port name the user is pinning to. Shown in the header for context. */
  portName: string;
  /** Optional artifact kind / type the port expects. When set, the list is
   *  filtered to artifacts with matching `.type`. Comparison is
   *  case-insensitive; an empty string disables the filter. */
  expectedKind?: string;
  /** Called with the artifact ID when the user picks one. The drawer does
   *  NOT close itself — the parent decides (typically: close after the
   *  PATCH mutation succeeds). */
  onSelect: (artifactId: string) => void;
  onClose: () => void;
}

function formatBytes(n: number | undefined): string {
  if (!n || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function ArtifactRow({
  artifact,
  onSelect,
}: {
  artifact: BoardArtifact;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-[6px] rounded-[10px] bg-[#f5f5f0] px-[14px] py-[12px] text-left transition-colors hover:bg-[#ebebe6]"
    >
      <div className="flex items-center justify-between gap-[8px]">
        <span className="truncate font-sans text-[13px] font-medium text-[#1a1c19]">
          {artifact.name || artifact.id}
        </span>
        <StatusBadge tone="warning">{artifact.type}</StatusBadge>
      </div>
      <div className="flex items-center gap-[10px] font-mono text-[11px] text-[#554433]/70">
        <span>{artifact.id.length > 18 ? `${artifact.id.slice(0, 18)}…` : artifact.id}</span>
        <span>·</span>
        <span>{formatBytes(artifact.size_bytes)}</span>
      </div>
    </button>
  );
}

function ArtifactPickerDrawerImpl({
  open,
  boardId,
  portName,
  expectedKind,
  onSelect,
  onClose,
}: ArtifactPickerDrawerProps) {
  const { data: artifacts, isLoading, error } = useArtifactList(boardId);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const all = artifacts ?? [];
    const kind = expectedKind?.trim().toLowerCase();
    const q = search.trim().toLowerCase();
    return all.filter((a) => {
      if (kind && a.type.toLowerCase() !== kind) return false;
      if (q && !(a.name?.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [artifacts, expectedKind, search]);

  if (!open) return null;

  return (
    <>
      {/* scrim — click to close, transparent so the page stays visible */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* drawer */}
      <aside
        role="dialog"
        aria-label={`Pin artifact to ${portName}`}
        className="fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-[12px] border-b border-[#ebebe6] px-[24px] py-[20px]">
          <div className="flex flex-col gap-[4px]">
            <span className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
              Pin artifact
            </span>
            <h2 className="font-sans text-[18px] font-medium text-[#1a1c19]">
              → <span className="font-mono text-[#8b5000]">{portName}</span>
            </h2>
            {expectedKind ? (
              <span className="font-mono text-[11px] text-[#554433]/70">
                expects: {expectedKind}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-[6px] -mt-[4px] rounded-[8px] p-[6px] font-mono text-[14px] text-[#554433]/60 hover:bg-[#f5f5f0]"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="px-[24px] pb-[12px] pt-[16px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or id…"
            className="w-full rounded-[10px] bg-[#f5f5f0] px-[14px] py-[10px] font-sans text-[13px] text-[#1a1c19] placeholder:text-[#554433]/45 focus:outline-none focus:ring-2 focus:ring-[#ff9800]/30"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-[24px] pb-[24px]">
          {isLoading ? (
            <p className="py-[24px] text-center font-sans text-[13px] text-[#554433]/70">
              Loading artifact pool…
            </p>
          ) : error ? (
            <p className="py-[24px] text-center font-sans text-[13px] text-[#cc3326]">
              Couldn't load artifacts: {error instanceof Error ? error.message : 'unknown error'}
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-[24px] text-center font-sans text-[13px] text-[#554433]/70">
              {expectedKind
                ? `No ${expectedKind} artifacts in this board's pool yet.`
                : 'No artifacts in this board\'s pool yet.'}
              <br />
              <span className="text-[11px]">
                Upload via the Artifacts page or generate from a previous run.
              </span>
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {filtered.map((a) => (
                <ArtifactRow key={a.id} artifact={a} onSelect={() => onSelect(a.id)} />
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-[#ebebe6] px-[24px] py-[12px] font-sans text-[11px] text-[#554433]/60">
          {filtered.length} of {artifacts?.length ?? 0} shown · ESC to close
        </footer>
      </aside>
    </>
  );
}

export const ArtifactPickerDrawer = memo(ArtifactPickerDrawerImpl);
export default ArtifactPickerDrawer;
