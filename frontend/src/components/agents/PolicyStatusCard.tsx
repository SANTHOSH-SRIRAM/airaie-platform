import type { PolicyStatus } from '@/types/agentPlayground';
import Toggle from '@components/ui/Toggle';

interface PolicyStatusCardProps {
  policyStatus: PolicyStatus;
  onToggleAutoApprove?: (enabled: boolean) => void;
}

export default function PolicyStatusCard({ policyStatus, onToggleAutoApprove }: PolicyStatusCardProps) {
  return (
    <div data-testid="policy-status" className="space-y-3">
      <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">
        POLICY STATUS
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-cds-text-secondary">Auto-approve threshold</span>
          <span className="text-cds-text-primary font-medium">
            {Math.round(policyStatus.autoApproveThreshold * 100)}%
          </span>
        </div>

        <div data-testid="auto-approve-toggle">
          <Toggle
            id="auto-approve-toggle"
            label="Auto-approve enabled"
            checked={policyStatus.autoApproveEnabled}
            onChange={(checked) => onToggleAutoApprove?.(checked)}
            size="sm"
          />
        </div>

        <p className="text-[10px] text-cds-text-secondary leading-relaxed">
          Tool calls above threshold will be auto-approved
        </p>
      </div>
    </div>
  );
}
