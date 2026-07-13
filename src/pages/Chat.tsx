import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ChatRoom, ChatMessage, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, ArrowLeft, Users, Plus, X, Reply, Trash2,  Image as ImageIcon, LogOut } from 'lucide-react';


const MAX_IMAGE_BYTES = 400_000;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_error'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('img_error'));
      img.onload = () => {
        const maxDim = 1000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > MAX_IMAGE_BYTES && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > MAX_IMAGE_BYTES) { reject(new Error('too_big')); return; }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function formatLastSeen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `бүгүн ${time}` : `${d.toLocaleDateString('ru-RU')} ${time}`;
}

export default function Chat() {
  const { roomId } = useParams();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [imgError, setImgError] = useState('');
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readSentRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  async function handleLeaveGroup() {
    if (!roomId || !activeRoom?.isGroup) return;
    if (!confirm('Бул топтон чыгууну каалайсызбы?')) return;
    setLeaving(true);
    try {
      await api.leaveGroup(roomId);
      loadRooms();
      navigate('/chat');
    } catch (e) { console.error(e); }
    finally { setLeaving(false); }
  }

  function loadRooms() {
    api.getRooms().then(d => setRooms(d.rooms || [])).catch(() => {});
  }

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (!roomId) { setMessages([]); setReplyingTo(null); return; }
    api.getMessages(roomId).then(d => setMessages(d.messages || [])).catch(() => {});
    socket?.emit('room:join', roomId);
  }, [roomId, socket]);

useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // подтягиваем данные собеседника (для "был в сети")
  useEffect(() => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.isGroup) { setOtherUser(null); return; }
    const other = room.participants.find(p => p.id !== user?.id);
    if (!other) { setOtherUser(null); return; }
    api.getUser(other.id).then(d => setOtherUser(d.user)).catch(() => {});
  }, [roomId, rooms, user?.id, onlineUsers]);

  // отметить сообщения прочитанными
  useEffect(() => {
    if (!roomId || !socket) return;
    const hasUnread = messages.some(m => m.senderId !== user?.id && !(m.readBy || []).includes(user?.id || ''));
    if (hasUnread && readSentRef.current !== roomId + messages.length) {
      readSentRef.current = roomId + messages.length;
      socket.emit('message:read', { roomId });
    }
  }, [messages, roomId, socket, user?.id]);

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
    function onRead({ roomId: rId, userId }: any) {
      if (rId !== roomId) return;
      setMessages(prev => prev.map(m => m.senderId === user?.id
        ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), userId])) }
        : m));
    }
    function onDeleted({ roomId: rId, messageId }: any) {
      if (rId !== roomId) return;
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted: true, text: '', fileUrl: undefined } : m));
    }
    function onError({ message }: any) { setImgError(message); setTimeout(() => setImgError(''), 4000); }

    socket.on('message:new', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('message:read', onRead);
    socket.on('message:deleted', onDeleted);
    socket.on('message:error', onError);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('message:read', onRead);
      socket.off('message:deleted', onDeleted);
      socket.off('message:error', onError);
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
    const replyId = replyingTo?.id;
    setText('');
    setReplyingTo(null);
    try {
      if (socket) {
        socket.emit('message:send', { roomId, text: value, replyTo: replyId });
      } else {
        await api.sendMessage(roomId, value, replyId);
        const d = await api.getMessages(roomId);
        setMessages(d.messages || []);
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !roomId) return;
    if (!file.type.startsWith('image/')) { setImgError('Сүрөт гана жөнөтсө болот'); setTimeout(() => setImgError(''), 4000); return; }
    try {
      const dataUrl = await compressImage(file);
      if (socket) {
        socket.emit('message:send', { roomId, type: 'image', fileUrl: dataUrl });
      }
    } catch {
      setImgError('Сүрөт өтө чоң же ачылбай жатат. Башка сүрөт тандаңыз.');
      setTimeout(() => setImgError(''), 4000);
    }
  }

  async function handleDelete(msg: ChatMessage) {
    if (!roomId) return;
    if (socket) socket.emit('message:delete', { roomId, messageId: msg.id });
    else await api.deleteMessage(roomId, msg.id).catch(() => {});
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
  const otherParticipantId = activeRoom && !activeRoom.isGroup ? activeRoom.participants.find(p => p.id !== user?.id)?.id : undefined;

 function messageStatus(m: ChatMessage) {
    if (m.senderId !== user?.id || activeRoom?.isGroup) return null;
    const readByOther = otherParticipantId ? (m.readBy || []).includes(otherParticipantId) : false;
    return (
      <span className={`inline-block font-bold ${readByOther ? 'text-sky-300' : 'text-white/60'}`} style={{ letterSpacing: '-2px' }}>
        {readByOther ? '✓✓' : '✓'}
      </span>
    );
  }

  function findReplySnippet(id?: string) {
    if (!id) return null;
    const m = messages.find(x => x.id === id);
    if (!m) return null;
    return { senderName: m.senderName, text: m.deleted ? 'Билдирүү өчүрүлгөн' : (m.type === 'image' ? '📷 Сүрөт' : m.text) };
  }

  return (
    <div className="max-w-5xl mx-auto px-2 py-3 sm:px-4 sm:py-8 h-[calc(100vh-90px)] sm:h-[calc(100vh-140px)] flex flex-col md:flex-row gap-2 sm:gap-4">
      <div className={`${roomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 shrink-0 card overflow-hidden`}>
        <div className="p-3 sm:p-4 border-b border-border font-semibold flex items-center justify-between text-sm sm:text-base">
          <span>Билдирүүлөр</span>
          <button onClick={() => setShowNewGroup(true)} className="p-1.5 rounded-lg hover:bg-surface text-primary-600" title="Жаңы топ">
            <Plus size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {rooms.length === 0 ? (
            <div className="p-4 sm:p-6 text-center text-muted text-sm">Чат жок</div>
          ) : rooms.map(r => (
            <Link key={r.id} to={`/chat/${r.id}`}
              className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-surface border-b border-border transition ${r.id === roomId ? 'bg-primary-50' : ''}`}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
                  {r.isGroup ? <Users size={18} /> : roomInitial(r)}
                </div>
                {isOtherOnline(r) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{roomLabel(r)}</div>
                <div className="text-[11px] sm:text-xs text-muted truncate">{r.lastMessage || '...'}</div>
              </div>
              {r.unread > 0 && <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">{r.unread}</span>}
            </Link>
          ))}
        </div>
      </div>

      <div className={`${!roomId ? 'hidden md:flex' : 'flex'} flex-col flex-1 card overflow-hidden`}>
        {!roomId ? (
          <div className="flex-1 flex items-center justify-center text-muted flex-col gap-3">
            <div className="text-5xl">💬</div>
            <div className="font-semibold">Чат тандаңыз</div>
            <div className="text-sm">Сол тараптан колдонуучуну тандаңыз</div>
          </div>
        ) : (
          <>
            <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2 sm:gap-3">
              <Link to="/chat" className="md:hidden p-2 rounded-lg hover:bg-surface shrink-0"><ArrowLeft size={18} /></Link>
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 shrink-0">
                {activeRoom?.isGroup ? <Users size={16} /> : (activeRoom ? roomInitial(activeRoom) : '?')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base">{activeRoom ? roomLabel(activeRoom) : 'Колдонуучу'}</div>
                {activeRoom?.isGroup ? (
                  <div className="text-[11px] sm:text-xs text-muted">{activeRoom.participants.length} мүчө</div>
                ) : (
                  <div className="text-[11px] sm:text-xs text-muted">
                    {otherParticipantId && onlineUsers.has(otherParticipantId)
                      ? <span className="text-green-600">онлайн</span>
                      : otherUser?.lastSeen ? `акыркы жолу ${formatLastSeen(otherUser.lastSeen)}` : ''}
                  </div>
                )}
                {typingText && <div className="text-[11px] sm:text-xs text-primary-600">{typingText} жазып жатат...</div>}
              </div>
              {activeRoom?.isGroup && (
                <button onClick={handleLeaveGroup} disabled={leaving}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500 shrink-0" title="Топтон чыгуу">
                  <LogOut size={18} />
                </button>
              )}
            </div>

            {imgError && <div className="px-4 py-2 bg-red-50 text-red-600 text-xs">{imgError}</div>}

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted text-sm py-8 sm:py-10">Билдирүүлөр жок. Биринчи болуп жазыңыз!</div>
              ) : messages.map(m => {
                const isMe = m.senderId === user?.id;
                const snippet = findReplySnippet(m.replyTo);
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    {isMe && !m.deleted && (
                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 mr-1 self-center">
                        <button onClick={() => setReplyingTo(m)} className="p-1 rounded hover:bg-surface text-muted" title="Жооп берүү"><Reply size={14} /></button>
                        <button onClick={() => handleDelete(m)} className="p-1 rounded hover:bg-surface text-red-500" title="Өчүрүү"><Trash2 size={14} /></button>
                      </div>
                    )}
                    {!isMe && !m.deleted && (
                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center mr-1 self-center">
                        <button onClick={() => setReplyingTo(m)} className="p-1 rounded hover:bg-surface text-muted" title="Жооп берүү"><Reply size={14} /></button>
                      </div>
                    )}
                    <div className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-surface border border-border rounded-bl-sm'} ${m.deleted ? 'italic opacity-60' : ''}`}>
                      {!isMe && activeRoom?.isGroup && !m.deleted && <div className="font-semibold text-xs mb-0.5 text-primary-600">{m.senderName}</div>}
                      {snippet && !m.deleted && (
                        <div className={`text-xs mb-1.5 px-2 py-1 rounded border-l-2 ${isMe ? 'border-white/40 bg-white/10' : 'border-primary-400 bg-black/5'}`}>
                          <div className="font-semibold">{snippet.senderName}</div>
                          <div className="truncate opacity-80">{snippet.text}</div>
                        </div>
                      )}
                      {m.deleted ? (
                        <div className="flex items-center gap-1">🚫 Билдирүү өчүрүлгөн</div>
                      ) : m.type === 'image' && m.fileUrl ? (
                        <img src={m.fileUrl} alt="фото" className="rounded-lg max-w-full max-h-72 mb-1" />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{m.text}</div>
                      )}
                      <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${isMe ? 'text-white/60 justify-end' : 'text-muted'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        {!m.deleted && messageStatus(m)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {replyingTo && (
              <div className="px-2 sm:px-3 pt-2 flex items-center gap-2 border-t border-border">
                <div className="flex-1 min-w-0 bg-surface rounded-lg px-2 sm:px-3 py-1.5 border-l-2 border-primary-500">
                  <div className="text-xs font-semibold text-primary-600">{replyingTo.senderName}</div>
                  <div className="text-xs text-muted truncate">{replyingTo.deleted ? 'Билдирүү өчүрүлгөн' : (replyingTo.type === 'image' ? '📷 Сүрөт' : replyingTo.text)}</div>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1.5 rounded-lg hover:bg-surface"><X size={16} /></button>
              </div>
            )}

            <form onSubmit={handleSend} className="p-2 sm:p-3 border-t border-border flex flex-col gap-2 sm:flex-row sm:items-center">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
              <div className="flex items-center gap-2 sm:gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-lg hover:bg-surface text-muted shrink-0" title="Сүрөт жөнөтүү">
                  <ImageIcon size={19} />
                </button>
                <input value={text} onChange={e => handleTextChange(e.target.value)} placeholder="Билдирүү жазыңыз..."
                  className="input flex-1 text-sm min-w-0" />
              </div>
              <button disabled={sending || !text.trim()} className="btn btn-primary px-4 py-2.5 w-full sm:w-auto">
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-5">
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