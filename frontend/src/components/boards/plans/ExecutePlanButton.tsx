import { useState } from 'react';
import { cn } from '@utils/cn';
import { useValidatePlan, useExecutePlan } from '@hooks/usePlans';
import type { PreflightResult as PreflightResultType } from '@/types/plan';
import PreflightResult from './PreflightResult';
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExecutePlanButtonProps {
  cardId: string;
  boardId?: string;
  onExecuted?: (runId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Stage = 'idle' | 'validating' | 'validated' | 'executing' | 'done' | 'error';

export default function ExecutePlanButton({ cardId, boardId, onExecuted }: ExecutePlanButtonProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [preflight, setPreflight] = useState<PreflightResultType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validatePlan = useValidatePlan(cardId);
  const executePlan = useExecutePlan(cardId, boardId);

  const handleClick = async () => {
    setErrorMsg(null);

    // Step 1: Validate
    setStage('validating');
    try {
      const result = await validatePlan.mutateAsync();
      setPreflight(result);

      if (!result.passed) {
        setStage('validated');
        return; // show blockers, don't execute
      }

      setStage('validated');

      // Step 2: Execute
      setStage('executing');
      const plan = await executePlan.mutateAsync();
      setStage('done');

      if (plan.run_id) {
        onExecuted?.(plan.run_id);
      }
    } catch (err: unknown) {
      setStage('error');
      setErrorMsg((err as Error)?.message ?? 'Failed to execute plan');
    }
  };

  const reset = () => {
    setStage('idle');
    setPreflight(null);
    setErrorMsg(null);
  };

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Button */}
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          onClick={handleClick}
          disabled={stage === 'validating' || stage === 'executing'}
          className={cn(
            'h-[36px] px-[18px] rounded-[8px] text-[12px] font-semibold text-white transition-colors flex items-center gap-[6px]',
            stage === 'validating' || stage === 'executing'
              ? 'bg-[#d0d0d0] cursor-not-allowed'
              : stage === 'done'
                ? 'bg-[#4caf50] hover:bg-[#43a047]'
                : stage === 'error'
                  ? 'bg-[#e74c3c] hover:bg-[#d32f2f]'
                  : 'bg-[#ff9800] hover:bg-[#f57c00]',
          )}
        >
          {(stage === 'validating' || stage === 'executing') && (
            <Loader2 size={14} className="animate-spin" />
          )}
          {stage === 'done' && <CheckCircle2 size={14} />}
          {stage === 'error' && <XCircle size={14} />}
          {stage !== 'validating' && stage !== 'executing' && stage !== 'done' && stage !== 'error' && (
            <Play size={14} />
          )}

          {stage === 'idle' && 'Execute Plan'}
          {stage === 'validating' && 'Validating...'}
          {stage === 'validated' && preflight?.passed && 'Executing...'}
          {stage === 'validated' && !preflight?.passed && 'Blocked'}
          {stage === 'executing' && 'Executing...'}
          {stage === 'done' && 'Executed'}
          {stage === 'error' && 'Failed'}
        </button>

        {(stage === 'done' || stage === 'error' || (stage === 'validated' && !preflight?.passed)) && (
          <button
            type="button"
            onClick={reset}
            className="h-[36px] px-[14px] rounded-[8px] text-[12px] font-medium text-[#6b6b6b] border border-[#e8e8e8] hover:bg-[#f0f0ec] transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-center gap-[6px] p-[10px] rounded-[8px] bg-[#ffebee] border border-[#ffcdd2]">
          <XCircle size={14} className="text-[#e74c3c] shrink-0" />
          <span className="text-[11px] text-[#e74c3c]">{errorMsg}</span>
        </div>
      )}

      {/* Preflight results */}
      {preflight && !preflight.passed && (
        <PreflightResult result={preflight} />
      )}

      {preflight && preflight.passed && preflight.suggestions.length > 0 && stage !== 'idle' && (
        <PreflightResult result={preflight} />
      )}
    </div>
  );
}
