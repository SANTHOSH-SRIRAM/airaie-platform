import { useState } from 'react';
import { cn } from '@utils/cn';
import { useCardEvidence } from '@hooks/useCards';
import type { CardEvidence } from '@/types/card';
import AddEvidenceForm from './AddEvidenceForm';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Plus,
  Filter,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Evaluation config
// ---------------------------------------------------------------------------

const EVAL_CONFIG: Record<
  CardEvidence['evaluation'],
  { icon: typeof CheckCircle2; bg: string; text: string; border: string }
> = {
  pass: { icon: CheckCircle2, bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', border: 'border-[#c8e6c9]' },
  fail: { icon: XCircle, bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]', border: 'border-[#ffcdd2]' },
  warning: { icon: AlertTriangle, bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', border: 'border-[#ffe0b2]' },
  info: { icon: Info, bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', border: 'border-[#bbdefb]' },
};

type EvalFilter = 'all' | CardEvidence['evaluation'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EvidencePanelProps {
  cardId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EvidencePanel({ cardId }: EvidencePanelProps) {
  const { data: evidence, isLoading, error, refetch } = useCardEvidence(cardId);
  const [filter, setFilter] = useState<EvalFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = evidence?.filter(
    (ev) => filter === 'all' || ev.evaluation === filter,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
        <span className="ml-[8px] text-[12px] text-[#acacac]">Loading evidence...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-[40px] gap-[8px]">
        <AlertCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">Failed to load evidence</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
            Evidence
          </span>
          <span className="h-[20px] px-[8px] rounded-full bg-[#f0f0ec] text-[10px] font-medium text-[#6b6b6b] inline-flex items-center">
            {evidence?.length ?? 0}
          </span>
        </div>

        <div className="flex items-center gap-[6px]">
          {/* Filter */}
          <div className="flex items-center gap-[2px] bg-[#f5f5f0] rounded-[6px] p-[2px]">
            {(['all', 'pass', 'fail', 'warning', 'info'] as EvalFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'h-[24px] px-[8px] rounded-[4px] text-[10px] font-medium transition-colors capitalize',
                  filter === f ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#acacac]',
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-[28px] px-[12px] text-[11px] font-medium text-[#ff9800] flex items-center gap-[4px] hover:underline"
          >
            <Plus size={12} /> Add Evidence
          </button>
        </div>
      </div>

      {/* Add evidence form */}
      {showAddForm && (
        <div className="p-[16px] rounded-[10px] bg-[#fafafa] border border-[#e8e8e8]">
          <AddEvidenceForm
            cardId={cardId}
            onAdded={() => {
              setShowAddForm(false);
              refetch();
            }}
          />
        </div>
      )}

      {/* Table */}
      {filtered && filtered.length > 0 ? (
        <div className="border border-[#e8e8e8] rounded-[8px] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_50px_70px_100px_60px] bg-[#f5f5f0] px-[12px] py-[6px] text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
            <span>Metric</span>
            <span>Value</span>
            <span>Unit</span>
            <span>Eval</span>
            <span>Source Run</span>
            <span className="text-right">Artifact</span>
          </div>

          {/* Rows */}
          {filtered.map((ev) => {
            const cfg = EVAL_CONFIG[ev.evaluation];
            const Icon = cfg.icon;

            return (
              <div
                key={ev.id}
                className="grid grid-cols-[1fr_80px_50px_70px_100px_60px] px-[12px] py-[8px] border-t border-[#f0f0ec] items-center text-[11px]"
              >
                <span className="text-[#1a1a1a] font-mono truncate">{ev.metric_key}</span>
                <span className="text-[#1a1a1a] font-medium">{ev.metric_value}</span>
                <span className="text-[#acacac]">{ev.metric_unit ?? '-'}</span>
                <span className={cn('inline-flex items-center gap-[3px]', cfg.text)}>
                  <Icon size={10} />
                  <span className="text-[9px] font-semibold uppercase">{ev.evaluation}</span>
                </span>
                <span className="text-[#2196f3] font-mono text-[10px] truncate">
                  {ev.run_id ?? '-'}
                </span>
                <span className="text-right">
                  {ev.artifact_id ? (
                    <span className="text-[#2196f3] font-mono text-[10px] inline-flex items-center gap-[2px]">
                      <ExternalLink size={9} />
                      Link
                    </span>
                  ) : (
                    <span className="text-[#acacac] text-[10px]">-</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-[30px]">
          <span className="text-[12px] text-[#acacac]">
            {filter === 'all' ? 'No evidence recorded yet' : `No ${filter} evidence`}
          </span>
        </div>
      )}
    </div>
  );
}
