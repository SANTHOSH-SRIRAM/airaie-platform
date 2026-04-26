import { useMemo, useState } from 'react';
import { Download, RefreshCw, Search, X as XIcon } from 'lucide-react';
import { useAuditEvents } from '@hooks/useAudit';
import {
  type AuditEvent,
  type ListAuditEventsParams,
  eventTypeColor,
  exportAuditEvents,
  downloadBlob,
} from '@api/audit';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';
import EmptyState from '@components/ui/EmptyState';
import AuditEventDrawer from '@components/admin/AuditEventDrawer';

/**
 * Admin → Audit Log
 *
 * Filterable, paginated viewer over `/v0/audit/events` with CSV/JSON export.
 *
 * TODO(Phase F.2): gate by admin role (sidebar entry + this page).
 */

const COMMON_EVENT_TYPES = [
  'tool.trust_level.updated',
  'gate.approved',
  'gate.rejected',
  'gate.waived',
  'run.started',
  'run.completed',
  'run.failed',
  'budget.updated',
  'auth.login',
  'auth.register',
];

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [eventType, setEventType] = useState('');
  const [actor, setActor] = useState('');
  const [runId, setRunId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const params: ListAuditEventsParams = useMemo(
    () => ({
      event_type: eventType || undefined,
      actor: actor || undefined,
      run_id: runId || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [eventType, actor, runId, from, to, page],
  );

  const q = useAuditEvents(params);
  const events = q.data?.events ?? [];
  const count = q.data?.count ?? 0;
  const hasNext = events.length === PAGE_SIZE;

  function clearFilters() {
    setEventType('');
    setActor('');
    setRunId('');
    setFrom('');
    setTo('');
    setPage(0);
  }

  async function handleExport(format: 'csv' | 'json') {
    try {
      const blob = await exportAuditEvents({ ...params, limit: 10000, offset: 0, format });
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(blob, `audit-events-${ts}.${format}`);
    } catch (err) {
      // Surface failures inline rather than silently swallow
      // eslint-disable-next-line no-alert
      alert(`Export failed: ${(err as Error).message}`);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Audit Log</h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            Governance trail across runs, gates, tools, and budgets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            icon={<RefreshCw size={14} className={q.isFetching ? 'animate-spin' : ''} />}
            onClick={() => q.refetch()}
            disabled={q.isFetching}
          >
            Refresh
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            icon={<Download size={14} />}
            onClick={() => handleExport('csv')}
          >
            CSV
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            icon={<Download size={14} />}
            onClick={() => handleExport('json')}
          >
            JSON
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <Card.Body className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] text-[#6b6b6b] mb-1">Event type</label>
            <select
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setPage(0); }}
              className="w-full h-8 px-2 text-[12px] border border-[#ece9e3] rounded bg-white text-[#1a1a1a]"
            >
              <option value="">All</option>
              {COMMON_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[#6b6b6b] mb-1">Actor</label>
            <input
              value={actor}
              onChange={(e) => { setActor(e.target.value); setPage(0); }}
              placeholder="user_id or system"
              className="w-full h-8 px-2 text-[12px] border border-[#ece9e3] rounded bg-white text-[#1a1a1a]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#6b6b6b] mb-1">Run ID</label>
            <input
              value={runId}
              onChange={(e) => { setRunId(e.target.value); setPage(0); }}
              placeholder="run_…"
              className="w-full h-8 px-2 text-[12px] border border-[#ece9e3] rounded bg-white text-[#1a1a1a]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#6b6b6b] mb-1">From</label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(0); }}
              className="w-full h-8 px-2 text-[12px] border border-[#ece9e3] rounded bg-white text-[#1a1a1a]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#6b6b6b] mb-1">To</label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(0); }}
              className="w-full h-8 px-2 text-[12px] border border-[#ece9e3] rounded bg-white text-[#1a1a1a]"
            />
          </div>
        </Card.Body>
        {(eventType || actor || runId || from || to) && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<XIcon size={14} />} onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {/* Results */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1a1a1a]">Events</h2>
            <span className="text-[12px] text-[#6b6b6b]">
              {q.isLoading ? 'Loading…' : `${count} on this page`}
            </span>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {q.isLoading ? (
            <SkeletonRows />
          ) : q.isError ? (
            <div className="p-6 text-sm text-red-600">
              Failed to load audit events: {(q.error as Error)?.message ?? 'unknown error'}
            </div>
          ) : events.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Search}
                title="No audit events"
                description="No events match the current filters. Try widening the date range or clearing filters."
              />
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-[#fafaf8] text-left text-[11px] uppercase text-[#6b6b6b] tracking-wide">
                <tr>
                  <th className="px-4 py-2 font-medium">Timestamp</th>
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">Actor</th>
                  <th className="px-4 py-2 font-medium">Subject</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelected(evt)}
                    className="border-t border-[#ece9e3] hover:bg-[#fafaf8] cursor-pointer"
                  >
                    <td className="px-4 py-2 align-top whitespace-nowrap">
                      <time
                        dateTime={evt.created_at}
                        title={new Date(evt.created_at).toLocaleString()}
                        className="text-[#1a1a1a]"
                      >
                        {formatRelative(evt.created_at)}
                      </time>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <Badge variant={eventTypeColor(evt.event_type)}>{evt.event_type}</Badge>
                    </td>
                    <td className="px-4 py-2 align-top font-mono text-[11px] text-[#3a3a3a] break-all">
                      {evt.actor || '—'}
                    </td>
                    <td className="px-4 py-2 align-top font-mono text-[11px] text-[#6b6b6b] break-all">
                      {subjectFor(evt) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card.Body>

        {/* Pagination */}
        {!q.isLoading && events.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#ece9e3]">
            <span className="text-[11px] text-[#6b6b6b]">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + events.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="tertiary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AuditEventDrawer event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-[#ece9e3]">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 animate-pulse">
          <div className="h-3 bg-[#ece9e3] rounded w-24" />
          <div className="h-3 bg-[#ece9e3] rounded w-40" />
          <div className="h-3 bg-[#ece9e3] rounded w-32" />
          <div className="h-3 bg-[#ece9e3] rounded flex-1" />
        </div>
      ))}
    </div>
  );
}

function subjectFor(evt: AuditEvent): string | null {
  return evt.run_id || evt.gate_id || evt.board_id || evt.node_id || null;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const delta = Date.now() - t;
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
