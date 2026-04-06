import { memo } from 'react';
import type { Tool } from '@/types/tool';
import Card from '@components/ui/Card';
import Badge from '@components/ui/Badge';
import {
  Triangle, Wind, Grid3X3, Database, Box, BarChart3,
  Thermometer, Activity, Layers, Brain, Calculator, ShieldCheck,
  Wrench, Globe,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@utils/cn';

const ICON_MAP: Record<string, LucideIcon> = {
  Triangle,
  Wind,
  Grid3x3: Grid3X3,
  Grid3X3,
  Database,
  Box,
  BarChart3,
  Thermometer,
  Activity,
  Layers,
  Brain,
  Calculator,
  ShieldCheck,
  Wrench,
  Globe,
};

const STATUS_BADGE: Record<string, { variant: 'success' | 'default' | 'danger'; label: string }> = {
  published: { variant: 'success', label: 'Published' },
  draft: { variant: 'default', label: 'Draft' },
  deprecated: { variant: 'danger', label: 'Deprecated' },
};

interface ToolCardProps {
  tool: Tool;
  selected: boolean;
  onSelect: (id: string) => void;
}

const ToolCard = memo(function ToolCard({ tool, selected, onSelect }: ToolCardProps) {
  const IconComponent = ICON_MAP[tool.icon] ?? Wrench;
  const statusInfo = STATUS_BADGE[tool.status] ?? STATUS_BADGE.draft;
  const costDisplay = `~$${tool.costPerRun.toFixed(2)}/run`;

  return (
    <Card
      data-testid="tool-card"
      hover
      variant="elevated"
      className={cn(
        'relative transition-all duration-150',
        selected && 'ring-2 ring-brand-primary border-brand-primary'
      )}
      onClick={() => onSelect(tool.id)}
    >
      <div className="px-4 py-4">
        {/* Status badge - top right */}
        <div className="absolute top-3 right-3">
          <Badge variant={statusInfo.variant} className="text-[10px] h-5">
            {statusInfo.label}
          </Badge>
        </div>

        {/* Icon + Name + Description */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-md bg-surface-layer border border-border-subtle flex items-center justify-center shrink-0">
            <IconComponent size={18} className="text-content-secondary" />
          </div>
          <div className="flex-1 min-w-0 pr-16">
            <h3 data-testid="tool-card-name" className="text-sm font-semibold text-content-primary truncate">
              {tool.name}
            </h3>
            <p className="text-xs text-content-helper mt-0.5 line-clamp-2 leading-relaxed">
              {tool.description}
            </p>
          </div>
        </div>

        {/* Version badge */}
        <div className="mb-2">
          <Badge variant="info" badgeStyle="outline" className="text-[10px] h-5">
            {tool.currentVersion}
          </Badge>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="inline-flex items-center px-1.5 h-5 rounded text-[10px] bg-surface-layer border border-border-subtle text-content-secondary">
            {tool.adapter}
          </span>
          <span className="inline-flex items-center px-1.5 h-5 rounded text-[10px] bg-surface-layer border border-border-subtle text-content-secondary capitalize">
            {tool.category}
          </span>
        </div>

        {/* Stats row */}
        <p className="text-[11px] text-content-placeholder">
          {tool.versions.length} version{tool.versions.length !== 1 ? 's' : ''} &middot; {costDisplay} &middot; Used {tool.usageCount} time{tool.usageCount !== 1 ? 's' : ''}
        </p>
      </div>
    </Card>
  );
});

export default ToolCard;
