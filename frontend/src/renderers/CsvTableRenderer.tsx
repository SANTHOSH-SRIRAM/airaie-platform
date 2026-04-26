import { useEffect, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import type { RendererProps } from './types';

// ---------------------------------------------------------------------------
// CsvTableRenderer — fetch a CSV via presigned URL, parse with papaparse
// (dynamically imported), render the first 100 rows as a sticky-header table.
//
// papaparse is dynamically imported inside the effect so the chunk only
// ships when this renderer mounts. Vite splits it into the `render-csv`
// chunk (vite.config.ts manualChunks).
//
// Phase 2a explicitly does not virtualize the table — react-virtual is
// already shipped but a simple "first 100 rows + download full link" is
// adequate for typical CSV outputs (samples.csv, residuals.csv). Larger
// tables can be virtualized in Phase 2b when the perf cost manifests.
// ---------------------------------------------------------------------------

const PREVIEW_ROW_LIMIT = 100;

type CsvRow = Record<string, string | number | boolean | null>;

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ok';
      headers: string[];
      rows: CsvRow[];
      totalRows: number;
      parseErrors: ParseErrorSummary[];
    };

interface ParseErrorSummary {
  row?: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Number-column heuristic: a column is "numeric" if every defined value in
// the preview is a number. Numeric columns get tabular-nums + right-aligned
// formatting.
// ---------------------------------------------------------------------------

function detectNumericColumns(headers: string[], rows: CsvRow[]): Set<string> {
  const numeric = new Set<string>();
  for (const h of headers) {
    let allNumeric = true;
    let hasValue = false;
    for (const row of rows) {
      const v = row[h];
      if (v === undefined || v === null || v === '') continue;
      hasValue = true;
      if (typeof v !== 'number') {
        allNumeric = false;
        break;
      }
    }
    if (hasValue && allNumeric) numeric.add(h);
  }
  return numeric;
}

function formatCell(value: CsvRow[string]): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return value.toString();
    const abs = Math.abs(value);
    if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) {
      return value.toExponential(3);
    }
    return value.toFixed(4).replace(/\.?0+$/, '');
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export default function CsvTableRenderer({ artifact, downloadUrl }: RendererProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

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
        const parseErrors: ParseErrorSummary[] = (result.errors ?? []).slice(0, 5).map((e) => ({
          row: e.row,
          message: e.message,
        }));

        setState({
          status: 'ok',
          headers,
          rows: rows.slice(0, PREVIEW_ROW_LIMIT),
          totalRows: rows.length,
          parseErrors,
        });
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not parse CSV';
        setState({ status: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [downloadUrl]);

  if (state.status === 'loading') {
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

  if (state.status === 'error') {
    return (
      <div
        className="rounded-[8px] border border-[#ffcdd2] bg-[#ffebee] p-[12px] flex items-start gap-[8px] text-[11px] text-[#6b6b6b]"
        role="alert"
      >
        <AlertCircle size={14} className="text-[#e74c3c] shrink-0 mt-[2px]" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#1a1a1a]">Could not load CSV</div>
          <div className="text-[10px] mt-[2px]">{state.message}</div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-[4px] mt-[6px] text-[#1976d2] hover:underline text-[10px]"
          >
            <Download size={10} />
            Download {artifact.name ?? artifact.id}
          </a>
        </div>
      </div>
    );
  }

  const { headers, rows, totalRows, parseErrors } = state;
  const numericCols = detectNumericColumns(headers, rows);
  const truncated = totalRows > PREVIEW_ROW_LIMIT;

  return (
    <div className="rounded-[8px] border border-[#e8e8e8] bg-white overflow-hidden flex flex-col">
      <header className="px-[12px] py-[8px] border-b border-[#f0f0ec] flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold text-[#1a1a1a] truncate">
          {artifact.name ?? 'CSV preview'}
        </h3>
        <span className="text-[10px] text-[#6b6b6b] tabular-nums">
          {truncated ? `Showing ${PREVIEW_ROW_LIMIT} of ${totalRows} rows` : `${totalRows} rows`}
        </span>
      </header>

      {parseErrors.length > 0 && (
        <div
          role="alert"
          className="px-[12px] py-[6px] bg-[#fff3e0] text-[10px] text-[#f57c00] border-b border-[#ffe0b2]"
        >
          <strong>Parse warning:</strong> row {parseErrors[0].row ?? '—'}: {parseErrors[0].message}
          {parseErrors.length > 1 && ` (+${parseErrors.length - 1} more)`}
        </div>
      )}

      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-[10px]" role="table">
          <thead className="sticky top-0 bg-[#fafafa] z-10">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-[8px] py-[6px] text-left font-semibold text-[#6b6b6b] border-b border-[#e8e8e8] whitespace-nowrap ${
                    numericCols.has(h) ? 'text-right tabular-nums' : ''
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="even:bg-[#fafafa]">
                {headers.map((h) => (
                  <td
                    key={h}
                    className={`px-[8px] py-[4px] text-[#1a1a1a] border-b border-[#f0f0ec] ${
                      numericCols.has(h) ? 'text-right tabular-nums' : 'whitespace-nowrap'
                    }`}
                  >
                    {formatCell(row[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="px-[12px] py-[8px] border-t border-[#f0f0ec] bg-[#fafafa] flex items-center justify-between text-[10px]">
        {truncated ? (
          <span className="text-[#6b6b6b]">
            Preview limited to first {PREVIEW_ROW_LIMIT} rows.
          </span>
        ) : (
          <span className="text-[#acacac]">All rows shown.</span>
        )}
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-[4px] text-[#1976d2] hover:underline"
        >
          <Download size={10} />
          Download full CSV
        </a>
      </footer>
    </div>
  );
}
