import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import { useLLMHealth } from '@hooks/useLLMProvider';

/**
 * Tiny circular dot indicating the active LLM provider's health.
 *
 *  - green  : configured & reachable
 *  - amber  : configured but the last ping failed
 *  - red    : not configured
 *  - grey   : still loading
 *
 * Clicking the chip routes to the admin LLM providers page.
 */
export default function LLMHealthChip() {
  const navigate = useNavigate();
  const { data: health, isLoading } = useLLMHealth();

  const dotColor = isLoading || !health
    ? 'bg-gray-400'
    : !health.configured
      ? 'bg-red-500'
      : health.reachable
        ? 'bg-emerald-500'
        : 'bg-amber-500';

  const label = (() => {
    if (isLoading || !health) return 'LLM: loading';
    const provider = health.provider || 'no provider';
    const model = health.model || 'no model';
    const status = !health.configured ? 'not configured' : health.reachable ? 'OK' : 'issue';
    return `${provider} — ${model} (${status})`;
  })();

  return (
    <button
      type="button"
      data-testid="llm-health-chip"
      onClick={() => navigate(ROUTES.ADMIN_LLM_PROVIDERS)}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#ece9e3] bg-white px-2.5 py-1 text-[11px] text-[#6b6b6b] hover:bg-[#f5f3ef] transition-colors"
      title={label}
      aria-label={`LLM provider status: ${label}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} aria-hidden="true" />
      <span className="font-mono truncate max-w-[200px]">
        {isLoading || !health ? 'LLM' : health.provider || 'LLM'}
      </span>
    </button>
  );
}
