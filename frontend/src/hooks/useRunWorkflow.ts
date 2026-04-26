import { useState, useCallback } from 'react';
import { runWorkflow } from '@api/workflows';
import { useRunSSE } from './useSSE';
import { useExecutionStore } from '@store/executionStore';

export function useRunWorkflow(workflowId: string) {
  const [runId, setRunId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const executionStore = useExecutionStore();

  // Connect SSE when we have a runId
  const { connected } = useRunSSE(runId, {
    onEvent: (event) => executionStore.handleSSEEvent(event),
    onOpen: () => executionStore.setSSEConnected(true),
    onError: () => executionStore.setSSEConnected(false),
  });

  // The first argument is an optional `{version, inputs}` opts object.
  // Existing call sites pass `start` directly to onClick, in which case
  // a MouseEvent is bound — we strip non-plain inputs at runtime so the
  // backend never sees garbage.
  const start = useCallback(
    async (rawOpts?: unknown): Promise<string | null> => {
      const opts: { version?: number; inputs?: Record<string, unknown> } = {};
      if (rawOpts && typeof rawOpts === 'object' && !('nativeEvent' in (rawOpts as Record<string, unknown>))) {
        const o = rawOpts as Record<string, unknown>;
        if (typeof o.version === 'number') opts.version = o.version;
        if (o.inputs && typeof o.inputs === 'object') {
          opts.inputs = o.inputs as Record<string, unknown>;
        }
      }
      try {
        setIsStarting(true);
        setError(null);
        const result = await runWorkflow(workflowId, opts);
        setRunId(result.runId);
        executionStore.startRun(result.runId);
        return result.runId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start run');
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [workflowId, executionStore],
  );

  const cancel = useCallback(async () => {
    if (runId) {
      const { cancelRun } = await import('@api/runs');
      await cancelRun(runId);
    }
  }, [runId]);

  const reset = useCallback(() => {
    setRunId(null);
    setError(null);
    executionStore.reset();
  }, [executionStore]);

  return {
    runId,
    isStarting,
    isRunning: executionStore.runStatus === 'RUNNING',
    isCompleted: ['SUCCEEDED', 'FAILED', 'CANCELED'].includes(executionStore.runStatus),
    connected,
    error,
    start,
    cancel,
    reset,
  };
}
