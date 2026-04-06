import { X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { CompileResult, ValidateResult } from '@api/workflows';
import { cn } from '@utils/cn';

interface ValidationPanelProps {
  result: ValidateResult | CompileResult | null;
  onClose: () => void;
}

/** Type guard: ValidateResult has `valid` field, CompileResult has `success` */
function isValidateResult(r: ValidateResult | CompileResult): r is ValidateResult {
  return 'valid' in r;
}

export default function ValidationPanel({ result, onClose }: ValidationPanelProps) {
  if (!result) return null;

  const isValidation = isValidateResult(result);
  const passed = isValidation ? result.valid : result.success;
  const errors = result.errors;
  const warnings = isValidation ? result.warnings : [];
  const title = isValidation ? 'Validation' : 'Compilation';

  return (
    <div className="absolute bottom-5 right-5 z-30 w-[340px] rounded-[14px] border border-[#ece9e3] bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ece9e3] px-4 py-3">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <XCircle size={16} className="text-red-500" />
          )}
          <span className="text-[13px] font-semibold text-[#1a1a1a]">
            {title} {passed ? 'Passed' : 'Failed'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#8d8d8d] transition-colors hover:bg-[#f8f8f7] hover:text-[#1a1a1a]"
          aria-label="Close validation panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[280px] overflow-y-auto p-3">
        {/* Success banner */}
        {passed && errors.length === 0 && warnings.length === 0 && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2.5">
            <p className="text-[12px] font-medium text-emerald-700">
              {title} passed with no issues.
            </p>
          </div>
        )}

        {/* Success with warnings */}
        {passed && warnings.length > 0 && errors.length === 0 && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2.5">
            <p className="text-[12px] font-medium text-emerald-700">
              {title} passed with {warnings.length} warning{warnings.length > 1 ? 's' : ''}.
            </p>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
              Errors ({errors.length})
            </h4>
            {errors.map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2"
              >
                <XCircle size={13} className="mt-0.5 shrink-0 text-red-500" />
                <div className="min-w-0">
                  {err.node_id && (
                    <span className="block text-[10px] font-mono text-red-400">
                      {err.node_id}
                    </span>
                  )}
                  <p className="text-[12px] text-red-700">{err.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className={cn('space-y-1.5', errors.length > 0 ? 'mt-3' : 'mt-2')}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              Warnings ({warnings.length})
            </h4>
            {warnings.map((warn, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2"
              >
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  {warn.node_id && (
                    <span className="block text-[10px] font-mono text-amber-400">
                      {warn.node_id}
                    </span>
                  )}
                  <p className="text-[12px] text-amber-700">{warn.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
