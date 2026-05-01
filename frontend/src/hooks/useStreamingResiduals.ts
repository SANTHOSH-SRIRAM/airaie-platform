import { useEffect, useRef, useState } from 'react';
import { useRunSSE } from './useSSE';
import { ResidualAccumulator, type ResidualPoint } from '@utils/residualParser';

// ---------------------------------------------------------------------------
// useStreamingResiduals — subscribes to a run's SSE stream, filters log_line
// events, parses for solver residual lines, returns a sliding window of
// per-iteration residuals for live plotting.
//
// Phase 9 Plan 09-02 §2E.1 (2026-05-01).
//
// Throttles React state updates: even if a fast solver emits 100s of
// residual lines per second, we accumulate in a ref and flush to React
// state at most once per `flushIntervalMs` (default 250ms). Avoids
// re-render storm + Recharts re-layout cost.
//
// Sliding window default 500 points per residual name — enough to
// visualize convergence; older points fall off the head when capacity
// is exceeded so memory stays bounded for long runs.
// ---------------------------------------------------------------------------

export interface UseStreamingResidualsOptions {
  /** Max points kept per residual name. Older points fall off when exceeded. Default 500. */
  windowSize?: number;
  /** How often to flush accumulated points to React state. Default 250ms. */
  flushIntervalMs?: number;
}

export interface UseStreamingResidualsReturn {
  /**
   * Series keyed by residual name (Ux, Uy, p, k, omega, …). Each series is a
   * chronologically-ordered array of points; older points fall off when
   * windowSize is exceeded.
   */
  series: Record<string, ResidualPoint[]>;
  /** True when the SSE channel is currently open. */
  isStreaming: boolean;
  /** Connection error from SSE, or null. */
  error: string | null;
  /** Total points received across all series (useful for "watching X residuals" UI). */
  totalPoints: number;
}

export function useStreamingResiduals(
  runId: string | null,
  options: UseStreamingResidualsOptions = {},
): UseStreamingResidualsReturn {
  const { windowSize = 500, flushIntervalMs = 250 } = options;

  const accRef = useRef(new ResidualAccumulator());
  const pendingRef = useRef<ResidualPoint[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [series, setSeries] = useState<Record<string, ResidualPoint[]>>({});
  const [totalPoints, setTotalPoints] = useState(0);

  // Reset accumulator + state when runId changes (different run = different series).
  useEffect(() => {
    accRef.current.reset();
    pendingRef.current = [];
    setSeries({});
    setTotalPoints(0);
  }, [runId]);

  const flush = () => {
    flushTimerRef.current = null;
    const pending = pendingRef.current;
    if (pending.length === 0) return;
    pendingRef.current = [];

    setSeries((prev) => {
      const next = { ...prev };
      for (const p of pending) {
        const existing = next[p.name] ?? [];
        const grown = [...existing, p];
        next[p.name] = grown.length > windowSize ? grown.slice(-windowSize) : grown;
      }
      return next;
    });
    setTotalPoints((n) => n + pending.length);
  };

  const scheduleFlush = () => {
    if (flushTimerRef.current != null) return;
    flushTimerRef.current = setTimeout(flush, flushIntervalMs);
  };

  const { connected, error } = useRunSSE(runId, {
    onEvent: (event) => {
      if (event.type !== 'log_line') return;
      const point = accRef.current.consume(event.message);
      if (point) {
        pendingRef.current.push(point);
        scheduleFlush();
      }
    },
  });

  // Final flush on unmount so the last batch isn't dropped.
  useEffect(() => {
    return () => {
      if (flushTimerRef.current != null) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // Note: we DON'T flush here — the component is unmounting, so the
      // setState would be no-op-or-warn. Pending points are simply lost,
      // which is correct: nothing's listening.
    };
  }, []);

  return { series, isStreaming: connected, error, totalPoints };
}
