import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:4000';

interface Ctx { socket: Socket | null; onlineUsers: Set<string>; }
const C = createContext<Ctx>({ socket: null, onlineUsers: new Set() });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('ab_token');
    if (!user || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }
    const s = io(SOCKET_URL, { auth: { token } });
    socketRef.current = s;
    setSocket(s);

    s.on('presence:online', ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
    });
    s.on('presence:offline', ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    });

    return () => { s.disconnect(); };
  }, [user?.id]);

  return <C.Provider value={{ socket, onlineUsers }}>{children}</C.Provider>;
}

export function useSocket() { return useContext(C); }