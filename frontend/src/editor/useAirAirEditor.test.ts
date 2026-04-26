import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleIdleSave, IDLE_DEBOUNCE_MS } from './useAirAirEditor';
import type { CardBodyDoc } from '@/types/cardBlocks';

// scheduleIdleSave is the load-bearing autosave primitive. The hook
// (useAirAirEditor) wraps Tiptap's useEditor — that side requires a real
// DOM and isn't testable in env=node + no @testing-library/react. The
// timing logic that this test covers is what every `onIdle` consumer
// depends on (the kernel save mutation, the version-conflict refetch,
// the beforeunload flush).

const docA: CardBodyDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
const docB: CardBodyDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'edit' }] }],
};

describe('scheduleIdleSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('IDLE_DEBOUNCE_MS is 1500ms', () => {
    expect(IDLE_DEBOUNCE_MS).toBe(1500);
  });

  it('fires onIdle exactly once after the debounce window', () => {
    const onIdle = vi.fn();
    const ctrl = scheduleIdleSave(onIdle);
    ctrl.schedule(docA);

    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1499);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onIdle).toHaveBeenCalledWith(docA);
  });

  it('debounces: rapid schedules collapse to one onIdle call with the latest doc', () => {
    const onIdle = vi.fn();
    const ctrl = scheduleIdleSave(onIdle);

    ctrl.schedule(docA);
    vi.advanceTimersByTime(500);
    ctrl.schedule(docA);
    vi.advanceTimersByTime(500);
    ctrl.schedule(docB);
    vi.advanceTimersByTime(500);

    // 1500ms have elapsed total but the timer was reset twice — onIdle hasn't fired.
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onIdle).toHaveBeenCalledWith(docB);
  });

  it('cancel() drops the pending save without invoking onIdle', () => {
    const onIdle = vi.fn();
    const ctrl = scheduleIdleSave(onIdle);
    ctrl.schedule(docA);
    ctrl.cancel();
    vi.advanceTimersByTime(5_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('flush() invokes onIdle synchronously with the most recent doc', () => {
    const onIdle = vi.fn();
    const ctrl = scheduleIdleSave(onIdle);
    ctrl.schedule(docA);
    ctrl.schedule(docB);

    ctrl.flush();

    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onIdle).toHaveBeenCalledWith(docB);
    // After flush, the pending state is cleared — no second call when the
    // timer would have fired naturally.
    vi.advanceTimersByTime(5_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('flush() with nothing pending is a no-op', () => {
    const onIdle = vi.fn();
    const ctrl = scheduleIdleSave(onIdle);
    ctrl.flush();
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('honors a custom delay', () => {
    const onIdle = vi.fn();
    const ctrl = scheduleIdleSave(onIdle, 200);
    ctrl.schedule(docA);
    vi.advanceTimersByTime(199);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('fires multiple times across distinct schedule cycles', () => {
    const onIdle = vi.fn();
    const ctrl = scheduleIdleSave(onIdle);

    ctrl.schedule(docA);
    vi.advanceTimersByTime(1500);
    expect(onIdle).toHaveBeenCalledTimes(1);

    ctrl.schedule(docB);
    vi.advanceTimersByTime(1500);
    expect(onIdle).toHaveBeenCalledTimes(2);
    expect(onIdle).toHaveBeenLastCalledWith(docB);
  });
});
