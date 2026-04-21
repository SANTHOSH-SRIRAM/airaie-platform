interface AgentSpecPolicy {
  auto_approve_threshold?: number;
  require_approval_for?: string[];
}

interface PolicyStatusCardProps {
  policy?: AgentSpecPolicy | null;
}

export default function PolicyStatusCard({ policy }: PolicyStatusCardProps) {
  return (
    <div data-testid="policy-status" className="space-y-3">
      <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">
        POLICY STATUS
      </p>

      {policy == null ? (
        <p className="text-xs text-cds-text-secondary">
          Policy not configured — publish an agent version first.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-cds-text-secondary">Auto-approve threshold</span>
            <span className="text-cds-text-primary font-medium">
              {policy.auto_approve_threshold != null
                ? `${Math.round(policy.auto_approve_threshold * 100)}%`
                : '—'}
            </span>
          </div>

          {policy.require_approval_for?.length ? (
            <div className="text-xs text-cds-text-secondary">
              Requires approval for:{' '}
              <span className="text-cds-text-primary">{policy.require_approval_for.join(', ')}</span>
            </div>
          ) : null}

          <p className="text-[10px] text-cds-text-secondary leading-relaxed">
            Tool calls above threshold will be auto-approved
          </p>
        </div>
      )}
    </div>
  );
}
