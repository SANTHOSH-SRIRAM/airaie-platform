import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@utils/cn';
import { useCard, useCardEvidence, cardKeys } from '@hooks/useCards';
import { useBoard } from '@hooks/useBoards';
import { usePlan, planKeys } from '@hooks/usePlans';
import { formatRelativeTime } from '@utils/format';
import type { CardStatus } from '@/types/card';
import type { BoardMode } from '@/types/board';

// ---------------------------------------------------------------------------
// Display config
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<CardStatus, { dot: string; label: string }> = {
  draft: { dot: 'bg-[#9e9e9e]', label: 'Draft' },
  ready: { dot: 'bg-[#2196f3]', label: 'Ready to run' },
  queued: { dot: 'bg-[#ff9800]', label: 'Queued' },
  running: { dot: 'bg-[#2196f3] animate-pulse', label: 'Running' },
  completed: { dot: 'bg-[#4caf50]', label: 'Completed' },
  failed: { dot: 'bg-[#e74c3c]', label: 'Failed' },
  blocked: { dot: 'bg-[#ff9800]', label: 'Blocked' },
  skipped: { dot: 'bg-[#9e9e9e] opacity-50', label: 'Skipped' },
};

function modeText(mode: BoardMode | undefined): string {
  if (mode === 'explore') return 'Explore mode';
  if (mode === 'study') return 'Study mode';
  if (mode === 'release') return 'Release mode';
  return '— mode';
}

// ---------------------------------------------------------------------------
// ThisCardStatusPill — bottom-of-sidebar live status block while on the
// `/cards/:cardId` route. Shows status dot + Mode + counts (KPIs / runs /
// gates) + last-activity relative time. The relative time updates once
// per minute so it doesn't churn the entire sidebar; the rest of the
// data is live via React Query subscriptions.
// ---------------------------------------------------------------------------

interface ThisCardStatusPillProps {
  cardId: string;
}

export default function ThisCardStatusPill({ cardId }: ThisCardStatusPillProps) {
  const queryClient = useQueryClient();
  const { data: card } = useCard(cardId);
  const { data: board } = useBoard(card?.board_id);
  const { data: plan } = usePlan(cardId);
  const { data: evidence } = useCardEvidence(cardId);

  // ── Tick: re-render every 60s so the relative time string drifts ────
  // We use a numeric tick rather than re-fetching anything; React Query
  // subscriptions handle their own refetch cadence. The Math.floor on the
  // current minute means consecutive renders within the same minute use
  // the same value, which keeps useMemo stable.
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 60000));
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick(Math.floor(Date.now() / 60000));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const lastActivity = useMemo(() => {
    if (!card) return null;
    return formatRelativeTime(card.updated_at);
    // tick is intentionally a dep — drives the once-per-minute refresh.
  }, [card, tick]);

  // ── Sync — invalidates React Query cache for card + plan + evidence ──
  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cardKeys.detail(cardId) }),
        queryClient.invalidateQueries({ queryKey: cardKeys.evidence(cardId) }),
        queryClient.invalidateQueries({ queryKey: planKeys.detail(cardId) }),
      ]);
    } finally {
      // Brief delay so users see the spinner; React Query refetches are
      // typically <50ms which would be jarring otherwise.
      setTimeout(() => setSyncing(false), 250);
    }
  };

  if (!card) {
    return (
      <div className="flex flex-col gap-[6px] px-[8px] py-[10px] rounded-[8px] bg-[#fafafa]">
        <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
          This Card Status
        </span>
        <span className="text-[10px] text-[#acacac]">Loading…</span>
      </div>
    );
  }

  const statusCfg = STATUS_DOT[card.status] ?? STATUS_DOT.draft;
  const kpiCount = card.kpis?.length ?? 0;
  // Run count is approximated from evidence rows that carry a `run_id`.
  // The "useGates" hook is not wired on the frontend yet (08-RESEARCH §"Open
  // questions"); we display 0 until 08-02 ships the gate hooks. This is the
  // graceful-degradation path the research doc explicitly calls for.
  const evidenceWithRunId = (evidence ?? []).filter((e) => !!e.run_id);
  const runCount = new Set(evidenceWithRunId.map((e) => e.run_id)).size;
  // useGates frontend hook is not yet shipped (research doc §"Open questions"
  // resolved during design"). 08-02 wires real gate counts; until then we
  // display 0 — the graceful-degradation path explicitly called for.
  const gateCount: number = 0;

  return (
    <div className="flex flex-col gap-[8px] px-[10px] py-[12px] rounded-[8px] bg-[#fafafa] border border-[#f0f0ec]">
      {/* Section header + Sync button */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
          This Card Status
        </span>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          aria-label="Refresh card status"
          title="Refresh"
          className={cn(
            'p-[3px] rounded-[4px] text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f0f0ec] transition-colors',
            syncing && 'opacity-60 cursor-not-allowed',
          )}
        >
          {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        </button>
      </div>

      {/* Status dot + label */}
      <div className="flex items-center gap-[6px]">
        <span className={cn('w-[8px] h-[8px] rounded-full shrink-0', statusCfg.dot)} />
        <span className="text-[12px] font-medium text-[#1a1a1a]">{statusCfg.label}</span>
      </div>

      {/* Mode label */}
      <span className="text-[11px] text-[#f57c00] font-medium">
        {modeText(board?.mode)}
      </span>

      {/* Counts: KPIs · runs · gates */}
      <div className="text-[10px] text-[#6b6b6b] leading-[14px]">
        <span>{kpiCount} {kpiCount === 1 ? 'KPI' : 'KPIs'}</span>
        <span className="mx-[4px] text-[#d0d0d0]">·</span>
        <span>{runCount} {runCount === 1 ? 'run' : 'runs'}</span>
        <span className="mx-[4px] text-[#d0d0d0]">·</span>
        <span>{gateCount} {gateCount === 1 ? 'gate' : 'gates'}</span>
      </div>

      {/* Plan presence — small auxiliary signal */}
      {plan && (
        <span className="text-[10px] text-[#acacac] truncate">
          Plan: {plan.id.slice(0, 12)}
        </span>
      )}

      {/* Last activity (relative, refreshed once per minute) */}
      {lastActivity && (
        <span className="text-[10px] text-[#acacac]">Updated {lastActivity}</span>
      )}
    </div>
  );
}
