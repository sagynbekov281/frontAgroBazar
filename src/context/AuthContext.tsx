import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface Ctx { user: User | null; loading: boolean; login(e: string, p: string): Promise<void>; register(d: any): Promise<void>; logout(): void; refresh(): Promise<void>; }
const C = createContext<Ctx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const t = localStorage.getItem('ab_token');
    if (!t) { setLoading(false); return; }
    try { const d = await api.me(); setUser(d.user); } catch { localStorage.removeItem('ab_token'); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function login(email: string, password: string) {
    const d = await api.login({ email, password });
    localStorage.setItem('ab_token', d.token);
    setUser(d.user);
  }

  async function register(payload: any) {
    const d = await api.register(payload);
    localStorage.setItem('ab_token', d.token);
    setUser(d.user);
  }

  function logout() { localStorage.removeItem('ab_token'); setUser(null); }

  return <C.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</C.Provider>;
}

export function useAuth() {
  const c = useContext(C);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
