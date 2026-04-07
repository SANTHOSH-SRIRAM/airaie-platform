import { Star, CheckCircle } from 'lucide-react';
import Badge from '@components/ui/Badge';
import Button from '@components/ui/Button';
import ScoreBreakdownBar from './ScoreBreakdownBar';
import type { RankedTool, TrustLevel } from '@/types/tool';

interface RecommendedToolCardProps {
  tool: RankedTool;
  onSelect?: (tool: RankedTool) => void;
}

const trustVariant: Record<TrustLevel, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  certified: 'success',
  verified: 'success',
  tested: 'info',
  community: 'warning',
  untested: 'default',
};

export default function RecommendedToolCard({ tool, onSelect }: RecommendedToolCardProps) {
  return (
    <div className="border border-green-50 bg-green-20/20 p-4 rounded space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-green-60" />
          <span className="text-sm font-semibold text-cds-text-primary">{tool.name}</span>
          <Badge variant="info" badgeStyle="outline" className="text-[10px] h-5">
            v{tool.tool_version}
          </Badge>
        </div>
        <Badge variant="success">Recommended</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 text-xs text-cds-text-secondary">
        <div>
          <span className="block text-cds-text-helper">Score</span>
          <span className="font-medium text-cds-text-primary">{tool.score.toFixed(2)}</span>
        </div>
        <div>
          <span className="block text-cds-text-helper">Confidence</span>
          <span className="font-medium text-cds-text-primary">{(tool.confidence * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="block text-cds-text-helper">Success Rate</span>
          <span className="font-medium text-cds-text-primary">{(tool.success_rate * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="block text-cds-text-helper">Trust</span>
          <Badge variant={trustVariant[tool.trust_level]} className="text-[10px] h-5">
            {tool.trust_level}
          </Badge>
        </div>
      </div>

      {/* Cost & Time */}
      <div className="flex items-center gap-2 text-xs text-cds-text-secondary">
        <span>~${tool.cost_estimate.toFixed(2)}</span>
        <span className="text-cds-text-placeholder">/</span>
        <span>{tool.time_estimate}</span>
      </div>

      {/* Score Breakdown */}
      <ScoreBreakdownBar breakdown={tool.score_breakdown} />

      {/* Match Reasons */}
      {tool.match_reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tool.match_reasons.map((reason) => (
            <Badge key={reason} variant="default" className="text-[10px] h-5">
              {reason}
            </Badge>
          ))}
        </div>
      )}

      {/* Select button */}
      {onSelect && (
        <div className="pt-1">
          <Button
            variant="primary"
            size="sm"
            icon={<CheckCircle size={14} />}
            onClick={() => onSelect(tool)}
          >
            Select
          </Button>
        </div>
      )}
    </div>
  );
}
