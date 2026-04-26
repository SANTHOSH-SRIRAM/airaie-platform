// D7: LinkedIntentSection — shows the IntentSpec linked to a card and lets the
// user link / re-link via an inline IntentSpecPicker overlay.

import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link as LinkIcon, Loader2, Pencil, Target, AlertTriangle, Check, X, Lock } from 'lucide-react';
import { cn } from '@utils/cn';
import { useUpdateCard, useCardEvidence } from '@hooks/useCards';
import { useIntent, useIntentList } from '@hooks/useIntents';
import { intentDisplayName, canRelink } from '@utils/intentLink';
import IntentSpecPicker from './IntentSpecPicker';
import type { Card } from '@/types/card';
import type { IntentSpec, IntentStatus } from '@/types/intent';

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<IntentStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
  locked: { label: 'Locked', bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  active: { label: 'Active', bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  completed: { label: 'Completed', bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  failed: { label: 'Failed', bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LinkedIntentSectionProps {
  card: Card;
  boardId: string;
  onUpdated?: (card: Card) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LinkedIntentSection({ card, boardId, onUpdated }: LinkedIntentSectionProps) {
  const update = useUpdateCard(card.id, boardId);
  const { data: linkedIntent, isLoading: linkedLoading } = useIntent(card.intent_spec_id);
  const { data: evidence } = useCardEvidence(card.id);
  const { data: intents } = useIntentList(boardId);

  const [editing, setEditing] = useState(false);
  const [pickerValue, setPickerValue] = useState<string | undefined>(card.intent_spec_id);
  const [pendingIntentId, setPendingIntentId] = useState<string | undefined>(undefined);
  const [showRelinkConfirm, setShowRelinkConfirm] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Derived: does the card have evidence/runs?
  const hasEvidence = (evidence?.length ?? 0) > 0;

  // Build the disabled set: any intent that would fail canRelink given this
  // card's current state. (Only matters during a re-link, i.e. when card already
  // has a link.) Computed regardless of `editing` so `useMemo` order is stable.
  const disabledIntentIds = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    if (!intents) return set;
    if (!card.intent_spec_id) return set; // initial link → nothing disabled
    for (const i of intents) {
      if (
        !canRelink(
          { intent_spec_id: card.intent_spec_id, has_evidence: hasEvidence },
          i,
        )
      ) {
        set.add(i.id);
      }
    }
    return set;
  }, [intents, card.intent_spec_id, hasEvidence]);

  const startEdit = () => {
    setPickerValue(card.intent_spec_id);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setPickerValue(card.intent_spec_id);
    setPendingIntentId(undefined);
    setShowRelinkConfirm(false);
  };

  const persistLink = async (nextId: string | undefined) => {
    try {
      // Explicit null when clearing — undefined is stripped by JSON.stringify
      // and the backend's PATCH /v0/cards/{id} would silently skip the column,
      // leaving the link in place. Passing null serializes correctly so the
      // UpdateCard store call issues SET intent_spec_id = NULL.
      const payload = { intent_spec_id: nextId ?? null } as Partial<Card>;
      const updated = await update.mutateAsync(payload);
      onUpdated?.(updated);
      setEditing(false);
      setPendingIntentId(undefined);
      setShowRelinkConfirm(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch {
      // Mutation error is reflected in update.isError below.
    }
  };

  const onSave = () => {
    const next = pickerValue;
    // No change → just close.
    if (next === card.intent_spec_id) {
      cancelEdit();
      return;
    }

    // If the card has evidence and we're switching to a *different* intent,
    // confirm before orphaning evidence. (Clearing the link is also a re-link.)
    if (hasEvidence && card.intent_spec_id) {
      setPendingIntentId(next);
      setShowRelinkConfirm(true);
      return;
    }

    void persistLink(next);
  };

  // ── Empty state: no link yet ────────────────────────────
  if (!card.intent_spec_id && !editing) {
    return (
      <div className="rounded-[10px] border border-dashed border-[#e0e0e0] bg-[#fafaf7] p-[12px] flex items-center gap-[10px]">
        <div className="w-[28px] h-[28px] rounded-[8px] bg-white border border-[#e8e8e8] flex items-center justify-center shrink-0">
          <LinkIcon size={14} className="text-[#acacac]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-[#1a1a1a] block">
            No IntentSpec linked
          </span>
          <span className="text-[10px] text-[#acacac] block mt-[1px]">
            Link this card to an IntentSpec to enable evidence and gates.
          </span>
        </div>
        <button
          type="button"
          onClick={startEdit}
          className="h-[28px] px-[12px] rounded-[6px] text-[11px] font-medium text-white bg-[#ff9800] hover:bg-[#f57c00] transition-colors"
        >
          Link to Intent
        </button>
      </div>
    );
  }

  // ── Editing mode ────────────────────────────────────────
  if (editing) {
    return (
      <div className="rounded-[10px] border border-[#ff9800] bg-[#fffaf0] p-[12px] flex flex-col gap-[10px]">
        <div className="flex items-center gap-[6px]">
          <Pencil size={12} className="text-[#ff9800]" />
          <span className="text-[11px] font-semibold text-[#1a1a1a]">
            {card.intent_spec_id ? 'Re-link IntentSpec' : 'Link IntentSpec'}
          </span>
        </div>

        <IntentSpecPicker
          boardId={boardId}
          value={pickerValue}
          onChange={setPickerValue}
          allowClear={!!card.intent_spec_id}
          disabledIntentIds={disabledIntentIds}
        />

        {hasEvidence && pickerValue !== card.intent_spec_id && (
          <div className="flex items-start gap-[6px] p-[8px] rounded-[6px] bg-[#fff3e0] border border-[#ffe0b2]">
            <AlertTriangle size={12} className="text-[#ff9800] shrink-0 mt-[1px]" />
            <span className="text-[10px] text-[#6b6b6b] leading-[14px]">
              This card has {evidence?.length ?? 0} evidence record
              {(evidence?.length ?? 0) === 1 ? '' : 's'} tied to the current IntentSpec.
              Re-linking will orphan them.
            </span>
          </div>
        )}

        {update.isError && (
          <div className="text-[10px] text-[#e74c3c]">
            {(update.error as Error)?.message ?? 'Failed to update link'}
          </div>
        )}

        <div className="flex items-center justify-end gap-[6px]">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={update.isPending}
            className="h-[28px] px-[12px] rounded-[6px] text-[11px] font-medium text-[#6b6b6b] border border-[#e8e8e8] hover:bg-[#f0f0ec] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={update.isPending}
            className={cn(
              'h-[28px] px-[14px] rounded-[6px] text-[11px] font-medium text-white flex items-center gap-[5px] transition-colors',
              update.isPending
                ? 'bg-[#d0d0d0] cursor-not-allowed'
                : 'bg-[#ff9800] hover:bg-[#f57c00]',
            )}
          >
            {update.isPending && <Loader2 size={11} className="animate-spin" />}
            Save
          </button>
        </div>

        {/* Re-link confirmation overlay */}
        {showRelinkConfirm && (
          <RelinkConfirmDialog
            evidenceCount={evidence?.length ?? 0}
            onCancel={() => {
              setShowRelinkConfirm(false);
              setPendingIntentId(undefined);
            }}
            onConfirm={() => persistLink(pendingIntentId)}
            isPending={update.isPending}
          />
        )}
      </div>
    );
  }

  // ── Compact summary card ────────────────────────────────
  return (
    <LinkedIntentSummary
      intent={linkedIntent}
      isLoading={linkedLoading}
      boardId={boardId}
      onEdit={startEdit}
      savedFlash={savedFlash}
    />
  );
}

// ---------------------------------------------------------------------------
// Compact summary card
// ---------------------------------------------------------------------------

function LinkedIntentSummary({
  intent,
  isLoading,
  boardId,
  onEdit,
  savedFlash,
}: {
  intent: IntentSpec | undefined;
  isLoading: boolean;
  boardId: string;
  onEdit: () => void;
  savedFlash: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-[10px] border border-[#e8e8e8] bg-white p-[12px] flex items-center gap-[8px]">
        <Loader2 size={12} className="animate-spin text-[#acacac]" />
        <span className="text-[11px] text-[#acacac]">Loading linked intent…</span>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="rounded-[10px] border border-[#e8e8e8] bg-white p-[12px] flex items-center gap-[8px]">
        <AlertTriangle size={12} className="text-[#e74c3c]" />
        <span className="text-[11px] text-[#e74c3c] flex-1">
          Linked intent not found (it may have been deleted).
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] text-[#ff9800] font-medium hover:underline"
        >
          Re-link
        </button>
      </div>
    );
  }

  const status = STATUS_BADGE[intent.status];
  const criteriaCount = intent.acceptance_criteria?.length ?? 0;
  // D7: route is the canonical detail path even though D2 left it as TODO.
  const detailHref = `/boards/${boardId}/intents/${intent.id}`;

  return (
    <div
      className={cn(
        'group rounded-[10px] border bg-white p-[12px] flex items-start gap-[10px] transition-colors',
        savedFlash ? 'border-[#4caf50] bg-[#f1f8e9]' : 'border-[#e8e8e8]',
      )}
    >
      <div className="w-[28px] h-[28px] rounded-[8px] bg-[#fff3e0] flex items-center justify-center shrink-0">
        {intent.status === 'locked' ? (
          <Lock size={14} className="text-[#ff9800]" />
        ) : (
          <Target size={14} className="text-[#ff9800]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[6px] flex-wrap">
          <span className="text-[12px] font-semibold text-[#1a1a1a] truncate max-w-[280px]">
            {intentDisplayName(intent)}
          </span>
          <span
            className={cn(
              'h-[18px] px-[6px] rounded-[4px] text-[9px] font-semibold uppercase inline-flex items-center',
              status.bg,
              status.text,
            )}
          >
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-[6px] mt-[4px] flex-wrap">
          <span className="h-[16px] px-[5px] rounded-[3px] bg-[#f0f0ec] text-[#6b6b6b] text-[9px] font-mono inline-flex items-center">
            {intent.intent_type}
          </span>
          <span className="text-[9px] text-[#acacac]">
            {criteriaCount} {criteriaCount === 1 ? 'criterion' : 'criteria'}
          </span>
          {intent.version > 1 && (
            <span className="text-[9px] text-[#acacac]">v{intent.version}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-[4px] shrink-0">
        {savedFlash && (
          <span className="text-[10px] text-[#4caf50] flex items-center gap-[3px]">
            <Check size={10} /> Saved
          </span>
        )}
        <RouterLink
          to={detailHref}
          className="h-[24px] px-[8px] rounded-[6px] text-[10px] font-medium text-[#6b6b6b] hover:bg-[#f0f0ec] transition-colors inline-flex items-center"
          title="Open intent detail"
        >
          Open
        </RouterLink>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit linked intent"
          className="w-[24px] h-[24px] rounded-[6px] text-[#acacac] hover:text-[#ff9800] hover:bg-[#fff3e0] transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Pencil size={11} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Re-link confirmation dialog
// ---------------------------------------------------------------------------

function RelinkConfirmDialog({
  evidenceCount,
  onCancel,
  onConfirm,
  isPending,
}: {
  evidenceCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      <div
        role="dialog"
        aria-labelledby="relink-confirm-title"
        className="relative bg-white rounded-[12px] shadow-[0px_8px_40px_rgba(0,0,0,0.2)] w-[440px] flex flex-col"
      >
        <div className="flex items-center gap-[8px] px-[20px] py-[14px] border-b border-[#f0f0ec]">
          <div className="w-[28px] h-[28px] rounded-[8px] bg-[#fff3e0] flex items-center justify-center">
            <AlertTriangle size={14} className="text-[#ff9800]" />
          </div>
          <h3 id="relink-confirm-title" className="text-[14px] font-semibold text-[#1a1a1a]">
            Confirm re-link
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto w-[24px] h-[24px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f0f0ec] transition-colors"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-[20px] py-[16px] flex flex-col gap-[8px]">
          <p className="text-[12px] text-[#1a1a1a] leading-[18px]">
            This card has <strong>{evidenceCount}</strong> evidence record
            {evidenceCount === 1 ? '' : 's'} tied to the current IntentSpec.
            Re-linking will orphan them.
          </p>
          <p className="text-[11px] text-[#6b6b6b] leading-[16px]">
            The existing evidence will remain in the database but will no longer
            evaluate against this card's gates. Continue?
          </p>
        </div>

        <div className="flex items-center justify-end gap-[8px] px-[20px] py-[14px] border-t border-[#f0f0ec]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-[32px] px-[14px] rounded-[6px] text-[11px] font-medium text-[#6b6b6b] border border-[#e8e8e8] hover:bg-[#f0f0ec] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'h-[32px] px-[16px] rounded-[6px] text-[11px] font-semibold text-white flex items-center gap-[5px] transition-colors',
              isPending
                ? 'bg-[#d0d0d0] cursor-not-allowed'
                : 'bg-[#e74c3c] hover:bg-[#c0392b]',
            )}
          >
            {isPending && <Loader2 size={11} className="animate-spin" />}
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
