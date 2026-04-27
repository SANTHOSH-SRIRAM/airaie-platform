import { describe, it, expect } from 'vitest';
import {
  runStageToButtonLabel,
  runStageToCallToAction,
  type RunCallToAction,
} from './RunBlockView.helpers';
import type { CardRunStage } from '@hooks/useCardRunState';

const ALL_STAGES: CardRunStage[] = [
  'no-intent',
  'no-inputs',
  'no-plan',
  'ready',
  'running',
  'completed',
  'failed',
];

describe('runStageToButtonLabel', () => {
  it('returns a non-empty string for every CardRunStage', () => {
    for (const s of ALL_STAGES) {
      const label = runStageToButtonLabel(s);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
  it('matches the CardActionBar vocabulary for shared stages', () => {
    expect(runStageToButtonLabel('ready')).toBe('Run Card');
    expect(runStageToButtonLabel('running')).toBe('Cancel');
    expect(runStageToButtonLabel('no-plan')).toBe('Generate Plan');
  });
  it('uses Re-run label for completed and failed', () => {
    expect(runStageToButtonLabel('completed')).toBe('Re-run');
    expect(runStageToButtonLabel('failed')).toBe('Re-run');
  });
});

describe('runStageToCallToAction', () => {
  it('returns a discriminator string for every CardRunStage', () => {
    const valid: RunCallToAction[] = [
      'run',
      'cancel',
      'generate',
      'add-intent',
      'add-inputs',
      'view-result',
      'retry',
    ];
    for (const s of ALL_STAGES) {
      expect(valid).toContain(runStageToCallToAction(s));
    }
  });
  it('maps ready → run, running → cancel, no-plan → generate', () => {
    expect(runStageToCallToAction('ready')).toBe('run');
    expect(runStageToCallToAction('running')).toBe('cancel');
    expect(runStageToCallToAction('no-plan')).toBe('generate');
  });
  it('maps no-intent → add-intent, no-inputs → add-inputs', () => {
    expect(runStageToCallToAction('no-intent')).toBe('add-intent');
    expect(runStageToCallToAction('no-inputs')).toBe('add-inputs');
  });
  it('distinguishes completed → view-result vs failed → retry', () => {
    expect(runStageToCallToAction('completed')).toBe('view-result');
    expect(runStageToCallToAction('failed')).toBe('retry');
  });
});
