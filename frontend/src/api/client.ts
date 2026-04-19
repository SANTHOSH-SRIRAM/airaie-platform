import { API_CONFIG } from '@constants/api';
import { USE_MOCKS } from '@/utils/env';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Returns the stored JWT access token, or null. Skips mock/invalid tokens. */
function getAccessToken(): string | null {
  const token = localStorage.getItem('airaie-access-token');
  if (!token) return null;
  // Mock tokens from dev fallback are not valid JWTs — backend rejects them with 401.
  // Don't send them, let the request proceed as anonymous (backend allows it in dev mode).
  if (token.startsWith('mock-')) return null;
  return token;
}

// Core fetch wrapper with proper error handling
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.startsWith('/v0') ? path : `${API_CONFIG.BASE_URL}${path}`;

  // Build headers with auth token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Project-Id': 'prj_default',
  };
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
    signal: options?.signal ?? AbortSignal.timeout(API_CONFIG.TIMEOUT),
  });

  // Handle 401 — dispatch event so AuthContext can handle it cleanly (not a hard redirect)
  if (res.status === 401) {
    // Attempt token refresh before giving up
    const refreshToken = localStorage.getItem('airaie-refresh-token');
    if (refreshToken && !refreshToken.startsWith('mock-')) {
      try {
        const refreshRes = await fetch('/v0/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('airaie-access-token', data.access_token);
          localStorage.setItem('airaie-refresh-token', data.refresh_token);
          // Retry the original request with the new token
          const retryHeaders = { ...headers, ...options?.headers, Authorization: `Bearer ${data.access_token}` };
          const retryRes = await fetch(url, { ...options, headers: retryHeaders });
          if (retryRes.ok) {
            if (retryRes.status === 204) return undefined as T;
            return retryRes.json() as Promise<T>;
          }
        }
      } catch {
        // Refresh failed — fall through to auth clear
      }
    }

    // Clear auth state and redirect via SPA navigation
    localStorage.removeItem('airaie-access-token');
    localStorage.removeItem('airaie-refresh-token');
    localStorage.removeItem('airaie-user');
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code ?? body.code ?? `HTTP_${res.status}`,
      body?.error?.message ?? body.message ?? `Request failed: ${res.status}`,
      body.details
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Try real API, fall back to mock data when mocks enabled or network fails
export async function apiOrMock<T>(path: string, options: RequestInit | undefined, mockData: T): Promise<T> {
  if (!USE_MOCKS) {
    return request<T>(path, options);
  }
  try {
    return await request<T>(path, options);
  } catch {
    return mockData;
  }
}

// Direct API call (no mock fallback) for mutations
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  return request<T>(path, options);
}

// Convenience methods
export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
