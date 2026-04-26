import { api, apiClient } from './client';
import type { IntentSpec, IntentTypeDefinition } from '@/types/intent';

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function listIntents(boardId: string): Promise<IntentSpec[]> {
  return api(`/v0/boards/${boardId}/intents`, { method: 'GET' });
}

export async function getIntent(id: string): Promise<IntentSpec> {
  return api(`/v0/intents/${id}`, { method: 'GET' });
}

export async function createIntent(
  boardId: string,
  data: {
    intent_type: string;
    goal: string;
    card_id?: string;
    inputs?: IntentSpec['inputs'];
    constraints?: Record<string, unknown>;
    acceptance_criteria?: IntentSpec['acceptance_criteria'];
    preferences?: IntentSpec['preferences'];
    governance?: IntentSpec['governance'];
  },
): Promise<IntentSpec> {
  return apiClient.post(`/v0/boards/${boardId}/intents`, data);
}

export async function updateIntent(
  id: string,
  data: Partial<Pick<IntentSpec, 'goal' | 'inputs' | 'constraints' | 'acceptance_criteria' | 'preferences' | 'governance'>>,
): Promise<IntentSpec> {
  return apiClient.patch(`/v0/intents/${id}`, data);
}

export async function lockIntent(id: string): Promise<IntentSpec> {
  return apiClient.post(`/v0/intents/${id}/lock`);
}

export async function deleteIntent(id: string): Promise<void> {
  return apiClient.delete(`/v0/intents/${id}`);
}

export async function listIntentTypes(verticalSlug: string): Promise<IntentTypeDefinition[]> {
  const res = await api<{ intent_types: IntentTypeDefinition[] } | IntentTypeDefinition[]>(
    `/v0/verticals/${verticalSlug}/intent-types`,
    { method: 'GET' },
  );
  // Backend returns { intent_types: [...] } or raw array
  if (Array.isArray(res)) return res;
  return (res as { intent_types: IntentTypeDefinition[] }).intent_types ?? [];
}

export async function getIntentType(slug: string): Promise<IntentTypeDefinition> {
  return api(`/v0/intent-types/${slug}`, { method: 'GET' });
}
