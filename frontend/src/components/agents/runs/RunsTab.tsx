import { useMemo } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { cn } from '@utils/cn';

/* ---------- Types ---------- */

export interface RunRow {
  id: string;
  status: string;
  cost_actual?: number;
  started_at?: string;
  completed_at?: string;
}

interface RunsTabProps {
  runs: RunRow[];
  agentName: string;
  versionLabel?: string;
  versionStatus?: string;
}

/* ---------- Decorative copy (module-scope; mirrors EvalTab CASE_SUBTITLES pattern) ---------- */

const HERO_SUBTITLE =
  'This layout reorganizes the runs page into a dashboard-like command center: top-level KPIs first, grouped execution cards second, and summary insights pinned to the side.';

const TODAY_SECTION_SUBTITLE =
  'Recent executions are shown as richer cards with inline trace previews and compact metrics.';

const EARLIER_SECTION_SUBTITLE =
  'Archived executions are compressed into a lighter list with quick access to the same stats.';

const DEFAULT_RUN_DESCRIPTION =
  'Manual run completed instantly with no external tools invoked.';

const DEFAULT_TRACE_PREVIEW =
  'Input parsed → word totals generated → response returned.';

const DEFAULT_CURRENT_STATE_TITLE = 'Agent ready for more tests';
const DEFAULT_CURRENT_STATE_BODY =
  'Use Playground for ad-hoc runs or open Evals for structured benchmarking.';

/* ---------- Helpers ---------- */

function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTimestamp(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(run: RunRow): string {
  if (run.started_at && run.completed_at) {
    const ms =
      new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
    if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
    const s = Math.round(ms / 1000);
    return `${s}s`;
  }
  return '0s';
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/* ---------- Status pill (inline; no new Badge variant) ---------- */

function StatusPill({ status }: { status: string }) {
  const upper = (status ?? '').toUpperCase();
  const base =
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium';

  if (upper === 'SUCCEEDED') {
    return (
      <span className={cn(base, 'bg-status-success-bg text-status-success-text')}>
        <span aria-hidden="true">●</span>
        Succeeded
      </span>
    );
  }
  if (upper === 'FAILED') {
    return (
      <span className={cn(base, 'bg-status-danger-bg text-status-danger-text')}>
        <span aria-hidden="true">●</span>
        Failed
      </span>
    );
  }
  if (upper === 'RUNNING') {
    return (
      <span className={cn(base, 'bg-status-info-bg text-status-info-text')}>
        <span aria-hidden="true">●</span>
        Running
      </span>
    );
  }
  return (
    <span className={cn(base, 'bg-brand-primary-muted text-content-secondary')}>
      {titleCase(upper)}
    </span>
  );
}

/* ---------- Small UI bits ---------- */

function KpiCard({
  testId,
  label,
  value,
  accent = false,
  mono = false,
  sub,
}: {
  testId: string;
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
  sub?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-border-subtle bg-card-bg px-4 py-4"
    >
      <p className="text-2xs font-semibold uppercase tracking-wider text-content-secondary">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold leading-tight',
          accent ? 'text-brand-primary' : 'text-content-primary',
          mono && 'font-mono',
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-content-secondary">{sub}</p>
      )}
    </div>
  );
}

function MiniStat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-semibold uppercase tracking-wider text-content-secondary">
        {label}
      </p>
      <p className={cn('mt-1 text-sm font-semibold text-content-primary truncate', valueClassName)}>
        {value}
      </p>
    </div>
  );
}

/* ---------- Component ---------- */

