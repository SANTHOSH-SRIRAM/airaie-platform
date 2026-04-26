import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, Loader2, Table as TableIcon } from 'lucide-react';
import { lazy, Suspense } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RendererProps } from './types';

// ---------------------------------------------------------------------------
// CsvChartRenderer — fetch a CSV via presigned URL, parse with papaparse
// (dynamically imported), render as a recharts line chart (or scatter for
// parameter_sweep + pareto.csv).
//
// Heuristic for chart shape:
//   - First column → X axis. Treated as numeric if every value parses as
//     number; else string (categorical).
//   - All other numeric columns → Y series (one Line per column).
//   - parameter_sweep + 2 numeric columns + a name like pareto.* → ScatterChart.
//
// "Open as table instead" toggle falls through to CsvTableRenderer (Task 5)
// for the same artifact, so the user can always escape an awkward chart.
//
// papaparse + recharts: papaparse is dynamically imported (chunk: render-csv);
// recharts ships in the existing `ui` chunk so direct imports are fine.
// ---------------------------------------------------------------------------

const PARAMETER_SWEEP_INTENT = 'parameter_sweep';
const SERIES_COLORS = [
  '#1976d2', // execute blue
  '#f57c00', // govern orange
  '#7b1fa2', // configure purple
  '#388e3c',
  '#d32f2f',
  '#0097a7',
  '#5d4037',
  '#616161',
];

type CsvRow = Record<string, string | number | boolean | null>;

type ParseState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ok';
      headers: string[];
      rows: CsvRow[];
    };

const TableFallback = lazy(() => import('./CsvTableRenderer'));

// ---------------------------------------------------------------------------
// Numeric-column detection — same heuristic as CsvTableRenderer but reused
// here because chart rendering depends critically on the X axis being
// numeric vs categorical.
// ---------------------------------------------------------------------------

function isNumericColumn(rows: CsvRow[], col: string): boolean {
  let hasValue = false;
  for (const row of rows) {
    const v = row[col];
    if (v === undefined || v === null || v === '') continue;
    hasValue = true;
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  }
  return hasValue;
}

function pickSeries(headers: string[], rows: CsvRow[]): {
  xCol: string;
  ySeries: string[];
  xIsNumeric: boolean;
} {
  if (headers.length === 0) {
    return { xCol: '', ySeries: [], xIsNumeric: false };
  }
  const xCol = headers[0];
  const xIsNumeric = isNumericColumn(rows, xCol);
  const ySeries = headers.slice(1).filter((h) => isNumericColumn(rows, h));
  return { xCol, ySeries, xIsNumeric };
}

