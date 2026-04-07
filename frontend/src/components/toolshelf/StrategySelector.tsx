import type { ReactNode } from 'react';
import { Scale, Target, DollarSign } from 'lucide-react';
import Dropdown from '@components/ui/Dropdown';
import Button from '@components/ui/Button';
import type { ResolutionStrategy } from '@/types/tool';

interface StrategySelectorProps {
  value: ResolutionStrategy;
  onChange: (strategy: ResolutionStrategy) => void;
}

const STRATEGY_LABELS: Record<ResolutionStrategy, string> = {
  weighted: 'Weighted',
  priority: 'Priority',
  cost_optimized: 'Cost Optimized',
};

const STRATEGY_ICONS: Record<ResolutionStrategy, ReactNode> = {
  weighted: <Scale size={14} />,
  priority: <Target size={14} />,
  cost_optimized: <DollarSign size={14} />,
};

export default function StrategySelector({ value, onChange }: StrategySelectorProps) {
  const items = [
    { label: 'Weighted', value: 'weighted' as const, icon: <Scale size={14} /> },
    { label: 'Priority', value: 'priority' as const, icon: <Target size={14} /> },
    { label: 'Cost Optimized', value: 'cost_optimized' as const, icon: <DollarSign size={14} /> },
  ];

  return (
    <Dropdown
      align="right"
      trigger={
        <Button variant="ghost" size="sm" icon={STRATEGY_ICONS[value]}>
          {STRATEGY_LABELS[value]}
        </Button>
      }
      items={items}
      onSelect={(v) => onChange(v as ResolutionStrategy)}
    />
  );
}
