import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@utils/cn';
import type { LintCheck, ContractValidationResult } from '@/types/tool';

interface LintResultsPanelProps {
  result: ContractValidationResult | null;
  className?: string;
}

function StatusIcon({ status }: { status: LintCheck['status'] }) {
  if (status === 'pass') return <CheckCircle2 size={14} className="text-[#4caf50] shrink-0" />;
  if (status === 'fail') return <XCircle size={14} className="text-[#e74c3c] shrink-0" />;
  return <AlertTriangle size={14} className="text-[#ff9800] shrink-0" />;
}

export default function LintResultsPanel({ result, className }: LintResultsPanelProps) {
  if (!result) return null;

  const { lint } = result;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-[8px] bg-[#f5f5f0] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
          Lint Results
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className={cn(lint.passed ? 'text-[#4caf50]' : 'text-[#e74c3c]', 'font-medium')}>
            {lint.passed ? 'Passed' : 'Failed'}
          </span>
          {lint.error_count > 0 && (
            <span className="text-[#e74c3c]">{lint.error_count} error{lint.error_count !== 1 ? 's' : ''}</span>
          )}
          {lint.warning_count > 0 && (
            <span className="text-[#ff9800]">{lint.warning_count} warning{lint.warning_count !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Individual checks */}
      <div className="space-y-1">
        {lint.checks.map((check, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start gap-2 rounded-[6px] px-3 py-2',
              check.status === 'fail' && 'bg-[#ffebee]',
              check.status === 'warn' && 'bg-[#fff3e0]',
              check.status === 'pass' && 'bg-white',
            )}
          >
            <StatusIcon status={check.status} />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-[#1a1a1a]">{check.name}</div>
              <div className="text-[10px] text-[#6b6b6b]">{check.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Section errors/warnings */}
      {Object.entries(result.sections ?? {}).map(([section, data]) => {
        const errors = data.errors ?? [];
        const warnings = data.warnings ?? [];
        if (errors.length === 0 && warnings.length === 0) return null;
        return (
          <div key={section} className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
              {section}
            </div>
            {errors.map((err, i) => (
              <div key={`e-${i}`} className="flex items-start gap-2 rounded-[6px] bg-[#ffebee] px-3 py-1.5">
                <XCircle size={12} className="text-[#e74c3c] shrink-0 mt-0.5" />
                <span className="text-[10px] text-[#e74c3c]">
                  <strong>{err.field}:</strong> {err.message}
                </span>
              </div>
            ))}
            {warnings.map((warn, i) => (
              <div key={`w-${i}`} className="flex items-start gap-2 rounded-[6px] bg-[#fff3e0] px-3 py-1.5">
                <AlertTriangle size={12} className="text-[#ff9800] shrink-0 mt-0.5" />
                <span className="text-[10px] text-[#ff9800]">
                  <strong>{warn.field}:</strong> {warn.message}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
