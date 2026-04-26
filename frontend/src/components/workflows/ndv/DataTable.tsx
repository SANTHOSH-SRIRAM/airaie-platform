import { useState, useMemo, useCallback } from 'react';
import { ArrowUp, ArrowDown, Check, Copy } from 'lucide-react';
import { cn } from '@utils/cn';

interface DataTableProps {
  data: Record<string, unknown>;
  maxRows?: number;
}

type SortDir = 'asc' | 'desc';

export default function DataTable({ data, maxRows = 100 }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // Normalize data: if it's an object with array values, treat as column-oriented.
  // Otherwise treat as a single-row key-value table.
  const { columns, rows } = useMemo(() => {
    // Check if data looks like an array of objects (wrapped in a container)
    const values = Object.values(data);
    const keys = Object.keys(data);

    // If the data itself is flat key-value, render as 2-column table
    const isFlat = values.every(
      (v) => v === null || v === undefined || typeof v !== 'object'
    );

    if (isFlat) {
      return {
        columns: ['Key', 'Value'],
        rows: keys.map((k) => ({ Key: k, Value: data[k] })),
      };
    }

    // If values are arrays of the same length, treat as column-oriented
    const allArrays = values.every(Array.isArray);
    if (allArrays && values.length > 0) {
      const len = (values[0] as unknown[]).length;
      const cols = keys;
      const r: Record<string, unknown>[] = [];
      for (let i = 0; i < Math.min(len, maxRows); i++) {
        const row: Record<string, unknown> = {};
        for (const col of cols) {
          row[col] = (data[col] as unknown[])[i];
        }
        r.push(row);
      }
      return { columns: cols, rows: r };
    }

    // Default: show as key-value
    return {
      columns: ['Key', 'Value'],
      rows: keys.map((k) => ({ Key: k, Value: data[k] })),
    };
  }, [data, maxRows]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortColumn];
      const bv = (b as Record<string, unknown>)[sortColumn];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return sorted;
  }, [rows, sortColumn, sortDir]);

  const handleSort = useCallback(
    (col: string) => {
      if (sortColumn === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(col);
        setSortDir('asc');
      }
    },
    [sortColumn]
  );

  const handleCopyCell = useCallback((cellKey: string, value: unknown) => {
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCell(cellKey);
      setTimeout(() => setCopiedCell(null), 1500);
    });
  }, []);

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#949494]">No data to display</div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-[#eceae4]">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#eceae4] bg-[#f7f7f5]">
            {columns.map((col) => (
              <th
                key={col}
                className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium text-[#1a1a1a] hover:bg-[#efefef]"
                onClick={() => handleSort(col)}
              >
                <span className="flex items-center gap-1">
                  {col}
                  {sortColumn === col &&
                    (sortDir === 'asc' ? (
                      <ArrowUp size={10} />
                    ) : (
                      <ArrowDown size={10} />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-[#eceae4] last:border-b-0 hover:bg-[#fafaf8]"
            >
              {columns.map((col) => {
                const cellKey = `${ri}-${col}`;
                return (
                  <td
                    key={col}
                    className="group relative max-w-[240px] truncate px-3 py-1.5 text-[#1a1a1a]"
                  >
                    <CellValue value={(row as Record<string, unknown>)[col]} />
                    <button
                      onClick={() => handleCopyCell(cellKey, (row as Record<string, unknown>)[col])}
                      className="invisible absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#949494] hover:text-[#1a1a1a] group-hover:visible"
                      aria-label="Copy value"
                    >
                      {copiedCell === cellKey ? (
                        <Check size={10} />
                      ) : (
                        <Copy size={10} />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-[#949494] italic">null</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-[10px] font-medium',
          value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        )}
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === 'number') {
    return <span className="font-mono text-blue-600">{value.toLocaleString()}</span>;
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return (
      <span className="font-mono text-[#949494]" title={json}>
        {json.length > 60 ? json.slice(0, 60) + '...' : json}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}
