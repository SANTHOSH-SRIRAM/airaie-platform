import { useQuery } from '@tanstack/react-query';
import { getLLMConfig, getLLMHealth } from '@api/agents';

/* ---------- Query keys ---------- */

export const llmProviderKeys = {
  all: ['llm-provider'] as const,
  config: () => [...llmProviderKeys.all, 'config'] as const,
  health: () => [...llmProviderKeys.all, 'health'] as const,
};

/**
 * Active LLM provider config (provider, model, base URL, available providers/models).
 *
 * Read-only — provider switching is gated to Phase F (admin RBAC + secret store).
 * 5-minute stale time: this only changes when the gateway is restarted.
 */
export function useLLMConfig() {
  return useQuery({
    queryKey: llmProviderKeys.config(),
    queryFn: getLLMConfig,
    staleTime: 5 * 60_000,
  });
}

/**
 * LLM provider health (reachable, last error).
 *
 * Refetches every 30s to match the backend's cache TTL — refetching faster
 * just returns the cached snapshot, slower means stale UI.
 */
export function useLLMHealth() {
  return useQuery({
    queryKey: llmProviderKeys.health(),
    queryFn: getLLMHealth,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
