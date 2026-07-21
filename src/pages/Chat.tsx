import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ChatRoom, ChatMessage, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, ArrowLeft, Users, Plus, X, Reply, Trash2, Image as ImageIcon, LogOut, Phone, UserPlus, Info, Smile, Pencil, Shield, ShieldOff, MoreVertical, MessageCircle, UserMinus } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

const MAX_IMAGE_BYTES = 400_000;
const WA_GREEN = '#008069';
const WA_GREEN_DARK = '#005c4b';
const WA_BUBBLE_SENT = '#d9fdd3';
const WA_BG = '#e9ddc9';

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

function dateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Бүгүн';
  if (diffDays === 1) return 'Кечээ';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function Chat() {
  const { roomId } = useParams();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [imgError, setImgError] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readSentRef = useRef<string | null>(null);
  const emojiWrapRef = useRef<HTMLDivElement>(null);
  // кэш сообщений по комнатам — чтобы при переключении чата сразу показывать
  // то, что уже известно, без пустого экрана / мигания
  const messagesCacheRef = useRef<Record<string, ChatMessage[]>>({});
  const navigate = useNavigate();

  function loadRooms() {
    api.getRooms().then(d => setRooms(d.rooms || [])).catch(() => {});
  }

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (!roomId) { setMessages([]); setReplyingTo(null); setShowGroupInfo(false); return; }

    setReplyingTo(null);
    setShowGroupInfo(false);

    // мгновенно показать то, что уже знаем об этой комнате — без пустого экрана
    setMessages(messagesCacheRef.current[roomId] || []);

    api.getMessages(roomId).then(d => {
      const msgs = d.messages || [];
      messagesCacheRef.current[roomId] = msgs;
      setMessages(msgs);
    }).catch(() => {});

    socket?.emit('room:join', roomId);
  }, [roomId, socket]);

  // useLayoutEffect вместо useEffect — скролл выставляется ДО того, как браузер
  // отрисует кадр, поэтому визуального "скачка" не видно
  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, roomId]);

  useEffect(() => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.isGroup) { setOtherUser(null); return; }
    const other = room.participants.find(p => p.id !== user?.id);
    if (!other) { setOtherUser(null); return; }
    api.getUser(other.id).then(d => setOtherUser(d.user)).catch(() => {});
  }, [roomId, rooms, user?.id, onlineUsers]);

  useEffect(() => {
    if (!roomId || !socket) return;
    const hasUnread = messages.some(m => m.senderId !== user?.id && !(m.readBy || []).includes(user?.id || ''));
    if (hasUnread && readSentRef.current !== roomId + messages.length) {
      readSentRef.current = roomId + messages.length;
      socket.emit('message:read', { roomId });
    }
  }, [messages, roomId, socket, user?.id]);

  // helper: обновляет и state, и кэш комнаты одновременно
  function updateMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
    setMessages(prev => {
      const next = updater(prev);
      if (roomId) messagesCacheRef.current[roomId] = next;
      return next;
    });
  }

  useEffect(() => {
    if (!socket) return;

    function onNewMessage(msg: ChatMessage) {
      if (msg.roomId === roomId) {
        updateMessages(prev => [...prev, msg]);
      } else {
        // сообщение пришло в другую (не открытую) комнату — обновим её кэш тоже
        const cached = messagesCacheRef.current[msg.roomId];
        if (cached) messagesCacheRef.current[msg.roomId] = [...cached, msg];
      }
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
      updateMessages(prev => prev.map(m => m.senderId === user?.id
        ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), userId])) }
        : m));
    }
    function onDeleted({ roomId: rId, messageId }: any) {
      if (rId !== roomId) return;
      updateMessages(prev => prev.filter(m => m.id !== messageId));
    }
    function onError({ message }: any) { setImgError(message); setTimeout(() => setImgError(''), 4000); }
    function onGroupLeft({ roomId: rId }: any) {
      if (rId === roomId) return;
      loadRooms();
    }
    function onGroupUpdated({ room }: { room: ChatRoom }) {
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, ...room } : r));
    }

    socket.on('message:new', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('message:read', onRead);
    socket.on('message:deleted', onDeleted);
    socket.on('message:error', onError);
    socket.on('group:left', onGroupLeft);
    socket.on('group:updated', onGroupUpdated);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('message:read', onRead);
      socket.off('message:deleted', onDeleted);
      socket.off('message:error', onError);
      socket.off('group:left', onGroupLeft);
      socket.off('group:updated', onGroupUpdated);
    };
  }, [socket, roomId, user?.id]);

  useEffect(() => {
    if (!showEmoji) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  function handleTextChange(v: string) {
    setText(v);
    if (!socket || !roomId) return;
    socket.emit('typing', { roomId, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 1500);
  }

  function handleEmojiPick(data: EmojiClickData) {
    setText(t => t + data.emoji);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !roomId) return;
    setSending(true);
    const value = text.trim();
    const replyId = replyingTo?.id;
    setText('');
    setReplyingTo(null);
    setShowEmoji(false);
    try {
      if (socket) {
        socket.emit('message:send', { roomId, text: value, replyTo: replyId });
      } else {
        await api.sendMessage(roomId, value, replyId);
        const d = await api.getMessages(roomId);
        messagesCacheRef.current[roomId] = d.messages || [];
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
      <span className={`inline-block font-bold ${readByOther ? 'text-sky-500' : 'text-slate-400'}`} style={{ letterSpacing: '-2px' }}>
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

  // переход в личку с участником группы: если такая комната уже есть — открыть её,
  // иначе попросить бэкенд создать/найти direct-комнату и перейти туда
  async function handleOpenDirectChat(otherUserId: string) {
    if (otherUserId === user?.id) return;
    const existing = rooms.find(r => !r.isGroup && r.participants.some(p => p.id === otherUserId));
    if (existing) {
      setShowGroupInfo(false);
      navigate(`/chat/${existing.id}`);
      return;
    }
    try {
      const d = await api.startDirectChat(otherUserId);
      loadRooms();
      setShowGroupInfo(false);
      navigate(`/chat/${d.room.id}`);
    } catch (e) { console.error(e); }
  }

  type Item = { kind: 'date'; label: string } | { kind: 'system'; m: ChatMessage } | { kind: 'msg'; m: ChatMessage };
  const items: Item[] = [];
  let lastDate = '';
  for (const m of messages) {
    const label = dateLabel(m.createdAt);
    if (label !== lastDate) { items.push({ kind: 'date', label }); lastDate = label; }
    items.push(m.type === 'system' ? { kind: 'system', m } : { kind: 'msg', m });
  }

  return (
    <div className="max-w-5xl mx-auto px-2 py-3 sm:px-4 sm:py-8 h-[calc(100vh-90px)] sm:h-[calc(100vh-140px)] flex flex-col md:flex-row gap-2 sm:gap-4">
      {/* rooms list */}
      <div className={`${roomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-border`}>
        <div className="p-3 sm:p-4 flex items-center justify-between text-white" style={{ background: WA_GREEN }}>
          <span className="font-semibold text-sm sm:text-base">Билдирүүлөр</span>
          <button onClick={() => setShowNewGroup(true)} className="p-1.5 rounded-full hover:bg-white/15" title="Жаңы топ">
            <Plus size={19} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 bg-white">
          {rooms.length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">Чат жок</div>
          ) : rooms.map(r => (
            <Link key={r.id} to={`/chat/${r.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-[#f5f6f6] border-b border-slate-100 transition ${r.id === roomId ? 'bg-[#f0f2f0]' : ''}`}>
              <div className="relative shrink-0">
                {r.isGroup && r.avatar ? (
                  <img src={r.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}>
                    {r.isGroup ? <Users size={20} /> : roomInitial(r)}
                  </div>
                )}
                {isOtherOnline(r) && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate text-slate-800">{roomLabel(r)}</div>
                <div className="text-[12px] text-muted truncate">{r.lastMessage || 'Билдирүү жок'}</div>
              </div>
              {r.unread > 0 && <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: WA_GREEN }}>{r.unread}</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* chat window */}
      <div className={`${!roomId ? 'hidden md:flex' : 'flex'} flex-col flex-1 rounded-2xl overflow-hidden shadow-sm border border-border`}>
        {!roomId ? (
          <div className="flex-1 flex items-center justify-center text-muted flex-col gap-3 bg-[#f7f7f5]">
            <div className="text-6xl">💬</div>
            <div className="font-semibold text-lg text-slate-600">AgroBazar чат</div>
            <div className="text-sm">Сол тараптан колдонуучуну тандаңыз</div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 sm:gap-2 text-white" style={{ background: WA_GREEN }}>
              <Link to="/chat" className="md:hidden p-2 ml-1 rounded-full hover:bg-white/15 shrink-0"><ArrowLeft size={18} /></Link>
              <button
                onClick={() => { if (activeRoom?.isGroup) setShowGroupInfo(true); }}
                className={`flex items-center gap-2 sm:gap-3 flex-1 min-w-0 py-3 sm:py-3.5 px-2 sm:px-3 text-left ${activeRoom?.isGroup ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default'} transition`}
              >
                {activeRoom?.isGroup && activeRoom.avatar ? (
                  <img
                    src={activeRoom.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0 cursor-pointer"
                    onClick={e => { e.stopPropagation(); setViewingImage(activeRoom.avatar!); }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-white bg-white/20">
                    {activeRoom?.isGroup ? <Users size={17} /> : (activeRoom ? roomInitial(activeRoom) : '?')}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm sm:text-base leading-tight truncate">{activeRoom ? roomLabel(activeRoom) : 'Колдонуучу'}</div>
                  {activeRoom?.isGroup ? (
                    <div className="text-[11px] sm:text-xs text-white/75">{activeRoom.participants.length} мүчө</div>
                  ) : (
                    <div className="text-[11px] sm:text-xs text-white/75">
                      {otherParticipantId && onlineUsers.has(otherParticipantId)
                        ? 'онлайн'
                        : otherUser?.lastSeen ? `акыркы жолу ${formatLastSeen(otherUser.lastSeen)}` : ''}
                    </div>
                  )}
                  {typingText && <div className="text-[11px] sm:text-xs text-white font-medium">{typingText} жазып жатат...</div>}
                </div>
                {activeRoom?.isGroup && <Info size={17} className="text-white/70 shrink-0" />}
              </button>
            </div>

            {imgError && <div className="px-4 py-2 bg-red-50 text-red-600 text-xs">{imgError}</div>}

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1.5"
              style={{
                background: WA_BG,
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
                scrollBehavior: 'auto',
              }}
            >
              {items.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-10 bg-white/80 rounded-xl mx-auto max-w-xs px-4 shadow-sm">Билдирүүлөр жок. Биринчи болуп жазыңыз!</div>
              ) : items.map((item, idx) => {
                if (item.kind === 'system') {
                  return (
                    <div key={item.m.id} className="flex justify-center my-2">
                      <span className="bg-black/10 text-slate-600 text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-sm text-center max-w-[85%] sm:max-w-md">{item.m.text}</span>
                    </div>
                  );
                }
                if (item.kind === 'date') {
                  return (
                    <div key={`d-${idx}`} className="flex justify-center my-3">
                      <span className="bg-white/90 text-slate-600 text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm">{item.label}</span>
                    </div>
                  );
                }
                const m = item.m;
                const isMe = m.senderId === user?.id;
                const snippet = findReplySnippet(m.replyTo);
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    {isMe && !m.deleted && (
                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 mr-1 self-center">
                        <button onClick={() => setReplyingTo(m)} className="p-1 rounded hover:bg-white/70 text-slate-500" title="Жооп берүү"><Reply size={14} /></button>
                        <button onClick={() => handleDelete(m)} className="p-1 rounded hover:bg-white/70 text-red-500" title="Өчүрүү"><Trash2 size={14} /></button>
                      </div>
                    )}
                    {!isMe && !m.deleted && (
                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center mr-1 self-center">
                        <button onClick={() => setReplyingTo(m)} className="p-1 rounded hover:bg-white/70 text-slate-500" title="Жооп берүү"><Reply size={14} /></button>
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[65%] px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm shadow-sm ${m.deleted ? 'italic opacity-60 bg-white' : ''}`}
                      style={!m.deleted ? {
                        background: isMe ? WA_BUBBLE_SENT : '#ffffff',
                        borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                      } : { borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px' }}
                    >
                      {!isMe && activeRoom?.isGroup && !m.deleted && <div className="font-semibold text-xs mb-0.5" style={{ color: WA_GREEN }}>{m.senderName}</div>}
                      {snippet && !m.deleted && (
                        <div className="text-xs mb-1.5 px-2 py-1 rounded bg-black/5 border-l-2" style={{ borderColor: WA_GREEN }}>
                          <div className="font-semibold" style={{ color: WA_GREEN }}>{snippet.senderName}</div>
                          <div className="truncate opacity-70 text-slate-600">{snippet.text}</div>
                        </div>
                      )}
                      {m.deleted ? (
                        <div className="flex items-center gap-1 text-slate-500">🚫 Билдирүү өчүрүлгөн</div>
                      ) : m.type === 'image' && m.fileUrl ? (
                        <img src={m.fileUrl} alt="фото" className="rounded-lg max-w-full max-h-72 mb-1" />
                      ) : (
                        <div className="whitespace-pre-wrap break-words text-slate-800">{m.text}</div>
                      )}
                      <div className="text-[10px] mt-0.5 flex items-center gap-1 text-slate-500 justify-end">
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
              <div className="px-2 sm:px-3 pt-2 flex items-center gap-2 border-t border-border bg-white">
                <div className="flex-1 min-w-0 bg-surface rounded-lg px-2 sm:px-3 py-1.5 border-l-2" style={{ borderColor: WA_GREEN }}>
                  <div className="text-xs font-semibold" style={{ color: WA_GREEN }}>{replyingTo.senderName}</div>
                  <div className="text-xs text-muted truncate">{replyingTo.deleted ? 'Билдирүү өчүрүлгөн' : (replyingTo.type === 'image' ? '📷 Сүрөт' : replyingTo.text)}</div>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1.5 rounded-lg hover:bg-surface"><X size={16} /></button>
              </div>
            )}

            <form onSubmit={handleSend} className="p-2 sm:p-3 border-t border-border flex items-center gap-1.5 sm:gap-2 bg-white relative">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

              <div className="relative shrink-0" ref={emojiWrapRef}>
                <button type="button" onClick={() => setShowEmoji(v => !v)} className="p-2.5 rounded-full hover:bg-surface text-muted" title="Эмодзи">
                  <Smile size={20} />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full left-0 mb-2 z-50 shadow-xl rounded-2xl overflow-hidden">
                    <EmojiPicker onEmojiClick={handleEmojiPick} theme={Theme.LIGHT} width={300} height={360} searchDisabled={false} skinTonesDisabled />
                  </div>
                )}
              </div>

              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-surface text-muted shrink-0" title="Сүрөт жөнөтүү">
                <ImageIcon size={19} />
              </button>

              <input value={text} onChange={e => handleTextChange(e.target.value)} placeholder="Билдирүү жазыңыз..."
                className="input flex-1 text-sm min-w-0 rounded-full" />

              <button disabled={sending || !text.trim()} className="btn p-2.5 sm:px-4 sm:py-2.5 text-white rounded-full shrink-0" style={{ background: sending || !text.trim() ? '#94a3b8' : WA_GREEN }}>
                <Send size={17} />
              </button>
            </form>
          </>
        )}
      </div>

      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={loadRooms} />}

      {showGroupInfo && activeRoom && roomId && (
        <GroupInfoModal
          room={activeRoom}
          roomId={roomId}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={loadRooms}
          onLeft={() => { setShowGroupInfo(false); navigate('/chat'); loadRooms(); }}
          onViewAvatar={(url) => setViewingImage(url)}
          onOpenDirectChat={handleOpenDirectChat}
        />
      )}

      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/15"
          >
            <X size={24} />
          </button>
          <img
            src={viewingImage}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function GroupInfoModal({ room, roomId, onClose, onUpdated, onLeft, onViewAvatar, onOpenDirectChat }: {
  room: ChatRoom; roomId: string; onClose: () => void; onUpdated: () => void; onLeft: () => void; onViewAvatar: (url: string) => void;
  onOpenDirectChat: (userId: string) => void;
}) {
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { user } = useAuth();

  const isOwner = room.ownerId === user?.id;

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(room.name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(room.avatar);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // id участника, для которого сейчас открыто меню действий (написать/админ/удалить)
  const [openMemberMenu, setOpenMemberMenu] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState('');
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const memberMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setNameInput(room.name || ''); setAvatarPreview(room.avatar); }, [room.name, room.avatar]);

  useEffect(() => {
    if (!openMemberMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (memberMenuRef.current && !memberMenuRef.current.contains(e.target as Node)) {
        setOpenMemberMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMemberMenu]);

  async function handleSaveName() {
    const value = nameInput.trim();
    if (!value || value === room.name) { setEditingName(false); return; }
    setSavingName(true); setNameError('');
    try {
      await api.updateGroup(roomId, { name: value });
      onUpdated();
      setEditingName(false);
    } catch (e: any) {
      setNameError(e.message || 'Ката кетти');
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setAvatarError('Сүрөт гана тандаңыз'); setTimeout(() => setAvatarError(''), 4000); return; }
    setUploadingAvatar(true); setAvatarError('');
    try {
      const dataUrl = await compressImage(file);
      setAvatarPreview(dataUrl);
      await api.updateGroup(roomId, { avatar: dataUrl });
      onUpdated();
    } catch {
      setAvatarError('Сүрөт өтө чоң же ачылбай жатат. Башка сүрөт тандаңыз.');
      setTimeout(() => setAvatarError(''), 4000);
    } finally {
      setUploadingAvatar(false);
    }
  }

  useEffect(() => {
    setLoadingMembers(true);
    Promise.all(room.participants.map(p => api.getUser(p.id).then(d => d.user).catch(() => null)))
      .then(list => setMembers(list.filter(Boolean) as User[]))
      .finally(() => setLoadingMembers(false));
  }, [room.participants.map(p => p.id).join(',')]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.searchUsers(query.trim())
        .then(d => setResults((d.users || []).filter((u: User) => !room.participants.some(p => p.id === u.id))))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, room.participants]);

  async function handleAdd(u: User) {
    setAdding(u.id);
    try {
      await api.addGroupMember(roomId, u.id);
      setMembers(prev => [...prev, u]);
      setResults(prev => prev.filter(x => x.id !== u.id));
      onUpdated();
    } catch (e) { console.error(e); }
    finally { setAdding(null); }
  }

  async function handleLeave() {
    if (!confirm('Бул топтон чыгууну каалайсызбы?')) return;
    setLeaving(true);
    try {
      await api.leaveGroup(roomId);
      onLeft();
    } catch (e) { console.error(e); }
    finally { setLeaving(false); }
  }

  function showMemberActionError(msg: string) {
    setMemberActionError(msg);
    setTimeout(() => setMemberActionError(''), 4000);
  }

  async function handleToggleAdmin(m: User) {
    setOpenMemberMenu(null);
    const makeAdmin = room.ownerId !== m.id;
    setBusyMemberId(m.id);
    try {
      await api.setGroupAdmin(roomId, m.id, makeAdmin);
      onUpdated();
    } catch (e: any) {
      showMemberActionError(e.message || 'Ката кетти');
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleRemoveMember(m: User) {
    setOpenMemberMenu(null);
    if (!confirm(`${m.name} топтон чыгарылсынбы?`)) return;
    setBusyMemberId(m.id);
    try {
      await api.removeGroupMember(roomId, m.id);
      setMembers(prev => prev.filter(x => x.id !== m.id));
      onUpdated();
    } catch (e: any) {
      showMemberActionError(e.message || 'Ката кетти');
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col items-center text-white p-6 sm:p-8 relative" style={{ background: `linear-gradient(160deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/15"><X size={18} /></button>

          <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarSelect} className="hidden" />
          <div className="relative mb-3">
            <button
              type="button"
              onClick={() => { if (avatarPreview) onViewAvatar(avatarPreview); else if (isOwner) avatarInputRef.current?.click(); }}
              disabled={uploadingAvatar}
              className={`w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden ${avatarPreview || isOwner ? 'cursor-pointer hover:brightness-90 transition' : ''}`}
              title={avatarPreview ? 'Сүрөттү көрүү' : (isOwner ? 'Сүрөттү өзгөртүү' : undefined)}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users size={34} />
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                  <span className="text-[10px]">...</span>
                </div>
              )}
            </button>
            {isOwner && !uploadingAvatar && (
              <span
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-emerald-700 flex items-center justify-center shadow border-2 cursor-pointer"
                style={{ borderColor: WA_GREEN_DARK }}
                title="Сүрөттү өзгөртүү"
              >
                <Pencil size={14} />
              </span>
            )}
          </div>
          {avatarError && <div className="text-[11px] text-red-100 bg-red-500/40 rounded px-2 py-1 mb-2">{avatarError}</div>}

          {editingName ? (
            <div className="w-full px-4">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditingName(false); setNameInput(room.name || ''); } }}
                className="w-full text-center bg-white/15 placeholder-white/60 rounded-full px-3 py-1.5 text-sm font-semibold outline-none focus:bg-white/25"
                maxLength={60}
              />
              {nameError && <div className="text-[11px] text-red-100 text-center mt-1">{nameError}</div>}
              <div className="flex items-center justify-center gap-2 mt-2">
                <button onClick={handleSaveName} disabled={savingName} className="text-xs font-semibold bg-white text-emerald-700 px-3 py-1 rounded-full">
                  {savingName ? 'Сакталууда...' : 'Сактоо'}
                </button>
                <button onClick={() => { setEditingName(false); setNameInput(room.name || ''); setNameError(''); }} className="text-xs font-semibold text-white/80 px-3 py-1 rounded-full hover:bg-white/10">
                  Жокко чыгаруу
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => isOwner && setEditingName(true)}
              className={`font-bold text-lg text-center px-6 flex items-center gap-2 ${isOwner ? 'hover:opacity-90' : ''}`}
              disabled={!isOwner}
              title={isOwner ? 'Атын өзгөртүү' : undefined}
            >
              {room.name || 'Топ'}
              {isOwner && (
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Pencil size={12} />
                </span>
              )}
            </button>
          )}
          <div className="text-xs text-white/75 mt-1">{room.participants.length} мүчө</div>
        </div>

        <div className="p-4 sm:p-5">
          {memberActionError && <div className="mb-3 text-[11px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">{memberActionError}</div>}

          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm text-slate-700">Мүчөлөр</div>
            <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: WA_GREEN }}>
              <UserPlus size={16} /> Кошуу
            </button>
          </div>

          {showAdd && (
            <div className="mb-4 bg-surface rounded-xl p-3">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Аты же email боюнча издөө..."
                className="input w-full mb-2 text-sm rounded-full" />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searching && <div className="text-xs text-muted px-2 py-1">Издөө...</div>}
                {!searching && query.trim().length >= 2 && results.length === 0 && (
                  <div className="text-xs text-muted px-2 py-1">Табылган жок</div>
                )}
                {results.map(u => (
                  <button key={u.id} onClick={() => handleAdd(u)} disabled={adding === u.id}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm hover:bg-white">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: WA_GREEN }}>
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{u.name}</div>
                      <div className="text-[11px] text-muted truncate">{u.email}</div>
                    </div>
                    {adding === u.id && <span className="text-xs text-muted">...</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {loadingMembers ? (
              <div className="text-sm text-muted px-2 py-3">Жүктөлүүдө...</div>
            ) : members.map(m => {
              const isSelf = m.id === user?.id;
              const memberIsOwner = room.ownerId === m.id;
              const busy = busyMemberId === m.id;
              return (
                <div key={m.id} className="relative flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface/60">
                  <button
                    type="button"
                    onClick={() => !isSelf && onOpenDirectChat(m.id)}
                    disabled={isSelf}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${isSelf ? '' : 'cursor-pointer hover:brightness-90 transition'}`}
                    style={{ background: `linear-gradient(135deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}
                    title={isSelf ? undefined : `${m.name} менен жазышуу`}
                  >
                    {m.name[0]}
                  </button>
                  <button
                    type="button"
                    onClick={() => !isSelf && onOpenDirectChat(m.id)}
                    disabled={isSelf}
                    className={`flex-1 min-w-0 text-left ${isSelf ? '' : 'cursor-pointer'}`}
                  >
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      {m.name}
                      {isSelf && <span className="text-[10px] text-muted font-normal">(сиз)</span>}
                      {memberIsOwner && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 font-normal">админ</span>}
                    </div>
                    {m.phone && (
                      <div className="text-xs text-muted flex items-center gap-1"><Phone size={11} /> {m.phone}</div>
                    )}
                  </button>

                  {!isSelf && (
                    <div className="relative shrink-0" ref={openMemberMenu === m.id ? memberMenuRef : undefined}>
                      <button
                        type="button"
                        onClick={() => setOpenMemberMenu(v => v === m.id ? null : m.id)}
                        disabled={busy}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
                        title="Аракеттер"
                      >
                        {busy ? <span className="text-[10px]">...</span> : <MoreVertical size={16} />}
                      </button>
                      {openMemberMenu === m.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-10">
                          <button
                            onClick={() => { setOpenMemberMenu(null); onOpenDirectChat(m.id); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface text-slate-700"
                          >
                            <MessageCircle size={15} /> Жазуу
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => handleToggleAdmin(m)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface text-slate-700"
                            >
                              {memberIsOwner ? <ShieldOff size={15} /> : <Shield size={15} />}
                              {memberIsOwner ? 'Админдиктен алуу' : 'Админ кылуу'}
                            </button>
                          )}
                          {isOwner && (
                            <button
                              onClick={() => handleRemoveMember(m)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-red-50 text-red-500"
                            >
                              <UserMinus size={15} /> Топтон чыгаруу
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={handleLeave} disabled={leaving}
            className="w-full mt-5 flex items-center justify-center gap-2 text-red-500 font-medium text-sm py-2.5 rounded-xl hover:bg-red-50">
            <LogOut size={16} /> {leaving ? 'Чыгууда...' : 'Топтон чыгуу'}
          </button>
        </div>
      </div>
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
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 text-white rounded-t-2xl" style={{ background: WA_GREEN }}>
          <div className="font-semibold text-lg">Жаңы топ</div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Топтун аты"
            className="input w-full mb-3 rounded-full" />

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
            className="input w-full mb-2 rounded-full" />

          <div className="max-h-48 overflow-y-auto mb-4 space-y-1">
            {searching && <div className="text-xs text-muted px-2 py-1">Издөө...</div>}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <div className="text-xs text-muted px-2 py-1">Табылган жок</div>
            )}
            {results.map(u => (
              <button key={u.id} onClick={() => toggle(u)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${selected.some(x => x.id === u.id) ? 'bg-primary-50' : 'hover:bg-surface'}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: WA_GREEN }}>
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
            className="btn w-full text-white rounded-full" style={{ background: (creating || !name.trim() || selected.length === 0) ? '#94a3b8' : WA_GREEN }}>
            {creating ? 'Түзүлүүдө...' : 'Топ түзүү'}
          </button>
        </div>
      </div>
    </div>
  );
}