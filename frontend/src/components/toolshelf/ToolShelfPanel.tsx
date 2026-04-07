import { useState } from 'react';
import { Layers, AlertTriangle, Loader2, Clock } from 'lucide-react';
import Badge from '@components/ui/Badge';
import { useToolShelfResolve } from '@hooks/useTools';
import type { RankedTool, ResolutionStrategy } from '@/types/tool';
import StrategySelector from './StrategySelector';
import RecommendedToolCard from './RecommendedToolCard';
import AlternativesList from './AlternativesList';
import UnavailableList from './UnavailableList';

interface ToolShelfPanelProps {
  intentType: string;
  onSelect?: (tool: RankedTool) => void;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Recommended skeleton */}
      <div className="border border-card-border rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-gray-20" />
          <div className="h-5 w-24 rounded-full bg-gray-20" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-12 rounded bg-gray-10" />
              <div className="h-4 w-16 rounded bg-gray-20" />
            </div>
          ))}
        </div>
        <div className="h-2 w-full rounded-full bg-gray-20" />
      </div>

      {/* Alternatives skeleton */}
      <div className="space-y-1.5">
        <div className="h-3 w-24 rounded bg-gray-20" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-full rounded bg-gray-10" />
        ))}
      </div>
    </div>
  );
}

export default function ToolShelfPanel({ intentType, onSelect }: ToolShelfPanelProps) {
  const [strategy, setStrategy] = useState<ResolutionStrategy>('weighted');

  const { data, isLoading, isError, error } = useToolShelfResolve(intentType, strategy);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-cds-border-subtle flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-cds-text-primary flex items-center gap-2">
            <Layers size={16} className="text-cds-icon-secondary" />
            Tool Shelf
          </h3>
          <p className="text-xs text-cds-text-helper mt-0.5">
            Resolved tools for <span className="font-medium text-cds-text-secondary">{intentType}</span>
          </p>
        </div>
        <StrategySelector value={strategy} onChange={setStrategy} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-cds-text-secondary">
              <Loader2 size={14} className="animate-spin text-brand-primary" />
              Resolving tools...
            </div>
            <LoadingSkeleton />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="p-3 bg-red-20 text-red-80 text-xs rounded flex items-center gap-2" role="alert">
            <AlertTriangle size={14} />
            {error instanceof Error ? error.message : 'Resolution failed'}
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <>
            {/* Metadata bar */}
            <div className="flex items-center gap-3 text-xs text-cds-text-secondary flex-wrap">
              <Badge variant="info" badgeStyle="outline" className="text-[10px] h-5">
                {data.intent_type}
              </Badge>
              <Badge variant="default" badgeStyle="outline" className="text-[10px] h-5">
                {data.strategy}
              </Badge>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {data.metadata.resolution_time_ms}ms
              </span>
              <span>{data.metadata.total_discovered} discovered</span>
              <span>{data.metadata.total_ranked} ranked</span>
              {data.metadata.total_filtered_out > 0 && (
                <span className="text-cds-text-helper">{data.metadata.total_filtered_out} filtered</span>
              )}
            </div>

            {/* Recommended */}
            {data.recommended ? (
              <RecommendedToolCard tool={data.recommended} onSelect={onSelect} />
            ) : (
              <div className="p-4 bg-yellow-20/20 border border-yellow-30 rounded text-xs text-cds-text-secondary flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-30" />
                No recommended tool found for this intent type.
              </div>
            )}

            {/* Alternatives */}
            <AlternativesList alternatives={data.alternatives} onSelect={onSelect} />

            {/* Unavailable */}
            <UnavailableList tools={data.unavailable_with_reasons} />
          </>
        )}

        {/* Empty state — no intentType */}
        {!intentType.trim() && !isLoading && (
          <p className="text-xs text-cds-text-placeholder text-center py-8">
            Provide an intent type to resolve available tools.
          </p>
        )}
      </div>
    </div>
  );
}