export default function RunsTab({
  runs,
  agentName: _agentName,
  versionLabel: _versionLabel,
  versionStatus: _versionStatus,
}: RunsTabProps) {
  // Partition into today vs earlier buckets.
  const { todayRuns, archivedRuns } = useMemo(() => {
    const today: RunRow[] = [];
    const earlier: RunRow[] = [];
    for (const r of runs) {
      const ts = r.started_at ?? r.completed_at;
      if (isToday(ts)) today.push(r);
      else earlier.push(r);
    }
    return { todayRuns: today, archivedRuns: earlier };
  }, [runs]);

  // KPI values.
  const { total, todayCount, avgCostLabel } = useMemo(() => {
    const t = runs.length;
    const tc = todayRuns.length;
    const sum = runs.reduce((acc, r) => acc + (r.cost_actual ?? 0), 0);
    const avg = t > 0 ? sum / t : 0;
    return {
      total: t,
      todayCount: tc,
      avgCostLabel: `$${avg.toFixed(4)}`,
    };
  }, [runs, todayRuns]);

  // Health check placeholder until backend exposes a real endpoint.
  const healthCheckLabel = '2/5';

  const hasRuns = runs.length > 0;

  return (
    <div
      data-testid="runs-tab"
      className="flex flex-col h-full overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-4xl space-y-10 px-2 py-2">
        {/* Header block */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-content-secondary">
              Runs for this agent
            </p>
            <h1 className="text-2xl font-semibold text-content-primary leading-tight">
              Execution queue overview
            </h1>
            <p className="text-sm text-content-secondary max-w-2xl leading-relaxed">
              {HERO_SUBTITLE}
            </p>
          </div>

          {/* Current State card */}
          <div className="rounded-xl border border-border-subtle bg-card-bg px-4 py-3 max-w-[280px] shrink-0">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-content-secondary" />
              <p className="text-sm font-semibold text-content-primary">
                {DEFAULT_CURRENT_STATE_TITLE}
              </p>
            </div>
            <p className="mt-1 text-xs text-content-secondary leading-relaxed">
              {DEFAULT_CURRENT_STATE_BODY}
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            testId="runs-kpi-total"
            label="Total runs"
            value={String(total)}
          />
          <KpiCard
            testId="runs-kpi-today"
            label="Today"
            value={String(todayCount)}
            accent
          />
          <KpiCard
            testId="runs-kpi-avg-cost"
            label="Avg cost/run"
            value={avgCostLabel}
            accent
            mono
          />
          <KpiCard
            testId="runs-kpi-health"
            label="Health check"
            value={healthCheckLabel}
            sub="Builder setup still incomplete"
          />
        </div>

        {!hasRuns ? (
          <div className="py-8">
            <p className="text-center text-sm text-content-placeholder">
              No runs yet. Trigger one from the Playground tab.
            </p>
          </div>
        ) : (
          <>
            {/* TODAY section */}
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-content-secondary">
                    Today
                  </p>
                  <p className="text-xs text-content-secondary max-w-md leading-relaxed">
                    {TODAY_SECTION_SUBTITLE}
                  </p>
                </div>
                <span className="rounded-full bg-brand-primary-muted px-3 py-1 text-xs text-content-secondary shrink-0">
                  {todayCount} {todayCount === 1 ? 'run' : 'runs'}
                </span>
              </div>

              {todayRuns.length === 0 ? (
                <p className="text-sm text-content-placeholder">No runs today.</p>
              ) : (
                <div className="space-y-3">
                  {todayRuns.map((run) => {
                    const ts = run.started_at ?? run.completed_at;
                    const upper = (run.status ?? '').toUpperCase();
                    const statusClass =
                      upper === 'SUCCEEDED'
                        ? 'text-status-success'
                        : upper === 'FAILED'
                          ? 'text-status-danger'
                          : 'text-content-primary';
                    const statusLabel = titleCase(upper) || '—';

                    return (
                      <div
                        key={run.id}
                        data-testid="run-card"
                        className="rounded-2xl border border-border-subtle bg-card-bg p-5"
                      >
                        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                          {/* Left: main content */}
                          <div className="min-w-0 space-y-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-mono text-sm text-content-primary truncate">
                                  {run.id}
                                </span>
                                <StatusPill status={run.status} />
                              </div>
                              <p className="text-xs text-content-secondary">
                                {formatTimestamp(ts)}
                              </p>
                            </div>

                            <p className="text-sm text-content-secondary">
                              {DEFAULT_RUN_DESCRIPTION}
                            </p>

                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-content-secondary">
                              <span>
                                Cost{' '}
                                <span className="ml-1 font-mono font-semibold text-content-primary">
                                  ${(run.cost_actual ?? 0).toFixed(4)}
                                </span>
                              </span>
                              <span>
                                Duration{' '}
                                <span className="ml-1 font-mono font-semibold text-content-primary">
                                  {formatDuration(run)}
                                </span>
                              </span>
                              <span>
                                Tools{' '}
                                <span className="ml-1 font-semibold text-content-primary">
                                  0
                                </span>
                              </span>
                            </div>

                            <div className="rounded-lg bg-surface-hover px-4 py-3">
                              <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-content-secondary">
                                Trace preview
                              </p>
                              <p className="mt-1 text-xs text-content-secondary leading-relaxed">
                                {DEFAULT_TRACE_PREVIEW}
                              </p>
                            </div>
                          </div>

                          {/* Right: 2x2 mini-grid */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:min-w-[180px] sm:border-l sm:border-border-subtle sm:pl-5">
                            <MiniStat
                              label="Status"
                              value={statusLabel}
                              valueClassName={statusClass}
                            />
                            <MiniStat label="Mode" value="Manual" />
                            <MiniStat label="Messages" value="1" />
                            <MiniStat label="Policies" value="0" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* EARLIER section */}
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-content-secondary">
                    Earlier
                  </p>
                  <p className="text-xs text-content-secondary max-w-md leading-relaxed">
                    {EARLIER_SECTION_SUBTITLE}
                  </p>
                </div>
                <span className="rounded-full bg-brand-primary-muted px-3 py-1 text-xs text-content-secondary shrink-0">
                  {archivedRuns.length} archived
                </span>
              </div>

              {archivedRuns.length === 0 ? (
                <p className="text-sm text-content-placeholder">No archived runs.</p>
              ) : (
                <div className="space-y-2">
                  {archivedRuns.map((run) => {
                    const ts = run.started_at ?? run.completed_at;
                    const upper = (run.status ?? '').toUpperCase();
                    const statusLabel = titleCase(upper) || '—';
                    const cost = run.cost_actual ?? 0;
                    return (
                      <div
                        key={run.id}
                        data-testid="archive-row"
                        className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-card-bg px-4 py-3 hover:bg-surface-hover transition-colors"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-mono text-sm font-semibold text-content-primary truncate">
                            {run.id}
                          </p>
                          <p className="text-xs text-content-secondary truncate">
                            {formatTimestamp(ts)} · {statusLabel} · ${cost.toFixed(4)} · 0 tools
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-content-placeholder shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
