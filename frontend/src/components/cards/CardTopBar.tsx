import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2, MoreHorizontal, Play, Pause, Sparkles, Settings2 } from 'lucide-react';
import { cn } from '@utils/cn';
import { useUpdateCard } from '@hooks/useCards';
import { usePlan } from '@hooks/usePlans';
import { useIntent } from '@hooks/useIntents';
import { useCardRunState, type CardRunState } from '@hooks/useCardRunState';
import type { Card, CardStatus } from '@/types/card';
import type { Board } from '@/types/board';

// ---------------------------------------------------------------------------
// STATUS_BADGE — extracted from CardDetail.tsx so the new top bar shares the
// canonical color tokens for all 8 backend statuses.
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<CardStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
  ready: { label: 'Ready', bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  queued: { label: 'Queued', bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  running: { label: 'Running', bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  completed: { label: 'Completed', bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  failed: { label: 'Failed', bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
  blocked: { label: 'Blocked', bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  skipped: { label: 'Skipped', bg: 'bg-[#f0f0ec]', text: 'text-[#9e9e9e]' },
};

// ---------------------------------------------------------------------------
// MODE_BADGE — Govern hue per Wave 1 design: Mode chip is always orange to
// signal "this is a governance surface" regardless of which Mode is active.
// ---------------------------------------------------------------------------

function modeLabel(mode: Board['mode'] | undefined): 'Explore' | 'Study' | 'Release' | '—' {
  if (mode === 'explore') return 'Explore';
  if (mode === 'study') return 'Study';
  if (mode === 'release') return 'Release';
  return '—';
}

// ---------------------------------------------------------------------------
// runStateToButton — pure helper that maps the discriminated-union
// CardRunState into the visual props for the top-bar's primary button.
// CardTopBar collapses Wave 2's richer states (no-inputs, completed, failed)
// back to Wave 1 semantics so the top-bar UX stays compact:
//   - no-inputs   → reads "Generate Plan" (since the previous gate before
//                   the run state machine, "Draft Intent first," is fully
//                   covered by no-intent; once IntentSpec exists the user
//                   can press on regardless of pinned inputs and the
//                   server returns a sensible error).
//   - completed   → reads "Run Card" (the "Re-run" wording is exclusive to
//                   the more spacious CardActionBar).
//   - failed      → reads "Run Card".
// CardActionBar has more horizontal space and renders the full vocabulary.
// ---------------------------------------------------------------------------

interface ButtonView {
  label: string;
  pending: boolean;
  disabled: boolean;
  title?: string;
  onClick?: () => void;
  variant: 'primary' | 'cancel' | 'sparkle' | 'settings';
}

export function runStateToButton(state: CardRunState): ButtonView {
  switch (state.stage) {
    case 'no-intent':
      return {
        label: 'Draft Intent first',
        pending: false,
        disabled: true,
        title: 'Set an IntentSpec before running',
        variant: 'sparkle',
      };
    case 'no-inputs':
      // CardTopBar collapses no-inputs into the configuration-progression UI;
      // the visible button is "Generate Plan" once intent_spec is set, since
      // backend will surface input errors at run time anyway.
      return {
        label: 'Generate Plan',
        pending: false,
        disabled: true,
        title: 'Pin at least one input before generating a plan',
        variant: 'settings',
      };
    case 'no-plan':
      return {
        label: state.isPending ? 'Generating…' : 'Generate Plan',
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.generate(),
        variant: 'settings',
      };
    case 'ready':
      return {
        label: state.isPending ? 'Starting…' : 'Run Card',
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.run(),
        variant: 'primary',
      };
    case 'running':
      return {
        label: state.isPending ? 'Cancelling…' : 'Cancel',
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.cancel(),
        variant: 'cancel',
      };
    case 'completed':
      return {
        label: state.isPending ? 'Starting…' : 'Run Card',
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.rerun(),
        variant: 'primary',
      };
    case 'failed':
      return {
        label: state.isPending ? 'Starting…' : 'Run Card',
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.rerun(),
        variant: 'primary',
      };
  }
}

// ---------------------------------------------------------------------------
// CardTopBar
// ---------------------------------------------------------------------------

interface CardTopBarProps {
  card: Card;
  board?: Board;
  boardLoading?: boolean;
}

export default function CardTopBar({ card, board }: CardTopBarProps) {
  const navigate = useNavigate();
  const updateCard = useUpdateCard(card.id, card.board_id);
  const [searchParams, setSearchParams] = useSearchParams();
  const onCanvas = searchParams.get('canvas') === '1';

  // Pull the same plan + intent the body sections use; React Query keeps the
  // cache shared so we don't refetch.
  const { data: plan } = usePlan(card.id);
  const { data: intent } = useIntent(card.intent_spec_id);

  // SHARED STATE MACHINE — the same hook CardActionBar consumes. A run
  // started from either surface flips both buttons within one render cycle
  // because both subscribe to the same React Query cache keys
  // (cardKeys.detail, planKeys.detail).
  const runState = useCardRunState(card, intent, plan);
  const button = runStateToButton(runState);

  // Title editing — local state, persisted via useUpdateCard mutation.
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep titleDraft in sync when card.title changes externally.
  useEffect(() => {
    if (!editing) {
      setTitleDraft(card.title);
    }
  }, [card.title, editing]);

  // Focus the input the moment we enter edit mode.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const isDirty = editing && titleDraft.trim() !== card.title && titleDraft.trim().length > 0;

  const statusCfg = STATUS_BADGE[card.status] ?? STATUS_BADGE.draft;
  const modeText = modeLabel(board?.mode);

  // ── Save title ────────────────────────────────────────────
  const handleSaveTitle = async () => {
    const newTitle = titleDraft.trim();
    if (!newTitle || newTitle === card.title) {
      setEditing(false);
      setTitleDraft(card.title);
      return;
    }
    try {
      await updateCard.mutateAsync({ title: newTitle });
      setEditing(false);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to update title';
      window.alert(msg);
      setTitleDraft(card.title);
      setEditing(false);
    }
  };

  // ── Run-button click handler — the hook owns mutation logic ─
  const handleRunClick = async () => {
    if (button.disabled || !button.onClick) return;
    try {
      await button.onClick();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Action failed';
      window.alert(msg);
    }
  };

  // ── Run-button visual props ───────────────────────────────
  const RunIcon = button.pending
    ? Loader2
    : button.variant === 'cancel'
      ? Pause
      : button.variant === 'settings'
        ? Settings2
        : button.variant === 'sparkle'
          ? Sparkles
          : Play;

  return (
    <div className="h-[56px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] flex items-center justify-between px-[16px] gap-[12px]">
      {/* ── Left: back + breadcrumb + title ─────────────────── */}
      <div className="flex items-center gap-[8px] min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate(`/boards/${card.board_id}`)}
          aria-label="Back to Board"
          className="p-[6px] hover:bg-[#f0f0ec] rounded-[6px] transition-colors shrink-0"
        >
          <ArrowLeft size={16} className="text-[#1a1a1a]" />
        </button>

        {/* Breadcrumb: Board › Card */}
        <button
          type="button"
          onClick={() => navigate(`/boards/${card.board_id}`)}
          className="text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors truncate max-w-[180px]"
          title={board?.name ?? card.board_id}
        >
          {board?.name ?? '…'}
        </button>
        <ChevronRight size={12} className="text-[#acacac] shrink-0" aria-hidden="true" />

        {/* Title — click to edit, blur to save */}
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveTitle();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setTitleDraft(card.title);
                setEditing(false);
              }
            }}
            aria-label="Card title"
            className="text-[13px] font-semibold text-[#1a1a1a] bg-[#fafafa] border border-[#ff9800] rounded-[4px] px-[6px] py-[2px] outline-none min-w-0 flex-1 max-w-[400px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit card title"
            className="text-[13px] font-semibold text-[#1a1a1a] hover:bg-[#f0f0ec] rounded-[4px] px-[6px] py-[2px] truncate max-w-[400px] text-left"
          >
            {card.title}
          </button>
        )}
      </div>

      {/* ── Middle: Mode badge · Status badge ───────────────── */}
      <div className="flex items-center gap-[6px] shrink-0">
        <span
          className="h-[22px] px-[10px] rounded-full text-[10px] font-medium inline-flex items-center bg-[#fff3e0] text-[#f57c00]"
          title={`Board mode: ${modeText}`}
        >
          {modeText}
        </span>
        <span className="text-[#acacac] text-[12px]" aria-hidden="true">·</span>
        <span
          className={cn(
            'h-[22px] px-[10px] rounded-full text-[10px] font-medium inline-flex items-center',
            statusCfg.bg,
            statusCfg.text,
          )}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* ── Right: Save (when dirty) · Run · ⋯ ──────────────── */}
      <div className="flex items-center gap-[8px] shrink-0">
        {!onCanvas && (
          <button
            type="button"
            // 10-07-flip: canvas is now the default route. Clearing both the
            // `legacy` and `canvas` params returns to the canvas. (The button
            // is only rendered while the user is on the legacy structured
            // page via ?legacy=1.)
            onClick={() => setSearchParams({})}
            title="Back to the canvas view"
            className="text-[11px] text-[#9b978f] hover:text-[#1a1a1a] hover:underline"
          >
            Back to canvas →
          </button>
        )}
        {isDirty && (
          <button
            type="button"
            onClick={handleSaveTitle}
            disabled={updateCard.isPending}
            className={cn(
              'h-[36px] px-[14px] rounded-[8px] text-[12px] font-medium border border-[#1a1a1a] text-[#1a1a1a] bg-white hover:bg-[#f0f0ec] transition-colors',
              updateCard.isPending && 'opacity-60 cursor-not-allowed',
            )}
          >
            {updateCard.isPending ? 'Saving…' : 'Save'}
          </button>
        )}

        <button
          type="button"
          onClick={handleRunClick}
          disabled={button.disabled}
          title={button.title}
          aria-label={button.label}
          className={cn(
            'h-[36px] px-[16px] rounded-[8px] text-[12px] font-semibold flex items-center gap-[8px] transition-colors',
            'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]',
            button.disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <RunIcon size={14} className={button.pending ? 'animate-spin' : undefined} aria-hidden="true" />
          {button.label}
        </button>

        <button
          type="button"
          aria-label="More actions"
          title="Duplicate / Delete / Export — coming in 08-02"
          className="p-[6px] hover:bg-[#f0f0ec] rounded-[6px] transition-colors"
        >
          <MoreHorizontal size={16} className="text-[#6b6b6b]" />
        </button>
      </div>
    </div>
  );
}
