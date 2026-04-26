import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Info, Loader2, Target, X } from 'lucide-react';
import { cn } from '@utils/cn';
import { useIntentTypes, useCreateIntent } from '@hooks/useIntents';
import { useBoard } from '@hooks/useBoards';
import { validateIntentDraft, type IntentDraft } from '@utils/intentValidation';
import IntentSpecForm, { buildIntentSpecPayload } from './IntentSpecForm';
import type { IntentSpec } from '@/types/intent';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IntentSpecModalProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  /** Optional callback fired with the created intent. */
  onCreated?: (intent: IntentSpec) => void;
}

// ---------------------------------------------------------------------------
// Initial draft
// ---------------------------------------------------------------------------

const INITIAL_DRAFT: IntentDraft = {
  name: '',
  description: '',
  intentType: '',
  criteria: [{ name: '', metric: '', operator: 'lte', threshold: '', unit: '' }],
  inputs: [],
};

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntentSpecModal({
  open,
  onClose,
  boardId,
  onCreated,
}: IntentSpecModalProps) {
  const { data: board } = useBoard(boardId);

  // Resolve vertical slug from the board. Defaults to "engineering" if
  // the board record hasn't loaded yet — the dropdown will refresh once
  // it does.
  const verticalSlug = useMemo(() => {
    const v = board?.vertical_id?.toLowerCase();
    if (v === 'engineering' || v === 'science' || v === 'technology' || v === 'mathematics') {
      return v;
    }
    return 'engineering';
  }, [board?.vertical_id]);

  const { data: intentTypes = [], isLoading: intentTypesLoading } =
    useIntentTypes(open ? verticalSlug : undefined);

  const createIntentMut = useCreateIntent(boardId);

  const [draft, setDraft] = useState<IntentDraft>(INITIAL_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [intentTypeOpen, setIntentTypeOpen] = useState(false);

  // Mode-driven criteria requirement. Explore boards tolerate empty
  // criteria; Study/Release require at least one.
  const requireCriteria = (board?.mode ?? 'study') !== 'explore';

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);

  // Reset form whenever the modal opens
  useEffect(() => {
    if (open) {
      setDraft(INITIAL_DRAFT);
      setErrors([]);
      setSubmitError(null);
      setIntentTypeOpen(false);
      document.body.style.overflow = 'hidden';
      // Move focus to the first field on next tick.
      const t = setTimeout(() => firstFocusableRef.current?.focus(), 50);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Esc key closes
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // Focus trap — keep tab navigation inside the dialog while open.
  useEffect(() => {
    if (!open) return;
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  const handleSubmit = async () => {
    setSubmitError(null);
    const validationErrors = validateIntentDraft(draft, { requireCriteria });
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    try {
      const payload = buildIntentSpecPayload(draft);
      const created = await createIntentMut.mutateAsync(payload);
      onCreated?.(created);
      onClose();
    } catch (err) {
      const msg =
        (err as { message?: string } | undefined)?.message ??
        (err instanceof Error ? err.message : 'Failed to create IntentSpec');
      setSubmitError(msg);
    }
  };

  if (!open) return null;

  const isSubmitting = createIntentMut.isPending;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intent-modal-title"
        className="relative flex flex-col w-full max-w-[760px] max-h-[calc(100vh-80px)] bg-white rounded-[16px] shadow-[0px_24px_48px_rgba(0,0,0,0.16)] overflow-hidden"
      >
        {/* ── Header ──────────────────────────────── */}
        <div className="shrink-0 flex flex-col gap-[6px] px-[32px] pt-[28px] pb-[21px] border-b border-[#f0f0ec]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[10px]">
              <Target size={20} className="text-[#ff9800]" />
              <h2
                id="intent-modal-title"
                className="text-[20px] font-semibold text-[#1a1a1a] leading-[22px]"
              >
                New IntentSpec
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-[32px] h-[32px] flex items-center justify-center rounded-full bg-[#fafaf8] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f0f0ec] transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-[13px] font-medium text-[#6b6b6b] leading-[16.9px]">
            Define the goal, acceptance criteria, and inputs for this board.
            {board?.mode === 'explore' && ' Criteria are optional in Explore mode.'}
          </p>
        </div>

        {/* ── Scrollable Body ─────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-[32px] pt-[24px] pb-[24px] flex flex-col gap-[20px]">
          <div>
            <SectionLabel>Intent Specification</SectionLabel>
            <div className="mt-[10px]">
              {/* Wrap the first input with a ref so we can focus on open. */}
              <FocusFirstInput inputRef={firstFocusableRef} />
              <IntentSpecForm
                value={draft}
                onChange={setDraft}
                intentTypes={intentTypes}
                intentTypesLoading={intentTypesLoading}
                requireCriteria={requireCriteria}
                errors={errors}
                disabled={isSubmitting}
                intentTypeDropdownOpen={intentTypeOpen}
                onIntentTypeDropdownToggle={setIntentTypeOpen}
              />
            </div>
          </div>

          {submitError && (
            <div
              role="alert"
              className="rounded-[8px] bg-[#fdecea] border border-[#f5c2c0] px-[12px] py-[10px] text-[12px] text-[#c0392b]"
            >
              {submitError}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between h-[64px] px-[32px] border-t border-[#f0f0ec] bg-white">
          <div className="flex items-center gap-[6px] text-[11px] text-[#acacac]">
            <Info size={12} className="text-[#d0d0d0]" />
            <span>
              IntentSpec will be created in{' '}
              <span className="font-medium text-[#6b6b6b]">draft</span> status — locked on first run.
            </span>
          </div>

          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-[36px] px-[16px] text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                'h-[40px] px-[24px] rounded-[8px] text-white text-[13px] font-semibold flex items-center gap-[8px] transition-colors shadow-sm',
                isSubmitting
                  ? 'bg-[#d0d0d0] cursor-not-allowed'
                  : 'bg-[#ff9800] hover:bg-[#f57c00]',
              )}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Create IntentSpec
              {!isSubmitting && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny helper — renders a hidden input we can grab a ref to so the
// modal can focus the first interactive element on open without having
// to rewire `IntentSpecForm`'s internals.
// ---------------------------------------------------------------------------

function FocusFirstInput({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      tabIndex={-1}
      aria-hidden="true"
      className="sr-only"
      readOnly
    />
  );
}
