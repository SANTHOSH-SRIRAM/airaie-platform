import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  validateContractLive,
  type ContractValidation,
} from '@api/tools';

/**
 * Mutation wrapper around the live contract validation endpoint
 * (`POST /v0/validate/contract`). Returns the flat `{valid, errors, warnings}`
 * shape consumed by the Register Tool form.
 *
 * Used directly for explicit ("validate now") triggers like input blur or a
 * "Validate" button. For typing, prefer {@link useDebouncedValidateContract}.
 */
export function useValidateContract() {
  return useMutation<ContractValidation, Error, unknown>({
    mutationFn: (manifest: unknown) => validateContractLive(manifest),
  });
}

interface DebouncedValidationState {
  /** Latest result from a completed validation call, or null until first run. */
  result: ContractValidation | null;
  /** True while a request is in flight (after debounce). */
  isValidating: boolean;
  /** Last error from the network call, if any. */
  error: Error | null;
}

/**
 * Live-validates a manifest as it changes, debounced by `delayMs` (default 500ms).
 *
 * Strategy:
 *   - Each render with a new `manifest` reference resets a debounce timer.
 *   - When the timer fires, we call `validateContractLive` and store the result.
 *   - In-flight calls are not cancelled — instead, stale responses are dropped
 *     (the latest debounce-id wins). This keeps the implementation simple and
 *     avoids depending on AbortSignal threading through apiClient.
 *
 * Pass `enabled: false` to suspend validation (e.g. before the form has any
 * required fields filled in).
 */
export function useDebouncedValidateContract(
  manifest: unknown,
  options: { delayMs?: number; enabled?: boolean } = {},
): DebouncedValidationState {
  const { delayMs = 500, enabled = true } = options;
  const [state, setState] = useState<DebouncedValidationState>({
    result: null,
    isValidating: false,
    error: null,
  });
  // Monotonically increasing token; only the latest call's response is applied.
  const tokenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable JSON serialization key so the effect only re-runs when the
  // manifest's content actually changes (not on every reference swap).
  const manifestKey = useMemo(() => {
    try {
      return JSON.stringify(manifest);
    } catch {
      return String(Date.now());
    }
  }, [manifest]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const myToken = ++tokenRef.current;
      setState((s) => ({ ...s, isValidating: true, error: null }));
      validateContractLive(manifest)
        .then((result) => {
          if (tokenRef.current !== myToken) return; // stale
          setState({ result, isValidating: false, error: null });
        })
        .catch((err: unknown) => {
          if (tokenRef.current !== myToken) return; // stale
          const error = err instanceof Error ? err : new Error(String(err));
          setState((s) => ({ ...s, isValidating: false, error }));
        });
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // We intentionally key on the serialized manifest — `manifest` itself is a
    // fresh object on every form update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifestKey, delayMs, enabled]);

  return state;
}
