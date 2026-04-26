import { Loader2, AlertCircle } from 'lucide-react';
import { useIntentTypePipelines } from '@hooks/useIntents';
import { useGeneratePlan, usePlan } from '@hooks/usePlans';
import ConfigSection from './ConfigSection';
import type { Card } from '@/types/card';
import type { IntentSpec } from '@/types/intent';
import type { CardModeRules } from '@hooks/useCardModeRules';

// ---------------------------------------------------------------------------
// AvailableMethodsTable — lists pipelines (Methods) that match the Card's
// intent_type. Selecting one calls useGeneratePlan(card.id, { pipeline_id })
// which compiles the pipeline against the IntentSpec and writes the plan
// into the planKeys.detail(cardId) cache. Both CardTopBar and CardActionBar
// pick up the new plan automatically via cache subscription.
//
// Disabled state: when `rules.canChangePipeline` is false, the radios are
// disabled. The currently-selected pipeline (if a plan exists) is shown
// checked; otherwise the first pipeline is highlighted as a suggestion but
// not auto-selected — the user must click to pick.
// ---------------------------------------------------------------------------

interface AvailableMethodsTableProps {
  card: Card;
  intent: IntentSpec;
  rules: CardModeRules;
}

export default function AvailableMethodsTable({
  card,
  intent,
  rules,
}: AvailableMethodsTableProps) {
  const { data: pipelines, isLoading, error } = useIntentTypePipelines(intent.intent_type);
  const { data: currentPlan } = usePlan(card.id);
  const generatePlan = useGeneratePlan(card.id);

  const handleSelect = async (pipelineId: string) => {
    if (!rules.canChangePipeline) return;
    if (currentPlan?.pipeline_id === pipelineId) return;
    try {
      await generatePlan.mutateAsync({ pipeline_id: pipelineId });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to switch pipeline';
      window.alert(msg);
    }
  };

  return (
    <ConfigSection
      title="Available Methods"
      disabled={!rules.canChangePipeline}
      disabledReason={
        rules.mode === 'release'
          ? 'Method is locked in Release mode'
          : 'Method is locked in Study mode (set in Explore)'
      }
    >
      {isLoading && (
        <div className="flex items-center gap-[6px] py-[12px]" role="status" aria-busy="true">
          <Loader2 size={14} className="animate-spin text-[#acacac]" aria-hidden="true" />
          <span className="text-[12px] text-[#acacac]">Loading methods…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-[6px] py-[12px]" role="alert">
          <AlertCircle size={14} className="text-[#e74c3c]" aria-hidden="true" />
          <span className="text-[12px] text-[#e74c3c]">Failed to load methods</span>
        </div>
      )}

      {!isLoading && !error && (pipelines?.length ?? 0) === 0 && (
        <p className="text-[12px] text-[#acacac] py-[12px]">
          No pipelines registered for intent type{' '}
          <code className="text-[#1a1a1a]">{intent.intent_type}</code>. The
          kernel may not have a pipeline for this type yet.
        </p>
      )}

      {!isLoading && !error && pipelines && pipelines.length > 0 && (
        <table
          aria-label="Available methods (pipelines)"
          role="table"
          className="w-full text-[12px]"
        >
          <thead>
            <tr className="text-left border-b border-[#f0f0ec]">
              <th scope="col" className="py-[6px] pr-[8px] font-medium text-[#6b6b6b]">
                Pipeline
              </th>
              <th scope="col" className="py-[6px] pr-[8px] font-medium text-[#6b6b6b]">
                Tools
              </th>
              <th
                scope="col"
                className="py-[6px] pr-[4px] font-medium text-[#6b6b6b] text-right w-[60px]"
              >
                Use
              </th>
            </tr>
          </thead>
          <tbody>
            {pipelines.map((p) => {
              const isCurrent = currentPlan?.pipeline_id === p.id;
              const tools = (p.steps ?? [])
                .map((s) => s.tool_id)
                .filter(Boolean)
                .join(' → ');
              return (
                <tr
                  key={p.id}
                  className={`border-b border-[#fafafa] transition-colors ${
                    isCurrent ? 'bg-[#fff8f0]' : 'hover:bg-[#fafafa]'
                  }`}
                >
                  <td className="py-[8px] pr-[8px]">
                    <div className="font-medium text-[#1a1a1a]">{p.name}</div>
                    <div className="text-[10px] text-[#acacac]">
                      {p.slug} <span className="mx-[4px] text-[#d0d0d0]">·</span>{' '}
                      trust: {p.trust_level}
                    </div>
                  </td>
                  <td className="py-[8px] pr-[8px] text-[#6b6b6b]">
                    {tools || '—'}
                  </td>
                  <td className="py-[8px] pr-[4px] text-right">
                    <input
                      type="radio"
                      name="card-pipeline"
                      checked={isCurrent}
                      onChange={() => handleSelect(p.id)}
                      disabled={!rules.canChangePipeline || generatePlan.isPending}
                      aria-label={`Use ${p.name}`}
                      className="w-[14px] h-[14px] accent-[#f57c00] cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {generatePlan.isPending && (
        <p className="mt-[8px] text-[10px] text-[#f57c00]" role="status">
          Re-compiling plan with new pipeline…
        </p>
      )}
    </ConfigSection>
  );
}
