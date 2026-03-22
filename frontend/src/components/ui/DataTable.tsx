import { cn } from '@utils/cn';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, data, onRowClick, emptyMessage = 'No data available', className,
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-cds-layer-01 border-b border-cds-border-subtle">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('h-12 px-4 text-left text-xs text-cds-text-primary font-semibold uppercase tracking-wider', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-16 px-4 text-center text-sm text-cds-text-secondary">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-cds-border-subtle bg-cds-layer-02 transition-colors duration-100',
                  onRowClick && 'cursor-pointer hover:bg-cds-layer-hover-02'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('h-12 px-4 text-sm text-cds-text-secondary', col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
