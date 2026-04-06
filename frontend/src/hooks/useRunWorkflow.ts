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

  const start = useCallback(async () => {
    try {
      setIsStarting(true);
      setError(null);
      const result = await runWorkflow(workflowId);
      setRunId(result.runId);
      executionStore.startRun(result.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start run');
    } finally {
      setIsStarting(false);
    }
  }, [workflowId, executionStore]);

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
