import { useState } from 'react';
import { cn } from '@utils/cn';
import { useCard, useCardEvidence } from '@hooks/useCards';
import type { CardStatus } from '@/types/card';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Play,
  Eye,
  FileText,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<
  CardStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: 'Draft', bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' },
  ready: { label: 'Ready', bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  queued: { label: 'Queued', bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  running: { label: 'Running', bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  completed: { label: 'Completed', bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  failed: { label: 'Failed', bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]' },
  blocked: { label: 'Blocked', bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  skipped: { label: 'Skipped', bg: 'bg-[#f0f0ec]', text: 'text-[#9e9e9e]' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  analysis: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  comparison: { bg: 'bg-[#f3e5f5]', text: 'text-[#9c27b0]' },
  sweep: { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
  agent: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]' },
  gate: { bg: 'bg-[#fce4ec]', text: 'text-[#e91e63]' },
  milestone: { bg: 'bg-[#e0f2f1]', text: 'text-[#009688]' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CardDetailProps {
  cardId: string;
  onGeneratePlan?: (cardId: string) => void;
  onViewPlan?: (cardId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardDetail({ cardId, onGeneratePlan, onViewPlan }: CardDetailProps) {
  const { data: card, isLoading: cardLoading } = useCard(cardId);
  const { data: evidence, isLoading: evLoading } = useCardEvidence(cardId);

  if (cardLoading) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <span className="text-[12px] text-[#acacac]">Card not found</span>
      </div>
    );
  }

  const statusCfg = STATUS_BADGE[card.status] ?? STATUS_BADGE.draft;
  const typeCfg = TYPE_COLORS[card.card_type] ?? { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]' };

  // Build KPI table with evidence actuals
  const kpiRows = card.kpis.map((kpi) => {
    const ev = evidence?.find((e) => e.metric_key === kpi.metric_key);
    const actual = ev?.metric_value;
    const passed = ev?.passed;
    return { ...kpi, actual, passed, evaluation: ev?.evaluation };
  });

  const passedCount = kpiRows.filter((k) => k.passed === true).length;

  return (
    <div className="flex flex-col gap-[16px]">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-[8px] mb-[6px]">
          <h3 className="text-[16px] font-semibold text-[#1a1a1a] flex-1 min-w-0 truncate">
            {card.title}
          </h3>
          <span
            className={cn(
              'h-[22px] px-[10px] rounded-full text-[10px] font-medium inline-flex items-center shrink-0',
              statusCfg.bg,
              statusCfg.text,
            )}
          >
            {statusCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-[6px] flex-wrap">
          <span
            className={cn(
              'h-[20px] px-[8px] rounded-[4px] text-[10px] font-medium inline-flex items-center capitalize',
              typeCfg.bg,
              typeCfg.text,
            )}
          >
            {card.card_type}
          </span>
          {card.intent_type && (
            <span className="h-[20px] px-[8px] rounded-[4px] bg-[#f0f0ec] text-[#6b6b6b] text-[10px] font-mono inline-flex items-center">
              {card.intent_type}
            </span>
          )}
        </div>

        {card.description && (
          <p className="text-[12px] text-[#6b6b6b] mt-[8px] leading-[18px]">
            {card.description}
          </p>
        )}
      </div>

      {/* ── KPIs Table ─────────────────────────────────────── */}
      {kpiRows.length > 0 && (
        <div>
          <div className="flex items-center gap-[8px] mb-[8px]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
              KPIs
            </span>
            <span className="text-[10px] text-[#6b6b6b]">
              {passedCount}/{kpiRows.length} pass
            </span>
          </div>

          <div className="border border-[#e8e8e8] rounded-[8px] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_50px_80px_60px] bg-[#f5f5f0] px-[12px] py-[6px] text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
              <span>Metric</span>
              <span>Target</span>
              <span>Unit</span>
              <span>Actual</span>
              <span className="text-right">Status</span>
            </div>

            {/* Rows */}
            {kpiRows.map((kpi) => (
              <div
                key={kpi.metric_key}
                className="grid grid-cols-[1fr_80px_50px_80px_60px] px-[12px] py-[8px] border-t border-[#f0f0ec] text-[11px]"
              >
                <span className="text-[#1a1a1a] font-mono truncate">{kpi.metric_key}</span>
                <span className="text-[#6b6b6b]">{kpi.target_value}</span>
                <span className="text-[#acacac]">{kpi.unit || '-'}</span>
                <span className="text-[#1a1a1a] font-medium">
                  {kpi.actual !== undefined ? kpi.actual : '-'}
                </span>
                <span className="text-right">
                  {kpi.evaluation === 'pass' && (
                    <span className="inline-flex items-center gap-[3px] text-[#4caf50]">
                      <CheckCircle2 size={10} /> Pass
                    </span>
                  )}
                  {kpi.evaluation === 'fail' && (
                    <span className="inline-flex items-center gap-[3px] text-[#e74c3c]">
                      <XCircle size={10} /> Fail
                    </span>
                  )}
                  {kpi.evaluation === 'warning' && (
                    <span className="inline-flex items-center gap-[3px] text-[#ff9800]">
                      <AlertTriangle size={10} /> Warn
                    </span>
                  )}
                  {!kpi.evaluation && (
                    <span className="inline-flex items-center gap-[3px] text-[#acacac]">
                      <Clock size={10} /> --
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Evidence List ──────────────────────────────────── */}
      {evidence && evidence.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[8px] block">
            Evidence
          </span>
          <div className="flex flex-col gap-[6px]">
            {evidence.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-[8px] p-[10px] rounded-[8px] border border-[#e8e8e8]"
              >
                {ev.evaluation === 'pass' && <CheckCircle2 size={12} className="text-[#4caf50] shrink-0" />}
                {ev.evaluation === 'fail' && <XCircle size={12} className="text-[#e74c3c] shrink-0" />}
                {ev.evaluation === 'warning' && <AlertTriangle size={12} className="text-[#ff9800] shrink-0" />}
                {ev.evaluation === 'info' && <FileText size={12} className="text-[#2196f3] shrink-0" />}

                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-medium text-[#1a1a1a]">
                    {ev.metric_key}: {ev.metric_value} {ev.metric_unit ?? ''}
                  </span>
                  {ev.run_id && (
                    <span className="text-[10px] text-[#acacac] block">
                      Run: {ev.run_id}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    'h-[18px] px-[6px] rounded-[4px] text-[9px] font-semibold uppercase inline-flex items-center',
                    ev.evaluation === 'pass' && 'bg-[#e8f5e9] text-[#4caf50]',
                    ev.evaluation === 'fail' && 'bg-[#ffebee] text-[#e74c3c]',
                    ev.evaluation === 'warning' && 'bg-[#fff3e0] text-[#ff9800]',
                    ev.evaluation === 'info' && 'bg-[#e3f2fd] text-[#2196f3]',
                  )}
                >
                  {ev.evaluation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {evLoading && (
        <div className="flex items-center gap-[6px] py-[8px]">
          <Loader2 size={14} className="animate-spin text-[#acacac]" />
          <span className="text-[11px] text-[#acacac]">Loading evidence...</span>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex items-center gap-[8px] pt-[8px] border-t border-[#f0f0ec]">
        <button
          type="button"
          onClick={() => onGeneratePlan?.(cardId)}
          className="h-[32px] px-[14px] bg-[#ff9800] hover:bg-[#f57c00] text-white rounded-[8px] text-[11px] font-medium flex items-center gap-[5px] transition-colors"
        >
          <Play size={12} />
          Generate Plan
        </button>
        <button
          type="button"
          onClick={() => onViewPlan?.(cardId)}
          className="h-[32px] px-[14px] border border-[#e8e8e8] text-[#6b6b6b] rounded-[8px] text-[11px] font-medium flex items-center gap-[5px] hover:bg-[#f0f0ec] transition-colors"
        >
          <Eye size={12} />
          View Plan
        </button>
      </div>
    </div>
  );
}
