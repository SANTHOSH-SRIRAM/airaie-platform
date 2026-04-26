import { useMemo, useState } from 'react';
import { RefreshCw, DollarSign } from 'lucide-react';
import { useCostSummary, useBudgetStatus } from '@hooks/useCost';
import {
  type CostRollup,
  type DailyCostEntry,
  fillDailyGaps,
  formatUSD,
  topByCost,
} from '@api/cost';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';
import EmptyState from '@components/ui/EmptyState';

/**
 * Admin → Cost & Usage
 *
 * Reads `/v0/costs/rollup` (project-scoped via X-Project-Id header).
 * No new chart dep — sparkline is a small inline SVG component.
 *
 * TODO(Phase F.2): gate by admin role.
 */

const PRESETS: { label: string; days: number }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function AdminCostPage() {
  const [days, setDays] = useState(30);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [days]);

  const q = useCostSummary(range);
  const budgetQ = useBudgetStatus();
  const summary = q.data;
  const budget = budgetQ.data;

  return (
    <div className="flex flex-col gap-4 p-6 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Cost & Usage</h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            Project spend over the selected period, broken down by tool, workflow, and day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex border border-[#ece9e3] rounded overflow-hidden">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`px-3 h-8 text-[12px] ${
                  p.days === days
                    ? 'bg-brand-primary text-white'
                    : 'bg-white text-[#3a3a3a] hover:bg-[#f5f3ef]'
                }`}
                aria-pressed={p.days === days}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            variant="tertiary"
            size="sm"
            icon={<RefreshCw size={14} className={q.isFetching ? 'animate-spin' : ''} />}
            onClick={() => q.refetch()}
            disabled={q.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiTile
          label="Total cost"
          value={formatUSD(summary?.total_cost)}
          hint={summary && summary.estimated_cost > 0 ? `${formatUSD(summary.estimated_cost)} estimated` : undefined}
          loading={q.isLoading}
        />
        <KpiTile
          label="Runs"
          value={summary ? String(summary.run_count) : '—'}
          loading={q.isLoading}
        />
        <KpiTile
          label="Avg cost / run"
          value={
            summary && summary.run_count > 0
              ? formatUSD(summary.total_cost / summary.run_count)
              : '$0.00'
          }
          loading={q.isLoading}
        />
        <KpiTile
          label="Top tool"
          value={topByCost(summary?.by_tool, 1)[0]?.tool_ref ?? '—'}
          hint={topByCost(summary?.by_tool, 1)[0] ? formatUSD(topByCost(summary?.by_tool, 1)[0]?.total_cost) : undefined}
          loading={q.isLoading}
          mono
        />
      </div>

      {/* Budget */}
      {budget?.budget && (
        <Card>
          <Card.Header>
            <h2 className="text-sm font-semibold text-[#1a1a1a]">Budget</h2>
          </Card.Header>
          <Card.Body className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BudgetBar
              label="Monthly"
              spent={budget.monthly_spend}
              cap={budget.budget.monthly_cap}
              percent={budget.monthly_percent}
              alert={budget.budget.alert_threshold}
              over={budget.over_budget}
            />
            <BudgetBar
              label="Daily"
              spent={budget.daily_spend}
              cap={budget.budget.daily_cap}
              percent={budget.daily_percent}
              alert={budget.budget.alert_threshold}
              over={budget.over_budget}
            />
          </Card.Body>
        </Card>
      )}

      {/* Cost-by-day chart */}
      <Card>
        <Card.Header>
          <h2 className="text-sm font-semibold text-[#1a1a1a]">
            Daily cost — last {days} days
          </h2>
        </Card.Header>
        <Card.Body>
          {q.isLoading ? (
            <div className="h-32 bg-[#fafaf8] rounded animate-pulse" />
          ) : !summary || summary.run_count === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No costs recorded"
              description="No completed runs in this period have a recorded cost."
            />
          ) : (
            <DailyBarChart
              data={fillDailyGaps(summary.by_day, range.from, range.to)}
            />
          )}
        </Card.Body>
      </Card>

      {/* Tool breakdown */}
      <Card>
        <Card.Header>
          <h2 className="text-sm font-semibold text-[#1a1a1a]">Top tools by spend</h2>
        </Card.Header>
        <Card.Body className="p-0">
          <ToolTable summary={summary} loading={q.isLoading} />
        </Card.Body>
      </Card>

      {/* Workflow breakdown */}
      {summary?.by_workflow && summary.by_workflow.length > 0 && (
        <Card>
          <Card.Header>
            <h2 className="text-sm font-semibold text-[#1a1a1a]">By workflow</h2>
          </Card.Header>
          <Card.Body className="p-0">
            <WorkflowTable summary={summary} />
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function KpiTile({
  label,
  value,
  hint,
  loading,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  mono?: boolean;
}) {
  return (
    <Card>
      <Card.Body>
        <div className="text-[11px] uppercase tracking-wide text-[#9b978f]">{label}</div>
        {loading ? (
          <div className="mt-2 h-6 w-24 bg-[#ece9e3] rounded animate-pulse" />
        ) : (
          <>
            <div className={`mt-1 text-[20px] font-semibold text-[#1a1a1a] ${mono ? 'font-mono' : ''} truncate`}>
              {value}
            </div>
            {hint && <div className="mt-1 text-[11px] text-[#6b6b6b]">{hint}</div>}
          </>
        )}
      </Card.Body>
    </Card>
  );
}

function BudgetBar({
  label,
  spent,
  cap,
  percent,
  alert,
  over,
}: {
  label: string;
  spent: number;
  cap: number;
  percent: number;
  alert: number;
  over: boolean;
}) {
  const pct = Math.min(100, Math.max(0, percent * 100));
  const color = over
    ? 'bg-red-500'
    : percent >= alert
      ? 'bg-amber-500'
      : 'bg-emerald-500';
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-[#1a1a1a]">{label}</span>
        <span className="text-[#6b6b6b]">
          {formatUSD(spent)} / {formatUSD(cap)} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="mt-1 h-2 bg-[#ece9e3] rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {over && (
        <div className="mt-1">
          <Badge variant="danger">Over budget</Badge>
        </div>
      )}
    </div>
  );
}

