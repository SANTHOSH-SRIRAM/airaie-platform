import { useState, useCallback } from 'react';

export interface ApiErrorInfo {
  status: number | null;
  message: string;
  code: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad request — please check your input.',
  401: 'Authentication required. Please log in.',
  403: 'Access denied. You do not have permission.',
  404: 'Not found. The requested resource does not exist.',
  409: 'Conflict — the resource was modified by another process.',
  429: 'Rate limited. Please wait a moment and try again.',
};

function getErrorCode(status: number | null): string {
  if (!status) return 'NETWORK_ERROR';
  if (status >= 500) return 'SERVER_ERROR';
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'RATE_LIMITED';
    default: return `HTTP_${status}`;
  }
}

function extractMessage(error: unknown): { status: number | null; body: string | null } {
  // Fetch Response object
  if (error instanceof Response) {
    return { status: error.status, body: null };
  }

  // Object with status (e.g., Axios-style or custom APIError)
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    // Has status code
    const status = typeof obj.status === 'number'
      ? obj.status
      : typeof obj.statusCode === 'number'
        ? obj.statusCode
        : null;

    // Has message
    const body = typeof obj.message === 'string'
      ? obj.message
      : typeof obj.error === 'string'
        ? obj.error
        : null;

    if (status !== null) return { status, body };
  }

  // Standard Error
  if (error instanceof Error) {
    // Network/fetch failure
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { status: null, body: 'Connection lost. Check your network and try again.' };
    }
    return { status: null, body: error.message };
  }

  return { status: null, body: String(error) };
}

/**
 * useApiError — Global error handler for API calls.
 *
 * Provides `handleError` that maps HTTP status codes to user-friendly messages.
 *
 * Usage:
 * ```tsx
 * const { handleError, lastError, clearError } = useApiError();
 *
 * try { await api.doSomething(); }
 * catch (err) { handleError(err); }
 * ```
 */
export function useApiError() {
  const [lastError, setLastError] = useState<ApiErrorInfo | null>(null);

  const handleError = useCallback((error: unknown): ApiErrorInfo => {
    const { status, body } = extractMessage(error);

    let message: string;
    if (status !== null && status in STATUS_MESSAGES) {
      // Use known status message; append server detail if present
      message = body
        ? `${STATUS_MESSAGES[status]} ${body}`
        : STATUS_MESSAGES[status];
    } else if (status !== null && status >= 500) {
      message = body || 'Server error. Our team has been notified.';
    } else if (status === null) {
      message = body || 'Connection lost. Check your network and try again.';
    } else {
      message = body || `Unexpected error (HTTP ${status}).`;
    }

    const info: ApiErrorInfo = {
      status,
      message,
      code: getErrorCode(status),
    };

    setLastError(info);
    console.error('[useApiError]', info.code, info.message, error);

    return info;
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return { handleError, lastError, clearError };
}
