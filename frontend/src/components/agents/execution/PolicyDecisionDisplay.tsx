import { ShieldCheck, ShieldAlert, ShieldX, ArrowUpRight, Info } from 'lucide-react';
import Badge from '@components/ui/Badge';
import { cn } from '@utils/cn';

/* ---------- Types ---------- */

export interface ActionDecision {
  action_id: string;
  tool_ref: string;
  verdict: 'approved' | 'needs_approval' | 'blocked' | 'escalated';
  reason: string;
  rule_name: string;
}

export interface PolicyDecision {
  proposal_id: string;
  overall_verdict: 'approved' | 'needs_approval' | 'blocked' | 'escalated';
  action_decisions: ActionDecision[];
  summary: string;
}

interface PolicyDecisionDisplayProps {
  decision: PolicyDecision;
}

/* ---------- Helpers ---------- */

const verdictConfig = {
  approved: {
    icon: ShieldCheck,
    label: 'Approved',
    badgeVariant: 'success' as const,
    bannerClass: 'bg-green-20 border-green-50 text-green-80',
    iconClass: 'text-green-50',
  },
  needs_approval: {
    icon: ShieldAlert,
    label: 'Needs Approval',
    badgeVariant: 'warning' as const,
    bannerClass: 'bg-yellow-20/30 border-yellow-30 text-gray-100',
    iconClass: 'text-yellow-30',
  },
  blocked: {
    icon: ShieldX,
    label: 'Blocked',
    badgeVariant: 'danger' as const,
    bannerClass: 'bg-red-20 border-red-50 text-red-80',
    iconClass: 'text-red-50',
  },
  escalated: {
    icon: ArrowUpRight,
    label: 'Escalated',
    badgeVariant: 'info' as const,
    bannerClass: 'bg-blue-20 border-blue-60 text-blue-80',
    iconClass: 'text-blue-60',
  },
};

/* ---------- Component ---------- */

export default function PolicyDecisionDisplay({ decision }: PolicyDecisionDisplayProps) {
  const config = verdictConfig[decision.overall_verdict];
  const VerdictIcon = config.icon;

  return (
    <div data-testid="policy-decision-display" className="border border-card-border rounded-lg bg-card-bg shadow-card">
      {/* Overall Verdict Banner */}
      <div
        data-testid="policy-verdict-banner"
        className={cn(
          'flex items-center gap-3 px-4 py-3 border-b rounded-t-lg',
          config.bannerClass,
        )}
      >
        <VerdictIcon className={cn('w-5 h-5 shrink-0', config.iconClass)} />
        <div className="flex-1">
          <span className="text-sm font-semibold">Policy Verdict: {config.label}</span>
        </div>
        <Badge variant={config.badgeVariant}>{config.label}</Badge>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-card-border-inner">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-cds-text-secondary mt-0.5 shrink-0" />
          <p className="text-sm text-cds-text-secondary leading-relaxed">{decision.summary}</p>
        </div>
      </div>

      {/* Per-action decisions */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
          ACTION DECISIONS ({decision.action_decisions.length})
        </p>

        <div className="space-y-0">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_6rem_1fr_1fr] gap-2 items-center px-2 py-1.5 text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase border-b border-cds-border-subtle">
            <span>Tool</span>
            <span>Verdict</span>
            <span>Rule</span>
            <span>Reason</span>
          </div>

          {/* Rows */}
          {decision.action_decisions.map((ad) => {
            const adConfig = verdictConfig[ad.verdict];
            return (
              <div
                key={ad.action_id}
                data-testid="policy-action-decision"
                className="grid grid-cols-[1fr_6rem_1fr_1fr] gap-2 items-center px-2 py-2 text-sm border-b border-cds-border-subtle last:border-b-0"
              >
                <span className="text-xs text-cds-text-primary font-medium truncate">
                  {ad.tool_ref}
                </span>
                <Badge variant={adConfig.badgeVariant}>{adConfig.label}</Badge>
                <span className="text-xs text-cds-text-secondary font-mono truncate">
                  {ad.rule_name}
                </span>
                <span className="text-xs text-cds-text-secondary truncate">
                  {ad.reason}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
