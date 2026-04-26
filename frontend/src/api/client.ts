import { API_CONFIG } from '@constants/api';
import { getCsrfToken, isSafeMethod, CSRF_HEADER_NAME } from '@utils/csrf';

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

/** Returns the stored JWT access token, or null. */
function getAccessToken(): string | null {
  return localStorage.getItem('airaie-access-token');
}

const PROJECT_KEY = 'airaie-project-id';
const DEFAULT_PROJECT = 'prj_default';

/**
 * Returns the active project id. Reads from localStorage first (set after
 * /v0/me returns memberships); falls back to the dev `prj_default` so calls
 * still resolve in single-tenant dev installs.
 */
export function getActiveProjectId(): string {
  return localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT;
}

export function setActiveProjectId(projectId: string): void {
  if (projectId) localStorage.setItem(PROJECT_KEY, projectId);
}

// Core fetch wrapper with proper error handling
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.startsWith('/v0') ? path : `${API_CONFIG.BASE_URL}${path}`;

  // Build headers with auth token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Project-Id': getActiveProjectId(),
  };
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Double-submit CSRF: attach the cookie value as a header on state-changing
  // requests so the backend can verify same-origin even when SameSite=Lax
  // doesn't (subdomain attacks, top-level navigation forgery).
  const method = (options?.method ?? 'GET').toUpperCase();
  if (!isSafeMethod(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers[CSRF_HEADER_NAME] = csrf;
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include', // send HttpOnly auth cookies
    headers: {
      ...headers,
      ...options?.headers,
    },
    signal: options?.signal ?? AbortSignal.timeout(API_CONFIG.TIMEOUT),
  });

  // Handle 401 — try to refresh once. The refresh token rides as an HttpOnly
  // cookie now; localStorage is consulted only as a transition fallback.
  if (res.status === 401) {
    const legacyRefresh = localStorage.getItem('airaie-refresh-token');
    try {
      const refreshRes = await fetch('/v0/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: legacyRefresh ? JSON.stringify({ refresh_token: legacyRefresh }) : undefined,
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json().catch(() => ({} as { access_token?: string; refresh_token?: string }));
        // Backend still returns body tokens during the migration. Persist for
        // the legacy header path; cookies are already updated by Set-Cookie.
        if (data.access_token) localStorage.setItem('airaie-access-token', data.access_token);
        if (data.refresh_token) localStorage.setItem('airaie-refresh-token', data.refresh_token);
        // Retry the original request — cookie carries the new access token.
        const retryHeaders: Record<string, string> = { ...headers, ...(options?.headers as Record<string, string> | undefined) };
        if (data.access_token) retryHeaders['Authorization'] = `Bearer ${data.access_token}`;
        const retryRes = await fetch(url, { ...options, credentials: 'include', headers: retryHeaders });
        if (retryRes.ok) {
          if (retryRes.status === 204) return undefined as T;
          return retryRes.json() as Promise<T>;
        }
      }
    } catch {
      // Refresh failed — fall through to auth clear
    }

    // Clear local auth state and redirect via SPA navigation. Cookies are
    // cleared server-side via /v0/auth/logout — do that on hard 401 too.
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

// Hits the real backend. Failures propagate so React Query surfaces
// error states — this codebase does not silently fall back to mock data.
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
