import { API_CONFIG } from '@constants/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Check env flag for mock mode
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

// Core fetch wrapper with proper error handling
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.startsWith('/v0') ? path : `${API_CONFIG.BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Project-Id': 'prj_default', // Default project for dev
      ...options?.headers,
    },
    signal: options?.signal ?? AbortSignal.timeout(API_CONFIG.TIMEOUT),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.code ?? `HTTP_${res.status}`,
      body.message ?? `Request failed: ${res.status}`,
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
