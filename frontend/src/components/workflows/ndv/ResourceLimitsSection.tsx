import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Cpu } from 'lucide-react';

interface ResourceLimits {
  cpu: number;
  memoryMb: number;
  timeoutSeconds: number;
}

interface ResourceLimitsSectionProps {
  limits: ResourceLimits | undefined;
  onChange: (limits: ResourceLimits) => void;
}

const DEFAULTS: ResourceLimits = {
  cpu: 2,
  memoryMb: 1024,
  timeoutSeconds: 300,
};

export default function ResourceLimitsSection({ limits, onChange }: ResourceLimitsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const current = limits ?? DEFAULTS;

  const handleChange = useCallback(
    (field: keyof ResourceLimits, raw: string) => {
      const num = Number(raw);
      if (isNaN(num)) return;
      onChange({ ...current, [field]: num });
    },
    [current, onChange]
  );

  const memoryDisplay =
    current.memoryMb >= 1024
      ? `${(current.memoryMb / 1024).toFixed(1)} GB`
      : `${current.memoryMb} MB`;

  const timeoutDisplay =
    current.timeoutSeconds >= 60
      ? `${(current.timeoutSeconds / 60).toFixed(1)} min`
      : `${current.timeoutSeconds}s`;

  return (
    <div className="border-t border-[#eceae4]">
      <button
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-[#1a1a1a] hover:bg-[#f7f7f5]"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown size={12} className="text-[#949494]" />
        ) : (
          <ChevronRight size={12} className="text-[#949494]" />
        )}
        <Cpu size={12} className="text-[#949494]" />
        Resource Limits
        {!expanded && limits && (
          <span className="ml-auto text-[10px] text-[#949494]">
            {current.cpu} CPU, {memoryDisplay}, {timeoutDisplay}
          </span>
        )}
      </button>
      {expanded && (
        <div className="space-y-3 px-4 pb-3">
          {/* CPU */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#949494]">
              CPU Cores
            </label>
            <input
              type="number"
              min={1}
              max={32}
              value={current.cpu}
              onChange={(e) => handleChange('cpu', e.target.value)}
              placeholder={String(DEFAULTS.cpu)}
              className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-[10px] text-[#949494]">1 - 32 cores</span>
          </div>

          {/* Memory */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#949494]">
              Memory (MB)
            </label>
            <input
              type="number"
              min={256}
              max={65536}
              step={256}
              value={current.memoryMb}
              onChange={(e) => handleChange('memoryMb', e.target.value)}
              placeholder={String(DEFAULTS.memoryMb)}
              className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-[10px] text-[#949494]">
              256 - 65,536 MB {current.memoryMb >= 1024 && `(${memoryDisplay})`}
            </span>
          </div>

          {/* Timeout */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#949494]">
              Timeout (seconds)
            </label>
            <input
              type="number"
              min={10}
              max={3600}
              value={current.timeoutSeconds}
              onChange={(e) => handleChange('timeoutSeconds', e.target.value)}
              placeholder={String(DEFAULTS.timeoutSeconds)}
              className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-[10px] text-[#949494]">
              10 - 3,600s {current.timeoutSeconds >= 60 && `(${timeoutDisplay})`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
