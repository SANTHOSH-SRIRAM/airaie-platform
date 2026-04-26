import { useMemo, useState } from 'react';
import { cn } from '@utils/cn';
import { useCard } from '@hooks/useCards';
import {
  useCardEvidenceList,
  useGateEvidence,
} from '@hooks/useGates';
import {
  groupEvidenceByPassFail,
  formatEvidenceSummary,
  type EvidenceSummary,
} from '@utils/evidenceAggregation';
import type { GateEvidence } from '@api/gates';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import AddEvidenceForm from './AddEvidenceForm';
import EvidenceDetailDrawer from './EvidenceDetailDrawer';

// ---------------------------------------------------------------------------
// EvidencePanel (D4) — unified gate-or-card view
//
// Accepts EXACTLY one of `cardId` / `gateId`. The component decides which
// hook to call. Manual-add form only renders for the card-scoped variant.
// ---------------------------------------------------------------------------

type EvidenceFilter = 'all' | 'passed' | 'failed' | 'pending';

interface BaseProps {
  /** Optional title override; defaults vary by scope. */
  title?: string;
  /** When true, hide the manual-add form even in card scope. */
  readOnly?: boolean;
}

interface CardScopeProps extends BaseProps {
  cardId: string;
  gateId?: never;
}

interface GateScopeProps extends BaseProps {
  gateId: string;
  cardId?: never;
}

export type EvidencePanelProps = CardScopeProps | GateScopeProps;

export default function EvidencePanel(props: EvidencePanelProps) {
  const { title, readOnly } = props;
  const isCardScope = 'cardId' in props && !!props.cardId;
  const cardId = isCardScope ? (props as CardScopeProps).cardId : undefined;
  const gateId = !isCardScope ? (props as GateScopeProps).gateId : undefined;

  // Card metadata (for auto-refresh on running cards). Only fetched in card
  // scope; safe-guarded by useCard's enabled flag (it only fires when id set).
  const { data: card } = useCard(cardId);
  const isRunning = card?.status === 'running' || card?.status === 'queued';

  // Pick the right query
  const cardQ = useCardEvidenceList(cardId);
  const gateQ = useGateEvidence(gateId);
  const active = isCardScope ? cardQ : gateQ;

  const rows = active.data ?? [];
  const summary = useMemo(() => groupEvidenceByPassFail(rows), [rows]);

  const [filter, setFilter] = useState<EvidenceFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState<GateEvidence | null>(null);

  const filtered = useMemo(() => filterRows(rows, filter), [rows, filter]);

  // ---- States --------------------------------------------------------------

  if (active.isLoading) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
        <span className="ml-[8px] text-[12px] text-[#acacac]">Loading evidence...</span>
      </div>
    );
  }

  if (active.error) {
    return (
      <div className="flex items-center justify-center py-[40px] gap-[8px]">
        <AlertCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">Failed to load evidence</span>
        <button
          type="button"
          onClick={() => active.refetch()}
          className="text-[11px] text-[#2196f3] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ---- Render --------------------------------------------------------------

  const headerLabel = title ?? (isCardScope ? 'Evidence' : 'Gate Evidence');

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
            {headerLabel}
          </span>
          <span className="h-[20px] px-[8px] rounded-full bg-[#f0f0ec] text-[10px] font-medium text-[#6b6b6b] inline-flex items-center">
            {rows.length}
          </span>
        </div>

        <div className="flex items-center gap-[6px]">
          <FilterChips value={filter} onChange={setFilter} summary={summary} />

          <button
            type="button"
            onClick={() => active.refetch()}
            className="h-[28px] w-[28px] flex items-center justify-center rounded-[6px] text-[#acacac] hover:text-[#6b6b6b] hover:bg-[#f0f0ec] transition-colors"
            title="Refresh evidence"
          >
            <RefreshCw size={12} className={isRunning ? 'animate-spin' : ''} />
          </button>

          {isRunning && (
            <span className="text-[9px] text-[#2196f3] font-medium flex items-center gap-[3px]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#2196f3] animate-pulse" />
              Auto-refreshing
            </span>
          )}

          {isCardScope && !readOnly && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="h-[28px] px-[12px] text-[11px] font-medium text-[#ff9800] flex items-center gap-[4px] hover:underline"
            >
              <Plus size={12} /> Add Evidence
            </button>
          )}
        </div>
      </div>

      {/* Aggregate */}
      <SummaryBar summary={summary} />

      {/* Manual add form (card scope only) */}
      {isCardScope && !readOnly && showAddForm && (
        <div className="p-[16px] rounded-[10px] bg-[#fafafa] border border-[#e8e8e8]">
          <AddEvidenceForm
            cardId={cardId!}
            onAdded={() => {
              setShowAddForm(false);
              active.refetch();
            }}
          />
        </div>
      )}

      {/* Body */}
      {filtered.length > 0 ? (
        <EvidenceTable rows={filtered} onSelect={setSelected} />
      ) : (
        <EmptyState scope={isCardScope ? 'card' : 'gate'} filter={filter} />
      )}

      {/* Detail drawer */}
      {selected && (
        <EvidenceDetailDrawer
          evidence={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryBar({ summary }: { summary: EvidenceSummary }) {
  const pct = Math.round(summary.passRate * 100);
  const barColor =
    summary.failed > 0 ? 'bg-[#e74c3c]' : summary.pending > 0 ? 'bg-[#ff9800]' : 'bg-[#4caf50]';

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#1a1a1a]">{formatEvidenceSummary(summary)}</span>
        <div className="flex items-center gap-[8px] text-[10px]">
          <span className="text-[#4caf50]">
            <CheckCircle2 size={10} className="inline mb-[2px]" /> {summary.passed}
          </span>
          <span className="text-[#e74c3c]">
            <XCircle size={10} className="inline mb-[2px]" /> {summary.failed}
          </span>
          {summary.pending > 0 && (
            <span className="text-[#ff9800]">
              <AlertTriangle size={10} className="inline mb-[2px]" /> {summary.pending}
            </span>
          )}
        </div>
      </div>
      <div className="h-[4px] w-full rounded-full bg-[#f0f0ec] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${summary.total === 0 ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}

function FilterChips({
  value,
  onChange,
  summary,
}: {
  value: EvidenceFilter;
  onChange: (v: EvidenceFilter) => void;
  summary: EvidenceSummary;
}) {
  const items: { key: EvidenceFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: summary.total },
    { key: 'passed', label: 'Passed', count: summary.passed },
    { key: 'failed', label: 'Failed', count: summary.failed },
    { key: 'pending', label: 'Pending', count: summary.pending },
  ];
  return (
    <div className="flex items-center gap-[2px] bg-[#f5f5f0] rounded-[6px] p-[2px]">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={cn(
            'h-[24px] px-[8px] rounded-[4px] text-[10px] font-medium transition-colors inline-flex items-center gap-[4px]',
            value === it.key ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#acacac]',
          )}
        >
          {it.label}
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-[16px] h-[14px] rounded-full text-[9px] px-[4px]',
              value === it.key ? 'bg-[#f0f0ec] text-[#6b6b6b]' : 'bg-white text-[#acacac]',
            )}
          >
            {it.count}
          </span>
        </button>
      ))}
    </div>
  );
}

