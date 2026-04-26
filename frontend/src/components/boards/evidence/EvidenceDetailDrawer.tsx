import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { GateEvidence } from '@api/gates';
import { reextractEvidence, REEXTRACT_AVAILABLE } from '@api/gates';
import { formatRelativeTime } from '@utils/format';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// EvidenceDetailDrawer (D4)
//
// Side-drawer showing a single evidence record with links to its source run
// and source artifact. Re-extract button is hidden when the backend
// endpoint isn't available (current state — see api/gates.ts).
// ---------------------------------------------------------------------------

interface Props {
  evidence: GateEvidence;
  onClose: () => void;
}

export default function EvidenceDetailDrawer({ evidence, onClose }: Props) {
  const [reextractError, setReextractError] = useState<string | null>(null);
  const [reextractPending, setReextractPending] = useState(false);

  const handleReextract = async () => {
    setReextractError(null);
    setReextractPending(true);
    try {
      await reextractEvidence(evidence.card_id);
    } catch (err) {
      setReextractError((err as Error).message);
    } finally {
      setReextractPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-[420px] max-w-full h-full bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[20px] py-[16px] border-b border-[#e8e8e8]">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
              Evidence
            </span>
            <span className="text-[14px] font-mono font-semibold text-[#1a1a1a] truncate max-w-[340px]">
              {evidence.metric_name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-[28px] w-[28px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f0f0ec]"
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[20px] py-[16px] flex flex-col gap-[16px]">
          {/* Status */}
          <StatusBlock ev={evidence} />

          {/* Metric block */}
          <Section title="Metric">
            <KV label="Name" value={<span className="font-mono">{evidence.metric_name}</span>} />
            <KV label="Value" value={<span className="font-mono">{String(evidence.metric_value)}</span>} />
            {evidence.unit && <KV label="Unit" value={evidence.unit} />}
            {evidence.threshold !== undefined && evidence.threshold !== null && (
              <KV
                label="Threshold"
                value={
                  <span className="font-mono">
                    {evidence.operator ? `${evidence.operator} ` : ''}
                    {String(evidence.threshold)}
                  </span>
                }
              />
            )}
          </Section>

          {/* Source */}
          <Section title="Source">
            {evidence.source_run_id ? (
              <KV
                label="Run"
                value={
                  <Link
                    to={`/workflow-runs/${evidence.source_run_id}`}
                    className="text-[#2196f3] font-mono text-[11px] inline-flex items-center gap-[4px] hover:underline"
                    onClick={onClose}
                  >
                    {evidence.source_run_id}
                    <ExternalLink size={10} />
                  </Link>
                }
              />
            ) : (
              <KV label="Run" value={<span className="text-[#acacac]">Manual entry</span>} />
            )}

            {evidence.source_artifact_id ? (
              <KV
                label="Artifact"
                value={
                  <Link
                    to={`/artifacts/${evidence.source_artifact_id}`}
                    className="text-[#2196f3] font-mono text-[11px] inline-flex items-center gap-[4px] hover:underline"
                    onClick={onClose}
                  >
                    {evidence.source_artifact_id}
                    <ExternalLink size={10} />
                  </Link>
                }
              />
            ) : (
              <KV label="Artifact" value={<span className="text-[#acacac]">-</span>} />
            )}

            <KV
              label="Card"
              value={<span className="font-mono text-[11px]">{evidence.card_id}</span>}
            />
            <KV
              label="Extracted"
              value={
                <span title={evidence.extracted_at}>
                  {formatRelativeTime(evidence.extracted_at)}
                </span>
              }
            />
          </Section>

          {/* Rationale */}
          {evidence.rationale && (
            <Section title="Rationale">
              <p className="text-[12px] text-[#1a1a1a] leading-[1.5] whitespace-pre-wrap">
                {evidence.rationale}
              </p>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-[20px] py-[12px] border-t border-[#e8e8e8] flex items-center justify-between">
          <span className="text-[10px] text-[#acacac] font-mono truncate">{evidence.id}</span>
          {REEXTRACT_AVAILABLE && (
            <button
              type="button"
              onClick={handleReextract}
              disabled={reextractPending}
              className={cn(
                'h-[30px] px-[12px] rounded-[6px] text-[11px] font-medium inline-flex items-center gap-[5px] transition-colors',
                reextractPending
                  ? 'bg-[#f0f0ec] text-[#acacac] cursor-not-allowed'
                  : 'bg-[#fff3e0] text-[#ff9800] hover:bg-[#ffe0b2]',
              )}
            >
              {reextractPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Re-extract
            </button>
          )}
        </div>

        {reextractError && (
          <div className="px-[20px] pb-[12px]">
            <span className="text-[11px] text-[#e74c3c]">{reextractError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function StatusBlock({ ev }: { ev: GateEvidence }) {
  if (ev.passed === true) {
    return (
      <div className="rounded-[8px] bg-[#e8f5e9] border border-[#c8e6c9] px-[14px] py-[10px] flex items-center gap-[8px]">
        <CheckCircle2 size={16} className="text-[#4caf50]" />
        <span className="text-[12px] font-semibold text-[#2e7d32]">Passing</span>
      </div>
    );
  }
  if (ev.passed === false) {
    return (
      <div className="rounded-[8px] bg-[#ffebee] border border-[#ffcdd2] px-[14px] py-[10px] flex items-center gap-[8px]">
        <XCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] font-semibold text-[#c62828]">Failing</span>
      </div>
    );
  }
  return (
    <div className="rounded-[8px] bg-[#fff3e0] border border-[#ffe0b2] px-[14px] py-[10px] flex items-center gap-[8px]">
      <AlertTriangle size={16} className="text-[#ff9800]" />
      <span className="text-[12px] font-semibold text-[#ef6c00]">
        Pending — no evaluation recorded
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
        {title}
      </span>
      <div className="flex flex-col gap-[6px]">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-[8px] items-center">
      <span className="text-[10px] text-[#acacac] uppercase tracking-[0.5px]">{label}</span>
      <span className="text-[12px] text-[#1a1a1a]">{value}</span>
    </div>
  );
}
