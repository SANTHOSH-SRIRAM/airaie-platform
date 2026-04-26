import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@utils/cn';
import { useApproveGate, useRejectGate, useWaiveGate, useGateRequirements } from '@hooks/useGates';
import type { Gate } from '@/types/gate';

// ---------------------------------------------------------------------------
// D5: GateActionDialog
//
// Modal that captures rationale (and, for waive, an expiry date) before
// submitting the corresponding mutation. Renders a current-state summary at
// the top so the approver has the verdict + failed requirements in front of
// them while typing rationale.
// ---------------------------------------------------------------------------

export type GateDialogAction = 'approve' | 'reject' | 'waive';

interface GateActionDialogProps {
  gate: Gate;
  action: GateDialogAction;
  open: boolean;
  onClose: () => void;
  onSuccess?: (action: GateDialogAction) => void;
}

const ACTION_META: Record<
  GateDialogAction,
  {
    title: string;
    accent: string;
    accentBg: string;
    icon: typeof CheckCircle2;
    minRationale: number;
    submitLabel: string;
    submitClass: string;
  }
> = {
  approve: {
    title: 'Approve gate',
    accent: 'text-[#2e7d32]',
    accentBg: 'bg-[#e8f5e9]',
    icon: CheckCircle2,
    minRationale: 10,
    submitLabel: 'Approve',
    submitClass: 'bg-[#2e7d32] hover:bg-[#1b5e20]',
  },
  reject: {
    title: 'Reject gate',
    accent: 'text-[#c62828]',
    accentBg: 'bg-[#ffebee]',
    icon: XCircle,
    minRationale: 20,
    submitLabel: 'Reject',
    submitClass: 'bg-[#c62828] hover:bg-[#b71c1c]',
  },
  waive: {
    title: 'Waive gate',
    accent: 'text-[#ef6c00]',
    accentBg: 'bg-[#fff3e0]',
    icon: ShieldAlert,
    minRationale: 20,
    submitLabel: 'Waive',
    submitClass: 'bg-[#f57c00] hover:bg-[#ef6c00]',
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateInputDefault(): string {
  return isoDate(new Date(Date.now() + 30 * DAY_MS));
}

function maxWaiveDate(): string {
  return isoDate(new Date(Date.now() + 180 * DAY_MS));
}

function todayDate(): string {
  return isoDate(new Date());
}

export default function GateActionDialog({
  gate,
  action,
  open,
  onClose,
  onSuccess,
}: GateActionDialogProps) {
  const meta = ACTION_META[action];
  const Icon = meta.icon;

  const titleId = useId();
  const rationaleId = useId();
  const roleId = useId();
  const expiresId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [rationale, setRationale] = useState('');
  const [role, setRole] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>(() => formatDateInputDefault());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const approve = useApproveGate(gate.id, gate.board_id);
  const reject = useRejectGate(gate.id, gate.board_id);
  const waive = useWaiveGate(gate.id, gate.board_id);

  const mutation =
    action === 'approve' ? approve : action === 'reject' ? reject : waive;

  const { data: requirements } = useGateRequirements(open ? gate.id : undefined);

  const summary = useMemo(() => {
    const list = requirements ?? [];
    const total = list.length;
    const passed = list.filter((r) => r.satisfied).length;
    const failed = list.filter((r) => !r.satisfied).map((r) => r.description);
    return { total, passed, failed };
  }, [requirements]);

  // Reset state whenever the dialog opens or the action changes.
  useEffect(() => {
    if (open) {
      setRationale('');
      setRole('');
      setExpiresAt(formatDateInputDefault());
      setSubmitError(null);
    }
  }, [open, action]);

  // Focus the textarea after open + Esc to close.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 30);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Focus trap: keep Tab inside the dialog.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Lock body scroll while dialog is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const trimmed = rationale.trim();
  const rationaleTooShort = trimmed.length < meta.minRationale;
  const expiresInvalid =
    action === 'waive' && (!expiresAt || expiresAt < todayDate() || expiresAt > maxWaiveDate());

  const submitDisabled = mutation.isPending || rationaleTooShort || expiresInvalid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (submitDisabled) return;

    try {
      if (action === 'approve') {
        await approve.mutateAsync({ rationale: trimmed, role: role.trim() || undefined });
      } else if (action === 'reject') {
        await reject.mutateAsync({ rationale: trimmed, role: role.trim() || undefined });
      } else {
        await waive.mutateAsync({
          rationale: trimmed,
          role: role.trim() || undefined,
          expires_at: expiresAt ? new Date(expiresAt + 'T23:59:59Z').toISOString() : undefined,
        });
      }
      onSuccess?.(action);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setSubmitError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[520px] mx-[16px] bg-white rounded-[10px] shadow-[0px_8px_32px_rgba(0,0,0,0.16)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-[8px] px-[16px] h-[44px] border-b border-[#e8e8e8]">
          <div className={cn('w-[24px] h-[24px] rounded-full inline-flex items-center justify-center', meta.accentBg)}>
            <Icon size={14} className={meta.accent} />
          </div>
          <h2 id={titleId} className="text-[13px] font-semibold text-[#1a1a1a] flex-1">
            {meta.title}: {gate.name}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[12px] px-[16px] py-[14px]">
          {/* Current state summary */}
          <div className={cn('rounded-[8px] p-[10px] flex flex-col gap-[6px]', meta.accentBg)}>
            <div className="flex items-center gap-[6px] text-[10px]">
              <span className="font-semibold uppercase tracking-[0.5px] text-[#6b6b6b]">Status</span>
              <span className={cn('font-semibold', meta.accent)}>{gate.status}</span>
              {summary.total > 0 && (
                <span className="text-[#6b6b6b]">
                  · {summary.passed}/{summary.total} requirements met
                </span>
              )}
            </div>
            {summary.failed.length > 0 && (
              <div className="flex flex-col gap-[2px]">
                <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b]">
                  Failed requirements
                </span>
                <ul className="list-disc pl-[16px] text-[11px] text-[#6b6b6b]">
                  {summary.failed.slice(0, 5).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                  {summary.failed.length > 5 && (
                    <li className="italic">+ {summary.failed.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Rationale */}
          <div className="flex flex-col gap-[4px]">
            <label htmlFor={rationaleId} className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b]">
              Rationale <span className="text-[#c62828]">*</span>
            </label>
            <textarea
              id={rationaleId}
              ref={textareaRef}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              required
              minLength={meta.minRationale}
              placeholder={`Why are you ${meta.submitLabel.toLowerCase()}-ing this gate? (≥ ${meta.minRationale} chars)`}
              className="px-[10px] py-[8px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#1976d2] transition-colors resize-y"
            />
            <div className="flex items-center justify-between text-[10px]">
              <span className={cn(rationaleTooShort ? 'text-[#c62828]' : 'text-[#6b6b6b]')}>
                {rationaleTooShort
                  ? `Need at least ${meta.minRationale - trimmed.length} more character${
                      meta.minRationale - trimmed.length === 1 ? '' : 's'
                    }`
                  : 'OK'}
              </span>
              <span className="text-[#acacac] font-mono">{trimmed.length}</span>
            </div>
          </div>

          {/* Approve: optional role */}
          {action === 'approve' && (
            <div className="flex flex-col gap-[4px]">
              <label htmlFor={roleId} className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b]">
                Approving role <span className="text-[#acacac]">(optional)</span>
              </label>
              <input
                id={roleId}
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. senior_engineer, principal"
                className="h-[32px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#1976d2] transition-colors"
              />
            </div>
          )}

          {/* Waive: expiry */}
          {action === 'waive' && (
            <div className="flex flex-col gap-[4px]">
              <label htmlFor={expiresId} className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b]">
                Waiver expires <span className="text-[#c62828]">*</span>
              </label>
              <input
                id={expiresId}
                type="date"
                value={expiresAt}
                min={todayDate()}
                max={maxWaiveDate()}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
                className="h-[32px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] focus:outline-none focus:border-[#f57c00] transition-colors"
              />
              <span className={cn('text-[10px]', expiresInvalid ? 'text-[#c62828]' : 'text-[#6b6b6b]')}>
                {expiresInvalid
                  ? `Pick a date between today and ${maxWaiveDate()}`
                  : 'Waivers must expire within 180 days.'}
              </span>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-[6px] text-[11px] text-[#c62828] bg-[#ffebee] border border-[#ffcdd2] rounded-[6px] px-[8px] py-[6px]"
            >
              <AlertCircle size={12} className="mt-[2px] shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-[8px] pt-[4px] border-t border-[#e8e8e8] mt-[4px]">
            <button
              type="button"
              onClick={onClose}
              className="h-[32px] px-[12px] rounded-[6px] text-[11px] font-medium text-[#6b6b6b] border border-[#e8e8e8] hover:bg-[#f0f0ec] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className={cn(
                'h-[32px] px-[14px] rounded-[6px] text-[11px] font-semibold text-white inline-flex items-center gap-[6px] transition-colors',
                submitDisabled ? 'bg-[#bdbdbd] cursor-not-allowed' : meta.submitClass,
              )}
            >
              {mutation.isPending && <Loader2 size={12} className="animate-spin" />}
              Confirm {meta.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
