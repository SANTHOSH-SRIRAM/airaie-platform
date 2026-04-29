import { memo } from 'react';

export type ToolTrustLevel = 'untested' | 'community' | 'tested' | 'verified' | 'certified';

export interface ToolChainItem {
  name: string;
  version: string;
  trust: ToolTrustLevel;
}

interface ToolChainCardProps {
  tools: ToolChainItem[];
}

const trustColor: Record<ToolTrustLevel, string> = {
  untested:  'bg-[#cc3326]/15 text-[#cc3326]',
  community: 'bg-[#1976d2]/15 text-[#1976d2]',
  tested:    'bg-[#ff9800]/22 text-[#8b5000]',
  verified:  'bg-[#2e8c56]/18 text-[#2e8c56]',
  certified: 'bg-[#7b1fa2]/15 text-[#7b1fa2]',
};

function ToolPill({ tool }: { tool: ToolChainItem }) {
  return (
    <div className="flex w-[140px] shrink-0 flex-col items-center gap-[6px] rounded-[10px] bg-[#f5f5f0] px-[14px] py-[14px]">
      <span className="truncate max-w-full font-sans text-[13px] font-medium text-[#1a1c19]" title={tool.name}>
        {tool.name}
      </span>
      <span className="font-mono text-[10px] text-[#554433]/70">v{tool.version}</span>
      <span
        className={`inline-flex items-center rounded-[3px] px-[6px] py-[2px] font-mono text-[9px] uppercase ${trustColor[tool.trust]}`}
      >
        {tool.trust}
      </span>
    </div>
  );
}

function ToolChainCardImpl({ tools }: ToolChainCardProps) {
  return (
    <div className="-mx-[2px] overflow-x-auto px-[2px] py-[2px]">
      <div className="flex items-stretch gap-[8px]">
        {tools.map((tool, idx) => (
          <div key={`${tool.name}-${idx}`} className="contents">
            <ToolPill tool={tool} />
            {idx < tools.length - 1 ? (
              <span
                className="self-center font-mono text-[16px] font-bold text-[#554433]/50"
                aria-hidden="true"
              >
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export const ToolChainCard = memo(ToolChainCardImpl);
export default ToolChainCard;
