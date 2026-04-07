import { XCircle, Lightbulb } from 'lucide-react';
import Badge from '@components/ui/Badge';
import type { FilteredTool } from '@/types/tool';

interface UnavailableListProps {
  tools: FilteredTool[];
}

const reasonVariant: Record<string, 'danger' | 'warning' | 'default' | 'info'> = {
  trust: 'danger',
  deprecated: 'danger',
  incompatible: 'warning',
  constraint: 'warning',
  disabled: 'default',
};

function getReasonBadgeVariant(reason: string): 'danger' | 'warning' | 'default' | 'info' {
  const lower = reason.toLowerCase();
  for (const [key, variant] of Object.entries(reasonVariant)) {
    if (lower.includes(key)) return variant;
  }
  return 'default';
}

function UnavailableRow({ tool }: { tool: FilteredTool }) {
  return (
    <div className="flex flex-col gap-1.5 py-2 px-3 bg-red-20/10 rounded">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <XCircle size={14} className="text-red-50 shrink-0" />
          <span className="text-sm text-cds-text-secondary truncate">{tool.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={getReasonBadgeVariant(tool.reason)} className="text-[10px] h-5">
            {tool.reason}
          </Badge>
          <Badge variant="default" className="text-[10px] h-5">
            {tool.filter_stage}
          </Badge>
        </div>
      </div>

      <p className="text-[11px] text-cds-text-helper pl-5">{tool.message}</p>

      {tool.suggested_action && (
        <div className="flex items-center gap-1.5 text-[11px] text-cds-text-secondary pl-5">
          <Lightbulb size={11} className="text-yellow-30 shrink-0" />
          <span>{tool.suggested_action}</span>
        </div>
      )}
    </div>
  );
}

export default function UnavailableList({ tools }: UnavailableListProps) {
  if (tools.length === 0) return null;

  // Group by filter_stage
  const grouped = tools.reduce<Record<string, FilteredTool[]>>((acc, tool) => {
    const stage = tool.filter_stage || 'unknown';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(tool);
    return acc;
  }, {});

  const stages = Object.keys(grouped);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-cds-text-secondary">
        Unavailable ({tools.length})
      </h4>

      {stages.map((stage) => (
        <div key={stage} className="space-y-1">
          {stages.length > 1 && (
            <span className="text-[10px] text-cds-text-helper uppercase tracking-wider pl-1">
              {stage}
            </span>
          )}
          {grouped[stage].map((tool) => (
            <UnavailableRow key={tool.tool_id} tool={tool} />
          ))}
        </div>
      ))}
    </div>
  );
}
