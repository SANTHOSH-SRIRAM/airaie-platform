import { useState } from 'react';
import { Play, CheckCircle2, XCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';
import { useEvaluateGate } from '@hooks/useGates';
import { gateActionEnabled } from '@api/gates';
import type { GateAction } from '@api/gates';
import type { Gate } from '@/types/gate';
import GateActionDialog from './GateActionDialog';

// ---------------------------------------------------------------------------
// D5: GateActionsBar
//
// Four buttons (evaluate / approve / reject / waive). Evaluate fires the
// mutation directly; the other three open a rationale-capture dialog.
// Enablement follows `gateActionEnabled(gate.status, action)` which mirrors
// the backend's transition table in `service/gate.go`.
// ---------------------------------------------------------------------------

export interface GateActionsBarProps {
  gate: Gate;
  onActionComplete?: (action: GateAction) => void;
  className?: string;
}

type DialogAction = 'approve' | 'reject' | 'waive';

const ACTION_STYLES: Record<
  GateAction,
  { bg: string; hover: string; disabled: string; icon: typeof Play; label: string }
> = {
  evaluate: {
    bg: 'bg-[#1976d2]',
    hover: 'hover:bg-[#1565c0]',
    disabled: 'bg-[#bdbdbd]',
    icon: Play,
    label: 'Evaluate',
  },
  approve: {
    bg: 'bg-[#2e7d32]',
    hover: 'hover:bg-[#1b5e20]',
    disabled: 'bg-[#bdbdbd]',
    icon: CheckCircle2,
    label: 'Approve',
  },
  reject: {
    bg: 'bg-[#c62828]',
    hover: 'hover:bg-[#b71c1c]',
    disabled: 'bg-[#bdbdbd]',
    icon: XCircle,
    label: 'Reject',
  },
  waive: {
    bg: 'bg-[#f57c00]',
    hover: 'hover:bg-[#ef6c00]',
    disabled: 'bg-[#bdbdbd]',
    icon: ShieldAlert,
    label: 'Waive',
  },
};

export default function GateActionsBar({ gate, onActionComplete, className }: GateActionsBarProps) {
  const evaluate = useEvaluateGate(gate.id, gate.board_id);
  const [dialog, setDialog] = useState<DialogAction | null>(null);

  const evaluateEnabled = gateActionEnabled(gate.status, 'evaluate');
  const approveEnabled = gateActionEnabled(gate.status, 'approve');
  const rejectEnabled = gateActionEnabled(gate.status, 'reject');
  const waiveEnabled = gateActionEnabled(gate.status, 'waive');

  const isPending = evaluate.isPending;

  const handleEvaluate = async () => {
    if (!evaluateEnabled || isPending) return;
    try {
      await evaluate.mutateAsync();
      onActionComplete?.('evaluate');
    } catch {
      // Surfaced via mutation state; ActionsBar shows an inline message below.
    }
  };

  return (
    <div className={cn('flex flex-col gap-[6px]', className)}>
      <div
        role="toolbar"
        aria-label="Gate actions"
        className="flex flex-wrap items-center gap-[6px]"
      >
        <ActionButton
          action="evaluate"
          enabled={evaluateEnabled && !isPending}
          loading={evaluate.isPending}
          onClick={handleEvaluate}
          tooltip={evaluateEnabled ? 'Run the gate evaluator' : 'Evaluate is only available for PENDING gates'}
        />
        <ActionButton
          action="approve"
          enabled={approveEnabled && !isPending}
          onClick={() => setDialog('approve')}
          tooltip={approveEnabled ? 'Approve this gate with rationale' : 'Approve unavailable in current state'}
        />
        <ActionButton
          action="reject"
          enabled={rejectEnabled && !isPending}
          onClick={() => setDialog('reject')}
          tooltip={rejectEnabled ? 'Reject this gate with rationale' : 'Reject unavailable in current state'}
        />
        <ActionButton
          action="waive"
          enabled={waiveEnabled && !isPending}
          onClick={() => setDialog('waive')}
          tooltip={waiveEnabled ? 'Time-limited waiver with rationale' : 'Waive only applies to FAILED gates'}
        />
      </div>

      {evaluate.error && (
        <div
          role="alert"
          className="text-[10px] text-[#c62828] bg-[#ffebee] border border-[#ffcdd2] rounded-[4px] px-[8px] py-[4px]"
        >
          {evaluate.error instanceof Error ? evaluate.error.message : 'Evaluation failed'}
        </div>
      )}

      {dialog && (
        <GateActionDialog
          gate={gate}
          action={dialog}
          open
          onClose={() => setDialog(null)}
          onSuccess={(action) => {
            setDialog(null);
            onActionComplete?.(action);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: single action button with consistent styling
// ---------------------------------------------------------------------------

function ActionButton({
  action,
  enabled,
  loading,
  onClick,
  tooltip,
}: {
  action: GateAction;
  enabled: boolean;
  loading?: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  const style = ACTION_STYLES[action];
  const Icon = style.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      title={tooltip}
      aria-label={style.label}
      className={cn(
        'h-[28px] px-[12px] rounded-[6px] text-[10px] font-semibold uppercase tracking-[0.5px] text-white inline-flex items-center gap-[6px] transition-colors',
        enabled ? cn(style.bg, style.hover) : cn(style.disabled, 'cursor-not-allowed opacity-60'),
      )}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {style.label}
    </button>
  );
}
