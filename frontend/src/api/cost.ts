import { apiClient } from '@api/client';

/* ---------- Types ----------
 *
 * Matches the kernel `service.CostRollup` shape from
 * `airaie-kernel/internal/service/cost_tracking.go`.
 *
 * Endpoint: GET /v0/costs/rollup?from=...&to=...
 */

export interface ToolCostEntry {
  tool_ref: string;
  total_cost: number;
  run_count: number;
  avg_cost: number;
}

export interface WorkflowCostEntry {
  workflow_id: string;
  workflow_name?: string;
  total_cost: number;
  run_count: number;
  avg_cost: number;
}

export interface DailyCostEntry {
  date: string;            // "YYYY-MM-DD"
  total_cost: number;
  run_count: number;
}

export interface CostPeriod {
  from: string;            // RFC3339
  to: string;
}

export interface CostRollup {
  total_cost: number;
  estimated_cost: number;
  run_count: number;
  by_tool?: ToolCostEntry[];
  by_workflow?: WorkflowCostEntry[];
  by_day?: DailyCostEntry[];
  period: CostPeriod;
}

/** Budget shape from `service.BudgetStatus` (`GET /v0/costs/budget`). */
export interface Budget {
  project_id: string;
  monthly_cap: number;
  daily_cap: number;
  alert_threshold: number;
  enabled: boolean;
  updated_at: string;
}

export interface BudgetStatus {
  budget: Budget | null;
  monthly_spend: number;
  daily_spend: number;
  monthly_percent: number;
  daily_percent: number;
  alert_triggered: boolean;
  over_budget: boolean;
}

function toQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** GET /v0/costs/rollup */
export function getCostRollup(opts?: {
  from?: string;
  to?: string;
}): Promise<CostRollup> {
  return apiClient.get<CostRollup>(`/v0/costs/rollup${toQuery(opts ?? {})}`);
}

/** GET /v0/costs/budget */
export function getBudgetStatus(): Promise<BudgetStatus> {
  return apiClient.get<BudgetStatus>('/v0/costs/budget');
}

/* ---------- Pure helpers (exported for unit tests) ---------- */

/** Sort by total_cost descending and return the top N. */
export function topByCost<T extends { total_cost: number }>(
  entries: T[] | undefined,
  n: number
): T[] {
  if (!entries || entries.length === 0) return [];
  return [...entries].sort((a, b) => b.total_cost - a.total_cost).slice(0, n);
}

/**
 * Fill missing days with zero entries so a sparkline has a continuous x-axis.
 * `from` and `to` are inclusive day boundaries (YYYY-MM-DD).
 */
export function fillDailyGaps(
  entries: DailyCostEntry[] | undefined,
  fromISO: string,
  toISO: string
): DailyCostEntry[] {
  const map = new Map<string, DailyCostEntry>();
  for (const e of entries ?? []) map.set(e.date, e);

  const out: DailyCostEntry[] = [];
  const start = new Date(fromISO);
  const end = new Date(toISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return entries ?? [];

  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cur <= stop) {
    const key = cur.toISOString().slice(0, 10);
    out.push(map.get(key) ?? { date: key, total_cost: 0, run_count: 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Format a number as USD with 2 fractional digits, falling back to "$0.00". */
export function formatUSD(n: number | undefined | null): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}
