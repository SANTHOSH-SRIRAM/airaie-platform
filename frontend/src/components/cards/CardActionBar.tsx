import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Sparkles, Settings2, RotateCcw, MapPin, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@utils/cn';
import { useCardRunState, type CardRunState } from '@hooks/useCardRunState';
import { useQuery } from '@tanstack/react-query';
import { listCardRuns } from '@api/cards';
import { cardKeys } from '@hooks/useCards';
import { formatRelativeTime } from '@utils/format';
import type { Card } from '@/types/card';
import type { IntentSpec } from '@/types/intent';
import type { ExecutionPlan } from '@/types/plan';
import type { CardModeRules } from '@hooks/useCardModeRules';

// ---------------------------------------------------------------------------
// CardActionBar — floating bottom action bar.
//
// This is the spacious complement to CardTopBar's compact button. It uses the
// same `useCardRunState` hook (so a Run started from either surface flips
// both within one render cycle), but exposes the full Wave 2 vocabulary:
//   - no-intent  → "✨ Draft Intent first" (disabled)
//   - no-inputs  → "📌 Pin Inputs first"   (scrolls to AvailableInputsTable)
//   - no-plan    → "⚙ Generate Plan"
//   - ready      → "▶ Run Card"
//   - running    → "⏸ Cancel"
//   - completed  → "↻ Re-run"
//   - failed     → "↻ Re-run"
// Plus a secondary `[💬 Chat]` CTA that opens the AI Assist drawer. Full
// wiring ships separately; this surface only invokes a no-op handler that
// surfaces a transient toast — NO log-statement stubs are used.
//
// The bar is `fixed bottom-[16px] left-1/2 -translate-x-1/2` so it floats
// over the page body without being scoped to CardDetailLayout's max-width.
// CardDetailPage mounts it OUTSIDE the layout to preserve this positioning.
// ---------------------------------------------------------------------------

interface CardActionBarProps {
  card: Card;
  intent: IntentSpec | undefined;
  plan: ExecutionPlan | null | undefined;
  rules: CardModeRules;
}

// ---------------------------------------------------------------------------
// runStateToActionView — Wave 2's full vocabulary mapper. Pure helper for
// testing / consistency — exported so future surfaces can re-use the same
// label vocabulary instead of inventing their own.
// ---------------------------------------------------------------------------

interface ActionView {
  label: string;
  icon: typeof Play;
  pending: boolean;
  disabled: boolean;
  title?: string;
  onClick?: () => void;
  /** Style key — drives the button's color treatment. */
  variant: 'primary' | 'cancel' | 'sparkle' | 'settings' | 'pin' | 'rerun';
  /** Tag the stage so consumers can branch on richer states (e.g. for
   *  scroll-to-section behavior in no-inputs). */
  stage: CardRunState['stage'];
}

export function runStateToActionView(state: CardRunState): ActionView {
  switch (state.stage) {
    case 'no-intent':
      return {
        label: 'Draft Intent first',
        icon: Sparkles,
        pending: false,
        disabled: true,
        title: 'Author the IntentSpec to unlock the Run flow',
        variant: 'sparkle',
        stage: 'no-intent',
      };
    case 'no-inputs':
      return {
        label: 'Pin Inputs first',
        icon: MapPin,
        pending: false,
        disabled: false,
        title: 'Pin at least one artifact from the Board pool',
        variant: 'pin',
        stage: 'no-inputs',
        // No onClick: the parent supplies a scroll-to-table handler so the
        // bar can be a single source of truth without coupling to DOM ids.
      };
    case 'no-plan':
      return {
        label: state.isPending ? 'Generating…' : 'Generate Plan',
        icon: Settings2,
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.generate(),
        variant: 'settings',
        stage: 'no-plan',
      };
    case 'ready':
      return {
        label: state.isPending ? 'Starting…' : 'Run Card',
        icon: Play,
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.run(),
        variant: 'primary',
        stage: 'ready',
      };
    case 'running':
      return {
        label: state.isPending ? 'Cancelling…' : 'Cancel',
        icon: Pause,
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.cancel(),
        variant: 'cancel',
        stage: 'running',
      };
    case 'completed':
      return {
        label: state.isPending ? 'Starting…' : 'Re-run',
        icon: RotateCcw,
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.rerun(),
        variant: 'rerun',
        stage: 'completed',
      };
    case 'failed':
      return {
        label: state.isPending ? 'Starting…' : 'Re-run',
        icon: RotateCcw,
        pending: state.isPending,
        disabled: state.isPending,
        onClick: () => state.rerun(),
        variant: 'rerun',
        stage: 'failed',
      };
  }
}

