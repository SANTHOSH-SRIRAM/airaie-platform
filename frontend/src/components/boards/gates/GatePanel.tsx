import { useState } from 'react';
import { cn } from '@utils/cn';
import {
  useGateList,
  useGateRequirements,
} from '@hooks/useGates';
import type { Gate, GateStatus, GateType } from '@/types/gate';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Shield,
  Loader2,
  AlertCircle,
  Pause,
} from 'lucide-react';
import GateActionsBar from './GateActionsBar';
import GateApprovalHistory from './GateApprovalHistory';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<GateStatus, { bg: string; text: string; icon: typeof CheckCircle2; borderLeft: string }> = {
  PENDING: { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', icon: Clock, borderLeft: 'border-l-[#ff9800]' },
  EVALUATING: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', icon: Loader2, borderLeft: 'border-l-[#2196f3]' },
  PASSED: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', icon: CheckCircle2, borderLeft: 'border-l-[#4caf50]' },
  FAILED: { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]', icon: XCircle, borderLeft: 'border-l-[#e74c3c]' },
  WAIVED: { bg: 'bg-[#f0f0ec]', text: 'text-[#9e9e9e]', icon: Pause, borderLeft: 'border-l-[#9e9e9e]' },
};

const TYPE_BADGE: Record<GateType, { bg: string; text: string }> = {
  evidence: { bg: 'bg-[#f3e5f5]', text: 'text-[#9c27b0]' },
  review: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]' },
  compliance: { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GatePanelProps {
  boardId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GatePanel({ boardId }: GatePanelProps) {
  const { data: gates, isLoading, error } = useGateList(boardId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <Loader2 size={20} className="animate-spin text-[#acacac]" />
        <span className="ml-[8px] text-[12px] text-[#acacac]">Loading gates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-[40px] gap-[8px]">
        <AlertCircle size={16} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">Failed to load gates</span>
      </div>
    );
  }

  if (!gates || gates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-[40px]">
        <Shield size={24} className="text-[#d0d0d0] mb-[8px]" />
        <p className="text-[13px] font-medium text-[#1a1a1a]">No gates configured</p>
        <p className="text-[11px] text-[#acacac] mt-[4px]">
          Gates will appear once created for this board
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Header */}
      <div className="flex items-center gap-[8px] mb-[4px]">
        <Shield size={16} className="text-[#ff9800]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
          Gates
        </span>
        <span className="h-[20px] px-[8px] rounded-full bg-[#f0f0ec] text-[10px] font-medium text-[#6b6b6b] inline-flex items-center">
          {gates.length}
        </span>
      </div>

      {/* Gate list */}
      {gates.map((gate) => (
        <GateItem key={gate.id} gate={gate} boardId={boardId} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gate Item
// ---------------------------------------------------------------------------

function GateItem({ gate, boardId: _boardId }: { gate: Gate; boardId: string }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[gate.status] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  const typeCfg = TYPE_BADGE[gate.gate_type] ?? TYPE_BADGE.evidence;

  return (
    <div
      className={cn(
        'rounded-[10px] border-l-4 overflow-hidden transition-colors',
        cfg.borderLeft,
        expanded ? 'bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.06)]' : 'bg-white',
      )}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-[8px] px-[14px] py-[10px] hover:bg-black/[0.02] transition-colors"
      >
        <Icon
          size={14}
          className={cn('shrink-0', cfg.text, gate.status === 'EVALUATING' && 'animate-spin')}
        />
        <span className="text-[12px] font-semibold text-[#1a1a1a] flex-1 text-left truncate">
          {gate.name}
        </span>

        {/* Type badge */}
        <span
          className={cn(
            'h-[18px] px-[6px] rounded-[4px] text-[9px] font-medium capitalize inline-flex items-center shrink-0',
            typeCfg.bg,
            typeCfg.text,
          )}
        >
          {gate.gate_type}
        </span>

        {/* Status badge */}
        <span
          className={cn(
            'h-[20px] px-[8px] rounded-full text-[9px] font-semibold uppercase inline-flex items-center shrink-0',
            cfg.bg,
            cfg.text,
          )}
        >
          {gate.status}
        </span>

        <ChevronDown
          size={14}
          className={cn('text-[#acacac] transition-transform shrink-0', expanded && 'rotate-180')}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-[14px] pb-[12px]">
          {/* D5: governance actions bar at the top of the expansion */}
          <div className="mb-[10px]">
            <GateActionsBar gate={gate} />
          </div>

          {/* Description */}
          {gate.description && (
            <p className="text-[11px] text-[#6b6b6b] mb-[10px]">{gate.description}</p>
          )}

          {/* Requirements */}
          <GateRequirementsList gateId={gate.id} />

          {/* Legacy inline action form removed — duplicated GateActionsBar's
              mutation surface and produced a double-dispatch race. The
              GateActionDialog at the top is the single approval entry point. */}

          {/* D5: approval audit log */}
          <div className="mt-[10px] pt-[10px] border-t border-[#f0f0ec]">
            <GateApprovalHistory gateId={gate.id} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Requirements list
// ---------------------------------------------------------------------------

function GateRequirementsList({ gateId }: { gateId: string }) {
  const { data: requirements, isLoading } = useGateRequirements(gateId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-[6px] py-[6px]">
        <Loader2 size={12} className="animate-spin text-[#acacac]" />
        <span className="text-[10px] text-[#acacac]">Loading requirements...</span>
      </div>
    );
  }

  if (!requirements || requirements.length === 0) {
    return (
      <p className="text-[10px] text-[#acacac] italic py-[6px]">No requirements defined</p>
    );
  }

  const satisfiedCount = requirements.filter((r) => r.satisfied).length;
  const allSatisfied = satisfiedCount === requirements.length;

  return (
    <div className="flex flex-col gap-[4px] mb-[10px]">
      <div className="flex items-center gap-[6px] mb-[2px]">
        <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
          Requirements
        </span>
        <span
          className={cn(
            'text-[9px] font-medium',
            allSatisfied ? 'text-[#4caf50]' : 'text-[#ff9800]',
          )}
        >
          {satisfiedCount}/{requirements.length} met
        </span>
        {/* Progress bar */}
        <div className="flex-1 h-[3px] rounded-full bg-[#f0f0ec] max-w-[60px]">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              allSatisfied ? 'bg-[#4caf50]' : 'bg-[#ff9800]',
            )}
            style={{ width: `${requirements.length > 0 ? (satisfiedCount / requirements.length) * 100 : 0}%` }}
          />
        </div>
      </div>
      {requirements.map((req) => (
        <div key={req.id} className="flex items-center gap-[6px]">
          {req.satisfied ? (
            <CheckCircle2 size={12} className="text-[#4caf50] shrink-0" />
          ) : (
            <XCircle size={12} className="text-[#e74c3c] shrink-0" />
          )}
          <span
            className={cn(
              'text-[11px]',
              req.satisfied ? 'text-[#6b6b6b]' : 'text-[#e74c3c]',
            )}
          >
            <span className="font-mono text-[10px] bg-[#f0f0ec] px-[4px] py-[1px] rounded mr-[4px]">
              {req.req_type}
            </span>
            {req.description}
          </span>
        </div>
      ))}
    </div>
  );
}

