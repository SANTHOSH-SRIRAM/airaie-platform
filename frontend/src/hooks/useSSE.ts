import { useEffect, useRef, useCallback, useState } from 'react';
import { parseSSEEvent, isTerminalEvent } from '@utils/sseParser';
import type { SSEEvent, SSEEventType } from '@utils/sseParser';

const SSE_EVENT_TYPES: SSEEventType[] = [
  'node_started',
  'node_progress',
  'log_line',
  'node_completed',
  'artifact_produced',
  'evidence_collected',
  'gate_evaluated',
  'run_completed',
  'done',
];

export interface UseSSEOptions {
  /** Called for every parsed SSE event */
  onEvent?: (event: SSEEvent) => void;
  /** Called when connection opens */
  onOpen?: () => void;
  /** Called on error */
  onError?: (error: Event) => void;
  /** Auto-reconnect on error (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
}

export interface UseSSEReturn {
  connected: boolean;
  error: string | null;
  disconnect: () => void;
}

/**
 * Connect to the AIRAIE SSE run event stream.
 *
 * Usage:
 *   const { connected, error } = useRunSSE(runId, {
 *     onEvent: (event) => executionStore.handleEvent(event),
 *   });
 *
 * The hook automatically connects when runId is provided and
 * disconnects on unmount or when runId changes.
 */
export function useRunSSE(
  runId: string | null,
  options: UseSSEOptions = {}
): UseSSEReturn {
  const {
    onEvent,
    onOpen,
    onError,
    autoReconnect = true,
    maxReconnectAttempts = 5,
  } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback ref
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!runId) {
      disconnect();
      return;
    }

    function connect() {
      // Close existing connection
      if (esRef.current) {
        esRef.current.close();
      }

      const url = `/v0/runs/${runId}/events`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        onOpenRef.current?.();
      };

      es.onerror = (evt) => {
        setConnected(false);
        onErrorRef.current?.(evt);

        // Don't reconnect if we intentionally closed
        if (es.readyState === EventSource.CLOSED) {
          return;
        }

        if (autoReconnect && reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current++;
          setError(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          setError('Connection lost. Max reconnect attempts reached.');
        }
      };

      // Register listeners for all known event types
      for (const eventType of SSE_EVENT_TYPES) {
        es.addEventListener(eventType, (evt: MessageEvent) => {
          const parsed = parseSSEEvent(eventType, evt.data);
          if (parsed) {
            onEventRef.current?.(parsed);

            // Auto-close on terminal events
            if (isTerminalEvent(parsed)) {
              es.close();
              esRef.current = null;
              setConnected(false);
            }
          }
        });
      }
    }

    connect();

    return () => {
      disconnect();
    };
  }, [runId, autoReconnect, maxReconnectAttempts, disconnect]);

  return { connected, error, disconnect };
}
