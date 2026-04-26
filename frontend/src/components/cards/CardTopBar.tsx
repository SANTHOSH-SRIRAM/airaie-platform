import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2, MoreHorizontal, Play, Pause, Sparkles, Settings2 } from 'lucide-react';
import { cn } from '@utils/cn';
import { useUpdateCard } from '@hooks/useCards';
import { usePlan, useExecutePlan, useGeneratePlan } from '@hooks/usePlans';
import { useCancelRun } from '@hooks/useRuns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listCardRuns } from '@api/cards';
import { cardKeys } from '@hooks/useCards';
import type { Card, CardStatus } from '@/types/card';
import type { Board } from '@/types/board';
import type { ExecutionPlan } from '@/types/plan';

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
// Run-button state machine — pure helper so we can unit-test the 4 stages
// without mounting JSX (vitest env=node, no @testing-library/react).
// ---------------------------------------------------------------------------

export type RunButtonAction = 'draft' | 'generate' | 'run' | 'cancel';

export interface RunButtonState {
  label: string;
  action: RunButtonAction;
  disabled: boolean;
  pending: boolean;
  /** Tooltip / aria title — explains why the button is disabled when it is. */
  title?: string;
}

/**
 * Derive the Run-button state from card + plan + mutation state.
 *
 * The state machine has 4 stages:
 *   1. No IntentSpec (`card.intent_spec_id` falsy) → "Draft Intent first" disabled.
 *      Wave 2's CardActionBar will offer the AI-Assist Draft flow; in Wave 1
 *      this is a hard gate.
 *   2. IntentSpec exists, no Plan yet (`plan == null`) → "Generate Plan"
 *      enabled; clicking calls `useGeneratePlan.mutate`.
 *   3. Plan exists, no run in flight → "Run Card" enabled; calls
 *      `useExecutePlan.mutate`.
 *   4. Run in progress (`card.status === 'running'`) → "Cancel" enabled;
 *      calls `cancelRun(latestRunId)`.
 *
 * Pending states (any mutation in flight) override label to "Generating…",
 * "Starting…", "Cancelling…" with disabled=true.
 */
export function deriveRunButtonState(
  card: Pick<Card, 'intent_spec_id' | 'status'>,
  plan: ExecutionPlan | null | undefined,
  pending: { generate: boolean; execute: boolean; cancel: boolean },
): RunButtonState {
  // Cancelling takes precedence visually so users see the in-flight state
  // even if status hasn't flipped yet.
  if (pending.cancel) {
    return { label: 'Cancelling…', action: 'cancel', disabled: true, pending: true };
  }
  if (pending.execute) {
    return { label: 'Starting…', action: 'run', disabled: true, pending: true };
  }
  if (pending.generate) {
    return { label: 'Generating…', action: 'generate', disabled: true, pending: true };
  }

  // Stage 4: run in flight
  if (card.status === 'running' || card.status === 'queued') {
    return { label: 'Cancel', action: 'cancel', disabled: false, pending: false };
  }

  // Stage 1: no IntentSpec
  if (!card.intent_spec_id) {
    return {
      label: 'Draft Intent first',
      action: 'draft',
      disabled: true,
      pending: false,
      title: 'Set an IntentSpec before running',
    };
  }

  // Stage 2: IntentSpec but no Plan
  if (!plan) {
    return { label: 'Generate Plan', action: 'generate', disabled: false, pending: false };
  }

  // Stage 3: plan exists, ready to run
  return { label: 'Run Card', action: 'run', disabled: false, pending: false };
}

// ---------------------------------------------------------------------------
// useLatestCardRunId — small read-only hook. We need the latest run id to
// support Cancel (cancelRun(runId)). Backend already exposes
// GET /v0/cards/{id}/runs (see api/cards.ts:listCardRuns); rather than
// shipping a brand-new hook in usePlans/useRuns we keep this co-located with
// CardTopBar since it's the only consumer in Wave 1. If 08-02 grows more
// callers, lift it into hooks/useCards.
// ---------------------------------------------------------------------------

