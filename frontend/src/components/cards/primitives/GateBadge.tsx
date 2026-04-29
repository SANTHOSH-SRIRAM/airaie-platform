import { memo } from 'react';

export type GateStatus = 'PASSED' | 'FAILED' | 'PENDING' | 'WAIVED';

interface GateBadgeProps {
  name: string;
  status: GateStatus;
}

const statusMap: Record<GateStatus, { glyph: string; bg: string; text: string }> = {
  PASSED:  { glyph: '✓', bg: 'bg-[#2e8c56]/15', text: 'text-[#2e8c56]' },
  FAILED:  { glyph: '✗', bg: 'bg-[#cc3326]/15', text: 'text-[#cc3326]' },
  PENDING: { glyph: '○', bg: 'bg-[#ff9800]/22', text: 'text-[#8b5000]' },
  WAIVED:  { glyph: '⊝', bg: 'bg-[#554433]/15', text: 'text-[#554433]' },
};

function GateBadgeImpl({ name, status }: GateBadgeProps) {
  const s = statusMap[status];
  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-[8px] px-[12px] py-[8px] font-mono text-[11px] ${s.bg} ${s.text}`}
      title={`${name} — ${status}`}
    >
      <span className="font-bold" aria-hidden="true">{s.glyph}</span>
      <span>{name}</span>
    </span>
  );
}

export const GateBadge = memo(GateBadgeImpl);
export default GateBadge;
