import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

interface RetryPolicy {
  maxRetries: number;
  delaySeconds: number;
}

interface RetryPolicySectionProps {
  policy: RetryPolicy | undefined;
  onChange: (policy: RetryPolicy) => void;
}

const DEFAULTS: RetryPolicy = {
  maxRetries: 0,
  delaySeconds: 5,
};

export default function RetryPolicySection({ policy, onChange }: RetryPolicySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [exponentialBackoff, setExponentialBackoff] = useState(false);

  const current = policy ?? DEFAULTS;

  const handleChange = useCallback(
    (field: keyof RetryPolicy, raw: string) => {
      const num = Number(raw);
      if (isNaN(num)) return;
      onChange({ ...current, [field]: num });
    },
    [current, onChange]
  );

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
        <RefreshCw size={12} className="text-[#949494]" />
        Retry Policy
        {!expanded && policy && policy.maxRetries > 0 && (
          <span className="ml-auto text-[10px] text-[#949494]">
            {current.maxRetries} retries, {current.delaySeconds}s delay
          </span>
        )}
      </button>
      {expanded && (
        <div className="space-y-3 px-4 pb-3">
          {/* Max retries */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#949494]">
              Max Retries
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={current.maxRetries}
              onChange={(e) => handleChange('maxRetries', e.target.value)}
              placeholder={String(DEFAULTS.maxRetries)}
              className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-[10px] text-[#949494]">0 - 10 retries (0 = no retry)</span>
          </div>

          {/* Delay */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#949494]">
              Delay Between Retries (seconds)
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={current.delaySeconds}
              onChange={(e) => handleChange('delaySeconds', e.target.value)}
              placeholder={String(DEFAULTS.delaySeconds)}
              className="w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-[10px] text-[#949494]">1 - 300 seconds</span>
          </div>

          {/* Exponential backoff toggle */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={exponentialBackoff}
              onChange={(e) => setExponentialBackoff(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#eceae4] text-blue-500 focus:ring-blue-400"
            />
            <span className="text-[11px] text-[#1a1a1a]">Exponential backoff</span>
            <span className="text-[10px] text-[#949494]">(visual only)</span>
          </label>
        </div>
      )}
    </div>
  );
}