export function EvidenceTable({
  rows,
  onSelect,
}: {
  rows: GateEvidence[];
  onSelect?: (ev: GateEvidence) => void;
}) {
  return (
    <div className="border border-[#e8e8e8] rounded-[8px] overflow-hidden">
      <div className="grid grid-cols-[1fr_90px_90px_70px_110px_60px] bg-[#f5f5f0] px-[12px] py-[6px] text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
        <span>Metric</span>
        <span>Value</span>
        <span>Threshold</span>
        <span>Status</span>
        <span>Source Run</span>
        <span className="text-right">Artifact</span>
      </div>
      {rows.map((ev) => (
        <button
          key={ev.id}
          type="button"
          onClick={() => onSelect?.(ev)}
          className="w-full grid grid-cols-[1fr_90px_90px_70px_110px_60px] px-[12px] py-[8px] border-t border-[#f0f0ec] items-center text-[11px] text-left hover:bg-[#fafafa] transition-colors"
        >
          <span className="text-[#1a1a1a] font-mono truncate flex flex-col">
            <span className="truncate">{ev.metric_name}</span>
            {ev.unit && (
              <span className="text-[9px] text-[#acacac] font-sans">{ev.unit}</span>
            )}
          </span>
          <span className="text-[#1a1a1a] font-medium">{formatValue(ev.metric_value)}</span>
          <span className="text-[#6b6b6b]">
            {ev.threshold !== undefined && ev.threshold !== null
              ? `${ev.operator ?? ''} ${formatValue(ev.threshold)}`.trim()
              : '-'}
          </span>
          <StatusBadge ev={ev} />
          <span className="text-[#2196f3] font-mono text-[10px] truncate">
            {ev.source_run_id ?? '-'}
          </span>
          <span className="text-right">
            {ev.source_artifact_id ? (
              <span className="text-[#2196f3] font-mono text-[10px] inline-flex items-center gap-[2px]">
                <ExternalLink size={9} />
                Link
              </span>
            ) : (
              <span className="text-[#acacac] text-[10px]">-</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ ev }: { ev: GateEvidence }) {
  if (ev.passed === true) {
    return (
      <span className="inline-flex items-center gap-[3px] text-[#4caf50] text-[9px] font-semibold uppercase">
        <CheckCircle2 size={10} /> Pass
      </span>
    );
  }
  if (ev.passed === false) {
    return (
      <span className="inline-flex items-center gap-[3px] text-[#e74c3c] text-[9px] font-semibold uppercase">
        <XCircle size={10} /> Fail
      </span>
    );
  }
  // Pending — evidence row exists but no source / no evaluation.
  return (
    <span className="inline-flex items-center gap-[3px] text-[#ff9800] text-[9px] font-semibold uppercase">
      <AlertTriangle size={10} /> Pending
    </span>
  );
}

function EmptyState({ scope, filter }: { scope: 'card' | 'gate'; filter: EvidenceFilter }) {
  if (filter !== 'all') {
    return (
      <div className="flex items-center justify-center py-[30px]">
        <span className="text-[12px] text-[#acacac]">No {filter} evidence</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-[40px] gap-[6px] text-center">
      <span className="text-[12px] text-[#6b6b6b] font-medium">No evidence collected yet.</span>
      <span className="text-[11px] text-[#acacac] max-w-[420px]">
        {scope === 'card'
          ? "Run the card's plan to populate metrics, or add manual evidence below."
          : 'Once the cards referenced by this gate produce metric outputs, evidence rows will appear here.'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filterRows(rows: GateEvidence[], filter: EvidenceFilter): GateEvidence[] {
  switch (filter) {
    case 'passed':
      return rows.filter((r) => r.passed === true);
    case 'failed':
      return rows.filter((r) => r.passed === false);
    case 'pending':
      return rows.filter((r) => r.passed !== true && r.passed !== false);
    default:
      return rows;
  }
}

function formatValue(v: number | string | undefined): string {
  if (v === undefined || v === null) return '-';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    if (Math.abs(v) >= 1000 || Math.abs(v) < 0.01) return v.toExponential(3);
    return v.toFixed(3);
  }
  return String(v);
}