// ---------------------------------------------------------------------------
// Status-pill summary text per stage
// ---------------------------------------------------------------------------

function pillText(stage: CardRunState['stage'], cardStatus: Card['status']): string {
  switch (stage) {
    case 'no-intent':
      return 'Card needs an Intent';
    case 'no-inputs':
      return 'Inputs not pinned';
    case 'no-plan':
      return 'Method not chosen';
    case 'ready':
      return 'Card ready';
    case 'running':
      return 'Running';
    case 'completed':
      return cardStatus === 'completed' ? 'Passed' : 'Completed';
    case 'failed':
      return 'Failed';
  }
}

function pillDot(stage: CardRunState['stage']): string {
  switch (stage) {
    case 'running':
      return 'bg-[#2196f3] animate-pulse';
    case 'completed':
      return 'bg-[#4caf50]';
    case 'failed':
      return 'bg-[#e74c3c]';
    case 'ready':
      return 'bg-[#1a1a1a]';
    default:
      return 'bg-[#9e9e9e]';
  }
}

// ---------------------------------------------------------------------------
// Variant → Tailwind classes
// ---------------------------------------------------------------------------

function variantClasses(v: ActionView['variant']): string {
  switch (v) {
    case 'primary':
    case 'rerun':
      return 'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]';
    case 'cancel':
      return 'bg-[#ffebee] text-[#e74c3c] hover:bg-[#ffcdd2]';
    case 'sparkle':
      return 'bg-[#f57c00] text-white hover:bg-[#e65100]';
    case 'settings':
      return 'bg-[#1a1a1a] text-white hover:bg-[#2d2d2d]';
    case 'pin':
      return 'bg-[#fff3e0] text-[#f57c00] hover:bg-[#ffe0b2]';
  }
}

// ---------------------------------------------------------------------------
// CardActionBar — main render
// ---------------------------------------------------------------------------

