import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ShieldAlert, ChevronDown, History, Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';
import { useGateApprovals } from '@hooks/useGates';
import type { GateApproval } from '@/types/gate';

// ---------------------------------------------------------------------------
// D5: GateApprovalHistory
//
// Collapsible audit log of approve/reject/waive events for a gate. Newest
// first. Renders empty state and is safe to mount eagerly — query is enabled
// only when gateId is provided.
// ---------------------------------------------------------------------------

interface GateApprovalHistoryProps {
  gateId: string;
  defaultOpen?: boolean;
  className?: string;
}

const ACTION_CHIP: Record<
  GateApproval['action'],
  { label: string; bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  approve: { label: 'Approved', bg: 'bg-[#e8f5e9]', text: 'text-[#2e7d32]', icon: CheckCircle2 },
  reject: { label: 'Rejected', bg: 'bg-[#ffebee]', text: 'text-[#c62828]', icon: XCircle },
  waive: { label: 'Waived', bg: 'bg-[#fff3e0]', text: 'text-[#ef6c00]', icon: ShieldAlert },
};

function formatDate(s?: string): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return (
      d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return s;
  }
}

export default function GateApprovalHistory({
  gateId,
  defaultOpen = false,
  className,
}: GateApprovalHistoryProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { data, isLoading, error } = useGateApprovals(open ? gateId : undefined);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const ta = new Date(a.created_at ?? a.approved_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? b.approved_at ?? 0).getTime();
      return tb - ta;
    });
  }, [data]);

  return (
    <div className={cn('flex flex-col gap-[6px]', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-[6px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
      >
        <History size={12} />
        Approval history
        {sorted.length > 0 && (
          <span className="h-[16px] px-[6px] rounded-full bg-[#f0f0ec] text-[9px] font-medium text-[#6b6b6b] inline-flex items-center">
            {sorted.length}
          </span>
        )}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="flex flex-col gap-[6px]">
          {isLoading && (
            <div className="flex items-center gap-[6px] text-[10px] text-[#acacac] py-[6px]">
              <Loader2 size={12} className="animate-spin" />
              Loading history...
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="text-[10px] text-[#c62828] bg-[#ffebee] border border-[#ffcdd2] rounded-[6px] px-[8px] py-[6px]"
            >
              {error instanceof Error ? error.message : 'Failed to load approvals'}
            </div>
          )}

          {!isLoading && !error && sorted.length === 0 && (
            <p className="text-[10px] text-[#acacac] italic py-[4px]">No approvals yet.</p>
          )}

          {sorted.map((row) => {
            const cfg = ACTION_CHIP[row.action] ?? ACTION_CHIP.approve;
            const Icon = cfg.icon;
            return (
              <div
                key={row.id}
                className="flex flex-col gap-[4px] rounded-[8px] bg-white border border-[#e8e8e8] px-[10px] py-[8px]"
              >
                <div className="flex items-center gap-[6px] flex-wrap">
                  <span
                    className={cn(
                      'h-[20px] px-[8px] rounded-full text-[9px] font-semibold uppercase inline-flex items-center gap-[4px]',
                      cfg.bg,
                      cfg.text,
                    )}
                  >
                    <Icon size={10} />
                    {cfg.label}
                  </span>
                  <span className="text-[11px] font-medium text-[#1a1a1a]">
                    {row.approved_by ?? 'system'}
                  </span>
                  {row.role && (
                    <span className="h-[18px] px-[6px] rounded-[4px] bg-[#f0f0ec] text-[9px] font-mono text-[#6b6b6b] inline-flex items-center">
                      {row.role}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-[#acacac] font-mono">
                    {formatDate(row.created_at ?? row.approved_at)}
                  </span>
                </div>

                {row.rationale && (
                  <p className="text-[11px] text-[#6b6b6b] whitespace-pre-wrap break-words">
                    {row.rationale}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
