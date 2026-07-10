import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, ArrowLeft, Users, Plus, X } from 'lucide-react';
import { api } from '../api/client';
import type { ChatRoom, ChatMessage, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Chat() {
  const { roomId } = useParams();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function loadRooms() {
    api.getRooms().then(d => setRooms(d.rooms || [])).catch(() => {});
  }

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (!roomId) { setMessages([]); return; }
    api.getMessages(roomId).then(d => setMessages(d.messages || [])).catch(() => {});
    socket?.emit('room:join', roomId);
  }, [roomId, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    function onNewMessage(msg: ChatMessage) {
      if (msg.roomId === roomId) setMessages(prev => [...prev, msg]);
      loadRooms();
    }
    function onTyping({ roomId: rId, userId, userName, isTyping }: any) {
      if (rId !== roomId || userId === user?.id) return;
      setTypingUsers(prev => {
        const n = { ...prev };
        if (isTyping) n[userId] = userName; else delete n[userId];
        return n;
      });
    }

    socket.on('message:new', onNewMessage);
    socket.on('typing', onTyping);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing', onTyping);
    };
  }, [socket, roomId, user?.id]);

  function handleTextChange(v: string) {
    setText(v);
    if (!socket || !roomId) return;
    socket.emit('typing', { roomId, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 1500);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !roomId) return;
    setSending(true);
    const value = text.trim();
    setText('');
    try {
      if (socket) {
        socket.emit('message:send', { roomId, text: value });
      } else {
        await api.sendMessage(roomId, value);
        const d = await api.getMessages(roomId);
        setMessages(d.messages || []);
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  const activeRoom = rooms.find(r => r.id === roomId);

  function roomLabel(r: ChatRoom) {
    if (r.isGroup) return r.name || 'Топ';
    const other = r.participants.find(p => p.id !== user?.id);
    return other?.name || 'Колдонуучу';
  }
  function roomInitial(r: ChatRoom) {
    return roomLabel(r)[0] || '?';
  }
  function isOtherOnline(r: ChatRoom) {
    if (r.isGroup) return false;
    const other = r.participants.find(p => p.id !== user?.id);
    return other ? onlineUsers.has(other.id) : false;
  }

  const typingText = Object.values(typingUsers).join(', ');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 h-[calc(100vh-140px)] flex gap-4">
      {/* rooms list */}
      <div className={`${roomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 shrink-0 card overflow-hidden`}>
        <div className="p-4 border-b border-border font-semibold flex items-center justify-between">
          <span>Билдирүүлөр</span>
          <button onClick={() => setShowNewGroup(true)} className="p-1.5 rounded-lg hover:bg-surface text-primary-600" title="Жаңы топ">
            <Plus size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {rooms.length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">Чат жок</div>
          ) : rooms.map(r => (
            <Link key={r.id} to={`/chat/${r.id}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-surface border-b border-border transition ${r.id === roomId ? 'bg-primary-50' : ''}`}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
                  {r.isGroup ? <Users size={18} /> : roomInitial(r)}
                </div>
                {isOtherOnline(r) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{roomLabel(r)}</div>
                <div className="text-xs text-muted truncate">{r.lastMessage || '...'}</div>
              </div>
              {r.unread > 0 && <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">{r.unread}</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* chat window */}
      <div className={`${!roomId ? 'hidden md:flex' : 'flex'} flex-col flex-1 card overflow-hidden`}>
        {!roomId ? (
          <div className="flex-1 flex items-center justify-center text-muted flex-col gap-3">
            <div className="text-5xl">💬</div>
            <div className="font-semibold">Чат тандаңыз</div>
            <div className="text-sm">Сол тараптан колдонуучуну тандаңыз</div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Link to="/chat" className="md:hidden p-2 rounded-lg hover:bg-surface"><ArrowLeft size={18} /></Link>
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
                {activeRoom?.isGroup ? <Users size={16} /> : (activeRoom ? roomInitial(activeRoom) : '?')}
              </div>
              <div>
                <div className="font-semibold">{activeRoom ? roomLabel(activeRoom) : 'Колдонуучу'}</div>
                {activeRoom?.isGroup && (
                  <div className="text-xs text-muted">{activeRoom.participants.length} мүчө</div>
                )}
                {typingText && <div className="text-xs text-primary-600">{typingText} жазып жатат...</div>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted text-sm py-10">Билдирүүлөр жок. Биринчи болуп жазыңыз!</div>
              ) : messages.map(m => {
                const isMe = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-surface border border-border rounded-bl-sm'}`}>
                      {!isMe && activeRoom?.isGroup && <div className="font-semibold text-xs mb-0.5 text-primary-600">{m.senderName}</div>}
                      <div>{m.text}</div>
                      <div className={`text-[10px] mt-0.5 ${isMe ? 'text-white/60' : 'text-muted'}`}>{new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
              <input value={text} onChange={e => handleTextChange(e.target.value)} placeholder="Билдирүү жазыңыз..."
                className="input flex-1 text-sm" />
              <button disabled={sending || !text.trim()} className="btn btn-primary px-4 py-2.5">
                <Send size={17} />
              </button>
            </form>
          </>
        )}
      </div>

      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={loadRooms} />}
    </div>
  );
}

function NewGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.searchUsers(query.trim())
        .then(d => setResults(d.users || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function toggle(u: User) {
    setSelected(prev => prev.some(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]);
  }

  async function create() {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      await api.createGroup(name.trim(), selected.map(u => u.id));
      onCreated();
      onClose();
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-lg">Жаңы топ</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface"><X size={18} /></button>
        </div>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Топтун аты"
          className="input w-full mb-3" />

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map(u => (
              <span key={u.id} className="flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full">
                {u.name}
                <button onClick={() => toggle(u)}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}

        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Аты же email боюнча издөө..."
          className="input w-full mb-2" />

        <div className="max-h-48 overflow-y-auto mb-4 space-y-1">
          {searching && <div className="text-xs text-muted px-2 py-1">Издөө...</div>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-xs text-muted px-2 py-1">Табылган жок</div>
          )}
          {results.map(u => (
            <button key={u.id} onClick={() => toggle(u)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${selected.some(x => x.id === u.id) ? 'bg-primary-50' : 'hover:bg-surface'}`}>
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                {u.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate">{u.name}</div>
                <div className="text-[11px] text-muted truncate">{u.email}</div>
              </div>
            </button>
          ))}
        </div>

        <button disabled={creating || !name.trim() || selected.length === 0} onClick={create}
          className="btn btn-primary w-full">
          {creating ? 'Түзүлүүдө...' : 'Топ түзүү'}
        </button>
      </div>
    </div>
  );
}