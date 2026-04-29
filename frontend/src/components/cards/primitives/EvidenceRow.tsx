import { memo } from 'react';

export type EvidenceEvaluation = 'pass' | 'fail' | 'pending';

interface EvidenceRowProps {
  metric: string;
  observed: string;
  unit?: string;
  target?: string;
  evaluation?: EvidenceEvaluation;
}

const tickFor: Record<EvidenceEvaluation, { glyph: string; color: string }> = {
  pass:    { glyph: '✓', color: 'text-[#2e8c56]' },
  fail:    { glyph: '✗', color: 'text-[#cc3326]' },
  pending: { glyph: '⚠', color: 'text-[#8b5000]' },
};

function EvidenceRowImpl({
  metric,
  observed,
  unit,
  target,
  evaluation = 'pass',
}: EvidenceRowProps) {
  const tick = tickFor[evaluation];
  return (
    <div className="flex items-center justify-between rounded-[8px] bg-[#f5f5f0] px-[14px] py-[12px]">
      <div className="flex items-center gap-[12px]">
        <span className={`font-mono text-[13px] font-bold ${tick.color}`} aria-hidden="true">
          {tick.glyph}
        </span>
        <span className="font-sans text-[13px] font-medium text-[#1a1c19]">{metric}</span>
      </div>
      <div className="flex items-baseline gap-[8px]">
        <span className="font-mono text-[14px] font-bold text-[#1a1c19]">{observed}</span>
        {unit ? <span className="font-sans text-[11px] text-[#554433]/70">{unit}</span> : null}
        {target ? (
          <span className="font-mono text-[10px] text-[#8b5000]">({target})</span>
        ) : null}
      </div>
    </div>
  );
}

export const EvidenceRow = memo(EvidenceRowImpl);
export default EvidenceRow;
