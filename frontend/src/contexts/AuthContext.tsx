import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'airaie-access-token';
const REFRESH_KEY = 'airaie-refresh-token';
const USER_KEY = 'airaie-user';

interface AuthProviderProps {
  children: ReactNode;
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
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);

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

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/v0/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).catch(() => null); // Catch network errors (backend not running)

      if (!res || !res.ok) {
        console.warn('Backend unavailable or login failed. Using mock authentication for UI development.');
        setAccessToken('mock-token-123');
        localStorage.setItem(REFRESH_KEY, 'mock-refresh-123');
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

      const data = await res.json();
      setAccessToken(data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);

      // Fetch user info
      const whoamiRes = await fetch('/v0/auth/whoami', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (whoamiRes.ok) {
        const whoami = await whoamiRes.json();
        const userObj: User = {
          id: whoami.user_id,
          email: whoami.email,
          name: whoami.email.split('@')[0],
          role: whoami.role || 'user',
          tier: 'free',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(userObj);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/v0/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      }).catch(() => null);

      if (!res || !res.ok) {
        console.warn('Backend unavailable or registration failed. Falling back to mock login.');
      }

      // Auto-login after registration (or mock registration)
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const refreshTokenFn = useCallback(async () => {
    const storedRefresh = localStorage.getItem(REFRESH_KEY);
    if (!storedRefresh) {
      logout();
      return;
    }

    try {
      const res = await fetch('/v0/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefresh }),
      });

      if (!res.ok) {
        logout();
        return;
      }

      const data = await res.json();
      setAccessToken(data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
    } catch {
      logout();
    }
  }, [logout]);

  // Auto-refresh token before expiry (every 12 minutes for 15-minute tokens)
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(() => {
      refreshTokenFn();
    }, 12 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken, refreshTokenFn]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated,
        isLoading,
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