function useLatestCardRunId(cardId: string, enabled: boolean) {
  const { data } = useQuery({
    queryKey: [...cardKeys.detail(cardId), 'runs'] as const,
    queryFn: () => listCardRuns(cardId),
    enabled: enabled && !!cardId,
    staleTime: 5_000,
    refetchInterval: enabled ? 5_000 : false,
  });
  if (!data || data.length === 0) return null;
  // Sort by started_at desc; backend may already return desc but don't trust it.
  const sorted = [...data].sort((a, b) => {
    const ta = new Date(a.started_at).getTime();
    const tb = new Date(b.started_at).getTime();
    return tb - ta;
  });
  return sorted[0]?.id ?? null;
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
  const queryClient = useQueryClient();
  const updateCard = useUpdateCard(card.id, card.board_id);

  // Read the existing plan from the same React Query cache the page populates.
  // No duplicate fetch; usePlan returns whatever's cached for planKeys.detail(cardId).
  const { data: plan } = usePlan(card.id);

  // Mutations for the Run state machine.
  const generatePlan = useGeneratePlan(card.id);
  const executePlan = useExecutePlan(card.id, card.board_id);
  const cancelRun = useCancelRun();

  // Latest run id — only fetched while the card is potentially-running so we
  // don't poll on every Card view.
  const isInFlight = card.status === 'running' || card.status === 'queued';
  const latestRunId = useLatestCardRunId(card.id, isInFlight);

  // Title editing — local state, persisted via useUpdateCard mutation.
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep titleDraft in sync when card.title changes externally (e.g., another
  // tab edited it and React Query refreshed).
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

  // ── Derived button state ─────────────────────────────────
  const runState = deriveRunButtonState(card, plan, {
    generate: generatePlan.isPending,
    execute: executePlan.isPending,
    cancel: cancelRun.isPending,
  });

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

  // ── Run-button click handler — branches on derived action ─
  const handleRunClick = async () => {
    if (runState.disabled) return;
    try {
      if (runState.action === 'generate') {
        // Pass undefined to let the kernel auto-pick a pipeline from the
        // card's intent_type (gateway tolerates empty body — see
        // CLAUDE.md memory: "plan handler tolerates empty body").
        await generatePlan.mutateAsync();
        return;
      }
      if (runState.action === 'run') {
        await executePlan.mutateAsync();
        // useExecutePlan.onSuccess invalidates planKeys.detail + cardKeys.detail
        // so the page re-renders with the new running status; no manual nav.
        // Force a card refetch so card.status flips from 'ready' to 'running'
        // even before the natural staleTime expires.
        queryClient.invalidateQueries({ queryKey: cardKeys.detail(card.id) });
        return;
      }
      if (runState.action === 'cancel') {
        if (!latestRunId) {
          window.alert('No run found to cancel');
          return;
        }
        await cancelRun.mutateAsync(latestRunId);
        queryClient.invalidateQueries({ queryKey: cardKeys.detail(card.id) });
        return;
      }
      // 'draft' branch never reached because runState.disabled === true.
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Action failed';
      window.alert(msg);
    }
  };

  // ── Run-button visual props ───────────────────────────────
  const RunIcon = runState.pending
    ? Loader2
    : runState.action === 'cancel'
      ? Pause
      : runState.action === 'generate'
        ? Settings2
        : runState.action === 'draft'
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
        <ChevronRight size={12} className="text-[#acacac] shrink-0" />

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
        <span className="text-[#acacac] text-[12px]">·</span>
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
          disabled={runState.disabled}
          title={runState.title}
          aria-label={runState.label}
          className={cn(
            'h-[36px] px-[16px] rounded-[8px] text-[12px] font-semibold flex items-center gap-[8px] transition-colors',
            'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]',
            runState.disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <RunIcon size={14} className={runState.pending ? 'animate-spin' : undefined} />
          {runState.label}
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