function looksLikePareto(name: string | undefined): boolean {
  if (!name) return false;
  return /pareto/i.test(name);
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export default function CsvChartRenderer(props: RendererProps) {
  const { artifact, downloadUrl, intent } = props;
  const [parse, setParse] = useState<ParseState>({ status: 'loading' });
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setParse({ status: 'loading' });

    (async () => {
      try {
        const Papa = (await import('papaparse')).default;
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        if (cancelled) return;

        const result = Papa.parse<CsvRow>(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        if (cancelled) return;

        const rows = result.data ?? [];
        const headers = result.meta.fields ?? (rows[0] ? Object.keys(rows[0]) : []);
        setParse({ status: 'ok', headers, rows });
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not parse CSV';
        setParse({ status: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [downloadUrl]);

  // Pareto special-case detection (separate so the hook order is stable).
  const isParetoView = useMemo(() => {
    if (parse.status !== 'ok') return false;
    if (intent?.intent_type !== PARAMETER_SWEEP_INTENT) return false;
    if (!looksLikePareto(artifact.name)) return false;
    const { ySeries, xIsNumeric } = pickSeries(parse.headers, parse.rows);
    return xIsNumeric && ySeries.length >= 1;
  }, [parse, intent?.intent_type, artifact.name]);

  if (showTable) {
    // User toggled to table view — fall through to CsvTableRenderer.
    return (
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center justify-end">
          <ToggleButton
            label="Switch to chart"
            icon={<BarChart3 size={11} />}
            onClick={() => setShowTable(false)}
          />
        </div>
        <Suspense
          fallback={
            <div className="rounded-[8px] border border-[#e8e8e8] bg-white p-[16px] text-[11px] text-[#6b6b6b]">
              Loading table…
            </div>
          }
        >
          <TableFallback {...props} />
        </Suspense>
      </div>
    );
  }

  if (parse.status === 'loading') {
    return (
      <div
        className="rounded-[8px] border border-[#e8e8e8] bg-white p-[16px] flex items-center gap-[8px] text-[11px] text-[#6b6b6b]"
        role="status"
      >
        <Loader2 size={14} className="animate-spin text-[#acacac]" />
        Loading {artifact.name ?? 'CSV'}…
      </div>
    );
  }

  if (parse.status === 'error') {
    return (
      <div
        className="rounded-[8px] border border-[#ffcdd2] bg-[#ffebee] p-[12px] flex items-start gap-[8px] text-[11px] text-[#6b6b6b]"
        role="alert"
      >
        <AlertCircle size={14} className="text-[#e74c3c] shrink-0 mt-[2px]" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#1a1a1a]">Could not load chart</div>
          <div className="text-[10px] mt-[2px]">{parse.message}</div>
        </div>
      </div>
    );
  }

  const { headers, rows } = parse;
  const { xCol, ySeries } = pickSeries(headers, rows);

  if (ySeries.length === 0) {
    // Nothing chartable — encourage table view.
    return (
      <div className="rounded-[8px] border border-[#e8e8e8] bg-white p-[12px] text-[11px] text-[#6b6b6b]">
        <div className="font-medium text-[#1a1a1a] mb-[4px]">
          No numeric Y series detected
        </div>
        <p className="text-[10px] mb-[8px]">
          This CSV has no numeric columns past the first; chart heuristic can't pick series.
        </p>
        <ToggleButton
          label="Open as table instead"
          icon={<TableIcon size={11} />}
          onClick={() => setShowTable(true)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[8px] border border-[#e8e8e8] bg-white p-[12px] flex flex-col gap-[8px]">
      <header className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold text-[#1a1a1a] truncate">
          {artifact.name ?? 'CSV chart'}
        </h3>
        <ToggleButton
          label="Open as table instead"
          icon={<TableIcon size={11} />}
          onClick={() => setShowTable(true)}
        />
      </header>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          {isParetoView ? (
            <ScatterChart
              margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
              data={rows as Array<Record<string, unknown>>}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
              <XAxis
                type="number"
                dataKey={xCol}
                name={xCol}
                tick={{ fontSize: 10, fill: '#6b6b6b' }}
                label={{ value: xCol, position: 'insideBottom', offset: -8, style: { fontSize: 10, fill: '#6b6b6b' } }}
              />
              <YAxis
                type="number"
                dataKey={ySeries[0]}
                name={ySeries[0]}
                tick={{ fontSize: 10, fill: '#6b6b6b' }}
                label={{ value: ySeries[0], angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#6b6b6b' } }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={rows as Array<Record<string, unknown>>} fill="#1976d2" />
            </ScatterChart>
          ) : (
            <LineChart
              data={rows as Array<Record<string, unknown>>}
              margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
              <XAxis
                dataKey={xCol}
                tick={{ fontSize: 10, fill: '#6b6b6b' }}
                label={{ value: xCol, position: 'insideBottom', offset: -8, style: { fontSize: 10, fill: '#6b6b6b' } }}
              />
              <YAxis tick={{ fontSize: 10, fill: '#6b6b6b' }} />
              <Tooltip />
              {ySeries.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {ySeries.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  name={s}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function ToggleButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-[4px] h-[24px] px-[8px] rounded-[6px] bg-[#f5f5f3] hover:bg-[#ebebe8] text-[10px] text-[#1a1a1a] font-medium transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
