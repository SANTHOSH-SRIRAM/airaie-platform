import { memo, useEffect } from 'react';
import { useToolDetail } from '@hooks/useTools';
import { StatusBadge } from './primitives';
import type { Tool, ToolContractField } from '@/types/tool';

// ---------------------------------------------------------------------------
// ToolManifestDrawer — right-rail drawer that previews a tool's ATP manifest.
//
// Phase 11 Wave B §4.7. The Method stage's tool chain becomes clickable;
// each pill opens this drawer with the tool's id. The drawer fetches via
// useToolDetail (`GET /v0/tools/{id}`) and surfaces the bits a Card author
// cares about before deciding whether to keep, swap, or escalate trust:
//
//   - Name + version + trust level + brief description
//   - Inputs (port_name · kind · required) per ToolContract
//   - Outputs (port_name · kind) per ToolContract
//   - Resource limits (cpu/mem/timeout)
//   - Runtime stats (success rate, avg duration) when available
//
// Tailwind only — same affordance system as ArtifactPickerDrawer (scrim,
// ESC close, click-outside).
// ---------------------------------------------------------------------------

interface ToolManifestDrawerProps {
  open: boolean;
  toolId: string | null;
  onClose: () => void;
}

function FieldList({
  title,
  fields,
}: {
  title: string;
  fields: ToolContractField[] | undefined;
}) {
  if (!fields || fields.length === 0) {
    return (
      <div className="flex flex-col gap-[6px]">
        <span className="font-sans text-[11px] font-medium uppercase tracking-wide text-[#554433]/70">
          {title}
        </span>
        <span className="font-mono text-[11px] text-[#554433]/55">(none declared)</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="font-sans text-[11px] font-medium uppercase tracking-wide text-[#554433]/70">
        {title}
      </span>
      <div className="flex flex-col gap-[4px]">
        {fields.map((f, idx) => (
          <div
            key={`${f.name}-${idx}`}
            className="flex items-center justify-between rounded-[8px] bg-[#f5f5f0] px-[12px] py-[8px]"
          >
            <div className="flex items-center gap-[10px]">
              <span className="font-mono text-[11px] font-medium text-[#1a1c19]">
                {f.name}
              </span>
              {f.required ? (
                <span className="font-mono text-[10px] uppercase text-[#cc3326]">required</span>
              ) : null}
            </div>
            <span className="font-mono text-[10px] text-[#8b5000]">{f.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[12px] py-[4px]">
      <span className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
        {label}
      </span>
      <span className="font-mono text-[12px] text-[#1a1c19]">{value}</span>
    </div>
  );
}

function ManifestBody({ tool }: { tool: Tool }) {
  const successRate =
    typeof tool.successRate === 'number'
      ? `${(tool.successRate * 100).toFixed(1)}%`
      : '—';
  const avgDuration =
    typeof tool.avgDurationSeconds === 'number'
      ? tool.avgDurationSeconds < 60
        ? `${Math.round(tool.avgDurationSeconds)}s`
        : `${Math.floor(tool.avgDurationSeconds / 60)}m ${Math.round(tool.avgDurationSeconds % 60)}s`
      : '—';

  return (
    <div className="flex flex-col gap-[20px]">
      {tool.detailDescription || tool.description ? (
        <p className="font-sans text-[13px] leading-[1.55] text-[#554433]">
          {tool.detailDescription || tool.description}
        </p>
      ) : null}

      <FieldList title="Inputs" fields={tool.contract?.inputs} />
      <FieldList title="Outputs" fields={tool.contract?.outputs} />

      <div className="flex flex-col gap-[2px]">
        <span className="font-sans text-[11px] font-medium uppercase tracking-wide text-[#554433]/70">
          Limits
        </span>
        <StatRow
          label="CPU"
          value={tool.limits?.cpu != null ? `${tool.limits.cpu} core${tool.limits.cpu === 1 ? '' : 's'}` : '—'}
        />
        <StatRow
          label="Memory"
          value={tool.limits?.memoryMb != null ? `${tool.limits.memoryMb} MB` : '—'}
        />
        <StatRow
          label="Timeout"
          value={tool.limits?.timeoutSeconds ? `${tool.limits.timeoutSeconds}s` : '—'}
        />
      </div>

      <div className="flex flex-col gap-[2px]">
        <span className="font-sans text-[11px] font-medium uppercase tracking-wide text-[#554433]/70">
          Runtime
        </span>
        <StatRow label="Adapter"      value={tool.adapter ?? '—'} />
        <StatRow label="Network"      value={tool.sandboxNetwork ?? '—'} />
        <StatRow label="Image"        value={tool.image || '—'} />
        <StatRow label="Registry"     value={tool.registry || '—'} />
        <StatRow label="Success rate" value={successRate} />
        <StatRow label="Avg duration" value={avgDuration} />
        <StatRow label="Runs"         value={tool.usageCount?.toLocaleString() ?? '—'} />
      </div>

      {tool.tags && tool.tags.length > 0 ? (
        <div className="flex flex-col gap-[6px]">
          <span className="font-sans text-[11px] font-medium uppercase tracking-wide text-[#554433]/70">
            Tags
          </span>
          <div className="flex flex-wrap gap-[6px]">
            {tool.tags.map((t) => (
              <span
                key={t}
                className="rounded-[4px] bg-[#1a1c19]/[0.06] px-[8px] py-[3px] font-mono text-[10px] text-[#554433]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolManifestDrawerImpl({ open, toolId, onClose }: ToolManifestDrawerProps) {
  const { data: tool, isLoading, error } = useToolDetail(toolId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label="Tool manifest"
        className="fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-[12px] border-b border-[#ebebe6] px-[24px] py-[20px]">
          <div className="flex flex-col gap-[6px]">
            <span className="font-sans text-[11px] uppercase tracking-wide text-[#554433]/70">
              Tool manifest
            </span>
            <h2 className="font-sans text-[18px] font-medium text-[#1a1c19]">
              {tool?.name ?? toolId ?? '—'}
            </h2>
            {tool ? (
              <div className="flex flex-wrap items-center gap-[8px]">
                <span className="font-mono text-[11px] text-[#554433]/70">
                  v{tool.currentVersion}
                </span>
                <StatusBadge tone="warning">{tool.category}</StatusBadge>
                <StatusBadge tone={tool.status === 'published' ? 'success' : 'neutral'}>
                  {tool.status}
                </StatusBadge>
              </div>
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

        <div className="flex-1 overflow-y-auto px-[24px] py-[20px]">
          {isLoading ? (
            <p className="py-[24px] text-center font-sans text-[13px] text-[#554433]/70">
              Loading manifest…
            </p>
          ) : error ? (
            <p className="py-[24px] text-center font-sans text-[13px] text-[#cc3326]">
              Couldn't load tool: {error instanceof Error ? error.message : 'unknown error'}
              <br />
              <span className="font-mono text-[11px] text-[#554433]/55">
                tool id: {toolId}
              </span>
            </p>
          ) : tool ? (
            <ManifestBody tool={tool} />
          ) : (
            <p className="py-[24px] text-center font-sans text-[13px] text-[#554433]/70">
              No tool selected.
            </p>
          )}
        </div>

        <footer className="border-t border-[#ebebe6] px-[24px] py-[12px] font-sans text-[11px] text-[#554433]/60">
          ESC to close · trust level set by AirAIE admin
        </footer>
      </aside>
    </>
  );
}

export const ToolManifestDrawer = memo(ToolManifestDrawerImpl);
export default ToolManifestDrawer;
