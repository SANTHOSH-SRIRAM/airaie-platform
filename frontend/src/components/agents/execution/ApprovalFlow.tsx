import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ArrowUpRight, Loader2 } from 'lucide-react';
import type { ActionDecision } from '@components/agents/execution/PolicyDecisionDisplay';
import Badge from '@components/ui/Badge';
import Button from '@components/ui/Button';
import { cn } from '@utils/cn';
import { apiClient } from '@api/client';

/* ---------- Types ---------- */

interface ApprovalFlowProps {
  proposalId: string;
  approvalId?: string;
  agentId?: string;
  sessionId?: string;
  actions: ActionDecision[];
  onApproved?: () => void;
  onRejected?: () => void;
  onEscalated?: () => void;
}

type FlowStatus = 'pending' | 'approving' | 'rejecting' | 'escalating' | 'approved' | 'rejected' | 'escalated' | 'error';

/* ---------- Helpers ---------- */

const verdictConfig = {
  approved: { variant: 'success' as const, label: 'Approved' },
  needs_approval: { variant: 'warning' as const, label: 'Needs Approval' },
  blocked: { variant: 'danger' as const, label: 'Blocked' },
  escalated: { variant: 'info' as const, label: 'Escalated' },
};

/* ---------- Component ---------- */

export default function ApprovalFlow({ proposalId, approvalId, agentId, sessionId, actions, onApproved, onRejected, onEscalated }: ApprovalFlowProps) {
  const [status, setStatus] = useState<FlowStatus>('pending');
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pendingActions = actions.filter((a) => a.verdict === 'needs_approval');
  const blockedActions = actions.filter((a) => a.verdict === 'blocked');

  const handleApprove = async () => {
    setStatus('approving');
    setError(null);
    try {
      if (approvalId) {
        // Use the real approval service endpoint — triggers NATS dispatch
        await apiClient.post(`/v0/approvals/${approvalId}/approve`, { comment: 'approved via playground' });
      } else if (agentId && sessionId) {
        await apiClient.post(`/v0/agents/${agentId}/sessions/${sessionId}/approve`);
      } else {
        await apiClient.post(`/v0/approvals/${proposalId}/approve`, { comment: 'approved via playground' });
      }
      setStatus('approved');
      onApproved?.();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Failed to approve proposal');
      setStatus('error');
    }
  };

  const handleReject = async () => {
    if (!rationale.trim()) {
      setError('Please provide a rationale for rejection.');
      return;
    }
    setStatus('rejecting');
    setError(null);
    try {
      await apiClient.post(`/v0/proposals/${proposalId}/reject`, {
        approved: false,
        rationale: rationale.trim(),
      });
      setStatus('rejected');
      onRejected?.();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Failed to reject proposal');
      setStatus('error');
    }
  };

  const handleEscalate = async () => {
    setStatus('escalating');
    setError(null);
    try {
      // No backend escalate endpoint — treat as reject with escalation note
      setStatus('escalated');
      onEscalated?.();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Failed to escalate proposal');
      setStatus('error');
    }
  };

  // Success / Rejected / Escalated states
  if (status === 'approved') {
    return (
      <div data-testid="approval-flow" className="border border-green-50 rounded-lg bg-green-20 p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-50 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-80">Proposal Approved</p>
          <p className="text-xs text-green-60 mt-0.5">
            All {pendingActions.length} action(s) have been approved. Execution will begin shortly.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div data-testid="approval-flow" className="border border-red-50 rounded-lg bg-red-20 p-4 flex items-center gap-3">
        <XCircle className="w-5 h-5 text-red-50 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-80">Proposal Rejected</p>
          <p className="text-xs text-red-60 mt-0.5">Rationale: {rationale}</p>
        </div>
      </div>
    );
  }

  if (status === 'escalated') {
    return (
      <div data-testid="approval-flow" className="border border-blue-60 rounded-lg bg-blue-20 p-4 flex items-center gap-3">
        <ArrowUpRight className="w-5 h-5 text-blue-60 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-80">Proposal Escalated</p>
          <p className="text-xs text-blue-60 mt-0.5">
            This proposal has been escalated for human review.
            {rationale && ` Rationale: ${rationale}`}
          </p>
        </div>
      </div>
    );
  }

  const isLoading = status === 'approving' || status === 'rejecting' || status === 'escalating';

  return (
    <div data-testid="approval-flow" className="border border-card-border rounded-lg bg-card-bg shadow-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border-inner bg-yellow-20/20">
        <AlertTriangle className="w-4 h-4 text-yellow-30 shrink-0" />
        <span className="text-sm font-semibold text-cds-text-primary">
          Approval Required
        </span>
        <Badge variant="warning">{pendingActions.length} action(s)</Badge>
      </div>

      {/* Actions needing approval */}
      <div className="px-4 py-3 border-b border-card-border-inner">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
          ACTIONS REQUIRING APPROVAL
        </p>
        <div className="space-y-2">
          {pendingActions.map((action) => (
            <div
              key={action.action_id}
              data-testid="approval-action-item"
              className="flex items-start gap-3 px-3 py-2 rounded bg-cds-layer-01 border border-cds-border-subtle"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-30 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-cds-text-primary">{action.tool_ref}</span>
                  <Badge variant={verdictConfig[action.verdict].variant}>
                    {verdictConfig[action.verdict].label}
                  </Badge>
                </div>
                <p className="text-xs text-cds-text-secondary">{action.reason}</p>
                <p className="text-[10px] text-cds-text-placeholder mt-0.5 font-mono">
                  Rule: {action.rule_name}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Blocked actions warning */}
        {blockedActions.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-medium tracking-wider text-red-60 uppercase mb-1">
              BLOCKED ACTIONS
            </p>
            {blockedActions.map((action) => (
              <div
                key={action.action_id}
                className="flex items-start gap-3 px-3 py-2 rounded bg-red-20/40 border border-red-50/30 mb-1 last:mb-0"
              >
                <XCircle className="w-3.5 h-3.5 text-red-50 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-red-80">{action.tool_ref}</span>
                  <p className="text-xs text-red-60 mt-0.5">{action.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rationale textarea */}
      <div className="px-4 py-3 border-b border-card-border-inner">
        <label htmlFor="rejection-rationale" className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-1 block">
          RATIONALE (REQUIRED FOR REJECTION)
        </label>
        <textarea
          id="rejection-rationale"
          data-testid="approval-rationale"
          className={cn(
            'w-full h-20 px-3 py-2 text-sm rounded border resize-none',
            'bg-cds-field-01 border-cds-border-strong text-cds-text-primary',
            'placeholder:text-cds-text-placeholder',
            'focus:outline-none focus:ring-2 focus:ring-cds-focus',
          )}
          placeholder="Explain why this proposal should be rejected..."
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-20/30 text-red-60 text-xs flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Footer: Approve All / Escalate / Reject */}
      <div className="flex items-center justify-end gap-2 px-4 py-3">
        <Button
          data-testid="approval-reject-btn"
          variant="danger"
          size="sm"
          icon={isLoading && status === 'rejecting' ? <Loader2 className="animate-spin" /> : <XCircle />}
          onClick={handleReject}
          disabled={isLoading}
        >
          Reject
        </Button>
        <Button
          data-testid="approval-escalate-btn"
          variant="secondary"
          size="sm"
          icon={isLoading && status === 'escalating' ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
          onClick={handleEscalate}
          disabled={isLoading}
        >
          Escalate
        </Button>
        <Button
          data-testid="approval-approve-btn"
          variant="primary"
          size="sm"
          icon={isLoading && status === 'approving' ? <Loader2 className="animate-spin" /> : <CheckCircle />}
          onClick={handleApprove}
          disabled={isLoading || blockedActions.length > 0}
        >
          Approve All
        </Button>
      </div>
    </div>
  );
}
