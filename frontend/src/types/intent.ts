export type IntentStatus = 'draft' | 'locked' | 'active' | 'completed' | 'failed';
export type CriterionOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq' | 'in' | 'between';

export interface IntentSpec {
  id: string;
  board_id: string;
  card_id?: string;
  intent_type: string;
  version: number;
  goal: string;
  inputs: IntentInput[];
  constraints?: Record<string, unknown>;
  acceptance_criteria: AcceptanceCriterion[];
  preferences?: IntentPreferences;
  governance?: GovernanceSpec;
  context?: IntentContext;
  status: IntentStatus;
  locked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IntentInput {
  name: string;
  artifact_ref?: string;
  type?: string;
  version?: string;
  required: boolean;
  schema?: Record<string, unknown>;
  value?: unknown;
}

export interface AcceptanceCriterion {
  id: string;
  metric: string;
  operator: CriterionOperator;
  threshold: unknown;
  unit?: string;
  description?: string;
  weight?: number;
}

export interface IntentPreferences {
  preferred_tools?: string[];
  compute_profile?: string;
  timeout_minutes?: number;
  notify_on_complete?: boolean;
  retry_policy?: { max_retries: number; delay_seconds: number };
  priority?: number;
}

export interface GovernanceSpec {
  level: 'none' | 'light' | 'full';
  approval_roles?: string[];
  audit_level?: string;
  compliance_tags?: string[];
  require_review?: boolean;
  sign_off_roles?: string[];
  retention_days?: number;
}

export interface IntentContext {
  vertical_slug?: string;
  domain?: string;
  related_board_ids?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  parent_intent_id?: string;
}

export interface IntentTypeDefinition {
  slug: string;
  vertical_slug: string;
  name: string;
  description: string;
  category: string;
  required_inputs: IntentInput[];
  default_pipelines: string[];
}
