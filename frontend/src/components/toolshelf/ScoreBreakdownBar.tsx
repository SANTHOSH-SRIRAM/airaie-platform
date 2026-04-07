import { useState } from 'react';
import { cn } from '@utils/cn';
import type { ScoreBreakdown } from '@/types/tool';

interface ScoreBreakdownBarProps {
  breakdown: ScoreBreakdown;
  className?: string;
}

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  isNegative: boolean;
}

function buildSegments(breakdown: ScoreBreakdown): Segment[] {
  return [
    { key: 'trust', label: 'Trust', value: breakdown.trust_contribution, color: 'bg-blue-60', isNegative: false },
    { key: 'success', label: 'Success', value: breakdown.success_contribution, color: 'bg-green-50', isNegative: false },
    { key: 'intent', label: 'Intent', value: breakdown.intent_contribution, color: 'bg-teal-50', isNegative: false },
    { key: 'preference', label: 'Preference', value: breakdown.preference_contribution, color: 'bg-purple-60', isNegative: false },
    { key: 'cost_penalty', label: 'Cost Penalty', value: Math.abs(breakdown.cost_penalty), color: 'bg-yellow-30', isNegative: true },
    { key: 'time_penalty', label: 'Time Penalty', value: Math.abs(breakdown.time_penalty), color: 'bg-red-50', isNegative: true },
  ].filter((s) => s.value > 0);
}

export default function ScoreBreakdownBar({ breakdown, className }: ScoreBreakdownBarProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const segments = buildSegments(breakdown);
  const totalWidth = segments.reduce((acc, s) => acc + s.value, 0);

  if (totalWidth === 0) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Bar */}
      <div className="relative w-full h-2 bg-gray-20 rounded-full overflow-hidden flex">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="relative"
            style={{ width: `${(seg.value / totalWidth) * 100}%` }}
            onMouseEnter={() => setHoveredKey(seg.key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <div
              className={cn(
                'h-full transition-opacity duration-100',
                seg.color,
                seg.isNegative && 'opacity-60',
                hoveredKey && hoveredKey !== seg.key && 'opacity-40',
              )}
            />
            {/* Tooltip */}
            {hoveredKey === seg.key && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-100 text-white text-[10px] rounded whitespace-nowrap z-10 pointer-events-none">
                {seg.label}: {seg.isNegative ? '-' : '+'}{seg.value.toFixed(2)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1 text-[10px] text-cds-text-secondary">
            <span className={cn('w-2 h-2 rounded-full shrink-0', seg.color, seg.isNegative && 'opacity-60')} />
            <span>{seg.label}</span>
            <span className="text-cds-text-helper">
              {seg.isNegative ? '-' : '+'}{seg.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
