import { memo, type ReactNode } from 'react';
import NumberCircle from './NumberCircle';
import StatusBadge, { type StatusBadgeTone } from './StatusBadge';

interface StagePanelProps {
  number: number;
  title: string;
  status?: string;
  statusTone?: StatusBadgeTone;
  children: ReactNode;
  /** Set true to render a dimmed/locked collapsed state (children ignored). */
  collapsed?: boolean;
}

function StagePanelImpl({
  number,
  title,
  status,
  statusTone = 'neutral',
  children,
  collapsed = false,
}: StagePanelProps) {
  if (collapsed) {
    return (
      <section
        data-stage={number}
        className="flex items-center justify-between rounded-[16px] bg-[#ebebe6]/55 px-[24px] py-[24px]"
      >
        <div className="flex items-center gap-[16px]">
          <NumberCircle number={number} />
          <h3 className="font-sans text-[16px] font-medium text-[#554433]/70">{title}</h3>
        </div>
        <span aria-label="locked" className="font-mono text-[14px] text-[#554433]/40">🔒</span>
      </section>
    );
  }

  return (
    <section
      data-stage={number}
      className="flex flex-col gap-[24px] rounded-[16px] bg-white px-[32px] py-[32px] shadow-card"
    >
      <header className="flex items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[12px]">
          <NumberCircle number={number} />
          <h3 className="font-sans text-[20px] font-medium text-[#1a1c19]">{title}</h3>
        </div>
        {status ? <StatusBadge tone={statusTone}>{status}</StatusBadge> : null}
      </header>
      <div className="flex flex-col gap-[20px]">{children}</div>
    </section>
  );
}

export const StagePanel = memo(StagePanelImpl);
export default StagePanel;
