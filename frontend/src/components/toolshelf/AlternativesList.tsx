import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react';
import Badge from '@components/ui/Badge';
import Button from '@components/ui/Button';
import type { RankedTool, TrustLevel } from '@/types/tool';

interface AlternativesListProps {
  alternatives: RankedTool[];
  onSelect?: (tool: RankedTool) => void;
}

const COLLAPSED_MAX = 5;

const trustVariant: Record<TrustLevel, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  certified: 'success',
  verified: 'success',
  tested: 'info',
  community: 'warning',
  untested: 'default',
};

function AlternativeRow({ tool, onSelect }: { tool: RankedTool; onSelect?: (tool: RankedTool) => void }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-cds-layer-01 rounded">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-cds-text-primary font-medium truncate">{tool.name}</span>
        <Badge variant="info" badgeStyle="outline" className="text-[10px] h-5 shrink-0">
          v{tool.tool_version}
        </Badge>
        <Badge variant={trustVariant[tool.trust_level]} className="text-[10px] h-5 shrink-0">
          {tool.trust_level}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-cds-text-secondary shrink-0">
        <span>Score: {tool.score.toFixed(2)}</span>
        <span>{(tool.confidence * 100).toFixed(0)}%</span>
        <span>~${tool.cost_estimate.toFixed(2)}</span>
        {onSelect && (
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowRightLeft size={12} />}
            className="h-6 px-2 text-xs"
            onClick={() => onSelect(tool)}
          >
            Use Instead
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AlternativesList({ alternatives, onSelect }: AlternativesListProps) {
  const [expanded, setExpanded] = useState(false);

  if (alternatives.length === 0) return null;

  const canExpand = alternatives.length > COLLAPSED_MAX;
  const visible = expanded ? alternatives : alternatives.slice(0, COLLAPSED_MAX);

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-cds-text-secondary">
        Alternatives ({alternatives.length})
      </h4>

      {visible.map((alt) => (
        <AlternativeRow key={`${alt.tool_id}-${alt.tool_version}`} tool={alt} onSelect={onSelect} />
      ))}

      {canExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-brand-primary hover:underline pt-1"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} />
              Show less
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              Show {alternatives.length - COLLAPSED_MAX} more
            </>
          )}
        </button>
      )}
    </div>
  );
}
