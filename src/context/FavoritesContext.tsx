import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface Ctx { ids: string[]; toggle(id: string): void; has(id: string): boolean; }
const C = createContext<Ctx | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ab_favs') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('ab_favs', JSON.stringify(ids)); }, [ids]);

  function toggle(id: string) {
    setIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  return <C.Provider value={{ ids, toggle, has: (id) => ids.includes(id) }}>{children}</C.Provider>;
}
export function useFavorites() { const c = useContext(C); if (!c) throw new Error(''); return c; }
