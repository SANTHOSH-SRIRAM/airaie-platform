import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X, Zap, DollarSign, Target, Shield } from 'lucide-react';
import Badge from '@components/ui/Badge';
import Button from '@components/ui/Button';
import ProgressBar from '@components/ui/ProgressBar';
import { cn } from '@utils/cn';

/* ---------- Types ---------- */

interface ProposedAction {
  action_id: string;
  tool_ref: string;
  permissions: string[];
  inputs: Record<string, unknown>;
  order: number;
  scoring: { compatibility: number; trust: number; cost: number; final_score: number };
  justification: string;
  requires_approval: boolean;
}

export interface ActionProposal {
  id: string;
  agent_id: string;
  goal: string;
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
  actions: ProposedAction[];
  total_score: number;
  estimated_cost: number;
  created_at: string;
}

interface ProposalViewerProps {
  proposal: ActionProposal | null;
  onApprove?: () => void;
  onReject?: () => void;
}

/* ---------- Helpers ---------- */

const statusVariant: Record<ActionProposal['status'], 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  draft: 'info',
  approved: 'success',
  executing: 'warning',
  completed: 'success',
  failed: 'danger',
};

function scoreVariant(score: number): 'green' | 'amber' | 'red' {
  if (score >= 0.8) return 'green';
  if (score >= 0.6) return 'amber';
  return 'red';
}

function ScoringBreakdown({ scoring }: { scoring: ProposedAction['scoring'] }) {
  const bars = [
    { label: 'Compatibility', value: scoring.compatibility, icon: Target },
    { label: 'Trust', value: scoring.trust, icon: Shield },
    { label: 'Cost', value: scoring.cost, icon: DollarSign },
  ] as const;

  return (
    <div className="space-y-2 mt-2">
      {bars.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-cds-text-secondary shrink-0" />
          <span className="text-xs text-cds-text-secondary w-24 shrink-0">{label}</span>
          <div className="flex-1">
            <ProgressBar
              value={Math.round(value * 100)}
              max={100}
              variant={scoreVariant(value)}
              size="sm"
              showPercent={false}
            />
          </div>
          <span className="text-xs text-cds-text-primary font-medium w-10 text-right">
            {Math.round(value * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Component ---------- */

export default function ProposalViewer({ proposal, onApprove, onReject }: ProposalViewerProps) {
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  if (!proposal) {
    return (
      <div data-testid="proposal-viewer" className="p-4 flex items-center justify-center">
        <p className="text-sm text-cds-text-secondary">No proposal available.</p>
      </div>
    );
  }

  const toggleAction = (actionId: string) => {
    setExpandedActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };

  const sortedActions = [...proposal.actions].sort((a, b) => a.order - b.order);

  return (
    <div data-testid="proposal-viewer" className="border border-card-border rounded-lg bg-card-bg shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border-inner">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-primary" />
          <span className="text-sm font-semibold text-cds-text-primary">Action Proposal</span>
          <Badge variant={statusVariant[proposal.status]}>{proposal.status}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-cds-text-secondary">
          <span>
            Score: <span className="font-medium text-cds-text-primary">{(proposal.total_score * 100).toFixed(0)}%</span>
          </span>
          <span>
            Est. Cost: <span className="font-medium text-cds-text-primary">${proposal.estimated_cost.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* Goal */}
      <div className="px-4 py-3 border-b border-card-border-inner">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-1">GOAL</p>
        <p className="text-sm text-cds-text-primary leading-relaxed">{proposal.goal}</p>
      </div>

      {/* Actions Table */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
          ACTIONS ({sortedActions.length})
        </p>

        {/* Table Header */}
        <div className="grid grid-cols-[2rem_3rem_1fr_6rem_5rem_1fr_5rem] gap-2 items-center px-2 py-1.5 text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase border-b border-cds-border-subtle">
          <span />
          <span>Order</span>
          <span>Tool</span>
          <span>Score</span>
          <span>Cost</span>
          <span>Justification</span>
          <span>Approval</span>
        </div>

        {/* Table Rows */}
        {sortedActions.map((action) => {
          const isExpanded = expandedActions.has(action.action_id);
          return (
            <div key={action.action_id} data-testid="proposal-action-row">
              {/* Main row */}
              <div
                className={cn(
                  'grid grid-cols-[2rem_3rem_1fr_6rem_5rem_1fr_5rem] gap-2 items-center px-2 py-2 text-sm cursor-pointer',
                  'hover:bg-cds-background-hover transition-colors',
                  'border-b border-cds-border-subtle',
                )}
                onClick={() => toggleAction(action.action_id)}
              >
                <span className="text-cds-text-secondary">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </span>
                <span className="text-xs text-cds-text-primary font-mono">{action.order}</span>
                <span className="text-xs text-cds-text-primary font-medium truncate">{action.tool_ref}</span>
                <div className="flex items-center gap-1">
                  <div className="flex-1">
                    <ProgressBar
                      value={Math.round(action.scoring.final_score * 100)}
                      max={100}
                      variant={scoreVariant(action.scoring.final_score)}
                      size="sm"
                      showPercent={false}
                    />
                  </div>
                  <span className="text-[10px] text-cds-text-secondary w-8 text-right">
                    {Math.round(action.scoring.final_score * 100)}%
                  </span>
                </div>
                <span className="text-xs text-cds-text-primary">${(action.scoring.cost).toFixed(2)}</span>
                <span className="text-xs text-cds-text-secondary truncate">{action.justification}</span>
                <span>
                  {action.requires_approval ? (
                    <Badge variant="warning">Required</Badge>
                  ) : (
                    <Badge variant="success">Auto</Badge>
                  )}
                </span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 py-3 bg-cds-layer-01 border-b border-cds-border-subtle">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Scoring Breakdown */}
                    <div>
                      <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-1">
                        SCORING BREAKDOWN
                      </p>
                      <ScoringBreakdown scoring={action.scoring} />
                    </div>

                    {/* Inputs */}
                    <div>
                      <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-1">
                        INPUTS
                      </p>
                      <div className="rounded bg-gray-20 p-2 font-mono text-xs text-cds-text-primary max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(action.inputs, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="mt-3">
                    <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-1">
                      PERMISSIONS
                    </p>
                    <div className="flex gap-1.5">
                      {action.permissions.map((perm) => (
                        <Badge key={perm} variant="default" badgeStyle="outline">{perm}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: Approve / Reject buttons */}
      {proposal.status === 'draft' && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-card-border-inner">
          <Button
            data-testid="proposal-reject-btn"
            variant="danger"
            size="sm"
            icon={<X />}
            onClick={onReject}
          >
            Reject
          </Button>
          <Button
            data-testid="proposal-approve-btn"
            variant="primary"
            size="sm"
            icon={<Check />}
            onClick={onApprove}
          >
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}
