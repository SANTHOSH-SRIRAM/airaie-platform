import type { ToolCallProposal } from '@/types/agentPlayground';
import Badge from '@components/ui/Badge';
import { cn } from '@utils/cn';

interface ToolCallProposalCardProps {
  proposal: ToolCallProposal;
}

function confidenceVariant(c: number): 'success' | 'warning' | 'danger' {
  if (c >= 0.8) return 'success';
  if (c >= 0.6) return 'warning';
  return 'danger';
}

export default function ToolCallProposalCard({ proposal }: ToolCallProposalCardProps) {
  // The type doesn't have a `status` field, so we treat all proposals as "proposed"
  const accentClass = 'border-l-blue-50';

  return (
    <div
      data-testid="tool-call-proposal"
      className={cn(
        'mt-2 rounded-md border border-card-border bg-card-bg shadow-card',
        'border-l-4',
        accentClass,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-card-border-inner">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-cds-text-primary">{proposal.toolName}</span>
          <Badge variant="info" badgeStyle="outline">v{proposal.toolVersion}</Badge>
        </div>
        <span data-testid="proposal-confidence">
          <Badge variant={confidenceVariant(proposal.confidence)}>
            {Math.round(proposal.confidence * 100)}%
          </Badge>
        </span>
      </div>

      <div className="px-3 py-2 space-y-3">
        {/* REASONING */}
        <div>
          <span className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">REASONING</span>
          <p className="mt-0.5 text-sm text-cds-text-secondary leading-relaxed">{proposal.reasoning}</p>
        </div>

        {/* INPUTS */}
        <div>
          <span className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">INPUTS</span>
          <div className="mt-0.5 rounded bg-gray-20 p-2 font-mono text-xs text-cds-text-primary space-y-0.5">
            {Object.entries(proposal.inputs).map(([key, value]) => (
              <div key={key}>
                <span className="text-cds-text-secondary">{key}:</span>{' '}
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ESTIMATED COST */}
        <div>
          <span className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">ESTIMATED COST</span>
          <p className="mt-0.5 text-sm text-cds-text-primary">${proposal.estimatedCost.toFixed(2)}</p>
        </div>

        {/* ALTERNATIVES */}
        <div>
          <span className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">ALTERNATIVES</span>
          {proposal.alternatives.length === 0 ? (
            <p className="mt-0.5 text-sm text-cds-text-secondary">None</p>
          ) : (
            <ul className="mt-0.5 space-y-1">
              {proposal.alternatives.map((alt) => (
                <li key={alt.name} className="text-sm text-cds-text-secondary">
                  {alt.name} <span className="text-cds-text-placeholder">({Math.round(alt.score * 100)}%)</span> — {alt.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
