import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { X, ShieldCheck, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@utils/cn';
import {
  TRUST_ORDER,
  TRUST_DESCRIPTIONS,
  isAllowedTrustStep,
  trustIndex,
  trustNeedsRationale,
} from '@utils/trustLevel';
import type { TrustLevel } from '@/types/tool';
import { useUpdateTrustLevel } from '@hooks/useTools';

export interface TrustLevelDialogProps {
  open: boolean;
  onClose: () => void;
  toolId: string;
  version: string;
  currentLevel: TrustLevel;
}

const RATIONALE_MIN = 10;

const LEVEL_PILL: Record<TrustLevel, string> = {
  certified: 'bg-[#e8f5e9] text-[#2e7d32]',
  verified: 'bg-[#e8f5e9] text-[#4caf50]',
  tested: 'bg-[#e3f2fd] text-[#2196f3]',
  community: 'bg-[#fff3e0] text-[#ff9800]',
  untested: 'bg-[#f5f5f0] text-[#acacac]',
};

/**
 * Modal dialog to escalate a tool version's trust level. Mirrors the
 * kernel's strictly-forward rule and additionally enforces a *monotone +1*
 * UI constraint so escalations stay deliberate. Levels below the current
 * one are disabled (no backward), levels more than one step above the
 * current one are disabled (no skipping). Promotions to `verified` /
 * `certified` require a rationale (≥10 chars).
 */
export default function TrustLevelDialog({
  open,
  onClose,
  toolId,
  version,
  currentLevel,
}: TrustLevelDialogProps) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const mutation = useUpdateTrustLevel();

  const [selected, setSelected] = useState<TrustLevel | null>(null);
  const [rationale, setRationale] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset internal state when re-opened.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setRationale('');
      setSubmitted(false);
      setError(null);
      setSuccess(false);
      // Focus the heading for screen readers when the dialog opens.
      window.requestAnimationFrame(() => headingRef.current?.focus());
    }
  }, [open]);

  // Esc closes; basic focus-trap keeps Tab inside the dialog.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const currentIdx = useMemo(() => trustIndex(currentLevel), [currentLevel]);
  const needsRationale = selected ? trustNeedsRationale(selected) : false;
  const rationaleOk = !needsRationale || rationale.trim().length >= RATIONALE_MIN;
  const canSubmit =
    !!selected &&
    isAllowedTrustStep(currentLevel, selected) &&
    rationaleOk &&
    !mutation.isPending;

  if (!open) return null;

  // Guard: unrecognised current level (corrupted version row, schema drift) —
  // the radio list would otherwise disable every option silently.
  if (currentIdx === -1) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6"
        onClick={onClose}
      >
        <div
          className="w-[420px] max-w-[92vw] rounded-[12px] bg-white p-6 shadow-[0px_24px_48px_rgba(0,0,0,0.25)]"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Unknown trust level</h2>
          <p className="mt-3 text-[12px] text-[#6b6b6b]">
            This version reports a trust level (<span className="font-mono">{String(currentLevel)}</span>)
            that is not in the canonical ladder. Refresh the page or contact an admin.
          </p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-[32px] px-3 rounded-[8px] bg-[#f5f5f0] text-[12px] font-medium text-[#1a1a1a] hover:bg-[#ece9e3]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitted(true);
    if (!isAllowedTrustStep(currentLevel, selected)) {
      setError('Selected level is not a valid forward step.');
      return;
    }
    if (!rationaleOk) {
      setError(`A rationale of at least ${RATIONALE_MIN} characters is required for this tier.`);
      return;
    }
    setError(null);
    try {
      await mutation.mutateAsync({
        toolId,
        version,
        trustLevel: selected,
        rationale: rationale.trim() || undefined,
      });
      setSuccess(true);
      // Auto-close shortly so the user sees the confirmation chip first.
      window.setTimeout(() => onClose(), 900);
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ??
        'Failed to update trust level.';
      setError(message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        // Click outside the panel closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-[16px] border border-[#ece9e3] shadow-2xl w-full max-w-[560px] mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[28px] py-[18px] border-b border-[#ece9e3]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#2196f3]" />
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="text-[15px] font-bold text-[#1a1a1a] outline-none"
            >
              Adjust trust for v{version}
            </h2>
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider',
                LEVEL_PILL[currentLevel],
              )}
            >
              current: {currentLevel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f5f5f0] text-[#6b6b6b] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-[28px] py-[20px] flex flex-col gap-4">
          <p className="text-[12px] text-[#6b6b6b]">
            Trust is a one-way ladder. You can advance one tier at a time;
            lower or skipped tiers are disabled.
          </p>

          <fieldset className="flex flex-col gap-2" aria-label="Trust level">
            <legend className="sr-only">Select a new trust level</legend>
            {TRUST_ORDER.map((lvl) => {
              const idx = trustIndex(lvl);
              const isCurrent = lvl === currentLevel;
              const isBackward = idx <= currentIdx;
              const isSkip = idx > currentIdx + 1;
              const disabled = isCurrent || isBackward || isSkip;

              let disabledReason: string | null = null;
              if (isCurrent) disabledReason = 'Current level';
              else if (isBackward) disabledReason = 'Backward steps not allowed';
              else if (isSkip) disabledReason = 'Skipping tiers not allowed';

              const isChecked = selected === lvl;

              return (
                <label
                  key={lvl}
                  className={cn(
                    'flex items-start gap-3 px-3 py-2.5 rounded-[8px] border transition-colors',
                    disabled
                      ? 'border-[#ece9e3] bg-[#fafaf8] opacity-60 cursor-not-allowed'
                      : isChecked
                      ? 'border-[#2196f3] bg-[#e3f2fd]/30 cursor-pointer'
                      : 'border-[#ece9e3] hover:bg-[#fbfaf9] cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    name="trust-level"
                    value={lvl}
                    checked={isChecked}
                    disabled={disabled}
                    onChange={() => {
                      setSelected(lvl);
                      setSubmitted(false);
                      setError(null);
                    }}
                    className="mt-1 accent-[#2196f3]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider',
                          LEVEL_PILL[lvl],
                        )}
                      >
                        {lvl}
                      </span>
                      {disabledReason && (
                        <span className="text-[10px] uppercase tracking-wider text-[#acacac] font-bold">
                          {disabledReason}
                        </span>
                      )}
                      {trustNeedsRationale(lvl) && !disabled && (
                        <span className="text-[10px] uppercase tracking-wider text-[#ff9800] font-bold">
                          rationale required
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6b6b6b] mt-1">
                      {TRUST_DESCRIPTIONS[lvl]}
                    </p>
                  </div>
                </label>
              );
            })}
          </fieldset>

          <div>
            <label
              htmlFor={`${titleId}-rationale`}
              className="text-[11px] font-bold text-[#6b6b6b] uppercase tracking-widest block mb-1.5"
            >
              Rationale {needsRationale ? <span className="text-[#e74c3c]">*</span> : <span className="text-[#acacac] normal-case font-normal">(optional)</span>}
            </label>
            <textarea
              id={`${titleId}-rationale`}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={3}
              placeholder={
                needsRationale
                  ? `Required: at least ${RATIONALE_MIN} characters explaining the promotion.`
                  : 'Optional context for the audit log.'
              }
              className="w-full border border-[#d5d5cf] rounded-[8px] px-3 py-2 text-[13px] text-[#1a1a1a] bg-white focus:border-[#2196f3] outline-none resize-none"
              aria-invalid={submitted && needsRationale && !rationaleOk}
              aria-describedby={`${titleId}-rationale-help`}
            />
            <p
              id={`${titleId}-rationale-help`}
              className={cn(
                'text-[11px] mt-1',
                submitted && needsRationale && !rationaleOk
                  ? 'text-[#e74c3c]'
                  : 'text-[#acacac]',
              )}
            >
              {needsRationale
                ? `${rationale.trim().length}/${RATIONALE_MIN} characters minimum`
                : 'Will be attached to the audit trail when wired by the kernel.'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-[#ffebee] border border-[#e74c3c]/20">
              <AlertTriangle size={14} className="text-[#e74c3c] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#e74c3c]">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-[#e8f5e9] border border-[#4caf50]/20">
              <CheckCircle2 size={14} className="text-[#2e7d32] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#2e7d32]">
                Trust level updated successfully.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-[28px] py-[16px] border-t border-[#ece9e3] bg-[#fafaf8]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 h-9 rounded-[8px] text-[12px] font-bold text-[#6b6b6b] hover:bg-[#f0f0ec]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-9 rounded-[8px] text-[12px] font-bold transition-colors',
              canSubmit
                ? 'bg-[#2196f3] text-white hover:bg-[#1976d2]'
                : 'bg-[#d5d5cf] text-white cursor-not-allowed',
            )}
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Updating…
              </>
            ) : (
              <>
                <ShieldCheck size={12} /> Update trust
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
