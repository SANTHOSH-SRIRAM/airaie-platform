import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from '@/types/auth';
import { USE_MOCKS, IS_DEV } from '@/utils/env';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'airaie-access-token';
const REFRESH_KEY = 'airaie-refresh-token';
const USER_KEY = 'airaie-user';

interface AuthProviderProps {
  children: ReactNode;
}

/** Decode JWT payload to read expiry without validation (client-side check only). */
function decodeJWTPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/** Returns true if the token is expired or will expire within bufferMs. */
function isTokenExpired(token: string, bufferMs = 60_000): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000 - bufferMs;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    // Validate stored token hasn't expired
    if (token && token !== 'mock-token-123' && isTokenExpired(token, 0)) {
      return null; // expired — will attempt refresh
    }
    return token;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!accessToken && !!user;

  // Persist state changes
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [accessToken]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/v0/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).catch(() => null);

      // Mock fallback: ONLY in development mode when mocks are enabled
      if (!res || !res.ok) {
        if (USE_MOCKS) {
          console.warn('[DEV] Backend unavailable — using mock authentication.');
          setAccessToken('mock-token-dev');
          localStorage.setItem(REFRESH_KEY, 'mock-refresh-dev');
          setUser({
            id: 'dev-user-1',
            email,
            name: email.split('@')[0],
            role: 'admin',
            tier: 'pro',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          return;
        }
        // Production: surface the error
        const body = res ? await res.json().catch(() => ({})) : {};
        throw new Error(body?.error?.message || 'Login failed. Please check your credentials.');
      }

      const data = await res.json();
      setAccessToken(data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);

      // Fetch user info from whoami
      const whoamiRes = await fetch('/v0/auth/whoami', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (whoamiRes.ok) {
        const whoami = await whoamiRes.json();
        setUser({
          id: whoami.user_id,
          email: whoami.email,
          name: whoami.name || whoami.email.split('@')[0],
          role: whoami.role || 'user',
          tier: 'free',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/v0/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      }).catch(() => null);

      if (!res || !res.ok) {
        if (USE_MOCKS) {
          console.warn('[DEV] Backend unavailable — mock registration.');
        } else {
          const body = res ? await res.json().catch(() => ({})) : {};
          throw new Error(body?.error?.message || 'Registration failed.');
        }
      }

      // Auto-login after registration
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    // Call backend logout to revoke tokens
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && token !== 'mock-token-dev') {
        await fetch('/v0/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => null); // best-effort
      }
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const refreshTokenFn = useCallback(async () => {
    const storedRefresh = localStorage.getItem(REFRESH_KEY);
    if (!storedRefresh || storedRefresh.startsWith('mock-')) {
      if (!USE_MOCKS) clearAuth();
      return;
    }

    try {
      const res = await fetch('/v0/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefresh }),
      });

      if (!res.ok) {
        clearAuth();
        return;
      }

      const data = await res.json();
      setAccessToken(data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
    } catch {
      clearAuth();
    }
  }, [clearAuth]);

  // Auto-refresh token before expiry (every 12 minutes for 15-minute tokens)
  useEffect(() => {
    if (!accessToken || accessToken.startsWith('mock-')) return;

    const interval = setInterval(() => {
      refreshTokenFn();
    }, 12 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken, refreshTokenFn]);

  // On mount: check if stored token is expired and try refresh
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && token !== 'mock-token-dev' && isTokenExpired(token)) {
      refreshTokenFn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshToken: refreshTokenFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
