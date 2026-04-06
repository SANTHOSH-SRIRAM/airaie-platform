import { cn } from '@utils/cn';
import type { PreflightResult as PreflightResultType } from '@/types/plan';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PreflightResultProps {
  result: PreflightResultType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreflightResult({ result }: PreflightResultProps) {
  const hasBlockers = result.blockers.length > 0;
  const hasSuggestions = result.suggestions.length > 0;

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Status banner */}
      {result.passed ? (
        <div className="flex items-center gap-[8px] p-[12px] rounded-[8px] bg-[#e8f5e9] border border-[#c8e6c9]">
          <CheckCircle2 size={16} className="text-[#4caf50] shrink-0" />
          <span className="text-[12px] font-semibold text-[#4caf50]">
            Preflight passed - ready to execute
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-[8px] p-[12px] rounded-[8px] bg-[#ffebee] border border-[#ffcdd2]">
          <XCircle size={16} className="text-[#e74c3c] shrink-0" />
          <span className="text-[12px] font-semibold text-[#e74c3c]">
            Preflight failed - {result.blockers.length} blocker{result.blockers.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}

      {/* Blockers */}
      {hasBlockers && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#e74c3c] mb-[6px] block">
            Blockers
          </span>
          <div className="flex flex-col gap-[4px]">
            {result.blockers.map((blocker, i) => (
              <div
                key={i}
                className="flex items-start gap-[8px] p-[10px] rounded-[6px] bg-[#fff5f5] border border-[#ffcdd2]"
              >
                <XCircle size={14} className="text-[#e74c3c] shrink-0 mt-[1px]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[11px] font-semibold text-[#e74c3c]">
                      {blocker.check}
                    </span>
                    {blocker.node_id && (
                      <span className="text-[9px] font-mono text-[#acacac] bg-[#f0f0ec] px-[4px] py-[1px] rounded">
                        {blocker.node_id}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6b6b6b] mt-[2px]">{blocker.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {hasSuggestions && (
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#ff9800] mb-[6px] block">
            Suggestions
          </span>
          <div className="flex flex-col gap-[4px]">
            {result.suggestions.map((suggestion, i) => (
              <div
                key={i}
                className="flex items-start gap-[8px] p-[10px] rounded-[6px] bg-[#fffdf5] border border-[#ffe0b2]"
              >
                <AlertTriangle size={14} className="text-[#ff9800] shrink-0 mt-[1px]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[11px] font-semibold text-[#ff9800]">
                      {suggestion.check}
                    </span>
                    {suggestion.node_id && (
                      <span className="text-[9px] font-mono text-[#acacac] bg-[#f0f0ec] px-[4px] py-[1px] rounded">
                        {suggestion.node_id}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6b6b6b] mt-[2px]">{suggestion.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All clear */}
      {result.passed && !hasSuggestions && (
        <div className="flex items-center gap-[6px] py-[4px]">
          <Info size={12} className="text-[#acacac]" />
          <span className="text-[11px] text-[#acacac]">No blockers or suggestions</span>
        </div>
      )}
    </div>
  );
}