/**
 * Inline SVG bar chart — no chart dep. Renders one bar per day.
 * Width auto-fits container; height fixed at 160px.
 */
function DailyBarChart({ data }: { data: DailyCostEntry[] }) {
  const W = 720;
  const H = 160;
  const PAD = { top: 8, right: 8, bottom: 24, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(0.01, ...data.map((d) => d.total_cost));
  const barW = data.length > 0 ? innerW / data.length : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-40"
        role="img"
        aria-label="Daily cost bar chart"
      >
        {/* Y axis ticks */}
        {[0, 0.5, 1].map((t) => {
          const y = PAD.top + innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#ece9e3" strokeWidth={1} />
              <text x={PAD.left - 4} y={y + 3} textAnchor="end" className="fill-[#9b978f]" fontSize="10">
                {formatUSD(max * t)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = PAD.left + i * barW;
          const h = max > 0 ? (d.total_cost / max) * innerH : 0;
          const y = PAD.top + innerH - h;
          return (
            <g key={d.date}>
              <rect
                x={x + barW * 0.15}
                y={y}
                width={barW * 0.7}
                height={h}
                fill="#1976d2"
                rx={1}
              >
                <title>
                  {d.date}: {formatUSD(d.total_cost)} ({d.run_count} runs)
                </title>
              </rect>
              {/* X axis label every ~7 bars */}
              {data.length > 0 && i % Math.max(1, Math.ceil(data.length / 8)) === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-[#9b978f]"
                  fontSize="10"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ToolTable({ summary, loading }: { summary: CostRollup | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="p-4">
        <div className="h-3 bg-[#ece9e3] rounded w-1/3 mb-2 animate-pulse" />
        <div className="h-3 bg-[#ece9e3] rounded w-1/2 animate-pulse" />
      </div>
    );
  }
  const top = topByCost(summary?.by_tool, 10);
  if (top.length === 0) {
    return <div className="p-6 text-[12px] text-[#9b978f]">No tool spend in this period.</div>;
  }
  return (
    <table className="w-full text-[12px]">
      <thead className="bg-[#fafaf8] text-left text-[11px] uppercase text-[#6b6b6b] tracking-wide">
        <tr>
          <th className="px-4 py-2 font-medium">Tool</th>
          <th className="px-4 py-2 font-medium text-right">Runs</th>
          <th className="px-4 py-2 font-medium text-right">Avg / run</th>
          <th className="px-4 py-2 font-medium text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {top.map((t) => (
          <tr key={t.tool_ref} className="border-t border-[#ece9e3]">
            <td className="px-4 py-2 font-mono text-[11px] text-[#1a1a1a] break-all">{t.tool_ref}</td>
            <td className="px-4 py-2 text-right text-[#3a3a3a]">{t.run_count}</td>
            <td className="px-4 py-2 text-right text-[#6b6b6b]">{formatUSD(t.avg_cost)}</td>
            <td className="px-4 py-2 text-right font-medium text-[#1a1a1a]">{formatUSD(t.total_cost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WorkflowTable({ summary }: { summary: CostRollup }) {
  const top = topByCost(summary.by_workflow, 10);
  return (
    <table className="w-full text-[12px]">
      <thead className="bg-[#fafaf8] text-left text-[11px] uppercase text-[#6b6b6b] tracking-wide">
        <tr>
          <th className="px-4 py-2 font-medium">Workflow</th>
          <th className="px-4 py-2 font-medium text-right">Runs</th>
          <th className="px-4 py-2 font-medium text-right">Avg / run</th>
          <th className="px-4 py-2 font-medium text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {top.map((w) => (
          <tr key={w.workflow_id} className="border-t border-[#ece9e3]">
            <td className="px-4 py-2 text-[#1a1a1a]">
              <div>{w.workflow_name || <span className="text-[#9b978f]">(unnamed)</span>}</div>
              <div className="font-mono text-[10px] text-[#9b978f] break-all">{w.workflow_id}</div>
            </td>
            <td className="px-4 py-2 text-right text-[#3a3a3a]">{w.run_count}</td>
            <td className="px-4 py-2 text-right text-[#6b6b6b]">{formatUSD(w.avg_cost)}</td>
            <td className="px-4 py-2 text-right font-medium text-[#1a1a1a]">{formatUSD(w.total_cost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
