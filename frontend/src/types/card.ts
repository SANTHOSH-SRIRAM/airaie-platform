export type CardType = 'analysis' | 'comparison' | 'sweep' | 'agent' | 'gate' | 'milestone';
export type CardStatus = 'draft' | 'ready' | 'queued' | 'running' | 'completed' | 'failed' | 'blocked' | 'skipped';

export interface Card {
  id: string;
  board_id: string;
  intent_spec_id?: string;
  card_type: CardType;
  intent_type?: string;
  agent_id?: string;
  agent_version?: number;
  title: string;
  description: string;
  status: CardStatus;
  ordinal: number;
  config?: Record<string, unknown>;
  kpis: CardKPI[];
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CardKPI {
  metric_key: string;
  target_value: number;
  unit: string;
  tolerance: number;
}

export interface CardEvidence {
  id: string;
  card_id: string;
  artifact_id?: string;
  run_id?: string;
  criterion_id?: string;
  metric_key: string;
  metric_value: number;
  metric_unit?: string;
  operator?: string;
  threshold?: number;
  passed?: boolean;
  evaluation: 'pass' | 'fail' | 'warning' | 'info';
  version: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CardDependency {
  id: string;
  card_id: string;
  depends_on_card_id: string;
  dependency_type: 'blocks' | 'inputs_from';
  created_at: string;
}
