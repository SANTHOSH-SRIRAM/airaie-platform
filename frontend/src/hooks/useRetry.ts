import { useState, useCallback, useRef } from 'react';

interface UseRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoff?: boolean;
}

interface UseRetryReturn<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  retryCount: number;
  execute: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

/**
 * useRetry -- wraps an async function with automatic retry capability.
 *
 * Usage:
 * ```tsx
 * const { data, error, isLoading, retry } = useRetry(
 *   () => apiClient.get('/v0/tools'),
 *   { maxRetries: 3 }
 * );
 * ```
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryReturn<T> {
  const { maxRetries = 3, retryDelay = 1000, backoff = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fnRef.current();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      setError(`Failed after ${maxRetries} retries. Please try again later.`);
      return;
    }

    const delay = backoff ? retryDelay * Math.pow(2, retryCount) : retryDelay;
    setRetryCount((c) => c + 1);

    await new Promise((resolve) => setTimeout(resolve, delay));
    await execute();
  }, [retryCount, maxRetries, retryDelay, backoff, execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setRetryCount(0);
  }, []);

  return { data, error, isLoading, retryCount, execute, retry, reset };
}
