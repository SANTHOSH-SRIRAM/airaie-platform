import { useState } from 'react';
import { cn } from '@utils/cn';
import {
  useGateList,
  useGateRequirements,
  useEvaluateGate,
  useApproveGate,
  useRejectGate,
  useWaiveGate,
} from '@hooks/useGates';
import type { Gate, GateStatus, GateType, GateRequirement } from '@/types/gate';
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

function GateItem({ gate, boardId }: { gate: Gate; boardId: string }) {
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
          {/* Description */}
          {gate.description && (
            <p className="text-[11px] text-[#6b6b6b] mb-[10px]">{gate.description}</p>
          )}

          {/* Requirements */}
          <GateRequirementsList gateId={gate.id} />

          {/* Action buttons */}
          <GateActions gate={gate} boardId={boardId} />
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

  return (
    <div className="flex flex-col gap-[4px] mb-[10px]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac] mb-[2px]">
        Requirements
      </span>
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

// ---------------------------------------------------------------------------
// Gate Actions
// ---------------------------------------------------------------------------

function GateActions({ gate, boardId }: { gate: Gate; boardId: string }) {
  const evaluate = useEvaluateGate(gate.id, boardId);
  const approve = useApproveGate(gate.id, boardId);
  const reject = useRejectGate(gate.id, boardId);
  const waive = useWaiveGate(gate.id, boardId);

  const [showActionForm, setShowActionForm] = useState<'approve' | 'reject' | 'waive' | null>(null);
  const [rationale, setRationale] = useState('');
  const [role, setRole] = useState('');

  const handleAction = async (action: 'approve' | 'reject' | 'waive') => {
    const data = {
      rationale: rationale.trim() || undefined,
      role: role.trim() || undefined,
    };

    if (action === 'approve') await approve.mutateAsync(data);
    else if (action === 'reject') await reject.mutateAsync(data);
    else await waive.mutateAsync({ rationale: rationale.trim() || 'Waived', role: role.trim() || undefined });

    setShowActionForm(null);
    setRationale('');
    setRole('');
  };

  const isPending = evaluate.isPending || approve.isPending || reject.isPending || waive.isPending;

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Action buttons */}
      <div className="flex items-center gap-[6px]">
        <button
          type="button"
          onClick={() => evaluate.mutate()}
          disabled={isPending}
          className="h-[28px] px-[12px] bg-[#2196f3] text-white rounded-[6px] text-[10px] font-medium hover:bg-[#1976d2] transition-colors disabled:opacity-50 flex items-center gap-[4px]"
        >
          {evaluate.isPending && <Loader2 size={10} className="animate-spin" />}
          Evaluate
        </button>
        <button
          type="button"
          onClick={() => setShowActionForm('approve')}
          disabled={isPending}
          className="h-[28px] px-[12px] bg-[#4caf50] text-white rounded-[6px] text-[10px] font-medium hover:bg-[#43a047] transition-colors disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setShowActionForm('reject')}
          disabled={isPending}
          className="h-[28px] px-[12px] bg-[#e74c3c] text-white rounded-[6px] text-[10px] font-medium hover:bg-[#d32f2f] transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        {gate.status === 'FAILED' && (
          <button
            type="button"
            onClick={() => setShowActionForm('waive')}
            disabled={isPending}
            className="h-[28px] px-[12px] bg-[#9e9e9e] text-white rounded-[6px] text-[10px] font-medium hover:bg-[#757575] transition-colors disabled:opacity-50"
          >
            Waive
          </button>
        )}
      </div>

      {/* Inline action form */}
      {showActionForm && (
        <div className="p-[10px] rounded-[8px] bg-[#fafafa] border border-[#e8e8e8] flex flex-col gap-[8px]">
          <span className="text-[10px] font-semibold text-[#1a1a1a] capitalize">
            {showActionForm} Gate
          </span>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (e.g. senior_engineer)"
            className="h-[30px] px-[10px] rounded-[6px] border border-[#e8e8e8] text-[11px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
          />
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Rationale..."
            rows={2}
            className="px-[10px] py-[8px] rounded-[6px] border border-[#e8e8e8] text-[11px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors resize-none"
          />
          <div className="flex items-center gap-[6px] justify-end">
            <button
              type="button"
              onClick={() => setShowActionForm(null)}
              className="h-[26px] px-[10px] rounded-[6px] text-[10px] font-medium text-[#6b6b6b] border border-[#e8e8e8] hover:bg-[#f0f0ec] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAction(showActionForm)}
              disabled={isPending}
              className={cn(
                'h-[26px] px-[12px] rounded-[6px] text-[10px] font-semibold text-white transition-colors flex items-center gap-[4px]',
                showActionForm === 'approve' && 'bg-[#4caf50] hover:bg-[#43a047]',
                showActionForm === 'reject' && 'bg-[#e74c3c] hover:bg-[#d32f2f]',
                showActionForm === 'waive' && 'bg-[#9e9e9e] hover:bg-[#757575]',
              )}
            >
              {isPending && <Loader2 size={10} className="animate-spin" />}
              Confirm {showActionForm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
