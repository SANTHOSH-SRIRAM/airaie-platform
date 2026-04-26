import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  /** Legacy header-token getter — null once cookies are the only auth path. */
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

// USER_KEY persists the lightweight user record (id/email/name/role) so the
// UI can render immediately on cold start, before /whoami responds. The
// access/refresh tokens migrated to HttpOnly cookies; we keep transitional
// localStorage entries so legacy `Authorization: Bearer` requests still work
// if cookies are blocked or the backend hasn't rolled out yet.
const TOKEN_KEY = 'airaie-access-token';
const REFRESH_KEY = 'airaie-refresh-token';
const USER_KEY = 'airaie-user';

interface AuthProviderProps {
  children: ReactNode;
}

interface WhoamiResponse {
  user_id: string;
  email: string;
  name?: string;
  role?: string;
  status?: string;
}

/** Fetch the current session via cookies. Returns null on 401/network failure. */
async function probeSession(): Promise<WhoamiResponse | null> {
  try {
    const res = await fetch('/v0/auth/whoami', { credentials: 'include' });
    if (!res.ok) return null;
    const data = (await res.json()) as WhoamiResponse;
    if (!data.user_id || data.user_id === 'anonymous') return null;
    return data;
  } catch {
    return null;
  }
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
  // Legacy access token lookup — still populated by /v0/auth/login response
  // body for backward compatibility, but no longer the source of truth.
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [sessionActive, setSessionActive] = useState<boolean>(() => !!localStorage.getItem(USER_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authenticated when we have a user record and the latest session probe
  // hasn't told us otherwise. (sessionActive starts true on cold start when
  // a user record is present so the UI doesn't flicker to /login.)
  const isAuthenticated = !!user && sessionActive;

  // Persist user record (UX only — not a credential)
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  // Persist legacy access token only when explicitly set (transition path).
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [accessToken]);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setSessionActive(false);
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
        credentials: 'include', // accept Set-Cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).catch(() => null);

      if (!res || !res.ok) {
        const body = res ? await res.json().catch(() => ({})) : {};
        throw new Error(body?.error?.message || 'Login failed. Please check your credentials.');
      }

      const data = await res.json();
      // Backend still returns body tokens during the migration window.
      if (data.access_token) setAccessToken(data.access_token);
      if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);

      // Cookie session is now active — populate the user record from whoami.
      const whoami = await probeSession();
      if (whoami) {
        setUser({
          id: whoami.user_id,
          email: whoami.email,
          name: whoami.name || whoami.email.split('@')[0],
          role: (whoami.role || 'user') as UserRole,
          tier: 'free',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setSessionActive(true);
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      }).catch(() => null);

      if (!res || !res.ok) {
        const body = res ? await res.json().catch(() => ({})) : {};
        throw new Error(body?.error?.message || 'Registration failed.');
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
    try {
      await fetch('/v0/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null);
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const refreshTokenFn = useCallback(async () => {
    try {
      const legacyRefresh = localStorage.getItem(REFRESH_KEY);
      const res = await fetch('/v0/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: legacyRefresh ? JSON.stringify({ refresh_token: legacyRefresh }) : undefined,
      });

      if (!res.ok) {
        clearAuth();
        return;
      }

      const data = await res.json().catch(() => ({} as { access_token?: string; refresh_token?: string }));
      // Cookies updated by Set-Cookie; populate legacy stores during transition.
      if (data.access_token) setAccessToken(data.access_token);
      if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
      setSessionActive(true);
    } catch {
      clearAuth();
    }
  }, [clearAuth]);

  // Periodic session probe (every 12 minutes — under the 15-minute access
  // TTL). If whoami says we're not signed in, attempt a refresh; if that
  // fails, clearAuth().
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const tick = async () => {
      const whoami = await probeSession();
      if (cancelled) return;
      if (whoami) {
        setSessionActive(true);
        return;
      }
      // 401 from whoami: try refresh; if that doesn't restore, clear auth.
      await refreshTokenFn();
      if (cancelled) return;
      const after = await probeSession();
      if (!cancelled && !after) {
        clearAuth();
      }
    };

    const interval = setInterval(tick, 12 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, refreshTokenFn, clearAuth]);

  // On mount: probe the cookie session. If a user record is cached but the
  // probe fails, attempt a refresh before clearing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const whoami = await probeSession();
      if (cancelled) return;
      if (whoami) {
        setSessionActive(true);
        // Refresh user details in case role/name changed server-side
        setUser((prev) => prev && {
          ...prev,
          email: whoami.email,
          name: whoami.name || prev.name,
          role: (whoami.role || prev.role) as UserRole,
        });
      } else if (user) {
        // Cached user but no live session — try refresh once.
        await refreshTokenFn();
      }
    })();
    return () => { cancelled = true; };
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
