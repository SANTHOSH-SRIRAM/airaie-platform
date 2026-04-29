import { memo } from 'react';

export type KpiEvaluation = 'pass' | 'fail' | 'pending';

interface KpiRowProps {
  metric: string;
  operator: string;
  target: string;
  unit?: string;
  evaluation?: KpiEvaluation;
}

const tickFor: Record<KpiEvaluation, { glyph: string; color: string }> = {
  pass:    { glyph: '✓', color: 'text-[#2e8c56]' },
  fail:    { glyph: '✗', color: 'text-[#cc3326]' },
  pending: { glyph: '•', color: 'text-[#554433]/40' },
};

function KpiRowImpl({ metric, operator, target, unit, evaluation = 'pending' }: KpiRowProps) {
  const tick = tickFor[evaluation];
  return (
    <div className="inline-flex items-center gap-[12px] rounded-[8px] bg-[#f5f5f0] px-[12px] py-[10px]">
      <span className={`font-mono text-[12px] font-bold ${tick.color}`} aria-hidden="true">
        {tick.glyph}
      </span>
      <span className="font-sans text-[13px] font-medium text-[#1a1c19]">{metric}</span>
      <span className="font-mono text-[12px] text-[#8b5000]">{operator}</span>
      <span className="font-mono text-[13px] font-bold text-[#1a1c19]">{target}</span>
      {unit ? <span className="font-sans text-[12px] text-[#554433]/70">{unit}</span> : null}
    </div>
  );
}

export const KpiRow = memo(KpiRowImpl);
export default KpiRow;