export default function CardActionBar({ card, intent, plan, rules: _rules }: CardActionBarProps) {
  const runState = useCardRunState(card, intent, plan);
  const view = runStateToActionView(runState);
  const [actionError, setActionError] = useState<string | null>(null);

  // Run count + last activity meta for the middle region.
  const { data: runs } = useQuery({
    queryKey: [...cardKeys.detail(card.id), 'runs'] as const,
    queryFn: () => listCardRuns(card.id),
    enabled: !!card.id,
    staleTime: 15_000,
  });
  const runCount = runs?.length ?? 0;
  const lastActivity = useMemo(() => {
    if (!runs || runs.length === 0) return null;
    const withStart = runs.filter((r): r is typeof r & { started_at: string } => !!r.started_at);
    if (withStart.length === 0) return null;
    const latest = [...withStart].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )[0];
    return formatRelativeTime(latest.started_at);
  }, [runs]);

  // Clear ephemeral action errors a few seconds after they show.
  useEffect(() => {
    if (!actionError) return;
    const id = window.setTimeout(() => setActionError(null), 4000);
    return () => window.clearTimeout(id);
  }, [actionError]);

  const handlePrimary = async () => {
    setActionError(null);
    if (view.disabled) return;
    if (view.stage === 'no-inputs') {
      // Scroll to the Inputs table so the user can pin something. The
      // parent renders the section with aria-label="Available Inputs"; we
      // resolve via querySelector rather than a hard-coded ref so we stay
      // decoupled from CardDetailPage's internal ref tree.
      const target = document.querySelector('section[aria-label="Available Inputs"]');
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Briefly highlight to draw the eye.
        target.style.transition = 'box-shadow 0.4s ease-out';
        target.style.boxShadow = '0 0 0 2px #f57c00';
        window.setTimeout(() => {
          target.style.boxShadow = '';
        }, 1200);
      }
      return;
    }
    if (!view.onClick) return;
    try {
      await view.onClick();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Action failed';
      setActionError(msg);
    }
  };

  const handleChat = () => {
    // AI Assist drawer wiring is a separate phase; the secondary CTA is
    // intentionally a no-op stub that surfaces a transient toast. Wave 2
    // explicitly forbids log-statement stubs in this component.
    setActionError('AI Assist drawer is shipping in a later phase');
  };

  const Icon = view.icon;

  return (
    <div
      role="toolbar"
      aria-label="Card action bar"
      className="fixed bottom-[16px] left-1/2 -translate-x-1/2 z-40 h-[52px] bg-white rounded-full shadow-[0px_4px_24px_0px_rgba(0,0,0,0.12)] border border-[#f0f0ec] flex items-center gap-[12px] px-[16px]"
    >
      {/* ── Left: status pill ──────────────────────────────────── */}
      <div className="flex items-center gap-[6px]" role="status" aria-live="polite" aria-atomic="true">
        <span
          className={cn('w-[8px] h-[8px] rounded-full shrink-0', pillDot(view.stage))}
          aria-hidden="true"
        />
        <span className="text-[12px] font-medium text-[#1a1a1a]">
          {pillText(view.stage, card.status)}
        </span>
      </div>

      <span className="h-[20px] w-[1px] bg-[#f0f0ec]" aria-hidden="true" />

      {/* ── Middle: meta ───────────────────────────────────────── */}
      <div className="flex items-center gap-[6px] text-[11px] text-[#6b6b6b]">
        <span className="capitalize">Mode: {_rules.mode}</span>
        <span className="text-[#d0d0d0]" aria-hidden="true">·</span>
        <span className="tabular-nums">{runCount} {runCount === 1 ? 'run' : 'runs'}</span>
        {lastActivity && (
          <>
            <span className="text-[#d0d0d0]" aria-hidden="true">·</span>
            <span>last {lastActivity}</span>
          </>
        )}
      </div>

      <span className="h-[20px] w-[1px] bg-[#f0f0ec]" aria-hidden="true" />

      {/* ── Right: primary CTA + Chat ──────────────────────────── */}
      <div className="flex items-center gap-[6px]">
        <button
          type="button"
          onClick={handlePrimary}
          disabled={view.disabled}
          title={view.title}
          aria-label={view.label}
          className={cn(
            'h-[36px] px-[16px] rounded-full text-[12px] font-semibold inline-flex items-center gap-[6px] transition-colors',
            variantClasses(view.variant),
            view.disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          {view.pending ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            <Icon size={13} aria-hidden="true" />
          )}
          {view.label}
        </button>

        <button
          type="button"
          onClick={handleChat}
          aria-label="Open AI Assist chat"
          title="Chat with AI Assist (full wiring in a later phase)"
          className="h-[36px] px-[14px] rounded-full text-[12px] font-medium inline-flex items-center gap-[6px] bg-[#fafafa] text-[#1a1a1a] border border-[#f0f0ec] hover:bg-[#f0f0ec] transition-colors"
        >
          <MessageCircle size={13} aria-hidden="true" />
          Chat
        </button>
      </div>

      {/* Ephemeral inline error message */}
      {actionError && (
        <div
          role="alert"
          className="absolute -top-[36px] left-1/2 -translate-x-1/2 inline-flex items-center gap-[6px] h-[28px] px-[12px] rounded-full bg-[#ffebee] text-[#e74c3c] text-[11px] font-medium shadow-[0_2px_8px_0_rgba(231,76,60,0.2)]"
        >
          <AlertCircle size={11} aria-hidden="true" />
          {actionError}
        </div>
      )}
    </div>
  );
}
