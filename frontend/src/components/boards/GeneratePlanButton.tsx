/**
 * GeneratePlanButton — pops a tiny chooser (intent spec / card / pipeline)
 * and triggers plan generation.
 *
 * Backend caveat: plan generation is CARD-scoped (not board-scoped), and
 * the kernel reads the IntentSpec from the chosen card's
 * `intent_spec_id`. So even though this component takes an `intentSpecs`
 * list (per the D3 task spec), under the hood it requires a card to
 * generate against. When `cards` is empty the button is disabled with an
 * explanatory tooltip.
 *
 * `pipeline_id` is optional — when omitted the kernel auto-selects a
 * pipeline matching the card's intent_type. We expose it as a free-text
 * field so testers can override (e.g. `pipe_fea_standard`,
 * `pipe_cfd_quick`).
 */

import { useEffect, useRef, useState } from 'react';
import { Workflow, Loader2, ChevronDown, X } from 'lucide-react';
import { cn } from '@utils/cn';
import { useGeneratePlan } from '@hooks/usePlans';
import type { ExecutionPlan } from '@/types/plan';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GeneratePlanButtonProps {
  /**
   * Board id. Currently informational — the backend is card-scoped, but we
   * keep this in the API to mirror the D3 task contract (and so future
   * board-level features have a hook).
   */
  boardId: string;
  /** IntentSpecs the user can choose from. */
  intentSpecs: { id: string; name: string }[];
  /** Cards the user can target. Required for actual generation. */
  cards?: { id: string; name: string; intent_spec_id?: string }[];
  /** Fired with the generated plan after a successful mutation. */
  onPlanGenerated?: (plan: ExecutionPlan) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GeneratePlanButton({
  boardId: _boardId,
  intentSpecs,
  cards,
  onPlanGenerated,
  className,
}: GeneratePlanButtonProps) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [intentSpecId, setIntentSpecId] = useState<string>('');
  const [cardId, setCardId] = useState<string>('');
  const [pipelineId, setPipelineId] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Plan generation hook is keyed by the *currently selected* cardId. We
  // intentionally instantiate a fresh hook on each cardId change rather
  // than threading a parameter through, because react-query's mutation
  // cache keys off the closure. When no card is selected we still need a
  // hook instance so the popover can render — useGeneratePlan('') is safe
  // (the mutation is never invoked).
  const generate = useGeneratePlan(cardId || '__pending__');

  // Default selection: first intent spec, and first card matching it.
  useEffect(() => {
    if (!intentSpecId && intentSpecs.length > 0) {
      setIntentSpecId(intentSpecs[0].id);
    }
  }, [intentSpecs, intentSpecId]);

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    // Prefer a card whose intent_spec_id matches the chosen spec.
    const match = cards.find((c) => c.intent_spec_id === intentSpecId);
    setCardId((prev) => prev || match?.id || cards[0].id);
  }, [cards, intentSpecId]);

  // Click-outside to close the popover.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const noCards = !cards || cards.length === 0;
  const noSpecs = intentSpecs.length === 0;
  const disabled = noCards || noSpecs;

  const handleSubmit = async () => {
    setLocalError(null);
    if (!cardId || cardId === '__pending__') {
      setLocalError('Pick a card to generate the plan against.');
      return;
    }
    try {
      const plan = await generate.mutateAsync(
        pipelineId.trim() ? { pipeline_id: pipelineId.trim() } : undefined,
      );
      onPlanGenerated?.(plan);
      setOpen(false);
      setLocalError(null);
    } catch (err) {
      const msg =
        (err as { message?: string } | undefined)?.message ??
        'Failed to generate plan';
      setLocalError(msg);
    }
  };

  const isPending = generate.isPending;

  return (
    <div className={cn('relative inline-block', className)} ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || isPending}
        title={
          noSpecs
            ? 'No intent specs available'
            : noCards
              ? 'No cards available'
              : 'Generate execution plan'
        }
        className={cn(
          'h-[32px] px-[14px] rounded-[8px] text-[11px] font-medium inline-flex items-center gap-[6px] transition-colors',
          disabled || isPending
            ? 'bg-[#e8e8e8] text-[#acacac] cursor-not-allowed'
            : 'bg-[#ff9800] hover:bg-[#f57c00] text-white',
        )}
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Workflow size={12} />
        )}
        {isPending ? 'Generating…' : 'Generate Plan'}
        {!isPending && <ChevronDown size={11} className="opacity-80" />}
      </button>

      {open && !disabled && (
        <div
          role="dialog"
          aria-label="Generate execution plan"
          className="absolute z-50 top-[calc(100%+6px)] right-0 w-[300px] rounded-[10px] border border-[#e8e8e8] bg-white shadow-lg p-[14px] flex flex-col gap-[10px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b]">
              Generate Plan
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#acacac] hover:text-[#6b6b6b]"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Intent Spec */}
          <label className="flex flex-col gap-[4px]">
            <span className="text-[10px] font-medium text-[#6b6b6b] uppercase tracking-[0.4px]">
              Intent Spec <span className="text-[#e74c3c]">*</span>
            </span>
            <select
              value={intentSpecId}
              onChange={(e) => setIntentSpecId(e.target.value)}
              className="h-[30px] px-[8px] rounded-[6px] border border-[#e8e8e8] text-[12px] bg-white"
            >
              {intentSpecs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {/* Card */}
          <label className="flex flex-col gap-[4px]">
            <span className="text-[10px] font-medium text-[#6b6b6b] uppercase tracking-[0.4px]">
              Card
            </span>
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="h-[30px] px-[8px] rounded-[6px] border border-[#e8e8e8] text-[12px] bg-white"
            >
              {(cards ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* Pipeline (optional) */}
          <label className="flex flex-col gap-[4px]">
            <span className="text-[10px] font-medium text-[#6b6b6b] uppercase tracking-[0.4px]">
              Pipeline ID (optional)
            </span>
            <input
              type="text"
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
              placeholder="auto-select by intent_type"
              className="h-[30px] px-[8px] rounded-[6px] border border-[#e8e8e8] text-[12px] bg-white"
            />
          </label>

          {/* Error */}
          {localError && (
            <div className="rounded-[6px] bg-[#ffebee] border border-[#ffcdd2] px-[8px] py-[6px] text-[10px] text-[#e74c3c]">
              {localError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-[6px] pt-[2px]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="h-[28px] px-[10px] rounded-[6px] text-[11px] text-[#6b6b6b] hover:bg-[#f0f0ec] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !cardId}
              className={cn(
                'h-[28px] px-[12px] rounded-[6px] text-[11px] font-medium inline-flex items-center gap-[5px]',
                isPending || !cardId
                  ? 'bg-[#e8e8e8] text-[#acacac] cursor-not-allowed'
                  : 'bg-[#ff9800] hover:bg-[#f57c00] text-white',
              )}
            >
              {isPending && <Loader2 size={11} className="animate-spin" />}
              Generate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
