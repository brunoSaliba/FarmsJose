import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import axios from 'axios';
import { authApi } from '@/lib/api';
import { clearLocalData } from '@/lib/sync';
import type { TokenResponse, UserInfo } from '@/types';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasModule: (module: string) => boolean;
  refreshUser: () => Promise<void>;
  updateMe: (data: { nome?: string; email?: string; password?: string; current_password?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi.me()
        .then(setUser)
        .catch(() => { localStorage.removeItem('access_token'); })
        .finally(() => setLoading(false));
    } else {
      // No access token — try silent refresh via httpOnly cookie
      axios.post<TokenResponse>('/api/v1/auth/refresh', {}, { withCredentials: true })
        .then(r => {
          localStorage.setItem('access_token', r.data.access_token);
          return authApi.me();
        })
        .then(setUser)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    localStorage.setItem('access_token', tokens.access_token);
    const me = await authApi.me();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    localStorage.removeItem('access_token');
    setUser(null);
    clearLocalData();
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  const updateMe = useCallback(async (data: { nome?: string; email?: string; password?: string; current_password?: string }) => {
    const updated = await authApi.updateMe(data);
    setUser(updated);
  }, []);

  const hasModule = useCallback((module: string) => {
    if (!user) return false;
    if (user.is_admin) return true;
    return user.modulos.includes(module);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasModule, refreshUser, updateMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
