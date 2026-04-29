import { memo } from 'react';

export type ToolTrustLevel = 'untested' | 'community' | 'tested' | 'verified' | 'certified';

export interface ToolChainItem {
  name: string;
  version: string;
  trust: ToolTrustLevel;
}

interface ToolChainCardProps {
  tools: ToolChainItem[];
  /** When set, each tool pill becomes a button that emits the clicked
   *  tool's name. Used by Phase 11 Method stage to open the
   *  ToolManifestDrawer. */
  onToolClick?: (tool: ToolChainItem) => void;
}

const trustColor: Record<ToolTrustLevel, string> = {
  untested:  'bg-[#cc3326]/15 text-[#cc3326]',
  community: 'bg-[#1976d2]/15 text-[#1976d2]',
  tested:    'bg-[#ff9800]/22 text-[#8b5000]',
  verified:  'bg-[#2e8c56]/18 text-[#2e8c56]',
  certified: 'bg-[#7b1fa2]/15 text-[#7b1fa2]',
};

function ToolPill({
  tool,
  onClick,
}: {
  tool: ToolChainItem;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className="max-w-full truncate font-sans text-[13px] font-medium text-[#1a1c19]"
        title={tool.name}
      >
        {tool.name}
      </span>
      <span className="font-mono text-[10px] text-[#554433]/70">v{tool.version}</span>
      <span
        className={`inline-flex items-center rounded-[3px] px-[6px] py-[2px] font-mono text-[9px] uppercase ${trustColor[tool.trust]}`}
      >
        {tool.trust}
      </span>
    </>
  );

  const baseClasses =
    'flex w-[140px] shrink-0 flex-col items-center gap-[6px] rounded-[10px] bg-[#f5f5f0] px-[14px] py-[14px]';

  if (!onClick) {
    return <div className={baseClasses}>{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} text-left transition-colors hover:bg-[#ebebe6]`}
      title={`Inspect ${tool.name} manifest`}
    >
      {inner}
    </button>
  );
}

function ToolChainCardImpl({ tools, onToolClick }: ToolChainCardProps) {
  return (
    <div className="-mx-[2px] overflow-x-auto px-[2px] py-[2px]">
      <div className="flex items-stretch gap-[8px]">
        {tools.map((tool, idx) => (
          <div key={`${tool.name}-${idx}`} className="contents">
            <ToolPill
              tool={tool}
              onClick={onToolClick ? () => onToolClick(tool) : undefined}
            />
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
