import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertCircle } from 'lucide-react';
import { useStreamingResiduals } from '@hooks/useStreamingResiduals';
import type { ResidualPoint } from '@utils/residualParser';

// ---------------------------------------------------------------------------
// StreamingResidualsChart — live-updating line chart of solver residuals
// during a Run. Subscribes to the run's SSE stream via
// useStreamingResiduals, parses log_line events for solver output, plots
// per-residual-name series with a log-Y axis (CFD/FEA residuals span
// orders of magnitude).
//
// Phase 9 Plan 09-02 §2E.1 (2026-05-01).
//
// Standalone component (NOT registry-mounted) — call sites pass `runId`
// directly. Registry integration is deferred per the plan: streaming
// doesn't fit the registry's per-artifact model cleanly.
//
// Usage:
//   <StreamingResidualsChart runId={runId} />
// ---------------------------------------------------------------------------

interface Props {
  /** Run id whose SSE stream to subscribe to. Pass null when no run is active. */
  runId: string | null;
  /** Optional title override; default "Solver residuals". */
  title?: string;
  /** Optional class name for outer container. */
  className?: string;
}

// Stable color palette for residual series. Cycled by name index when more
// fields exist than colors.
const SERIES_COLORS = [
  '#1976d2', // blue (Ux)
  '#43a047', // green (Uy)
  '#fb8c00', // orange (Uz)
  '#e53935', // red (p)
  '#8e24aa', // purple (k)
  '#00897b', // teal (omega)
  '#fdd835', // yellow (epsilon)
  '#6d4c41', // brown
];

function colorFor(_name: string, index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

export default function StreamingResidualsChart({ runId, title = 'Solver residuals', className }: Props) {
  const { series, isStreaming, error, totalPoints } = useStreamingResiduals(runId);
  const [logY, setLogY] = useState(true);

  // Recharts wants a single array of rows; we widen the per-series points
  // into a wide-format `[{iteration, Ux, Uy, p, …}]` keyed by iteration.
  const { rows, names } = useMemo(() => merge(series), [series]);

  const hasData = rows.length > 0;

  return (
    <div
      className={`rounded-[10px] border border-[#e8e8e8] bg-white p-[12px] ${className ?? ''}`}
      data-testid="streaming-residuals-chart"
    >
      <div className="mb-[8px] flex items-center justify-between">
        <div className="flex items-center gap-[6px] text-[12px] font-medium text-[#1a1a1a]">
          <Activity size={14} className="text-[#43a047]" />
          {title}
          {isStreaming ? (
            <span className="ml-[6px] inline-flex items-center gap-[4px] rounded-full bg-green-50 px-[6px] py-[1px] text-[10px] font-medium text-green-700">
              <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-green-500" />
              Live
            </span>
          ) : (
            <span className="ml-[6px] text-[10px] text-[#acacac]">idle</span>
          )}
        </div>
        <div className="flex items-center gap-[8px] text-[10px] text-[#6b6b6b]">
          <span className="tabular-nums">{totalPoints} points</span>
          <button
            type="button"
            onClick={() => setLogY((v) => !v)}
            className="rounded-md border border-[#e8e8e8] px-[6px] py-[1px] hover:bg-[#f5f5f0]"
            title="Toggle linear / logarithmic Y axis"
          >
            {logY ? 'log Y' : 'linear Y'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex h-[200px] items-center justify-center gap-[6px] text-[11px] text-[#cc3326]">
          <AlertCircle size={14} />
          {error}
        </div>
      ) : !hasData ? (
        <div className="flex h-[200px] items-center justify-center text-[11px] text-[#acacac]">
          {isStreaming ? 'Waiting for solver residuals…' : 'No residual data.'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eceae4" />
            <XAxis
              dataKey="iteration"
              type="number"
              tick={{ fontSize: 10, fill: '#6b6b6b' }}
              label={{ value: 'iteration', position: 'insideBottomRight', offset: -2, fontSize: 10, fill: '#6b6b6b' }}
            />
            <YAxis
              scale={logY ? 'log' : 'linear'}
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: '#6b6b6b' }}
              tickFormatter={(v: number) => (typeof v === 'number' ? v.toExponential(0) : String(v))}
              allowDataOverflow={false}
            />
            <Tooltip
              formatter={(v: unknown) => (typeof v === 'number' ? v.toExponential(2) : String(v))}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
            {names.map((name, idx) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colorFor(name, idx)}
                strokeWidth={1.2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pure helper — merge per-series points into recharts wide format keyed by
// iteration. Exported for unit tests.
// ---------------------------------------------------------------------------

export function merge(series: Record<string, ResidualPoint[]>): {
  rows: Array<Record<string, number>>;
  names: string[];
} {
  const names = Object.keys(series);
  if (names.length === 0) return { rows: [], names: [] };

  // Build the union of iteration indices, sorted ascending.
  const iterSet = new Set<number>();
  for (const name of names) {
    for (const p of series[name]) iterSet.add(p.iteration);
  }
  const iterations = Array.from(iterSet).sort((a, b) => a - b);

  // For each iteration, find each name's value at that iteration (if any).
  const valueByName: Record<string, Map<number, number>> = {};
  for (const name of names) {
    const map = new Map<number, number>();
    for (const p of series[name]) map.set(p.iteration, p.value);
    valueByName[name] = map;
  }

  const rows = iterations.map((iter) => {
    const row: Record<string, number> = { iteration: iter };
    for (const name of names) {
      const v = valueByName[name].get(iter);
      if (v !== undefined) row[name] = v;
    }
    return row;
  });

  return { rows, names };
}
